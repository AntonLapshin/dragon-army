/**
 * Unit tests for engine/engine.ts — state flow only.
 *
 * Time, storage and randomness are injected; balance formulas themselves are
 * covered in config.test.ts, so this file asserts orchestration: tick
 * derivations, gates, deductions, persistence and save migration.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { CONFIG, DRAGONS, MONSTERS } from "./config";
import {
  coerceLoadedSave,
  createGameEngine,
  createNewGameState,
  migrateLegacySave,
} from "./engine";
import type { Dragon, GameState } from "./types";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const T0 = 1_000_000_000;

// ---------------------------------------------------------------------------
// Harness: controllable clock + in-memory storage + fixed randomness
// ---------------------------------------------------------------------------

function hatchedDragon(over: Partial<Dragon> = {}): Dragon {
  return {
    id: "dragon-test",
    breedId: DRAGONS[0].id,
    strength: 20,
    energy: 100,
    purchasedAtMs: T0,
    hatchAtMs: T0,
    hatchedAtMs: T0,
    lastEnergyUpdateMs: T0,
    ...over,
  };
}

function eggDragon(over: Partial<Dragon> = {}): Dragon {
  return {
    id: "egg-test",
    breedId: DRAGONS[0].id,
    strength: 0,
    energy: 100,
    purchasedAtMs: T0,
    hatchAtMs: T0 + 2 * DAY,
    hatchedAtMs: null,
    lastEnergyUpdateMs: T0,
    ...over,
  };
}

interface Setup {
  engine: ReturnType<typeof createGameEngine>;
  setNow: (v: number) => void;
  getNow: () => number;
  getStored: () => GameState | null;
}

function setup(initial?: GameState | null, randValue = 0.5): Setup {
  let now = T0;
  let stored: GameState | null =
    initial === undefined
      ? null
      : initial === null
        ? null
        : JSON.parse(JSON.stringify(initial));
  const engine = createGameEngine({
    storage: {
      load: () =>
        stored === null ? null : (JSON.parse(JSON.stringify(stored)) as GameState),
      save: (s: GameState) => {
        stored = JSON.parse(JSON.stringify(s)) as GameState;
      },
    },
    getTime: () => now,
    rand01: () => randValue,
  });
  return {
    engine,
    setNow: (v: number) => {
      now = v;
    },
    getNow: () => now,
    getStored: () =>
      stored === null ? null : (JSON.parse(JSON.stringify(stored)) as GameState),
  };
}

function stateWith(
  dragons: Dragon[] = [],
  over: Partial<GameState> = {},
): GameState {
  const s = createNewGameState({
    playerId: "player-1",
    nowMs: T0,
    configVersion: CONFIG.meta.configVersion,
    beastMaxHp: CONFIG.beast.hp,
  });
  s.player.dragons = dragons;
  return { ...s, ...over };
}

let ctx: Setup;

beforeEach(() => {
  ctx = setup();
});

// ---------------------------------------------------------------------------
// Factory + lifecycle
// ---------------------------------------------------------------------------

describe("createNewGameState", () => {
  it("boots a fresh profile with starting coins and an alive beast", () => {
    const s = createNewGameState({
      playerId: "p1",
      nowMs: T0,
      configVersion: 1,
      beastMaxHp: 260,
    });
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins);
    expect(s.player.dragons).toEqual([]);
    expect(s.beast).toMatchObject({ currentHp: 260, maxHp: 260, status: "alive" });
    expect(s.ui.currentScreen).toEqual({ kind: "main" });
    expect(s.nowMs).toBe(T0);
  });
});

describe("lifecycle (init / resume / save / reset / tick)", () => {
  it("throws before init", () => {
    expect(() => ctx.engine.getState()).toThrow(/initialised/);
  });
  it("inits a fresh game when storage is empty and persists it", () => {
    const s = ctx.engine.init();
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins);
    expect(ctx.getStored()?.player.coins).toBe(CONFIG.economy.startingCoins);
  });
  it("restores a saved game", () => {
    const saved = stateWith([hatchedDragon({ id: "keep-me" })]);
    saved.player.coins = 777;
    const t = setup(saved);
    expect(t.engine.init().player.coins).toBe(777);
    expect(t.engine.getState().player.dragons.map((d) => d.id)).toEqual(["keep-me"]);
  });
  it("starts fresh on garbage saves", () => {
    const t = setup({ nonsense: true } as unknown as GameState);
    expect(t.engine.init().player.coins).toBe(CONFIG.economy.startingCoins);
  });
  it("backfills missing ui / monsterSpawn slices on old saves", () => {
    const saved = stateWith([hatchedDragon()]);
    const partial = JSON.parse(JSON.stringify(saved)) as Record<string, unknown>;
    delete partial.ui;
    delete partial.monsterSpawn;
    const t = setup(partial as unknown as GameState);
    const s = t.engine.init();
    expect(s.ui.currentScreen).toEqual({ kind: "main" });
    expect(s.monsterSpawn.spawned).toEqual([]);
  });
  it("getState returns a clone (callers cannot mutate engine state)", () => {
    ctx.engine.init();
    const s = ctx.engine.getState();
    s.player.coins = 99999;
    expect(ctx.engine.getState().player.coins).toBe(CONFIG.economy.startingCoins);
  });
  it("reset clears progress back to a fresh game", () => {
    ctx.engine.init();
    ctx.engine.confirmEggPurchase(0, 0);
    expect(ctx.engine.getState().player.dragons).toHaveLength(1);
    const s = ctx.engine.reset();
    expect(s.player.dragons).toEqual([]);
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins);
  });
  it("resume advances the clock and saves", () => {
    ctx.engine.init();
    ctx.setNow(T0 + 5 * HOUR);
    const s = ctx.engine.resume();
    expect(s.nowMs).toBe(T0 + 5 * HOUR);
    expect(ctx.getStored()?.nowMs).toBe(T0 + 5 * HOUR);
  });
});

// ---------------------------------------------------------------------------
// Tick derivations
// ---------------------------------------------------------------------------

describe("tick", () => {
  it("hatches due eggs once (idempotent) with rolled base strength", () => {
    const t = setup(stateWith([eggDragon({ hatchAtMs: T0 + HOUR })]), 0.5);
    t.engine.init();
    expect(t.engine.getState().player.dragons[0].hatchedAtMs).toBeNull();
    t.setNow(T0 + 2 * HOUR);
    t.engine.tick();
    const d = t.engine.getState().player.dragons[0];
    expect(d.hatchedAtMs).toBe(T0 + 2 * HOUR);
    expect(d.strength).toBeGreaterThanOrEqual(DRAGONS[0].baseStrengthMin);
    expect(d.strength).toBeLessThanOrEqual(DRAGONS[0].baseStrengthMax);
    expect(t.engine.getState().player.totalEggsHatched).toBe(1);
    t.engine.tick();
    expect(t.engine.getState().player.totalEggsHatched).toBe(1);
  });
  it("removes dragons past their breed lifespan", () => {
    const nightFury = DRAGONS[DRAGONS.length - 1]; // 30d lifespan
    const t = setup(
      stateWith([
        hatchedDragon({ id: "old", breedId: nightFury.id, hatchedAtMs: T0 - 29 * DAY }),
        hatchedDragon({ id: "young", breedId: DRAGONS[0].id, hatchedAtMs: T0 }),
      ]),
    );
    t.engine.init();
    expect(t.engine.getState().player.dragons.map((d) => d.id).sort()).toEqual(["old", "young"]);
    t.setNow(T0 + 2 * DAY);
    t.engine.tick();
    expect(t.engine.getState().player.dragons.map((d) => d.id)).toEqual(["young"]);
  });
  it("respawns a vanished beast after its timer", () => {
    const saved = stateWith();
    saved.beast = {
      currentHp: 0,
      maxHp: CONFIG.beast.hp,
      status: "vanished",
      respawnAtMs: T0 + HOUR,
      lastDefeatedAtMs: T0,
    };
    const t = setup(saved);
    t.engine.init();
    expect(t.engine.getState().beast.status).toBe("vanished");
    t.setNow(T0 + 2 * HOUR);
    t.engine.tick();
    const beast = t.engine.getState().beast;
    expect(beast.status).toBe("alive");
    expect(beast.currentHp).toBe(beast.maxHp);
    expect(beast.respawnAtMs).toBeNull();
  });
  it("refreshes stale monster spawns, keeps fresh ones", () => {
    const t = setup(stateWith(), 0); // rand 0 => every difficulty spawns
    t.engine.init();
    t.engine.tick();
    expect(t.engine.getState().monsterSpawn.spawned).toHaveLength(
      Math.min(MONSTERS.length, CONFIG.monsterSpawn.maxShown),
    );
    // fresh table survives a tick within the interval
    const fresh = t.engine.getState();
    const t2 = setup(fresh, 0.999);
    t2.engine.init();
    expect(t2.engine.getState().monsterSpawn.spawned).toHaveLength(
      fresh.monsterSpawn.spawned.length,
    );
  });
});

// ---------------------------------------------------------------------------
// Egg flow (spin-then-pay)
// ---------------------------------------------------------------------------

describe("egg flow", () => {
  it("spin preview draws a breed when affordable with room", () => {
    ctx.engine.init();
    const preview = ctx.engine.spinEggPreview();
    expect(preview.ok).toBe(true);
    if (preview.ok) {
      expect(preview.breedIndex).toBe(Math.floor(0.5 * CONFIG.egg.breedCount));
      expect(preview.breed).toBe(DRAGONS[preview.breedIndex]);
    }
  });
  it("spin preview is blocked when broke or the roster is full", () => {
    const poor = stateWith();
    poor.player.coins = 0;
    const t = setup(poor);
    t.engine.init();
    expect(t.engine.spinEggPreview()).toEqual({ ok: false, reason: "not-enough-coins" });
    expect(t.engine.canBuyEgg()).toBe(false);

    const full = stateWith(
      Array.from({ length: CONFIG.limits.maxRoster }, (_, i) => eggDragon({ id: `e${i}` })),
    );
    const t2 = setup(full);
    t2.engine.init();
    expect(t2.engine.spinEggPreview()).toEqual({ ok: false, reason: "roster-full" });
    expect(t2.engine.canBuyEgg()).toBe(false);
  });
  it("confirm deducts the price, adds the egg and focuses it", () => {
    ctx.engine.init();
    const res = ctx.engine.confirmEggPurchase(3, 0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.dragon.breedId).toBe(DRAGONS[3].id);
    expect(res.dragon.hatchAtMs).toBe(T0 + CONFIG.egg.hatchMinMs);
    const s = ctx.engine.getState();
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins - CONFIG.egg.price);
    expect(s.player.totalEggsBought).toBe(1);
    expect(s.ui).toMatchObject({
      selectedDragonId: res.dragon.id,
      currentScreen: { kind: "dragon", dragonId: res.dragon.id },
    });
    expect(ctx.getStored()?.player.dragons).toHaveLength(1);
  });
  it("confirm is blocked when broke", () => {
    const poor = stateWith();
    poor.player.coins = 0;
    const t = setup(poor);
    t.engine.init();
    expect(t.engine.confirmEggPurchase(0, 0)).toEqual({
      ok: false,
      reason: "not-enough-coins",
    });
    expect(t.engine.getState().player.dragons).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Coins (tap-to-collect)
// ---------------------------------------------------------------------------

describe("coins", () => {
  it("reports collectible coins without crediting them", () => {
    const saved = stateWith();
    saved.player.lastCoinCollectMs = T0 - 5 * HOUR;
    const t = setup(saved);
    t.engine.init();
    expect(t.engine.collectibleAmount()).toBe(5 * CONFIG.economy.hourlyCoins);
    expect(t.engine.hasCollectible()).toBe(true);
    expect(t.engine.getEconomyView()).toMatchObject({
      coins: CONFIG.economy.startingCoins,
      collectible: 5 * CONFIG.economy.hourlyCoins,
      hasCollectible: true,
      canAffordEgg: true,
    });
    // nothing credited without tapping
    expect(t.engine.getState().player.coins).toBe(CONFIG.economy.startingCoins);
  });
  it("tap-to-collect credits whole intervals and preserves the remainder", () => {
    const saved = stateWith();
    saved.player.lastCoinCollectMs = T0 - (2 * HOUR + HOUR / 2);
    const t = setup(saved);
    t.engine.init();
    expect(t.engine.collectCoins()).toEqual({ collected: 2 * CONFIG.economy.hourlyCoins });
    const s = t.engine.getState();
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins + 2 * CONFIG.economy.hourlyCoins);
    expect(s.player.lastCoinCollectMs).toBe(T0 - HOUR / 2);
    // remainder accrues: half an hour later another hour completes
    t.setNow(T0 + HOUR / 2);
    expect(t.engine.collectCoins()).toEqual({ collected: CONFIG.economy.hourlyCoins });
  });
  it("collect is a no-op below one interval", () => {
    ctx.engine.init();
    expect(ctx.engine.collectCoins()).toEqual({ collected: 0 });
    expect(ctx.engine.hasCollectible()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dragon views
// ---------------------------------------------------------------------------

describe("dragon views", () => {
  it("returns null for unknown dragons", () => {
    ctx.engine.init();
    expect(ctx.engine.getDragonView("nope")).toBeNull();
  });
  it("describes eggs (no training, no fights)", () => {
    const t = setup(stateWith([eggDragon()]));
    t.engine.init();
    const view = t.engine.getDragonView("egg-test");
    expect(view).toMatchObject({ stage: "egg", ageDays: 0, canTrain: false, canFight: false });
    expect(view?.level).toBe(1);
    expect(t.engine.hatchedCount()).toBe(0);
  });
  it("describes hatched dragons with derived values", () => {
    const t = setup(stateWith([hatchedDragon({ strength: 60 })]));
    t.engine.init();
    const view = t.engine.getDragonView("dragon-test");
    expect(view).toMatchObject({
      stage: "hatched",
      level: 6,
      strength: 60,
      energy: 100,
      canTrain: true,
      canFight: true,
      expired: false,
    });
    expect(view?.sellPrice).toBeGreaterThan(0);
    expect(t.engine.hatchedCount()).toBe(1);
    expect(t.engine.listDragonViews()).toHaveLength(1);
    expect(t.engine.getScreens()).toEqual([
      { kind: "main" },
      { kind: "dragon", dragonId: "dragon-test" },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Training / selling
// ---------------------------------------------------------------------------

describe("training", () => {
  it("preview gates unknown / egg / no-energy / broke dragons", () => {
    const t = setup(
      stateWith([
        eggDragon({ id: "egg" }),
        hatchedDragon({ id: "tired", energy: 0, lastEnergyUpdateMs: T0 }),
        hatchedDragon({ id: "rich", strength: 10 }),
      ]),
    );
    t.engine.init();
    expect(t.engine.trainPreview("nope")).toMatchObject({
      canTrain: false,
      reason: "unknown-dragon",
    });
    expect(t.engine.trainPreview("egg")).toMatchObject({ canTrain: false, reason: "egg" });
    expect(t.engine.trainPreview("tired")).toMatchObject({ canTrain: false, reason: "no-energy" });
    // broke: cost for strength 20 exceeds 0 coins
    const poor = stateWith([hatchedDragon({ id: "d", strength: 20 })]);
    poor.player.coins = 0;
    const t2 = setup(poor);
    t2.engine.init();
    expect(t2.engine.trainPreview("d")).toMatchObject({
      canTrain: false,
      reason: "not-enough-coins",
    });
    expect(t.engine.trainPreview("rich")).toMatchObject({ canTrain: true, reason: null });
  });
  it("trains: coins deducted, strength gained, energy drained, level tracked", () => {
    const saved = stateWith([hatchedDragon({ id: "d", strength: 14 })]);
    saved.player.coins = 1000;
    const t = setup(saved, 0); // gain roll 0 => +3
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.trainDragon("d", 0);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.gain).toBe(CONFIG.training.strengthGainMin);
    expect(res.strengthAfter).toBe(17);
    expect(res.levelBefore).toBe(1);
    expect(res.levelAfter).toBe(2);
    expect(res.energyAfter).toBe(100 - CONFIG.training.energyCost);
    const s = t.engine.getState();
    expect(s.player.coins).toBeLessThan(before);
    expect(s.player.totalTrainings).toBe(1);
    expect(s.player.dragons[0].strength).toBe(17);
  });
  it("blocked training changes nothing", () => {
    ctx.engine.init();
    expect(ctx.engine.trainDragon("nope")).toEqual({ ok: false, reason: "unknown-dragon" });
  });
});

describe("selling", () => {
  it("previews null for eggs / unknown dragons", () => {
    const t = setup(stateWith([eggDragon({ id: "egg" })]));
    t.engine.init();
    expect(t.engine.sellPreview("egg")).toBeNull();
    expect(t.engine.sellPreview("nope")).toBeNull();
  });
  it("sells: dragon removed, price credited, stats updated", () => {
    const t = setup(stateWith([hatchedDragon({ strength: 20, hatchedAtMs: T0 })]));
    t.engine.init();
    const price = t.engine.sellPreview("dragon-test");
    expect(price).toBe(40); // floor((10 + 20*1.5) * 1.0 * 1.0)
    const res = t.engine.sellDragon("dragon-test");
    expect(res).toEqual({ ok: true, price: 40 });
    const s = t.engine.getState();
    expect(s.player.dragons).toEqual([]);
    expect(s.player.coins).toBe(CONFIG.economy.startingCoins + 40);
    expect(s.player.totalDragonsSold).toBe(1);
  });
  it("cannot sell eggs or unknown dragons", () => {
    const t = setup(stateWith([eggDragon({ id: "egg" })]));
    t.engine.init();
    expect(t.engine.sellDragon("egg")).toEqual({ ok: false, reason: "egg" });
    expect(t.engine.sellDragon("nope")).toEqual({ ok: false, reason: "unknown-dragon" });
  });
});

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

describe("monsters", () => {
  function spawnedSetup(randValue = 0.5) {
    const saved = stateWith([hatchedDragon({ id: "d", strength: 50 })]);
    saved.monsterSpawn = { spawned: [{ ...MONSTERS[0] }], lastRefreshMs: T0 };
    return setup(saved, randValue);
  }

  it("refresh force-rolls the table; interval gates auto-refresh", () => {
    const t = spawnedSetup(0); // every difficulty spawns
    t.engine.init();
    expect(t.engine.refreshMonsterSpawn(true)).toHaveLength(
      Math.min(MONSTERS.length, CONFIG.monsterSpawn.maxShown),
    );
    expect(t.engine.getSpawnedMonsters()).toHaveLength(
      Math.min(MONSTERS.length, CONFIG.monsterSpawn.maxShown),
    );
  });
  it("openMonsterSelect gates eggs / tired / unknown dragons", () => {
    const t = setup(stateWith([eggDragon({ id: "egg" }), hatchedDragon({ id: "ok" })]));
    t.engine.init();
    expect(t.engine.openMonsterSelect("nope")).toEqual({ ok: false, reason: "unknown-dragon" });
    expect(t.engine.openMonsterSelect("egg")).toEqual({ ok: false, reason: "egg" });
    const tired = setup(stateWith([hatchedDragon({ id: "d", energy: 0, lastEnergyUpdateMs: T0 })]));
    tired.engine.init();
    expect(tired.engine.openMonsterSelect("d")).toEqual({ ok: false, reason: "no-energy" });
    const res = t.engine.openMonsterSelect("ok");
    expect(res.ok).toBe(true);
    expect(t.engine.getState().ui.activeModal).toBe("monster-select");
  });
  it("wins: coins + permanent strength, energy drained, log recorded", () => {
    const t = spawnedSetup();
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.fightMonster("d", MONSTERS[0].id, {
      bonusRand01: 0.999,
      rewardRand01: 0,
      energyRand01: 0,
      strengthRand01: 0,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(true); // 50 + 10 - 19 > 0
    expect(res.coinReward).toBe(MONSTERS[0].rewardMin);
    expect(res.energyLoss).toBe(MONSTERS[0].energyLossWinMin);
    expect(res.energyAfter).toBe(100 - MONSTERS[0].energyLossWinMin);
    expect(res.strengthGain).toBe(MONSTERS[0].strengthGainWinMin);
    expect(res.strengthAfter).toBe(50 + MONSTERS[0].strengthGainWinMin);
    const s = t.engine.getState();
    expect(s.player.coins).toBe(before + MONSTERS[0].rewardMin);
    expect(s.player.totalMonsterWins).toBe(1);
    expect(s.player.dragons[0].strength).toBe(res.strengthAfter);
    expect(s.ui.fightLog).toHaveLength(1);
  });
  it("losses: no reward, strength unchanged, loss counter bumps", () => {
    const saved = stateWith([hatchedDragon({ id: "d", strength: 1 })]);
    saved.monsterSpawn = { spawned: [{ ...MONSTERS[2] }], lastRefreshMs: T0 };
    const t = setup(saved);
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.fightMonster("d", MONSTERS[2].id, {
      bonusRand01: 0,
      rewardRand01: 0.5,
      energyRand01: 0,
      strengthRand01: 0.999,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(false); // 1 + 0 - 55 < 0
    expect(res.coinReward).toBe(0);
    expect(res.strengthGain).toBe(0);
    expect(res.strengthAfter).toBe(1);
    const s = t.engine.getState();
    expect(s.player.coins).toBe(before);
    expect(s.player.totalMonsterLosses).toBe(1);
  });
  it("rejects unknown dragons / eggs / tired dragons / unspawned targets", () => {
    const t = spawnedSetup();
    t.engine.init();
    expect(t.engine.fightMonster("nope", MONSTERS[0].id)).toMatchObject({
      ok: false,
      reason: "unknown-dragon",
    });
    expect(t.engine.fightMonster("d", "monster-x")).toMatchObject({
      ok: false,
      reason: "monster-not-spawned",
    });
    const withEgg = setup(stateWith([eggDragon({ id: "egg" })]));
    withEgg.engine.init();
    // no spawn table entries at all here either
    expect(withEgg.engine.fightMonster("egg", MONSTERS[0].id)).toMatchObject({
      ok: false,
      reason: "egg",
    });
    // seed a spawn so the no-energy gate (not the spawn gate) fires
    const seeded = stateWith([hatchedDragon({ id: "d", energy: 0, lastEnergyUpdateMs: T0 })]);
    seeded.monsterSpawn = { spawned: [{ ...MONSTERS[0] }], lastRefreshMs: T0 };
    const t2 = setup(seeded);
    t2.engine.init();
    expect(t2.engine.fightMonster("d", MONSTERS[0].id)).toMatchObject({
      ok: false,
      reason: "no-energy",
    });
  });
});

// ---------------------------------------------------------------------------
// Bewilder Beast
// ---------------------------------------------------------------------------

describe("beast", () => {
  it("participants exclude eggs and drained dragons, in roster order", () => {
    const t = setup(
      stateWith([
        eggDragon({ id: "egg" }),
        hatchedDragon({ id: "tired", energy: 0, lastEnergyUpdateMs: T0 }),
        hatchedDragon({ id: "ready1" }),
        hatchedDragon({ id: "ready2" }),
      ]),
    );
    t.engine.init();
    expect(t.engine.getBeastParticipants().map((d) => d.id)).toEqual(["ready1", "ready2"]);
  });
  it("canFightBeast gates vanished beasts and empty lineups", () => {
    ctx.engine.init();
    const vanished = stateWith([hatchedDragon()]);
    vanished.beast.status = "vanished";
    const t = setup(vanished);
    t.engine.init();
    expect(t.engine.canFightBeast()).toEqual({ ok: false, reason: "beast-vanished" });
    expect(t.engine.fightBeast()).toEqual({ ok: false, reason: "beast-vanished" });

    const noTeam = setup(stateWith([eggDragon()]));
    noTeam.engine.init();
    expect(noTeam.engine.canFightBeast()).toEqual({ ok: false, reason: "no-participants" });
    expect(noTeam.engine.fightBeast()).toEqual({ ok: false, reason: "no-participants" });
  });
  it("wins: vanish-for-a-day + reward + survivor strength gains", () => {
    const saved = stateWith([
      hatchedDragon({ id: "d1", strength: 100 }),
      hatchedDragon({ id: "d2", strength: 100 }),
    ]);
    saved.beast.currentHp = 10;
    const t = setup(saved, 0.5);
    t.engine.init();
    const before = t.engine.getState().player.coins;
    const res = t.engine.fightBeast();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(true); // 100 + 5 - 20 >> 10: first turn kills
    expect(res.turns).toHaveLength(1);
    expect(res.beastHpAfter).toBe(0);
    expect(res.reward).toBe(CONFIG.beast.winRewardMin);
    expect(res.removedDragonIds).toEqual([]);
    expect(Object.keys(res.strengthGains)).toEqual(["d1"]);
    const s = t.engine.getState();
    expect(s.player.coins).toBe(before + CONFIG.beast.winRewardMin);
    expect(s.player.totalBeastsDefeated).toBe(1);
    expect(s.beast.status).toBe("vanished");
    expect(s.beast.respawnAtMs).toBe(T0 + CONFIG.beast.respawnAfterWinMs);
    expect(s.player.dragons.find((d) => d.id === "d1")?.strength).toBeGreaterThan(100);
  });
  it("losses: drained dragons removed, beast HP persists, no gains", () => {
    const saved = stateWith([hatchedDragon({ id: "weak", strength: 1, energy: 10 })]);
    const t = setup(saved, 0.5);
    t.engine.init();
    const res = t.engine.fightBeast();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.won).toBe(false);
    expect(res.turns).toHaveLength(1);
    expect(res.removedDragonIds).toEqual(["weak"]);
    expect(res.reward).toBe(0);
    expect(res.strengthGains).toEqual({});
    const s = t.engine.getState();
    expect(s.player.dragons).toEqual([]);
    expect(s.beast.status).toBe("alive");
    expect(s.beast.currentHp).toBe(CONFIG.beast.hp); // 0 chip damage dealt
  });
  it("openBeastIntro records the modal", () => {
    ctx.engine.init();
    ctx.engine.openBeastIntro();
    expect(ctx.engine.getState().ui.activeModal).toBe("beast-intro");
  });
});

// ---------------------------------------------------------------------------
// UI slice
// ---------------------------------------------------------------------------

describe("ui slice", () => {
  it("opens/closes modals, selects dragons and switches screens", () => {
    const t = setup(stateWith([hatchedDragon({ id: "d1" }), hatchedDragon({ id: "d2" })]));
    t.engine.init();
    t.engine.openModal("train");
    expect(t.engine.getState().ui.activeModal).toBe("train");
    expect(t.engine.closeModal()).toEqual({ ok: true });
    expect(t.engine.getState().ui.activeModal).toBeNull();
    expect(t.engine.isFightLocked()).toBe(false);

    expect(t.engine.selectDragon("nope")).toBe(false);
    expect(t.engine.selectDragon("d2")).toBe(true);
    expect(t.engine.getState().ui.currentScreen).toEqual({ kind: "dragon", dragonId: "d2" });
    t.engine.setScreen({ kind: "main" });
    expect(t.engine.getState().ui.currentScreen).toEqual({ kind: "main" });
  });
});

// ---------------------------------------------------------------------------
// Save migration (moved out of page/index.js)
// ---------------------------------------------------------------------------

describe("save migration", () => {
  it("rejects null / non-objects / unrelated shapes", () => {
    expect(coerceLoadedSave(null, T0)).toBeNull();
    expect(coerceLoadedSave(undefined, T0)).toBeNull();
    expect(coerceLoadedSave(42, T0)).toBeNull();
    expect(coerceLoadedSave({ coins: "rich" }, T0)).toBeNull();
  });
  it("passes engine-shaped saves through untouched", () => {
    const saved = stateWith([hatchedDragon()]);
    expect(coerceLoadedSave(saved, T0)).toBe(saved);
  });
  it("migrates the legacy page-owned shape", () => {
    const legacy = {
      coins: 55,
      dragons: [
        {
          id: "d1",
          breedIdx: 2,
          strength: 7,
          energy: 80,
          purchasedAt: 100,
          hatchAt: 200,
          hatchedAt: 300,
          energyTs: 400,
        },
        { noId: true },
      ],
      createdAt: 50,
      lastCoinCollectMs: 60,
      beastHp: 123,
      beastStatus: "vanished",
      beastRespawnAt: 999,
      spawned: ["monster-1", "nope"],
      spawnTs: 70,
    };
    const s = coerceLoadedSave(legacy, T0);
    expect(s).not.toBeNull();
    expect(s?.player.coins).toBe(55);
    expect(s?.player.createdAtMs).toBe(50);
    expect(s?.player.lastSeenMs).toBe(T0);
    expect(s?.player.lastCoinCollectMs).toBe(60);
    expect(s?.player.dragons).toHaveLength(1);
    expect(s?.player.dragons[0]).toMatchObject({
      id: "d1",
      breedId: DRAGONS[2].id,
      strength: 7,
      energy: 80,
      purchasedAtMs: 100,
      hatchAtMs: 200,
      hatchedAtMs: 300,
      lastEnergyUpdateMs: 400,
    });
    expect(s?.beast).toMatchObject({
      currentHp: 123,
      status: "vanished",
      respawnAtMs: 999,
    });
    expect(s?.monsterSpawn.spawned.map((m) => m.id)).toEqual(["monster-1"]);
    expect(s?.monsterSpawn.lastRefreshMs).toBe(70);
  });
  it("migrateLegacySave fills defaults for missing legacy fields", () => {
    const s = migrateLegacySave({ coins: 5, dragons: [{ id: "d" }] }, T0);
    expect(s.player.coins).toBe(5);
    expect(s.player.dragons[0]).toMatchObject({
      id: "d",
      breedId: DRAGONS[0].id,
      strength: 0,
      energy: CONFIG.energy.initial,
      purchasedAtMs: T0,
      hatchAtMs: T0,
      hatchedAtMs: null,
      lastEnergyUpdateMs: T0,
    });
    expect(s.beast).toMatchObject({ currentHp: CONFIG.beast.hp, status: "alive" });
    expect(s.monsterSpawn).toMatchObject({ spawned: [], lastRefreshMs: 0 });
  });
});
