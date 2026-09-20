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
 * - Egg draw is uniform over the 15 breeds (`drawBreedIndex`); the old
 *   per-breed `eggWeight` field was removed (all weights were 1).
 * - Lifespan is per-breed (`DragonBreed.lifespanDays`, 30-45d; cheaper/
 *   weaker breeds live longer, epics shortest). There is no global maxAge.
 * - A dragon expires when `ageDaysForDragon() >= breed.lifespanDays`;
 *   callers should treat expired dragons as dead/removed on next tick.
 */

import type {
  BeastTurnResult,
  Difficulty,
  Dragon,
  DragonBreed,
  DragonStage,
  LevelThreshold,
  MonsterDef,
  MonsterFightResult,
  Random01,
  Rarity,
} from "./types";

export type {
  BeastTurnResult,
  Difficulty,
  Dragon,
  DragonBreed,
  DragonStage,
  LevelThreshold,
  MonsterDef,
  MonsterFightResult,
  Random01,
  Rarity,
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
    hourlyCoins: 12,
    coinAccrualIntervalMs: 60 * 60 * 1000,
    maxUncollectedMs: 12 * 60 * 60 * 1000,
    collectRequiresTap: true,
  },
  egg: {
    price: 100,
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
      { level: 9, minStrength: 110 },
      { level: 10, minStrength: 135 },
    ] as LevelThreshold[],
  },
  age: {
    ageTickMs: 24 * 60 * 60 * 1000,
    ageGainPerTick: 1,
    note: "Age is computed as nowMs - hatchedAtMs (0 for eggs); no ageDays/lastAgeTickMs stored. Lifespan is per-breed (DragonBreed.lifespanDays 30-45d).",
  },
  training: {
    requiresEnergyAbove: 0,
    requiresCoins: true,
    costBase: 8,
    costPerStrength: 0.8,
    strengthGainMin: 3,
    strengthGainMax: 7,
    cooldownMs: 0,
  },
  selling: {
    basePrice: 20,
    perStrength: 3.0,
    perAgeDay: 5,
  },
  battle: {
    randomBonusMin: 0,
    randomBonusMax: 10,
  },
  monsterSpawn: {
    maxShown: 3,
    rollPerDifficulty: true,
    refreshOnModalOpen: true,
    refreshIntervalMs: 15 * 60 * 1000,
    emptyStateText: "No monsters right now",
  },
  beast: {
    name: "Bewilder Beast",
    hp: 260,
    strengthConstant: 20,
    counterDamageMin: 18,
    counterDamageMax: 28,
    counterTarget: "energy" as const,
    turnOrder: "roster-order" as const,
    participants: "all-hatched-dragons-with-energy-above-0 (eggs excluded)",
    zeroEnergyBehaviour: "removed-from-roster" as const,
    loseCondition: "all-dragons-removed-before-hp-0",
    winRewardMin: 300,
    winRewardMax: 300,
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
    fightTurnDelayMs: 900,
    modalOverlayOpacity: 0.6,
    modalAnimation: "none" as const,
    fightModalLockedWhileResolving: true,
  },
  limits: {
    maxRoster: 12,
    maxEggsPending: 12,
  },
  balanceTargets: {
    timeToFirstHatch: "24-48h",
    hourlyIncome: 12,
    trainingsPerHourIncome: "~0.7 early, ~0.3 late",
    easyBeatableAt: "hatch + 1-2 trainings",
    mediumBeatableAt: "strength ~30 (about 3-5 trainings)",
    hardBeatableAt: "strength ~55 (about 7-12 trainings or epic breed)",
    beastBeatableAt: "roster of 3-5 dragons at strength 40-60",
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

export const MONSTERS: MonsterDef[] = [
  {
    id: "monster-1",
    name: "monster 1",
    difficulty: "Easy",
    strength: 15,
    rewardMin: 15,
    rewardMax: 25,
    spawnChance: 0.65,
    energyLossWinMin: 6,
    energyLossWinMax: 12,
    energyLossLoseMin: 12,
    energyLossLoseMax: 20,
    image: "monsters/gronkle.png",
  },
  {
    id: "monster-2",
    name: "monster 2",
    difficulty: "Medium",
    strength: 32,
    rewardMin: 35,
    rewardMax: 55,
    spawnChance: 0.28,
    energyLossWinMin: 10,
    energyLossWinMax: 16,
    energyLossLoseMin: 16,
    energyLossLoseMax: 26,
    image: "monsters/deadly_nadder.png",
  },
  {
    id: "monster-3",
    name: "monster 3",
    difficulty: "Hard",
    strength: 55,
    rewardMin: 70,
    rewardMax: 110,
    spawnChance: 0.12,
    energyLossWinMin: 14,
    energyLossWinMax: 22,
    energyLossLoseMin: 22,
    energyLossLoseMax: 34,
    image: "monsters/monstrous_nightmare.png",
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

export function canAffordEgg(coins: number): boolean {
  return coins >= CONFIG.egg.price;
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
 */
export function sellPrice(
  strength: number,
  ageDays: number,
  energy: number,
  breedSellMultiplier: number,
): number {
  return Math.floor(
    (CONFIG.selling.basePrice +
      strength * CONFIG.selling.perStrength +
      ageDays * CONFIG.selling.perAgeDay) *
      breedSellMultiplier *
      sellEnergyFactor(energy),
  );
}

// ---------- Battle (pure) ----------

export function rollDamageBonus(rand01: number): number {
  return rollIntInclusive(
    CONFIG.battle.randomBonusMin,
    CONFIG.battle.randomBonusMax,
    rand01,
  );
}

/** Raw damage: (dragonStrength + bonus) - opponentStrength. May be negative. Pure. */
export function battleDamage(
  dragonStrength: number,
  opponentStrength: number,
  bonus: number,
): number {
  return dragonStrength + bonus - opponentStrength;
}

export function isBattleWin(rawDamage: number): boolean {
  return rawDamage >= 0;
}

/** Full monster fight resolution. Pure — caller supplies rand01 values. */
export function resolveMonsterFight(
  dragonStrength: number,
  dragonEnergy: number,
  monster: MonsterDef,
  bonusRand01: number,
  rewardRand01: number,
  energyRand01: number,
): MonsterFightResult {
  const rawDamage = battleDamage(
    dragonStrength,
    monster.strength,
    rollDamageBonus(bonusRand01),
  );
  const won = isBattleWin(rawDamage);
  const coinReward = won
    ? rollIntInclusive(monster.rewardMin, monster.rewardMax, rewardRand01)
    : 0;
  const energyLoss = rollIntInclusive(
    won ? monster.energyLossWinMin : monster.energyLossLoseMin,
    won ? monster.energyLossWinMax : monster.energyLossLoseMax,
    energyRand01,
  );
  return {
    rawDamage,
    won,
    coinReward,
    energyLoss,
    energyAfter: applyEnergyDrain(dragonEnergy, energyLoss),
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

export function rollBeastCounterDamage(rand01: number): number {
  return rollIntInclusive(
    CONFIG.beast.counterDamageMin,
    CONFIG.beast.counterDamageMax,
    rand01,
  );
}

export function rollBeastReward(rand01: number): number {
  return rollIntInclusive(
    CONFIG.beast.winRewardMin,
    CONFIG.beast.winRewardMax,
    rand01,
  );
}

/** One Beast turn: dragon hits, beast retaliates on Energy. Pure. */
export function resolveBeastTurn(
  dragonStrength: number,
  dragonEnergy: number,
  beastHp: number,
  bonusRand01: number,
  counterRand01: number,
): BeastTurnResult {
  const rawDamage = battleDamage(
    dragonStrength,
    CONFIG.beast.strengthConstant,
    rollDamageBonus(bonusRand01),
  );
  const beastHpAfter = Math.max(0, beastHp - Math.max(0, rawDamage));
  const beastDefeated = beastHpAfter <= 0;
  const counterDamage = beastDefeated ? 0 : rollBeastCounterDamage(counterRand01);
  const dragonEnergyAfter = beastDefeated
    ? dragonEnergy
    : applyEnergyDrain(dragonEnergy, counterDamage);
  return {
    rawDamage,
    beastHpAfter,
    counterDamage,
    dragonEnergyAfter,
    dragonRemoved: !beastDefeated && dragonEnergyAfter <= CONFIG.energy.min,
    beastDefeated,
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
 * callers cannot accidentally pass stored values. Pure.
 */
export function sellPriceForDragon(dragon: Dragon, nowMs: number): number {
  const breed = breedForDragon(dragon);
  return sellPrice(
    dragon.strength,
    ageDaysForDragonInstance(dragon, nowMs),
    liveEnergyForDragon(dragon, nowMs),
    breed.sellMultiplier,
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
