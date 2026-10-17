/**
 * Exhaustive unit tests for engine/config.ts.
 *
 * Every exported pure function is tested, including boundaries,
 * clamping, determinism (rand01 injection) and the computed-not-stored
 * contract helpers.
 */
import { describe, expect, it } from "vitest";
import {
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
  drawBreedIndex,
  dragonStage,
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
  rollBaseStrength,
  rollBeastReward,
  rollBeastWinStrengthGain,
  rollFightDamageBonus,
  rollHatchMs,
  rollIntInclusive,
  rollMonsterWinStrengthGain,
  rollSpawnedMonsters,
  rollTrainingGain,
  resolveMonsterFight,
  sellEnergyFactor,
  sellPrice,
  sellPriceForDragon,
  shouldSpawnMonster,
  starsForStrength,
  stepCoinsForSteps,
  trainingCost,
  trainingCostForDragon,
  trainingEnergyCost,
} from "./config";
import type { Dragon, DragonBreed } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const stubBreed = (over: Partial<DragonBreed> = {}): DragonBreed => ({
  id: "test-breed",
  name: "test",
  rarity: "common",
  baseStrengthMin: 8,
  baseStrengthMax: 14,
  sellMultiplier: 1.0,
  lifespanDays: 45,
  assetKey: "test_breed",
  ...over,
});

const emptyEquipment = () => ({
  head: false,
  wings: false,
  tail: false,
  "leg-front-left": false,
  "leg-front-right": false,
  "leg-back-left": false,
  "leg-back-right": false,
});

const stubDragon = (over: Partial<Dragon> = {}): Dragon => ({
  id: "dragon-test",
  breedId: DRAGONS[0].id,
  strength: 10,
  energy: 100,
  purchasedAtMs: 0,
  hatchAtMs: 0,
  hatchedAtMs: 0,
  lastEnergyUpdateMs: 0,
  combatStats: { easyWins: 0, mediumWins: 0, hardWins: 0, beastWins: 0, coinsEarned: 0 },
  equipment: emptyEquipment(),
  ...over,
});

describe("clamp", () => {
  it("returns value inside range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps below min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps above max", () => {
    expect(clamp(99, 0, 10)).toBe(10);
  });
  it("is inclusive on both edges", () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
  it("works with fractional values", () => {
    expect(clamp(0.5, 0, 1)).toBeCloseTo(0.5);
  });
});

describe("rollIntInclusive", () => {
  it("returns min when rand01 is 0", () => {
    expect(rollIntInclusive(3, 7, 0)).toBe(3);
  });
  it("returns max when rand01 approaches 1", () => {
    expect(rollIntInclusive(3, 7, 0.999999)).toBe(7);
  });
  it("returns min when min === max regardless of rand", () => {
    expect(rollIntInclusive(5, 5, 0)).toBe(5);
    expect(rollIntInclusive(5, 5, 0.5)).toBe(5);
    expect(rollIntInclusive(5, 5, 0.999)).toBe(5);
  });
  it("spreads uniformly across buckets", () => {
    // range size 5 (3..7): rand 0.0->3, 0.2->4, 0.4->5, 0.6->6, 0.8->7
    expect(rollIntInclusive(3, 7, 0.0)).toBe(3);
    expect(rollIntInclusive(3, 7, 0.2)).toBe(4);
    expect(rollIntInclusive(3, 7, 0.4)).toBe(5);
    expect(rollIntInclusive(3, 7, 0.6)).toBe(6);
    expect(rollIntInclusive(3, 7, 0.8)).toBe(7);
  });
  it("never exceeds [min, max]", () => {
    for (let i = 0; i < 100; i++) {
      const v = rollIntInclusive(0, 10, i / 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }
  });
});

describe("economy", () => {
  describe("maxUncollectedCoins", () => {
    it("equals hourlyCoins * maxUncollectedHours (2 * 12 = 24)", () => {
      expect(maxUncollectedCoins()).toBe(
        CONFIG.economy.hourlyCoins *
          (CONFIG.economy.maxUncollectedMs /
            CONFIG.economy.coinAccrualIntervalMs),
      );
      expect(maxUncollectedCoins()).toBe(24);
    });
  });

  describe("collectibleCoins", () => {
    it("returns 0 below one interval", () => {
      expect(collectibleCoins(0)).toBe(0);
      expect(collectibleCoins(HOUR - 1)).toBe(0);
    });
    it("returns exactly one hour of income at the interval edge", () => {
      expect(collectibleCoins(HOUR)).toBe(CONFIG.economy.hourlyCoins);
    });
    it("floors partial intervals", () => {
      expect(collectibleCoins(2 * HOUR + HOUR / 2)).toBe(
        2 * CONFIG.economy.hourlyCoins,
      );
    });
    it("accumulates linearly before the cap", () => {
      expect(collectibleCoins(5 * HOUR)).toBe(5 * CONFIG.economy.hourlyCoins);
    });
    it("caps at maxUncollectedCoins", () => {
      expect(collectibleCoins(12 * HOUR)).toBe(maxUncollectedCoins());
      expect(collectibleCoins(24 * HOUR)).toBe(maxUncollectedCoins());
      expect(collectibleCoins(1000 * HOUR)).toBe(maxUncollectedCoins());
    });
    it("returns 0 for non-positive elapsed", () => {
      expect(collectibleCoins(-1000)).toBe(0);
    });
  });

  describe("hasCollectibleCoins", () => {
    it("is false below one interval", () => {
      expect(hasCollectibleCoins(0)).toBe(false);
      expect(hasCollectibleCoins(HOUR - 1)).toBe(false);
    });
    it("is true once an interval elapsed", () => {
      expect(hasCollectibleCoins(HOUR)).toBe(true);
      expect(hasCollectibleCoins(10 * HOUR)).toBe(true);
    });
  });

  describe("stepCoinsForSteps", () => {
    it("returns 0 below 100 steps", () => {
      expect(stepCoinsForSteps(0)).toBe(0);
      expect(stepCoinsForSteps(99)).toBe(0);
    });
    it("returns 1 coin per 100 steps, floored", () => {
      expect(stepCoinsForSteps(100)).toBe(1);
      expect(stepCoinsForSteps(250)).toBe(2);
      expect(stepCoinsForSteps(500)).toBe(5);
    });
    it("returns 0 for non-positive / non-finite deltas", () => {
      expect(stepCoinsForSteps(-50)).toBe(0);
      expect(stepCoinsForSteps(NaN)).toBe(0);
    });
    it("uses CONFIG.economy.stepsPerCoin = 100 (koala parity)", () => {
      expect(CONFIG.economy.stepsPerCoin).toBe(100);
    });
  });

  describe("collectibleStepCoins", () => {
    it("floors the delta between current and anchor", () => {
      expect(collectibleStepCoins(250, 0)).toBe(2);
      expect(collectibleStepCoins(350, 100)).toBe(2);
    });
    it("returns 0 when the counter reset (current < anchor)", () => {
      expect(collectibleStepCoins(50, 5000)).toBe(0);
    });
    it("returns 0 for non-finite readings", () => {
      expect(collectibleStepCoins(NaN, 0)).toBe(0);
      expect(collectibleStepCoins(500, NaN)).toBe(0);
    });
  });

  describe("collectibleTotalCoins", () => {
    it("sums capped hourly coins and the uncapped step bonus", () => {
      expect(collectibleTotalCoins(HOUR, 250, 0)).toBe(
        CONFIG.economy.hourlyCoins + 2,
      );
      expect(collectibleTotalCoins(0, 500, 0)).toBe(5);
      expect(collectibleTotalCoins(HOUR, 50, 0)).toBe(CONFIG.economy.hourlyCoins);
    });
    it("does not cap the step bonus", () => {
      expect(collectibleTotalCoins(1000 * HOUR, 100000, 0)).toBe(
        maxUncollectedCoins() + 1000,
      );
    });
  });

  describe("canAffordEgg", () => {
    it("is false below price", () => {
      expect(canAffordEgg(CONFIG.egg.price - 1)).toBe(false);
      expect(canAffordEgg(0)).toBe(false);
    });
    it("is true at and above price", () => {
      expect(canAffordEgg(CONFIG.egg.price)).toBe(true);
      expect(canAffordEgg(CONFIG.egg.price + 1)).toBe(true);
    });
  });
});

describe("egg & hatch", () => {
  describe("drawBreedIndex", () => {
    it("maps 0 to the first breed", () => {
      expect(drawBreedIndex(0)).toBe(0);
    });
    it("maps values just below 1 to the last breed", () => {
      expect(drawBreedIndex(0.999999)).toBe(CONFIG.egg.breedCount - 1);
    });
    it("is uniform: index = floor(rand * breedCount)", () => {
      expect(drawBreedIndex(0.5)).toBe(
        Math.floor(0.5 * CONFIG.egg.breedCount),
      );
      expect(drawBreedIndex(1 / 15)).toBe(1);
    });
    it("covers the full [0, breedCount) range", () => {
      const seen = new Set<number>();
      for (let i = 0; i < 150; i++) seen.add(drawBreedIndex(i / 150));
      expect(seen.size).toBe(CONFIG.egg.breedCount);
    });
  });

  describe("breedForIndex", () => {
    it("returns the breed at a valid index", () => {
      expect(breedForIndex(0)).toBe(DRAGONS[0]);
      expect(breedForIndex(14)).toBe(DRAGONS[14]);
    });
    it("clamps out-of-range indexes", () => {
      expect(breedForIndex(-5)).toBe(DRAGONS[0]);
      expect(breedForIndex(1000)).toBe(DRAGONS[DRAGONS.length - 1]);
    });
  });

  describe("rollHatchMs", () => {
    it("returns hatchMinMs at rand 0", () => {
      expect(rollHatchMs(0)).toBe(CONFIG.egg.hatchMinMs);
    });
    it("returns hatchMaxMs at rand ~1", () => {
      expect(rollHatchMs(0.999999999)).toBe(CONFIG.egg.hatchMaxMs);
    });
    it("always stays within [hatchMinMs, hatchMaxMs]", () => {
      // rand01 contract is [0, 1) — never pass exactly 1.0
      for (let i = 0; i < 20; i++) {
        const v = rollHatchMs(i / 20);
        expect(v).toBeGreaterThanOrEqual(CONFIG.egg.hatchMinMs);
        expect(v).toBeLessThanOrEqual(CONFIG.egg.hatchMaxMs);
      }
    });
    it("spans the documented 24-48h window", () => {
      expect(CONFIG.egg.hatchMinMs).toBe(24 * HOUR);
      expect(CONFIG.egg.hatchMaxMs).toBe(48 * HOUR);
    });
  });

  describe("rollBaseStrength", () => {
    it("returns min at rand 0 and max at rand ~1", () => {
      const breed = stubBreed({ baseStrengthMin: 8, baseStrengthMax: 14 });
      expect(rollBaseStrength(breed, 0)).toBe(8);
      expect(rollBaseStrength(breed, 0.999999)).toBe(14);
    });
    it("respects per-breed ranges", () => {
      const epic = stubBreed({ baseStrengthMin: 18, baseStrengthMax: 25 });
      expect(rollBaseStrength(epic, 0)).toBe(18);
      expect(rollBaseStrength(epic, 0.999999)).toBe(25);
    });
  });
});

describe("energy & age (computed-not-stored)", () => {
  describe("recoverEnergy", () => {
    it("adds 10 energy per hour", () => {
      expect(recoverEnergy(0, HOUR)).toBeCloseTo(10);
      expect(recoverEnergy(50, HOUR)).toBeCloseTo(60);
    });
    it("recovers fractionally for partial hours", () => {
      expect(recoverEnergy(0, HOUR / 2)).toBeCloseTo(5);
    });
    it("does nothing for zero elapsed", () => {
      expect(recoverEnergy(42, 0)).toBeCloseTo(42);
    });
    it("clamps at max 100", () => {
      expect(recoverEnergy(95, HOUR)).toBe(100);
      expect(recoverEnergy(100, 10 * HOUR)).toBe(100);
    });
    it("clamps at min 0", () => {
      expect(recoverEnergy(-50, 0)).toBe(0);
    });
  });

  describe("energyAt", () => {
    it("derives live energy from the stored anchor", () => {
      const last = 1_000_000;
      expect(energyAt(50, last, last)).toBeCloseTo(50);
      expect(energyAt(50, last, last + HOUR)).toBeCloseTo(60);
    });
    it("treats future anchors / clock skew as zero elapsed", () => {
      expect(energyAt(50, 2_000_000, 1_000_000)).toBeCloseTo(50);
    });
    it("caps recovery at max", () => {
      expect(energyAt(90, 0, 10 * HOUR)).toBe(100);
    });
  });

  describe("applyEnergyDrain", () => {
    it("subtracts the loss", () => {
      expect(applyEnergyDrain(100, 20)).toBe(80);
    });
    it("floors at 0", () => {
      expect(applyEnergyDrain(10, 50)).toBe(0);
    });
    it("caps at max", () => {
      expect(applyEnergyDrain(100, -10)).toBe(100);
    });
  });

  describe("canDragonFight", () => {
    it("is false at zero energy", () => {
      expect(canDragonFight(0)).toBe(false);
    });
    it("is true for any positive energy", () => {
      expect(canDragonFight(0.1)).toBe(true);
      expect(canDragonFight(100)).toBe(true);
    });
  });

  describe("ageDaysFromMs", () => {
    it("returns 0 for zero/negative elapsed", () => {
      expect(ageDaysFromMs(0)).toBe(0);
      expect(ageDaysFromMs(-DAY)).toBe(0);
    });
    it("returns 0 for a partial day", () => {
      expect(ageDaysFromMs(DAY - 1)).toBe(0);
    });
    it("counts whole days", () => {
      expect(ageDaysFromMs(DAY)).toBe(1);
      expect(ageDaysFromMs(DAY * 3 + 5)).toBe(3);
    });
  });

  describe("dragonStage", () => {
    it("is egg while hatchedAtMs is null", () => {
      expect(dragonStage(null)).toBe("egg");
    });
    it("is hatched once hatchedAtMs is set", () => {
      expect(dragonStage(0)).toBe("hatched");
      expect(dragonStage(Date.now())).toBe("hatched");
    });
  });

  describe("isHatchDue", () => {
    it("is false before the timer", () => {
      expect(isHatchDue(2000, 1999)).toBe(false);
    });
    it("is true at and after the timer", () => {
      expect(isHatchDue(2000, 2000)).toBe(true);
      expect(isHatchDue(2000, 2001)).toBe(true);
    });
  });

  describe("ageDaysForDragon", () => {
    it("is 0 for eggs", () => {
      expect(ageDaysForDragon(null, Date.now())).toBe(0);
    });
    it("is 0 for future hatch dates", () => {
      const now = 1_000_000;
      expect(ageDaysForDragon(now + DAY, now)).toBe(0);
    });
    it("counts days since hatch", () => {
      const hatchedAt = 0;
      expect(ageDaysForDragon(hatchedAt, hatchedAt + DAY * 5)).toBe(5);
      expect(ageDaysForDragon(hatchedAt, hatchedAt + DAY * 1.9)).toBe(1);
    });
  });

  describe("remainingLifespanDays", () => {
    it("returns full lifespan for eggs", () => {
      const breed = stubBreed({ lifespanDays: 45 });
      expect(remainingLifespanDays(breed, null, 999)).toBe(45);
    });
    it("counts down with age", () => {
      const breed = stubBreed({ lifespanDays: 45 });
      expect(remainingLifespanDays(breed, 0, DAY * 5)).toBe(40);
    });
    it("floors at 0 once expired", () => {
      const breed = stubBreed({ lifespanDays: 30 });
      expect(remainingLifespanDays(breed, 0, DAY * 30)).toBe(0);
      expect(remainingLifespanDays(breed, 0, DAY * 100)).toBe(0);
    });
  });

  describe("isDragonExpired", () => {
    it("never expires eggs", () => {
      expect(
        isDragonExpired(stubBreed({ lifespanDays: 30 }), null, DAY * 1000),
      ).toBe(false);
    });
    it("is false before lifespan, true at/after", () => {
      const breed = stubBreed({ lifespanDays: 30 });
      expect(isDragonExpired(breed, 0, DAY * 29)).toBe(false);
      expect(isDragonExpired(breed, 0, DAY * 30)).toBe(true);
      expect(isDragonExpired(breed, 0, DAY * 31)).toBe(true);
    });
  });
});

describe("levelForStrength (display-only)", () => {
  it("returns 1 below the first threshold", () => {
    expect(levelForStrength(0)).toBe(1);
    expect(levelForStrength(14)).toBe(1);
  });
  it("maps every threshold edge to its level", () => {
    const cases: Array<[number, number]> = [
      [15, 2],
      [25, 3],
      [35, 4],
      [45, 5],
      [60, 6],
      [75, 7],
      [90, 8],
      [105, 9],
      [120, 10],
    ];
    for (const [strength, level] of cases) {
      expect(levelForStrength(strength)).toBe(level);
      expect(levelForStrength(strength - 1)).toBeLessThan(level);
    }
  });
  it("caps at level 10 above max threshold", () => {
    expect(levelForStrength(120)).toBe(10);
    expect(levelForStrength(1000)).toBe(10);
  });
});

describe("training", () => {
  describe("trainingCost", () => {
    it("charges costBase at 0 strength", () => {
      expect(trainingCost(0)).toBe(CONFIG.training.costBase);
    });
    it("scales linearly: floor(8 + 0.8 * strength)", () => {
      expect(trainingCost(10)).toBe(Math.floor(8 + 10 * 0.8));
      expect(trainingCost(50)).toBe(Math.floor(8 + 50 * 0.8));
      expect(trainingCost(11)).toBe(16);
    });
    it("floors fractional costs", () => {
      // 8 + 1*0.8 = 8.8 -> 8
      expect(trainingCost(1)).toBe(8);
    });
  });

  describe("rollTrainingGain", () => {
    it("returns min at rand 0 and max at rand ~1", () => {
      expect(rollTrainingGain(0)).toBe(CONFIG.training.strengthGainMin);
      expect(rollTrainingGain(0.999999)).toBe(
        CONFIG.training.strengthGainMax,
      );
    });
    it("stays within [2, 5]", () => {
      // rand01 contract is [0, 1) — never pass exactly 1.0
      for (let i = 0; i < 10; i++) {
        const v = rollTrainingGain(i / 10);
        expect(v).toBeGreaterThanOrEqual(2);
        expect(v).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("canTrain", () => {
    it("requires energy above 0", () => {
      expect(canTrain(0, 1000, 10)).toBe(false);
      expect(canTrain(1, 1000, 10)).toBe(true);
    });
    it("requires enough coins for the current strength", () => {
      const cost = trainingCost(20);
      expect(canTrain(100, cost - 1, 20)).toBe(false);
      expect(canTrain(100, cost, 20)).toBe(true);
    });
    it("requires both", () => {
      expect(canTrain(0, 0, 10)).toBe(false);
    });
  });
});

describe("selling", () => {
  describe("sellEnergyFactor", () => {
    it("is 0.5 at zero energy", () => {
      expect(sellEnergyFactor(0)).toBeCloseTo(0.5);
    });
    it("is 1.0 at full energy", () => {
      expect(sellEnergyFactor(100)).toBeCloseTo(1.0);
    });
    it("is 0.75 at half energy", () => {
      expect(sellEnergyFactor(50)).toBeCloseTo(0.75);
    });
    it("clamps out-of-range energy", () => {
      expect(sellEnergyFactor(-10)).toBeCloseTo(0.5);
      expect(sellEnergyFactor(1000)).toBeCloseTo(1.0);
    });
  });

  describe("sellPrice", () => {
    it("follows floor((base + (str*perStr + age*perAge) * mult) * energyFactor)", () => {
      const expected = Math.floor(
        (CONFIG.selling.basePrice +
          (10 * CONFIG.selling.perStrength +
            2 * CONFIG.selling.perAgeDay) *
            1.0) *
          sellEnergyFactor(100),
      );
      expect(sellPrice(10, 2, 100, 1.0)).toBe(expected);
    });
    it("ignores the breed multiplier for eggs (strength 0, age 0)", () => {
      expect(sellPrice(0, 0, 100, 1.0)).toBe(sellPrice(0, 0, 100, 1.7));
      expect(sellPrice(0, 0, 100, 1.0)).toBe(CONFIG.selling.basePrice);
    });
    it("scales the earned part with breed multiplier", () => {
      const low = sellPrice(10, 0, 100, 1.0);
      const high = sellPrice(10, 0, 100, 1.6);
      expect(high).toBeGreaterThan(low);
      expect(high).toBe(
        Math.floor(
          (CONFIG.selling.basePrice +
            10 * CONFIG.selling.perStrength * 1.6) *
            sellEnergyFactor(100),
        ),
      );
    });
    it("drops at low energy (0.5x factor)", () => {
      const full = sellPrice(20, 5, 100, 1.0);
      const empty = sellPrice(20, 5, 0, 1.0);
      expect(empty).toBe(Math.floor(full * 0.5));
    });
    it("grows with strength and age", () => {
      expect(sellPrice(20, 0, 100, 1.0)).toBeGreaterThan(
        sellPrice(10, 0, 100, 1.0),
      );
      expect(sellPrice(10, 5, 100, 1.0)).toBeGreaterThan(
        sellPrice(10, 0, 100, 1.0),
      );
    });
  });
});

describe("battle", () => {
  describe("fightHitChance", () => {
    it("is 80% on even combat", () => {
      expect(fightHitChance(40, 40)).toBeCloseTo(0.8, 10);
    });
    it("grows 0.4% per point of combat edge", () => {
      expect(fightHitChance(65, 40)).toBeCloseTo(0.9, 10);
      expect(fightHitChance(15, 40)).toBeCloseTo(0.7, 10);
    });
    it("clamps to [55%, 95%]", () => {
      expect(fightHitChance(1, 200)).toBe(CONFIG.fight.hitChanceMin);
      expect(fightHitChance(200, 1)).toBe(CONFIG.fight.hitChanceMax);
    });
  });

  describe("rollFightDamageBonus / fightHitDamage", () => {
    it("rolls a 0-8 bonus", () => {
      expect(rollFightDamageBonus(0)).toBe(CONFIG.fight.damageBonusMin);
      expect(rollFightDamageBonus(0.999999)).toBe(CONFIG.fight.damageBonusMax);
    });
    it("damage = attacker - defender/2 + bonus, floored at 3", () => {
      // 66 vs beast defense 52, bonus 4 (rand 0.5): 66 - 26 + 4 = 44
      expect(fightHitDamage(66, 52, 0.5)).toBe(44);
      // weakest hit still chips: 1 vs 78 would be negative -> floor 3
      expect(fightHitDamage(1, 78, 0)).toBe(CONFIG.fight.minDamage);
      expect(fightHitDamage(11, 19, 0)).toBe(3);
    });
  });

  describe("resolveFightAttack", () => {
    it("a roll above the hit chance misses: 0 damage, HP unchanged", () => {
      const res = resolveFightAttack(66, 850, 52, 0.99, 0.5);
      expect(res.hit).toBe(false);
      expect(res.damage).toBe(0);
      expect(res.defenderHpAfter).toBe(850);
    });
    it("a roll below the hit chance hits for full damage", () => {
      const res = resolveFightAttack(66, 850, 52, 0.1, 0.5);
      expect(res.hit).toBe(true);
      expect(res.damage).toBe(44);
      expect(res.defenderHpAfter).toBe(806);
    });
    it("clamps defender HP at 0 on overkill", () => {
      const res = resolveFightAttack(200, 10, 52, 0, 0.999);
      expect(res.defenderHpAfter).toBe(0);
    });
  });

  describe("resolveMonsterFight", () => {
    const easy = MONSTERS[0];

    it("a strong dragon one-shots Easy untouched (50 - 9 + 4 = 45 >= 42 HP)", () => {
      const res = resolveMonsterFight(50, 100, easy, () => 0.5);
      expect(res.won).toBe(true);
      expect(res.turns).toHaveLength(1);
      expect(res.turns[0].attackerKind).toBe("dragon");
      expect(res.turns[0].hit).toBe(true);
      expect(res.turns[0].damage).toBe(45);
      expect(res.monsterHpAfter).toBe(0);
      expect(res.dragonHpAfter).toBe(100);
      expect(res.totalDamageDealt).toBe(45);
    });

    it("a weak dragon loses to Hard with 0 HP left (1 - 39 -> floor 3/hit vs 82/hit back)", () => {
      const res = resolveMonsterFight(1, 100, MONSTERS[2], () => 0.5);
      expect(res.won).toBe(false);
      expect(res.dragonHpAfter).toBe(0);
      expect(res.monsterHpAfter).toBeGreaterThan(0);
      // turns alternate dragon/enemy, starting with the dragon
      expect(res.turns[0].attackerKind).toBe("dragon");
      expect(res.turns[1].attackerKind).toBe("enemy");
      expect(res.turns[res.turns.length - 1].attackerKind).toBe("enemy");
    });

    it("a loss leaves the dragon at exactly 0 (knocked out, no sliver)", () => {
      const res = resolveMonsterFight(11, 100, easy, () => 0.5);
      expect(res.won).toBe(false);
      expect(res.dragonHpAfter).toBe(0);
    });

    it("a 5-energy dragon gets one hit, then falls (HP is energy)", () => {
      const res = resolveMonsterFight(24, 5, easy, () => 0.5);
      expect(res.won).toBe(false);
      expect(res.dragonHpAfter).toBe(0);
      expect(res.turns).toHaveLength(2); // one dragon hit, one retaliation
    });

    it("pity rule: always-miss rolls still terminate (max 2 misses in a row)", () => {
      const res = resolveMonsterFight(21, 100, easy, () => 0.999);
      expect(res.turns.length).toBeLessThan(200);
      expect(res.turns.length).toBeGreaterThan(0);
      // no 3 consecutive misses by the same side
      let dragonMisses = 0;
      let enemyMisses = 0;
      for (const t of res.turns) {
        if (t.attackerKind === "dragon") {
          dragonMisses = t.hit ? 0 : dragonMisses + 1;
          expect(dragonMisses).toBeLessThanOrEqual(2);
        } else {
          enemyMisses = t.hit ? 0 : enemyMisses + 1;
          expect(enemyMisses).toBeLessThanOrEqual(2);
        }
      }
    });
  });

  describe("shouldSpawnMonster", () => {
    it("spawns when rand < chance", () => {
      expect(shouldSpawnMonster(0.65, 0.64)).toBe(true);
    });
    it("does not spawn when rand >= chance", () => {
      expect(shouldSpawnMonster(0.65, 0.65)).toBe(false);
      expect(shouldSpawnMonster(0.65, 0.99)).toBe(false);
    });
    it("handles edge chances", () => {
      expect(shouldSpawnMonster(0, 0)).toBe(false);
      expect(shouldSpawnMonster(1, 0.999)).toBe(true);
    });
  });

  describe("rollSpawnedMonsters", () => {
    it("spawns all monsters when every roll succeeds", () => {
      const spawned = rollSpawnedMonsters(() => 0);
      expect(spawned).toHaveLength(
        Math.min(MONSTERS.length, CONFIG.monsterSpawn.maxShown),
      );
    });
    it("spawns nothing when every roll fails", () => {
      expect(rollSpawnedMonsters(() => 0.999)).toHaveLength(0);
    });
    it("rolls independently per difficulty (sequence stub)", () => {
      // Easy 0.33 pass, Medium 0.20 fail, Hard 0.10 fail
      const seq = [0.1, 0.5, 0.5];
      let i = 0;
      const spawned = rollSpawnedMonsters(() => seq[i++ % seq.length]);
      expect(spawned.map((m) => m.difficulty)).toEqual(["Easy"]);
    });
    it("never exceeds maxShown", () => {
      const spawned = rollSpawnedMonsters(() => 0);
      expect(spawned.length).toBeLessThanOrEqual(
        CONFIG.monsterSpawn.maxShown,
      );
    });
  });
});

describe("bewilder beast", () => {
  describe("resolveBeastFight (round-based)", () => {
    it("a solo max dragon can kill a 10-HP beast in one blow", () => {
      const res = resolveBeastFight([100], [100], 10, () => 0.5);
      expect(res.won).toBe(true);
      expect(res.killerIndex).toBe(0);
      expect(res.turns).toHaveLength(1);
      expect(res.turns[0].attackerKind).toBe("dragon");
      expect(res.beastHpAfter).toBe(0);
      expect(res.dragonHpsAfter).toEqual([100]);
    });

    it("the beast fires back at one random alive dragon per round", () => {
      // 3 weak dragons vs an 850-HP beast: nobody kills it in round 1,
      // so the beast gets exactly one retaliation per round, aimed at
      // a single dragon — the other two take no damage that round.
      const res = resolveBeastFight([10, 10, 10], [100, 100, 100], 850, () => 0.5);
      expect(res.won).toBe(false);
      const enemyTurns = res.turns.filter((t) => t.attackerKind === "enemy");
      expect(enemyTurns.length).toBeGreaterThan(0);
      // each enemy turn hits exactly one dragon (single targetIndex)
      for (const t of enemyTurns) {
        expect(t.targetIndex).not.toBeNull();
      }
      // all three dragons are gone at the end (loss = whole team wiped)
      expect(res.dragonHpsAfter).toEqual([0, 0, 0]);
      expect(res.beastHpAfter).toBeGreaterThan(0);
    });

    it("damage uses beastCombatDefense (52), not the 101 display value", () => {
      // 66 - 26 + 4 = 44/hit; with the display value it would be
      // 66 - 50 + 4 = 20/hit. First turn of a 3x66 team vs full HP:
      const res = resolveBeastFight([66, 66, 66], [100, 100, 100], 850, () => 0.5);
      expect(res.turns[0].damage).toBe(44);
    });

    it("pity rule: always-miss rolls still terminate", () => {
      const res = resolveBeastFight([66, 66], [100, 100], 850, () => 0.999);
      expect(res.turns.length).toBeLessThan(500);
      expect(res.turns.length).toBeGreaterThan(0);
    });
  });

  describe("rollBeastReward", () => {
    it("returns min at 0 and max at ~1", () => {
      expect(rollBeastReward(0)).toBe(CONFIG.beast.winRewardMin);
      expect(rollBeastReward(0.999999)).toBe(CONFIG.beast.winRewardMax);
    });
    it("stays in [300, 300]", () => {
      expect(rollBeastReward(0.5)).toBeGreaterThanOrEqual(300);
      expect(rollBeastReward(0.5)).toBeLessThanOrEqual(300);
    });
  });

  describe("bewilder beast display vs combat (full gear: 101 display, 52 defense)", () => {
    it("shows 3 gold stars base, 4 gold with full gear; defense = 26 + 26 gear", () => {
      expect(CONFIG.beast.strengthConstant).toBe(75);
      expect(starsForStrength(CONFIG.beast.strengthConstant)).toEqual({
        gold: 3,
        silver: 0,
      });
      expect(CONFIG.beast.equipmentBonus).toBe(26);
      expect(beastDisplayStrength()).toBe(101);
      expect(starsForStrength(beastDisplayStrength())).toEqual({
        gold: 4,
        silver: 0,
      });
      expect(beastCombatDefense()).toBe(
        CONFIG.beast.combatDefense + CONFIG.beast.equipmentBonus,
      );
      expect(beastCombatDefense()).toBe(52);
    });
  });

  describe("equipment catalogue + bonuses", () => {
    it("has 7 slots (head, wings, tail + 4 legs), 1 option per slot", () => {
      expect(EQUIPMENT_SLOTS).toHaveLength(7);
      expect(EQUIPMENT_SLOTS.map((e) => e.id)).toEqual([
        "head",
        "wings",
        "tail",
        "leg-front-left",
        "leg-front-right",
        "leg-back-left",
        "leg-back-right",
      ]);
      expect(new Set(EQUIPMENT_SLOTS.map((e) => e.id)).size).toBe(7);
    });
    it("prices are bonus x 20 coins (legs 60, tail 80, head/wings 100; full set 520)", () => {
      for (const def of EQUIPMENT_SLOTS) {
        expect(def.price).toBe(def.bonus * CONFIG.equipment.coinsPerBonus);
      }
      expect(EQUIPMENT_SLOTS.reduce((a, e) => a + e.bonus, 0)).toBe(26);
      expect(EQUIPMENT_SLOTS.reduce((a, e) => a + e.price, 0)).toBe(520);
      expect(equipmentDefForSlot("head")?.bonus).toBe(5);
      expect(equipmentDefForSlot("tail")?.price).toBe(80);
      expect(equipmentDefForSlot("leg-front-left")?.bonus).toBe(3);
      expect(equipmentDefForSlot("nope")).toBeUndefined();
    });
    it("equipmentBonusForEquipment sums owned pieces, tolerates partial/old saves", () => {
      expect(equipmentBonusForEquipment(emptyEquipment())).toBe(0);
      expect(equipmentBonusForEquipment(undefined)).toBe(0);
      expect(equipmentBonusForEquipment(null)).toBe(0);
      expect(
        equipmentBonusForEquipment({ ...emptyEquipment(), head: true, tail: true }),
      ).toBe(9);
      expect(
        equipmentBonusForEquipment({
          head: true,
          wings: true,
          tail: true,
          "leg-front-left": true,
          "leg-front-right": true,
          "leg-back-left": true,
          "leg-back-right": true,
        }),
      ).toBe(26);
    });
    it("equipmentCost / sell value: full set costs 520, sells back 260 (50%)", () => {
      const full = {
        head: true,
        wings: true,
        tail: true,
        "leg-front-left": true,
        "leg-front-right": true,
        "leg-back-left": true,
        "leg-back-right": true,
      };
      expect(equipmentCostForEquipment(full)).toBe(520);
      expect(equipmentSellValue(full)).toBe(260);
      expect(equipmentSellValue(emptyEquipment())).toBe(0);
      expect(equipmentSellValue({ ...emptyEquipment(), head: true })).toBe(50);
    });
    it("combatStrengthForDragon = base + gear; monster effective = base + gear", () => {
      expect(combatStrengthForDragon(stubDragon({ strength: 40 }))).toBe(40);
      expect(
        combatStrengthForDragon(
          stubDragon({
            strength: 40,
            equipment: { ...emptyEquipment(), head: true },
          }),
        ),
      ).toBe(45);
      expect(effectiveMonsterStrength(MONSTERS[0])).toBe(19);
      expect(effectiveMonsterStrength(MONSTERS[1])).toBe(40);
      expect(effectiveMonsterStrength(MONSTERS[2])).toBe(78);
    });
    it("monster equipment slots sum to their bonus", () => {
      for (const m of MONSTERS) {
        const sum = m.equipmentSlots.reduce(
          (a, slot) => a + (equipmentDefForSlot(slot)?.bonus ?? 0),
          0,
        );
        expect(sum).toBe(m.equipmentBonus);
      }
      expect(MONSTERS[0].equipmentBonus).toBe(0);
      expect(MONSTERS[1].equipmentBonus).toBe(8);
      expect(MONSTERS[2].equipmentBonus).toBe(23);
    });
    it("sellPriceForDragon adds the 50% gear refund", () => {
      const bare = stubDragon({ strength: 10, energy: 100, hatchedAtMs: 0, lastEnergyUpdateMs: 0 });
      const geared = stubDragon({
        strength: 10,
        energy: 100,
        hatchedAtMs: 0,
        lastEnergyUpdateMs: 0,
        equipment: { ...emptyEquipment(), head: true, wings: true },
      });
      // head + wings cost 200 -> refund 100
      expect(sellPriceForDragon(geared, DAY * 2)).toBe(
        sellPriceForDragon(bare, DAY * 2) + 100,
      );
    });
  });

});

describe("trainingEnergyCost / win strength gains", () => {
  it("drains a flat 15 energy per training session", () => {
    expect(trainingEnergyCost()).toBe(CONFIG.training.energyCost);
    expect(trainingEnergyCost()).toBe(15);
  });
  it("rollMonsterWinStrengthGain stays in the monster's win range", () => {
    for (const m of MONSTERS) {
      expect(rollMonsterWinStrengthGain(m, 0)).toBe(m.strengthGainWinMin);
      expect(rollMonsterWinStrengthGain(m, 0.999999)).toBe(m.strengthGainWinMax);
    }
  });
  it("rollBeastWinStrengthGain stays in [2, 4]", () => {
    expect(rollBeastWinStrengthGain(0)).toBe(CONFIG.beast.winStrengthGainMin);
    expect(rollBeastWinStrengthGain(0.999999)).toBe(CONFIG.beast.winStrengthGainMax);
    for (let i = 0; i < 10; i++) {
      const v = rollBeastWinStrengthGain(i / 10);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(4);
    }
  });
  it("monster HP pools are positive (fight-screen pools, not one-roll thresholds)", () => {
    for (const m of MONSTERS) {
      expect(m.hp).toBeGreaterThan(0);
    }
    expect(MONSTERS[0].hp).toBeLessThan(MONSTERS[1].hp);
    expect(MONSTERS[1].hp).toBeLessThan(MONSTERS[2].hp);
  });
});

describe("dragon-instance helpers (computed-not-stored)", () => {
  describe("findBreed / breedForDragon", () => {
    it("finds a breed by id", () => {
      expect(findBreed(DRAGONS[3].id)).toBe(DRAGONS[3]);
    });
    it("returns undefined for unknown ids", () => {
      expect(findBreed("no-such-breed")).toBeUndefined();
    });
    it("resolves the breed for a roster entry", () => {
      expect(breedForDragon(stubDragon({ breedId: DRAGONS[5].id }))).toBe(DRAGONS[5]);
    });
    it("falls back to the first breed for stale saves", () => {
      expect(breedForDragon(stubDragon({ breedId: "stale-id" }))).toBe(DRAGONS[0]);
    });
  });

  describe("isDragonHatched", () => {
    it("is false while hatchedAtMs is null (egg)", () => {
      expect(isDragonHatched(stubDragon({ hatchedAtMs: null }))).toBe(false);
    });
    it("is true once hatchedAtMs is set", () => {
      expect(isDragonHatched(stubDragon({ hatchedAtMs: 123 }))).toBe(true);
    });
  });

  describe("liveEnergyForDragon", () => {
    it("derives live energy from the stored anchor", () => {
      const d = stubDragon({ energy: 50, lastEnergyUpdateMs: 1_000_000 });
      expect(liveEnergyForDragon(d, 1_000_000)).toBeCloseTo(50);
      expect(liveEnergyForDragon(d, 1_000_000 + HOUR)).toBeCloseTo(60);
    });
    it("caps at max after long offline gaps", () => {
      const d = stubDragon({ energy: 10, lastEnergyUpdateMs: 0 });
      expect(liveEnergyForDragon(d, 100 * HOUR)).toBe(100);
    });
  });

  describe("ageDaysForDragonInstance / remainingLifespanForDragon / isDragonInstanceExpired", () => {
    it("is 0 age for eggs", () => {
      expect(ageDaysForDragonInstance(stubDragon({ hatchedAtMs: null }), DAY * 100)).toBe(0);
    });
    it("counts days since hatch", () => {
      expect(ageDaysForDragonInstance(stubDragon({ hatchedAtMs: 0 }), DAY * 5)).toBe(5);
    });
    it("counts the lifespan down from the breed value", () => {
      const d = stubDragon({ breedId: DRAGONS[0].id, hatchedAtMs: 0 });
      expect(remainingLifespanForDragon(d, DAY * 5)).toBe(DRAGONS[0].lifespanDays - 5);
      expect(remainingLifespanForDragon(stubDragon({ hatchedAtMs: null }), 999)).toBe(
        DRAGONS[0].lifespanDays,
      );
      expect(remainingLifespanForDragon(d, DAY * 1000)).toBe(0);
    });
    it("expires exactly at the breed lifespan, never as an egg", () => {
      const lifespan = DRAGONS[0].lifespanDays;
      const d = stubDragon({ breedId: DRAGONS[0].id, hatchedAtMs: 0 });
      expect(isDragonInstanceExpired(d, DAY * (lifespan - 1))).toBe(false);
      expect(isDragonInstanceExpired(d, DAY * lifespan)).toBe(true);
      expect(isDragonInstanceExpired(stubDragon({ hatchedAtMs: null }), DAY * 1000)).toBe(false);
    });
  });

  describe("levelForDragon / trainingCostForDragon", () => {
    it("maps strength to the display level", () => {
      expect(levelForDragon(stubDragon({ strength: 0 }))).toBe(1);
      expect(levelForDragon(stubDragon({ strength: 60 }))).toBe(6);
      expect(levelForDragon(stubDragon({ strength: 1000 }))).toBe(10);
    });
    it("charges the strength-scaled training cost", () => {
      expect(trainingCostForDragon(stubDragon({ strength: 10 }))).toBe(trainingCost(10));
      expect(trainingCostForDragon(stubDragon({ strength: 0 }))).toBe(CONFIG.training.costBase);
    });
  });

  describe("sellPriceForDragon", () => {
    it("derives age + live energy internally", () => {
      const d = stubDragon({ strength: 10, energy: 100, hatchedAtMs: 0, lastEnergyUpdateMs: 0 });
      const expected = sellPrice(
        10,
        ageDaysForDragon(0, DAY * 2),
        energyAt(100, 0, DAY * 2),
        DRAGONS[0].sellMultiplier,
      );
      expect(sellPriceForDragon(d, DAY * 2)).toBe(expected);
    });
    it("drops for drained dragons (energy factor)", () => {
      const full = stubDragon({ strength: 20, energy: 100, hatchedAtMs: 0, lastEnergyUpdateMs: 0 });
      const empty = stubDragon({ strength: 20, energy: 0, hatchedAtMs: 0, lastEnergyUpdateMs: DAY });
      expect(sellPriceForDragon(empty, DAY)).toBeLessThan(sellPriceForDragon(full, DAY));
    });
  });

  describe("canFightDragon / canTrainDragon / isBeastEligible", () => {
    it("canFightDragon needs hatched + positive live energy", () => {
      expect(canFightDragon(stubDragon({ hatchedAtMs: null }), 0)).toBe(false);
      expect(canFightDragon(stubDragon({ energy: 0, lastEnergyUpdateMs: 0 }), 0)).toBe(false);
      expect(canFightDragon(stubDragon({ energy: 1, lastEnergyUpdateMs: 0 }), 0)).toBe(true);
    });
    it("canFightDragon derives recovery (drained anchor + time = fightable)", () => {
      const d = stubDragon({ energy: 0, lastEnergyUpdateMs: 0 });
      expect(canFightDragon(d, 0)).toBe(false);
      expect(canFightDragon(d, 2 * HOUR)).toBe(true);
    });
    it("canTrainDragon needs hatched + energy + coins", () => {
      const cost = trainingCost(10);
      expect(canTrainDragon(stubDragon({ hatchedAtMs: null }), 1000, 0)).toBe(false);
      expect(canTrainDragon(stubDragon({ energy: 0, lastEnergyUpdateMs: 0 }), 1000, 0)).toBe(false);
      expect(canTrainDragon(stubDragon({ energy: 100, lastEnergyUpdateMs: 0 }), cost - 1, 0)).toBe(false);
      expect(canTrainDragon(stubDragon({ energy: 100, lastEnergyUpdateMs: 0 }), cost, 0)).toBe(true);
    });
    it("isBeastEligible mirrors canFightDragon (eggs never participate)", () => {
      expect(isBeastEligible(stubDragon({ hatchedAtMs: null, energy: 100 }), 0)).toBe(false);
      expect(isBeastEligible(stubDragon({ energy: 0, lastEnergyUpdateMs: 0 }), 0)).toBe(false);
      expect(isBeastEligible(stubDragon({ energy: 50, lastEnergyUpdateMs: 0 }), 0)).toBe(true);
    });
  });
});

describe("strength cap + stars (max 125, 5 str = 1 silver, 5 silver = 1 gold)", () => {
  it("caps strength at CONFIG.strength.max (125)", () => {
    expect(CONFIG.strength.max).toBe(125);
    expect(clampStrength(0)).toBe(0);
    expect(clampStrength(125)).toBe(125);
    expect(clampStrength(200)).toBe(125);
    expect(clampStrength(-5)).toBe(0);
    expect(applyStrengthGain(124, 5)).toBe(125);
    expect(applyStrengthGain(125, 5)).toBe(125);
    expect(applyStrengthGain(10, 3)).toBe(13);
  });
  it("maps strength to stars: 5 -> 1 silver, 25 -> 1 gold, 30 -> 1 gold + 1 silver", () => {
    expect(starsForStrength(0)).toEqual({ gold: 0, silver: 0 });
    expect(starsForStrength(4)).toEqual({ gold: 0, silver: 0 });
    expect(starsForStrength(5)).toEqual({ gold: 0, silver: 1 });
    expect(starsForStrength(24)).toEqual({ gold: 0, silver: 4 });
    expect(starsForStrength(25)).toEqual({ gold: 1, silver: 0 });
    expect(starsForStrength(30)).toEqual({ gold: 1, silver: 1 });
    expect(starsForStrength(125)).toEqual({ gold: 5, silver: 0 });
    expect(starsForStrength(999)).toEqual({ gold: 5, silver: 0 });
  });
});

describe("catalogue invariants (CONFIG / DRAGONS / MONSTERS)", () => {
  it("breedCount matches the DRAGONS catalogue", () => {
    expect(CONFIG.egg.breedCount).toBe(16);
    expect(DRAGONS).toHaveLength(CONFIG.egg.breedCount);
  });
  it("breeds have valid strength ranges, multipliers and lifespans", () => {
    const ids = new Set<string>();
    const assetKeys = new Set<string>();
    for (const b of DRAGONS) {
      expect(b.baseStrengthMin).toBeLessThanOrEqual(b.baseStrengthMax);
      expect(b.sellMultiplier).toBeGreaterThan(0);
      expect(b.lifespanDays).toBeGreaterThanOrEqual(30);
      expect(b.lifespanDays).toBeLessThanOrEqual(45);
      expect(b.assetKey).toMatch(/^[a-z0-9_]+$/);
      expect(ids.has(b.id)).toBe(false);
      expect(assetKeys.has(b.assetKey)).toBe(false);
      ids.add(b.id);
      assetKeys.add(b.assetKey);
    }
  });
  it("weaker breeds live longer than epics (design intent)", () => {
    expect(DRAGONS[0].lifespanDays).toBeGreaterThan(
      DRAGONS[DRAGONS.length - 1].lifespanDays,
    );
  });
  it("monsters cover Easy/Medium/Hard with sane ranges", () => {
    expect(MONSTERS.map((m) => m.difficulty)).toEqual([
      "Easy",
      "Medium",
      "Hard",
    ]);
    for (const m of MONSTERS) {
      expect(m.rewardMin).toBeLessThanOrEqual(m.rewardMax);
      expect(m.hp).toBeGreaterThan(0);
      expect(m.spawnChance).toBeGreaterThan(0);
      expect(m.spawnChance).toBeLessThanOrEqual(1);
    }
    // difficulty ordering: harder hits harder and pays more
    expect(MONSTERS[0].strength).toBeLessThan(MONSTERS[1].strength);
    expect(MONSTERS[1].strength).toBeLessThan(MONSTERS[2].strength);
    expect(MONSTERS[0].rewardMax).toBeLessThan(MONSTERS[2].rewardMin);
    for (const m of MONSTERS) {
      expect(m.image).toMatch(/^monsters\/.+\.png$/);
    }
  });
  it("balance targets reference reachable thresholds", () => {
    expect(CONFIG.balanceTargets.hourlyIncome).toBe(
      CONFIG.economy.hourlyCoins,
    );
  });
});
