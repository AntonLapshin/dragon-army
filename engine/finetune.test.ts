/**
 * Fine-tune scenarios for the 5 game-balance targets.
 *
 * Each `describe` block maps 1:1 to a requested tuning goal and fails with
 * a plain-language message if the config drifts away from it. Monte Carlo
 * sections use a seeded RNG (mulberry32) so runs are reproducible.
 *
 * 1) Monster spawn: Easy ~6x/day (≈33%/h), Medium ~20%/h, Hard ~10%/h
 * 2) Fresh dragon vs Easy: mostly loses (~25% win); a win leaves 0-30 energy
 * 3) Passive coins: a casual player (half collected, sleep/school misses)
 *    earns an egg in ~5 days
 * 4) Full energy recovery (0 -> 100) fits within a day
 * 5) Selling a fresh young dragon always yields < 100 coins (no quick flip)
 */
import { describe, expect, it } from "vitest";
import {
  CONFIG,
  DRAGONS,
  MONSTERS,
  collectibleCoins,
  recoverEnergy,
  resolveMonsterFight,
  rollBaseStrength,
  sellPrice,
} from "./config";

/** Deterministic seeded RNG (mulberry32) for reproducible Monte Carlo. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** Win rate of a fixed-strength dragon vs MONSTERS[index]. */
function winRateVs(
  strength: number,
  monsterIndex: number,
  trials: number,
  seed: number,
): number {
  const monster = MONSTERS[monsterIndex];
  const rng = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    if (resolveMonsterFight(strength, 100, monster, rng(), rng(), rng()).won)
      wins++;
  }
  return wins / trials;
}

// ---------------------------------------------------------------------------

describe("scenario 1: monster spawn pacing (Easy ~6/day, 33%/20%/10% per hour)", () => {
  it("spawn chances match the requested hourly rates", () => {
    expect(MONSTERS[0].spawnChance).toBeCloseTo(0.33, 2);
    expect(MONSTERS[1].spawnChance).toBeCloseTo(0.2, 2);
    expect(MONSTERS[2].spawnChance).toBeCloseTo(0.1, 2);
  });

  it("rolls happen hourly (one roll per difficulty per hour)", () => {
    expect(CONFIG.monsterSpawn.rollPerDifficulty).toBe(true);
    expect(CONFIG.monsterSpawn.refreshIntervalMs).toBe(HOUR);
  });

  it("Easy shows up ~6-8 times a day (24h x 33% ≈ 8)", () => {
    const perDay = 24 * MONSTERS[0].spawnChance;
    expect(perDay).toBeGreaterThanOrEqual(6);
    expect(perDay).toBeLessThanOrEqual(10);
  });

  it("Medium (~5/day) and Hard (~2-3/day) are rarer than Easy", () => {
    expect(24 * MONSTERS[1].spawnChance).toBeCloseTo(4.8, 0);
    expect(24 * MONSTERS[2].spawnChance).toBeCloseTo(2.4, 0);
    expect(MONSTERS[0].spawnChance).toBeGreaterThan(MONSTERS[1].spawnChance);
    expect(MONSTERS[1].spawnChance).toBeGreaterThan(MONSTERS[2].spawnChance);
  });

  it("Monte Carlo over 30 simulated days matches the hourly rates", () => {
    const rng = mulberry32(1234);
    const hours = 30 * 24;
    const counts = [0, 0, 0];
    for (let h = 0; h < hours; h++) {
      for (let m = 0; m < MONSTERS.length; m++) {
        if (rng() < MONSTERS[m].spawnChance) counts[m]++;
      }
    }
    expect(counts[0] / hours).toBeGreaterThan(0.28);
    expect(counts[0] / hours).toBeLessThan(0.38);
    expect(counts[1] / hours).toBeGreaterThan(0.15);
    expect(counts[1] / hours).toBeLessThan(0.25);
    expect(counts[2] / hours).toBeGreaterThan(0.06);
    expect(counts[2] / hours).toBeLessThan(0.14);
    // Easy lands at ~6-8 sightings on an average day
    expect(counts[0] / 30).toBeGreaterThanOrEqual(6);
    expect(counts[0] / 30).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------

describe("scenario 2: fresh dragon vs Easy monster (underdog, costly wins)", () => {
  const easy = MONSTERS[0];
  // weakest / average / strongest fresh common hatch
  const FRESH_WEAK = 8;
  const FRESH_AVG = 11;
  const FRESH_MAX = 14;

  it("Easy is stronger than any fresh common (fresh cannot rely on winning)", () => {
    expect(easy.strength).toBeGreaterThan(FRESH_AVG);
    expect(easy.strength).toBeGreaterThan(FRESH_MAX);
  });

  it("weakest fresh hatch (8) can never beat Easy (needs bonus>=11, max bonus is 10)", () => {
    expect(winRateVs(FRESH_WEAK, 0, 500, 51)).toBe(0);
  });

  it("average fresh hatch (~11) wins only ~25% of the time", () => {
    const rate = winRateVs(FRESH_AVG, 0, 5000, 52);
    expect(rate).toBeGreaterThan(0.15);
    expect(rate).toBeLessThan(0.4);
    // analytical check: needs bonus>=8 -> 3/11 ≈ 27%
    expect(rate).toBeCloseTo(3 / 11, 1);
  });

  it("a fresh win leaves almost no energy (0-30 left)", () => {
    expect(easy.energyLossWinMin).toBeGreaterThanOrEqual(70);
    expect(easy.energyLossWinMax).toBeLessThanOrEqual(100);
    const rng = mulberry32(53);
    for (let i = 0; i < 500; i++) {
      const r = resolveMonsterFight(FRESH_AVG, 100, easy, rng(), rng(), rng());
      if (r.won) {
        expect(r.energyAfter).toBeGreaterThanOrEqual(0);
        expect(r.energyAfter).toBeLessThanOrEqual(30);
      }
    }
  });

  it("a fresh loss also drains almost everything (near-death)", () => {
    expect(easy.energyLossLoseMin).toBeGreaterThanOrEqual(80);
    const rng = mulberry32(54);
    const r = resolveMonsterFight(FRESH_AVG, 100, easy, 0, 0.5, 0.999);
    expect(r.won).toBe(false);
    expect(r.energyAfter).toBeLessThanOrEqual(20);
    void rng;
  });

  it("after 2-3 trainings the dragon turns the tables (progression intact)", () => {
    // +5 avg per training: 11 -> ~21-26 after 2-3 trainings
    expect(winRateVs(21, 0, 1000, 55)).toBeGreaterThan(0.85);
    expect(winRateVs(26, 0, 500, 56)).toBe(1);
  });
});

// ---------------------------------------------------------------------------

describe("scenario 3: passive coins -> egg in ~5 days of casual play", () => {
  it("free income is a trickle (2 coins/hour)", () => {
    expect(CONFIG.economy.hourlyCoins).toBeLessThanOrEqual(3);
    expect(CONFIG.economy.hourlyCoins).toBe(2);
  });

  it("perfect 24/7 collection needs ~50h of wall time for an egg (100 coins)", () => {
    // diligent taps (cap never hit): 49h -> 98 < 100, 50h -> 100 >= 100
    expect(49 * CONFIG.economy.hourlyCoins).toBeLessThan(CONFIG.egg.price);
    expect(50 * CONFIG.economy.hourlyCoins).toBeGreaterThanOrEqual(
      CONFIG.egg.price,
    );
    // ...but one single uncollected stretch caps at 12h (24 coins),
    // so the player must tap along the way
    expect(collectibleCoins(50 * HOUR)).toBe(24);
  });

  it("casual model: half collected + sleep/school misses -> ~5 days", () => {
    // Model: ~20h of accrual a day (sleep still accrues, capped), the
    // player taps only half of what accrued (missed taps, school, sleep).
    // Daily yield = 20h * 2 coins * 0.5 = 20 coins/day -> 5 days per egg.
    const accrualHoursPerDay = 20;
    const collectRatio = 0.5;
    const dailyYield =
      accrualHoursPerDay * CONFIG.economy.hourlyCoins * collectRatio;
    const daysToEgg = CONFIG.egg.price / dailyYield;
    expect(dailyYield).toBe(20);
    expect(daysToEgg).toBeGreaterThanOrEqual(4);
    expect(daysToEgg).toBeLessThanOrEqual(6);
  });

  it("even an 8h sleep shift cannot bank an egg (cap = 24)", () => {
    expect(collectibleCoins(8 * HOUR)).toBe(16);
    expect(collectibleCoins(8 * HOUR)).toBeLessThan(CONFIG.egg.price);
    expect(collectibleCoins(7 * DAY)).toBeLessThan(CONFIG.egg.price);
  });

  it("monster wins stay meaningful next to the trickle (Easy win ≈ 10h passive)", () => {
    const easyAvg = (MONSTERS[0].rewardMin + MONSTERS[0].rewardMax) / 2;
    expect(easyAvg / CONFIG.economy.hourlyCoins).toBeGreaterThanOrEqual(8);
    expect(easyAvg / CONFIG.economy.hourlyCoins).toBeLessThanOrEqual(15);
  });
});

// ---------------------------------------------------------------------------

describe("scenario 4: full energy recovery fits within a day", () => {
  it("0 -> 100 recovers in 10h (less than 24h)", () => {
    expect(recoverEnergy(0, 10 * HOUR)).toBe(100);
    expect(recoverEnergy(0, 24 * HOUR)).toBe(100);
  });

  it("an Easy-win wound (70-100 loss) heals overnight (~7-10h)", () => {
    const worstAfter = 100 - MONSTERS[0].energyLossWinMax; // 0
    const bestAfter = 100 - MONSTERS[0].energyLossWinMin; // 30
    expect(recoverEnergy(worstAfter, 10 * HOUR)).toBe(100);
    expect(recoverEnergy(bestAfter, 7 * HOUR)).toBe(100);
    // daily loop: fight in the evening, full bar next morning
    expect(recoverEnergy(0, 8 * HOUR)).toBeGreaterThanOrEqual(80);
  });

  it("recovery rate derives 100 energy per day or faster", () => {
    const perDay =
      (DAY / CONFIG.energy.recoveryIntervalMs) * CONFIG.energy.recoveryAmount;
    expect(perDay).toBeGreaterThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------

describe("scenario 5: fresh dragon resale is always < 100 (no quick flip)", () => {
  it("selling formula is tuned down (base 10 / 1.5 per str / 2 per day)", () => {
    expect(CONFIG.selling.basePrice).toBe(10);
    expect(CONFIG.selling.perStrength).toBe(1.5);
    expect(CONFIG.selling.perAgeDay).toBe(2);
  });

  it("every breed at max fresh roll, age 0, full energy sells for < 100", () => {
    for (const breed of DRAGONS) {
      const maxFresh = rollBaseStrength(breed, 0.999999);
      const price = sellPrice(maxFresh, 0, 100, breed.sellMultiplier);
      expect(price).toBeLessThan(100);
    }
  });

  it("even the strongest epic (Night Fury 28 x1.7) cannot flip for profit", () => {
    const nightFury = DRAGONS[DRAGONS.length - 1];
    const topRoll = rollBaseStrength(nightFury, 0.999999);
    expect(topRoll).toBe(28);
    expect(sellPrice(topRoll, 0, 100, nightFury.sellMultiplier)).toBeLessThan(
      100,
    );
    expect(
      sellPrice(topRoll, 0, 100, nightFury.sellMultiplier),
    ).toBeLessThan(CONFIG.egg.price);
  });

  it("a typical fresh common (strength 8-14, age 0) sells for pocket change", () => {
    const common = DRAGONS[0];
    for (let s = 8; s <= 14; s++) {
      const price = sellPrice(s, 0, 100, common.sellMultiplier);
      expect(price).toBeLessThan(100);
      expect(price).toBeLessThan(CONFIG.egg.price);
    }
    // drained energy sells for even less (0.5x factor at 0 energy)
    expect(sellPrice(11, 0, 0, 1.0)).toBeLessThan(
      sellPrice(11, 0, 100, 1.0),
    );
  });
});
