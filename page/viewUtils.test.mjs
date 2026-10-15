import { describe, it, expect } from 'vitest';
import {
  actionRowPositions,
  beastVanishHours,
  energySegmentColor,
  energySegmentsFilled,
  fightBarFill,
  fightFireballPos,
  fightUnitRects,
  formatDragonName,
  rosterWindow,
  wrapIndex,
} from './viewUtils.js';

describe('formatDragonName', () => {
  it('pluralizes days and clamps negatives / floors fractions', () => {
    expect(formatDragonName('Wooly Howl', 2)).toBe('Wooly Howl (2 days)');
    expect(formatDragonName('Wooly Howl', 1)).toBe('Wooly Howl (1 day)');
    expect(formatDragonName('Wooly Howl', 0)).toBe('Wooly Howl (0 days)');
    expect(formatDragonName('Wooly Howl', -3)).toBe('Wooly Howl (0 days)');
    expect(formatDragonName('Wooly Howl', 2.9)).toBe('Wooly Howl (2 days)');
  });
});

describe('energySegmentsFilled', () => {
  it('rounds up so any remaining energy shows a segment', () => {
    expect(energySegmentsFilled(0, 100)).toBe(0);
    expect(energySegmentsFilled(1, 100)).toBe(1);
    expect(energySegmentsFilled(12, 100)).toBe(1);
    expect(energySegmentsFilled(13, 100)).toBe(2);
    expect(energySegmentsFilled(99, 100)).toBe(8);
    expect(energySegmentsFilled(100, 100)).toBe(8);
  });

  it('clamps out-of-range values', () => {
    expect(energySegmentsFilled(-5, 100)).toBe(0);
    expect(energySegmentsFilled(150, 100)).toBe(8);
  });
});

describe('energySegmentColor', () => {
  it('uses the 0.7 / 0.4 thresholds (high > 0.7, mid > 0.4, else low)', () => {
    expect(energySegmentColor(100, 100)).toBe(0x00cc00);
    expect(energySegmentColor(71, 100)).toBe(0x00cc00);
    expect(energySegmentColor(70, 100)).toBe(0xffcc00);
    expect(energySegmentColor(41, 100)).toBe(0xffcc00);
    expect(energySegmentColor(40, 100)).toBe(0xff0000);
    expect(energySegmentColor(0, 100)).toBe(0xff0000);
  });
});

describe('wrapIndex', () => {
  it('wraps both directions and tolerates large deltas', () => {
    expect(wrapIndex(0, -1, 16)).toBe(15);
    expect(wrapIndex(15, 1, 16)).toBe(0);
    expect(wrapIndex(3, 1, 16)).toBe(4);
    expect(wrapIndex(0, 17, 16)).toBe(1);
    expect(wrapIndex(0, -17, 16)).toBe(15);
    expect(wrapIndex(5, 0, 16)).toBe(5);
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

describe('rosterWindow', () => {
  it('shows everything when the roster fits', () => {
    expect(rosterWindow(3, 2, 5)).toEqual({ start: 0, count: 3 });
    expect(rosterWindow(5, 5, 5)).toEqual({ start: 0, count: 5 });
  });

  it('centers the current dragon when overflowing, clamped at both ends', () => {
    expect(rosterWindow(8, 1, 5)).toEqual({ start: 0, count: 5 });
    expect(rosterWindow(8, 4, 5)).toEqual({ start: 1, count: 5 });
    expect(rosterWindow(8, 8, 5)).toEqual({ start: 3, count: 5 });
    expect(rosterWindow(8, 0, 5)).toEqual({ start: 0, count: 5 });
  });
});

describe('actionRowPositions', () => {
  it('spreads cells edge to edge with side pads', () => {
    expect(actionRowPositions(390, 20, 84, 4)).toEqual([20, 109, 197, 286]);
    expect(actionRowPositions(390, 20, 84, 2)).toEqual([20, 286]);
    expect(actionRowPositions(390, 20, 84, 1)).toEqual([20]);
  });
});

describe('beastVanishHours', () => {
  it('rounds up to whole hours, at least 1', () => {
    const hour = 60 * 60 * 1000;
    expect(beastVanishHours(1000 + 24 * hour, 1000, hour)).toBe(24);
    expect(beastVanishHours(1000 + hour + 1, 1000, hour)).toBe(2);
    expect(beastVanishHours(1000, 1000, hour)).toBe(1);
    expect(beastVanishHours(500, 1000, hour)).toBe(1);
    expect(beastVanishHours(null, 1000, hour)).toBe(1);
  });
});



const BIP6 = {
  shape: 'rect',
  arenaY: 40,
  arenaH: 364,
  leftX: 16,
  leftXWide: 16,
  colGap: 12,
  enemyX: 302,
  dragonS: 60,
  enemyS: 72,
  barH: 8,
  barGap: 2,
  rowGap: 4,
};

const ROUND = {
  ...BIP6,
  shape: 'round',
  arenaY: 56,
  arenaH: 384,
  leftX: 52,
  leftXWide: 140,
  enemyX: 356,
};

describe('fightBarFill', () => {
  it('fills proportionally and clamps', () => {
    expect(fightBarFill(60, 100, 100)).toBe(60);
    expect(fightBarFill(60, 50, 100)).toBe(30);
    expect(fightBarFill(60, 0, 100)).toBe(0);
    expect(fightBarFill(60, -5, 100)).toBe(0);
    expect(fightBarFill(60, 200, 100)).toBe(60);
    expect(fightBarFill(60, 1, 0)).toBe(0);
  });
});

describe('fightUnitRects', () => {
  it('centers a single dragon + enemy vertically, bar above each unit', () => {
    const r = fightUnitRects({ ...BIP6, dragonCount: 1 });
    expect(r.dragons).toHaveLength(1);
    const d = r.dragons[0];
    expect(d.x).toBe(16);
    expect(d.barY + 8 + 2).toBe(d.y); // bar, gap, unit
    expect(d.barW).toBe(60);
    // block (70px) centered in a 364px arena starting at 40
    expect(d.barY).toBe(40 + (364 - 70) / 2);
    expect(r.enemy.x).toBe(302);
    expect(r.enemy.barY + 8 + 2).toBe(r.enemy.y);
    expect(r.enemy.barY).toBe(40 + (364 - 82) / 2);
  });

  it('uses one column up to 3 dragons, two columns beyond', () => {
    const three = fightUnitRects({ ...BIP6, dragonCount: 3 });
    expect(new Set(three.dragons.map((d) => d.x)).size).toBe(1);
    const four = fightUnitRects({ ...BIP6, dragonCount: 4 });
    expect(new Set(four.dragons.map((d) => d.x)).size).toBe(2);
    expect(four.dragons[1].x).toBe(16 + 60 + 12);
    expect(four.dragons[2].x).toBe(16); // second row, first column
    expect(four.dragons[2].barY).toBeGreaterThan(four.dragons[0].barY);
  });

  it('keeps all 12 dragons inside the rect arena (rows may overlap)', () => {
    const r = fightUnitRects({ ...BIP6, dragonCount: 12 });
    expect(r.dragons).toHaveLength(12);
    for (const d of r.dragons) {
      expect(d.x).toBeGreaterThanOrEqual(16);
      expect(d.x + 60).toBeLessThanOrEqual(16 + 60 + 12 + 60);
      expect(d.barY).toBeGreaterThanOrEqual(40);
      expect(d.y + 60).toBeLessThanOrEqual(40 + 364);
    }
    // 6 rows in 364px: pitch shrinks below the natural 74px
    const ys = [...new Set(r.dragons.map((d) => d.barY))].sort((a, b) => a - b);
    expect(ys).toHaveLength(6);
    expect(ys[1] - ys[0]).toBeLessThan(74);
  });

  it('shifts the round columns toward the center for 7+ dragons', () => {
    const six = fightUnitRects({ ...ROUND, dragonCount: 6 });
    expect(six.dragons[0].x).toBe(52);
    const seven = fightUnitRects({ ...ROUND, dragonCount: 7 });
    expect(seven.dragons[0].x).toBe(140);
    const twelve = fightUnitRects({ ...ROUND, dragonCount: 12 });
    expect(twelve.dragons).toHaveLength(12);
    for (const d of twelve.dragons) {
      expect(d.barY).toBeGreaterThanOrEqual(56);
      expect(d.y + 60).toBeLessThanOrEqual(56 + 384);
    }
  });

  it('enemy stays on the right on both profiles', () => {
    for (const p of [BIP6, ROUND]) {
      const r = fightUnitRects({ ...p, dragonCount: 5 });
      expect(r.enemy.x).toBe(p.enemyX);
      expect(r.enemy.x).toBeGreaterThan(
        Math.max(...r.dragons.map((d) => d.x + d.size)),
      );
    }
  });
});

describe('fightFireballPos', () => {
  it('starts at the attacker center, ends at the target center', () => {
    const from = { x: 50, y: 100 };
    const to = { x: 250, y: 100 };
    expect(fightFireballPos(from, to, 0, 28)).toEqual({ x: 36, y: 86 });
    expect(fightFireballPos(from, to, 1, 28)).toEqual({ x: 236, y: 86 });
    expect(fightFireballPos(from, to, 0.5, 28)).toEqual({ x: 136, y: 86 });
  });
  it('clamps t to [0, 1]', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    expect(fightFireballPos(from, to, -1, 28)).toEqual(
      fightFireballPos(from, to, 0, 28),
    );
    expect(fightFireballPos(from, to, 2, 28)).toEqual(
      fightFireballPos(from, to, 1, 28),
    );
  });
});
