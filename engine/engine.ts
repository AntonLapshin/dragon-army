/**
 * Dragon Army — stateful game engine.
 *
 * Mirrors the shape of `ws/koala/shared/gameEngine.js`
 * (`createGameEngine({ storage, getTime, ... })` with
 * `init / resume / getState / save / reset / tick`) but implements the
 * Dragon Army mechanics from `docs/core.md` + `docs/interface.md`:
 *
 * - fixed starting coins, manual Buy Egg (no auto-modal on launch)
 * - spin-then-pay egg purchase (spin preview draws the breed, "Yo hoo"
 *   deducts + adds the egg with a hidden 1–2 day hatch timer)
 * - idempotent wall-clock tick: lifespan expiry, beast respawn,
 *   monster-spawn refresh (recovery/coins/age are derived, never tick-written;
 *   hatching is a manual tap on the green Hatch button, never automatic)
 * - tap-to-collect hourly coins (nothing credited without tapping)
 * - Train (coin cost scales with strength, random gain, drains flat energy,
 *   blocked at 0 energy)
 * - Sell (price from age/strength/energy/breed)
 * - Monster fights (spawned-only selection, win = coins + permanent strength
 *   gain, both outcomes drain energy; strength unchanged on loss)
 * - Bewilder Beast turn-based roster-order battle with Energy retaliation;
 *   0-energy dragons are removed, survivors keep drained energy, win =
 *   vanish-for-a-day + coin reward + permanent strength gain per survivor,
 *   loss with empty roster = buy a new egg
 * - transient UI slice (screens / modals / selection / fight log)
 *
 * RULE: all balance math goes through the pure functions in `config.ts`
 * (including the `*ForDragon` instance helpers); all shapes come from
 * `types.ts`; abstract orchestration (factories, anchor math, log text)
 * lives in `utils.ts`. This file only holds clock/storage/state flow.
 */

import {
  CONFIG,
  EQUIPMENT_SLOTS,
  MONSTERS,
  ageDaysForDragonInstance,
  applyEnergyDrain,
  applyStrengthGain,
  breedForDragon,
  breedForIndex,
  canAffordChosenEgg,
  canAffordEgg,
  canTrainDragon,
  clampStrength,
  collectibleCoins,
  collectibleStepCoins,
  collectibleTotalCoins,
  combatStrengthForDragon,
  drawBreedIndex,
  dragonStage,
  equipmentBonusForEquipment,
  equipmentDefForSlot,
  isBeastEligible,
  isDragonHatched,
  isDragonInstanceExpired,
  isHatchDue,
  levelForDragon,
  liveEnergyForDragon,
  remainingLifespanForDragon,
  resolveBeastFight,
  resolveMonsterFight,
  rollBaseStrength,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollIntInclusive,
  rollMonsterWinStrengthGain,
  rollHatchMs,
  rollSpawnedMonsters,
  rollTrainingGain,
  sellPriceForDragon,
  trainingCostForDragon,
  trainingEnergyCost,
} from "./config";
import type {
  BeastBattleTurn,
  BeastBattleOutcome,
  BeastState,
  CollectCoinsResult,
  ConfirmEggResult,
  CreateEngineDeps,
  Dragon,
  DragonView,
  EconomyView,
  EggSpinPreview,
  EquipmentBuyResult,
  EquipmentPreview,
  EquipmentSlotId,
  GameState,
  HatchResult,
  LegacySave,
  ModalKind,
  MonsterDef,
  MonsterFightOutcome,
  NewGameStateParams,
  Random01,
  ScreenRef,
  SellResult,
  TrainPreview,
  TrainResult,
} from "./types";
import {
  advanceCollectAnchor,
  advanceStepAnchor,
  createDragonId,
  createEggDragon,
  fightTurnLogText,
  freshCombatStats,
  freshEquipment,
  hatchDragonInstance,
  monsterFightSummaryText,
  normalizeCombatStats,
  normalizeEquipment,
  screensForRoster,
  withEnergyAnchor,
  withEquipment,
  withTrainingGain,
} from "./utils";

// ---------------------------------------------------------------------------
// Pure factory (exported for tests / first boot)
// ---------------------------------------------------------------------------

export function createNewGameState(params: NewGameStateParams): GameState {
  const { playerId, nowMs, configVersion, beastMaxHp } = params;
  const beast: BeastState = {
    currentHp: beastMaxHp,
    maxHp: beastMaxHp,
    status: "alive",
    respawnAtMs: null,
    lastDefeatedAtMs: null,
  };
  return {
    version: configVersion,
    player: {
      id: playerId,
      coins: CONFIG.economy.startingCoins,
      dragons: [],
      createdAtMs: nowMs,
      lastSeenMs: nowMs,
      lastCoinCollectMs: nowMs,
      lastCollectedSteps: 0,
      totalCoinsEarned: 0,
      totalEggsBought: 0,
      totalEggsHatched: 0,
      totalTrainings: 0,
      totalMonsterWins: 0,
      totalMonsterLosses: 0,
      totalBeastsDefeated: 0,
      totalDragonsSold: 0,
    },
    beast,
    monsterSpawn: { spawned: [], lastRefreshMs: 0 },
    ui: {
      currentScreen: { kind: "main" },
      activeModal: null,
      selectedDragonId: null,
      selectedMonsterId: null,
      fightLog: [],
    },
    nowMs,
    lastTickMs: nowMs,
  };
}

// ---------------------------------------------------------------------------
// Save migration (pure given nowMs — the page storage adapter calls
// `coerceLoadedSave` on boot; the engine itself only sees GameState)
// ---------------------------------------------------------------------------

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Upgrade the legacy page-owned save (`{ coins, dragons with breedIdx,
 * beastHp, ... }`) from before the engine refactor so existing progress is
 * kept. Pure given nowMs (no clock reads).
 */
export function migrateLegacySave(raw: LegacySave, nowMs: number): GameState {
  const state = createNewGameState({
    playerId: "player-1",
    nowMs,
    configVersion: CONFIG.meta.configVersion,
    beastMaxHp: CONFIG.beast.hp,
  });
  const coins = asFiniteNumber(raw.coins);
  if (coins !== null) state.player.coins = coins;
  state.player.createdAtMs = asFiniteNumber(raw.createdAt) ?? nowMs;
  state.player.lastSeenMs = nowMs;
  state.player.lastCoinCollectMs = asFiniteNumber(raw.lastCoinCollectMs) ?? nowMs;
  state.player.lastCollectedSteps =
    asFiniteNumber(raw.lastCollectedSteps) ?? 0;
  const entries = Array.isArray(raw.dragons) ? raw.dragons : [];
  state.player.dragons = entries
    .filter(
      (d): d is Record<string, unknown> =>
        typeof d === "object" && d !== null && typeof d.id === "string",
    )
    .map((d) => ({
      id: d.id as string,
      breedId: breedForIndex(
        typeof d.breedIdx === "number" ? d.breedIdx : 0,
      ).id,
      strength: clampStrength(asFiniteNumber(d.strength) ?? 0),
      energy: asFiniteNumber(d.energy) ?? CONFIG.energy.initial,
      purchasedAtMs: asFiniteNumber(d.purchasedAt) ?? nowMs,
      hatchAtMs: asFiniteNumber(d.hatchAt) ?? nowMs,
      hatchedAtMs: asFiniteNumber(d.hatchedAt),
      lastEnergyUpdateMs: asFiniteNumber(d.energyTs) ?? nowMs,
      combatStats: freshCombatStats(),
      equipment: freshEquipment(),
    }));
  state.beast.currentHp = asFiniteNumber(raw.beastHp) ?? CONFIG.beast.hp;
  state.beast.status = raw.beastStatus === "vanished" ? "vanished" : "alive";
  state.beast.respawnAtMs = asFiniteNumber(raw.beastRespawnAt);
  const spawnedIds = new Set(Array.isArray(raw.spawned) ? raw.spawned : []);
  state.monsterSpawn.spawned = MONSTERS.filter((m) => spawnedIds.has(m.id));
  state.monsterSpawn.lastRefreshMs = asFiniteNumber(raw.spawnTs) ?? 0;
  return state;
}

/**
 * Accept an engine-shaped save as-is; upgrade the legacy page-owned shape;
 * anything else → null (fresh game). Pure given nowMs.
 */
export function coerceLoadedSave(raw: unknown, nowMs: number): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<GameState> & LegacySave;
  if (candidate.player && Array.isArray(candidate.player.dragons)) {
    const state = candidate as GameState;
    // Clamp pre-cap saves (strength could exceed 125 before the cap).
    for (const d of state.player.dragons) {
      if (typeof d.strength === "number") d.strength = clampStrength(d.strength);
      // Backfill the battle record for saves written before it existed.
      d.combatStats = normalizeCombatStats(d.combatStats);
      // Backfill equipment for saves written before it existed.
      d.equipment = normalizeEquipment(
        (d as { equipment?: unknown }).equipment,
      );
    }
    // Backfill the step anchor for saves written before step coins existed.
    if (asFiniteNumber(state.player.lastCollectedSteps) === null) {
      state.player.lastCollectedSteps = 0;
    }
    return state;
  }
  if (typeof candidate.coins === "number" && Array.isArray(candidate.dragons)) {
    return migrateLegacySave(candidate, nowMs);
  }
  return null;
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function isLoadedState(value: unknown): value is GameState {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Partial<GameState>;
  return (
    Array.isArray(s.player?.dragons) &&
    typeof s.player?.coins === "number" &&
    typeof s.beast?.currentHp === "number"
  );
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export function createGameEngine(deps: CreateEngineDeps) {
  const storage = deps.storage;
  const getTime = deps.getTime;
  const rand: Random01 = deps.rand01 ?? Math.random;
  const generateId = deps.generateId ?? createDragonId;
  const playerId = deps.playerId ?? "player-1";
  const getStepsRaw = deps.getSteps ?? (() => 0);
  /** Current watch-step counter reading; sensor failures count as 0. */
  function currentSteps(): number {
    try {
      const v = getStepsRaw();
      return typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
    } catch {
      return 0;
    }
  }

  let state: GameState | null = null;
  /** Locked while fight turns auto-resolve (fight modals show no X). */
  let fightLocked = false;

  function now(): number {
    return getTime();
  }

  function requireState(): GameState {
    if (!state) throw new Error("engine not initialised — call init() first");
    return state;
  }

  function findDragon(dragonId: string): Dragon | undefined {
    return requireState().player.dragons.find((d) => d.id === dragonId);
  }

  function replaceDragon(updated: Dragon): void {
    const s = requireState();
    s.player.dragons = s.player.dragons.map((d) =>
      d.id === updated.id ? updated : d,
    );
  }

  function removeDragons(ids: ReadonlySet<string>): void {
    const s = requireState();
    if (ids.size === 0) return;
    s.player.dragons = s.player.dragons.filter((d) => !ids.has(d.id));
    if (s.ui.selectedDragonId && ids.has(s.ui.selectedDragonId)) {
      s.ui.selectedDragonId = null;
      s.ui.currentScreen = { kind: "main" };
    }
  }

  // -- tick: idempotent wall-clock derivations (never writes recovery) --
  // NOTE: hatching is manual (green Hatch button → hatchDragon()), never
  // automatic — tick must NOT hatch due eggs on its own.

  function removeExpiredDragons(atMs: number): void {
    const s = requireState();
    const expired = s.player.dragons.filter((d) =>
      isDragonInstanceExpired(d, atMs),
    );
    if (expired.length > 0) {
      removeDragons(new Set(expired.map((d) => d.id)));
    }
  }

  function respawnBeastIfDue(atMs: number): void {
    const s = requireState();
    if (
      s.beast.status === "vanished" &&
      s.beast.respawnAtMs !== null &&
      atMs >= s.beast.respawnAtMs
    ) {
      s.beast.status = "alive";
      s.beast.currentHp = s.beast.maxHp;
      s.beast.respawnAtMs = null;
    }
  }

  function refreshSpawnIfStale(atMs: number): void {
    const s = requireState();
    if (
      atMs - s.monsterSpawn.lastRefreshMs >=
      CONFIG.monsterSpawn.refreshIntervalMs
    ) {
      s.monsterSpawn.spawned = rollSpawnedMonsters(rand);
      s.monsterSpawn.lastRefreshMs = atMs;
    }
  }

  /** Advance the clock: expiry, beast respawn, spawn refresh (never auto-hatch). */
  function tick(atMs: number = now()): GameState {
    const s = requireState();
    s.nowMs = atMs;
    removeExpiredDragons(atMs);
    respawnBeastIfDue(atMs);
    refreshSpawnIfStale(atMs);
    s.player.lastSeenMs = atMs;
    s.lastTickMs = atMs;
    return s;
  }

  function save(): void {
    const s = requireState();
    s.nowMs = now();
    storage.save(cloneState(s));
  }

  // -- boot (koala-style) --

  function init(): GameState {
    const saved = storage.load();
    if (saved && isLoadedState(saved)) {
      state = saved;
      if (typeof state.player.lastCollectedSteps !== "number") {
        state.player.lastCollectedSteps = 0;
      }
      if (!state.ui) {
        state.ui = {
          currentScreen: { kind: "main" },
          activeModal: null,
          selectedDragonId: null,
          selectedMonsterId: null,
          fightLog: [],
        };
      }
      if (!state.monsterSpawn) {
        state.monsterSpawn = { spawned: [], lastRefreshMs: 0 };
      }
    } else {
      const atMs = now();
      state = createNewGameState({
        playerId,
        nowMs: atMs,
        configVersion: CONFIG.meta.configVersion,
        beastMaxHp: CONFIG.beast.hp,
      });
    }
    tick(now());
    save();
    return cloneState(requireState());
  }

  function resume(): GameState {
    tick(now());
    save();
    return cloneState(requireState());
  }

  function getState(): GameState {
    return cloneState(requireState());
  }

  function reset(): GameState {
    const atMs = now();
    state = createNewGameState({
      playerId,
      nowMs: atMs,
      configVersion: CONFIG.meta.configVersion,
      beastMaxHp: CONFIG.beast.hp,
    });
    tick(atMs);
    save();
    return cloneState(state);
  }

  // -- egg flow: spin-then-pay (§3.1) --

  function rosterFull(): boolean {
    const s = requireState();
    const eggs = s.player.dragons.filter(
      (d) => !isDragonHatched(d),
    ).length;
    return (
      s.player.dragons.length >= CONFIG.limits.maxRoster ||
      eggs >= CONFIG.limits.maxEggsPending
    );
  }

  /**
   * Freeze the symbol-spin into a breed. No state change, no deduction —
   * insufficient coins means no spin ("Not enough coins").
   */
  function spinEggPreview(): EggSpinPreview {
    const s = requireState();
    if (!canAffordEgg(s.player.coins)) {
      return { ok: false, reason: "not-enough-coins" };
    }
    if (rosterFull()) return { ok: false, reason: "roster-full" };
    const breedIndex = drawBreedIndex(rand());
    return { ok: true, breedIndex, breed: breedForIndex(breedIndex) };
  }

  /**
   * Shared egg purchase: gate on coins + roster, deduct `price`, add the
   * egg with its hidden 1–2 day hatch timer encoded at purchase, and jump
   * to the new egg's page. Random-spin and choose-a-specific-egg differ
   * only in price (`CONFIG.egg.price` vs `CONFIG.egg.choosePrice`) and in
   * which affordability check the caller ran.
   */
  function purchaseEgg(
    breedIndex: number,
    price: number,
    canAfford: (coins: number) => boolean,
    hatchRand01?: number,
  ): ConfirmEggResult {
    const s = requireState();
    const atMs = now();
    if (!canAfford(s.player.coins)) {
      return { ok: false, reason: "not-enough-coins" };
    }
    if (rosterFull()) return { ok: false, reason: "roster-full" };
    const breed = breedForIndex(breedIndex);
    s.player.coins -= price;
    const egg = createEggDragon({
      id: generateId(rand(), atMs),
      breedId: breed.id,
      nowMs: atMs,
      hatchDelayMs: rollHatchMs(hatchRand01 ?? rand()),
    });
    s.player.dragons.push(egg);
    s.player.totalEggsBought += 1;
    s.ui.selectedDragonId = egg.id;
    s.ui.currentScreen = { kind: "dragon", dragonId: egg.id };
    save();
    return { ok: true, dragon: { ...egg } };
  }

  /**
   * "Yo hoo": deduct the egg price and add the egg with its hidden 1–2 day
   * hatch timer encoded at purchase.
   */
  function confirmEggPurchase(
    breedIndex: number,
    hatchRand01?: number,
  ): ConfirmEggResult {
    return purchaseEgg(breedIndex, CONFIG.egg.price, canAffordEgg, hatchRand01);
  }

  /**
   * "Buy" a SPECIFIC egg from choose mode: same as confirmEggPurchase but
   * deducts `CONFIG.egg.choosePrice` (150) instead of the random price.
   * The breed is picked by the player via left/right arrows (chooseIndex).
   */
  function confirmChosenEggPurchase(
    breedIndex: number,
    hatchRand01?: number,
  ): ConfirmEggResult {
    return purchaseEgg(
      breedIndex,
      CONFIG.egg.choosePrice,
      canAffordChosenEgg,
      hatchRand01,
    );
  }

  // -- manual hatch: green Hatch button once the hidden timer is due --

  /**
   * Hatch a due egg into a dragon. Manual only — tick never calls this.
   * Blocked while the hidden timer hasn't elapsed (`not-due`) and once
   * already hatched (`already-hatched`).
   */
  function hatchDragon(dragonId: string, strengthRand01?: number): HatchResult {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (dragon.hatchedAtMs !== null) {
      return { ok: false, reason: "already-hatched" };
    }
    if (!isHatchDue(dragon.hatchAtMs, atMs)) {
      return { ok: false, reason: "not-due" };
    }
    const breed = breedForDragon(dragon);
    const strength = rollBaseStrength(breed, strengthRand01 ?? rand());
    const hatched = hatchDragonInstance(dragon, atMs, strength);
    replaceDragon(hatched);
    s.player.totalEggsHatched += 1;
    save();
    return { ok: true, dragon: { ...hatched }, strength: hatched.strength };
  }

  // -- hybrid coins: hourly (unconditional, capped) + steps (100 = 1 coin) --
  // Both halves are tap-to-collect (§3.7): nothing is credited without
  // tapping the Earn Coins icon.

  function timeCollectibleAmount(atMs: number = now()): number {
    const s = requireState();
    return collectibleCoins(Math.max(0, atMs - s.player.lastCoinCollectMs));
  }

  function stepCollectibleAmount(): number {
    const s = requireState();
    return collectibleStepCoins(
      currentSteps(),
      s.player.lastCollectedSteps,
    );
  }

  function collectibleAmount(atMs: number = now()): number {
    const s = requireState();
    return collectibleTotalCoins(
      Math.max(0, atMs - s.player.lastCoinCollectMs),
      currentSteps(),
      s.player.lastCollectedSteps,
    );
  }

  function hasCollectible(atMs: number = now()): boolean {
    return collectibleAmount(atMs) > 0;
  }

  function getEconomyView(atMs: number = now()): EconomyView {
    const s = requireState();
    const timeCollectible = timeCollectibleAmount(atMs);
    const stepCollectible = stepCollectibleAmount();
    const collectible = timeCollectible + stepCollectible;
    return {
      coins: s.player.coins,
      collectible,
      hasCollectible: collectible > 0,
      canAffordEgg: canAffordEgg(s.player.coins),
      timeCollectible,
      stepCollectible,
    };
  }

  /** Tap Earn Coins: credit hourly + step coins, preserve remainders. */
  function collectCoins(): CollectCoinsResult {
    const s = requireState();
    const atMs = now();
    const steps = currentSteps();
    const timeAdvanced = advanceCollectAnchor(s.player.lastCoinCollectMs, atMs);
    const stepAdvanced = advanceStepAnchor(s.player.lastCollectedSteps, steps);
    const collected = timeAdvanced.collected + stepAdvanced.collected;
    // A step-counter reset (daily rollover) still resyncs the anchor even
    // when nothing was collected.
    let dirty = false;
    if (timeAdvanced.collected > 0) {
      s.player.lastCoinCollectMs = timeAdvanced.newLastCollectMs;
      dirty = true;
    }
    if (
      stepAdvanced.newLastCollectedSteps !== s.player.lastCollectedSteps
    ) {
      s.player.lastCollectedSteps = stepAdvanced.newLastCollectedSteps;
      dirty = true;
    }
    if (collected > 0) {
      s.player.coins += collected;
      s.player.totalCoinsEarned += collected;
      dirty = true;
    }
    if (dirty) save();
    return {
      collected,
      timeCoins: timeAdvanced.collected,
      stepCoins: stepAdvanced.collected,
    };
  }

  // -- dragon views (§2) --

  function getDragonView(dragonId: string, atMs: number = now()): DragonView | null {
    const dragon = findDragon(dragonId);
    if (!dragon) return null;
    const s = requireState();
    const breed = breedForDragon(dragon);
    const energy = liveEnergyForDragon(dragon, atMs);
    const equipmentBonus = equipmentBonusForEquipment(
      normalizeEquipment(dragon.equipment),
    );
    return {
      dragon: { ...dragon },
      breed,
      stage: dragonStage(dragon.hatchedAtMs),
      level: levelForDragon(dragon),
      ageDays: ageDaysForDragonInstance(dragon, atMs),
      energy,
      strength: dragon.strength,
      equipmentBonus,
      combatStrength: dragon.strength + equipmentBonus,
      sellPrice: sellPriceForDragon(dragon, atMs),
      remainingLifespanDays: remainingLifespanForDragon(dragon, atMs),
      expired: isDragonInstanceExpired(dragon, atMs),
      canTrain: canTrainDragon(dragon, s.player.coins, atMs),
      canFight: isBeastEligible(dragon, atMs),
      canHatch:
        dragon.hatchedAtMs === null && isHatchDue(dragon.hatchAtMs, atMs),
    };
  }

  function listDragonViews(atMs: number = now()): DragonView[] {
    const s = requireState();
    const views: DragonView[] = [];
    for (const dragon of s.player.dragons) {
      const view = getDragonView(dragon.id, atMs);
      if (view) views.push(view);
    }
    return views;
  }

  /** Main-screen "Dragons: N" (hatched dragons only, eggs excluded). */
  function hatchedCount(): number {
    return requireState().player.dragons.filter((d) =>
      isDragonHatched(d),
    ).length;
  }

  function getScreens(): ScreenRef[] {
    return screensForRoster(
      requireState().player.dragons.map((d) => d.id),
    );
  }

  // -- training (§3.2) --

  function trainPreview(dragonId: string): TrainPreview {
    const s = requireState();
    const dragon = findDragon(dragonId);
    if (!dragon) {
      return { canTrain: false, cost: 0, reason: "unknown-dragon" };
    }
    const cost = trainingCostForDragon(dragon);
    if (!isDragonHatched(dragon)) {
      return { canTrain: false, cost, reason: "egg" };
    }
    if (liveEnergyForDragon(dragon, now()) <= CONFIG.training.requiresEnergyAbove) {
      return { canTrain: false, cost, reason: "no-energy" };
    }
    if (s.player.coins < cost) {
      return { canTrain: false, cost, reason: "not-enough-coins" };
    }
    return { canTrain: true, cost, reason: null };
  }

  function trainDragon(dragonId: string, gainRand01?: number): TrainResult {
    const s = requireState();
    const atMs = now();
    const preview = trainPreview(dragonId);
    if (!preview.canTrain) return { ok: false, reason: preview.reason };
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    const levelBefore = levelForDragon(dragon);
    const gain = rollTrainingGain(gainRand01 ?? rand());
    const energyCost = trainingEnergyCost();
    const liveEnergy = liveEnergyForDragon(dragon, atMs);
    const energyAfter = applyEnergyDrain(liveEnergy, energyCost);
    s.player.coins -= preview.cost;
    replaceDragon(
      withEnergyAnchor(withTrainingGain(dragon, gain), energyAfter, atMs),
    );
    s.player.totalTrainings += 1;
    const after = findDragon(dragonId);
    const strengthAfter = after?.strength ?? applyStrengthGain(dragon.strength, gain);
    save();
    return {
      ok: true,
      cost: preview.cost,
      gain,
      strengthAfter,
      levelBefore,
      levelAfter: levelForDragon({ ...dragon, strength: strengthAfter }),
      energyCost,
      energyAfter,
    };
  }

  // -- selling (§3.3) --

  function sellPreview(dragonId: string, atMs: number = now()): number | null {
    const dragon = findDragon(dragonId);
    if (!dragon) return null;
    return sellPriceForDragon(dragon, atMs);
  }

  function sellDragon(dragonId: string): SellResult {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    const price = sellPriceForDragon(dragon, atMs);
    removeDragons(new Set([dragonId]));
    s.player.coins += price;
    s.player.totalCoinsEarned += price;
    s.player.totalDragonsSold += 1;
    save();
    return { ok: true, price };
  }

  // -- equipment (§3.9): one piece per slot, bought with coins --

  function equipmentPreview(
    dragonId: string,
    slot: EquipmentSlotId,
  ): EquipmentPreview {
    const s = requireState();
    const dragon = findDragon(dragonId);
    if (!dragon) {
      return { canBuy: false, price: 0, bonus: 0, reason: "unknown-dragon" };
    }
    const def = equipmentDefForSlot(slot);
    if (!def) {
      return { canBuy: false, price: 0, bonus: 0, reason: "unknown-slot" };
    }
    if (!isDragonHatched(dragon)) {
      return { canBuy: false, price: def.price, bonus: def.bonus, reason: "egg" };
    }
    const owned = normalizeEquipment(dragon.equipment)[slot] === true;
    if (owned) {
      return { canBuy: false, price: def.price, bonus: def.bonus, reason: "already-owned" };
    }
    if (s.player.coins < def.price) {
      return { canBuy: false, price: def.price, bonus: def.bonus, reason: "not-enough-coins" };
    }
    return { canBuy: true, price: def.price, bonus: def.bonus, reason: null };
  }

  /**
   * Buy one equipment piece for a hatched dragon: deduct the price, flip
   * the slot to owned. No tiers, no swapping — one option per slot.
   * Equipment is per-dragon (not shared) and is lost when the dragon is
   * sold / removed / expires (sell refunds 50% of its cost).
   */
  function buyEquipment(
    dragonId: string,
    slot: EquipmentSlotId,
  ): EquipmentBuyResult {
    const s = requireState();
    const preview = equipmentPreview(dragonId, slot);
    if (!preview.canBuy) return { ok: false, reason: preview.reason };
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    s.player.coins -= preview.price;
    replaceDragon(withEquipment(dragon, slot));
    const after = findDragon(dragonId);
    const equipmentBonusAfter = equipmentBonusForEquipment(
      normalizeEquipment(after?.equipment),
    );
    save();
    return {
      ok: true,
      slot,
      price: preview.price,
      bonus: preview.bonus,
      equipmentBonusAfter,
      combatStrengthAfter: (after?.strength ?? dragon.strength) + equipmentBonusAfter,
    };
  }

  function getEquipmentCatalogue() {
    return EQUIPMENT_SLOTS.map((d) => ({ ...d }));
  }

  // -- monsters (§3.4 / §3.5) --

  /** Force-refresh the spawn table (modal-open refresh uses this). */
  function refreshMonsterSpawn(force = false): MonsterDef[] {
    const s = requireState();
    const atMs = now();
    if (
      force ||
      atMs - s.monsterSpawn.lastRefreshMs >= CONFIG.monsterSpawn.refreshIntervalMs
    ) {
      s.monsterSpawn.spawned = rollSpawnedMonsters(rand);
      s.monsterSpawn.lastRefreshMs = atMs;
      save();
    }
    return s.monsterSpawn.spawned.map((m) => ({ ...m }));
  }

  function getSpawnedMonsters(): MonsterDef[] {
    return requireState().monsterSpawn.spawned.map((m) => ({ ...m }));
  }

  /**
   * Open the Monster Selection modal for a dragon: refreshes the spawn
   * table on open, records selection. Blocked at 0 energy / for eggs.
   */
  function openMonsterSelect(
    dragonId: string,
  ):
    | { ok: true; spawned: MonsterDef[] }
    | { ok: false; reason: "unknown-dragon" | "egg" | "no-energy" } {
    const s = requireState();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    if (!isBeastEligible(dragon, now())) {
      return { ok: false, reason: "no-energy" };
    }
    const spawned = refreshMonsterSpawn(true);
    s.ui.selectedDragonId = dragonId;
    s.ui.selectedMonsterId = null;
    s.ui.activeModal = "monster-select";
    save();
    return { ok: true, spawned };
  }

  /**
   * Turn-based 1v1 monster fight (see `resolveMonsterFight` in config):
   * dragon fireball, monster fireball back, until one HP pool hits 0.
   * The dragon's energy IS its HP — a win leaves the leftover HP as its
   * remaining energy, a loss knocks it out to 0. Win = coins + permanent
   * strength, strength unchanged on loss. The whole fight resolves
   * instantly and persists (anti-cheat); the fight screen only replays
   * the returned turns as fireball animation.
   */
  function fightMonster(
    dragonId: string,
    monsterId: string,
  ): MonsterFightOutcome {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    const liveEnergy = liveEnergyForDragon(dragon, atMs);
    if (!isBeastEligible(dragon, atMs)) {
      return { ok: false, reason: "no-energy" };
    }
    const target: MonsterDef | undefined = s.monsterSpawn.spawned.find(
      (m) => m.id === monsterId,
    );
    if (!target) {
      return { ok: false, reason: "monster-not-spawned" };
    }
    fightLocked = true;
    try {
      const result = resolveMonsterFight(
        combatStrengthForDragon(dragon),
        liveEnergy,
        target,
        rand,
      );
      const coinReward = result.won
        ? rollIntInclusive(target.rewardMin, target.rewardMax, rand())
        : 0;
      const strengthGain = result.won
        ? rollMonsterWinStrengthGain(target, rand())
        : 0;
      const strengthAfter = applyStrengthGain(dragon.strength, strengthGain);
      const stats = normalizeCombatStats(dragon.combatStats);
      if (result.won) {
        // Per-dragon battle record: monster wins bucketed by difficulty,
        // coins attributed to the dragon that earned them.
        if (target.difficulty === "Easy") stats.easyWins += 1;
        else if (target.difficulty === "Medium") stats.mediumWins += 1;
        else stats.hardWins += 1;
        stats.coinsEarned += coinReward;
      }
      replaceDragon({
        ...dragon,
        strength: strengthAfter,
        energy: result.dragonHpAfter,
        lastEnergyUpdateMs: atMs,
        combatStats: stats,
      });
      if (result.won) {
        s.player.coins += coinReward;
        s.player.totalCoinsEarned += coinReward;
        s.player.totalMonsterWins += 1;
      } else {
        s.player.totalMonsterLosses += 1;
      }
      const breed = breedForDragon(dragon);
      const logText = monsterFightSummaryText(result.won, coinReward, strengthGain);
      const turns = result.turns.map((t, i) => ({
        turnIndex: i,
        attackerKind: t.attackerKind,
        attackerId: t.attackerKind === "dragon" ? dragonId : null,
        attackerName: t.attackerKind === "dragon" ? breed.name : target.name,
        targetId: t.attackerKind === "enemy" ? dragonId : null,
        targetName: t.attackerKind === "dragon" ? target.name : breed.name,
        hit: t.hit,
        damage: t.damage,
        targetHpAfter: t.defenderHpAfter,
        text: fightTurnLogText(
          t.attackerKind === "dragon" ? breed.name : target.name,
          t.attackerKind === "dragon" ? target.name : breed.name,
          t.hit,
          t.damage,
        ),
      }));
      s.ui.selectedDragonId = dragonId;
      s.ui.selectedMonsterId = monsterId;
      s.ui.activeModal = "monster-fight";
      s.ui.fightLog = turns;
      save();
      return {
        ok: true,
        won: result.won,
        turns,
        totalDamageDealt: result.totalDamageDealt,
        coinReward,
        energyLoss: liveEnergy - result.dragonHpAfter,
        energyAfter: result.dragonHpAfter,
        strengthGain,
        strengthAfter,
        logText,
      };
    } finally {
      fightLocked = false;
    }
  }

  // -- Bewilder Beast (§3.5 / §3.6) --

  /** Roster-order participants: hatched dragons with live energy > 0. */
  function getBeastParticipants(atMs: number = now()): Dragon[] {
    return requireState().player.dragons
      .filter((d) => isBeastEligible(d, atMs))
      .map((d) => ({ ...d }));
  }

  function canFightBeast(
    atMs: number = now(),
  ): { ok: true } | { ok: false; reason: "beast-vanished" | "no-participants" } {
    const s = requireState();
    if (s.beast.status !== "alive") return { ok: false, reason: "beast-vanished" };
    if (getBeastParticipants(atMs).length === 0) {
      return { ok: false, reason: "no-participants" };
    }
    return { ok: true };
  }

  function openBeastIntro(): void {
    const s = requireState();
    s.ui.activeModal = "beast-intro";
    save();
  }

  /**
   * Full Beast battle, round-based (see `resolveBeastFight` in config):
   * every alive dragon attacks in roster order, then the beast fires
   * back at ONE random alive dragon. 0-energy dragons are REMOVED.
   * Win = vanish-for-a-day + coin reward + permanent strength gain for
   * every dragon that attacked and survived; survivors keep drained
   * energy. Loss = every participant is removed AND the beast heals to
   * full HP — no grinding it down across attempts with sacrificial
   * rosters. The fight resolves instantly and persists (anti-cheat);
   * the fight screen only replays the returned turns.
   */
  function fightBeast(): BeastBattleOutcome {
    tick(now());
    const s = requireState();
    const atMs = now();
    if (s.beast.status !== "alive") {
      return { ok: false, reason: "beast-vanished" };
    }
    const lineup = s.player.dragons.filter((d) => isBeastEligible(d, atMs));
    if (lineup.length === 0) {
      return { ok: false, reason: "no-participants" };
    }
    fightLocked = true;
    try {
      s.ui.activeModal = "beast-fight";
      s.ui.fightLog = [];

      const result = resolveBeastFight(
        lineup.map((d) => combatStrengthForDragon(d)),
        lineup.map((d) => liveEnergyForDragon(d, atMs)),
        s.beast.currentHp,
        rand,
      );
      const defeated = result.won;
      const killerId =
        result.killerIndex === null ? null : lineup[result.killerIndex].id;
      // Dragons that landed at least one blow (attacked, not just present).
      const foughtIds = new Set(
        result.turns
          .filter((t) => t.attackerKind === "dragon" && t.attackerIndex !== null)
          .map((t) => lineup[t.attackerIndex as number].id),
      );
      const removedIds = new Set(
        lineup
          .filter((_, i) => result.dragonHpsAfter[i] <= 0)
          .map((d) => d.id),
      );

      const turns: BeastBattleTurn[] = result.turns.map((t, turnIndex) => {
        const attackerName =
          t.attackerKind === "dragon" && t.attackerIndex !== null
            ? breedForDragon(lineup[t.attackerIndex]).name
            : CONFIG.beast.name;
        const targetName =
          t.attackerKind === "dragon"
            ? CONFIG.beast.name
            : t.targetIndex !== null
              ? breedForDragon(lineup[t.targetIndex]).name
              : CONFIG.beast.name;
        return {
          turnIndex,
          attackerKind: t.attackerKind,
          attackerId:
            t.attackerKind === "dragon" && t.attackerIndex !== null
              ? lineup[t.attackerIndex].id
              : null,
          attackerName,
          targetId:
            t.attackerKind === "enemy" && t.targetIndex !== null
              ? lineup[t.targetIndex].id
              : null,
          targetName,
          hit: t.hit,
          damage: t.damage,
          targetHpAfter: t.defenderHpAfter,
          text: fightTurnLogText(attackerName, targetName, t.hit, t.damage),
        };
      });

      let reward = 0;
      const strengthGains: Record<string, number> = {};
      if (defeated) {
        reward = rollBeastReward(rand());
        s.player.coins += reward;
        s.player.totalCoinsEarned += reward;
        s.player.totalBeastsDefeated += 1;
        s.beast.currentHp = 0;
        s.beast.status = "vanished";
        s.beast.respawnAtMs = atMs + CONFIG.beast.respawnAfterWinMs;
        s.beast.lastDefeatedAtMs = atMs;
      } else {
        // Lost: the beast heals to full — a loss buys no progress.
        s.beast.currentHp = CONFIG.beast.hp;
        s.beast.maxHp = CONFIG.beast.hp;
      }

      // Persist energy (+ strength on win): removed dragons go, survivors
      // keep their remaining HP as energy; only dragons that attacked
      // grow stronger on a win.
      for (let i = 0; i < lineup.length; i++) {
        const participant = lineup[i];
        if (removedIds.has(participant.id)) continue;
        const current = s.player.dragons.find((d) => d.id === participant.id);
        if (!current) continue;
        const energy = result.dragonHpsAfter[i];
        if (defeated && foughtIds.has(participant.id)) {
          const gain = rollBeastWinStrengthGain(rand());
          strengthGains[participant.id] = gain;
          // Per-dragon battle record: the killing blow counts as this
          // dragon's beast win, and the beast reward is attributed to it.
          const stats = normalizeCombatStats(current.combatStats);
          if (participant.id === killerId) {
            stats.beastWins += 1;
            stats.coinsEarned += reward;
          }
          replaceDragon({
            ...current,
            strength: applyStrengthGain(current.strength, gain),
            energy,
            lastEnergyUpdateMs: atMs,
            combatStats: stats,
          });
        } else {
          replaceDragon(withEnergyAnchor(current, energy, atMs));
        }
      }
      removeDragons(removedIds);
      s.ui.fightLog = turns;
      save();
      return {
        ok: true,
        won: defeated,
        turns,
        beastHpAfter: defeated ? 0 : CONFIG.beast.hp,
        reward,
        removedDragonIds: [...removedIds],
        strengthGains,
      };
    } finally {
      fightLocked = false;
    }
  }

  // -- UI slice (transient; fight modals lock while resolving) --

  function openModal(kind: ModalKind): void {
    requireState().ui.activeModal = kind;
    save();
  }

  function closeModal(): { ok: true } | { ok: false; reason: "fight-locked" } {
    if (fightLocked) return { ok: false, reason: "fight-locked" };
    requireState().ui.activeModal = null;
    save();
    return { ok: true };
  }

  function isFightLocked(): boolean {
    return fightLocked;
  }

  function setScreen(screen: ScreenRef): void {
    const s = requireState();
    s.ui.currentScreen = screen;
    if (screen.kind === "dragon" || screen.kind === "equipment") {
      s.ui.selectedDragonId = screen.dragonId;
    }
    save();
  }

  function selectDragon(dragonId: string): boolean {
    const dragon = findDragon(dragonId);
    if (!dragon) return false;
    const s = requireState();
    s.ui.selectedDragonId = dragonId;
    s.ui.currentScreen = { kind: "dragon", dragonId };
    save();
    return true;
  }

  return {
    // lifecycle (koala-style)
    init,
    resume,
    getState,
    save,
    reset,
    tick,
    // egg flow (spin-then-pay + manual hatch)
    spinEggPreview,
    confirmEggPurchase,
    confirmChosenEggPurchase,
    hatchDragon,
    canBuyEgg: () =>
      canAffordEgg(requireState().player.coins) && !rosterFull(),
    canBuyChosenEgg: () =>
      canAffordChosenEgg(requireState().player.coins) && !rosterFull(),
    // coins (hybrid tap-to-collect: hourly + steps)
    collectibleAmount,
    timeCollectibleAmount,
    stepCollectibleAmount,
    hasCollectible,
    getEconomyView,
    collectCoins,
    // dragons
    getDragonView,
    listDragonViews,
    hatchedCount,
    getScreens,
    // training / selling
    trainPreview,
    trainDragon,
    sellPreview,
    sellDragon,
    // equipment
    equipmentPreview,
    buyEquipment,
    getEquipmentCatalogue,
    // monsters
    refreshMonsterSpawn,
    getSpawnedMonsters,
    openMonsterSelect,
    fightMonster,
    // beast
    getBeastParticipants,
    canFightBeast,
    openBeastIntro,
    fightBeast,
    // ui
    openModal,
    closeModal,
    isFightLocked,
    setScreen,
    selectDragon,
  };
}

export type GameEngine = ReturnType<typeof createGameEngine>;
