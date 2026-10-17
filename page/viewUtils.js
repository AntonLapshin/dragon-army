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


// ---------------------------------------------------------------------------
// Fight-screen geometry (dragons left, enemy right, HP bar above each
// unit). Pure rectangles — index.js draws them.
//
// Row overlap: with 11-12 dragons (max roster) 6 rows of 70px do not fit
// a ~365px arena, so the row pitch shrinks and rows overlap slightly
// (bars stay readable — they draw over the previous row's feet). The unit
// box itself never shrinks: Zepp OS IMG draws 1:1, a smaller box would
// crop the 60px dragon art.
// ---------------------------------------------------------------------------

export function fightBarFill(barW, hp, maxHp) {
  if (maxHp <= 0) return 0;
  const fill = Math.round(barW * Math.min(1, Math.max(0, hp / maxHp)));
  return Math.min(barW, Math.max(0, fill));
}

/**
 * Rectangles for the fight screen.
 *
 * @param {object} p
 * @param {number} p.dragonCount - participating dragons (1..12)
 * @param {'rect'|'round'} p.shape
 * @param {number} p.arenaY - top of the arena (units live here)
 * @param {number} p.arenaH - arena height
 * @param {number} p.leftX - left-column x (rect, or round with <=6 dragons)
 * @param {number} p.leftXWide - left-column x for round with 7+ dragons
 *   (shifted toward the circle's center, where the usable vertical span is
 *   taller — at x=52 the circle only allows y in [97,383])
 * @param {number} p.colGap - horizontal gap between the two dragon columns
 * @param {number} p.enemyX - enemy unit x (right side)
 * @param {number} p.dragonS - dragon unit size (60, matches dragonAsset60)
 * @param {number} p.enemyS - enemy unit size (72, matches monsterAsset72)
 * @param {number} p.barH - HP bar height above each unit
 * @param {number} p.barGap - gap between the bar and the unit
 * @param {number} p.rowGap - gap between dragon rows
 * @param {number} [p.enemyCount] - enemy units on the right (default 1:
 *   monster / beast). Village fights pass 2-4 defenders, stacked in one
 *   column with the same row pitch as the dragons.
 * @returns {{ dragons: Array<{x,y,barX,barY,barW,size}>,
 *            enemy: {x,y,barX,barY,barW,size},
 *            enemies: Array<{x,y,barX,barY,barW,size}> }}
 *   `enemy` is `enemies[0]` (backward compat for single-enemy fights).
 */
export function fightUnitRects(p) {
  const rowH = p.barH + p.barGap + p.dragonS;
  const cols = p.dragonCount <= 3 ? 1 : 2;
  const rows = Math.ceil(p.dragonCount / cols);
  // Pitch shrinks only when the rows would overflow the arena; the last
  // row must still end inside it (see the module header on overlap).
  const pitch =
    rows <= 1
      ? rowH
      : Math.min(rowH + p.rowGap, (p.arenaH - rowH) / (rows - 1));
  const blockH = (rows - 1) * pitch + rowH;
  const topY = p.arenaY + Math.max(0, (p.arenaH - blockH) / 2);
  const leftX =
    p.shape === 'round' && p.dragonCount > 6 ? p.leftXWide : p.leftX;

  const dragons = [];
  for (let i = 0; i < p.dragonCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowY = topY + row * pitch;
    const x = leftX + col * (p.dragonS + p.colGap);
    dragons.push({
      x,
      y: rowY + p.barH + p.barGap,
      barX: x,
      barY: rowY,
      barW: p.dragonS,
      size: p.dragonS,
    });
  }

  // Enemies: one column on the right. Same row pitch as the dragons so
  // 2-4 village defenders stack evenly; a single enemy (monster/beast)
  // keeps the old vertically-centered position. Multi-enemy fights use
  // `enemyXWide` (round: shifted toward the circle's center — at the
  // outer enemyX the top/bottom defenders' corners leave the circle).
  const enemyCount = Math.max(1, p.enemyCount || 1);
  const enemyX = enemyCount > 1 && p.enemyXWide !== undefined ? p.enemyXWide : p.enemyX;
  const enemyRowH = p.barH + p.barGap + p.enemyS;
  const enemies = [];
  if (enemyCount === 1) {
    const enemyBarY = p.arenaY + Math.max(0, (p.arenaH - enemyRowH) / 2);
    enemies.push({
      x: enemyX,
      y: enemyBarY + p.barH + p.barGap,
      barX: enemyX,
      barY: enemyBarY,
      barW: p.enemyS,
      size: p.enemyS,
    });
  } else {
    const enemyPitch =
      enemyCount <= 1
        ? enemyRowH
        : Math.min(enemyRowH + p.rowGap, (p.arenaH - enemyRowH) / (enemyCount - 1));
    const enemyBlockH = (enemyCount - 1) * enemyPitch + enemyRowH;
    const enemyTopY = p.arenaY + Math.max(0, (p.arenaH - enemyBlockH) / 2);
    for (let i = 0; i < enemyCount; i++) {
      const rowY = enemyTopY + i * enemyPitch;
      enemies.push({
        x: enemyX,
        y: rowY + p.barH + p.barGap,
        barX: enemyX,
        barY: rowY,
        barW: p.enemyS,
        size: p.enemyS,
      });
    }
  }
  return { dragons, enemy: enemies[0], enemies };
}

/**
 * Fireball top-left for a sprite of `size` flying from center `from` to
 * center `to` at progress `t` (clamped to [0, 1]).
 */
export function fightFireballPos(from, to, t, size) {
  const k = Math.min(1, Math.max(0, t));
  return {
    x: Math.round(from.x + (to.x - from.x) * k - size / 2),
    y: Math.round(from.y + (to.y - from.y) * k - size / 2),
  };
}
