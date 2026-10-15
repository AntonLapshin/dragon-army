// Dragon Army — pure view helpers for page/index.js.
//
// Everything here is pure (no hmUI, no engine, no clock, no mutation of
// module state): the page renders widgets from these values, and tests
// pin the math without booting the watch UI. Theme numbers (segment
// thresholds / colors / slot count) come from ./index.style.js — this
// file only composes them. Game balance still lives in engine/config.ts.

import {
  BAR_HIGH_AT,
  BAR_MID_AT,
  ENERGY_SEG_COLOR_HIGH,
  ENERGY_SEG_COLOR_LOW,
  ENERGY_SEG_COLOR_MID,
} from './index.style.js';
import { ENERGY_SEG_COUNT } from './layouts.js';

// Dragon name with age: "Wooly Howl (2 days)" / "Wooly Howl (1 day)".
export function formatDragonName(breedName, ageDays) {
  const age = Math.max(0, Math.floor(ageDays));
  return breedName + ' (' + age + ' day' + (age === 1 ? '' : 's') + ')';
}

// Segmented gold energy bar: fill count rounds UP so any remaining energy
// shows at least one segment (1% -> 1 red bar, 99% -> all 8 green bars).
export function energySegmentsFilled(value, max) {
  const pct = Math.min(1, Math.max(0, value / max));
  if (pct <= 0) return 0;
  return Math.min(ENERGY_SEG_COUNT, Math.ceil(pct * ENERGY_SEG_COUNT));
}

// Segment color reflects the overall pct (0.7 / 0.4 thresholds):
// few -> red, mid -> yellow, high -> green.
export function energySegmentColor(value, max) {
  const pct = Math.min(1, Math.max(0, value / max));
  if (pct > BAR_HIGH_AT) return ENERGY_SEG_COLOR_HIGH;
  if (pct > BAR_MID_AT) return ENERGY_SEG_COLOR_MID;
  return ENERGY_SEG_COLOR_LOW;
}

/** Wrap-around index for the choose-a-specific-egg carousel. */
export function wrapIndex(current, delta, count) {
  if (count <= 0) return 0;
  return (((current + delta) % count) + count) % count;
}

/**
 * Roster-strip window: which slice of the roster is visible in `slots`
 * slots, keeping the current dragon (screenIndex 1..N, 0 = main hub)
 * centered when the roster overflows. Returns { start, count }.
 */
export function rosterWindow(listLength, screenIndex, slots) {
  if (listLength <= slots) return { start: 0, count: listLength };
  const cur = Math.max(0, screenIndex - 1);
  const start = Math.min(Math.max(0, cur - 2), listLength - slots);
  return { start, count: slots };
}

/**
 * Evenly-spread x positions for an action row: `cellCount` icons of
 * `cellSize` between `sidePad` margins, first icon at sidePad, last icon
 * flush against (width - sidePad - cellSize). Single cell -> [sidePad].
 */
export function actionRowPositions(width, sidePad, cellSize, cellCount) {
  if (cellCount <= 1) return [sidePad];
  const step = (width - sidePad * 2 - cellSize) / (cellCount - 1);
  return Array.from({ length: cellCount }, (_, i) => Math.round(sidePad + i * step));
}

/** Whole hours until a vanished beast respawns, at least 1. */
export function beastVanishHours(respawnAtMs, nowMs, intervalMs) {
  return Math.max(1, Math.ceil(((respawnAtMs || nowMs) - nowMs) / intervalMs));
}

/**
 * Beast-fight HP bar during the realtime replay. The engine already
 * persisted the final outcome, but the bar drains turn-by-turn as log
 * lines reveal: `revealed` counts shown lines (turns + 1 final summary).
 * With per-turn `hpSteps`, each revealed turn steps to that turn's HP;
 * without them, the bar jumps to `hpAfter` once every line is shown.
 */
export function beastFightHpAtReveal({ revealed, lineCount, hpSteps, hpBefore, hpAfter, currentHp }) {
  if (Array.isArray(hpSteps)) {
    if (revealed <= 0) return hpBefore;
    if (revealed <= hpSteps.length) return hpSteps[revealed - 1];
    return hpAfter;
  }
  if (revealed >= lineCount) return hpAfter;
  return currentHp;
}
