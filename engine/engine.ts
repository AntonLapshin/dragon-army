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
 * - idempotent wall-clock tick: hatching, lifespan expiry, beast respawn,
 *   monster-spawn refresh (recovery/coins/age are derived, never tick-written)
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
  ageDaysForDragonInstance,
  applyEnergyDrain,
  breedForDragon,
  breedForIndex,
  canAffordEgg,
  canTrainDragon,
  collectibleCoins,
  drawBreedIndex,
  dragonStage,
  isBeastEligible,
  isDragonHatched,
  isDragonInstanceExpired,
  isHatchDue,
  levelForDragon,
  liveEnergyForDragon,
  remainingLifespanForDragon,
  resolveBeastTurn,
  resolveMonsterFight,
  rollBaseStrength,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollHatchMs,
  rollSpawnedMonsters,
  rollTrainingGain,
  sellPriceForDragon,
  trainingCostForDragon,
  trainingEnergyCost,
} from "./config";
import type {
  BeastState,
  Dragon,
  DragonBreed,
  DragonStage,
  FightLogEntry,
  GameState,
  ModalKind,
  MonsterDef,
  NewGameStateParams,
  Random01,
  ScreenRef,
} from "./types";
import {
  advanceCollectAnchor,
  beastTurnLogText,
  createDragonId,
  createEggDragon,
  hatchDragonInstance,
  monsterFightLogText,
  screensForRoster,
  withEnergyAnchor,
} from "./utils";

// ---------------------------------------------------------------------------
// Deps / results
// ---------------------------------------------------------------------------

export interface EngineStorage {
  load(): GameState | null;
  save(state: GameState): void;
}

export interface CreateEngineDeps {
  storage: EngineStorage;
  getTime: () => number;
  /** Random source in [0,1). Defaults to Math.random. Injected in tests. */
  rand01?: Random01;
  /** Id factory (rand01, nowMs) => id. Defaults to `createDragonId`. */
  generateId?: (rand01: number, nowMs: number) => string;
  playerId?: string;
}

export type EggSpinPreview =
  | { ok: true; breedIndex: number; breed: DragonBreed }
  | { ok: false; reason: "not-enough-coins" | "roster-full" };

export type ConfirmEggResult =
  | { ok: true; dragon: Dragon }
  | { ok: false; reason: "not-enough-coins" | "roster-full" };

export type TrainPreview =
  | { canTrain: true; cost: number; reason: null }
  | {
      canTrain: false;
      cost: number;
      reason: "unknown-dragon" | "egg" | "no-energy" | "not-enough-coins";
    };

export type TrainResult =
  | {
      ok: true;
      cost: number;
      gain: number;
      strengthAfter: number;
      levelBefore: number;
      levelAfter: number;
      energyCost: number;
      energyAfter: number;
    }
  | { ok: false; reason: TrainPreview["reason"] };

export type SellResult =
  | { ok: true; price: number }
  | { ok: false; reason: "unknown-dragon" | "egg" };

export type MonsterFightOutcome =
  | {
      ok: true;
      won: boolean;
      rawDamage: number;
      coinReward: number;
      energyLoss: number;
      energyAfter: number;
      strengthGain: number;
      strengthAfter: number;
      logText: string;
    }
  | {
      ok: false;
      reason:
        | "unknown-dragon"
        | "egg"
        | "no-energy"
        | "unknown-monster"
        | "monster-not-spawned";
    };

export interface BeastBattleTurn extends FightLogEntry {}

export type BeastBattleOutcome =
  | {
      ok: true;
      won: boolean;
      turns: BeastBattleTurn[];
      beastHpAfter: number;
      reward: number;
      removedDragonIds: string[];
      /** Permanent strength gained per surviving dragon id (only on win). */
      strengthGains: Record<string, number>;
    }
  | { ok: false; reason: "beast-vanished" | "no-participants" };

/** Derived per-dragon view model for the detail screen (§2). */
export interface DragonView {
  dragon: Dragon;
  breed: DragonBreed;
  stage: DragonStage;
  level: number;
  ageDays: number;
  /** Live energy at view time (recovery derived, never stored). */
  energy: number;
  strength: number;
  sellPrice: number;
  remainingLifespanDays: number;
  expired: boolean;
  canTrain: boolean;
  canFight: boolean;
}

/** Derived main-hub icon state (§1). */
export interface EconomyView {
  coins: number;
  collectible: number;
  /** Earn Coins icon visibility: shown only when collectible > 0. */
  hasCollectible: boolean;
  canAffordEgg: boolean;
}

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

  function hatchDueEggs(atMs: number): void {
    const s = requireState();
    for (const dragon of s.player.dragons) {
      if (dragon.hatchedAtMs !== null) continue;
      if (!isHatchDue(dragon.hatchAtMs, atMs)) continue;
      const breed = breedForDragon(dragon);
      const strength = rollBaseStrength(breed, rand());
      replaceDragon(hatchDragonInstance(dragon, atMs, strength));
      s.player.totalEggsHatched += 1;
    }
  }

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

  /** Advance the clock: hatch, expiry, beast respawn, spawn refresh. */
  function tick(atMs: number = now()): GameState {
    const s = requireState();
    s.nowMs = atMs;
    hatchDueEggs(atMs);
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
   * "Yo hoo": deduct the egg price and add the egg with its hidden 1–2 day
   * hatch timer encoded at purchase.
   */
  function confirmEggPurchase(
    breedIndex: number,
    hatchRand01?: number,
  ): ConfirmEggResult {
    const s = requireState();
    const atMs = now();
    if (!canAffordEgg(s.player.coins)) {
      return { ok: false, reason: "not-enough-coins" };
    }
    if (rosterFull()) return { ok: false, reason: "roster-full" };
    const breed = breedForIndex(breedIndex);
    s.player.coins -= CONFIG.egg.price;
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

  // -- hourly coins: tap-to-collect only (§3.7) --

  function collectibleAmount(atMs: number = now()): number {
    const s = requireState();
    return collectibleCoins(Math.max(0, atMs - s.player.lastCoinCollectMs));
  }

  function hasCollectible(atMs: number = now()): boolean {
    return collectibleAmount(atMs) > 0;
  }

  function getEconomyView(atMs: number = now()): EconomyView {
    const s = requireState();
    const collectible = collectibleAmount(atMs);
    return {
      coins: s.player.coins,
      collectible,
      hasCollectible: collectible > 0,
      canAffordEgg: canAffordEgg(s.player.coins),
    };
  }

  /** Tap Earn Coins: credit accrued hourly coins, preserve partial time. */
  function collectCoins(): { collected: number } {
    const s = requireState();
    const atMs = now();
    const advanced = advanceCollectAnchor(s.player.lastCoinCollectMs, atMs);
    if (advanced.collected > 0) {
      s.player.coins += advanced.collected;
      s.player.totalCoinsEarned += advanced.collected;
      s.player.lastCoinCollectMs = advanced.newLastCollectMs;
      save();
    }
    return { collected: advanced.collected };
  }

  // -- dragon views (§2) --

  function getDragonView(dragonId: string, atMs: number = now()): DragonView | null {
    const dragon = findDragon(dragonId);
    if (!dragon) return null;
    const s = requireState();
    const breed = breedForDragon(dragon);
    const energy = liveEnergyForDragon(dragon, atMs);
    return {
      dragon: { ...dragon },
      breed,
      stage: dragonStage(dragon.hatchedAtMs),
      level: levelForDragon(dragon),
      ageDays: ageDaysForDragonInstance(dragon, atMs),
      energy,
      strength: dragon.strength,
      sellPrice: sellPriceForDragon(dragon, atMs),
      remainingLifespanDays: remainingLifespanForDragon(dragon, atMs),
      expired: isDragonInstanceExpired(dragon, atMs),
      canTrain: canTrainDragon(dragon, s.player.coins, atMs),
      canFight: isBeastEligible(dragon, atMs),
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
    replaceDragon({
      ...dragon,
      strength: dragon.strength + gain,
      energy: energyAfter,
      lastEnergyUpdateMs: atMs,
    });
    s.player.totalTrainings += 1;
    const after = findDragon(dragonId);
    const strengthAfter = after?.strength ?? dragon.strength + gain;
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
    if (!dragon || !isDragonHatched(dragon)) return null;
    return sellPriceForDragon(dragon, atMs);
  }

  function sellDragon(dragonId: string): SellResult {
    const s = requireState();
    const atMs = now();
    const dragon = findDragon(dragonId);
    if (!dragon) return { ok: false, reason: "unknown-dragon" };
    if (!isDragonHatched(dragon)) return { ok: false, reason: "egg" };
    const price = sellPriceForDragon(dragon, atMs);
    removeDragons(new Set([dragonId]));
    s.player.coins += price;
    s.player.totalCoinsEarned += price;
    s.player.totalDragonsSold += 1;
    save();
    return { ok: true, price };
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
   * Single monster fight: `damage = (strength + bonus) - monsterStrength`.
   * Win = coins only; lose = strength unchanged. Both drain energy by the
   * difficulty-based loss (never a full restore).
   */
  function fightMonster(
    dragonId: string,
    monsterId: string,
    rolls?: { bonusRand01?: number; rewardRand01?: number; energyRand01?: number; strengthRand01?: number },
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
        dragon.strength,
        liveEnergy,
        target,
        rolls?.bonusRand01 ?? rand(),
        rolls?.rewardRand01 ?? rand(),
        rolls?.energyRand01 ?? rand(),
        rolls?.strengthRand01 ?? rand(),
      );
      const strengthAfter = dragon.strength + result.strengthGain;
      replaceDragon({
        ...dragon,
        strength: strengthAfter,
        energy: result.energyAfter,
        lastEnergyUpdateMs: atMs,
      });
      if (result.won) {
        s.player.coins += result.coinReward;
        s.player.totalCoinsEarned += result.coinReward;
        s.player.totalMonsterWins += 1;
      } else {
        s.player.totalMonsterLosses += 1;
      }
      const breed = breedForDragon(dragon);
      const logText = monsterFightLogText(
        breed.name,
        target.name,
        result.rawDamage,
        result.won,
      );
      s.ui.selectedDragonId = dragonId;
      s.ui.selectedMonsterId = monsterId;
      s.ui.activeModal = "monster-fight";
      s.ui.fightLog = [
        {
          turnIndex: 0,
          dragonId,
          text: logText,
          damage: result.rawDamage,
          dragonEnergyAfter: result.energyAfter,
        },
      ];
      save();
      return {
        ok: true,
        won: result.won,
        rawDamage: result.rawDamage,
        coinReward: result.coinReward,
        energyLoss: result.energyLoss,
        energyAfter: result.energyAfter,
        strengthGain: result.strengthGain,
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
   * Full Beast battle: each dragon attacks in roster order until removed,
   * the next steps in. Retaliation hits Energy; 0-energy dragons are
   * REMOVED. Win = vanish-for-a-day + coin reward + permanent strength gain
   * for every surviving participant; survivors keep drained energy.
   * Loss persists the beast's remaining HP (no strength gain).
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
      let hp = s.beast.currentHp;
      const turns: BeastBattleTurn[] = [];
      const removedIds = new Set<string>();
      const finalEnergies = new Map<string, number>();
      let turnIndex = 0;
      let defeated = false;

      s.ui.activeModal = "beast-fight";
      s.ui.fightLog = [];

      for (const participant of lineup) {
        let energy = liveEnergyForDragon(participant, atMs);
        finalEnergies.set(participant.id, energy);
        while (energy > 0 && !defeated) {
          const turn = resolveBeastTurn(
            participant.strength,
            energy,
            hp,
            rand(),
            rand(),
          );
          hp = turn.beastHpAfter;
          energy = turn.dragonEnergyAfter;
          finalEnergies.set(participant.id, energy);
          const breed = breedForDragon(participant);
          turns.push({
            turnIndex: turnIndex++,
            dragonId: participant.id,
            text: beastTurnLogText(
              breed.name,
              turn.rawDamage,
              turn.counterDamage,
            ),
            damage: turn.rawDamage,
            beastHpAfter: hp,
            dragonEnergyAfter: energy,
          });
          if (turn.beastDefeated) {
            defeated = true;
            break;
          }
          if (turn.dragonRemoved) {
            removedIds.add(participant.id);
            break;
          }
        }
        if (defeated) break;
      }

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
        s.beast.currentHp = hp;
      }

      // Persist energy (+ strength on win): removed dragons go, surviving
      // fighters keep drains; winners grow stronger.
      for (const [id, energy] of finalEnergies) {
        if (removedIds.has(id)) continue;
        const current = s.player.dragons.find((d) => d.id === id);
        if (!current) continue;
        if (defeated) {
          const gain = rollBeastWinStrengthGain(rand());
          strengthGains[id] = gain;
          replaceDragon({
            ...current,
            strength: current.strength + gain,
            energy,
            lastEnergyUpdateMs: atMs,
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
        beastHpAfter: defeated ? 0 : hp,
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
    if (screen.kind === "dragon") s.ui.selectedDragonId = screen.dragonId;
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
    // egg flow (spin-then-pay)
    spinEggPreview,
    confirmEggPurchase,
    canBuyEgg: () =>
      canAffordEgg(requireState().player.coins) && !rosterFull(),
    // coins (tap-to-collect)
    collectibleAmount,
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
