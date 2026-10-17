import hmUI from '@zos/ui';
import { deviceAdapter } from '../utils/deviceAdapter.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import { sensorAdapter } from '../utils/sensorAdapter.js';
import {
  BG_X,
  BG_Y,
  BG_W,
  BG_H,
  BG_HOME_SRC,
  BG_DRAGON_SRC,
  DEVICE,
  refreshLayout,
  STATS_BTN_S,
  STATS_BTN_X,
  STATS_BTN_Y,
  STATS_ROW_Y,
  STATS_ROW_GAP,
  STATS_ROW_H,
  ACTION_BOTTOM_PAD,
  ACTION_ICON_S,
  ACTION_SIDE_PAD,
  BALANCE_ICON_S,
  BALANCE_ICON_Y,
  BALANCE_TEXT_H,
  BALANCE_TEXT_Y,
  BEAST_BAR_W,
  BEAST_BAR_X,
  BEAST_BAR_Y,
  BEAST_BAR_H,
  BEAST_IMG_S,
  BEAST_IMG_X,
  BEAST_IMG_Y,
  BEAST_TEAM_H,
  BEAST_TEAM_Y,
  BEAST_VANISHED_H,
  BEAST_VANISHED_Y,
  BEAST_WARN_H,
  BEAST_WARN_Y,
  BTN_BOTTOM_OFFSET,
  BTN_CENTER_X,
  BTN_H,
  BTN_W,
  COIN_BIG_TEXT_W,
  COINS_ICON_S,
  COINS_ICON_X,
  COINS_ICON_Y,
  COINS_TEXT_H,
  COINS_TEXT_Y,
  DRAGON_IMG_HATCHED_OFFSET,
  DRAGON_IMG_S,
  DRAGON_IMG_Y,
  DRAGON_NAME_H,
  DRAGON_NAME_Y,
  DRAGON_STARS_Y,
  EARN_ICON_S,
  EARN_ICON_Y,
  EARN_TEXT_H,
  EARN_TEXT_Y,
  EGG_BLOCKED_TEXT_H,
  EGG_BLOCKED_TEXT_Y,
  EGG_BTN_S,
  EGG_BTN_X,
  EGG_BTN_Y,
  EGG_DICE_S,
  EGG_DICE_X,
  EGG_DICE_Y,
  EGG_CHOOSE_S,
  EGG_CHOOSE_Y,
  EGG_CHOOSE_BTN_Y,
  EGG_ARROW_S,
  EGG_ARROW_Y,
  EGG_PRICE_ICON_Y,
  EGG_PRICE_TEXT_H,
  EGG_PRICE_TEXT_Y,
  EGG_REVEAL_PRICE_TEXT_Y,
  EGG_REVEAL_PRICE_Y,
  EGG_REVEAL_S,
  EGG_REVEAL_Y,
  EGG_SPIN_BTN_Y,
  EGG_SPIN_HINT_H,
  EGG_SPIN_HINT_Y,
  ENERGY_BAR_W,
  ENERGY_BAR_H,
  ENERGY_BAR_X,
  ENERGY_BAR_Y,
  FIGHT_ARENA_H,
  FIGHT_ARENA_Y,
  FIGHT_COL_GAP,
  FIGHT_CONTINUE_Y,
  FIGHT_DRAGON_S,
  FIGHT_ENEMY_S,
  FIGHT_ENEMY_X,
  FIGHT_ENEMY_X_WIDE,
  FIGHT_FIREBALL_S,
  FIGHT_HP_BAR_GAP,
  FIGHT_HP_BAR_H,
  FIGHT_IMPACT_S,
  FIGHT_LEFT_X,
  FIGHT_LEFT_X_WIDE,
  FIGHT_LOG_FONT,
  FIGHT_LOG_H,
  FIGHT_LOG_Y,
  FIGHT_MISS_H,
  FIGHT_ROW_GAP,
  FIGHT_TITLE_H,
  FIGHT_TITLE_Y,
  HATCH_BTN_Y,
  HATCH_TEXT_H,
  HATCH_TEXT_Y,
  ICON_SIZE,
  KEEP_BTN_X,
  MODAL_CLOSE_OFFSET,
  MODAL_CLOSE_S,
  MODAL_CLOSE_Y,
  MODAL_PAD,
  MODAL_TITLE_H,
  MODAL_TITLE_Y,
  MAP_BTN_S,
  MAP_BTN_X,
  MAP_BTN_Y,
  VILLAGE_GRID_Y,
  VILLAGE_ROW_H,
  VILLAGE_ICON_S,
  VILLAGE_PAGE_ICON_S,
  VILLAGE_PAGE_ICON_Y,
  VILLAGE_INFO_Y,
  VILLAGE_INFO_H,
  VILLAGE_INFO_GAP,
  MONSTER_FIGHT_BTN_H,
  MONSTER_FIGHT_BTN_W,
  MONSTER_FIGHT_BTN_X,
  MONSTER_FIGHT_BTN_Y,
  MONSTER_GAIN_H,
  MONSTER_GAIN_W,
  MONSTER_GAIN_Y,
  MONSTER_IMG_S,
  MONSTER_IMG_X,
  MONSTER_NAME_H,
  MONSTER_NAME_W,
  MONSTER_NAME_X,
  MONSTER_ROW_BOTTOM_PAD,
  MONSTER_ROW_H,
  MONSTER_ROW_MAX_H,
  MONSTER_ROW_Y,
  MONSTER_STARS_Y_OFFSET,
  PANEL_H,
  PANEL_W,
  PANEL_X,
  PANEL_Y,
  ROSTER_BOTTOM_PAD,
  ROSTER_FRAME,
  ROSTER_LEFT,
  ROSTER_SLOTS,
  ROSTER_THUMB,
  SELL_BTN_W,
  SELL_BTN_X,
  SELL_COIN_TEXT_H,
  SELL_COIN_TEXT_Y,
  SELL_COIN_Y,
  SELL_ICON_S,
  SELL_ICON_Y,
  SELL_LABEL_H,
  SELL_LABEL_Y,
  SHADOW_H,
  SHADOW_W,
  SHADOW_Y_OFFSET,
  BEAST_STARS_Y,
  STAR_GAP,
  STAR_S,
  TRAIN_COIN_TEXT_H,
  TRAIN_COIN_TEXT_Y,
  TRAIN_COIN_Y,
  TRAIN_ENERGY_H,
  TRAIN_ENERGY_Y,
  TRAIN_RESULT_ENERGY_H,
  TRAIN_RESULT_ENERGY_Y,
  TRAIN_RESULT_GAIN_H,
  TRAIN_RESULT_GAIN_Y,
  TRAIN_RESULT_ICON_S,
  TRAIN_RESULT_ICON_X,
  TRAIN_RESULT_ICON_Y,
  TRAIN_RESULT_LEVEL_H,
  TRAIN_RESULT_LEVEL_Y,
  TRAIN_WARN_H,
  TRAIN_WARN_Y,
  BEAST_BTN_OFFSET_X,
  BEAST_BTN_S,
  BEAST_BTN_Y,
  EQUIP_BTN_S,
  EQUIP_BTN_X,
  EQUIP_BTN_Y,
  EQUIP_BUY_BONUS_H,
  EQUIP_BUY_BONUS_Y,
  EQUIP_BUY_ICON_S,
  EQUIP_BUY_ICON_Y,
  EQUIP_BUY_PRICE_H,
  EQUIP_BUY_PRICE_Y,
  EQUIP_BUY_WALLET_H,
  EQUIP_BUY_WALLET_Y,
  EQUIP_COMBAT_H,
  EQUIP_COMBAT_Y,
  EQUIP_GRID_Y,
  EQUIP_ROW_H,
} from './layouts.js';
import {
  ASSET_BEAST_72,
  ASSET_BEAST_128,
  ASSET_CHECKMARK_32,
  ASSET_MAP_84,
  VILLAGE_INFO_FONT,
  VILLAGE_NAME_FONT,
  ASSET_FIREBALL_28,
  ASSET_IMPACT_48,
  ASSET_CLOSE_36,
  ASSET_COIN_64,
  ASSET_EQUIPMENT_40,
  ASSET_EQUIP_HELM_72,
  ASSET_EQUIP_WING_72,
  ASSET_EQUIP_TAIL_72,
  ASSET_EQUIP_LEG_72,
  ASSET_DANGER_84,
  ASSET_DICE_80,
  ASSET_EGG_128,
  ASSET_ENERGY_BAR_250,
  ASSET_FRAME_72,
  ASSET_HOME_84,
  ASSET_SELL_84,
  ASSET_SHADOW,
  ASSET_GOLD_STAR_16,
  ASSET_SILVER_STAR_16,
  ASSET_TRAINING_84,
  ASSET_VICTORY_60,
  BADGE_MIN_W,
  BADGE_PAD,
  BADGE_TEXT_MIN_W,
  BADGE_WIDTH_FACTOR,
  BALANCE_FONT,
  BEAST_TEAM_FONT,
  BEAST_VANISHED_FONT,
  BEAST_WARN_FONT,
  BTN_FONT,
  BTN_GREEN,
  BTN_GREEN_PRESS,
  BTN_RADIUS,
  COINS_FONT,
  COLOR_BLACK,
  COLOR_BTN_DISABLED,
  COLOR_BTN_SELL,
  COLOR_BTN_TEXT,
  COLOR_COIN,
  COLOR_ERROR,
  COLOR_MUTED,
  COLOR_SUCCESS,
  COLOR_WHITE,
  DRAGON_NAME_FONT,
  EARN_FONT,
  EGG_BLOCKED_FONT,
  EGG_PRICE_FONT,
  EGG_SPIN_HINT_FONT,
  ENERGY_BAR_NATIVE_W,
  ENERGY_BAR_NATIVE_H,
  ENERGY_SEG_X0,
  ENERGY_SEG_X1,
  ENERGY_SEG_Y0,
  ENERGY_SEG_Y1,
  ENERGY_SEG_INSET,
  FALLBACK_ROSTER_ICON,
  FIGHT_ATTACKER_ALPHA,
  FIGHT_ATTACKER_COLOR,
  FIGHT_HP_COLOR,
  FIGHT_HP_TRACK_COLOR,
  FIGHT_MISS_FONT,
  FIGHT_TITLE_FONT,
  HATCH_TEXT_FONT,
  IMG_DISABLED_ALPHA,
  MODAL_RADIUS,
  MODAL_TITLE_FONT,
  MONSTER_FIGHT_BTN_FONT,
  MONSTER_GAIN_FONT,
  MONSTER_NAME_FONT,
  PANEL_ALPHA,
  PANEL_COLOR,
  RECT_DEFAULT_ALPHA,
  RECT_DEFAULT_RADIUS,
  SELL_COIN_FONT,
  SELL_LABEL_FONT,
  SHADE_ALPHA,
  SHADE_COLOR,
  SHADE_DEFAULT_RADIUS,
  TEXT_DEFAULT_SIZE,
  TEXT_PILL_RADIUS,
  TRAIN_COIN_FONT,
  TRAIN_ENERGY_FONT,
  TRAIN_RESULT_ENERGY_FONT,
  TRAIN_RESULT_GAIN_FONT,
  TRAIN_RESULT_LEVEL_FONT,
  TRAIN_WARN_FONT,
  EQUIP_BUY_BONUS_FONT,
  EQUIP_BUY_PRICE_FONT,
  EQUIP_BUY_WALLET_FONT,
  EQUIP_COMBAT_FONT,
  EQUIP_SLOT_NAME_FONT,
  EQUIP_SLOT_SUB_FONT,
  dragonAsset240,
  dragonAsset60,
  eggAsset240,
  eggAsset60,
  monsterAsset72,
  villageAsset72,
  villageAsset128,
} from './index.style.js';
import { fightBarFill, fightFireballPos, fightUnitRects } from './viewUtils.js';
import { CONFIG, beastDisplayStrength, breedForIndex, clamp, effectiveMonsterStrength, findBreed, starsForStrength } from '../engine/config.js';
import { createGameEngine, coerceLoadedSave } from '../engine/engine.js';
import {
  actionRowPositions,
  beastVanishHours,
  energySegmentColor,
  energySegmentsFilled,
  formatDragonName,
  rosterWindow,
  wrapIndex,
} from './viewUtils.js';

/**
 * Dragon Army — thin UI layer (screens + modals, see docs/interface.md).
 *
 * All game state, balance numbers and rules live in engine/:
 * - engine/config.ts  — the single source of truth for balance/catalogue
 *   (data + pure formulas only, no state).
 * - engine/utils.ts   — pure helpers (factories, anchor math, log text).
 * - engine/engine.ts  — state flow (tick, egg/train/sell/fights, coins,
 *   save migration); the only module allowed to mutate game state.
 * - engine/types.ts   — every shared type.
 *
 * All visual constants (palette, fonts, assets) live in ./index.style.js
 * and all placement coordinates/sizes plus background image sources live
 * in ./layouts.js (per-device tables: Bip 6 rect vs round 480x480,
 * selected at startup via deviceAdapter.getInfo() + refreshLayout()).
 * This file holds no colors, sizes, positions or image paths — and no
 * device forks.
 *
 * This file keeps only presentation: widget helpers, screen rendering,
 * navigation index, and transient animation state (egg-spin frames,
 * locked-fight reveal). It holds no balance constants and no game formulas.
 */

// ---------------------------------------------------------------------------
// Engine (injected with the platform adapters)
// ---------------------------------------------------------------------------

const engine = createGameEngine({
  storage: {
    load() {
      let raw = null;
      try {
        raw = storageAdapter.load();
      } catch (_) {
        raw = null;
      }
      try {
        return coerceLoadedSave(raw, timeAdapter.getTime());
      } catch (_) {
        return null;
      }
    },
    save(state) {
      try {
        storageAdapter.save(state);
      } catch (_) {}
    },
  },
  getTime: () => timeAdapter.getTime(),
  getSteps: () => sensorAdapter.getSteps(),
});

// ---------------------------------------------------------------------------
// Transient UI state (navigation + animations; never persisted)
// ---------------------------------------------------------------------------

let _page = null;
let _widgets = [];
let _tickTimer = null;
let _spinTimer = null;
let _fightTimer = null;

// Screen: 0 = main, 1..N = dragon detail (roster order).
let _screenIndex = 0;
// Equipment page overlay: dragon id while its equipment page is open, else
// null. _screenIndex is untouched so Back returns to the same dragon page.
let _equipmentDragonId = null;
// Villages overlay: null, or { kind: 'list' } for the villages view, or
// { kind: 'village', villageId } for one village page. Like the equipment
// overlay it sits on top of the current screen (Home returns to Main).
let _villagesScreen = null;
// Modal: null or { kind, ...payload }.
let _modal = null;
// Fight screen: null or the replay state for an already-resolved fight
// (see openFightScreen). The engine decides the outcome instantly and
// persists it; this only animates the returned turns.
let _fight = null;

// ---------------------------------------------------------------------------
// Small view helpers over the engine state
// ---------------------------------------------------------------------------

function roster() {
  return engine.getState().player.dragons;
}

function currentDragonId() {
  if (_screenIndex <= 0) return null;
  const list = roster();
  const entry = list[_screenIndex - 1];
  return entry ? entry.id : null;
}

function currentView() {
  const id = currentDragonId();
  return id ? engine.getDragonView(id) : null;
}

// ---------------------------------------------------------------------------
// Navigation (tap-only; no swipe/GESTURE — unreliable on real device).
// Main hub uses the bottom roster-strip thumbnails; detail screens return
// via Home. goTo clamps into [0, roster.length].
// ---------------------------------------------------------------------------

function goTo(index) {
  _screenIndex = clamp(index, 0, roster().length);
  _equipmentDragonId = null;
  _villagesScreen = null;
  _fight = null;
  closeTimersForScreen();
  if (_page) _page.render();
}

function openEquipment(dragonId) {
  _equipmentDragonId = dragonId;
  _modal = null;
  if (_page) _page.render();
}

function openVillagesList() {
  _villagesScreen = { kind: 'list' };
  _modal = null;
  if (_page) _page.render();
}

function openVillage(villageId) {
  _villagesScreen = { kind: 'village', villageId };
  _modal = null;
  if (_page) _page.render();
}

function closeEquipment() {
  _equipmentDragonId = null;
  if (_page) _page.render();
}

function closeTimersForScreen() {
  if (_spinTimer) {
    clearInterval(_spinTimer);
    _spinTimer = null;
  }
  if (_fightTimer) {
    clearInterval(_fightTimer);
    _fightTimer = null;
  }
}

function openModal(modal) {
  _modal = modal;
  if (_page) _page.render();
}

function closeModal() {
  if (_modal && _modal.locked) return;
  _modal = null;
  closeTimersForScreen();
  if (_page) _page.render();
}

// ---------------------------------------------------------------------------
// Widget helpers (koala style: collect + delete on re-render)
// ---------------------------------------------------------------------------

function push(w) {
  _widgets.push(w);
  return w;
}

function addText(x, y, w, h, text, size, color, alignH) {
  return push(
    hmUI.createWidget(hmUI.widget.TEXT, {
      x, y, w, h,
      text: String(text),
      text_size: size || TEXT_DEFAULT_SIZE,
      color: color === undefined ? COLOR_WHITE : color,
      align_h: alignH || hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    }),
  );
}

// Translucent surfaces (text pills, modal dim, bg dimming) use FILL_RECT
// with a separate alpha prop (API 3.0+: 0-255, 255 opaque, 0 transparent).
// Color stays 24-bit RGB — never pack alpha into color as 8-digit ARGB.
// Common alphas: 255 = 100%, 192 = 75%, 128 = 50%, 64 = 25%, 0 = 0%.

// Generic translucent rect with rounded corners. Radius defaults to 0
// (sharp corners for full-screen dims); pass a radius for pills/panels.
function addShade(x, y, w, h, onTap, opts) {
  const o = opts || {};
  // Allow addShade(x, y, w, h, { alpha, radius, color }) too.
  if (onTap && typeof onTap === 'object' && !opts) {
    return addShade(x, y, w, h, null, onTap);
  }
  const rect = push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w, h,
      color: o.color === undefined ? SHADE_COLOR : o.color,
      alpha: o.alpha === undefined ? SHADE_ALPHA : o.alpha,
      radius: o.radius === undefined ? SHADE_DEFAULT_RADIUS : o.radius,
    }),
  );
  if (onTap) rect.addEventListener(hmUI.event.CLICK_DOWN, onTap);
  return rect;
}

// Dark pill behind a text line so it stays readable over bright backgrounds.
// The pill wraps the text (auto-sized + centered) instead of stretching full width.
function addBadgeText(x, y, w, h, text, size, color, alignH) {
  const pad = BADGE_PAD;
  const str = String(text);
  const fs = size || TEXT_DEFAULT_SIZE;
  const estTextW = Math.ceil(str.length * fs * BADGE_WIDTH_FACTOR);
  const pillW = Math.max(BADGE_MIN_W, Math.min(w, estTextW + pad * 2));
  const isLeft = alignH !== undefined && alignH !== null
    && (alignH === hmUI.align.LEFT || alignH === 'left' || alignH === 'LEFT');
  let pillX;
  let textX;
  const textW = Math.max(BADGE_TEXT_MIN_W, pillW - pad * 2);
  if (isLeft) {
    pillX = x;
    textX = x + pad;
  } else {
    pillX = Math.round(x + (w - pillW) / 2);
    textX = pillX + pad;
  }
  addShade(Math.max(0, pillX), y, pillW, h, null, {
    radius: Math.min(Math.floor(Math.min(pillW, h) / 2), TEXT_PILL_RADIUS),
  });
  return addText(textX, y, textW, h, str, fs, color, alignH);
}

// Large centered coin (64x64) with the amount rendered right below it.
// No dark pill/shade — the caller picks the text color for the surface
// (black on the bright home bg, white inside dark modals).
function addCoinBig(cx, iconY, coins, textY, textH, fontSize, color) {
  const s = ICON_SIZE;
  addImg(Math.round(cx - s / 2), iconY, s, s, ASSET_COIN_64);
  addText(Math.round(cx - COIN_BIG_TEXT_W / 2), textY, COIN_BIG_TEXT_W, textH, String(coins), fontSize, color);
}

function addImg(x, y, w, h, src, onTap, alpha) {
  // Allow addImg(x, y, w, h, src, { alpha, onTap }) too.
  let tap = onTap;
  let a = alpha;
  if (tap && typeof tap === 'object') {
    a = tap.alpha !== undefined ? tap.alpha : a;
    tap = tap.onTap || tap.tap || null;
  }
  // IMG supports `alpha` (API 3.0+: 0-255, 255 opaque, 128 ~= 50%).
  const props = { x, y, w, h, src };
  if (a !== undefined && a !== null) props.alpha = a;
  const img = push(hmUI.createWidget(hmUI.widget.IMG, props));
  if (tap) img.addEventListener(hmUI.event.CLICK_DOWN, tap);
  return img;
}

function addRect(x, y, w, h, color, radius, onTap, alpha) {
  const rect = push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w, h, color, radius: radius || RECT_DEFAULT_RADIUS,
      alpha: alpha === undefined ? RECT_DEFAULT_ALPHA : alpha,
    }),
  );
  if (onTap) rect.addEventListener(hmUI.event.CLICK_DOWN, onTap);
  return rect;
}

function addButton(x, y, w, h, text, onTap, opts) {
  const o = opts || {};
  return push(
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x, y, w, h,
      text: String(text),
      radius: o.radius === undefined ? BTN_RADIUS : o.radius,
      color: COLOR_BTN_TEXT,
      normal_color: o.normal === undefined ? BTN_GREEN : o.normal,
      press_color: o.press === undefined ? BTN_GREEN_PRESS : o.press,
      text_size: o.size || BTN_FONT,
      click_func: () => {
        if (onTap) onTap();
      },
    }),
  );
}

function addEnergyBar(x, y, w, h, src, value, max) {
  addImg(x, y, w, h, src);
  const filled = energySegmentsFilled(value, max);
  if (filled <= 0) return;
  const color = energySegmentColor(value, max);
  const sx = w / ENERGY_BAR_NATIVE_W;
  const sy = h / ENERGY_BAR_NATIVE_H;
  const ry0 = Math.round(ENERGY_SEG_Y0 * sy) + ENERGY_SEG_INSET;
  const ry1 = Math.round((ENERGY_SEG_Y1 + 1) * sy) - ENERGY_SEG_INSET;
  const segH = Math.max(1, ry1 - ry0);
  for (let i = 0; i < filled; i += 1) {
    const rx0 = Math.round(ENERGY_SEG_X0[i] * sx) + ENERGY_SEG_INSET;
    const rx1 = Math.round((ENERGY_SEG_X1[i] + 1) * sx) - ENERGY_SEG_INSET;
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: x + rx0, y: y + ry0, w: Math.max(1, rx1 - rx0), h: segH, color, radius: 2,
    }));
  }
}

function addIconButton(x, y, size, src, onTap, dimmed) {
  // Disabled state = 50% opacity via IMG alpha (IMG supports `alpha`).
  // The tap handler stays attached so a dimmed icon still explains why
  // (egg blocked modal, train warning, monster empty state) instead of
  // going dead.
  return addImg(x, y, size, size, src, onTap, dimmed ? IMG_DISABLED_ALPHA : undefined);
}

// Equipment slot metadata (page-side labels + art; prices/bonuses come
// from engine.getEquipmentCatalogue() — the single source of truth).
// One piece per slot: head / wings / tail + one guard per leg.
const EQUIP_SLOTS = [
  { id: 'head', label: 'Head', art: ASSET_EQUIP_HELM_72 },
  { id: 'wings', label: 'Wings', art: ASSET_EQUIP_WING_72 },
  { id: 'tail', label: 'Tail', art: ASSET_EQUIP_TAIL_72 },
  { id: 'leg-front-left', label: 'Leg FL', art: ASSET_EQUIP_LEG_72 },
  { id: 'leg-front-right', label: 'Leg FR', art: ASSET_EQUIP_LEG_72 },
  { id: 'leg-back-left', label: 'Leg BL', art: ASSET_EQUIP_LEG_72 },
  { id: 'leg-back-right', label: 'Leg BR', art: ASSET_EQUIP_LEG_72 },
];

function equipSlotMeta(slotId) {
  return EQUIP_SLOTS.find((s) => s.id === slotId) || null;
}

// Strength visual: 5 strength = 1 silver star, 5 silver = 1 gold star
// (25 strength = 1 gold; 30 = 1 gold + 1 silver; base max 125 = 5 gold,
// combat max 151 with full gear = 6 gold). 16px stars with a tiny 2px
// gap, centered on cx.
function addStrengthStars(cx, y, strength) {
  const stars = starsForStrength(strength);
  const total = stars.gold + stars.silver;
  if (total <= 0) return;
  const width = total * STAR_S + (total - 1) * STAR_GAP;
  let x = Math.round(cx - width / 2);
  for (let i = 0; i < stars.gold; i += 1) {
    addImg(x, y, STAR_S, STAR_S, ASSET_GOLD_STAR_16);
    x += STAR_S + STAR_GAP;
  }
  for (let i = 0; i < stars.silver; i += 1) {
    addImg(x, y, STAR_S, STAR_S, ASSET_SILVER_STAR_16);
    x += STAR_S + STAR_GAP;
  }
}

// ---------------------------------------------------------------------------
// Actions (thin wrappers: engine does the work, page animates the result)
// ---------------------------------------------------------------------------

function startEggSpin() {
  // Gate first (no spin when broke / roster full); the breed is drawn at stop.
  const gate = engine.spinEggPreview();
  if (!gate.ok) {
    openModal({ kind: 'egg-spin', blocked: true, reason: gate.reason });
    return;
  }
  _modal = { kind: 'egg-spin', mode: 'spin', blocked: false, spinning: true, symbolIdx: 0, breedIndex: null };
  if (_page) _page.render();
  if (_spinTimer) clearInterval(_spinTimer);
  const symbols = CONFIG.ui.eggSpinSymbols;
  _spinTimer = setInterval(() => {
    if (!_modal || _modal.kind !== 'egg-spin' || !_modal.spinning) {
      if (_spinTimer) {
        clearInterval(_spinTimer);
        _spinTimer = null;
      }
      return;
    }
    _modal.symbolIdx = (_modal.symbolIdx + 1) % symbols.length;
    if (_page) _page.render();
  }, CONFIG.ui.eggSpinFrameMs);
}

function stopEggSpin() {
  if (!_modal || _modal.kind !== 'egg-spin' || !_modal.spinning) return;
  // Spin-then-pay: the frozen moment maps to a breed.
  const preview = engine.spinEggPreview();
  if (!preview.ok) {
    _modal.blocked = true;
    _modal.reason = preview.reason;
  } else {
    _modal.spinning = false;
    _modal.breedIndex = preview.breedIndex;
  }
  if (_spinTimer) {
    clearInterval(_spinTimer);
    _spinTimer = null;
  }
  if (_page) _page.render();
}

// Shared tail of both egg purchases: a refused buy re-blocks the modal,
// a success closes it and jumps to the new egg's page.
function finishEggPurchase(res) {
  if (!res.ok) {
    _modal.blocked = true;
    _modal.reason = res.reason;
    if (_page) _page.render();
    return;
  }
  _modal = null;
  closeTimersForScreen();
  _screenIndex = roster().length;
  if (_page) _page.render();
}

function confirmEgg() {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.blocked || modal.spinning) return;
  finishEggPurchase(engine.confirmEggPurchase(modal.breedIndex));
}

// Choose-a-specific-egg mode (150 coins): entered via the ">" arrow in the
// random-spin modal. Shows the first egg (index 0); left/right arrows cycle
// the catalogue with wrap-around; Buy deducts CONFIG.egg.choosePrice.
function enterEggChoose() {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.blocked) return;
  if (!engine.canBuyChosenEgg()) return;
  if (_spinTimer) {
    clearInterval(_spinTimer);
    _spinTimer = null;
  }
  _modal = { kind: 'egg-spin', mode: 'choose', blocked: false, spinning: false, breedIndex: null, chooseIndex: 0 };
  if (_page) _page.render();
}

function cycleEggChoose(delta) {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.mode !== 'choose') return;
  const cur = typeof modal.chooseIndex === 'number' ? modal.chooseIndex : 0;
  modal.chooseIndex = wrapIndex(cur, delta, CONFIG.egg.breedCount);
  if (_page) _page.render();
}

function confirmChosenEgg() {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.mode !== 'choose') return;
  const idx = typeof modal.chooseIndex === 'number' ? modal.chooseIndex : 0;
  finishEggPurchase(engine.confirmChosenEggPurchase(idx));
}

function hatchEgg(dragonId) {
  const res = engine.hatchDragon(dragonId);
  if (!res.ok) return;
  if (_page) _page.render();
}

function startTrain(dragonId) {
  const res = engine.trainDragon(dragonId);
  if (!res.ok) return;
  openModal({
    kind: 'train-result',
    dragonId,
    gain: res.gain,
    strengthAfter: res.strengthAfter,
    leveledUp: res.levelAfter > res.levelBefore,
    levelAfter: res.levelAfter,
    energyCost: res.energyCost,
    energyAfter: res.energyAfter,
  });
}

function confirmSell(dragonId) {
  const res = engine.sellDragon(dragonId);
  if (!res.ok) return;
  _modal = null;
  _screenIndex = 0;
  if (_page) _page.render();
}

function openMonsterSelect(dragonId) {
  const res = engine.openMonsterSelect(dragonId);
  if (!res.ok) return;
  openModal({ kind: 'monster-select', dragonId });
}

function startMonsterFight(dragonId, monsterId) {
  const view = engine.getDragonView(dragonId);
  const monster = engine.getSpawnedMonsters().find((m) => m.id === monsterId);
  if (!view || !monster) return;
  // Snapshot entry HP BEFORE resolving: the engine decides the outcome
  // instantly and persists it (anti-cheat), so the screen replays from
  // this snapshot turn by turn.
  const entryEnergy = view.energy;
  const res = engine.fightMonster(dragonId, monsterId);
  if (!res.ok) return;
  openFightScreen({
    kind: 'monster',
    title: 'Fight',
    units: [
      { asset: dragonAsset60(view.breed.assetKey), maxHp: entryEnergy, hp: entryEnergy, size: FIGHT_DRAGON_S },
      { asset: monsterAsset72(monster.image), maxHp: monster.hp, hp: monster.hp, size: FIGHT_ENEMY_S },
    ],
    turns: res.turns.map((t) => ({
      attacker: t.attackerKind === 'dragon' ? 0 : 1,
      target: t.attackerKind === 'dragon' ? 1 : 0,
      hit: t.hit,
      hpAfter: t.targetHpAfter,
      text: t.text,
    })),
    outcomeText: res.won
      ? 'Victory! +' + res.coinReward + ' coins, +' + res.strengthGain + ' strength'
      : 'Defeat — rest to recover',
    returnDragonId: dragonId,
  });
}

function startVillageAttack(villageId) {
  const village = engine.getVillageView(villageId);
  if (!village || village.captured) return;
  const participants = engine.getBeastParticipants();
  const views = participants
    .map((d) => engine.getDragonView(d.id))
    .filter((v) => v !== null);
  if (views.length === 0) return;
  // Defender portraits + HP bars for the fight screen (the battle itself
  // is what reveals the enemy fleet — the village page never sees these).
  const defenders = engine.getVillageDefenders(villageId);
  if (defenders.length === 0) return;
  // Snapshot entry HP BEFORE resolving (same anti-cheat rule as monsters).
  const res = engine.attackVillage(villageId);
  if (!res.ok) return;
  const playerCount = views.length;
  const byId = new Map(views.map((v, i) => [v.dragon.id, i]));
  const defById = new Map(defenders.map((d, i) => [d.id, i]));
  openFightScreen({
    kind: 'village',
    title: village.name,
    units: [
      ...views.map((v) => ({
        asset: dragonAsset60(v.breed.assetKey),
        maxHp: v.energy,
        hp: v.energy,
        size: FIGHT_DRAGON_S,
      })),
      ...defenders.map((d) => ({
        asset: dragonAsset60((findBreed(d.breedId) || breedForIndex(0)).assetKey),
        maxHp: d.maxHp,
        hp: d.maxHp,
        size: FIGHT_ENEMY_S,
      })),
    ],
    enemyCount: defenders.length,
    turns: res.turns.map((t) => {
      if (t.attackerKind === 'dragon') {
        return {
          attacker: byId.get(t.attackerId) ?? 0,
          target: playerCount + (defById.get(t.targetId) ?? 0),
          hit: t.hit,
          hpAfter: t.targetHpAfter,
          text: t.text,
        };
      }
      return {
        attacker: playerCount + (defById.get(t.attackerId) ?? 0),
        target: byId.get(t.targetId) ?? 0,
        hit: t.hit,
        hpAfter: t.targetHpAfter,
        text: t.text,
      };
    }),
    outcomeText: res.won
      ? 'Victory! Captured ' + village.name + ' +' + res.fortune + ' coins'
      : 'Defeat — dragons lost. The village stands.',
    returnDragonId: null,
    returnVillageId: villageId,
  });
}

function startBeastFight() {
  if (!engine.canFightBeast().ok) return;
  const participants = engine.getBeastParticipants();
  const views = participants
    .map((d) => engine.getDragonView(d.id))
    .filter((v) => v !== null);
  if (views.length === 0) return;
  // Snapshot entry HP BEFORE resolving (same anti-cheat rule as monsters).
  const hpBefore = engine.getState().beast.currentHp;
  const maxHp = engine.getState().beast.maxHp;
  const res = engine.fightBeast();
  if (!res.ok) return;
  const enemyIndex = views.length;
  const byId = new Map(views.map((v, i) => [v.dragon.id, i]));
  openFightScreen({
    kind: 'beast',
    title: CONFIG.beast.name,
    units: [
      ...views.map((v) => ({
        asset: dragonAsset60(v.breed.assetKey),
        maxHp: v.energy,
        hp: v.energy,
        size: FIGHT_DRAGON_S,
      })),
      { asset: ASSET_BEAST_72, maxHp, hp: hpBefore, size: FIGHT_ENEMY_S },
    ],
    turns: res.turns.map((t) => {
      if (t.attackerKind === 'dragon') {
        return {
          attacker: byId.get(t.attackerId) ?? 0,
          target: enemyIndex,
          hit: t.hit,
          hpAfter: t.targetHpAfter,
          text: t.text,
        };
      }
      return {
        attacker: enemyIndex,
        target: byId.get(t.targetId) ?? 0,
        hit: t.hit,
        hpAfter: t.targetHpAfter,
        text: t.text,
      };
    }),
    outcomeText: res.won
      ? 'Beast defeated! +' + res.reward + ' coins, +strength'
      : 'Defeat — roster lost. Buy a new egg.',
    returnDragonId: null,
  });
}

// Fight screen: full-screen animated replay of an already-resolved fight.
// Phases per turn (in fight-screen ticks): aim (attacker highlights) ->
// fly (fireball travels attacker -> target) -> impact (HP bar steps to
// the turn's hpAfter, hit burst / MISS shows) -> next turn. Tapping
// anywhere during the replay skips to the outcome; Continue appears
// only after the last turn.
const FIGHT_PHASE_TICKS = { aim: 2, fly: 4, impact: 5 };

function openFightScreen({ kind, title, units, turns, outcomeText, returnDragonId, enemyCount, returnVillageId }) {
  _modal = null;
  _equipmentDragonId = null;
  // Player units first, then `enemyCount` enemy units (1 for monster /
  // beast, 2-4 village defenders). Rects come from fightUnitRects with
  // the same split, so dragons stay left and enemies stack right.
  const enemies = enemyCount || 1;
  const playerCount = units.length - enemies;
  const rects = fightUnitRects({
    dragonCount: playerCount,
    enemyCount: enemies,
    shape: DEVICE.shape,
    arenaY: FIGHT_ARENA_Y,
    arenaH: FIGHT_ARENA_H,
    leftX: FIGHT_LEFT_X,
    leftXWide: FIGHT_LEFT_X_WIDE,
    colGap: FIGHT_COL_GAP,
    enemyX: FIGHT_ENEMY_X,
    enemyXWide: FIGHT_ENEMY_X_WIDE,
    dragonS: FIGHT_DRAGON_S,
    enemyS: FIGHT_ENEMY_S,
    barH: FIGHT_HP_BAR_H,
    barGap: FIGHT_HP_BAR_GAP,
    rowGap: FIGHT_ROW_GAP,
  });
  units.forEach((u, i) => {
    u.rect = i < playerCount ? rects.dragons[i] : rects.enemies[i - playerCount];
  });
  _fight = {
    kind,
    title,
    units,
    turns,
    outcomeText,
    returnDragonId,
    returnVillageId: returnVillageId || null,
    turnIndex: 0,
    phase: 'aim',
    phaseTicks: 0,
    fireball: null,
    impact: null,
    miss: null,
    log: 'Tap anywhere to skip',
    done: false,
  };
  if (_fightTimer) clearInterval(_fightTimer);
  _fightTimer = setInterval(stepFightScreen, CONFIG.ui.fightScreenTickMs);
  if (_page) _page.render();
}

function fightUnitCenter(unit) {
  return {
    x: unit.rect.x + unit.size / 2,
    y: unit.rect.y + unit.size / 2,
  };
}

function stepFightScreen() {
  const f = _fight;
  if (!f || f.done) {
    if (_fightTimer) {
      clearInterval(_fightTimer);
      _fightTimer = null;
    }
    return;
  }
  const turn = f.turns[f.turnIndex];
  if (!turn) {
    finishFightScreen();
    return;
  }
  f.phaseTicks += 1;
  if (f.phase === 'aim') {
    if (f.phaseTicks >= FIGHT_PHASE_TICKS.aim) {
      f.phase = 'fly';
      f.phaseTicks = 0;
      f.fireball = fightFireballPos(
        fightUnitCenter(f.units[turn.attacker]),
        fightUnitCenter(f.units[turn.attacker]),
        0,
        FIGHT_FIREBALL_S,
      );
    }
  } else if (f.phase === 'fly') {
    f.fireball = fightFireballPos(
      fightUnitCenter(f.units[turn.attacker]),
      fightUnitCenter(f.units[turn.target]),
      f.phaseTicks / FIGHT_PHASE_TICKS.fly,
      FIGHT_FIREBALL_S,
    );
    if (f.phaseTicks >= FIGHT_PHASE_TICKS.fly) {
      // Impact: the bar steps to the already-resolved HP; the turn text
      // narrates hit/miss (the engine decided both up front).
      f.units[turn.target].hp = turn.hpAfter;
      const center = fightUnitCenter(f.units[turn.target]);
      f.fireball = null;
      f.impact = turn.hit ? center : null;
      f.miss = turn.hit ? null : center;
      f.log = turn.text;
      f.phase = 'impact';
      f.phaseTicks = 0;
    }
  } else if (f.phase === 'impact') {
    if (f.phaseTicks >= FIGHT_PHASE_TICKS.impact) {
      f.turnIndex += 1;
      f.phaseTicks = 0;
      f.impact = null;
      f.miss = null;
      if (f.turnIndex >= f.turns.length) {
        finishFightScreen();
        return;
      }
      f.phase = 'aim';
    }
  }
  if (_page) _page.render();
}

function finishFightScreen() {
  const f = _fight;
  if (!f) return;
  f.done = true;
  f.phase = 'done';
  f.fireball = null;
  f.impact = null;
  f.miss = null;
  f.log = f.outcomeText;
  if (_fightTimer) {
    clearInterval(_fightTimer);
    _fightTimer = null;
  }
  if (_page) _page.render();
}

// Tap anywhere during the replay: apply every remaining turn at once and
// show the outcome. Continue still gates leaving the screen.
function skipFightScreen() {
  const f = _fight;
  if (!f || f.done) return;
  for (let i = f.turnIndex; i < f.turns.length; i++) {
    f.units[f.turns[i].target].hp = f.turns[i].hpAfter;
  }
  f.turnIndex = f.turns.length;
  finishFightScreen();
}

function closeFightScreen() {
  if (!_fight) return;
  const returnId = _fight.returnDragonId;
  const returnVillageId = _fight.returnVillageId;
  _fight = null;
  if (_fightTimer) {
    clearInterval(_fightTimer);
    _fightTimer = null;
  }
  if (returnVillageId) {
    // Village fight: back to that village's page (shows Captured now).
    _villagesScreen = { kind: 'village', villageId: returnVillageId };
    if (_page) _page.render();
    return;
  }
  if (returnId) {
    const idx = roster().findIndex((d) => d.id === returnId);
    goTo(idx >= 0 ? idx + 1 : 0);
  } else {
    goTo(0);
  }
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function renderMain(width) {
  const economy = engine.getEconomyView();
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_HOME_SRC);

  // Balance: large coin centered with the amount on a dark pill right below.
  const balanceCx = Math.floor(width / 2);
  addImg(Math.round(balanceCx - BALANCE_ICON_S / 2), BALANCE_ICON_Y, BALANCE_ICON_S, BALANCE_ICON_S, ASSET_COIN_64);
  addBadgeText(0, BALANCE_TEXT_Y, width, BALANCE_TEXT_H, String(economy.coins), BALANCE_FONT, COLOR_WHITE);

  // Buy Egg — top-left, icon only (no label). 50% opacity via IMG alpha
  // when a purchase isn't available (broke or roster full); tap still
  // opens the blocked modal explaining why (startEggSpin gates first).
  addIconButton(EGG_BTN_X, EGG_BTN_Y, EGG_BTN_S, ASSET_EGG_128, startEggSpin, !engine.canBuyEgg());

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - BEAST_BTN_OFFSET_X, BEAST_BTN_Y, BEAST_BTN_S, ASSET_BEAST_128, () => {
    openModal({ kind: 'beast-intro' });
  }, false);

  // Map (villages) — bottom-right, same row as Earn Coins. Opens the
  // villages view: a grid of villages, each an icon + name.
  addIconButton(MAP_BTN_X, MAP_BTN_Y, MAP_BTN_S, ASSET_MAP_84, openVillagesList, false);

  // Earn Coins — centered horizontally, slightly below the screen center,
  // only when collectible coins exist.
  if (economy.hasCollectible) {
    const coinS = EARN_ICON_S;
    addBadgeText(0, EARN_TEXT_Y, width, EARN_TEXT_H, '+' + economy.collectible + ' coins', EARN_FONT, COLOR_COIN);
    addIconButton(Math.floor((width - coinS) / 2), EARN_ICON_Y, coinS, ASSET_COIN_64, () => {
      openModal({ kind: 'coin-summary', amount: engine.getEconomyView().collectible });
    }, false);
  }

  renderNav(width);
}

function renderDragon(width, view) {
  const breed = view.breed;
  const egg = view.stage === 'egg';
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_DRAGON_SRC);
  // Dim the bright bg artwork so the dragon and UI stay visible.
  addShade(0, 0, width, DEVICE.height);

  if (egg) {
     // Still hatching: hide the breed so the dragon stays a surprise.
   } else {
     addBadgeText(0, DRAGON_NAME_Y, width, DRAGON_NAME_H, formatDragonName(breed.name, view.ageDays), DRAGON_NAME_FONT, COLOR_WHITE);
   }

   const imgSize = DRAGON_IMG_S;
   const imgX = Math.floor((width - imgSize) / 2);
   const imgY = DRAGON_IMG_Y;
   // Ground shadow under the egg / dragon (drawn first so it stays behind).
   const shW = SHADOW_W;
   const shH = SHADOW_H;
    addImg(Math.floor((width - shW) / 2), imgY + imgSize + SHADOW_Y_OFFSET, shW, shH, ASSET_SHADOW);
    if (egg) {
      addImg(imgX, imgY, imgSize, imgSize, eggAsset240(breed.assetKey));
    } else {
      addImg(imgX, imgY + DRAGON_IMG_HATCHED_OFFSET, imgSize, imgSize, dragonAsset240(breed.assetKey));
    }

   // Energy (segmented gold bar) with strength stars centered right below it
   // (drawn after the dragon so they sit above).
   if (!egg) {
      addEnergyBar(ENERGY_BAR_X, ENERGY_BAR_Y, ENERGY_BAR_W, ENERGY_BAR_H, ASSET_ENERGY_BAR_250, view.energy, CONFIG.energy.max);
     // Stars show COMBAT strength (base + gear) — that is what fights use.
     addStrengthStars(Math.floor(width / 2), DRAGON_STARS_Y, view.combatStrength ?? view.strength);
     // Equipment: icon button left of the energy bar (mirror of "?")
     // opens this dragon's equipment page (7 slots, buy per empty slot).
     addIconButton(EQUIP_BTN_X, EQUIP_BTN_Y, EQUIP_BTN_S, ASSET_EQUIPMENT_40, () => openEquipment(view.dragon.id), false);
     // Battle record: small "?" button right of the energy bar opens the
     // per-dragon combat-stats modal (wins by difficulty + coins earned).
     addButton(STATS_BTN_X, STATS_BTN_Y, STATS_BTN_S, STATS_BTN_S, '?', () => openModal({ kind: 'combat-stats', dragonId: view.dragon.id }));
   } else if (view.canHatch) {
     // Manual hatch: the hidden timer is due — satisfying green button tap.
     addBadgeText(0, HATCH_TEXT_Y, width, HATCH_TEXT_H, 'Ready to hatch!', HATCH_TEXT_FONT, COLOR_SUCCESS);
     addButton(Math.round((width - BTN_W) / 2), HATCH_BTN_Y, BTN_W, BTN_H, 'Hatch', () => hatchEgg(view.dragon.id));
   }

// Bottom action row — pinned to the very bottom (no roster strip on this
   // page). Eggs show Home + Sell; hatched dragons always show
   // 4 fixed slots: Home / Sell / Danger / Training, evenly spread with 20px
   // side paddings. Fixed slots keep Training pinned right when Danger is
   // unavailable. Danger is 50% opacity when no monsters wait or the dragon
   // is tired (no energy); Training is 50% when view.canTrain is false
   // (no energy or not enough coins). Dimmed taps still open their modals
   // (train warning / monster empty state) instead of going dead.
   // Each icon uses its exact pre-scaled size (home/sell/training 84x84,
   // danger 72x72 -> rendered at ACTION_ICON_S), bottom-aligned.
   const sidePad = ACTION_SIDE_PAD;
   const bottom = DEVICE.height - ACTION_BOTTOM_PAD;
   const homeCell = { src: ASSET_HOME_84, size: ACTION_ICON_S, dimmed: false, tap: () => goTo(0) };
   const sellCell = { src: ASSET_SELL_84, size: ACTION_ICON_S, dimmed: false, tap: () => openModal({ kind: 'sell', dragonId: view.dragon.id }) };
   if (egg) {
     renderActionRow(width, sidePad, bottom, [homeCell, sellCell]);
   } else {
     const hasMonsters = engine.getSpawnedMonsters().length > 0;
     renderActionRow(width, sidePad, bottom, [
       homeCell,
       sellCell,
       { src: ASSET_DANGER_84, size: ACTION_ICON_S, dimmed: !hasMonsters || !view.canFight, tap: () => openMonsterSelect(view.dragon.id) },
       { src: ASSET_TRAINING_84, size: ACTION_ICON_S, dimmed: !view.canTrain, tap: () => openModal({ kind: 'train', dragonId: view.dragon.id }) },
     ]);
   }
}

// Bottom action row: evenly-spread icons pinned to the bottom edge,
// bottom-aligned. Shared by the egg page (Home + Sell) and the hatched
// page (Home / Sell / Danger / Training).
function renderActionRow(width, sidePad, bottom, cells) {
  const xs = actionRowPositions(width, sidePad, ACTION_ICON_S, cells.length);
  cells.forEach((cell, i) => {
    addIconButton(xs[i], bottom - cell.size, cell.size, cell.src, cell.tap, cell.dimmed);
  });
}

function renderRosterStrip(width) {
  // Bottom thumbnail navigation: tap a thumbnail to jump to that dragon/egg
  // page. 14px frame-edge (20px thumb-inset) left/right paddings; always
  // 5 slots fill the row exactly.
  // Each slot uses the ornate misc/frame_72x72.png as its pill, with the
  // 60x60 dragon/egg icon centered inside (6px pad). Empty slots render
  // the frame alone so the row is stable even with no dragons/eggs.
  const list = roster();
  const SLOT_N = ROSTER_SLOTS;
  const thumbS = ROSTER_THUMB;
  const frameS = ROSTER_FRAME;
  const left = ROSTER_LEFT;
  const y = DEVICE.height - thumbS - ROSTER_BOTTOM_PAD;
  const pad = Math.round((frameS - thumbS) / 2);
  const { start, count } = rosterWindow(list.length, _screenIndex, SLOT_N);
  const visible = list.slice(start, start + count);
  const step = (width - left * 2 - thumbS) / (SLOT_N - 1);
  for (let i = 0; i < SLOT_N; i++) {
    const x = Math.round(left + i * step);
    const d = visible[i];
    if (!d) {
      addImg(x - pad, y - pad, frameS, frameS, ASSET_FRAME_72);
      continue;
    }
    const idx = start + i;
    let src = FALLBACK_ROSTER_ICON;
    try {
      const v = engine.getDragonView(d.id);
      if (v) src = v.stage === 'egg'
        ? eggAsset60(v.breed.assetKey)
        : dragonAsset60(v.breed.assetKey);
    } catch (_) {}
    const tap = () => goTo(idx + 1);
    addImg(x - pad, y - pad, frameS, frameS, ASSET_FRAME_72, tap);
    addImg(x, y, thumbS, thumbS, src, tap);
  }
}

function renderNav(width) {
  // Page indicator (1/2, 2/2) intentionally not rendered.
  renderRosterStrip(width);
}

// ---------------------------------------------------------------------------
// Villages (§16): list grid + village page
// ---------------------------------------------------------------------------

function renderVillagesList(width) {
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_HOME_SRC);
  addShade(0, 0, width, DEVICE.height);
  addBadgeText(0, DRAGON_NAME_Y, width, DRAGON_NAME_H, 'Villages', DRAGON_NAME_FONT, COLOR_WHITE);
  const villages = engine.getVillages();
  const sidePad = ACTION_SIDE_PAD;
  const xs = actionRowPositions(width, sidePad, VILLAGE_ICON_S, 3);
  villages.forEach((v, i) => {
    const row = Math.floor(i / 3);
    const x = xs[i % 3];
    const y = VILLAGE_GRID_Y + row * VILLAGE_ROW_H;
    addImg(x, y, VILLAGE_ICON_S, VILLAGE_ICON_S, villageAsset72(v.tier), () => openVillage(v.id));
    if (v.captured) {
      // Captured checkmark: small badge at the icon's top-right corner.
      addImg(x + VILLAGE_ICON_S - 16, y - 8, 32, 32, ASSET_CHECKMARK_32);
    }
    addText(x - 24, y + VILLAGE_ICON_S + 2, VILLAGE_ICON_S + 48, 20, v.name, VILLAGE_NAME_FONT, COLOR_WHITE);
    addText(x - 24, y + VILLAGE_ICON_S + 22, VILLAGE_ICON_S + 48, 20, v.tierLabel, VILLAGE_NAME_FONT, COLOR_MUTED);
  });
  const navY = DEVICE.height - ACTION_BOTTOM_PAD - BTN_H;
  addButton(Math.round((width - BTN_W) / 2), navY, BTN_W, BTN_H, 'Home', () => goTo(0));
}

function renderVillagePage(width, villageId) {
  const village = engine.getVillageView(villageId);
  if (!village) {
    // Village gone (shouldn't happen — villages never delete) — fall
    // back to the list instead of rendering a broken page.
    renderVillagesList(width);
    return;
  }
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_DRAGON_SRC);
  addShade(0, 0, width, DEVICE.height);
  addBadgeText(0, DRAGON_NAME_Y, width, DRAGON_NAME_H, village.name, DRAGON_NAME_FONT, COLOR_WHITE);
  const iconS = VILLAGE_PAGE_ICON_S;
  const iconX = Math.floor((width - iconS) / 2);
  const iconY = VILLAGE_PAGE_ICON_Y;
  addImg(iconX, iconY, iconS, iconS, villageAsset128(village.tier));
  if (village.captured) {
    addImg(iconX + iconS - 16, iconY - 8, 32, 32, ASSET_CHECKMARK_32);
  }
  // Public info only: tier label, BUCKETED defender count, BUCKETED
  // fortune hint — never exact counts, strength, HP, or fortune coins.
  const info = [
    'Tier: ' + village.tierLabel,
    'Defenders: ' + village.approxCount,
    'Fortune: ' + village.fortuneHint,
  ];
  info.forEach((line, i) => {
    addText(0, VILLAGE_INFO_Y + i * VILLAGE_INFO_GAP, width, VILLAGE_INFO_H, line, VILLAGE_INFO_FONT, COLOR_WHITE);
  });
  if (village.captured) {
    addText(0, VILLAGE_INFO_Y + info.length * VILLAGE_INFO_GAP, width, VILLAGE_INFO_H, 'Captured!', VILLAGE_INFO_FONT, COLOR_SUCCESS);
  }
  // Bottom nav: Attack + Home. Attack is disabled (grey, no-op) once the
  // village is captured or no dragon can fight.
  const navY = DEVICE.height - ACTION_BOTTOM_PAD - BTN_H;
  const canAttack = !village.captured && engine.getBeastParticipants().length > 0;
  if (canAttack) {
    addButton(ACTION_SIDE_PAD, navY, BTN_W, BTN_H, 'Attack', () => startVillageAttack(villageId));
  } else {
    addButton(ACTION_SIDE_PAD, navY, BTN_W, BTN_H, 'Attack', null, { normal: COLOR_BTN_DISABLED });
  }
  addButton(width - ACTION_SIDE_PAD - BTN_W, navY, BTN_W, BTN_H, 'Home', () => goTo(0));
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function renderModalShell(title, locked) {
  const width = DEVICE.width;
  // Dim shade with a no-op tap so it also swallows clicks in the web
  // runner (where a non-clickable layer has pointer-events:none and
  // would let clicks fall through to icons behind the modal).
  // FILL_RECT with separate alpha (API 3.0+) does the dimming.
  addShade(0, 0, width, DEVICE.height, () => {});
  addRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_COLOR, MODAL_RADIUS, null, PANEL_ALPHA);
  addText(PANEL_X, PANEL_Y + MODAL_TITLE_Y, PANEL_W, MODAL_TITLE_H, title, MODAL_TITLE_FONT, COLOR_WHITE);
  if (!locked) {
    addImg(PANEL_X + PANEL_W - MODAL_CLOSE_OFFSET, PANEL_Y + MODAL_CLOSE_Y, MODAL_CLOSE_S, MODAL_CLOSE_S, ASSET_CLOSE_36, closeModal);
  }
}

function renderEggSpin() {
  const modal = _modal;
  if (modal.blocked) {
    renderModalShell('Get a New Egg', true);
    const full = modal.reason === 'roster-full';
    addText(PANEL_X + MODAL_PAD, PANEL_Y + EGG_BLOCKED_TEXT_Y, PANEL_W - MODAL_PAD * 2, EGG_BLOCKED_TEXT_H, full ? 'Roster is full' : 'Not enough coins', EGG_BLOCKED_FONT, COLOR_ERROR);
    if (!full) {
      addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + EGG_PRICE_ICON_Y, CONFIG.egg.price, PANEL_Y + EGG_PRICE_TEXT_Y, EGG_PRICE_TEXT_H, EGG_PRICE_FONT, COLOR_WHITE);
    }
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', closeModal);
    return;
  }
  // Choose mode: full-size egg (240) with left/right arrows + Buy (150).
  // Title shows the breed name so no extra text line is needed (the 240 egg
  // fills title-to-button exactly on both panels). X is visible so the
  // player can always back out to the random spin (reopen via Buy Egg).
  if (modal.mode === 'choose') {
    const idx = typeof modal.chooseIndex === 'number' ? modal.chooseIndex : 0;
    const breed = breedForIndex(idx);
    renderModalShell(breed.name, false);
    const eggS = EGG_CHOOSE_S;
    addImg(PANEL_X + Math.floor((PANEL_W - eggS) / 2), PANEL_Y + EGG_CHOOSE_Y, eggS, eggS, eggAsset240(breed.assetKey));
    const arrowS = EGG_ARROW_S;
    const arrowY = PANEL_Y + EGG_ARROW_Y;
    addButton(PANEL_X + MODAL_PAD, arrowY, arrowS, arrowS, '<', () => cycleEggChoose(-1));
    addButton(PANEL_X + PANEL_W - MODAL_PAD - arrowS, arrowY, arrowS, arrowS, '>', () => cycleEggChoose(1));
    if (engine.canBuyChosenEgg()) {
      addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + EGG_CHOOSE_BTN_Y, BTN_W, BTN_H, 'Buy (' + CONFIG.egg.choosePrice + ')', confirmChosenEgg);
    } else {
      addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + EGG_CHOOSE_BTN_Y, BTN_W, BTN_H, 'Buy (' + CONFIG.egg.choosePrice + ')', null, { normal: COLOR_BTN_DISABLED });
    }
    return;
  }
  renderModalShell('Get a New Egg', true);
  // Random-spin mode: ">" arrow enters choose mode when the player can
  // afford a specific egg (150 coins + roster room). Same 48x48 arrow,
  // right edge mid-modal, on both the spinning and revealed states.
  const showChooseArrow = engine.canBuyChosenEgg();
  const chooseArrowX = PANEL_X + PANEL_W - MODAL_PAD - EGG_ARROW_S;
  const chooseArrowY = PANEL_Y + EGG_ARROW_Y;
  if (modal.spinning) {
    // The dice is tappable too: rapid re-renders can swallow a button click
    // mid-press, so tapping anywhere on the dice also stops the spin.
    addImg(PANEL_X + EGG_DICE_X, PANEL_Y + EGG_DICE_Y, EGG_DICE_S, EGG_DICE_S, ASSET_DICE_80, stopEggSpin);
    addText(PANEL_X + MODAL_PAD, PANEL_Y + EGG_SPIN_HINT_Y, PANEL_W - MODAL_PAD * 2, EGG_SPIN_HINT_H, 'Tap Reveal to see your egg', EGG_SPIN_HINT_FONT, COLOR_MUTED);
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + EGG_SPIN_BTN_Y, BTN_W, BTN_H, 'Reveal', stopEggSpin);
    if (showChooseArrow) {
      addButton(chooseArrowX, chooseArrowY, EGG_ARROW_S, EGG_ARROW_S, '>', enterEggChoose);
    }
  } else {
    // Breed stays hidden until it hatches — show the egg, not its name.
    const breed = breedForIndex(modal.breedIndex);
    const eggS = EGG_REVEAL_S;
    addImg(PANEL_X + Math.floor((PANEL_W - eggS) / 2), PANEL_Y + EGG_REVEAL_Y, eggS, eggS, eggAsset60(breed.assetKey));
    addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + EGG_REVEAL_PRICE_Y, CONFIG.egg.price, PANEL_Y + EGG_REVEAL_PRICE_TEXT_Y, EGG_PRICE_TEXT_H, EGG_PRICE_FONT, COLOR_WHITE);
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', confirmEgg);
    if (showChooseArrow) {
      addButton(chooseArrowX, chooseArrowY, EGG_ARROW_S, EGG_ARROW_S, '>', enterEggChoose);
    }
  }
}

function renderTrain() {
  const view = engine.getDragonView(_modal.dragonId);
  if (!view || view.stage === 'egg') {
    closeModal();
    return;
  }
  const preview = engine.trainPreview(view.dragon.id);
  renderModalShell('Train ' + view.breed.name, false);
  addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + TRAIN_COIN_Y, preview.cost, PANEL_Y + TRAIN_COIN_TEXT_Y, TRAIN_COIN_TEXT_H, TRAIN_COIN_FONT, COLOR_WHITE);
  addText(PANEL_X + MODAL_PAD, PANEL_Y + TRAIN_ENERGY_Y, PANEL_W - MODAL_PAD * 2, TRAIN_ENERGY_H, '-' + CONFIG.training.energyCost + ' energy per session', TRAIN_ENERGY_FONT, COLOR_MUTED);
  if (!preview.canTrain) {
    const msg = preview.reason === 'no-energy'
      ? 'No energy - recover first'
      : preview.reason === 'not-enough-coins'
        ? 'Not enough coins'
        : 'Cannot train now';
    addText(PANEL_X + MODAL_PAD, PANEL_Y + TRAIN_WARN_Y, PANEL_W - MODAL_PAD * 2, TRAIN_WARN_H, msg, TRAIN_WARN_FONT, COLOR_ERROR);
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'Start', null, { normal: COLOR_BTN_DISABLED });
  } else {
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'Start', () => startTrain(view.dragon.id));
  }
}

function renderTrainResult() {
  renderModalShell('Training', false);
  addImg(PANEL_X + TRAIN_RESULT_ICON_X, PANEL_Y + TRAIN_RESULT_ICON_Y, TRAIN_RESULT_ICON_S, TRAIN_RESULT_ICON_S, ASSET_VICTORY_60);
  const gainLine = _modal.text
    || ('Strength +' + _modal.gain + ' (' + _modal.strengthAfter + ')');
  addText(PANEL_X + MODAL_PAD, PANEL_Y + TRAIN_RESULT_GAIN_Y, PANEL_W - MODAL_PAD * 2, TRAIN_RESULT_GAIN_H, gainLine, TRAIN_RESULT_GAIN_FONT, COLOR_SUCCESS);
  if (_modal.energyCost !== undefined) {
    addText(PANEL_X + MODAL_PAD, PANEL_Y + TRAIN_RESULT_ENERGY_Y, PANEL_W - MODAL_PAD * 2, TRAIN_RESULT_ENERGY_H, '-' + _modal.energyCost + ' energy', TRAIN_RESULT_ENERGY_FONT, COLOR_MUTED);
  }
  if (_modal.leveledUp || (typeof _modal.text === 'string' && _modal.text.indexOf('Level up') !== -1)) {
    const lv = _modal.levelAfter !== undefined
      ? _modal.levelAfter
      : _modal.text.replace(/^.*Lv\s*/, '');
    addText(PANEL_X + MODAL_PAD, PANEL_Y + TRAIN_RESULT_LEVEL_Y, PANEL_W - MODAL_PAD * 2, TRAIN_RESULT_LEVEL_H, 'Level up! Lv ' + lv, TRAIN_RESULT_LEVEL_FONT, COLOR_COIN);
  }
  addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', closeModal);
}

function renderSell() {
  const price = engine.sellPreview(_modal.dragonId);
  const view = engine.getDragonView(_modal.dragonId);
  if (price === null || !view) {
    closeModal();
    return;
  }
  const isEgg = view.stage === 'egg';
  renderModalShell(isEgg ? 'Sell Egg' : 'Sell ' + view.breed.name, false);
  addImg(PANEL_X + Math.floor((PANEL_W - SELL_ICON_S) / 2), PANEL_Y + SELL_ICON_Y, SELL_ICON_S, SELL_ICON_S, isEgg ? eggAsset60(view.breed.assetKey) : dragonAsset60(view.breed.assetKey));
  addText(PANEL_X + MODAL_PAD, PANEL_Y + SELL_LABEL_Y, PANEL_W - MODAL_PAD * 2, SELL_LABEL_H, 'Will receive:', SELL_LABEL_FONT, COLOR_WHITE);
  addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + SELL_COIN_Y, price, PANEL_Y + SELL_COIN_TEXT_Y, SELL_COIN_TEXT_H, SELL_COIN_FONT, COLOR_WHITE);
  addButton(PANEL_X + SELL_BTN_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, SELL_BTN_W, BTN_H, 'Sell', () => confirmSell(view.dragon.id), { normal: COLOR_BTN_SELL });
  addButton(PANEL_X + KEEP_BTN_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, SELL_BTN_W, BTN_H, 'Keep', closeModal);
}

function renderMonsterSelect() {
  const view = engine.getDragonView(_modal.dragonId);
  if (!view) {
    closeModal();
    return;
  }
  renderModalShell('Battle Monster', false);
  const list = engine.getSpawnedMonsters();
  if (list.length === 0) {
    addText(PANEL_X + MODAL_PAD, PANEL_Y + SELL_LABEL_Y, PANEL_W - MODAL_PAD * 2, EGG_BLOCKED_TEXT_H, CONFIG.monsterSpawn.emptyStateText, TRAIN_RESULT_GAIN_FONT, COLOR_MUTED);
    return;
  }
list.forEach((m, i) => {
     const rowY = PANEL_Y + MONSTER_ROW_Y + i * MONSTER_ROW_H;
     if (rowY + MONSTER_ROW_MAX_H > PANEL_Y + PANEL_H - MONSTER_ROW_BOTTOM_PAD) return;
     addImg(PANEL_X + MONSTER_IMG_X, rowY, MONSTER_IMG_S, MONSTER_IMG_S, monsterAsset72(m.image));
     addText(PANEL_X + MONSTER_NAME_X, rowY, MONSTER_NAME_W, MONSTER_NAME_H, m.difficulty, MONSTER_NAME_FONT, COLOR_WHITE, hmUI.align.LEFT);
     addText(PANEL_X + MONSTER_NAME_X, rowY + MONSTER_GAIN_Y, MONSTER_GAIN_W, MONSTER_GAIN_H, 'win: +' + m.strengthGainWinMin + '-' + m.strengthGainWinMax + ' str', MONSTER_GAIN_FONT, COLOR_SUCCESS, hmUI.align.LEFT);
     addStrengthStars(PANEL_X + MONSTER_IMG_X + Math.floor(MONSTER_IMG_S / 2), rowY + MONSTER_STARS_Y_OFFSET, effectiveMonsterStrength(m));
     addButton(PANEL_X + MONSTER_FIGHT_BTN_X, rowY + MONSTER_FIGHT_BTN_Y, MONSTER_FIGHT_BTN_W, MONSTER_FIGHT_BTN_H, 'Fight', () => startMonsterFight(view.dragon.id, m.id), { size: MONSTER_FIGHT_BTN_FONT });
   });
}

function addFightHpBar(unit) {
  const r = unit.rect;
  addShade(r.barX, r.barY, r.barW, FIGHT_HP_BAR_H, null, {
    color: FIGHT_HP_TRACK_COLOR,
    alpha: 255,
    radius: 2,
  });
  const fill = fightBarFill(r.barW, unit.hp, unit.maxHp);
  if (fill > 0) {
    addShade(r.barX, r.barY, fill, FIGHT_HP_BAR_H, null, {
      color: FIGHT_HP_COLOR,
      alpha: 255,
      radius: 2,
    });
  }
}

function renderFightScreen(width) {
  const f = _fight;
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_DRAGON_SRC);
  // Dim the bright bg artwork so the units and UI stay visible.
  addShade(0, 0, width, DEVICE.height);
  // Tap anywhere skips the replay (drawn first so the Continue button,
  // drawn last, keeps its own tap once the fight is over).
  addShade(0, 0, width, DEVICE.height, skipFightScreen, {
    alpha: 0,
    radius: 0,
    color: COLOR_BLACK,
  });
  if (!f.done) {
    addBadgeText(0, FIGHT_TITLE_Y, width, FIGHT_TITLE_H, f.title, FIGHT_TITLE_FONT, COLOR_WHITE);
  }
  const turn = f.done ? null : f.turns[f.turnIndex];
  f.units.forEach((u, i) => {
    const isAttacker = turn && f.phase !== 'done' && i === turn.attacker;
    const isImpactTarget = f.phase === 'impact' && turn && i === turn.target;
    // Dead units vanish (except the impact target, shown at 0 HP mid-burst).
    if (u.hp <= 0 && !isImpactTarget) return;
    if (isAttacker) {
      addShade(u.rect.x - 4, u.rect.y - 4, u.size + 8, u.size + 8, null, {
        color: FIGHT_ATTACKER_COLOR,
        alpha: FIGHT_ATTACKER_ALPHA,
        radius: 8,
      });
    }
    addImg(u.rect.x, u.rect.y, u.size, u.size, u.asset);
    addFightHpBar(u);
  });
  if (f.fireball) {
    addImg(f.fireball.x, f.fireball.y, FIGHT_FIREBALL_S, FIGHT_FIREBALL_S, ASSET_FIREBALL_28);
  }
  if (f.impact) {
    addImg(
      Math.round(f.impact.x - FIGHT_IMPACT_S / 2),
      Math.round(f.impact.y - FIGHT_IMPACT_S / 2),
      FIGHT_IMPACT_S,
      FIGHT_IMPACT_S,
      ASSET_IMPACT_48,
    );
  }
  if (f.miss) {
    addText(
      Math.round(f.miss.x - 40),
      Math.round(f.miss.y - FIGHT_MISS_H / 2),
      80,
      FIGHT_MISS_H,
      'MISS',
      FIGHT_MISS_FONT,
      COLOR_ERROR,
    );
  }
  // Log line: current turn narration, then the outcome. Short "Beast"
  // label: the full name makes the line overflow the round circle chord
  // and the damage number (the part that matters) clips off.
  const logText = f.log.replace('Bewilder Beast', 'Beast');
  addBadgeText(0, FIGHT_LOG_Y, width, FIGHT_LOG_H, logText, FIGHT_LOG_FONT, COLOR_WHITE);
  if (f.done) {
    addButton(
      Math.floor((width - BTN_W) / 2),
      FIGHT_CONTINUE_Y,
      BTN_W,
      BTN_H,
      'Continue',
      closeFightScreen,
    );
  }
}

function renderBeastIntro() {
  const beast = engine.getState().beast;
  renderModalShell(CONFIG.beast.name, false);
  addImg(PANEL_X + BEAST_IMG_X, PANEL_Y + BEAST_IMG_Y, BEAST_IMG_S, BEAST_IMG_S, ASSET_BEAST_72);
  if (beast.status !== 'alive') {
    const hrs = beastVanishHours(beast.respawnAtMs, timeAdapter.getTime(), CONFIG.economy.coinAccrualIntervalMs);
    addText(PANEL_X + MODAL_PAD, PANEL_Y + BEAST_VANISHED_Y, PANEL_W - MODAL_PAD * 2, BEAST_VANISHED_H, 'Vanished - back in ~' + hrs + 'h', BEAST_VANISHED_FONT, COLOR_MUTED);
    return;
  }
  addStrengthStars(PANEL_X + BEAST_IMG_X + Math.floor(BEAST_IMG_S / 2), PANEL_Y + BEAST_STARS_Y, beastDisplayStrength());
  addEnergyBar(PANEL_X + BEAST_BAR_X, PANEL_Y + BEAST_BAR_Y, BEAST_BAR_W, BEAST_BAR_H, ASSET_ENERGY_BAR_250, beast.currentHp, beast.maxHp);
  const team = engine.getBeastParticipants();
  addText(
    PANEL_X + MODAL_PAD, PANEL_Y + BEAST_TEAM_Y, PANEL_W - MODAL_PAD * 2, BEAST_TEAM_H,
    team.length === 0 ? 'No dragons ready' : team.length + ' dragon(s) ready',
    BEAST_TEAM_FONT, team.length === 0 ? COLOR_ERROR : COLOR_SUCCESS,
  );
  addText(
    PANEL_X + MODAL_PAD, PANEL_Y + BEAST_WARN_Y, PANEL_W - MODAL_PAD * 2, BEAST_WARN_H,
    'Warning: you can lose dragons if defeated! Winners gain strength.',
    BEAST_WARN_FONT, COLOR_ERROR,
  );
  if (team.length > 0) {
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'Fight', startBeastFight);
  } else {
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'Fight', null, { normal: COLOR_BTN_DISABLED });
  }
}

function renderCoinSummary() {
  renderModalShell('Coins', false);
  addImg(PANEL_X + COINS_ICON_X, PANEL_Y + COINS_ICON_Y, COINS_ICON_S, COINS_ICON_S, ASSET_COIN_64);
  addText(
    PANEL_X + MODAL_PAD, PANEL_Y + COINS_TEXT_Y, PANEL_W - MODAL_PAD * 2, COINS_TEXT_H,
    '+' + _modal.amount + ' coins added',
    COINS_FONT, COLOR_COIN,
  );
  addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', () => {
    engine.collectCoins();
    _modal = null;
    if (_page) _page.render();
  });
}

function renderCombatStats() {
  const view = engine.getDragonView(_modal.dragonId);
  if (!view || view.stage === 'egg') {
    closeModal();
    return;
  }
  // coerceLoadedSave backfills old saves, but guard anyway so a dragon
  // object built outside the engine can never crash this modal.
  const stats = view.dragon.combatStats || { easyWins: 0, mediumWins: 0, hardWins: 0, beastWins: 0, coinsEarned: 0 };
  renderModalShell(view.breed.name + ' Record', false);
  const rows = [
    ['Easy wins', String(stats.easyWins), COLOR_WHITE],
    ['Medium wins', String(stats.mediumWins), COLOR_WHITE],
    ['Hard wins', String(stats.hardWins), COLOR_WHITE],
    ['Beast wins', String(stats.beastWins), COLOR_WHITE],
    ['Coins earned', '+' + stats.coinsEarned, COLOR_COIN],
  ];
  rows.forEach(([label, value, color], i) => {
    const y = PANEL_Y + STATS_ROW_Y + i * STATS_ROW_GAP;
    addText(PANEL_X + MODAL_PAD, y, PANEL_W / 2, STATS_ROW_H, label, TRAIN_RESULT_GAIN_FONT, COLOR_MUTED, hmUI.align.LEFT);
    addText(PANEL_X + PANEL_W / 2, y, PANEL_W / 2 - MODAL_PAD, STATS_ROW_H, value, TRAIN_RESULT_GAIN_FONT, color, hmUI.align.RIGHT);
  });
  addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', closeModal);
}

function renderEquipment(width, view) {
  addImg(BG_X, BG_Y, BG_W, BG_H, BG_DRAGON_SRC);
  addShade(0, 0, width, DEVICE.height);
  addBadgeText(0, DRAGON_NAME_Y, width, DRAGON_NAME_H, view.breed.name + ' Equipment', DRAGON_NAME_FONT, COLOR_WHITE);
  const combat = view.combatStrength ?? view.strength;
  const bonus = view.equipmentBonus ?? 0;
  addBadgeText(0, EQUIP_COMBAT_Y, width, EQUIP_COMBAT_H, 'Combat ' + combat + '  (base ' + view.strength + ' + gear ' + bonus + ')', EQUIP_COMBAT_FONT, COLOR_WHITE);
  const owned = view.dragon.equipment || {};
  const catalogue = engine.getEquipmentCatalogue();
  const defById = {};
  catalogue.forEach((d) => { defById[d.id] = d; });
  // Two rows: 3 upper pieces (head / wings / tail), then the 4 leg guards.
  const sidePad = ACTION_SIDE_PAD;
  const rows = [['head', 'wings', 'tail'], ['leg-front-left', 'leg-front-right', 'leg-back-left', 'leg-back-right']];
  rows.forEach((row, r) => {
    const y = EQUIP_GRID_Y + r * EQUIP_ROW_H;
    const xs = actionRowPositions(width, sidePad, 72, row.length);
    row.forEach((slotId, i) => {
      const meta = equipSlotMeta(slotId);
      const def = defById[slotId];
      if (!meta || !def) return;
      const x = xs[i];
      const isOwned = owned[slotId] === true;
      if (isOwned) {
        addImg(x, y, 72, 72, meta.art);
      } else {
        // Empty slot: frame + price; tap opens the buy modal with the
        // piece icon. Owned slots have no buy action (one piece per slot).
        addImg(x, y, 72, 72, ASSET_FRAME_72, () => openModal({ kind: 'equipment-buy', dragonId: view.dragon.id, slot: slotId }));
      }
      addText(x - 8, y + 72, 72 + 16, 18, meta.label, EQUIP_SLOT_NAME_FONT, COLOR_WHITE);
      addText(x - 8, y + 90, 72 + 16, 18, isOwned ? '+' + def.bonus : def.price + 'c', EQUIP_SLOT_SUB_FONT, isOwned ? COLOR_SUCCESS : COLOR_COIN);
    });
  });
  // Bottom nav: Back (to this dragon's page) + Home.
  const navY = DEVICE.height - ACTION_BOTTOM_PAD - BTN_H;
  addButton(ACTION_SIDE_PAD, navY, BTN_W, BTN_H, 'Back', closeEquipment);
  addButton(width - ACTION_SIDE_PAD - BTN_W, navY, BTN_W, BTN_H, 'Home', () => goTo(0));
}

function renderEquipmentBuy() {
  const modal = _modal;
  const view = engine.getDragonView(modal.dragonId);
  const def = engine.getEquipmentCatalogue().find((d) => d.id === modal.slot);
  const meta = equipSlotMeta(modal.slot);
  if (!view || view.stage === 'egg' || !def || !meta) {
    closeModal();
    return;
  }
  // Owned slots never open this modal (their tap is a no-op); if the slot
  // became owned meanwhile (double tap), just close.
  if ((view.dragon.equipment || {})[modal.slot] === true) {
    closeModal();
    return;
  }
  const preview = engine.equipmentPreview(modal.dragonId, modal.slot);
  renderModalShell(def.name, false);
  const iconX = PANEL_X + Math.floor((PANEL_W - EQUIP_BUY_ICON_S) / 2);
  addImg(iconX, PANEL_Y + EQUIP_BUY_ICON_Y, EQUIP_BUY_ICON_S, EQUIP_BUY_ICON_S, meta.art);
  addText(PANEL_X + MODAL_PAD, PANEL_Y + EQUIP_BUY_BONUS_Y, PANEL_W - MODAL_PAD * 2, EQUIP_BUY_BONUS_H, '+' + def.bonus + ' combat strength', EQUIP_BUY_BONUS_FONT, COLOR_SUCCESS);
  addText(PANEL_X + MODAL_PAD, PANEL_Y + EQUIP_BUY_PRICE_Y, PANEL_W - MODAL_PAD * 2, EQUIP_BUY_PRICE_H, 'Price: ' + def.price + ' coins', EQUIP_BUY_PRICE_FONT, COLOR_COIN);
  const coins = engine.getState().player.coins;
  const affordable = preview.reason !== 'not-enough-coins';
  addText(
    PANEL_X + MODAL_PAD, PANEL_Y + EQUIP_BUY_WALLET_Y, PANEL_W - MODAL_PAD * 2, EQUIP_BUY_WALLET_H,
    affordable ? 'You have ' + coins + ' coins' : 'Not enough coins (have ' + coins + ')',
    EQUIP_BUY_WALLET_FONT, affordable ? COLOR_MUTED : COLOR_ERROR,
  );
  addButton(PANEL_X + SELL_BTN_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, SELL_BTN_W, BTN_H, 'Buy', () => {
    // Engine re-checks every gate; a refused buy leaves the modal open.
    if (engine.buyEquipment(modal.dragonId, modal.slot).ok) closeModal();
  });
  addButton(PANEL_X + KEEP_BTN_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, SELL_BTN_W, BTN_H, 'Cancel', closeModal);
}

function renderModal() {
  if (!_modal) return;
  switch (_modal.kind) {
    case 'egg-spin': renderEggSpin(); break;
    case 'train': renderTrain(); break;
    case 'train-result': renderTrainResult(); break;
    case 'sell': renderSell(); break;
    case 'monster-select': renderMonsterSelect(); break;
    case 'beast-intro': renderBeastIntro(); break;
    case 'coin-summary': renderCoinSummary(); break;
    case 'combat-stats': renderCombatStats(); break;
    case 'equipment-buy': renderEquipmentBuy(); break;
    default: break;
  }
}

// ---------------------------------------------------------------------------
// Page (koala lifecycle: build / onResume / onPause / onDestroy / render)
// ---------------------------------------------------------------------------

function startTickTimer(page) {
  if (_tickTimer) return;
  _tickTimer = setInterval(() => {
    engine.tick();
    page.render();
  }, CONFIG.timers.tickIntervalMs);
}

function stopTickTimer() {
  if (_tickTimer) {
    clearInterval(_tickTimer);
    _tickTimer = null;
  }
}

Page({
  build() {
    _page = this;
    // Data-driven device support: pick the layout table for this watch
    // (Bip 6 rect vs round) before the first render. All coordinates used
    // below are live bindings onto that table — no per-device forks here.
    refreshLayout(deviceAdapter.getInfo());
    engine.init();
    startTickTimer(this);
    this.render();
  },

  onResume() {
    engine.resume();
    startTickTimer(this);
    this.render();
  },

  onPause() {
    stopTickTimer();
    engine.save();
  },

  onDestroy() {
    stopTickTimer();
    closeTimersForScreen();
    engine.save();
  },

  render() {
    engine.tick();
    const width = DEVICE.width;

    _widgets.forEach((w) => hmUI.deleteWidget(w));
    _widgets = [];

    if (_fight) {
      // Fight screen replaces everything (no nav, no modals) until the
      // replay ends and the player taps Continue.
      renderFightScreen(width);
    } else if (_villagesScreen) {
      // Villages overlay (list or one village page) replaces the hub /
      // dragon pages until Home returns to Main.
      if (_villagesScreen.kind === 'list') {
        renderVillagesList(width);
      } else {
        renderVillagePage(width, _villagesScreen.villageId);
      }
      renderModal();
    } else {
      if (_screenIndex > roster().length) _screenIndex = roster().length;
      const view = currentView();
      if (_equipmentDragonId) {
        const eView = engine.getDragonView(_equipmentDragonId);
        if (eView && eView.stage !== 'egg') {
          renderEquipment(width, eView);
        } else {
          // Dragon gone / hatched-back? (expired, sold) — drop the overlay.
          _equipmentDragonId = null;
        }
      }
      if (!_equipmentDragonId) {
        if (_screenIndex === 0 || !view) {
          _screenIndex = 0;
          renderMain(width);
        } else {
          renderDragon(width, view);
        }
      }
      renderModal();
    }
  },
});
