/**
 * Unit tests for villages (engine/config.ts generation + fleet fight,
 * engine/engine.ts attack + migration).
 *
 * Time, storage and randomness are injected; the page never leaks exact
 * village data (see the "public view" tests — the village page shows only
 * the bucketed count + tier fortune hint).
 */
import { describe, expect, it } from "vitest";
import {
  CONFIG,
  fleetScalingForDragons,
  generateVillages,
  resolveFleetFight,
  villageApproxCount,
  villageFortuneHint,
  villageViewFor,
} from "./config";
import {
  coerceLoadedSave,
  createGameEngine,
  createNewGameState,
  migrateLegacySave,
} from "./engine";
import type { Dragon, GameState, Village } from "./types";
import { freshCombatStats, freshEquipment, seededRand01 } from "./utils";

const T0 = 1_000_000_000;

function hatchedDragon(over: Partial<Dragon> = {}): Dragon {
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

function village(
  over: Partial<Village> = {},
): Village {
  return {
    id: "village-0",
    name: "Ember Hollow",
    tier: "easy",
    defenders: [
      { id: "village-0-def-0", breedId: "dragon-1", combat: 30, maxHp: 60 },
    ],
    fortune: 100,
    captured: false,
    ...over,
  };
}

function setup(
  initial: GameState | null,
  randValue = 0.5,
) {
  let now = T0;
  let stored: GameState | null =
    initial === null ? null : JSON.parse(JSON.stringify(initial));
  const engine = createGameEngine({
    storage: {
      load: () =>
        stored === null ? null : (JSON.parse(JSON.stringify(stored)) as GameState),
      save: (s: GameState) => {
        stored = JSON.parse(JSON.stringify(s)) as GameState;
      },
    },
    getTime: () => now,
    getSteps: () => 0,
    rand01: () => randValue,
  });
  return {
    engine,
    getStored: () =>
      stored === null ? null : (JSON.parse(JSON.stringify(stored)) as GameState),
  };
}

function stateWith(
  dragons: Dragon[] = [],
  villages: Village[] = [],
): GameState {
  const s = createNewGameState({
    playerId: "player-1",
    nowMs: T0,
    configVersion: CONFIG.meta.configVersion,
    beastMaxHp: CONFIG.beast.hp,
  });
  s.player.dragons = dragons;
  s.villages = villages;
  return s;
}

// ---------------------------------------------------------------------------

describe("generateVillages (fresh game)", () => {
  it("generates 6 villages, 2 per tier, unique names, uncaptured", () => {
    const villages = generateVillages(seededRand01(7), null);
    expect(villages).toHaveLength(6);
    const tiers = villages.map((v) => v.tier).sort();
    expect(tiers).toEqual(["easy", "easy", "hard", "hard", "medium", "medium"]);
    expect(new Set(villages.map((v) => v.name)).size).toBe(6);
    expect(villages.every((v) => v.captured === false)).toBe(true);
    expect(villages.map((v) => v.id)).toEqual([
      "village-0",
      "village-1",
      "village-2",
      "village-3",
      "village-4",
      "village-5",
    ]);
  });

  it("uses the absolute fresh-game defender + fortune ranges per tier", () => {
    const villages = generateVillages(seededRand01(11), null);
    for (const v of villages) {
      const cfg = CONFIG.villages.tiers[v.tier];
      expect(v.defenders.length).toBeGreaterThanOrEqual(cfg.defenderCountMin);
      expect(v.defenders.length).toBeLessThanOrEqual(cfg.defenderCountMax);
      for (const d of v.defenders) {
        expect(d.combat).toBeGreaterThanOrEqual(cfg.combatMin);
        expect(d.combat).toBeLessThanOrEqual(cfg.combatMax);
        expect(d.maxHp).toBe(cfg.hp);
      }
      expect(v.fortune).toBeGreaterThanOrEqual(cfg.fortuneMin);
      expect(v.fortune).toBeLessThanOrEqual(cfg.fortuneMax);
    }
  });
});

describe("generateVillages (migration scaling)", () => {
  it("scales defender combat to the player's avg combat (strong fleet = strong villages)", () => {
    const scaling = { avgCombat: 100, totalCombat: 300 };
    const villages = generateVillages(seededRand01(13), scaling);
    for (const v of villages) {
      const cfg = CONFIG.villages.tiers[v.tier];
      for (const d of v.defenders) {
        expect(d.combat).toBeGreaterThanOrEqual(Math.floor(100 * cfg.combatScaleMin));
        expect(d.combat).toBeLessThanOrEqual(Math.ceil(100 * cfg.combatScaleMax));
      }
    }
    // hard defenders of a combat-100 fleet are 95-115 — far above the
    // fresh hard range (60-78), so the migration is not trivial.
    const hard = villages.filter((v) => v.tier === "hard");
    expect(hard.length).toBe(2);
    for (const v of hard) {
      for (const d of v.defenders) expect(d.combat).toBeGreaterThan(78);
    }
  });

  it("scales fortune with avg combat (clamped x0.8-x3) and keeps weak fleets near fresh", () => {
    const strong = generateVillages(seededRand01(17), { avgCombat: 120, totalCombat: 360 });
    for (const v of strong) {
      const cfg = CONFIG.villages.tiers[v.tier];
      expect(v.fortune).toBeGreaterThanOrEqual(cfg.fortuneMin * 3);
      expect(v.fortune).toBeLessThanOrEqual(cfg.fortuneMax * 3);
    }
    const weak = generateVillages(seededRand01(17), { avgCombat: 20, totalCombat: 20 });
    for (const v of weak) {
      const cfg = CONFIG.villages.tiers[v.tier];
      expect(v.fortune).toBeGreaterThanOrEqual(Math.floor(cfg.fortuneMin * 0.8));
      expect(v.fortune).toBeLessThanOrEqual(Math.ceil(cfg.fortuneMax * 0.8));
    }
  });

  it("fleetScalingForDragons ignores eggs and returns null with no hatched dragons", () => {
    expect(fleetScalingForDragons([])).toBeNull();
    const egg: Dragon = { ...hatchedDragon(), hatchedAtMs: null, strength: 0 };
    expect(fleetScalingForDragons([egg])).toBeNull();
    const s = fleetScalingForDragons([
      hatchedDragon({ strength: 40 }),
      hatchedDragon({ strength: 80 }),
    ]);
    expect(s).toEqual({ avgCombat: 60, totalCombat: 120 });
  });
});

describe("village public view (no exact details leak)", () => {
  it("buckets defender counts into words, never digits", () => {
    expect(villageApproxCount(0)).toBe("no dragons");
    expect(villageApproxCount(1)).toBe("a lone dragon");
    expect(villageApproxCount(2)).toBe("a few dragons");
    expect(villageApproxCount(3)).toBe("several dragons");
    expect(villageApproxCount(4)).toBe("several dragons");
    expect(villageApproxCount(5)).toBe("many dragons");
    expect(villageApproxCount(12)).toBe("many dragons");
    for (const n of [0, 1, 2, 3, 4, 5, 12]) {
      expect(villageApproxCount(n)).not.toMatch(/\d/);
    }
  });

  it("buckets fortune hints by tier, never amounts", () => {
    expect(villageFortuneHint("easy")).toBe("a modest fortune");
    expect(villageFortuneHint("medium")).toBe("a rich fortune");
    expect(villageFortuneHint("hard")).toBe("a great fortune");
    for (const t of ["easy", "medium", "hard"] as const) {
      expect(villageFortuneHint(t)).not.toMatch(/\d/);
    }
  });

  it("villageViewFor exposes only id/name/tier/label/count/hint/captured", () => {
    const v = village({
      tier: "hard",
      defenders: [
        { id: "d0", breedId: "dragon-1", combat: 70, maxHp: 105 },
        { id: "d1", breedId: "dragon-2", combat: 70, maxHp: 105 },
      ],
      fortune: 432,
    });
    const view = villageViewFor(v);
    expect(Object.keys(view).sort()).toEqual([
      "approxCount",
      "captured",
      "fortuneHint",
      "id",
      "name",
      "tier",
      "tierLabel",
    ]);
    expect(view.approxCount).toBe("a few dragons");
    expect(view.tierLabel).toBe("Stronghold");
    expect(view.fortuneHint).toBe("a great fortune");
    expect(JSON.stringify(view)).not.toContain("432");
    expect(JSON.stringify(view)).not.toContain("70");
  });

  it("tier labels are Outpost / Hamlet / Stronghold", () => {
    expect(villageViewFor(village({ tier: "easy" })).tierLabel).toBe("Outpost");
    expect(villageViewFor(village({ tier: "medium" })).tierLabel).toBe("Hamlet");
    expect(villageViewFor(village({ tier: "hard" })).tierLabel).toBe("Stronghold");
  });
});

describe("resolveFleetFight", () => {
  it("players focus-fire the first alive defender; a strong fleet wins fast", () => {
    const res = resolveFleetFight(
      [80, 80, 80],
      [100, 100, 100],
      [30, 30],
      [60, 60],
      () => 0.5,
    );
    expect(res.won).toBe(true);
    expect(res.turns).toHaveLength(2); // one-shot each defender, no retaliation
    expect(res.turns[0].attackerSide).toBe("player");
    expect(res.turns[0].targetIndex).toBe(0);
    expect(res.turns[1].targetIndex).toBe(1);
    expect(res.playerHpsAfter).toEqual([100, 100, 100]);
  });

  it("defenders fire back at player dragons; a lone weak dragon loses and dies", () => {
    const res = resolveFleetFight([20], [100], [100, 100, 100], [105, 105, 105], () => 0.5);
    expect(res.won).toBe(false);
    expect(res.playerHpsAfter).toEqual([0]);
    expect(res.turns.some((t) => t.attackerSide === "village")).toBe(true);
  });

  it("pity rule: always-miss rolls still terminate", () => {
    const res = resolveFleetFight([50, 50], [100, 100], [50, 50], [80, 80], () => 0.999);
    expect(res.turns.length).toBeGreaterThan(0);
    expect(res.turns.length).toBeLessThan(500);
  });

  it("Monte Carlo: a modest fleet beats easy, a strong fleet beats hard", () => {
    function winRate(
      playerCombats: number[],
      enemyCombats: number[],
      enemyHp: number,
      trials: number,
      seed: number,
    ): number {
      const rng = seededRand01(seed);
      let wins = 0;
      for (let i = 0; i < trials; i++) {
        if (
          resolveFleetFight(
            playerCombats,
            playerCombats.map(() => 100),
            enemyCombats,
            enemyCombats.map(() => enemyHp),
            rng,
          ).won
        ) {
          wins++;
        }
      }
      return wins / trials;
    }
    // Easy: 2 defenders @ 33, 60 HP vs 2 x 35 — modest fleet favored.
    expect(winRate([35, 35], [33, 33], 60, 500, 21)).toBeGreaterThan(0.9);
    // Medium: 3 defenders @ 55, 80 HP vs 3 x 50 — favored, not guaranteed.
    const medium = winRate([50, 50, 50], [55, 55, 55], 80, 500, 22);
    expect(medium).toBeGreaterThan(0.5);
    expect(medium).toBeLessThan(0.95);
    // Hard: 4 defenders @ 70, 105 HP vs 4 x 66 — strong fleet favored.
    const hard = winRate([66, 66, 66, 66], [70, 70, 70, 70], 105, 500, 23);
    expect(hard).toBeGreaterThan(0.5);
    expect(hard).toBeLessThan(0.9);
    // Hard vs a weak fleet: essentially never.
    expect(winRate([35, 35], [70, 70, 70, 70], 105, 300, 24)).toBeLessThan(0.05);
  });
});

describe("village migration in saves", () => {
  it("createNewGameState generates 6 villages", () => {
    const s = createNewGameState({
      playerId: "p1",
      nowMs: T0,
      configVersion: 1,
      beastMaxHp: CONFIG.beast.hp,
    });
    expect(s.villages).toHaveLength(6);
  });

  it("coerceLoadedSave backfills villages scaled to the loaded fleet", () => {
    const raw = stateWith([
      hatchedDragon({ id: "d1", strength: 100 }),
      hatchedDragon({ id: "d2", strength: 100 }),
    ]);
    delete (raw as { villages?: unknown }).villages;
    const s = coerceLoadedSave(raw, T0);
    expect(s?.villages).toHaveLength(6);
    const hard = s?.villages.filter((v) => v.tier === "hard") ?? [];
    expect(hard).toHaveLength(2);
    for (const v of hard) {
      for (const d of v.defenders) {
        expect(d.combat).toBeGreaterThanOrEqual(95);
        expect(d.combat).toBeLessThanOrEqual(115);
      }
    }
  });

  it("coerceLoadedSave keeps existing villages (never regenerates them)", () => {
    const kept = village({ id: "village-keep", fortune: 999 });
    const raw = stateWith([hatchedDragon()], [kept]);
    const s = coerceLoadedSave(raw, T0);
    expect(s?.villages).toHaveLength(1);
    expect(s?.villages[0].id).toBe("village-keep");
    expect(s?.villages[0].fortune).toBe(999);
  });

  it("migrateLegacySave generates villages scaled to the legacy fleet", () => {
    const s = migrateLegacySave(
      {
        coins: 5,
        dragons: [{ id: "d", breedIdx: 0, strength: 90, hatchedAt: T0 }],
      },
      T0,
    );
    expect(s.villages).toHaveLength(6);
    const hard = s.villages.filter((v) => v.tier === "hard");
    for (const v of hard) {
      for (const d of v.defenders) {
        expect(d.combat).toBeGreaterThanOrEqual(85);
        expect(d.combat).toBeLessThanOrEqual(104);
      }
    }
  });

  it("engine.init backfills villages for storage that bypasses coerceLoadedSave", () => {
    const saved = stateWith([hatchedDragon({ strength: 90 })]);
    delete (saved as { villages?: unknown }).villages;
    const t = setup(saved);
    const s = t.engine.init();
    expect(s.villages).toHaveLength(6);
  });
});

describe("attackVillage", () => {
  it("rejects unknown villages, captured villages, and empty lineups", () => {
    const t = setup(
      stateWith([hatchedDragon({ id: "d1", strength: 80 })], [
        village({ id: "v1", captured: true }),
      ]),
    );
    t.engine.init();
    expect(t.engine.attackVillage("nope")).toEqual({
      ok: false,
      reason: "unknown-village",
    });
    expect(t.engine.attackVillage("v1")).toEqual({
      ok: false,
      reason: "already-captured",
    });
    const eggs = setup(stateWith([], [village({ id: "v1" })]));
    eggs.engine.init();
    expect(eggs.engine.attackVillage("v1")).toEqual({
      ok: false,
      reason: "no-participants",
    });
  });

  it("a win captures the village, pays the exact fortune once, and grows survivors", () => {
    const t = setup(
      stateWith(
        [
          hatchedDragon({ id: "d1", strength: 80 }),
          hatchedDragon({ id: "d2", strength: 80 }),
          hatchedDragon({ id: "d3", strength: 80 }),
        ],
        [
          village({
            id: "v1",
            defenders: [
              { id: "v1-def-0", breedId: "dragon-1", combat: 30, maxHp: 60 },
              { id: "v1-def-1", breedId: "dragon-1", combat: 30, maxHp: 60 },
            ],
            fortune: 100,
          }),
        ],
      ),
    );
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.attackVillage("v1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(true);
    expect(res.fortune).toBe(100);
    const s = t.engine.getState();
    expect(s.player.coins).toBe(before + 100);
    expect(s.villages[0].captured).toBe(true);
    expect(s.player.dragons).toHaveLength(3);
    // dragons that attacked gained +1-2 strength; d3 never got a turn
    // (the fight ended after 2 one-shot kills), so it gained nothing
    for (const id of ["d1", "d2"]) {
      expect(res.strengthGains[id]).toBeGreaterThanOrEqual(1);
      expect(res.strengthGains[id]).toBeLessThanOrEqual(2);
    }
    expect(res.strengthGains["d3"]).toBeUndefined();
    // a second attack is refused — the fortune cannot be collected twice
    expect(t.engine.attackVillage("v1")).toEqual({
      ok: false,
      reason: "already-captured",
    });
    expect(t.engine.getState().player.coins).toBe(before + 100);
  });

  it("a loss removes dragons dropped to 0, pays nothing, and leaves the village uncaptured", () => {
    const t = setup(
      stateWith(
        [hatchedDragon({ id: "weak", strength: 20 })],
        [
          village({
            id: "v1",
            tier: "hard",
            defenders: [
              { id: "v1-def-0", breedId: "dragon-1", combat: 100, maxHp: 105 },
              { id: "v1-def-1", breedId: "dragon-1", combat: 100, maxHp: 105 },
              { id: "v1-def-2", breedId: "dragon-1", combat: 100, maxHp: 105 },
            ],
            fortune: 400,
          }),
        ],
      ),
    );
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.attackVillage("v1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(false);
    expect(res.fortune).toBe(0);
    expect(res.removedDragonIds).toEqual(["weak"]);
    const s = t.engine.getState();
    expect(s.player.dragons).toHaveLength(0);
    expect(s.player.coins).toBe(before);
    expect(s.villages[0].captured).toBe(false);
    // defenders stand again at full HP — a later attack faces the same fleet
    expect(t.engine.getVillageDefenders("v1")).toEqual([
      { id: "v1-def-0", breedId: "dragon-1", maxHp: 105 },
      { id: "v1-def-1", breedId: "dragon-1", maxHp: 105 },
      { id: "v1-def-2", breedId: "dragon-1", maxHp: 105 },
    ]);
  });

  it("getVillages returns only the public view (no exact data)", () => {
    const t = setup(
      stateWith([hatchedDragon()], [
        village({ id: "v1", fortune: 432, defenders: [
          { id: "d0", breedId: "dragon-1", combat: 70, maxHp: 105 },
        ] }),
      ]),
    );
    t.engine.init();
    const views = t.engine.getVillages();
    expect(views).toHaveLength(1);
    expect(JSON.stringify(views)).not.toContain("432");
    expect(JSON.stringify(views)).not.toContain("defenders");
  });
});
