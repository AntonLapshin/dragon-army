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
    collectRequiresTap: true,
    // Hybrid income: hourly coins accrue unconditionally (capped) PLUS
    // 1 bonus coin per `stepsPerCoin` watch steps (uncapped, koala-style).
    stepsPerCoin: 100
  },
  egg: {
    price: 100,
    // Pick-a-specific-egg price (choose mode in the Egg modal).
    // Random spin stays at `price`; choosing a breed costs more.
    choosePrice: 150,
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
    // Egg resale is the base alone (strength 0, age 0, breed-independent):
    // 70 vs the 100-coin buy price, so an instant flip always loses 30.
    // A fresh common hatch (~11 str) sells for ~81; training/age push it
    // toward 100 over several sessions — selling feels fair, not punitive.
    basePrice: 70,
    perStrength: 1,
    perAgeDay: 2
  },
  // Turn-based fight screen (see `resolveFightAttack`): every attack
  // rolls hit/miss first, then damage on a hit. Accuracy grows with the
  // attacker's combat edge so stronger combatants land more reliably.
  fight: {
    hitChanceBase: 0.8,
    hitChancePerDiff: 4e-3,
    hitChanceMin: 0.55,
    hitChanceMax: 0.95,
    damageBonusMin: 0,
    damageBonusMax: 8,
    // Even the weakest hit chips: fights never stall at 0 damage.
    minDamage: 3
  },
  monsterSpawn: {
    maxShown: 3,
    rollPerDifficulty: true,
    refreshOnModalOpen: true,
    refreshIntervalMs: 60 * 60 * 1e3,
    emptyStateText: "No monsters right now"
  },
  equipment: {
    // Price rule: 20 coins per +1 strength (legs 3 -> 60, tail 4 -> 80,
    // head/wings 5 -> 100). Full set: +26 for 520 coins.
    coinsPerBonus: 20,
    // Selling a dragon refunds half its owned-equipment cost (see
    // equipmentSellValue()); the other half is the cost of gearing up.
    sellRefundRate: 0.5
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
      "leg-back-right"
    ],
    counterTarget: "energy",
    // Round-based: every alive dragon attacks (roster order), then the
    // beast fires back at ONE randomly picked alive dragon. A lost fight
    // heals the beast back to full HP — no grinding it down across
    // attempts with sacrificial rosters.
    turnOrder: "round-based: all-alive-dragons, then beast-hits-random",
    participants: "all-hatched-dragons-with-energy-above-0 (eggs excluded)",
    zeroEnergyBehaviour: "removed-from-roster",
    loseCondition: "all-dragons-removed-before-hp-0",
    loseBehaviour: "beast-heals-to-full-hp",
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
    // Fight-screen replay: one stepFightScreen() tick per 100ms; a turn is
    // aim(2) + fly(4) + impact(5) = 11 ticks ≈ 1.1s.
    fightScreenTickMs: 100,
    modalOverlayOpacity: 0.6,
    modalAnimation: "none"
  },
  limits: {
    maxRoster: 12,
    maxEggsPending: 12
  },
  balanceTargets: {
    timeToFirstHatch: "24-48h",
    hourlyIncome: 2,
    trainingsPerHourIncome: "~0.12 early (passive only; fights fund training)",
    easyBeatableAt: "combat ~21 (fresh ~11 wins ~20%; reliable after 3-4 trainings; Easy wears no gear, 42 HP)",
    mediumBeatableAt: "combat ~38-40 (base ~30 + ~8 gear, or base ~40 bare; Medium wears head + leg = +8, 85 HP)",
    hardBeatableAt: "combat ~76-78 (base ~50 + full +26 gear; Hard wears all but one leg = +23, 105 HP)",
    beastBeatableAt: "3 dragons at combat ~66 win ~62% (e.g. base 40 + full +26 gear; beast wears all gear, defense 46, 580 HP, attack 85); 2 at 66 almost never win; 4 at 66 win reliably"
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
const EQUIPMENT_SLOTS = [
  { id: "head", slot: "head", name: "Dragon Helm", slotLabel: "Head", bonus: 5, price: 100, image: "equipment/helm.png" },
  { id: "wings", slot: "wings", name: "Wing Guards", slotLabel: "Wings", bonus: 5, price: 100, image: "equipment/wing-guards.png" },
  { id: "tail", slot: "tail", name: "Tail Guard", slotLabel: "Tail", bonus: 4, price: 80, image: "equipment/tail-guard.png" },
  { id: "leg-front-left", slot: "leg-front-left", name: "Leg Guard", slotLabel: "Front left leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-front-right", slot: "leg-front-right", name: "Leg Guard", slotLabel: "Front right leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-back-left", slot: "leg-back-left", name: "Leg Guard", slotLabel: "Back left leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" },
  { id: "leg-back-right", slot: "leg-back-right", name: "Leg Guard", slotLabel: "Back right leg", bonus: 3, price: 60, image: "equipment/leg-guard.png" }
];
function equipmentDefForSlot(slotId) {
  return EQUIPMENT_SLOTS.find((e) => e.id === slotId);
}
const MONSTERS = [
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
    equipmentSlots: []
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
    equipmentSlots: ["head", "leg-front-left"]
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
    equipmentSlots: ["head", "wings", "tail", "leg-front-left", "leg-front-right", "leg-back-left"]
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
function stepCoinsForSteps(stepDelta) {
  if (!Number.isFinite(stepDelta) || stepDelta < CONFIG.economy.stepsPerCoin)
    return 0;
  return Math.floor(stepDelta / CONFIG.economy.stepsPerCoin);
}
function collectibleStepCoins(currentSteps, lastCollectedSteps) {
  if (!Number.isFinite(currentSteps) || !Number.isFinite(lastCollectedSteps))
    return 0;
  return stepCoinsForSteps(currentSteps - lastCollectedSteps);
}
function collectibleTotalCoins(elapsedMs, currentSteps, lastCollectedSteps) {
  return collectibleCoins(elapsedMs) + collectibleStepCoins(currentSteps, lastCollectedSteps);
}
function canAffordEgg(coins) {
  return coins >= CONFIG.egg.price;
}
function canAffordChosenEgg(coins) {
  return coins >= CONFIG.egg.choosePrice;
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
    (CONFIG.selling.basePrice + (strength * CONFIG.selling.perStrength + ageDays * CONFIG.selling.perAgeDay) * breedSellMultiplier) * sellEnergyFactor(energy)
  );
}
function equipmentBonusForEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") return 0;
  let total = 0;
  for (const def of EQUIPMENT_SLOTS) {
    if (equipment[def.id] === true) total += def.bonus;
  }
  return total;
}
function equipmentCostForEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") return 0;
  let total = 0;
  for (const def of EQUIPMENT_SLOTS) {
    if (equipment[def.id] === true) total += def.price;
  }
  return total;
}
function equipmentSellValue(equipment) {
  return Math.floor(
    equipmentCostForEquipment(equipment) * CONFIG.equipment.sellRefundRate
  );
}
function combatStrengthForDragon(dragon) {
  return dragon.strength + equipmentBonusForEquipment(dragon.equipment);
}
function effectiveMonsterStrength(monster) {
  return monster.strength + (monster.equipmentBonus ?? 0);
}
function fightHitChance(attackerCombat, defenderCombat) {
  return clamp(
    CONFIG.fight.hitChanceBase + CONFIG.fight.hitChancePerDiff * (attackerCombat - defenderCombat),
    CONFIG.fight.hitChanceMin,
    CONFIG.fight.hitChanceMax
  );
}
function rollFightDamageBonus(rand01) {
  return rollIntInclusive(
    CONFIG.fight.damageBonusMin,
    CONFIG.fight.damageBonusMax,
    rand01
  );
}
function fightHitDamage(attackerCombat, defenderCombat, bonusRand01) {
  return Math.max(
    CONFIG.fight.minDamage,
    attackerCombat - Math.floor(defenderCombat / 2) + rollFightDamageBonus(bonusRand01)
  );
}
function resolveFightAttack(attackerCombat, defenderHp, defenderCombat, hitRand01, damageRand01) {
  const hit = hitRand01 < fightHitChance(attackerCombat, defenderCombat);
  const damage = hit ? fightHitDamage(attackerCombat, defenderCombat, damageRand01) : 0;
  return {
    hit,
    damage,
    defenderHpAfter: Math.max(0, defenderHp - damage)
  };
}
function resolveMonsterFight(dragonCombat, dragonEnergy, monster, rand01) {
  const turns = [];
  let dragonHp = dragonEnergy;
  let monsterHp = monster.hp;
  let totalDamageDealt = 0;
  let dragonMissStreak = 0;
  let monsterMissStreak = 0;
  while (dragonHp > 0 && monsterHp > 0) {
    const attack = resolveFightAttack(
      dragonCombat,
      monsterHp,
      effectiveMonsterStrength(monster),
      dragonMissStreak >= 2 ? 0 : rand01(),
      rand01()
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
      rand01()
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
    totalDamageDealt
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
function beastCombatDefense() {
  return CONFIG.beast.combatDefense + CONFIG.beast.equipmentBonus;
}
function beastDisplayStrength() {
  return CONFIG.beast.strengthConstant + CONFIG.beast.equipmentBonus;
}
function rollBeastReward(rand01) {
  return rollIntInclusive(
    CONFIG.beast.winRewardMin,
    CONFIG.beast.winRewardMax,
    rand01
  );
}
function resolveBeastFight(dragonCombats, dragonHps, beastHp, rand01) {
  const turns = [];
  const hps = [...dragonHps];
  let hp = beastHp;
  let killerIndex = null;
  const alive = () => hps.map((h, i) => h > 0 ? i : -1).filter((i) => i >= 0);
  const dragonMissStreaks = dragonCombats.map(() => 0);
  let beastMissStreak = 0;
  while (hp > 0 && alive().length > 0) {
    for (const i of alive()) {
      const attack = resolveFightAttack(
        dragonCombats[i],
        hp,
        beastCombatDefense(),
        dragonMissStreaks[i] >= 2 ? 0 : rand01(),
        rand01()
      );
      dragonMissStreaks[i] = attack.hit ? 0 : dragonMissStreaks[i] + 1;
      turns.push({
        attackerKind: "dragon",
        attackerIndex: i,
        targetIndex: null,
        ...attack
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
      rand01()
    );
    beastMissStreak = retaliation.hit ? 0 : beastMissStreak + 1;
    turns.push({
      attackerKind: "enemy",
      attackerIndex: null,
      targetIndex,
      ...retaliation
    });
    hps[targetIndex] = retaliation.defenderHpAfter;
  }
  return {
    won: hp <= 0,
    killerIndex,
    turns,
    dragonHpsAfter: hps,
    beastHpAfter: hp
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
  ) + equipmentSellValue(dragon.equipment);
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
  EQUIPMENT_SLOTS,
  MONSTERS,
  ageDaysForDragon,
  ageDaysForDragonInstance,
  ageDaysFromMs,
  applyEnergyDrain,
  applyStrengthGain,
  beastCombatDefense,
  beastDisplayStrength,
  breedForDragon,
  breedForIndex,
  canAffordChosenEgg,
  canAffordEgg,
  canDragonFight,
  canFightDragon,
  canTrain,
  canTrainDragon,
  clamp,
  clampStrength,
  collectibleCoins,
  collectibleStepCoins,
  collectibleTotalCoins,
  combatStrengthForDragon,
  dragonStage,
  drawBreedIndex,
  effectiveMonsterStrength,
  energyAt,
  equipmentBonusForEquipment,
  equipmentCostForEquipment,
  equipmentDefForSlot,
  equipmentSellValue,
  fightHitChance,
  fightHitDamage,
  findBreed,
  hasCollectibleCoins,
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
  resolveBeastFight,
  resolveFightAttack,
  resolveMonsterFight,
  rollBaseStrength,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollFightDamageBonus,
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
  stepCoinsForSteps,
  trainingCost,
  trainingCostForDragon,
  trainingEnergyCost
};
