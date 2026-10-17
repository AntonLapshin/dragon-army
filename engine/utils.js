// GENERATED from engine/utils.ts — do not edit by hand.
// Regenerate with: npm run build:engine
// (zeus build only bundles .js; the .ts sources are for vitest.)
import {
  CONFIG,
  DRAGONS,
  applyStrengthGain,
  clampStrength,
  collectibleCoins,
  collectibleStepCoins,
  generateVillages,
  villageTierConfig
} from "./config.js";
import { EQUIPMENT_SLOTS } from "./config.js";
function createDragonId(rand01, nowMs) {
  const randPart = Math.floor(rand01 * 36 ** 6).toString(36);
  return `dragon-${nowMs.toString(36)}-${randPart}`;
}
function seededRand01(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function freshCombatStats() {
  return { easyWins: 0, mediumWins: 0, hardWins: 0, beastWins: 0, coinsEarned: 0 };
}
function normalizeCombatStats(raw) {
  const r = typeof raw === "object" && raw !== null ? raw : {};
  const num = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  return {
    easyWins: num(r.easyWins),
    mediumWins: num(r.mediumWins),
    hardWins: num(r.hardWins),
    beastWins: num(r.beastWins),
    coinsEarned: num(r.coinsEarned)
  };
}
function freshEquipment() {
  const equipment = {};
  for (const def of EQUIPMENT_SLOTS) equipment[def.id] = false;
  return equipment;
}
function normalizeEquipment(raw) {
  const r = typeof raw === "object" && raw !== null ? raw : {};
  const equipment = {};
  for (const def of EQUIPMENT_SLOTS) {
    equipment[def.id] = r[def.id] === true;
  }
  return equipment;
}
function withEquipment(dragon, slot) {
  return {
    ...dragon,
    equipment: { ...normalizeEquipment(dragon.equipment), [slot]: true }
  };
}
function createEggDragon(params) {
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
    equipment: freshEquipment()
  };
}
function hatchDragonInstance(dragon, nowMs, baseStrength) {
  return { ...dragon, hatchedAtMs: nowMs, strength: clampStrength(baseStrength) };
}
function withEnergyAnchor(dragon, energy, nowMs) {
  return { ...dragon, energy, lastEnergyUpdateMs: nowMs };
}
function withTrainingGain(dragon, gain) {
  return { ...dragon, strength: applyStrengthGain(dragon.strength, gain) };
}
function normalizeVillageDefender(raw, fallback) {
  const r = typeof raw === "object" && raw !== null ? raw : {};
  const num = (v, d) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d;
  const breedId = typeof r.breedId === "string" && DRAGONS.some((b) => b.id === r.breedId) ? r.breedId : fallback.breedId;
  return {
    id: typeof r.id === "string" ? r.id : fallback.id,
    breedId,
    combat: num(r.combat, fallback.combat),
    maxHp: Math.max(1, num(r.maxHp, fallback.maxHp))
  };
}
function normalizeVillages(raw, rand01, fleetScaling) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((entry, i) => {
      const r = typeof entry === "object" && entry !== null ? entry : {};
      const tier = r.tier === "easy" || r.tier === "medium" || r.tier === "hard" ? r.tier : "easy";
      const cfg = villageTierConfig(tier);
      const fallbackDefender = {
        id: `village-${i}-def-0`,
        breedId: DRAGONS[0].id,
        combat: cfg.combatMin,
        maxHp: cfg.hp
      };
      const defendersRaw = Array.isArray(r.defenders) ? r.defenders : [];
      const defenders = defendersRaw.map(
        (d, j) => normalizeVillageDefender(d, { ...fallbackDefender, id: `village-${i}-def-${j}` })
      );
      return {
        id: typeof r.id === "string" ? r.id : `village-${i}`,
        name: typeof r.name === "string" && r.name.length > 0 ? r.name : `Village ${i + 1}`,
        tier,
        defenders: defenders.length > 0 ? defenders : [fallbackDefender],
        fortune: typeof r.fortune === "number" && Number.isFinite(r.fortune) && r.fortune >= 0 ? Math.floor(r.fortune) : cfg.fortuneMin,
        captured: r.captured === true
      };
    });
  }
  return generateVillages(rand01, fleetScaling);
}
function advanceCollectAnchor(lastCoinCollectMs, nowMs) {
  const elapsed = Math.max(0, nowMs - lastCoinCollectMs);
  const collected = collectibleCoins(elapsed);
  if (collected <= 0) {
    return { collected: 0, newLastCollectMs: lastCoinCollectMs };
  }
  const intervals = Math.floor(
    elapsed / CONFIG.economy.coinAccrualIntervalMs
  );
  return {
    collected,
    newLastCollectMs: lastCoinCollectMs + intervals * CONFIG.economy.coinAccrualIntervalMs
  };
}
function advanceStepAnchor(lastCollectedSteps, currentSteps) {
  if (!Number.isFinite(currentSteps) || !Number.isFinite(lastCollectedSteps)) {
    return {
      collected: 0,
      newLastCollectedSteps: Number.isFinite(currentSteps) ? currentSteps : lastCollectedSteps
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
    newLastCollectedSteps: lastCollectedSteps + collected * CONFIG.economy.stepsPerCoin
  };
}
function screensForRoster(dragonIds) {
  return [
    { kind: "main" },
    ...dragonIds.map((dragonId) => ({ kind: "dragon", dragonId }))
  ];
}
function fightTurnLogText(attackerName, targetName, hit, damage) {
  return hit ? `${attackerName} hits ${targetName} for ${damage}` : `${attackerName} misses ${targetName}`;
}
function monsterFightSummaryText(won, coinReward, strengthGain) {
  return won ? `Victory! +${coinReward} coins, +${strengthGain} strength` : "Dragon is tired, will recover automatically";
}
export {
  advanceCollectAnchor,
  advanceStepAnchor,
  createDragonId,
  createEggDragon,
  fightTurnLogText,
  freshCombatStats,
  freshEquipment,
  hatchDragonInstance,
  monsterFightSummaryText,
  normalizeCombatStats,
  normalizeEquipment,
  normalizeVillages,
  screensForRoster,
  seededRand01,
  withEnergyAnchor,
  withEquipment,
  withTrainingGain
};
