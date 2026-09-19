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
  MONSTERS,
  ageDaysForDragon,
  ageDaysFromMs,
  applyEnergyDrain,
  battleDamage,
  breedForIndex,
  canAffordEgg,
  canDragonFight,
  canTrain,
  clamp,
  collectibleCoins,
  drawBreedIndex,
  dragonStage,
  energyAt,
  hasCollectibleCoins,
  isBattleWin,
  isDragonExpired,
  isHatchDue,
  levelForStrength,
  maxUncollectedCoins,
  recoverEnergy,
  remainingLifespanDays,
  rollBaseStrength,
  rollBeastCounterDamage,
  rollBeastReward,
  rollDamageBonus,
  rollHatchMs,
  rollIntInclusive,
  rollSpawnedMonsters,
  rollTrainingGain,
  resolveBeastTurn,
  resolveMonsterFight,
  sellEnergyFactor,
  sellPrice,
  shouldSpawnMonster,
  trainingCost,
  type DragonBreed,
} from "./config";

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
    it("equals hourlyCoins * maxUncollectedHours (12 * 12 = 144)", () => {
      expect(maxUncollectedCoins()).toBe(
        CONFIG.economy.hourlyCoins *
          (CONFIG.economy.maxUncollectedMs /
            CONFIG.economy.coinAccrualIntervalMs),
      );
      expect(maxUncollectedCoins()).toBe(144);
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
      expect(collectibleCoins(12 * HOUR)).toBe(144);
      expect(collectibleCoins(24 * HOUR)).toBe(144);
      expect(collectibleCoins(1000 * HOUR)).toBe(144);
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
      [110, 9],
      [135, 10],
    ];
    for (const [strength, level] of cases) {
      expect(levelForStrength(strength)).toBe(level);
      expect(levelForStrength(strength - 1)).toBeLessThan(level);
    }
  });
  it("caps at level 10 above max threshold", () => {
    expect(levelForStrength(135)).toBe(10);
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
    it("stays within [3, 7]", () => {
      // rand01 contract is [0, 1) — never pass exactly 1.0
      for (let i = 0; i < 10; i++) {
        const v = rollTrainingGain(i / 10);
        expect(v).toBeGreaterThanOrEqual(3);
        expect(v).toBeLessThanOrEqual(7);
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
    it("follows floor((base + str*perStr + age*perAge) * mult * energyFactor)", () => {
      const expected = Math.floor(
        (CONFIG.selling.basePrice +
          10 * CONFIG.selling.perStrength +
          2 * CONFIG.selling.perAgeDay) *
          1.0 *
          sellEnergyFactor(100),
      );
      expect(sellPrice(10, 2, 100, 1.0)).toBe(expected);
    });
    it("scales with breed multiplier", () => {
      const low = sellPrice(10, 0, 100, 1.0);
      const high = sellPrice(10, 0, 100, 1.6);
      expect(high).toBeGreaterThan(low);
      expect(high).toBe(Math.floor(low * 1.6));
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
  describe("rollDamageBonus", () => {
    it("returns 0 at rand 0 and 10 at rand ~1", () => {
      expect(rollDamageBonus(0)).toBe(CONFIG.battle.randomBonusMin);
      expect(rollDamageBonus(0.999999)).toBe(CONFIG.battle.randomBonusMax);
    });
  });

  describe("battleDamage", () => {
    it("computes dragon + bonus - opponent", () => {
      expect(battleDamage(20, 15, 5)).toBe(10);
      expect(battleDamage(10, 15, 0)).toBe(-5);
    });
    it("may be negative (loss signal)", () => {
      expect(battleDamage(5, 55, 0)).toBeLessThan(0);
    });
  });

  describe("isBattleWin", () => {
    it("wins on zero (chip damage counts)", () => {
      expect(isBattleWin(0)).toBe(true);
    });
    it("wins on positive, loses on negative", () => {
      expect(isBattleWin(1)).toBe(true);
      expect(isBattleWin(-1)).toBe(false);
    });
  });

  describe("resolveMonsterFight", () => {
    const easy = MONSTERS[0];

    it("resolves a win with reward and win-range energy loss", () => {
      // strong dragon + max bonus always wins vs Easy(15)
      const res = resolveMonsterFight(50, 100, easy, 0.999, 0.5, 0.5);
      expect(res.won).toBe(true);
      expect(res.rawDamage).toBeGreaterThanOrEqual(0);
      expect(res.coinReward).toBeGreaterThanOrEqual(easy.rewardMin);
      expect(res.coinReward).toBeLessThanOrEqual(easy.rewardMax);
      expect(res.energyLoss).toBeGreaterThanOrEqual(easy.energyLossWinMin);
      expect(res.energyLoss).toBeLessThanOrEqual(easy.energyLossWinMax);
      expect(res.energyAfter).toBe(100 - res.energyLoss);
    });

    it("resolves a loss with zero reward and lose-range energy loss", () => {
      // weak dragon + zero bonus always loses vs Easy(15)
      const res = resolveMonsterFight(1, 100, easy, 0, 0.5, 0.5);
      expect(res.won).toBe(false);
      expect(res.rawDamage).toBeLessThan(0);
      expect(res.coinReward).toBe(0);
      expect(res.energyLoss).toBeGreaterThanOrEqual(easy.energyLossLoseMin);
      expect(res.energyLoss).toBeLessThanOrEqual(easy.energyLossLoseMax);
      expect(res.energyAfter).toBe(100 - res.energyLoss);
    });

    it("maps reward/energy rand01 to range edges", () => {
      const winMin = resolveMonsterFight(50, 100, easy, 0.999, 0, 0);
      const winMax = resolveMonsterFight(50, 100, easy, 0.999, 0.999, 0.999);
      expect(winMin.coinReward).toBe(easy.rewardMin);
      expect(winMax.coinReward).toBe(easy.rewardMax);
      expect(winMin.energyLoss).toBe(easy.energyLossWinMin);
      expect(winMax.energyLoss).toBe(easy.energyLossWinMax);
    });

    it("clamps energyAfter at 0 on heavy losses", () => {
      const res = resolveMonsterFight(1, 5, easy, 0, 0.5, 0.999);
      expect(res.energyAfter).toBeGreaterThanOrEqual(0);
      expect(res.energyAfter).toBe(
        Math.max(0, 5 - res.energyLoss),
      );
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
      // Easy 0.65 pass, Medium 0.28 fail, Hard 0.12 fail
      const seq = [0.5, 0.5, 0.5];
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
  describe("rollBeastCounterDamage", () => {
    it("returns min at 0 and max at ~1", () => {
      expect(rollBeastCounterDamage(0)).toBe(CONFIG.beast.counterDamageMin);
      expect(rollBeastCounterDamage(0.999999)).toBe(
        CONFIG.beast.counterDamageMax,
      );
    });
  });

  describe("rollBeastReward", () => {
    it("returns min at 0 and max at ~1", () => {
      expect(rollBeastReward(0)).toBe(CONFIG.beast.winRewardMin);
      expect(rollBeastReward(0.999999)).toBe(CONFIG.beast.winRewardMax);
    });
    it("stays in [150, 200]", () => {
      expect(rollBeastReward(0.5)).toBeGreaterThanOrEqual(150);
      expect(rollBeastReward(0.5)).toBeLessThanOrEqual(200);
    });
  });

  describe("resolveBeastTurn", () => {
    it("damages the beast and drains dragon energy on a normal turn", () => {
      const res = resolveBeastTurn(50, 100, 260, 0.5, 0.5);
      expect(res.rawDamage).toBe(
        50 + rollDamageBonus(0.5) - CONFIG.beast.strengthConstant,
      );
      expect(res.beastHpAfter).toBe(260 - Math.max(0, res.rawDamage));
      expect(res.beastDefeated).toBe(false);
      expect(res.counterDamage).toBeGreaterThanOrEqual(
        CONFIG.beast.counterDamageMin,
      );
      expect(res.dragonEnergyAfter).toBe(100 - res.counterDamage);
      expect(res.dragonRemoved).toBe(false);
    });

    it("deals no damage on negative rawDamage but still takes counter", () => {
      const res = resolveBeastTurn(1, 100, 260, 0, 0.5);
      expect(res.rawDamage).toBeLessThan(0);
      expect(res.beastHpAfter).toBe(260);
      expect(res.counterDamage).toBeGreaterThan(0);
      expect(res.beastDefeated).toBe(false);
    });

    it("skips counter damage and keeps energy on the killing blow", () => {
      const res = resolveBeastTurn(100, 40, 5, 0.999, 0.999);
      expect(res.beastHpAfter).toBe(0);
      expect(res.beastDefeated).toBe(true);
      expect(res.counterDamage).toBe(0);
      expect(res.dragonEnergyAfter).toBe(40);
      expect(res.dragonRemoved).toBe(false);
    });

    it("flags dragonRemoved when counter drains energy to 0", () => {
      const res = resolveBeastTurn(30, 5, 260, 0.5, 0.999);
      expect(res.beastDefeated).toBe(false);
      expect(res.dragonEnergyAfter).toBe(0);
      expect(res.dragonRemoved).toBe(true);
    });

    it("clamps beast HP at 0 on overkill", () => {
      const res = resolveBeastTurn(200, 100, 10, 0.999, 0.5);
      expect(res.beastHpAfter).toBe(0);
    });
  });
});

describe("catalogue invariants (CONFIG / DRAGONS / MONSTERS)", () => {
  it("breedCount matches the DRAGONS catalogue", () => {
    expect(CONFIG.egg.breedCount).toBe(15);
    expect(DRAGONS).toHaveLength(CONFIG.egg.breedCount);
  });
  it("breeds have valid strength ranges, multipliers and lifespans", () => {
    const ids = new Set<string>();
    for (const b of DRAGONS) {
      expect(b.baseStrengthMin).toBeLessThanOrEqual(b.baseStrengthMax);
      expect(b.sellMultiplier).toBeGreaterThan(0);
      expect(b.lifespanDays).toBeGreaterThanOrEqual(30);
      expect(b.lifespanDays).toBeLessThanOrEqual(45);
      expect(ids.has(b.id)).toBe(false);
      ids.add(b.id);
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
      expect(m.energyLossWinMin).toBeLessThanOrEqual(m.energyLossWinMax);
      expect(m.energyLossLoseMin).toBeLessThanOrEqual(m.energyLossLoseMax);
      expect(m.spawnChance).toBeGreaterThan(0);
      expect(m.spawnChance).toBeLessThanOrEqual(1);
    }
    // difficulty ordering: harder hits harder and pays more
    expect(MONSTERS[0].strength).toBeLessThan(MONSTERS[1].strength);
    expect(MONSTERS[1].strength).toBeLessThan(MONSTERS[2].strength);
    expect(MONSTERS[0].rewardMax).toBeLessThan(MONSTERS[2].rewardMin);
  });
  it("balance targets reference reachable thresholds", () => {
    expect(CONFIG.balanceTargets.hourlyIncome).toBe(
      CONFIG.economy.hourlyCoins,
    );
  });
});
