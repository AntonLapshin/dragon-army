/**
 * Dragon Army — pure abstract helpers for the stateful engine.
 *
 * Everything here is pure (no clock reads, no storage, no mutation):
 * roster-entry factories, immutable anchor updates, tap-to-collect anchor
 * math, screen list builders, and fight-log text formatters.
 * All balance numbers and formulas come from `config.ts` — this file only
 * orchestrates shapes defined in `types.ts`.
 */

import {
  CONFIG,
  DRAGONS,
  applyStrengthGain,
  clampStrength,
  collectibleCoins,
  collectibleStepCoins,
  generateVillages,
  villageTierConfig,
} from "./config";
import type {
  CollectAdvance,
  Dragon,
  DragonCombatStats,
  DragonEquipment,
  EquipmentSlotId,
  FleetScaling,
  NewEggParams,
  Random01,
  ScreenRef,
  Village,
  VillageDefender,
  VillageTier,
} from "./types";
import { EQUIPMENT_SLOTS } from "./config";

export type { CollectAdvance, NewEggParams } from "./types";

// ---------------------------------------------------------------------------
// Ids (deterministic given inputs — the engine injects rand/now)
// ---------------------------------------------------------------------------

/** Deterministic instance id from a [0,1) random source + epoch ms. Pure. */
export function createDragonId(rand01: number, nowMs: number): string {
  const randPart = Math.floor(rand01 * 36 ** 6).toString(36);
  return `dragon-${nowMs.toString(36)}-${randPart}`;
}

/**
 * Deterministic seeded RNG (mulberry32) for pure factories that need
 * randomness without an injected source (fresh-game village generation,
 * save migration). Same seed -> same sequence. Pure.
 */
export function seededRand01(seed: number): Random01 {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Roster-entry factories / immutable updates (pure)
// ---------------------------------------------------------------------------

/** Zeroed lifetime battle record for a fresh egg. Pure. */
export function freshCombatStats(): DragonCombatStats {
  return { easyWins: 0, mediumWins: 0, hardWins: 0, beastWins: 0, coinsEarned: 0 };
}

/**
 * Coerce an unknown (possibly absent / partial) combat-stats blob from an
 * old save into a valid record. Pure — used by save migration.
 */
export function normalizeCombatStats(raw: unknown): DragonCombatStats {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const num = (v: unknown): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return {
    easyWins: num(r.easyWins),
    mediumWins: num(r.mediumWins),
    hardWins: num(r.hardWins),
    beastWins: num(r.beastWins),
    coinsEarned: num(r.coinsEarned),
  };
}

/** Empty equipment: every slot unowned. Pure. */
export function freshEquipment(): DragonEquipment {
  const equipment = {} as Record<EquipmentSlotId, boolean>;
  for (const def of EQUIPMENT_SLOTS) equipment[def.id] = false;
  return equipment as DragonEquipment;
}

/**
 * Coerce an unknown (possibly absent / partial) equipment blob from an
 * old save into a valid record: unknown slots -> false, non-booleans ->
 * false. Pure — used by save migration.
 */
export function normalizeEquipment(raw: unknown): DragonEquipment {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const equipment = {} as Record<EquipmentSlotId, boolean>;
  for (const def of EQUIPMENT_SLOTS) {
    equipment[def.id] = r[def.id] === true;
  }
  return equipment as DragonEquipment;
}

/** Mark one slot owned (buying equipment). Pure — caller persists the result. */
export function withEquipment(
  dragon: Dragon,
  slot: EquipmentSlotId,
): Dragon {
  return {
    ...dragon,
    equipment: { ...normalizeEquipment(dragon.equipment), [slot]: true },
  };
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
    combatStats: freshCombatStats(),
    equipment: freshEquipment(),
  };
}

/** Set the hatch anchor + rolled base strength once. Pure. */
export function hatchDragonInstance(
  dragon: Dragon,
  nowMs: number,
  baseStrength: number,
): Dragon {
  return { ...dragon, hatchedAtMs: nowMs, strength: clampStrength(baseStrength) };
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

/** Add a training gain to strength (clamped at CONFIG.strength.max). Pure. */
export function withTrainingGain(dragon: Dragon, gain: number): Dragon {
  return { ...dragon, strength: applyStrengthGain(dragon.strength, gain) };
}

// ---------------------------------------------------------------------------
// Villages: normalization / migration (pure)
// ---------------------------------------------------------------------------

function normalizeVillageDefender(
  raw: unknown,
  fallback: VillageDefender,
): VillageDefender {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const num = (v: unknown, d: number): number =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
  const breedId =
    typeof r.breedId === "string" &&
    DRAGONS.some((b) => b.id === r.breedId)
      ? r.breedId
      : fallback.breedId;
  return {
    id: typeof r.id === "string" ? r.id : fallback.id,
    breedId,
    combat: num(r.combat, fallback.combat),
    maxHp: Math.max(1, num(r.maxHp, fallback.maxHp)),
  };
}

/**
 * Coerce an unknown villages blob from an old save into a valid village
 * set. A valid non-empty array is normalized in place (clamped, defaults
 * for corrupt fields); anything else (missing / empty / wrong shape) is
 * GENERATED via `generateVillages` — fresh ranges when `fleetScaling` is
 * null, fleet-scaled ranges for migrating saves. Pure.
 */
export function normalizeVillages(
  raw: unknown,
  rand01: Random01,
  fleetScaling: FleetScaling | null,
): Village[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry, i) => {
      const r = (typeof entry === "object" && entry !== null ? entry : {}) as Record<
        string,
        unknown
      >;
      const tier: VillageTier =
        r.tier === "easy" || r.tier === "medium" || r.tier === "hard"
          ? r.tier
          : "easy";
      const cfg = villageTierConfig(tier);
      const fallbackDefender: VillageDefender = {
        id: `village-${i}-def-0`,
        breedId: DRAGONS[0].id,
        combat: cfg.combatMin,
        maxHp: cfg.hp,
      };
      const defendersRaw = Array.isArray(r.defenders) ? r.defenders : [];
      const defenders = defendersRaw.map((d, j) =>
        normalizeVillageDefender(d, { ...fallbackDefender, id: `village-${i}-def-${j}` }),
      );
      return {
        id: typeof r.id === "string" ? r.id : `village-${i}`,
        name: typeof r.name === "string" && r.name.length > 0 ? r.name : `Village ${i + 1}`,
        tier,
        defenders: defenders.length > 0 ? defenders : [fallbackDefender],
        fortune:
          typeof r.fortune === "number" && Number.isFinite(r.fortune) && r.fortune >= 0
            ? Math.floor(r.fortune)
            : cfg.fortuneMin,
        captured: r.captured === true,
      };
    });
  }
  return generateVillages(rand01, fleetScaling);
}

// ---------------------------------------------------------------------------
// Tap-to-collect anchor math (pure)
// ---------------------------------------------------------------------------

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

/**
 * Advance the step-coin anchor to `currentSteps`. Whole 100-step groups
 * are consumed; the leftover remainder stays so no progress is lost by
 * tapping early. A counter reset (current < anchor, e.g. daily rollover)
 * resyncs to current with 0 collected. Pure.
 */
export function advanceStepAnchor(
  lastCollectedSteps: number,
  currentSteps: number,
): { collected: number; newLastCollectedSteps: number } {
  if (!Number.isFinite(currentSteps) || !Number.isFinite(lastCollectedSteps)) {
    return {
      collected: 0,
      newLastCollectedSteps: Number.isFinite(currentSteps)
        ? currentSteps
        : lastCollectedSteps,
    };
  }
  if (currentSteps < lastCollectedSteps) {
    return { collected: 0, newLastCollectedSteps: currentSteps };
  }
  const collected = collectibleStepCoins(currentSteps, lastCollectedSteps);
  if (collected <= 0) {
    return { collected: 0, newLastCollectedSteps: lastCollectedSteps };
  }
  return {
    collected,
    newLastCollectedSteps:
      lastCollectedSteps + collected * CONFIG.economy.stepsPerCoin,
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

/**
 * One-line narration for a single fight-screen attack (fireball flight
 * result). Misses show as "misses" — no damage number, so the player
 * can tell a miss from a weak hit at a glance. Pure.
 */
export function fightTurnLogText(
  attackerName: string,
  targetName: string,
  hit: boolean,
  damage: number,
): string {
  return hit
    ? `${attackerName} hits ${targetName} for ${damage}`
    : `${attackerName} misses ${targetName}`;
}

/** Summary line appended after the last attack of a monster fight. Pure. */
export function monsterFightSummaryText(
  won: boolean,
  coinReward: number,
  strengthGain: number,
): string {
  return won
    ? `Victory! +${coinReward} coins, +${strengthGain} strength`
    : "Dragon is tired, will recover automatically";
}
