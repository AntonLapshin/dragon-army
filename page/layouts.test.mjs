import { describe, it, expect } from 'vitest';
import {
  BIP6_LAYOUT,
  ROUND480_LAYOUT,
  DEVICE_PROFILES,
  resolveProfileId,
  layoutFor,
  refreshLayout,
  DEVICE,
  PANEL_W,
} from './layouts.js';

const R = 240;
const CX = 240;
const CY = 240;

function cornerDist(x, y) {
  return Math.hypot(x - CX, y - CY);
}

function rectInsideCircle(x, y, w, h, margin = 0) {
  return (
    cornerDist(x, y) <= R - margin &&
    cornerDist(x + w, y) <= R - margin &&
    cornerDist(x, y + h) <= R - margin &&
    cornerDist(x + w, y + h) <= R - margin
  );
}

describe('resolveProfileId', () => {
  it('maps Bip 6 rect to bip6', () => {
    expect(resolveProfileId({ width: 390, height: 450 })).toBe('bip6');
    expect(resolveProfileId({ width: 390, height: 450, screenShape: 'square' })).toBe('bip6');
    expect(resolveProfileId({ width: 390, height: 450, deviceSource: 9765120 })).toBe('bip6');
  });

  it('maps 480x480 round to round480', () => {
    expect(resolveProfileId({ width: 480, height: 480 })).toBe('round480');
    expect(resolveProfileId({ width: 480, height: 480, screenShape: 'round' })).toBe('round480');
  });

  it('maps other round resolutions to round480', () => {
    expect(resolveProfileId({ width: 466, height: 466 })).toBe('round480');
    expect(resolveProfileId({ width: 454, height: 454 })).toBe('round480');
    expect(resolveProfileId({ width: 416, height: 416 })).toBe('round480');
  });

  it('keeps tiny square-pixel watches on the rect layout', () => {
    expect(resolveProfileId({ width: 176, height: 176 })).toBe('bip6');
  });

  it('falls back to bip6 for unknown/missing info', () => {
    expect(resolveProfileId(null)).toBe('bip6');
    expect(resolveProfileId(undefined)).toBe('bip6');
    expect(resolveProfileId({})).toBe('bip6');
    expect(resolveProfileId({ width: 390, height: 450, screenShape: 999 })).toBe('bip6');
  });

  it('layoutFor returns the matching table', () => {
    expect(layoutFor('bip6')).toBe(BIP6_LAYOUT);
    expect(layoutFor('round480')).toBe(ROUND480_LAYOUT);
    expect(layoutFor('nope')).toBe(BIP6_LAYOUT);
  });
});

describe('layout tables', () => {
  it('cover exactly the same keys', () => {
    const b = Object.keys(BIP6_LAYOUT).sort();
    const r = Object.keys(ROUND480_LAYOUT).sort();
    expect(r).toEqual(b);
  });

  it('holds only finite numbers (plus per-device bg image sources)', () => {
    for (const L of [BIP6_LAYOUT, ROUND480_LAYOUT]) {
      for (const [k, v] of Object.entries(L)) {
        if (k === 'BG_HOME_SRC' || k === 'BG_DRAGON_SRC') {
          expect(typeof v, k).toBe('string');
          expect(v.length, k).toBeGreaterThan(0);
        } else {
          expect(Number.isFinite(v), k).toBe(true);
        }
      }
    }
  });

  it('keeps the extracted Bip 6 values verbatim (spot check)', () => {
    expect([BIP6_LAYOUT.PANEL_X, BIP6_LAYOUT.PANEL_Y, BIP6_LAYOUT.PANEL_W, BIP6_LAYOUT.PANEL_H])
      .toEqual([25, 40, 340, 370]);
    expect([BIP6_LAYOUT.EGG_BTN_X, BIP6_LAYOUT.EGG_BTN_Y, BIP6_LAYOUT.EGG_BTN_S])
      .toEqual([12, 84, 128]);
    expect([BIP6_LAYOUT.ENERGY_BAR_X, BIP6_LAYOUT.ENERGY_BAR_Y])
      .toEqual([70, 76]);
    expect([BIP6_LAYOUT.ROSTER_LEFT, BIP6_LAYOUT.ROSTER_BOTTOM_PAD])
      .toEqual([20, 40]);
  });

  it('never shrinks art-bound widget sizes (IMG draws 1:1, smaller would crop)', () => {
    const artBound = [
      'DRAGON_IMG_S', 'ACTION_ICON_S', 'ROSTER_THUMB', 'ROSTER_FRAME',
      'EGG_BTN_S', 'BEAST_BTN_S', 'ENERGY_BAR_W', 'ENERGY_BAR_H',
      'BEAST_BAR_W', 'BEAST_BAR_H',
      'MONSTER_IMG_S',
      'EARN_ICON_S', 'BALANCE_ICON_S', 'COINS_ICON_S', 'ICON_SIZE',
      'EGG_DICE_S', 'EGG_REVEAL_S', 'SELL_ICON_S', 'TRAIN_RESULT_ICON_S',
      'BEAST_IMG_S', 'SHADOW_W', 'SHADOW_H',
      'EQUIP_BUY_ICON_S', 'EQUIP_BTN_S', 'EQUIP_ROW_H',
      'FIGHT_DRAGON_S', 'FIGHT_ENEMY_S', 'FIGHT_FIREBALL_S', 'FIGHT_IMPACT_S',
    ];
    for (const k of artBound) {
      expect(ROUND480_LAYOUT[k], k).toBe(BIP6_LAYOUT[k]);
    }
  });

  it('uses per-device background art matching the widget box', () => {
    expect(BIP6_LAYOUT.BG_HOME_SRC).toBe('bg/bg-home_390x450.png');
    expect(BIP6_LAYOUT.BG_DRAGON_SRC).toBe('bg/bg-dragon_390x450.png');
    expect([BIP6_LAYOUT.BG_X, BIP6_LAYOUT.BG_Y, BIP6_LAYOUT.BG_W, BIP6_LAYOUT.BG_H])
      .toEqual([0, 0, 390, 450]);
    expect(ROUND480_LAYOUT.BG_HOME_SRC).toBe('bg/bg-home_480x480.png');
    expect(ROUND480_LAYOUT.BG_DRAGON_SRC).toBe('bg/bg-dragon_480x480.png');
    expect([ROUND480_LAYOUT.BG_X, ROUND480_LAYOUT.BG_Y, ROUND480_LAYOUT.BG_W, ROUND480_LAYOUT.BG_H])
      .toEqual([0, 0, 480, 480]);
  });
});

describe('round480 circle containment', () => {
  const L = ROUND480_LAYOUT;
  const prof = DEVICE_PROFILES.round480;

  it('keeps the modal panel inside the circle', () => {
    expect(rectInsideCircle(L.PANEL_X, L.PANEL_Y, L.PANEL_W, L.PANEL_H, 4)).toBe(true);
    expect(prof.width).toBe(480);
    expect(prof.height).toBe(480);
  });

  it('keeps the top hub icons inside the circle', () => {
    expect(rectInsideCircle(L.EGG_BTN_X, L.EGG_BTN_Y, L.EGG_BTN_S, L.EGG_BTN_S, 4)).toBe(true);
    const beastX = prof.width - L.BEAST_BTN_OFFSET_X;
    expect(rectInsideCircle(beastX, L.BEAST_BTN_Y, L.BEAST_BTN_S, L.BEAST_BTN_S, 4)).toBe(true);
    expect(rectInsideCircle(L.ENERGY_BAR_X, L.ENERGY_BAR_Y, L.ENERGY_BAR_W, L.ENERGY_BAR_H, 4)).toBe(true);
  });

  it('keeps the dragon art inside the circle', () => {
    const x = Math.floor((prof.width - L.DRAGON_IMG_S) / 2);
    expect(rectInsideCircle(x, L.DRAGON_IMG_Y, L.DRAGON_IMG_S, L.DRAGON_IMG_S, 4)).toBe(true);
  });

  it('keeps the bottom action row inside the circle', () => {
    const y = prof.height - L.ACTION_BOTTOM_PAD - L.ACTION_ICON_S;
    const step = (prof.width - L.ACTION_SIDE_PAD * 2 - L.ACTION_ICON_S) / 3;
    for (let i = 0; i < 4; i += 1) {
      const x = Math.round(L.ACTION_SIDE_PAD + i * step);
      expect(rectInsideCircle(x, y, L.ACTION_ICON_S, L.ACTION_ICON_S, 4), `cell ${i}`).toBe(true);
    }
  });

  it('keeps the roster strip inside the circle', () => {
    const y = prof.height - L.ROSTER_THUMB - L.ROSTER_BOTTOM_PAD;
    const pad = Math.round((L.ROSTER_FRAME - L.ROSTER_THUMB) / 2);
    const step = (prof.width - L.ROSTER_LEFT * 2 - L.ROSTER_THUMB) / (L.ROSTER_SLOTS - 1);
    for (let i = 0; i < L.ROSTER_SLOTS; i += 1) {
      const x = Math.round(L.ROSTER_LEFT + i * step);
      expect(
        rectInsideCircle(x - pad, y - pad, L.ROSTER_FRAME, L.ROSTER_FRAME, 4),
        `slot ${i}`,
      ).toBe(true);
    }
  });

  it('keeps the equipment button + grid inside the circle', () => {
    expect(rectInsideCircle(L.EQUIP_BTN_X, L.EQUIP_BTN_Y, L.EQUIP_BTN_S, L.EQUIP_BTN_S, 4)).toBe(true);
    // equipment page: 3-piece row then 4-leg row, both 72px icons
    const sidePad = L.ACTION_SIDE_PAD;
    const gridY = L.EQUIP_GRID_Y;
    for (let i = 0; i < 3; i += 1) {
      const step = (prof.width - sidePad * 2 - 72) / 2;
      const x = Math.round(sidePad + i * step);
      expect(rectInsideCircle(x, gridY, 72, 72, 4), `piece ${i}`).toBe(true);
    }
    const legStep = (prof.width - sidePad * 2 - 72) / 3;
    for (let i = 0; i < 4; i += 1) {
      const x = Math.round(sidePad + i * legStep);
      expect(rectInsideCircle(x, gridY + L.EQUIP_ROW_H, 72, 72, 4), `leg ${i}`).toBe(true);
    }
    // grid bottom clears the bottom action row
    const navTop = prof.height - L.ACTION_BOTTOM_PAD - L.ACTION_ICON_S;
    expect(gridY + 2 * L.EQUIP_ROW_H).toBeLessThanOrEqual(navTop);
  });

  it('fits three monster rows in the round panel (page fit condition)', () => {
    let rows = 0;
    for (let i = 0; i < 3; i += 1) {
      const rowY = L.MONSTER_ROW_Y + i * L.MONSTER_ROW_H;
      if (rowY + L.MONSTER_ROW_MAX_H > L.PANEL_H - L.MONSTER_ROW_BOTTOM_PAD) break;
      rows += 1;
    }
    expect(rows).toBe(3);
  });

  it('keeps the fight screen inside the circle (dragons left, enemy right)', async () => {
    const { fightUnitRects } = await import('./viewUtils.js');
    const params = {
      shape: 'round',
      arenaY: L.FIGHT_ARENA_Y,
      arenaH: L.FIGHT_ARENA_H,
      leftX: L.FIGHT_LEFT_X,
      leftXWide: L.FIGHT_LEFT_X_WIDE,
      colGap: L.FIGHT_COL_GAP,
      enemyX: L.FIGHT_ENEMY_X,
      dragonS: L.FIGHT_DRAGON_S,
      enemyS: L.FIGHT_ENEMY_S,
      barH: L.FIGHT_HP_BAR_H,
      barGap: L.FIGHT_HP_BAR_GAP,
      rowGap: L.FIGHT_ROW_GAP,
    };
    // 1, 6 and 12 dragons (max roster): every unit + its HP bar inside.
    for (const count of [1, 6, 12]) {
      const r = fightUnitRects({ ...params, dragonCount: count });
      for (const d of r.dragons) {
        expect(rectInsideCircle(d.barX, d.barY, d.barW, L.FIGHT_HP_BAR_H, 4), `dragon bar ${count}`).toBe(true);
        expect(rectInsideCircle(d.x, d.y, d.size, d.size, 4), `dragon ${count}`).toBe(true);
      }
      expect(rectInsideCircle(r.enemy.barX, r.enemy.barY, r.enemy.barW, L.FIGHT_HP_BAR_H, 4), `enemy bar ${count}`).toBe(true);
      expect(rectInsideCircle(r.enemy.x, r.enemy.y, r.enemy.size, r.enemy.size, 4), `enemy ${count}`).toBe(true);
    }
    // Continue button (drawn like index.js: centered, FIGHT_CONTINUE_Y).
    const btnX = Math.floor((prof.width - L.BTN_W) / 2);
    expect(rectInsideCircle(btnX, L.FIGHT_CONTINUE_Y, L.BTN_W, L.BTN_H, 4)).toBe(true);
    // Log line: real Zepp OS TEXT clips instead of wrapping, so the
    // longest narration (37 chars with the short "Beast" label, e.g.
    // "Hideous Zippleback hits Beast for 48") must fit the circle chord
    // at the log's vertical center. 0.6 = worst-case char-width factor
    // (same as BADGE_WIDTH_FACTOR).
    const logCenterY = L.FIGHT_LOG_Y + L.FIGHT_LOG_H / 2;
    const dy = Math.abs(logCenterY - 240);
    const chord = 2 * Math.sqrt(240 * 240 - dy * dy);
    expect(37 * L.FIGHT_LOG_FONT * 0.6).toBeLessThanOrEqual(chord);
  });
});

describe('refreshLayout covers every table key', () => {
  it('assigns all of each table onto the live bindings (no drift)', async () => {
    const m = await import('./layouts.js');
    for (const [profileId, table] of [
      ['bip6', BIP6_LAYOUT],
      ['round480', ROUND480_LAYOUT],
    ]) {
      const info = profileId === 'round480'
        ? { width: 480, height: 480 }
        : { width: 390, height: 450 };
      m.refreshLayout(info);
      for (const [key, value] of Object.entries(table)) {
        expect(m[key], `${profileId}.${key}`).toBe(value);
      }
    }
    // Restore the default profile for any test running after this one.
    m.refreshLayout({ width: 390, height: 450 });
  });
});

describe('refreshLayout live bindings', () => {
  it('swaps tables and restores them', async () => {
    const mRound = await import('./layouts.js');
    mRound.refreshLayout({ width: 480, height: 480 });
    expect(mRound.PANEL_W).toBe(320);
    expect(mRound.BG_HOME_SRC).toBe('bg/bg-home_480x480.png');
    expect(mRound.BG_DRAGON_SRC).toBe('bg/bg-dragon_480x480.png');
    expect(mRound.BG_W).toBe(480);
    expect(mRound.BG_H).toBe(480);
    expect(mRound.DEVICE.profileId).toBe('round480');
    expect(mRound.DEVICE.width).toBe(480);
    expect(mRound.DEVICE.height).toBe(480);
    expect(mRound.DEVICE.shape).toBe('round');

    mRound.refreshLayout({ width: 390, height: 450 });
    expect(mRound.PANEL_W).toBe(340);
    expect(mRound.BG_HOME_SRC).toBe('bg/bg-home_390x450.png');
    expect(mRound.BG_DRAGON_SRC).toBe('bg/bg-dragon_390x450.png');
    expect(mRound.BG_W).toBe(390);
    expect(mRound.BG_H).toBe(450);
    expect(mRound.DEVICE.profileId).toBe('bip6');
    expect(mRound.DEVICE.width).toBe(390);
    expect(mRound.DEVICE.height).toBe(450);
    expect(mRound.DEVICE.shape).toBe('rect');
  });
});
