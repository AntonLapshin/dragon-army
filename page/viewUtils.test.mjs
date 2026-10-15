import { describe, it, expect } from 'vitest';
import {
  actionRowPositions,
  beastFightHpAtReveal,
  beastVanishHours,
  energySegmentColor,
  energySegmentsFilled,
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

describe('beastFightHpAtReveal', () => {
  it('steps through per-turn HP as lines reveal', () => {
    const base = { lineCount: 4, hpSteps: [200, 120, 0], hpBefore: 260, hpAfter: 0, currentHp: 0 };
    expect(beastFightHpAtReveal({ ...base, revealed: 0 })).toBe(260);
    expect(beastFightHpAtReveal({ ...base, revealed: 1 })).toBe(200);
    expect(beastFightHpAtReveal({ ...base, revealed: 3 })).toBe(0);
    expect(beastFightHpAtReveal({ ...base, revealed: 4 })).toBe(0);
  });

  it('falls back to jump-at-end without per-turn steps', () => {
    const base = { lineCount: 2, hpSteps: undefined, hpBefore: 260, hpAfter: 0, currentHp: 130 };
    expect(beastFightHpAtReveal({ ...base, revealed: 0 })).toBe(130);
    expect(beastFightHpAtReveal({ ...base, revealed: 1 })).toBe(130);
    expect(beastFightHpAtReveal({ ...base, revealed: 2 })).toBe(0);
  });
});
