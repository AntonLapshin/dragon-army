/**
 * Dragon Army — core mechanics config and formulas.
 *
 * This file is the single source of truth for game balance and rules.
 * Any gameplay functionality that relies on configuration data MUST call
 * the typed pure functions exported from this file instead of
 * reimplementing formulas inline or reading raw numbers directly.
 *
 * COMPUTED-NOT-STORED CONTRACT (see `Dragon` in types.ts):
 * - `Dragon` persists only event anchors: id/breedId/strength,
 *   energy@lastEnergyUpdateMs, purchasedAtMs/hatchAtMs/hatchedAtMs.
 * - Never store `stage`, `ageDays`, `lastAgeTickMs`, live energy, level,
 *   sell price, or lifespan countdown — derive them each tick via:
 *   `dragonStage()`, `isHatchDue()`, `ageDaysForDragon()` (= now - hatchedAtMs),
 *   `energyAt()`, `levelForStrength()`, `sellPrice()`,
 *   `remainingLifespanDays()` / `isDragonExpired()`.
 * - Rationale: wall-clock derivations can't drift or desync after offline
 *   gaps; tick loops must be idempotent (no per-day write jobs).
 *
 * NOTES:
 * - Egg draw is uniform over the 16 breeds (`drawBreedIndex`); the old
 *   per-breed `eggWeight` field was removed (all weights were 1).
 * - Lifespan is per-breed (`DragonBreed.lifespanDays`, 30-45d; cheaper/
 *   weaker breeds live longer, epics shortest). There is no global maxAge.
 * - A dragon expires when `ageDaysForDragon() >= breed.lifespanDays`;
 *   callers should treat expired dragons as dead/removed on next tick.
 */

import type {
  Dragon,
  DragonBreed,
  DragonEquipment,
  DragonStage,
  EquipmentDef,
  EquipmentSlotId,
  FightAttackResult,
  LevelThreshold,
  MonsterDef,
  Random01,
} from "./types";

export const CONFIG = {
  meta: {
    game: "dragon-army",
    configVersion: 1,
    currency: "coins",
    notes:
      "Balanced for Bip 6 / Zepp OS bite-size sessions. Starter egg -> 1-2 day hatch -> hourly coins fund training -> Easy -> Medium -> Hard -> Bewilder Beast.",
  },
  economy: {
    startingCoins: 100,
    hourlyCoins: 2,
    coinAccrualIntervalMs: 60 * 60 * 1000,
    maxUncollectedMs: 12 * 60 * 60 * 1000,
    collectRequiresTap: true,
    // Hybrid income: hourly coins accrue unconditionally (capped) PLUS
    // 1 bonus coin per `stepsPerCoin` watch steps (uncapped, koala-style).
    stepsPerCoin: 100,
  },
  egg: {
    price: 100,
    // Pick-a-specific-egg price (choose mode in the Egg modal).
    // Random spin stays at `price`; choosing a breed costs more.
    choosePrice: 150,
    breedCount: 16,
    hatchMinMs: 24 * 60 * 60 * 1000,
    hatchMaxMs: 48 * 60 * 60 * 1000,
    showTimer: false,
  },
  energy: {
    min: 0,
    max: 100,
    initial: 100,
    // Passive recovery: 10 energy per hour.
    recoveryAmount: 10,
    recoveryIntervalMs: 60 * 60 * 1000,
    blockedAtZero: ["train", "monster", "beast"] as const,
    beastZeroBehaviour: "removed" as const,
  },
  levels: {
    note: "Display-only tier derived from Strength. Does not enter damage formulas.",
    thresholds: [
      { level: 1, minStrength: 0 },
      { level: 2, minStrength: 15 },
      { level: 3, minStrength: 25 },
      { level: 4, minStrength: 35 },
      { level: 5, minStrength: 45 },
      { level: 6, minStrength: 60 },
      { level: 7, minStrength: 75 },
      { level: 8, minStrength: 90 },
      { level: 9, minStrength: 105 },
      { level: 10, minStrength: 120 },
    ] as LevelThreshold[],
  },
  age: {
    ageTickMs: 24 * 60 * 60 * 1000,
    ageGainPerTick: 1,
    note: "Age is computed as nowMs - hatchedAtMs (0 for eggs); no ageDays/lastAgeTickMs stored. Lifespan is per-breed (DragonBreed.lifespanDays 30-45d).",
  },
  strength: {
    // Absolute combat-strength ceiling. All gains clamp here so the
    // star display tops out at 5 gold stars (125 = 5 x 25).
    max: 125,
    // Star display: 5 strength = 1 silver star, 5 silver = 1 gold star
    // (so 25 strength = 1 gold star). See starsForStrength().
    perSilverStar: 5,
    silverPerGold: 5,
  },
  training: {
    requiresEnergyAbove: 0,
    requiresCoins: true,
    costBase: 8,
    costPerStrength: 0.8,
    strengthGainMin: 2,
    strengthGainMax: 5,
    // Training is hard work: each session drains this much energy (flat,
    // clamped at 0). Cheap next to a monster fight (70-100) but enough that
    // ~6 back-to-back sessions empty a full bar; recovery is 10/hour.
    energyCost: 15,
    cooldownMs: 0,
  },
  selling: {
    // Egg resale is the base alone (strength 0, age 0, breed-independent):
    // 70 vs the 100-coin buy price, so an instant flip always loses 30.
    // A fresh common hatch (~11 str) sells for ~81; training/age push it
    // toward 100 over several sessions — selling feels fair, not punitive.
    basePrice: 70,
    perStrength: 1.0,
    perAgeDay: 2,
  },
  // Turn-based fight screen (see `resolveFightAttack`): every attack
  // rolls hit/miss first, then damage on a hit. Accuracy grows with the
  // attacker's combat edge so stronger combatants land more reliably.
  fight: {
    hitChanceBase: 0.8,
    hitChancePerDiff: 0.004,
    hitChanceMin: 0.55,
    hitChanceMax: 0.95,
    damageBonusMin: 0,
    damageBonusMax: 8,
    // Even the weakest hit chips: fights never stall at 0 damage.
    minDamage: 3,
  },
  monsterSpawn: {
    maxShown: 3,
    rollPerDifficulty: true,
    refreshOnModalOpen: true,
    refreshIntervalMs: 60 * 60 * 1000,
    emptyStateText: "No monsters right now",
  },
  equipment: {
    // Price rule: 20 coins per +1 strength (legs 3 -> 60, tail 4 -> 80,
    // head/wings 5 -> 100). Full set: +26 for 520 coins.
    coinsPerBonus: 20,
    // Selling a dragon refunds half its owned-equipment cost (see
    // equipmentSellValue()); the other half is the cost of gearing up.
    sellRefundRate: 0.5,
  },
  beast: {
    name: "Bewilder Beast",
    // 580 HP + attack 85 (see `fight`): a 3-dragon team of combat-66
    // dragons wins ~62% of fights (Monte Carlo, balance.test.ts) — no
    // longer the old 100% guarantee. Two dragons at 66 almost never win;
    // four fully geared dragons still win reliably (earned, not free).
    hp: 580,
    // Beast attack strength for `resolveFightAttack` (defender = the
    // randomly picked dragon's combat strength). A hit lands for
    // ~85 - combat/2 + bonus, so a combat-66 dragon falls in 2 hits —
    // every beast turn threatens a kill, and a miss saves a dragon.
    attack: 85,
    // Display strength: feeds starsForStrength() for the boss icon /
    // intro / fight header (75 = exactly 3 gold stars). This is the
    // "final boss looks mighty" number shown to the player.
    strengthConstant: 75,
    // Combat defense: the defender number in `resolveFightAttack()` for
    // dragon blows (damage = combat - defense/2 + bonus). Decoupled from
    // the display value so the boss can LOOK like 3 gold stars while a
    // combat-66 dragon still deals ~47/hit. Without this split, a
    // display 75 would zero out every mid-game hit and the beast would
    // be unbeatable.
    combatDefense: 20,
    // The beast wears the FULL equipment set (all 7 slots, +26), so its
    // combat defense is 20 + 26 = 46 (see beastCombatDefense()) and its
    // display strength is 75 + 26 = 101 (see beastDisplayStrength()).
    // A fully equipped 40-strength dragon (combat 66) hits it exactly as
    // a bare 40-strength dragon hit the old 20-defense beast.
    equipmentBonus: 26,
    equipmentSlots: [
      "head",
      "wings",
      "tail",
      "leg-front-left",
      "leg-front-right",
      "leg-back-left",
      "leg-back-right",
    ] as EquipmentSlotId[],
    counterTarget: "energy" as const,
    // Round-based: every alive dragon attacks (roster order), then the
    // beast fires back at ONE randomly picked alive dragon. A lost fight
    // heals the beast back to full HP — no grinding it down across
    // attempts with sacrificial rosters.
    turnOrder: "round-based: all-alive-dragons, then beast-hits-random" as const,
    participants: "all-hatched-dragons-with-energy-above-0 (eggs excluded)",
    zeroEnergyBehaviour: "removed-from-roster" as const,
    loseCondition: "all-dragons-removed-before-hp-0",
    loseBehaviour: "beast-heals-to-full-hp" as const,
    winRewardMin: 300,
    winRewardMax: 300,
    // Survivors of a victorious beast battle grow stronger (rolled per dragon).
    winStrengthGainMin: 2,
    winStrengthGainMax: 4,
    respawnAfterWinMs: 24 * 60 * 60 * 1000,
  },
  timers: {
    tickIntervalMs: 5 * 1000,
    coinAccrualCheckMs: 60 * 1000,
    energyRecoveryTickMs: 5 * 1000,
  },
  ui: {
    eggSpinFrameMs: 120,
    eggSpinSymbols: "167468123?!-+",
    // Fight-screen replay: one stepFightScreen() tick per 100ms; a turn is
    // aim(2) + fly(4) + impact(5) = 11 ticks ≈ 1.1s.
    fightScreenTickMs: 100,
    modalOverlayOpacity: 0.6,
    modalAnimation: "none" as const,
  },
  limits: {
    maxRoster: 12,
    maxEggsPending: 12,
  },
  balanceTargets: {
    timeToFirstHatch: "24-48h",
    hourlyIncome: 2,
    trainingsPerHourIncome: "~0.12 early (passive only; fights fund training)",
    easyBeatableAt: "combat ~21 (fresh ~11 wins ~20%; reliable after 3-4 trainings; Easy wears no gear, 42 HP)",
    mediumBeatableAt: "combat ~38-40 (base ~30 + ~8 gear, or base ~40 bare; Medium wears head + leg = +8, 85 HP)",
    hardBeatableAt: "combat ~76-78 (base ~50 + full +26 gear; Hard wears all but one leg = +23, 105 HP)",
    beastBeatableAt: "3 dragons at combat ~66 win ~62% (e.g. base 40 + full +26 gear; beast wears all gear, defense 46, 580 HP, attack 85); 2 at 66 almost never win; 4 at 66 win reliably",
  },
} as const;

export const DRAGONS: DragonBreed[] = [
  // lifespanDays: cheaper/weaker breeds live longer (45d) down to epics (30d).
  // Night Fury is the strongest (epic, highest base strength).
  // assetKey: basename of assets/dragons/<key>.png + assets/eggs/<key>.png.
  { id: "dragon-1", name: "Gronkle", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1.0, lifespanDays: 45, assetKey: "gronkle" },
  { id: "dragon-2", name: "Hideous Zippleback", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1.0, lifespanDays: 44, assetKey: "hideous_zippleback" },
  { id: "dragon-3", name: "Snowtail", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1.0, lifespanDays: 43, assetKey: "snowtail" },
  { id: "dragon-4", name: "Windwalker", rarity: "common", baseStrengthMin: 9, baseStrengthMax: 14, sellMultiplier: 1.05, lifespanDays: 42, assetKey: "windwalker" },
  { id: "dragon-5", name: "Deadly Nadder", rarity: "common", baseStrengthMin: 9, baseStrengthMax: 15, sellMultiplier: 1.05, lifespanDays: 41, assetKey: "deadly_nadder" },
  { id: "dragon-6", name: "Wooly Howl", rarity: "uncommon", baseStrengthMin: 11, baseStrengthMax: 16, sellMultiplier: 1.15, lifespanDays: 40, assetKey: "wooly_howl" },
  { id: "dragon-7", name: "Monstrous Nightmare", rarity: "uncommon", baseStrengthMin: 11, baseStrengthMax: 17, sellMultiplier: 1.15, lifespanDays: 39, assetKey: "monstrous_nightmare" },
  { id: "dragon-8", name: "Razorwhip", rarity: "uncommon", baseStrengthMin: 12, baseStrengthMax: 17, sellMultiplier: 1.2, lifespanDays: 38, assetKey: "razorwhip" },
  { id: "dragon-9", name: "Songwing", rarity: "uncommon", baseStrengthMin: 12, baseStrengthMax: 18, sellMultiplier: 1.2, lifespanDays: 37, assetKey: "songwing" },
  { id: "dragon-10", name: "Triple Stryke", rarity: "uncommon", baseStrengthMin: 13, baseStrengthMax: 18, sellMultiplier: 1.25, lifespanDays: 36, assetKey: "triple_stryke" },
  { id: "dragon-11", name: "Stormcutter", rarity: "rare", baseStrengthMin: 14, baseStrengthMax: 20, sellMultiplier: 1.3, lifespanDays: 35, assetKey: "stormcutter" },
  { id: "dragon-12", name: "Skrill", rarity: "rare", baseStrengthMin: 14, baseStrengthMax: 20, sellMultiplier: 1.3, lifespanDays: 34, assetKey: "skrill" },
  { id: "dragon-13", name: "Light Night", rarity: "rare", baseStrengthMin: 15, baseStrengthMax: 21, sellMultiplier: 1.35, lifespanDays: 33, assetKey: "light_night" },
  { id: "dragon-14", name: "Night Light", rarity: "epic", baseStrengthMin: 16, baseStrengthMax: 22, sellMultiplier: 1.45, lifespanDays: 32, assetKey: "night_light" },
  { id: "dragon-15", name: "Light Fury", rarity: "epic", baseStrengthMin: 18, baseStrengthMax: 24, sellMultiplier: 1.55, lifespanDays: 31, assetKey: "light_fury" },
  { id: "dragon-16", name: "Night Fury", rarity: "epic", baseStrengthMin: 20, baseStrengthMax: 28, sellMultiplier: 1.7, lifespanDays: 30, assetKey: "night_fury" },
];

/**
 * Equipment catalogue — one purchasable piece per body slot (7 slots).
 * Price = bonus x 20 coins (CONFIG.equipment.coinsPerBonus): legs +3/60,
 * tail +4/80, head/wings +5/100. Full set: +26 strength for 520 coins.
 * Leg pieces share one leg-guard image; the four leg slots are distinct
 * purchases (each leg is armored separately).
 */
export const EQUIPMENT_SLOTS: EquipmentDef[] = [
  { id: "head", slot: "head", name: "Dragon Helm", slotLabel: "Head", bonus: 5, price: 100, image: "equipment/helm.png" },
  { id: "wings", slot: "wings", name: "Wing Guards", slotLabel: "Wings", bonus: 5, price: 100, image: "equipment/wing-guards.png" },
  { id: "tail", slot: "tail", name: "Tail Guard", slotLabel: "Tail", bonus: 4, price: 80, image: "equipment/tail-guard.png" },
  { id: "leg-front-left", slot: "leg-front-left", name: "Leg Guard", slotLabel: "Front left leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-front-right", slot: "leg-front-right", name: "Leg Guard", slotLabel: "Front right leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-back-left", slot: "leg-back-left", name: "Leg Guard", slotLabel: "Back left leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-back-right", slot: "leg-back-right", name: "Leg Guard", slotLabel: "Back right leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
];

/** Catalogue lookup by slot id (undefined for unknown ids). Pure. */
export function equipmentDefForSlot(slotId: string): EquipmentDef | undefined {
  return EQUIPMENT_SLOTS.find((e) => e.id === slotId);
}

export const MONSTERS: MonsterDef[] = [
  {
    id: "monster-1",
    name: "monster 1",
    difficulty: "Easy",
    strength: 19,
    rewardMin: 15,
    rewardMax: 25,
    spawnChance: 0.33,
    // Fight-screen HP pool. Tuned with Monte Carlo (balance.test.ts):
    // a fresh ~11 dragon wins ~20% (needs 7 landed hits, the monster
    // needs 6); a trained ~21 dragon wins ~99% but takes ~45 damage.
    hp: 42,
    // Winning a fight trains the dragon: small permanent strength gain.
    strengthGainWinMin: 1,
    strengthGainWinMax: 2,
    image: "monsters/gronkle.png",
    // Easy wears no equipment: effective strength stays 19.
    equipmentBonus: 0,
    equipmentSlots: [],
  },
  {
    id: "monster-2",
    name: "monster 2",
    difficulty: "Medium",
    strength: 32,
    rewardMin: 35,
    rewardMax: 55,
    spawnChance: 0.2,
    // 85 HP: combat ~38 wins ~65% (4 landed hits vs the monster's 4);
    // combat ~30 wins ~10%. A win costs ~65-70 energy.
    hp: 85,
    strengthGainWinMin: 1,
    strengthGainWinMax: 2,
    image: "monsters/deadly_nadder.png",
    // Medium wears some gear: helm (+5) + one leg (+3) = +8 -> effective 40.
    equipmentBonus: 8,
    equipmentSlots: ["head", "leg-front-left"],
  },
  {
    id: "monster-3",
    name: "monster 3",
    difficulty: "Hard",
    strength: 55,
    rewardMin: 70,
    rewardMax: 110,
    spawnChance: 0.1,
    // 105 HP: combat ~76 wins ~65% (3 landed hits vs the monster's 3);
    // a bare base-55 dragon wins ~0%. A win costs ~70 energy.
    hp: 105,
    strengthGainWinMin: 2,
    strengthGainWinMax: 4,
    image: "monsters/monstrous_nightmare.png",
    // Hard wears almost all gear: everything except one back leg = +23
    // (26 - 3) -> effective 78.
    equipmentBonus: 23,
    equipmentSlots: ["head", "wings", "tail", "leg-front-left", "leg-front-right", "leg-back-left"],
  },
];

// ---------- Generic helpers (pure) ----------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Inclusive integer roll from a [0, 1) random source. Pure. */
export function rollIntInclusive(min: number, max: number, rand01: number): number {
  return min + Math.floor(rand01 * (max - min + 1));
}

// ---------- Economy (pure) ----------

/** Max coins that can accumulate uncollected before capping. Derived, not stored. */
export function maxUncollectedCoins(): number {
  return (
    CONFIG.economy.hourlyCoins *
    (CONFIG.economy.maxUncollectedMs / CONFIG.economy.coinAccrualIntervalMs)
  );
}

/** Tap-to-collect coins earned for elapsed ms since last collect. Capped. Pure. */
export function collectibleCoins(elapsedMs: number): number {
  if (elapsedMs < CONFIG.economy.coinAccrualIntervalMs) return 0;
  const earned =
    Math.floor(elapsedMs / CONFIG.economy.coinAccrualIntervalMs) *
    CONFIG.economy.hourlyCoins;
  return Math.min(earned, maxUncollectedCoins());
}

export function hasCollectibleCoins(elapsedMs: number): boolean {
  return collectibleCoins(elapsedMs) > 0;
}

/** Bonus coins for a delta of watch steps since the last collect. Pure. */
export function stepCoinsForSteps(stepDelta: number): number {
  if (!Number.isFinite(stepDelta) || stepDelta < CONFIG.economy.stepsPerCoin)
    return 0;
  return Math.floor(stepDelta / CONFIG.economy.stepsPerCoin);
}

/**
 * Collectible step bonus from the sensor counter: current reading minus
 * the anchor stored at the last collect. Counter resets (e.g. daily
 * rollover) yield 0 — callers resync the anchor instead. Pure.
 */
export function collectibleStepCoins(
  currentSteps: number,
  lastCollectedSteps: number,
): number {
  if (!Number.isFinite(currentSteps) || !Number.isFinite(lastCollectedSteps))
    return 0;
  return stepCoinsForSteps(currentSteps - lastCollectedSteps);
}

/**
 * Hybrid collectible total: capped hourly coins + uncapped step bonus.
 * Pure.
 */
export function collectibleTotalCoins(
  elapsedMs: number,
  currentSteps: number,
  lastCollectedSteps: number,
): number {
  return (
    collectibleCoins(elapsedMs) +
    collectibleStepCoins(currentSteps, lastCollectedSteps)
  );
}

export function canAffordEgg(coins: number): boolean {
  return coins >= CONFIG.egg.price;
}

/** True when the player can afford a specific (chosen) egg (150 coins). Pure. */
export function canAffordChosenEgg(coins: number): boolean {
  return coins >= CONFIG.egg.choosePrice;
}

// ---------- Egg & hatch (pure) ----------

/** Uniform breed index in [0, breedCount). No weights — every breed is equally likely. Pure. */
export function drawBreedIndex(rand01: number): number {
  return Math.floor(rand01 * CONFIG.egg.breedCount);
}

export function breedForIndex(index: number): DragonBreed {
  return DRAGONS[clamp(index, 0, DRAGONS.length - 1)];
}

/** Hatch delay encoded at purchase, between hatchMinMs and hatchMaxMs. Pure. */
export function rollHatchMs(rand01: number): number {
  const { hatchMinMs, hatchMaxMs } = CONFIG.egg;
  return hatchMinMs + Math.floor(rand01 * (hatchMaxMs - hatchMinMs + 1));
}

export function rollBaseStrength(breed: DragonBreed, rand01: number): number {
  return rollIntInclusive(breed.baseStrengthMin, breed.baseStrengthMax, rand01);
}

// ---------- Energy & age (pure, computed-not-stored) ----------

/** Passive energy recovery over elapsed ms, clamped to [min, max]. Pure. */
export function recoverEnergy(currentEnergy: number, elapsedMs: number): number {
  const gained =
    (elapsedMs / CONFIG.energy.recoveryIntervalMs) * CONFIG.energy.recoveryAmount;
  return clamp(currentEnergy + gained, CONFIG.energy.min, CONFIG.energy.max);
}

/**
 * Live energy for a dragon at `nowMs` from its stored anchor.
 * Stored `energy` is the value AT `lastEnergyUpdateMs`; recovery is derived.
 * Never tick-write recovery back — only drains rewrite the anchor. Pure.
 */
export function energyAt(
  storedEnergy: number,
  lastEnergyUpdateMs: number,
  nowMs: number,
): number {
  return recoverEnergy(storedEnergy, Math.max(0, nowMs - lastEnergyUpdateMs));
}

export function applyEnergyDrain(currentEnergy: number, loss: number): number {
  return clamp(currentEnergy - loss, CONFIG.energy.min, CONFIG.energy.max);
}

export function canDragonFight(energy: number): boolean {
  return energy > CONFIG.energy.min;
}

export function ageDaysFromMs(elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / CONFIG.age.ageTickMs) * CONFIG.age.ageGainPerTick;
}

/** Stage derived from the hatch anchor — never stored. Pure. */
export function dragonStage(hatchedAtMs: number | null): DragonStage {
  return hatchedAtMs === null ? "egg" : "hatched";
}

/** True when an unhatched egg's hidden timer has elapsed. Pure. */
export function isHatchDue(hatchAtMs: number, nowMs: number): boolean {
  return nowMs >= hatchAtMs;
}

/**
 * Full days since hatch at `nowMs` (0 for eggs / unhatched / future dates).
 * Canonical age formula: `nowMs - hatchedAtMs`. Pure.
 */
export function ageDaysForDragon(
  hatchedAtMs: number | null,
  nowMs: number,
): number {
  if (hatchedAtMs === null) return 0;
  return ageDaysFromMs(nowMs - hatchedAtMs);
}

/** Lifespan countdown: breed lifespan minus computed age, floored at 0. Pure. */
export function remainingLifespanDays(
  breed: DragonBreed,
  hatchedAtMs: number | null,
  nowMs: number,
): number {
  if (hatchedAtMs === null) return breed.lifespanDays;
  return Math.max(0, breed.lifespanDays - ageDaysForDragon(hatchedAtMs, nowMs));
}

/**
 * True when the dragon has reached the end of its breed lifespan
 * (`ageDays >= lifespanDays`). Eggs never expire. Callers should remove
 * expired dragons on the next tick. Pure.
 */
export function isDragonExpired(
  breed: DragonBreed,
  hatchedAtMs: number | null,
  nowMs: number,
): boolean {
  if (hatchedAtMs === null) return false;
  return ageDaysForDragon(hatchedAtMs, nowMs) >= breed.lifespanDays;
}

// ---------- Level (pure, display-only) ----------

export function levelForStrength(strength: number): number {
  let level = 1;
  for (const t of CONFIG.levels.thresholds) {
    if (strength >= t.minStrength) level = t.level;
  }
  return level;
}

// ---------- Strength cap + star display (pure) ----------

export interface StrengthStars {
  gold: number;
  silver: number;
}

/** Clamp raw strength into [0, CONFIG.strength.max]. Pure. */
export function clampStrength(strength: number): number {
  return clamp(strength, 0, CONFIG.strength.max);
}

/**
 * Add a gain to current strength, clamped at CONFIG.strength.max.
 * Use for every permanent gain (train / monster win / beast win) so
 * max 125 is never exceeded. Pure.
 */
export function applyStrengthGain(current: number, gain: number): number {
  return clampStrength(current + gain);
}

/**
 * Star breakdown for a strength value: 5 strength = 1 silver star,
 * 5 silver stars = 1 gold star (25 strength = 1 gold).
 * e.g. 5 -> 1 silver, 25 -> 1 gold, 30 -> 1 gold + 1 silver.
 * Capped at CONFIG.strength.max (125 = 5 gold). Pure.
 */
export function starsForStrength(strength: number): StrengthStars {
  const capped = clampStrength(Math.floor(strength));
  const perGold = CONFIG.strength.perSilverStar * CONFIG.strength.silverPerGold;
  const gold = Math.floor(capped / perGold);
  const silver = Math.floor((capped - gold * perGold) / CONFIG.strength.perSilverStar);
  return { gold, silver };
}

// ---------- Training (pure) ----------

export function trainingCost(strength: number): number {
  return Math.floor(CONFIG.training.costBase + strength * CONFIG.training.costPerStrength);
}

export function rollTrainingGain(rand01: number): number {
  return rollIntInclusive(
    CONFIG.training.strengthGainMin,
    CONFIG.training.strengthGainMax,
    rand01,
  );
}

/** Flat energy drained by one training session. Pure. */
export function trainingEnergyCost(): number {
  return CONFIG.training.energyCost;
}

/** Permanent strength gained for winning vs this monster (0 on loss). Pure. */
export function rollMonsterWinStrengthGain(
  monster: MonsterDef,
  rand01: number,
): number {
  return rollIntInclusive(
    monster.strengthGainWinMin,
    monster.strengthGainWinMax,
    rand01,
  );
}

/** Permanent strength gained by each surviving beast-battle winner. Pure. */
export function rollBeastWinStrengthGain(rand01: number): number {
  return rollIntInclusive(
    CONFIG.beast.winStrengthGainMin,
    CONFIG.beast.winStrengthGainMax,
    rand01,
  );
}

export function canTrain(energy: number, coins: number, strength: number): boolean {
  return (
    energy > CONFIG.training.requiresEnergyAbove && coins >= trainingCost(strength)
  );
}

// ---------- Selling (pure) ----------

export function sellEnergyFactor(energy: number): number {
  return 0.5 + 0.5 * (clamp(energy, 0, CONFIG.energy.max) / CONFIG.energy.max);
}

/**
 * Sale price. Callers MUST pass computed values, never stored ones:
 * `ageDays = ageDaysForDragon(hatchedAtMs, nowMs)`,
 * `energy = energyAt(energyAnchor, lastEnergyUpdateMs, nowMs)`. Pure.
 *
 * The breed multiplier applies only to the earned part (strength + age),
 * not to the base: an unhatched egg (strength 0, age 0) always resells for
 * `basePrice` regardless of its hidden breed, while a trained dragon keeps
 * its breed premium.
 */
export function sellPrice(
  strength: number,
  ageDays: number,
  energy: number,
  breedSellMultiplier: number,
): number {
  return Math.floor(
    (CONFIG.selling.basePrice +
      (strength * CONFIG.selling.perStrength +
        ageDays * CONFIG.selling.perAgeDay) *
        breedSellMultiplier) *
      sellEnergyFactor(energy),
  );
}

// ---------- Equipment (pure) ----------

/**
 * Sum of owned equipment bonuses. `equipment` may be partial / absent on
 * old saves — unknown slots count as empty. Pure.
 */
export function equipmentBonusForEquipment(
  equipment: DragonEquipment | undefined | null,
): number {
  if (!equipment || typeof equipment !== "object") return 0;
  let total = 0;
  for (const def of EQUIPMENT_SLOTS) {
    if ((equipment as Record<string, unknown>)[def.id] === true) total += def.bonus;
  }
  return total;
}

/** Total coins spent on the owned pieces (sum of catalogue prices). Pure. */
export function equipmentCostForEquipment(
  equipment: DragonEquipment | undefined | null,
): number {
  if (!equipment || typeof equipment !== "object") return 0;
  let total = 0;
  for (const def of EQUIPMENT_SLOTS) {
    if ((equipment as Record<string, unknown>)[def.id] === true) total += def.price;
  }
  return total;
}

/**
 * Sell refund for owned gear: half the spent cost, floored
 * (`CONFIG.equipment.sellRefundRate`). Full set (520) refunds 260. Pure.
 */
export function equipmentSellValue(
  equipment: DragonEquipment | undefined | null,
): number {
  return Math.floor(
    equipmentCostForEquipment(equipment) * CONFIG.equipment.sellRefundRate,
  );
}

/**
 * Combat strength actually used in fights: base + owned-equipment bonus.
 * Base stays capped at 125 (training / wins); combat can reach 151
 * (125 + 26 full set). Pure.
 */
export function combatStrengthForDragon(dragon: Dragon): number {
  return dragon.strength + equipmentBonusForEquipment(dragon.equipment);
}

/** Combat strength for a monster: base + its equipment bonus. Pure. */
export function effectiveMonsterStrength(monster: MonsterDef): number {
  return monster.strength + (monster.equipmentBonus ?? 0);
}

// ---------- Battle (pure) ----------

/**
 * Hit chance for one attack: base 80%, +/- 0.4% per point of combat edge
 * over the defender, clamped to [55%, 95%]. A stronger combatant lands
 * more reliably; a weaker one still lands over half its blows, so
 * underdog fights stay winnable, not hopeless. Pure.
 */
export function fightHitChance(
  attackerCombat: number,
  defenderCombat: number,
): number {
  return clamp(
    CONFIG.fight.hitChanceBase +
      CONFIG.fight.hitChancePerDiff * (attackerCombat - defenderCombat),
    CONFIG.fight.hitChanceMin,
    CONFIG.fight.hitChanceMax,
  );
}

/** Damage bonus rolled per landed hit (0-8). Pure. */
export function rollFightDamageBonus(rand01: number): number {
  return rollIntInclusive(
    CONFIG.fight.damageBonusMin,
    CONFIG.fight.damageBonusMax,
    rand01,
  );
}

/**
 * Damage of one landed hit: attacker combat minus HALF the defender's
 * combat, plus a 0-8 bonus, floored at `minDamage` (3). Half-defense
 * keeps every matchup damaging on both sides — a fresh dragon still
 * chips Easy, and the beast still hurts a geared dragon — so fights are
 * races over several rounds, not one-roll coin flips. Pure.
 */
export function fightHitDamage(
  attackerCombat: number,
  defenderCombat: number,
  bonusRand01: number,
): number {
  return Math.max(
    CONFIG.fight.minDamage,
    attackerCombat -
      Math.floor(defenderCombat / 2) +
      rollFightDamageBonus(bonusRand01),
  );
}

/**
 * One attack: roll hit/miss, then damage on a hit. `attackerCombat` /
 * `defenderCombat` are COMBAT strengths (base + equipment); the beast
 * passes `CONFIG.beast.attack` as attacker and `beastCombatDefense()`
 * as defender for dragon blows. Pure — the engine loops this until one
 * side's HP hits 0 (monster 1v1, beast round-based).
 */
export function resolveFightAttack(
  attackerCombat: number,
  defenderHp: number,
  defenderCombat: number,
  hitRand01: number,
  damageRand01: number,
): FightAttackResult {
  const hit = hitRand01 < fightHitChance(attackerCombat, defenderCombat);
  const damage = hit ? fightHitDamage(attackerCombat, defenderCombat, damageRand01) : 0;
  return {
    hit,
    damage,
    defenderHpAfter: Math.max(0, defenderHp - damage),
  };
}

/**
 * Full 1v1 monster fight, resolved turn-by-turn (dragon attacks, then
 * the monster fires back while alive). Pure — the caller supplies the
 * random source; the engine drives it with its injected `rand()`.
 * Returns every attack so the fight screen can replay the fireballs,
 * plus the outcome (win = monster HP 0; dragon HP left = energy left).
 */
export function resolveMonsterFight(
  dragonCombat: number,
  dragonEnergy: number,
  monster: MonsterDef,
  rand01: Random01,
): {
  won: boolean;
  turns: { attackerKind: "dragon" | "enemy"; hit: boolean; damage: number; defenderHpAfter: number }[];
  dragonHpAfter: number;
  monsterHpAfter: number;
  totalDamageDealt: number;
} {
  const turns: {
    attackerKind: "dragon" | "enemy";
    hit: boolean;
    damage: number;
    defenderHpAfter: number;
  }[] = [];
  let dragonHp = dragonEnergy;
  let monsterHp = monster.hp;
  let totalDamageDealt = 0;
  // Pity: at most 2 consecutive misses per side, then the next attack
  // auto-hits. Fights always terminate (even with a degenerate random
  // source) and the screen never shows endless whiffing.
  let dragonMissStreak = 0;
  let monsterMissStreak = 0;
  while (dragonHp > 0 && monsterHp > 0) {
    const attack = resolveFightAttack(
      dragonCombat,
      monsterHp,
      effectiveMonsterStrength(monster),
      dragonMissStreak >= 2 ? 0 : rand01(),
      rand01(),
    );
    dragonMissStreak = attack.hit ? 0 : dragonMissStreak + 1;
    turns.push({ attackerKind: "dragon", ...attack });
    monsterHp = attack.defenderHpAfter;
    totalDamageDealt += attack.damage;
    if (monsterHp <= 0) break;
    const retaliation = resolveFightAttack(
      effectiveMonsterStrength(monster),
      dragonHp,
      dragonCombat,
      monsterMissStreak >= 2 ? 0 : rand01(),
      rand01(),
    );
    monsterMissStreak = retaliation.hit ? 0 : monsterMissStreak + 1;
    turns.push({ attackerKind: "enemy", ...retaliation });
    dragonHp = retaliation.defenderHpAfter;
  }
  return {
    won: monsterHp <= 0,
    turns,
    dragonHpAfter: dragonHp,
    monsterHpAfter: monsterHp,
    totalDamageDealt,
  };
}

export function shouldSpawnMonster(spawnChance: number, rand01: number): boolean {
  return rand01 < spawnChance;
}

/** Roll currently spawned monsters (0–3), one independent roll per difficulty. Pure. */
export function rollSpawnedMonsters(rand01: Random01): MonsterDef[] {
  return MONSTERS.filter((m) => shouldSpawnMonster(m.spawnChance, rand01())).slice(
    0,
    CONFIG.monsterSpawn.maxShown,
  );
}

// ---------- Bewilder Beast (pure) ----------

/**
 * Effective beast defense used in damage math: base 20 + full-equipment
 * bonus 26 = 46. The beast wears all gear, so a fully equipped dragon
 * (combat = base + 26) hits it exactly as a bare dragon hit the old
 * 20-defense beast; a bare mid-game roster barely scratches it. Pure.
 */
export function beastCombatDefense(): number {
  return CONFIG.beast.combatDefense + CONFIG.beast.equipmentBonus;
}

/**
 * Display strength for the beast icon / intro / fight header:
 * 75 (3 gold stars) + full-equipment bonus 26 = 101 (4 gold stars).
 * Pure.
 */
export function beastDisplayStrength(): number {
  return CONFIG.beast.strengthConstant + CONFIG.beast.equipmentBonus;
}

export function rollBeastReward(rand01: number): number {
  return rollIntInclusive(
    CONFIG.beast.winRewardMin,
    CONFIG.beast.winRewardMax,
    rand01,
  );
}

/**
 * Full Bewilder Beast fight, round-based. Pure — the caller supplies the
 * random source; the engine drives it with its injected `rand()`.
 *
 * Each round: every alive dragon attacks in roster order (combat vs
 * `beastCombatDefense()`), then — if the beast still stands — it fires
 * back at ONE uniformly random alive dragon (`CONFIG.beast.attack` vs
 * that dragon's combat). A beast hit lands for ~85 - combat/2 + bonus,
 * so a combat-66 dragon falls in 2 hits: every beast turn threatens a
 * kill, and a miss saves a dragon.
 *
 * `dragonCombats` / `dragonHps` are parallel arrays (roster order);
 * `beastHp` is the HP at fight entry. Returns every attack (the fight
 * screen replays them) plus the final HPs, so the engine can persist
 * survivor energy, removals, and the killer.
 */
export function resolveBeastFight(
  dragonCombats: number[],
  dragonHps: number[],
  beastHp: number,
  rand01: Random01,
): {
  won: boolean;
  killerIndex: number | null;
  turns: {
    attackerKind: "dragon" | "enemy";
    attackerIndex: number | null;
    targetIndex: number | null;
    hit: boolean;
    damage: number;
    defenderHpAfter: number;
  }[];
  dragonHpsAfter: number[];
  beastHpAfter: number;
} {
  const turns: {
    attackerKind: "dragon" | "enemy";
    attackerIndex: number | null;
    targetIndex: number | null;
    hit: boolean;
    damage: number;
    defenderHpAfter: number;
  }[] = [];
  const hps = [...dragonHps];
  let hp = beastHp;
  let killerIndex: number | null = null;
  const alive = () => hps.map((h, i) => (h > 0 ? i : -1)).filter((i) => i >= 0);
  // Pity (see resolveMonsterFight): at most 2 consecutive misses per
  // combatant, then the next attack auto-hits — fights always terminate.
  const dragonMissStreaks = dragonCombats.map(() => 0);
  let beastMissStreak = 0;
  while (hp > 0 && alive().length > 0) {
    for (const i of alive()) {
      const attack = resolveFightAttack(
        dragonCombats[i],
        hp,
        beastCombatDefense(),
        dragonMissStreaks[i] >= 2 ? 0 : rand01(),
        rand01(),
      );
      dragonMissStreaks[i] = attack.hit ? 0 : dragonMissStreaks[i] + 1;
      turns.push({
        attackerKind: "dragon",
        attackerIndex: i,
        targetIndex: null,
        ...attack,
      });
      hp = attack.defenderHpAfter;
      if (hp <= 0) {
        killerIndex = i;
        break;
      }
    }
    if (hp <= 0) break;
    const targets = alive();
    const targetIndex = targets[Math.floor(rand01() * targets.length)];
    const retaliation = resolveFightAttack(
      CONFIG.beast.attack,
      hps[targetIndex],
      dragonCombats[targetIndex],
      beastMissStreak >= 2 ? 0 : rand01(),
      rand01(),
    );
    beastMissStreak = retaliation.hit ? 0 : beastMissStreak + 1;
    turns.push({
      attackerKind: "enemy",
      attackerIndex: null,
      targetIndex,
      ...retaliation,
    });
    hps[targetIndex] = retaliation.defenderHpAfter;
  }
  return {
    won: hp <= 0,
    killerIndex,
    turns,
    dragonHpsAfter: hps,
    beastHpAfter: hp,
  };
}

// ---------- Dragon-instance helpers (pure, data-touching) ----------
// Per the computed-not-stored contract these compose the primitive
// formulas above with a stored `Dragon` anchor + `nowMs`. They never
// mutate: callers persist the returned derived values only where the
// contract allows (drain anchors, hatch writes, removals).

/** Catalogue lookup by `DragonBreed.id`. Pure. */
export function findBreed(breedId: string): DragonBreed | undefined {
  return DRAGONS.find((b) => b.id === breedId);
}

/**
 * Breed for a roster entry. Falls back to the first catalogue entry when
 * the id is unknown so callers never crash on stale saves. Pure.
 */
export function breedForDragon(dragon: Dragon): DragonBreed {
  return findBreed(dragon.breedId) ?? DRAGONS[0];
}

/** True once `hatchedAtMs` has been set (eggs excluded from actions). Pure. */
export function isDragonHatched(dragon: Dragon): boolean {
  return dragon.hatchedAtMs !== null;
}

/** Live energy at `nowMs` from the stored anchor (recovery derived). Pure. */
export function liveEnergyForDragon(dragon: Dragon, nowMs: number): number {
  return energyAt(dragon.energy, dragon.lastEnergyUpdateMs, nowMs);
}

/** Full age-days at `nowMs` (0 for eggs). Pure. */
export function ageDaysForDragonInstance(dragon: Dragon, nowMs: number): number {
  return ageDaysForDragon(dragon.hatchedAtMs, nowMs);
}

/** Lifespan countdown for the instance, floored at 0. Pure. */
export function remainingLifespanForDragon(
  dragon: Dragon,
  nowMs: number,
): number {
  return remainingLifespanDays(breedForDragon(dragon), dragon.hatchedAtMs, nowMs);
}

/** True when a hatched dragon reached its breed lifespan. Pure. */
export function isDragonInstanceExpired(dragon: Dragon, nowMs: number): boolean {
  return isDragonExpired(
    breedForDragon(dragon),
    dragon.hatchedAtMs,
    nowMs,
  );
}

/** Display-only level tier for the instance. Pure. */
export function levelForDragon(dragon: Dragon): number {
  return levelForStrength(dragon.strength);
}

/** Current training cost for the instance's strength. Pure. */
export function trainingCostForDragon(dragon: Dragon): number {
  return trainingCost(dragon.strength);
}

/**
 * Sale price for the instance. Derives age + live energy internally so
 * callers cannot accidentally pass stored values. Base formula PLUS a
 * 50% refund on owned-equipment cost (full set refunds 260). Pure.
 */
export function sellPriceForDragon(dragon: Dragon, nowMs: number): number {
  const breed = breedForDragon(dragon);
  return (
    sellPrice(
      dragon.strength,
      ageDaysForDragonInstance(dragon, nowMs),
      liveEnergyForDragon(dragon, nowMs),
      breed.sellMultiplier,
    ) + equipmentSellValue(dragon.equipment)
  );
}

/**
 * A hatched dragon with live energy above 0 can Train / fight monsters /
 * join Beast battles. Pure.
 */
export function canFightDragon(dragon: Dragon, nowMs: number): boolean {
  return (
    isDragonHatched(dragon) && canDragonFight(liveEnergyForDragon(dragon, nowMs))
  );
}

/** Train gate for the instance (hatched + energy + coins). Pure. */
export function canTrainDragon(
  dragon: Dragon,
  coins: number,
  nowMs: number,
): boolean {
  if (!isDragonHatched(dragon)) return false;
  return canTrain(liveEnergyForDragon(dragon, nowMs), coins, dragon.strength);
}

/**
 * Beast-battle eligibility: hatched entries with live energy above 0, in
 * roster order. Eggs never participate. Pure predicate for filtering.
 */
export function isBeastEligible(dragon: Dragon, nowMs: number): boolean {
  return canFightDragon(dragon, nowMs);
}
