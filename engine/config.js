// GENERATED from engine/config.ts — do not edit by hand.
// Regenerate with: npm run build:engine
// (zeus build only bundles .js; the .ts sources are for vitest.)
const CONFIG = {
  meta: {
    game: "dragon-army",
    configVersion: 1,
    currency: "coins",
    notes: "Balanced for Bip 6 / Zepp OS bite-size sessions. Starter egg -> 1-2 day hatch -> hourly coins fund training -> Easy -> Medium -> Hard -> Bewilder Beast."
  },
  economy: {
    startingCoins: 100,
    hourlyCoins: 2,
    coinAccrualIntervalMs: 60 * 60 * 1e3,
    maxUncollectedMs: 12 * 60 * 60 * 1e3,
    collectRequiresTap: true
  },
  egg: {
    price: 100,
    breedCount: 16,
    hatchMinMs: 24 * 60 * 60 * 1e3,
    hatchMaxMs: 48 * 60 * 60 * 1e3,
    showTimer: false
  },
  energy: {
    min: 0,
    max: 100,
    initial: 100,
    // Passive recovery: 10 energy per hour.
    recoveryAmount: 10,
    recoveryIntervalMs: 60 * 60 * 1e3,
    blockedAtZero: ["train", "monster", "beast"],
    beastZeroBehaviour: "removed"
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
      { level: 10, minStrength: 120 }
    ]
  },
  age: {
    ageTickMs: 24 * 60 * 60 * 1e3,
    ageGainPerTick: 1,
    note: "Age is computed as nowMs - hatchedAtMs (0 for eggs); no ageDays/lastAgeTickMs stored. Lifespan is per-breed (DragonBreed.lifespanDays 30-45d)."
  },
  strength: {
    // Absolute combat-strength ceiling. All gains clamp here so the
    // star display tops out at 5 gold stars (125 = 5 x 25).
    max: 125,
    // Star display: 5 strength = 1 silver star, 5 silver = 1 gold star
    // (so 25 strength = 1 gold star). See starsForStrength().
    perSilverStar: 5,
    silverPerGold: 5
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
    cooldownMs: 0
  },
  selling: {
    basePrice: 10,
    perStrength: 1.5,
    perAgeDay: 2
  },
  battle: {
    randomBonusMin: 0,
    randomBonusMax: 10
  },
  monsterSpawn: {
    maxShown: 3,
    rollPerDifficulty: true,
    refreshOnModalOpen: true,
    refreshIntervalMs: 60 * 60 * 1e3,
    emptyStateText: "No monsters right now"
  },
  beast: {
    name: "Bewilder Beast",
    hp: 260,
    strengthConstant: 20,
    counterDamageMin: 18,
    counterDamageMax: 28,
    counterTarget: "energy",
    turnOrder: "roster-order",
    participants: "all-hatched-dragons-with-energy-above-0 (eggs excluded)",
    zeroEnergyBehaviour: "removed-from-roster",
    loseCondition: "all-dragons-removed-before-hp-0",
    winRewardMin: 300,
    winRewardMax: 300,
    // Survivors of a victorious beast battle grow stronger (rolled per dragon).
    winStrengthGainMin: 2,
    winStrengthGainMax: 4,
    respawnAfterWinMs: 24 * 60 * 60 * 1e3
  },
  timers: {
    tickIntervalMs: 5 * 1e3,
    coinAccrualCheckMs: 60 * 1e3,
    energyRecoveryTickMs: 5 * 1e3
  },
  ui: {
    eggSpinFrameMs: 120,
    eggSpinSymbols: "167468123?!-+",
    fightTurnDelayMs: 900,
    modalOverlayOpacity: 0.6,
    modalAnimation: "none",
    fightModalLockedWhileResolving: true
  },
  limits: {
    maxRoster: 12,
    maxEggsPending: 12
  },
  balanceTargets: {
    timeToFirstHatch: "24-48h",
    hourlyIncome: 2,
    trainingsPerHourIncome: "~0.12 early (passive only; fights fund training)",
    easyBeatableAt: "strength ~19 (fresh ~11 wins ~25%; reliable after 3-4 trainings)",
    mediumBeatableAt: "strength ~30 (about 4-7 trainings)",
    hardBeatableAt: "strength ~55 (about 9-15 trainings or epic breed)",
    beastBeatableAt: "roster of 3-5 dragons at strength 40-60"
  }
};
const DRAGONS = [
  // lifespanDays: cheaper/weaker breeds live longer (45d) down to epics (30d).
  // Night Fury is the strongest (epic, highest base strength).
  // assetKey: basename of assets/dragons/<key>.png + assets/eggs/<key>.png.
  { id: "dragon-1", name: "Gronkle", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1, lifespanDays: 45, assetKey: "gronkle" },
  { id: "dragon-2", name: "Hideous Zippleback", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1, lifespanDays: 44, assetKey: "hideous_zippleback" },
  { id: "dragon-3", name: "Snowtail", rarity: "common", baseStrengthMin: 8, baseStrengthMax: 14, sellMultiplier: 1, lifespanDays: 43, assetKey: "snowtail" },
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
  { id: "dragon-16", name: "Night Fury", rarity: "epic", baseStrengthMin: 20, baseStrengthMax: 28, sellMultiplier: 1.7, lifespanDays: 30, assetKey: "night_fury" }
];
const MONSTERS = [
  {
    id: "monster-1",
    name: "monster 1",
    difficulty: "Easy",
    strength: 19,
    rewardMin: 15,
    rewardMax: 25,
    spawnChance: 0.33,
    energyLossWinMin: 70,
    energyLossWinMax: 100,
    energyLossLoseMin: 85,
    energyLossLoseMax: 100,
    // Winning a fight trains the dragon: small permanent strength gain.
    strengthGainWinMin: 1,
    strengthGainWinMax: 2,
    image: "monsters/gronkle.png"
  },
  {
    id: "monster-2",
    name: "monster 2",
    difficulty: "Medium",
    strength: 32,
    rewardMin: 35,
    rewardMax: 55,
    spawnChance: 0.2,
    energyLossWinMin: 80,
    energyLossWinMax: 100,
    energyLossLoseMin: 90,
    energyLossLoseMax: 100,
    strengthGainWinMin: 1,
    strengthGainWinMax: 2,
    image: "monsters/deadly_nadder.png"
  },
  {
    id: "monster-3",
    name: "monster 3",
    difficulty: "Hard",
    strength: 55,
    rewardMin: 70,
    rewardMax: 110,
    spawnChance: 0.1,
    energyLossWinMin: 90,
    energyLossWinMax: 100,
    energyLossLoseMin: 95,
    energyLossLoseMax: 100,
    strengthGainWinMin: 2,
    strengthGainWinMax: 4,
    image: "monsters/monstrous_nightmare.png"
  }
];
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function rollIntInclusive(min, max, rand01) {
  return min + Math.floor(rand01 * (max - min + 1));
}
function maxUncollectedCoins() {
  return CONFIG.economy.hourlyCoins * (CONFIG.economy.maxUncollectedMs / CONFIG.economy.coinAccrualIntervalMs);
}
function collectibleCoins(elapsedMs) {
  if (elapsedMs < CONFIG.economy.coinAccrualIntervalMs) return 0;
  const earned = Math.floor(elapsedMs / CONFIG.economy.coinAccrualIntervalMs) * CONFIG.economy.hourlyCoins;
  return Math.min(earned, maxUncollectedCoins());
}
function hasCollectibleCoins(elapsedMs) {
  return collectibleCoins(elapsedMs) > 0;
}
function canAffordEgg(coins) {
  return coins >= CONFIG.egg.price;
}
function drawBreedIndex(rand01) {
  return Math.floor(rand01 * CONFIG.egg.breedCount);
}
function breedForIndex(index) {
  return DRAGONS[clamp(index, 0, DRAGONS.length - 1)];
}
function rollHatchMs(rand01) {
  const { hatchMinMs, hatchMaxMs } = CONFIG.egg;
  return hatchMinMs + Math.floor(rand01 * (hatchMaxMs - hatchMinMs + 1));
}
function rollBaseStrength(breed, rand01) {
  return rollIntInclusive(breed.baseStrengthMin, breed.baseStrengthMax, rand01);
}
function recoverEnergy(currentEnergy, elapsedMs) {
  const gained = elapsedMs / CONFIG.energy.recoveryIntervalMs * CONFIG.energy.recoveryAmount;
  return clamp(currentEnergy + gained, CONFIG.energy.min, CONFIG.energy.max);
}
function energyAt(storedEnergy, lastEnergyUpdateMs, nowMs) {
  return recoverEnergy(storedEnergy, Math.max(0, nowMs - lastEnergyUpdateMs));
}
function applyEnergyDrain(currentEnergy, loss) {
  return clamp(currentEnergy - loss, CONFIG.energy.min, CONFIG.energy.max);
}
function canDragonFight(energy) {
  return energy > CONFIG.energy.min;
}
function ageDaysFromMs(elapsedMs) {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / CONFIG.age.ageTickMs) * CONFIG.age.ageGainPerTick;
}
function dragonStage(hatchedAtMs) {
  return hatchedAtMs === null ? "egg" : "hatched";
}
function isHatchDue(hatchAtMs, nowMs) {
  return nowMs >= hatchAtMs;
}
function ageDaysForDragon(hatchedAtMs, nowMs) {
  if (hatchedAtMs === null) return 0;
  return ageDaysFromMs(nowMs - hatchedAtMs);
}
function remainingLifespanDays(breed, hatchedAtMs, nowMs) {
  if (hatchedAtMs === null) return breed.lifespanDays;
  return Math.max(0, breed.lifespanDays - ageDaysForDragon(hatchedAtMs, nowMs));
}
function isDragonExpired(breed, hatchedAtMs, nowMs) {
  if (hatchedAtMs === null) return false;
  return ageDaysForDragon(hatchedAtMs, nowMs) >= breed.lifespanDays;
}
function levelForStrength(strength) {
  let level = 1;
  for (const t of CONFIG.levels.thresholds) {
    if (strength >= t.minStrength) level = t.level;
  }
  return level;
}
function clampStrength(strength) {
  return clamp(strength, 0, CONFIG.strength.max);
}
function applyStrengthGain(current, gain) {
  return clampStrength(current + gain);
}
function starsForStrength(strength) {
  const capped = clampStrength(Math.floor(strength));
  const perGold = CONFIG.strength.perSilverStar * CONFIG.strength.silverPerGold;
  const gold = Math.floor(capped / perGold);
  const silver = Math.floor((capped - gold * perGold) / CONFIG.strength.perSilverStar);
  return { gold, silver };
}
function trainingCost(strength) {
  return Math.floor(CONFIG.training.costBase + strength * CONFIG.training.costPerStrength);
}
function rollTrainingGain(rand01) {
  return rollIntInclusive(
    CONFIG.training.strengthGainMin,
    CONFIG.training.strengthGainMax,
    rand01
  );
}
function trainingEnergyCost() {
  return CONFIG.training.energyCost;
}
function rollMonsterWinStrengthGain(monster, rand01) {
  return rollIntInclusive(
    monster.strengthGainWinMin,
    monster.strengthGainWinMax,
    rand01
  );
}
function rollBeastWinStrengthGain(rand01) {
  return rollIntInclusive(
    CONFIG.beast.winStrengthGainMin,
    CONFIG.beast.winStrengthGainMax,
    rand01
  );
}
function canTrain(energy, coins, strength) {
  return energy > CONFIG.training.requiresEnergyAbove && coins >= trainingCost(strength);
}
function sellEnergyFactor(energy) {
  return 0.5 + 0.5 * (clamp(energy, 0, CONFIG.energy.max) / CONFIG.energy.max);
}
function sellPrice(strength, ageDays, energy, breedSellMultiplier) {
  return Math.floor(
    (CONFIG.selling.basePrice + strength * CONFIG.selling.perStrength + ageDays * CONFIG.selling.perAgeDay) * breedSellMultiplier * sellEnergyFactor(energy)
  );
}
function rollDamageBonus(rand01) {
  return rollIntInclusive(
    CONFIG.battle.randomBonusMin,
    CONFIG.battle.randomBonusMax,
    rand01
  );
}
function battleDamage(dragonStrength, opponentStrength, bonus) {
  return dragonStrength + bonus - opponentStrength;
}
function effectiveStrength(dragonStrength, dragonEnergy) {
  const factor = clamp(dragonEnergy, CONFIG.energy.min, CONFIG.energy.max) / CONFIG.energy.max;
  return Math.floor(dragonStrength * factor);
}
function isBattleWin(rawDamage) {
  return rawDamage >= 0;
}
function resolveMonsterFight(dragonStrength, dragonEnergy, monster, bonusRand01, rewardRand01, energyRand01, strengthRand01 = 0.5) {
  const rawDamage = battleDamage(
    effectiveStrength(dragonStrength, dragonEnergy),
    monster.strength,
    rollDamageBonus(bonusRand01)
  );
  const won = isBattleWin(rawDamage);
  const coinReward = won ? rollIntInclusive(monster.rewardMin, monster.rewardMax, rewardRand01) : 0;
  const energyAfter = won ? applyEnergyDrain(
    dragonEnergy,
    rollIntInclusive(
      monster.energyLossWinMin,
      monster.energyLossWinMax,
      energyRand01
    )
  ) : CONFIG.energy.min;
  const energyLoss = dragonEnergy - energyAfter;
  const strengthGain = won ? rollMonsterWinStrengthGain(monster, strengthRand01) : 0;
  return {
    rawDamage,
    won,
    coinReward,
    energyLoss,
    energyAfter,
    strengthGain
  };
}
function shouldSpawnMonster(spawnChance, rand01) {
  return rand01 < spawnChance;
}
function rollSpawnedMonsters(rand01) {
  return MONSTERS.filter((m) => shouldSpawnMonster(m.spawnChance, rand01())).slice(
    0,
    CONFIG.monsterSpawn.maxShown
  );
}
function rollBeastCounterDamage(rand01) {
  return rollIntInclusive(
    CONFIG.beast.counterDamageMin,
    CONFIG.beast.counterDamageMax,
    rand01
  );
}
function rollBeastReward(rand01) {
  return rollIntInclusive(
    CONFIG.beast.winRewardMin,
    CONFIG.beast.winRewardMax,
    rand01
  );
}
function resolveBeastTurn(dragonStrength, dragonEnergy, beastHp, bonusRand01, counterRand01, fightStartEnergy = dragonEnergy) {
  const rawDamage = battleDamage(
    effectiveStrength(dragonStrength, fightStartEnergy),
    CONFIG.beast.strengthConstant,
    rollDamageBonus(bonusRand01)
  );
  const beastHpAfter = Math.max(0, beastHp - Math.max(0, rawDamage));
  const beastDefeated = beastHpAfter <= 0;
  const counterDamage = beastDefeated ? 0 : rollBeastCounterDamage(counterRand01);
  const dragonEnergyAfter = beastDefeated ? dragonEnergy : applyEnergyDrain(dragonEnergy, counterDamage);
  return {
    rawDamage,
    beastHpAfter,
    counterDamage,
    dragonEnergyAfter,
    dragonRemoved: !beastDefeated && dragonEnergyAfter <= CONFIG.energy.min,
    beastDefeated
  };
}
function findBreed(breedId) {
  return DRAGONS.find((b) => b.id === breedId);
}
function breedForDragon(dragon) {
  return findBreed(dragon.breedId) ?? DRAGONS[0];
}
function isDragonHatched(dragon) {
  return dragon.hatchedAtMs !== null;
}
function liveEnergyForDragon(dragon, nowMs) {
  return energyAt(dragon.energy, dragon.lastEnergyUpdateMs, nowMs);
}
function ageDaysForDragonInstance(dragon, nowMs) {
  return ageDaysForDragon(dragon.hatchedAtMs, nowMs);
}
function remainingLifespanForDragon(dragon, nowMs) {
  return remainingLifespanDays(breedForDragon(dragon), dragon.hatchedAtMs, nowMs);
}
function isDragonInstanceExpired(dragon, nowMs) {
  return isDragonExpired(
    breedForDragon(dragon),
    dragon.hatchedAtMs,
    nowMs
  );
}
function levelForDragon(dragon) {
  return levelForStrength(dragon.strength);
}
function trainingCostForDragon(dragon) {
  return trainingCost(dragon.strength);
}
function sellPriceForDragon(dragon, nowMs) {
  const breed = breedForDragon(dragon);
  return sellPrice(
    dragon.strength,
    ageDaysForDragonInstance(dragon, nowMs),
    liveEnergyForDragon(dragon, nowMs),
    breed.sellMultiplier
  );
}
function canFightDragon(dragon, nowMs) {
  return isDragonHatched(dragon) && canDragonFight(liveEnergyForDragon(dragon, nowMs));
}
function canTrainDragon(dragon, coins, nowMs) {
  if (!isDragonHatched(dragon)) return false;
  return canTrain(liveEnergyForDragon(dragon, nowMs), coins, dragon.strength);
}
function isBeastEligible(dragon, nowMs) {
  return canFightDragon(dragon, nowMs);
}
export {
  CONFIG,
  DRAGONS,
  MONSTERS,
  ageDaysForDragon,
  ageDaysForDragonInstance,
  ageDaysFromMs,
  applyEnergyDrain,
  applyStrengthGain,
  battleDamage,
  breedForDragon,
  breedForIndex,
  canAffordEgg,
  canDragonFight,
  canFightDragon,
  canTrain,
  canTrainDragon,
  clamp,
  clampStrength,
  collectibleCoins,
  dragonStage,
  drawBreedIndex,
  effectiveStrength,
  energyAt,
  findBreed,
  hasCollectibleCoins,
  isBattleWin,
  isBeastEligible,
  isDragonExpired,
  isDragonHatched,
  isDragonInstanceExpired,
  isHatchDue,
  levelForDragon,
  levelForStrength,
  liveEnergyForDragon,
  maxUncollectedCoins,
  recoverEnergy,
  remainingLifespanDays,
  remainingLifespanForDragon,
  resolveBeastTurn,
  resolveMonsterFight,
  rollBaseStrength,
  rollBeastCounterDamage,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollDamageBonus,
  rollHatchMs,
  rollIntInclusive,
  rollMonsterWinStrengthGain,
  rollSpawnedMonsters,
  rollTrainingGain,
  sellEnergyFactor,
  sellPrice,
  sellPriceForDragon,
  shouldSpawnMonster,
  starsForStrength,
  trainingCost,
  trainingCostForDragon,
  trainingEnergyCost
};
