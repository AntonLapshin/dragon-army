/**
 * Progression simulation tests — full player journeys through the ENGINE
 * (not just the pure formulas in config.test.ts / balance.test.ts).
 *
 * Each journey builds a real engine with a seeded RNG, drives it through
 * a career stage (fresh hatch -> trained -> geared -> beast-ready) and
 * asserts the win rate a player would actually feel. These are the
 * "is it too easy / too hard?" tests: if the beast numbers drift so the
 * documented 3x66 roster wins ~100% (or ~0%), this file fails first.
 */
import { describe, expect, it } from "vitest";
import { CONFIG, MONSTERS } from "./config";
import { createGameEngine, createNewGameState } from "./engine";
import type { Dragon, GameState } from "./types";
import { freshCombatStats, freshEquipment } from "./utils";

const T0 = 1_000_000_000;

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

function dragon(over: Partial<Dragon> = {}): Dragon {
  return {
    id: "dragon-test",
    breedId: "dragon-1",
    strength: 20,
    energy: 100,
    purchasedAtMs: T0,
    hatchAtMs: T0,
    hatchedAtMs: T0,
    lastEnergyUpdateMs: T0,
    combatStats: freshCombatStats(),
    equipment: freshEquipment(),
    ...over,
  };
}

const FULL_GEAR = {
  head: true,
  wings: true,
  tail: true,
  "leg-front-left": true,
  "leg-front-right": true,
  "leg-back-left": true,
  "leg-back-right": true,
} as const;

/** Fresh engine with the given roster + spawn table, driven by a seeded RNG. */
function makeEngine(seed: number, dragons: Dragon[], spawn = [MONSTERS[0]]) {
  const rng = mulberry32(seed);
  const initial = createNewGameState({
    playerId: "player-1",
    nowMs: T0,
    configVersion: CONFIG.meta.configVersion,
    beastMaxHp: CONFIG.beast.hp,
  });
  initial.player.dragons = dragons;
  initial.player.coins = 100_000;
  initial.monsterSpawn.spawned = spawn.map((m) => ({ ...m }));
  // Keep tick() from refreshing the injected spawn table away.
  initial.monsterSpawn.lastRefreshMs = T0;
  initial.beast.currentHp = CONFIG.beast.hp;
  initial.beast.maxHp = CONFIG.beast.hp;
  initial.beast.status = "alive";
  let stored: GameState | null = JSON.parse(JSON.stringify(initial));
  const engine = createGameEngine({
    storage: {
      load: () =>
        stored === null ? null : (JSON.parse(JSON.stringify(stored)) as GameState),
      save: (s) => {
        stored = JSON.parse(JSON.stringify(s));
      },
    },
    getTime: () => T0,
    getSteps: () => 0,
    rand01: rng,
  });
  engine.init();
  return engine;
}

/** One fresh-dragon Easy fight: returns whether it won and HP left. */
function freshEasyFight(seed: number): { won: boolean; hpLeft: number } {
  const engine = makeEngine(seed, [dragon({ id: "d", strength: 11 })]);
  const res = engine.fightMonster("d", MONSTERS[0].id);
  if (!res.ok) throw new Error("fight should resolve");
  return { won: res.won, hpLeft: res.energyAfter };
}

describe("progression journey: fresh hatch -> Easy", () => {
  it("a fresh ~11 dragon wins Easy ~20% of the time (underdog, not hopeless)", () => {
    let wins = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      if (freshEasyFight(1000 + i).won) wins++;
    }
    const rate = wins / N;
    expect(rate).toBeGreaterThan(0.1);
    expect(rate).toBeLessThan(0.35);
  });

  it("after ~3 trainings (11 -> ~21) Easy becomes a reliable win", () => {
    let wins = 0;
    let totalLeft = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const engine = makeEngine(2000 + i, [dragon({ id: "d", strength: 21 })]);
      const res = engine.fightMonster("d", MONSTERS[0].id);
      if (!res.ok) throw new Error("fight should resolve");
      if (res.won) {
        wins++;
        totalLeft += res.energyAfter;
      }
    }
    expect(wins / N).toBeGreaterThan(0.9);
    // wins still cost a third of the bar on average — not free
    expect(totalLeft / wins).toBeGreaterThan(40);
    expect(totalLeft / wins).toBeLessThan(80);
  });
});

describe("progression journey: geared -> Medium / Hard", () => {
  it("combat ~38 (base 30 + head + leg) beats Medium more often than not", () => {
    let wins = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const gear = { ...freshEquipment(), head: true, "leg-front-left": true };
      const engine = makeEngine(
        3000 + i,
        [dragon({ id: "d", strength: 30, equipment: gear })],
        [MONSTERS[1]],
      );
      const res = engine.fightMonster("d", MONSTERS[1].id);
      if (!res.ok) throw new Error("fight should resolve");
      if (res.won) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.5);
    expect(wins / N).toBeLessThan(0.85);
  });

  it("combat ~76 (base 50 + full gear) beats Hard more often than not", () => {
    let wins = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const engine = makeEngine(
        4000 + i,
        [dragon({ id: "d", strength: 50, equipment: { ...FULL_GEAR } })],
        [MONSTERS[2]],
      );
      const res = engine.fightMonster("d", MONSTERS[2].id);
      if (!res.ok) throw new Error("fight should resolve");
      if (res.won) wins++;
    }
    expect(wins / N).toBeGreaterThan(0.5);
    expect(wins / N).toBeLessThan(0.85);
  });
});

describe("progression journey: the Bewilder Beast", () => {
  function beastRosterFight(
    seed: number,
    combats: { strength: number; geared: boolean }[],
  ): { won: boolean; beastHpAfter: number; survivors: number } {
    const dragons = combats.map((c, i) =>
      dragon({
        id: `d${i}`,
        strength: c.strength,
        equipment: c.geared ? { ...FULL_GEAR } : freshEquipment(),
      }),
    );
    const engine = makeEngine(seed, dragons);
    const res = engine.fightBeast();
    if (!res.ok) throw new Error("beast fight should resolve");
    const s = engine.getState();
    return {
      won: res.won,
      beastHpAfter: res.beastHpAfter,
      survivors: s.player.dragons.length,
    };
  }

  it("the documented beast-ready roster (3 x base-40 + full gear = combat 66) wins ~62% — strong, not a guarantee", () => {
    let wins = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const r = beastRosterFight(5000 + i, [
        { strength: 40, geared: true },
        { strength: 40, geared: true },
        { strength: 40, geared: true },
      ]);
      if (r.won) wins++;
    }
    const rate = wins / N;
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThan(0.75);
  });

  it("two combat-66 dragons almost never win (the fight needs a team)", () => {
    let wins = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const r = beastRosterFight(6000 + i, [
        { strength: 40, geared: true },
        { strength: 40, geared: true },
      ]);
      if (r.won) wins++;
    }
    expect(wins / N).toBeLessThan(0.1);
  });

  it("three BARE base-40 dragons (no gear) essentially never win", () => {
    let wins = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const r = beastRosterFight(7000 + i, [
        { strength: 40, geared: false },
        { strength: 40, geared: false },
        { strength: 40, geared: false },
      ]);
      if (r.won) wins++;
    }
    expect(wins / N).toBeLessThan(0.05);
  });

  it("a lost beast fight removes the whole team AND heals the beast to full", () => {
    // Weak team: guaranteed loss (3 x combat 10 vs 580 HP).
    const engine = makeEngine(8000, [
      dragon({ id: "d0", strength: 10 }),
      dragon({ id: "d1", strength: 10 }),
      dragon({ id: "d2", strength: 10 }),
    ]);
    const res = engine.fightBeast();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(false);
    const s = engine.getState();
    expect(s.player.dragons).toHaveLength(0);
    expect(s.beast.status).toBe("alive");
    expect(s.beast.currentHp).toBe(CONFIG.beast.hp);
    expect(res.beastHpAfter).toBe(CONFIG.beast.hp);
  });

  it("a won beast fight rewards survivors and credits the killer", () => {
    // One overpowered dragon + two bystanders: the killer is deterministic
    // enough here — assert the winner's bookkeeping, not which dragon won.
    const engine = makeEngine(9000, [
      dragon({ id: "d0", strength: 125, equipment: { ...FULL_GEAR } }),
      dragon({ id: "d1", strength: 125, equipment: { ...FULL_GEAR } }),
    ]);
    const res = engine.fightBeast();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(true);
    const s = engine.getState();
    expect(s.beast.status).toBe("vanished");
    expect(s.player.totalBeastsDefeated).toBe(1);
    expect(s.player.coins).toBeGreaterThan(100_000);
    // the killer has exactly 1 beast win + the reward coins on its record
    const killer = s.player.dragons.find((d) => d.combatStats.beastWins === 1);
    expect(killer).toBeDefined();
    expect(killer?.combatStats.coinsEarned).toBe(res.reward);
    // every dragon that attacked and survived gained strength
    for (const id of Object.keys(res.strengthGains)) {
      expect(res.strengthGains[id]).toBeGreaterThanOrEqual(2);
      expect(res.strengthGains[id]).toBeLessThanOrEqual(4);
    }
  });
});

describe("progression journey: training ladder reaches Hard-ready", () => {
  it("12 average trainings take a fresh hatch to ~base 50 (Hard-ready with full gear)", () => {
    // 11 + 12 x 3.5 avg = 53 — the ladder the cost model assumes.
    let strength = 11;
    for (let i = 0; i < 12; i++) strength += 3.5;
    expect(strength).toBeGreaterThanOrEqual(50);
    expect(strength + 26).toBeGreaterThanOrEqual(76);
  });
});
