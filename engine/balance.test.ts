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
  beastCombatDefense,
  collectibleCoins,
  energyAt,
  maxUncollectedCoins,
  recoverEnergy,
  resolveBeastTurn,
  resolveMonsterFight,
  rollBeastCounterDamage,
  rollDamageBonus,
  rollTrainingGain,
  starsForStrength,
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
const AVG_TRAINING_GAIN = (CONFIG.training.strengthGainMin + CONFIG.training.strengthGainMax) / 2; // 3.5
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
    // Mirror the engine loop: blows scale with entry energy, the counter
    // drains live energy turn by turn.
    const fightStartEnergy = startEnergy;
    while (energy > 0 && hp > 0) {
      const turn = resolveBeastTurn(strength, energy, hp, rng(), rng(), fightStartEnergy);
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

  it("recovers a typical Easy-fight wound (avg ~85 win) in about a day-shift (8-10h)", () => {
    // Easy win loss avg = (70+100)/2 = 85 -> 100-85 = 15 left
    const afterEasyWin = 100 - 85;
    expect(recoverEnergy(afterEasyWin, 9 * HOUR)).toBe(100);
    expect(recoverEnergy(afterEasyWin, 8 * HOUR)).toBeGreaterThanOrEqual(90);
  });

  it("recovers even the heaviest wounds (95-100) within a day", () => {
    const afterHardLoss = 100 - 97;
    expect(recoverEnergy(afterHardLoss, 10 * HOUR)).toBe(100);
    // full 0 -> 100 takes exactly 10h at 10/h — well within a day
    expect(recoverEnergy(0, 24 * HOUR)).toBe(100);
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

  it("a broke player earns an egg (100 coins) after ~50h of passive income (2/h)", () => {
    // diligent taps (no cap hit): 49h -> 98 < 100, 50h -> 100 >= 100
    expect(49 * CONFIG.economy.hourlyCoins).toBeLessThan(CONFIG.egg.price);
    expect(50 * CONFIG.economy.hourlyCoins).toBeGreaterThanOrEqual(
      CONFIG.egg.price,
    );
    // single-tap accrual caps at 12h (24 coins) — the player must tap along
    // the way; design target: casual play (half collected, sleep/school
    // misses) stretches this to ~5 days — see finetune.test.ts scenario 3
    expect(collectibleCoins(50 * HOUR)).toBe(maxUncollectedCoins());
  });

  it("uncollected coins cap at 12h (24) — passive alone is a slow trickle", () => {
    expect(maxUncollectedCoins()).toBe(24);
    expect(collectibleCoins(24 * HOUR)).toBe(24);
    expect(collectibleCoins(24 * HOUR)).toBeLessThan(CONFIG.egg.price);
  });

  it("hourly income (2/h) covers only a fraction of a training — fights fund training", () => {
    const earlyCost = trainingCost(11); // fresh common hatch
    const lateCost = trainingCost(55); // hard-ready
    expect(earlyCost).toBe(16);
    expect(lateCost).toBe(52);
    // passive-only rate: ~0.125 trainings/h early, ~0.04 late
    expect(CONFIG.economy.hourlyCoins / earlyCost).toBeCloseTo(0.125, 2);
    const lateRate = CONFIG.economy.hourlyCoins / lateCost;
    expect(lateRate).toBeGreaterThan(0.02);
    expect(lateRate).toBeLessThan(0.08);
    // one Easy win (~20 avg) ≈ 10h of passive income
    const easyAvg = (MONSTERS[0].rewardMin + MONSTERS[0].rewardMax) / 2;
    expect(easyAvg / CONFIG.economy.hourlyCoins).toBeCloseTo(10, 0);
  });
});

describe("orientir: monster spawn distribution", () => {
  it("long-run spawn rates match spawnChance (Easy ~33%, Medium ~20%, Hard ~10%)", () => {
    const rng = mulberry32(42);
    const N = 20_000;
    const counts = [0, 0, 0];
    for (let i = 0; i < N; i++) {
      for (let m = 0; m < MONSTERS.length; m++) {
        if (rng() < MONSTERS[m].spawnChance) counts[m]++;
      }
    }
    const [easy, medium, hard] = counts.map((c) => c / N);
    expect(easy).toBeGreaterThan(0.3);
    expect(easy).toBeLessThan(0.36);
    expect(medium).toBeGreaterThan(0.17);
    expect(medium).toBeLessThan(0.23);
    expect(hard).toBeGreaterThan(0.08);
    expect(hard).toBeLessThan(0.12);
    // ordering: easy shows up most often
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
  });

  it("shows ~0.6 monsters on average, empty ~48% of the time (hourly roll)", () => {
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
    // expected mean = 0.33+0.20+0.10 = 0.63; P(empty) = .67*.80*.90 ≈ .48
    expect(total / N).toBeGreaterThan(0.55);
    expect(total / N).toBeLessThan(0.72);
    expect(empty / N).toBeGreaterThan(0.44);
    expect(empty / N).toBeLessThan(0.52);
  });

  it("Easy shows up ~6-8 times a day on hourly rolls", () => {
    // 24 hourly rolls * 0.33 ≈ 7.9/day
    expect(24 * MONSTERS[0].spawnChance).toBeGreaterThan(6);
    expect(24 * MONSTERS[0].spawnChance).toBeLessThan(10);
    expect(CONFIG.monsterSpawn.refreshIntervalMs).toBe(HOUR);
  });
});

describe("orientir: training progression -> Easy / Medium / Hard", () => {
  it("documents average training gain of 3.5 strength", () => {
    expect(AVG_TRAINING_GAIN).toBe(3.5);
    // sanity: every roll in [2,5] (rand01 contract is [0, 1))
    for (let i = 0; i < 10; i++) {
      expect(rollTrainingGain(i / 10)).toBeGreaterThanOrEqual(2);
      expect(rollTrainingGain(i / 10)).toBeLessThanOrEqual(5);
    }
  });

  it("fresh common hatch (~11) usually LOSES to Easy-19 (~25% win); reliable after 3-4 trainings", () => {
    // Easy strength 19: strength 11 wins only with bonus>=8 (3/11 ≈ 27%)
    const freshRate = monsterWinRate(11, 0, 3000, 1);
    expect(freshRate).toBeGreaterThan(0.15);
    expect(freshRate).toBeLessThan(0.4);
    // weakest hatch (8) can never win (needs bonus>=11, max 10)
    expect(monsterWinRate(8, 0, 500, 9)).toBe(0);
    // after ~3 avg trainings (11 -> 21) the dragon beats Easy reliably
    expect(monsterWinRate(21, 0, 500, 3)).toBeGreaterThan(0.9);
    // a win costs almost all energy (70-100 loss -> 0-30 left)
    const rng = mulberry32(21);
    for (let i = 0; i < 200; i++) {
      const r = resolveMonsterFight(21, 100, MONSTERS[0], rng(), rng(), rng());
      if (r.won) {
        expect(r.energyAfter).toBeLessThanOrEqual(30);
        expect(r.energyAfter).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("Medium (effective 40 = 32 + 8 gear) becomes favored at combat ~38", () => {
    // combat 38 wins with bonus>=2 (~82%); combat 30 wins only with bonus 10 (~9%)
    const rate = monsterWinRate(38, 1, 3000, 4);
    expect(rate).toBeGreaterThan(0.7);
    expect(rate).toBeLessThan(0.95);
    expect(monsterWinRate(30, 1, 3000, 5)).toBeLessThan(0.2);
    // undertrained dragons mostly lose to Medium
    expect(monsterWinRate(15, 1, 2000, 5)).toBeLessThan(0.1);
    // reaching combat 38: base 30 (6 trainings) + head (100) + one leg (60)
    // = +8 gear, or 8 pure trainings 11 -> 38
    expect(Math.ceil((38 - 11) / AVG_TRAINING_GAIN)).toBe(8);
  });

  it("Hard (effective 78 = 55 + 23 gear) needs combat ~76", () => {
    // combat 76 wins with bonus>=2 (~82%); combat 68 wins only with bonus 10 (~9%)
    expect(monsterWinRate(76, 2, 3000, 6)).toBeGreaterThan(0.7);
    expect(monsterWinRate(76, 2, 3000, 6)).toBeLessThan(0.95);
    expect(monsterWinRate(68, 2, 2000, 7)).toBeLessThan(0.2);
    // a bare base-55 dragon can never win (needs bonus>=23, max 10)
    expect(monsterWinRate(55, 2, 500, 8)).toBe(0);
    // practical path: base 50 (12 trainings) + full gear (+26) = combat 76
    expect(Math.ceil((50 - 11) / AVG_TRAINING_GAIN)).toBe(12);
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
  it("displays 101 (4 gold stars) with full gear; combat defense 46 = 20 + 26 gear", () => {
    // Display value feeds the star UI: 75 base = 3 gold; +26 gear = 101 = 4 gold.
    expect(CONFIG.beast.strengthConstant).toBe(75);
    expect(starsForStrength(CONFIG.beast.strengthConstant)).toEqual({
      gold: 3,
      silver: 0,
    });
    expect(CONFIG.beast.equipmentBonus).toBe(26);
    // Combat math uses the decoupled defense: a fully equipped dragon
    // (combat = base + 26) hits exactly as a bare dragon hit the old 20.
    expect(beastCombatDefense()).toBe(46);
  });

  it("documents per-turn math: avg bonus 5, avg counter 23", () => {
    expect(AVG_BONUS).toBe(5);
    expect(AVG_BEAST_COUNTER).toBe(23);
    expect(rollDamageBonus(0.5)).toBeGreaterThanOrEqual(0);
    expect(rollDamageBonus(0.5)).toBeLessThanOrEqual(10);
    expect(rollBeastCounterDamage(0.5)).toBeGreaterThanOrEqual(18);
    expect(rollBeastCounterDamage(0.5)).toBeLessThanOrEqual(28);
  });

  it("a fully equipped base-40 dragon (combat 66) deals ~25/turn, lasts ~5 turns (~125 lifetime)", () => {
    // expected damage = 66 + 5 - 46 (combat defense) = 25
    // (display 101 is stars-only; using it here would zero out every hit)
    const expectedPerTurn = 66 + AVG_BONUS - beastCombatDefense();
    expect(expectedPerTurn).toBe(25);
    // lifetime turns = ceil(100 / 23) = 5
    const expectedTurns = Math.ceil(100 / AVG_BEAST_COUNTER);
    expect(expectedTurns).toBe(5);
    expect(expectedPerTurn * expectedTurns).toBeLessThan(CONFIG.beast.hp); // 125 < 260: solo-66 can't win
  });

  it("ONE dragon can NEVER kill the 260-HP beast at combat 66, even with max rolls", () => {
    // best case: bonus 10 every turn (30 dmg), counter 18 (6 turns) -> 180 < 260
    const maxDmgPerTurn = 66 + 10 - beastCombatDefense();
    const maxTurns = Math.ceil(100 / CONFIG.beast.counterDamageMin);
    expect(maxDmgPerTurn * maxTurns).toBeLessThan(CONFIG.beast.hp);
    expect(beastWinRate([66], 300, 11)).toBe(0);
  });

  it("THREE dragons at combat 66 ALWAYS kill the beast, even with worst rolls (design target: 3 x fully-equipped base-40)", () => {
    // worst case: bonus 0 every turn (20 dmg), counter 18 (6 turns) -> 120 each -> 360 > 260
    const minDmgPerTurn = 66 + 0 - beastCombatDefense();
    const minTurnsEach = Math.ceil(100 / CONFIG.beast.counterDamageMin);
    expect(minDmgPerTurn * minTurnsEach * 3).toBeGreaterThan(CONFIG.beast.hp);
    expect(beastWinRate([66, 66, 66], 300, 12)).toBe(1);
  });

  it("TWO dragons at combat 66 are a coin flip (sometimes enough) — the 2-vs-3 threshold", () => {
    const rate = beastWinRate([66, 66], 500, 13);
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.99);
  });

  it("TWO dragons at combat 81 (base 55 + full gear) reliably win; FIVE at combat 76 always win", () => {
    expect(beastWinRate([81, 81], 300, 14)).toBe(1);
    expect(beastWinRate([76, 76, 76, 76, 76], 200, 15)).toBe(1);
  });

  it("a bare base-40 dragon barely scratches the geared beast (avg -1/turn)", () => {
    // 40 + 5 - 46 = -1: gear is effectively required for the boss
    expect(40 + AVG_BONUS - beastCombatDefense()).toBe(-1);
  });

  it("boss reward (300) refunds ~3 eggs — worth the ~10h recovery", () => {
    expect(CONFIG.beast.winRewardMin).toBe(300);
    expect(CONFIG.beast.winRewardMax).toBe(300);
    expect(CONFIG.beast.winRewardMin).toBeGreaterThan(CONFIG.egg.price);
    expect(CONFIG.beast.respawnAfterWinMs).toBe(24 * HOUR);
  });
});

describe("orientir: ideal-playthrough cost model (egg -> beast-ready)", () => {
  it("reaching Medium-ready (combat ~38) costs < 400 coins (6 trainings + head + 1 leg)", () => {
    // ~3.5 avg per training: 11 -> ~32 in 6 sessions; + head (100) + leg (60) = +8 gear
    let strength = 11;
    let total = 0;
    for (let i = 0; i < 6; i++) {
      total += trainingCost(strength);
      strength += AVG_TRAINING_GAIN;
    }
    expect(strength).toBeGreaterThanOrEqual(30);
    expect(total).toBeLessThan(200);
    const gearCost = 100 + 60;
    expect(total + gearCost).toBeLessThan(400);
    expect(strength + 8).toBeGreaterThanOrEqual(38);
    // at 2/h passive this is ~170h of idle income — active Easy wins (~20
    // each, minus a ~10h recovery) are the intended accelerator
    expect((total + gearCost) / CONFIG.economy.hourlyCoins).toBeLessThan(200);
  });

  it("reaching Hard-ready (combat ~76) costs < 950 coins (12 trainings + full gear)", () => {
    // base 50 in ~12 trainings, then full gear (+26) -> combat 76
    let strength = 11;
    let total = 0;
    for (let i = 0; i < 12; i++) {
      total += trainingCost(strength);
      strength += AVG_TRAINING_GAIN;
    }
    expect(strength).toBeGreaterThanOrEqual(50);
    expect(total + 520).toBeLessThan(950); // 381 training + 520 gear = 901
    expect(strength + 26).toBeGreaterThanOrEqual(76);
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
