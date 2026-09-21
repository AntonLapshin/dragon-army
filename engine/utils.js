// GENERATED from engine/utils.ts — do not edit by hand.
// Regenerate with: npm run build:engine
// (zeus build only bundles .js; the .ts sources are for vitest.)
import { CONFIG, applyStrengthGain, clampStrength, collectibleCoins } from "./config.js";
function createDragonId(rand01, nowMs) {
  const randPart = Math.floor(rand01 * 36 ** 6).toString(36);
  return `dragon-${nowMs.toString(36)}-${randPart}`;
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
    lastEnergyUpdateMs: params.nowMs
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
function screensForRoster(dragonIds) {
  return [
    { kind: "main" },
    ...dragonIds.map((dragonId) => ({ kind: "dragon", dragonId }))
  ];
}
function monsterFightLogText(dragonName, monsterName, rawDamage, won) {
  return won ? `Dragon ${dragonName} attacks ${monsterName} \u2013 damage ${rawDamage}. Victory!` : `Dragon ${dragonName} attacks ${monsterName} \u2013 damage ${rawDamage}. Dragon is tired, will recover automatically.`;
}
function beastTurnLogText(dragonName, rawDamage, counterDamage) {
  return `Dragon ${dragonName} deals ${Math.max(0, rawDamage)} damage to Bewilder Beast (retaliation ${counterDamage}).`;
}
function appendFightLog(log, entry) {
  return [...log, entry];
}
export {
  advanceCollectAnchor,
  appendFightLog,
  beastTurnLogText,
  createDragonId,
  createEggDragon,
  hatchDragonInstance,
  monsterFightLogText,
  screensForRoster,
  withEnergyAnchor,
  withTrainingGain
};
