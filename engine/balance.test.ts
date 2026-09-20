/**
 * Game-balance / fine-tune orientir tests for engine/config.ts.
 *
 * These tests do NOT assert implementation details — they assert the
 * *player-facing pacing* that the raw numbers should produce under ideal
 * conditions. If a balance tweak breaks one of them, treat the failure as
 * a design signal: either the new pacing is intended (update the orientir
 * and the documented target) or the tweak went too far (retune the config).
 *
 * Covered orientirs (see CONFIG.balanceTargets):
 * - full dragon recovery time (energy 0 -> 100)
 * - hours of passive income to afford an egg
 * - Easy / Medium / Hard spawn distribution
 * - trainings needed + win-rate vs Easy / Medium / Hard
 * - roster size / strength needed to beat the Bewilder Beast
 * - end-to-end ideal-playthrough cost model (egg -> beast-ready)
 */
import { describe, expect, it } from "vitest";
import {
  CONFIG,
  DRAGONS,
  MONSTERS,
  ageDaysFromMs,
  collectibleCoins,
  energyAt,
  maxUncollectedCoins,
  recoverEnergy,
  resolveBeastTurn,
  resolveMonsterFight,
  rollBeastCounterDamage,
  rollDamageBonus,
  rollTrainingGain,
  trainingCost,
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
const AVG_TRAINING_GAIN = (CONFIG.training.strengthGainMin + CONFIG.training.strengthGainMax) / 2; // 5
const AVG_BONUS = (CONFIG.battle.randomBonusMin + CONFIG.battle.randomBonusMax) / 2; // 5
const AVG_BEAST_COUNTER = (CONFIG.beast.counterDamageMin + CONFIG.beast.counterDamageMax) / 2; // 23

/** Monte-Carlo win rate vs a monster at fixed strength. */
function monsterWinRate(
  strength: number,
  monsterIndex: number,
  trials: number,
  seed: number,
): number {
  const monster = MONSTERS[monsterIndex];
  const rng = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    const r = resolveMonsterFight(strength, 100, monster, rng(), rng(), rng());
    if (r.won) wins++;
  }
  return wins / trials;
}

/**
 * Simulate a full Beast run with a roster of equal-strength dragons.
 * Roster order, each dragon fights until removed, next steps in.
 * Returns true when beast HP hits 0 before the roster is wiped.
 */
function simulateBeastRoster(
  strengths: number[],
  rng: () => number,
  startEnergy = 100,
): boolean {
  let hp = CONFIG.beast.hp;
  for (const strength of strengths) {
    let energy = startEnergy;
    while (energy > 0 && hp > 0) {
      const turn = resolveBeastTurn(strength, energy, hp, rng(), rng());
      hp = turn.beastHpAfter;
      energy = turn.dragonEnergyAfter;
      if (turn.beastDefeated) return true;
      if (turn.dragonRemoved) break;
    }
  }
  return hp <= 0;
}

function beastWinRate(
  strengths: number[],
  trials: number,
  seed: number,
): number {
  const rng = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < trials; i++) {
    if (simulateBeastRoster(strengths, rng)) wins++;
  }
  return wins / trials;
}

// ---------------------------------------------------------------------------

describe("orientir: energy recovery", () => {
  it("fully recovers an empty dragon in 10h (10 energy/hour)", () => {
    expect(recoverEnergy(0, 10 * HOUR)).toBe(100);
    expect(recoverEnergy(0, 5 * HOUR)).toBeCloseTo(50);
    // orientir: overnight (8h) restores 80 — enough for a full beast attempt leg
    expect(recoverEnergy(0, 8 * HOUR)).toBeCloseTo(80);
  });

  it("recovers a typical Easy-fight wound (avg ~9) in about 1h", () => {
    // Easy win loss avg = (6+12)/2 = 9
    const afterEasyWin = 100 - 9;
    expect(recoverEnergy(afterEasyWin, HOUR)).toBe(100);
  });

  it("recovers a typical Hard-fight wound (avg ~18 win / ~28 lose) in 2-3h", () => {
    const afterHardWin = 100 - 18;
    const afterHardLoss = 100 - 28;
    expect(recoverEnergy(afterHardWin, 2 * HOUR)).toBe(100);
    expect(recoverEnergy(afterHardLoss, 3 * HOUR)).toBe(100);
  });

  it("energyAt() derives the same curve from stored anchors (no tick writes)", () => {
    const t0 = 1_000_000;
    expect(energyAt(0, t0, t0 + 10 * HOUR)).toBe(100);
    expect(energyAt(20, t0, t0 + 5 * HOUR)).toBeCloseTo(70);
  });
});

describe("orientir: coin pacing -> egg", () => {
  it("starting wallet buys the first egg immediately", () => {
    expect(CONFIG.economy.startingCoins).toBeGreaterThanOrEqual(
      CONFIG.egg.price,
    );
  });

  it("a broke player earns an egg (100 coins) after 9h of passive income", () => {
    // discrete hourly accrual: 8h -> 96 < 100, 9h -> 108 >= 100
    expect(collectibleCoins(8 * HOUR)).toBeLessThan(CONFIG.egg.price);
    expect(collectibleCoins(9 * HOUR)).toBeGreaterThanOrEqual(
      CONFIG.egg.price,
    );
  });

  it("uncollected coins cap at 12h (144) — a full day offline still yields one egg + change", () => {
    expect(maxUncollectedCoins()).toBe(144);
    expect(collectibleCoins(24 * HOUR)).toBe(144);
    expect(collectibleCoins(24 * HOUR)).toBeGreaterThanOrEqual(
      CONFIG.egg.price,
    );
  });

  it("hourly income funds ~0.7 trainings/h early, ~0.2-0.3 late (matches balanceTargets)", () => {
    const earlyCost = trainingCost(11); // fresh common hatch
    const lateCost = trainingCost(55); // hard-ready
    expect(earlyCost).toBe(16);
    expect(lateCost).toBe(52);
    expect(CONFIG.economy.hourlyCoins / earlyCost).toBeCloseTo(0.75, 1);
    const lateRate = CONFIG.economy.hourlyCoins / lateCost;
    expect(lateRate).toBeGreaterThan(0.15);
    expect(lateRate).toBeLessThan(0.35);
  });
});

describe("orientir: monster spawn distribution", () => {
  it("long-run spawn rates match spawnChance (Easy ~65%, Medium ~28%, Hard ~12%)", () => {
    const rng = mulberry32(42);
    const N = 20_000;
    const counts = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      for (let m = 0; m < MONSTERS.length; m++) {
        if (rng() < MONSTERS[m].spawnChance) counts[m]++;
      }
    }
    const [easy, medium, hard] = counts.map((c) => c / N);
    expect(easy).toBeGreaterThan(0.62);
    expect(easy).toBeLessThan(0.68);
    expect(medium).toBeGreaterThan(0.25);
    expect(medium).toBeLessThan(0.31);
    expect(hard).toBeGreaterThan(0.10);
    expect(hard).toBeLessThan(0.14);
    // ordering: easy shows up most often
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
  });

  it("shows ~1 monster on average, empty ~22% of the time", () => {
    const rng = mulberry32(7);
    const N = 20_000;
    let total = 0;
    let empty = 0;
    for (let i = 0; i < N; i++) {
      let shown = 0;
      for (const m of MONSTERS) if (rng() < m.spawnChance) shown++;
      total += shown;
      if (shown === 0) empty++;
    }
    // expected mean = 0.65+0.28+0.12 = 1.05; P(empty) = .35*.72*.88 ≈ .22
    expect(total / N).toBeGreaterThan(0.95);
    expect(total / N).toBeLessThan(1.15);
    expect(empty / N).toBeGreaterThan(0.19);
    expect(empty / N).toBeLessThan(0.25);
  });
});

describe("orientir: training progression -> Easy / Medium / Hard", () => {
  it("documents average training gain of 5 strength", () => {
    expect(AVG_TRAINING_GAIN).toBe(5);
    // sanity: every roll in [3,7] (rand01 contract is [0, 1))
    for (let i = 0; i < 10; i++) {
      expect(rollTrainingGain(i / 10)).toBeGreaterThanOrEqual(3);
      expect(rollTrainingGain(i / 10)).toBeLessThanOrEqual(7);
    }
  });

  it("fresh common hatch (~11) needs ~1-2 trainings for Easy (target: hatch + 1-2)", () => {
    // Easy strength 15: strength 11 wins only with bonus>=4 (~64%),
    // strength 16+ (one avg training) always wins (16+0 >= 15).
    expect(monsterWinRate(11, 0, 3000, 1)).toBeGreaterThan(0.5);
    expect(monsterWinRate(11, 0, 3000, 1)).toBeLessThan(0.8);
    expect(monsterWinRate(16, 0, 500, 2)).toBe(1);
    expect(monsterWinRate(21, 0, 500, 3)).toBe(1);
  });

  it("Medium (~32) becomes favored at strength ~30 after ~3-5 trainings", () => {
    // 11 -> 30 needs +19 ≈ 4 avg trainings; win needs bonus>=2 (~82%)
    const trainingsNeeded = Math.ceil((30 - 11) / AVG_TRAINING_GAIN);
    expect(trainingsNeeded).toBeGreaterThanOrEqual(3);
    expect(trainingsNeeded).toBeLessThanOrEqual(5);
    const rate = monsterWinRate(30, 1, 3000, 4);
    expect(rate).toBeGreaterThan(0.7);
    expect(rate).toBeLessThan(0.95);
    // undertrained dragons mostly lose to Medium
    expect(monsterWinRate(15, 1, 2000, 5)).toBeLessThan(0.1);
  });

  it("Hard (~55) needs ~7-12 trainings or an epic hatch", () => {
    // common 11 -> 55 needs +44 ≈ 9 avg trainings
    const fromCommon = Math.ceil((55 - 11) / AVG_TRAINING_GAIN);
    expect(fromCommon).toBeGreaterThanOrEqual(7);
    expect(fromCommon).toBeLessThanOrEqual(12);
    // epic hatch 18-25 shortens the grind to ~6-8 trainings
    const fromEpic = Math.ceil((55 - 22) / AVG_TRAINING_GAIN);
    expect(fromEpic).toBeLessThan(fromCommon);
    // at 55 every bonus wins; at 40 nothing wins (needs bonus>=15, max 10)
    expect(monsterWinRate(55, 2, 500, 6)).toBe(1);
    expect(monsterWinRate(40, 2, 500, 7)).toBe(0);
    expect(monsterWinRate(50, 2, 500, 8)).toBeGreaterThan(0.4);
  });

  it("monster rewards accelerate training (Easy ~20, Medium ~45, Hard ~90 avg)", () => {
    const avg = (lo: number, hi: number) => (lo + hi) / 2;
    expect(avg(MONSTERS[0].rewardMin, MONSTERS[0].rewardMax)).toBeCloseTo(20);
    expect(avg(MONSTERS[1].rewardMin, MONSTERS[1].rewardMax)).toBeCloseTo(45);
    expect(avg(MONSTERS[2].rewardMin, MONSTERS[2].rewardMax)).toBeCloseTo(90);
    // one Medium win (~45) funds a mid-game training (~32 at str 30)
    expect(avg(MONSTERS[1].rewardMin, MONSTERS[1].rewardMax)).toBeGreaterThan(
      trainingCost(30),
    );
    // one Hard win (~90) funds ~1.7 late trainings
    expect(avg(MONSTERS[2].rewardMin, MONSTERS[2].rewardMax) / trainingCost(55))
      .toBeGreaterThan(1.5);
  });
});

describe("orientir: Bewilder Beast (boss)", () => {
  it("documents per-turn math: avg bonus 5, avg counter 23", () => {
    expect(AVG_BONUS).toBe(5);
    expect(AVG_BEAST_COUNTER).toBe(23);
    expect(rollDamageBonus(0.5)).toBeGreaterThanOrEqual(0);
    expect(rollDamageBonus(0.5)).toBeLessThanOrEqual(10);
    expect(rollBeastCounterDamage(0.5)).toBeGreaterThanOrEqual(18);
    expect(rollBeastCounterDamage(0.5)).toBeLessThanOrEqual(28);
  });

  it("a strength-40 dragon deals ~25/turn and lasts ~5 turns (~125 lifetime damage)", () => {
    // expected damage = 40 + 5 - 20 (beast constant) = 25
    const expectedPerTurn = 40 + AVG_BONUS - CONFIG.beast.strengthConstant;
    expect(expectedPerTurn).toBe(25);
    // lifetime turns = ceil(100 / 23) = 5
    const expectedTurns = Math.ceil(100 / AVG_BEAST_COUNTER);
    expect(expectedTurns).toBe(5);
    expect(expectedPerTurn * expectedTurns).toBeLessThan(CONFIG.beast.hp); // 125 < 260: solo-40 can't win
  });

  it("ONE dragon can NEVER kill the 260-HP beast at strength 40, even with max rolls", () => {
    // best case: bonus 10 every turn (30 dmg), counter 18 (6 turns) -> 180 < 260
    const maxDmgPerTurn = 40 + 10 - CONFIG.beast.strengthConstant;
    const maxTurns = Math.ceil(100 / CONFIG.beast.counterDamageMin);
    expect(maxDmgPerTurn * maxTurns).toBeLessThan(CONFIG.beast.hp);
    expect(beastWinRate([40], 300, 11)).toBe(0);
  });

  it("THREE dragons at 40 ALWAYS kill the beast, even with worst rolls (design target: 3-5 x 40-60)", () => {
    // worst case: bonus 0 every turn (20 dmg), counter 18 (6 turns) -> 120 each -> 360 > 260
    const minDmgPerTurn = 40 + 0 - CONFIG.beast.strengthConstant;
    const minTurnsEach = Math.ceil(100 / CONFIG.beast.counterDamageMin);
    expect(minDmgPerTurn * minTurnsEach * 3).toBeGreaterThan(CONFIG.beast.hp);
    expect(beastWinRate([40, 40, 40], 300, 12)).toBe(1);
  });

  it("TWO dragons at 40 are a coin flip (sometimes enough) — the 2-vs-3 threshold", () => {
    const rate = beastWinRate([40, 40], 500, 13);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.99);
  });

  it("TWO dragons at 55+ reliably win; FIVE at 50 always win", () => {
    expect(beastWinRate([55, 55], 300, 14)).toBe(1);
    expect(beastWinRate([50, 50, 50, 50, 50], 200, 15)).toBe(1);
  });

  it("boss reward (300) refunds ~3 eggs — worth the ~10h recovery", () => {
    expect(CONFIG.beast.winRewardMin).toBe(300);
    expect(CONFIG.beast.winRewardMax).toBe(300);
    expect(CONFIG.beast.winRewardMin).toBeGreaterThan(CONFIG.egg.price);
    expect(CONFIG.beast.respawnAfterWinMs).toBe(24 * HOUR);
  });
});

describe("orientir: ideal-playthrough cost model (egg -> beast-ready)", () => {
  it("reaching Medium-ready (~30 str) costs < 150 passive coins (~4 trainings from hatch)", () => {
    // 11->16 (16) + 16->21 (20) + 21->26 (24) + 26->31 (28) = 88
    const costs = [11, 16, 21, 26].map(trainingCost);
    const total = costs.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(150);
    expect(total / CONFIG.economy.hourlyCoins).toBeLessThan(13); // <13h passive
  });

  it("reaching Hard-ready (~55 str) costs < 400 passive coins (~9 trainings)", () => {
    let strength = 11;
    let total = 0;
    for (let i = 0; i < 9; i++) {
      total += trainingCost(strength);
      strength += AVG_TRAINING_GAIN;
    }
    expect(strength).toBeGreaterThanOrEqual(55);
    expect(total).toBeLessThan(400);
    // ~2 Medium wins (≈90) + ~20h passive covers it — active play matters
    expect(total).toBeLessThan(2 * 55 + 20 * CONFIG.economy.hourlyCoins);
  });

  it("a 3-dragon beast roster fits comfortably inside the 30-45d lifespan", () => {
    // 3 eggs hatch in 24-48h; ~18 trainings (≈450 coins ≈ 38h passive,
    // much less with fight rewards) still leaves weeks of lifespan.
    const hatchWindowDays = [24, 48].map((h) => h / 24);
    expect(Math.max(...hatchWindowDays)).toBeLessThanOrEqual(2);
    const shortestLifespan = Math.min(...DRAGONS.map((d) => d.lifespanDays));
    expect(shortestLifespan).toBe(30);
    // age math sanity: 30 days of ms really is 30 age-days
    expect(ageDaysFromMs(30 * 24 * HOUR)).toBe(30);
    // progression (≈5 days generous) << expiry (30 days epic)
    expect(5).toBeLessThan(shortestLifespan);
  });
});
