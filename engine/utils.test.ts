/**
 * Unit tests for engine/utils.ts — pure helpers only.
 *
 * No clock, no storage, no mutation: every test asserts return values and
 * that inputs are never mutated.
 */
import { describe, expect, it } from "vitest";
import {
  advanceCollectAnchor,
  appendFightLog,
  beastTurnLogText,
  createDragonId,
  createEggDragon,
  hatchDragonInstance,
  monsterFightLogText,
  screensForRoster,
  withEnergyAnchor,
  withTrainingGain,
} from "./utils";
import { CONFIG } from "./config";
import type { Dragon, FightLogEntry } from "./types";

const HOUR = 60 * 60 * 1000;

const stubDragon = (over: Partial<Dragon> = {}): Dragon => ({
  id: "dragon-test",
  breedId: "dragon-1",
  strength: 10,
  energy: 100,
  purchasedAtMs: 0,
  hatchAtMs: HOUR,
  hatchedAtMs: null,
  lastEnergyUpdateMs: 0,
  ...over,
});

describe("createDragonId", () => {
  it("is deterministic for the same inputs", () => {
    expect(createDragonId(0.5, 1000)).toBe(createDragonId(0.5, 1000));
  });
  it("varies with rand and timestamp", () => {
    expect(createDragonId(0.1, 1000)).not.toBe(createDragonId(0.2, 1000));
    expect(createDragonId(0.1, 1000)).not.toBe(createDragonId(0.1, 2000));
  });
  it("returns a dragon-prefixed string id", () => {
    expect(createDragonId(0, 0)).toMatch(/^dragon-/);
  });
});

describe("createEggDragon", () => {
  it("builds a fresh unhatched egg with a hidden hatch timer", () => {
    const egg = createEggDragon({
      id: "egg-1",
      breedId: "dragon-3",
      nowMs: 5000,
      hatchDelayMs: HOUR,
    });
    expect(egg).toEqual({
      id: "egg-1",
      breedId: "dragon-3",
      strength: 0,
      energy: CONFIG.energy.initial,
      purchasedAtMs: 5000,
      hatchAtMs: 5000 + HOUR,
      hatchedAtMs: null,
      lastEnergyUpdateMs: 5000,
    });
  });
});

describe("hatchDragonInstance", () => {
  it("sets the hatch anchor + base strength without mutating the input", () => {
    const egg = stubDragon();
    const hatched = hatchDragonInstance(egg, 9999, 14);
    expect(hatched.hatchedAtMs).toBe(9999);
    expect(hatched.strength).toBe(14);
    expect(egg.hatchedAtMs).toBeNull();
    expect(egg.strength).toBe(10);
  });
});

describe("withEnergyAnchor / withTrainingGain", () => {
  it("rewrites the energy anchor (the only legal energy write)", () => {
    const d = stubDragon({ energy: 100, lastEnergyUpdateMs: 0 });
    const drained = withEnergyAnchor(d, 30, 1234);
    expect(drained.energy).toBe(30);
    expect(drained.lastEnergyUpdateMs).toBe(1234);
    expect(d.energy).toBe(100);
  });
  it("adds a training gain to strength", () => {
    const d = stubDragon({ strength: 10 });
    expect(withTrainingGain(d, 5).strength).toBe(15);
    expect(d.strength).toBe(10);
  });
  it("composes: train = gain then re-anchor (engine order)", () => {
    const d = stubDragon({ strength: 10, energy: 100, lastEnergyUpdateMs: 0 });
    const after = withEnergyAnchor(withTrainingGain(d, 5), 85, 777);
    expect(after).toEqual({ ...d, strength: 15, energy: 85, lastEnergyUpdateMs: 777 });
  });
});

describe("advanceCollectAnchor", () => {
  it("collects nothing below one interval and keeps the anchor", () => {
    expect(advanceCollectAnchor(0, HOUR - 1)).toEqual({
      collected: 0,
      newLastCollectMs: 0,
    });
  });
  it("consumes whole intervals and preserves the partial remainder", () => {
    const res = advanceCollectAnchor(0, 2 * HOUR + HOUR / 2);
    expect(res.collected).toBe(2 * CONFIG.economy.hourlyCoins);
    expect(res.newLastCollectMs).toBe(2 * HOUR);
  });
  it("tapping early loses no progress (remainder accrues next time)", () => {
    const first = advanceCollectAnchor(0, HOUR + 10);
    expect(first.collected).toBe(CONFIG.economy.hourlyCoins);
    const second = advanceCollectAnchor(first.newLastCollectMs, 2 * HOUR + 10);
    expect(second.collected).toBe(CONFIG.economy.hourlyCoins);
    expect(second.newLastCollectMs).toBe(2 * HOUR);
  });
  it("caps at maxUncollectedCoins and treats clock skew as zero", () => {
    const res = advanceCollectAnchor(0, 1000 * HOUR);
    expect(res.collected).toBe(24);
    expect(advanceCollectAnchor(5000, 1000).collected).toBe(0);
  });
});

describe("screensForRoster", () => {
  it("returns main only for an empty roster", () => {
    expect(screensForRoster([])).toEqual([{ kind: "main" }]);
  });
  it("appends one dragon screen per id, in roster order", () => {
    expect(screensForRoster(["a", "b"])).toEqual([
      { kind: "main" },
      { kind: "dragon", dragonId: "a" },
      { kind: "dragon", dragonId: "b" },
    ]);
  });
});

describe("fight-log text", () => {
  it("monsterFightLogText narrates win vs loss", () => {
    const win = monsterFightLogText("Gronkle", "monster 1", 5, true);
    expect(win).toContain("Gronkle");
    expect(win).toContain("5");
    expect(win).toMatch(/victory/i);
    const loss = monsterFightLogText("Gronkle", "monster 1", -3, false);
    expect(loss).toContain("-3");
    expect(loss).toMatch(/recover/);
  });
  it("beastTurnLogText clamps negative damage at 0 in the text", () => {
    expect(beastTurnLogText("Gronkle", 12, 20)).toContain("12");
    expect(beastTurnLogText("Gronkle", -5, 20)).toContain("0 damage");
    expect(beastTurnLogText("Gronkle", 12, 20)).toContain("Bewilder Beast");
  });
  it("appendFightLog returns a new array and never mutates", () => {
    const log: FightLogEntry[] = [];
    const entry: FightLogEntry = {
      turnIndex: 0,
      dragonId: "d1",
      text: "hit",
      damage: 5,
    };
    const next = appendFightLog(log, entry);
    expect(next).toEqual([entry]);
    expect(next).not.toBe(log);
    expect(log).toHaveLength(0);
  });
});
