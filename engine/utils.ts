/**
 * Dragon Army — pure abstract helpers for the stateful engine.
 *
 * Everything here is pure (no clock reads, no storage, no mutation):
 * roster-entry factories, immutable anchor updates, tap-to-collect anchor
 * math, screen list builders, and fight-log text formatters.
 * All balance numbers and formulas come from `config.ts` — this file only
 * orchestrates shapes defined in `types.ts`.
 */

import { CONFIG, collectibleCoins } from "./config";
import type {
  Dragon,
  FightLogEntry,
  ScreenRef,
} from "./types";

// ---------------------------------------------------------------------------
// Ids (deterministic given inputs — the engine injects rand/now)
// ---------------------------------------------------------------------------

/** Deterministic instance id from a [0,1) random source + epoch ms. Pure. */
export function createDragonId(rand01: number, nowMs: number): string {
  const randPart = Math.floor(rand01 * 36 ** 6).toString(36);
  return `dragon-${nowMs.toString(36)}-${randPart}`;
}

// ---------------------------------------------------------------------------
// Roster-entry factories / immutable updates (pure)
// ---------------------------------------------------------------------------

export interface NewEggParams {
  id: string;
  breedId: string;
  nowMs: number;
  hatchDelayMs: number;
}

/**
 * Fresh unhatched egg: strength 0, full-energy anchor, hidden hatch timer.
 * Pure.
 */
export function createEggDragon(params: NewEggParams): Dragon {
  return {
    id: params.id,
    breedId: params.breedId,
    strength: 0,
    energy: CONFIG.energy.initial,
    purchasedAtMs: params.nowMs,
    hatchAtMs: params.nowMs + params.hatchDelayMs,
    hatchedAtMs: null,
    lastEnergyUpdateMs: params.nowMs,
  };
}

/** Set the hatch anchor + rolled base strength once. Pure. */
export function hatchDragonInstance(
  dragon: Dragon,
  nowMs: number,
  baseStrength: number,
): Dragon {
  return { ...dragon, hatchedAtMs: nowMs, strength: baseStrength };
}

/**
 * Rewrite the energy anchor after a drain (the ONLY legal energy write;
 * recovery is always derived via `energyAt()`). Pure.
 */
export function withEnergyAnchor(
  dragon: Dragon,
  energy: number,
  nowMs: number,
): Dragon {
  return { ...dragon, energy, lastEnergyUpdateMs: nowMs };
}

/** Add a training gain to strength. Pure. */
export function withTrainingGain(dragon: Dragon, gain: number): Dragon {
  return { ...dragon, strength: dragon.strength + gain };
}

// ---------------------------------------------------------------------------
// Tap-to-collect anchor math (pure)
// ---------------------------------------------------------------------------

export interface CollectAdvance {
  /** Coins earned for whole elapsed intervals (capped, 0 below 1 interval). */
  collected: number;
  /**
   * Advanced anchor: whole consumed intervals move forward, the partial
   * remainder stays so no progress is lost by tapping early.
   */
  newLastCollectMs: number;
}

/**
 * Advance the Earn-Coins anchor to `nowMs`. Whole hourly intervals are
 * consumed; leftover partial time is preserved. Pure.
 */
export function advanceCollectAnchor(
  lastCoinCollectMs: number,
  nowMs: number,
): CollectAdvance {
  const elapsed = Math.max(0, nowMs - lastCoinCollectMs);
  const collected = collectibleCoins(elapsed);
  if (collected <= 0) {
    return { collected: 0, newLastCollectMs: lastCoinCollectMs };
  }
  const intervals = Math.floor(
    elapsed / CONFIG.economy.coinAccrualIntervalMs,
  );
  return {
    collected,
    newLastCollectMs:
      lastCoinCollectMs + intervals * CONFIG.economy.coinAccrualIntervalMs,
  };
}

// ---------------------------------------------------------------------------
// Screens (pure)
// ---------------------------------------------------------------------------

/** Main hub + one detail screen per roster entry, in roster order. Pure. */
export function screensForRoster(dragonIds: string[]): ScreenRef[] {
  return [
    { kind: "main" },
    ...dragonIds.map((dragonId): ScreenRef => ({ kind: "dragon", dragonId })),
  ];
}

// ---------------------------------------------------------------------------
// Fight-log text (pure presentation helpers)
// ---------------------------------------------------------------------------

export function monsterFightLogText(
  dragonName: string,
  monsterName: string,
  rawDamage: number,
  won: boolean,
): string {
  return won
    ? `Dragon ${dragonName} attacks ${monsterName} – damage ${rawDamage}. Victory!`
    : `Dragon ${dragonName} attacks ${monsterName} – damage ${rawDamage}. Dragon is tired, will recover automatically.`;
}

export function beastTurnLogText(
  dragonName: string,
  rawDamage: number,
  counterDamage: number,
): string {
  return `Dragon ${dragonName} deals ${Math.max(0, rawDamage)} damage to Bewilder Beast (retaliation ${counterDamage}).`;
}

/** Append-only log helper returning a new array. Pure. */
export function appendFightLog(
  log: FightLogEntry[],
  entry: FightLogEntry,
): FightLogEntry[] {
  return [...log, entry];
}
