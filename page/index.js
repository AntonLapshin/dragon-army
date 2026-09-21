import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import {
  ACTION_BOTTOM_PAD,
  ACTION_ICON_S,
  ACTION_SIDE_PAD,
  ASSET_BEAST_72,
  ASSET_BEAST_128,
  ASSET_BG_DRAGON,
  ASSET_BG_HOME,
  ASSET_CLOSE_36,
  ASSET_COIN_64,
  ASSET_DANGER_84,
  ASSET_DICE_80,
  ASSET_EGG_128,
  ASSET_ENERGY_56,
  ASSET_FRAME_72,
  ASSET_HOME_84,
  ASSET_LOSS_60,
  ASSET_SELL_84,
  ASSET_SHADOW,
  ASSET_STRENGTH_56,
  ASSET_TRAINING_84,
  ASSET_VICTORY_60,
  BADGE_MIN_W,
  BADGE_PAD,
  BADGE_TEXT_MIN_W,
  BADGE_WIDTH_FACTOR,
  BALANCE_FONT,
  BALANCE_ICON_S,
  BALANCE_ICON_Y,
  BALANCE_TEXT_H,
  BALANCE_TEXT_Y,
  BAR_FILL_RADIUS,
  BAR_H,
  BAR_HIGH_AT,
  BAR_INSET,
  BAR_MID_AT,
  BAR_RADIUS,
  BEAST_BAR_W,
  BEAST_BAR_X,
  BEAST_BAR_Y,
  BEAST_BAR_Y_OFFSET,
  BEAST_FIGHT_BAR_W,
  BEAST_FIGHT_BAR_X,
  BEAST_FIGHT_BAR_Y,
  BEAST_GAP,
  BEAST_ICON_S,
  BEAST_IMG_S,
  BEAST_IMG_X,
  BEAST_IMG_Y,
  BEAST_TEAM_FONT,
  BEAST_TEAM_H,
  BEAST_TEAM_Y,
  BEAST_VANISHED_FONT,
  BEAST_VANISHED_H,
  BEAST_VANISHED_Y,
  BEAST_WARN_FONT,
  BEAST_WARN_H,
  BEAST_WARN_Y,
  BTN_BOTTOM_OFFSET,
  BTN_CENTER_X,
  BTN_FONT,
  BTN_GREEN,
  BTN_GREEN_PRESS,
  BTN_H,
  BTN_RADIUS,
  BTN_W,
  COIN_BIG_TEXT_W,
  COINS_FONT,
  COINS_ICON_S,
  COINS_ICON_X,
  COINS_ICON_Y,
  COINS_TEXT_H,
  COINS_TEXT_Y,
  COLOR_BAR_HIGH,
  COLOR_BAR_LOW,
  COLOR_BAR_MID,
  COLOR_BAR_TRACK,
  COLOR_BLACK,
  COLOR_BTN_DISABLED,
  COLOR_BTN_SELL,
  COLOR_BTN_TEXT,
  COLOR_COIN,
  COLOR_ERROR,
  COLOR_MUTED,
  COLOR_SUBTITLE,
  COLOR_SUCCESS,
  COLOR_WHITE,
  DIM_ALPHA,
  DIM_RADIUS,
  DRAGON_IMG_HATCHED_OFFSET,
  DRAGON_IMG_S,
  DRAGON_IMG_Y,
  DRAGON_NAME_FONT,
  DRAGON_NAME_H,
  DRAGON_NAME_Y,
  DRAGON_SUB_FONT,
  DRAGON_SUB_H,
  DRAGON_SUB_Y,
  EARN_FONT,
  EARN_ICON_S,
  EARN_ICON_Y,
  EARN_TEXT_H,
  EARN_TEXT_Y,
  EGG_BLOCKED_FONT,
  EGG_BLOCKED_TEXT_H,
  EGG_BLOCKED_TEXT_Y,
  EGG_BTN_S,
  EGG_BTN_X,
  EGG_BTN_Y,
  EGG_DICE_S,
  EGG_DICE_X,
  EGG_DICE_Y,
  EGG_PRICE_FONT,
  EGG_PRICE_ICON_Y,
  EGG_PRICE_TEXT_H,
  EGG_PRICE_TEXT_Y,
  EGG_REVEAL_PRICE_TEXT_Y,
  EGG_REVEAL_PRICE_Y,
  EGG_REVEAL_S,
  EGG_REVEAL_Y,
  EGG_SPIN_BTN_Y,
  EGG_SPIN_HINT_FONT,
  EGG_SPIN_HINT_H,
  EGG_SPIN_HINT_Y,
  ENERGY_BAR_W,
  ENERGY_GAP,
  ENERGY_ICON_S,
  ENERGY_X,
  ENERGY_Y,
  FALLBACK_ROSTER_ICON,
  FIGHT_BEAST_MAX_LINES,
  FIGHT_BEAST_OUTCOME_FONT,
  FIGHT_DRAGON_IMG_OFFSET_X,
  FIGHT_DRAGON_IMG_S,
  FIGHT_DRAGON_IMG_Y,
  FIGHT_LINE_FONT,
  FIGHT_LINE_GAP,
  FIGHT_LINE_H,
  FIGHT_LINE_PAD,
  FIGHT_LINES_Y,
  FIGHT_MAX_LINES,
  FIGHT_MONSTER_IMG_S,
  FIGHT_MONSTER_IMG_X,
  FIGHT_MONSTER_IMG_Y,
  FIGHT_OUTCOME_FONT,
  FIGHT_OUTCOME_ICON_S,
  FIGHT_OUTCOME_ICON_X,
  FIGHT_OUTCOME_ICON_Y,
  FIGHT_OUTCOME_TEXT_H,
  FIGHT_OUTCOME_TEXT_Y,
  FIGHT_STR_ICON_S,
  FIGHT_STR_ICON_X,
  FIGHT_STR_ICON_Y,
  FIGHT_STR_VAL_FONT,
  FIGHT_STR_VAL_GAP,
  FIGHT_STR_VAL_H,
  FIGHT_STR_VAL_W,
  FIGHT_STR_VAL_Y,
  FIGHT_VS_FONT,
  FIGHT_VS_H,
  FIGHT_VS_X,
  FIGHT_VS_Y,
  ICON_SIZE,
  KEEP_BTN_X,
  MODAL_CLOSE_OFFSET,
  MODAL_CLOSE_S,
  MODAL_CLOSE_Y,
  MODAL_PAD,
  MODAL_RADIUS,
  MODAL_TITLE_FONT,
  MODAL_TITLE_H,
  MODAL_TITLE_Y,
  MONSTER_FIGHT_BTN_FONT,
  MONSTER_FIGHT_BTN_H,
  MONSTER_FIGHT_BTN_W,
  MONSTER_FIGHT_BTN_X,
  MONSTER_FIGHT_BTN_Y,
  MONSTER_GAIN_FONT,
  MONSTER_GAIN_H,
  MONSTER_GAIN_W,
  MONSTER_GAIN_Y,
  MONSTER_IMG_S,
  MONSTER_IMG_X,
  MONSTER_NAME_FONT,
  MONSTER_NAME_H,
  MONSTER_NAME_W,
  MONSTER_NAME_X,
  MONSTER_ROW_BOTTOM_PAD,
  MONSTER_ROW_H,
  MONSTER_ROW_MAX_H,
  MONSTER_ROW_Y,
  MONSTER_STR_ICON_S,
  MONSTER_STR_VAL_FONT,
  MONSTER_STR_VAL_GAP,
  MONSTER_STR_VAL_H,
  MONSTER_STR_VAL_W,
  MONSTER_STR_VAL_Y,
  MONSTER_STR_Y,
  PANEL_ALPHA,
  PANEL_COLOR,
  PANEL_H,
  PANEL_W,
  PANEL_X,
  PANEL_Y,
  RECT_DEFAULT_ALPHA,
  RECT_DEFAULT_RADIUS,
  ROSTER_BOTTOM_PAD,
  ROSTER_FRAME,
  ROSTER_LEFT,
  ROSTER_SLOTS,
  ROSTER_THUMB,
  SELL_BTN_W,
  SELL_BTN_X,
  SELL_COIN_FONT,
  SELL_COIN_TEXT_H,
  SELL_COIN_TEXT_Y,
  SELL_COIN_Y,
  SELL_ICON_S,
  SELL_ICON_Y,
  SELL_LABEL_FONT,
  SELL_LABEL_H,
  SELL_LABEL_Y,
  SHADOW_H,
  SHADOW_W,
  SHADOW_Y_OFFSET,
  SHADE_ALPHA,
  SHADE_COLOR,
  SHADE_DEFAULT_RADIUS,
  STR_FONT,
  STR_GAP,
  STR_ICON_S,
  STR_PILL_H,
  STR_PILL_W,
  STR_X,
  STR_Y,
  TEXT_DEFAULT_SIZE,
  TEXT_PILL_RADIUS,
  TRAIN_COIN_FONT,
  TRAIN_COIN_TEXT_H,
  TRAIN_COIN_TEXT_Y,
  TRAIN_COIN_Y,
  TRAIN_ENERGY_FONT,
  TRAIN_ENERGY_H,
  TRAIN_ENERGY_Y,
  TRAIN_RESULT_ENERGY_FONT,
  TRAIN_RESULT_ENERGY_H,
  TRAIN_RESULT_ENERGY_Y,
  TRAIN_RESULT_GAIN_FONT,
  TRAIN_RESULT_GAIN_H,
  TRAIN_RESULT_GAIN_Y,
  TRAIN_RESULT_ICON_S,
  TRAIN_RESULT_ICON_X,
  TRAIN_RESULT_ICON_Y,
  TRAIN_RESULT_LEVEL_FONT,
  TRAIN_RESULT_LEVEL_H,
  TRAIN_RESULT_LEVEL_Y,
  TRAIN_WARN_FONT,
  TRAIN_WARN_H,
  TRAIN_WARN_Y,
  BEAST_BTN_OFFSET_X,
  BEAST_BTN_S,
  BEAST_BTN_Y,
  dragonAsset240,
  dragonAsset60,
  eggAsset240,
  eggAsset60,
  monsterAsset72,
} from './index.style.js';
import { CONFIG, breedForIndex, clamp } from '../engine/config.js';
import { createGameEngine, coerceLoadedSave } from '../engine/engine.js';

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
 * All visual constants (palette, fonts, geometry, assets) live in
 * ./index.style.js — this file holds no colors, sizes or image paths.
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
// Modal: null or { kind, ...payload }. Fight modals carry reveal progress.
let _modal = null;

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
  closeTimersForScreen();
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

function addImg(x, y, w, h, src, onTap) {
  const img = push(hmUI.createWidget(hmUI.widget.IMG, { x, y, w, h, src }));
  if (onTap) img.addEventListener(hmUI.event.CLICK_DOWN, onTap);
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

function addBar(x, y, w, value, max) {
  const pct = clamp(value / max, 0, 1);
  const fillW = Math.round(pct * (w - BAR_INSET * 2));
  const barH = BAR_H;
  let color = COLOR_BAR_LOW;
  if (pct > BAR_HIGH_AT) color = COLOR_BAR_HIGH;
  else if (pct > BAR_MID_AT) color = COLOR_BAR_MID;
  push(hmUI.createWidget(hmUI.widget.FILL_RECT, { x, y, w, h: barH, color: COLOR_BAR_TRACK, radius: BAR_RADIUS }));
  if (fillW > 0) {
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: x + BAR_INSET, y: y + BAR_INSET, w: fillW, h: barH - BAR_INSET * 2, color, radius: BAR_FILL_RADIUS,
    }));
  }
}

function addIconButton(x, y, size, src, onTap, dimmed) {
  addImg(x, y, size, size, src, dimmed ? null : onTap);
  if (dimmed) {
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w: size, h: size, color: COLOR_BLACK, alpha: DIM_ALPHA, radius: DIM_RADIUS,
    }));
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
  _modal = { kind: 'egg-spin', blocked: false, spinning: true, symbolIdx: 0, breedIndex: null };
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

function confirmEgg() {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.blocked || modal.spinning) return;
  const res = engine.confirmEggPurchase(modal.breedIndex);
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
  if (!view) return;
  const res = engine.fightMonster(dragonId, monsterId);
  if (!res.ok) return;
  openLockedFight(
    { kind: 'monster-fight', dragonId, monsterId },
    [
      'Dragon ' + view.breed.name + ' attacks - damage ' + res.rawDamage,
      res.won
        ? 'Victory! +' + res.coinReward + ' coins, +' + res.strengthGain + ' strength'
        : 'Dragon is tired, will recover automatically',
    ],
    { won: res.won, reward: res.coinReward, energyAfter: res.energyAfter, rawDamage: res.rawDamage, strengthGain: res.strengthGain, strengthAfter: res.strengthAfter },
  );
}

function startBeastFight() {
  if (!engine.canFightBeast().ok) return;
  const res = engine.fightBeast();
  if (!res.ok) return;
  const lines = res.turns.map((t) => t.text);
  if (res.won) {
    const gains = Object.values(res.strengthGains || {});
    const avg = gains.length ? Math.round(gains.reduce((a, b) => a + b, 0) / gains.length) : 0;
    lines.push(
      'Bewilder Beast vanishes for a day. Continue adventure. +' + res.reward + ' coins, survivors +' + avg + ' strength',
    );
  } else {
    lines.push('Defeat - roster empty. Buy a new egg.');
  }
  openLockedFight(
    { kind: 'beast-fight' },
    lines,
    { won: res.won, reward: res.reward, hpAfter: res.beastHpAfter, strengthGains: res.strengthGains || {} },
    5000,
  );
}

// Locked fight modal: X hidden until every turn line has been revealed.
function openLockedFight(base, lines, outcome, delayMs) {
  _modal = Object.assign({}, base, {
    locked: true,
    lines,
    revealed: 0,
    outcome,
  });
  if (_fightTimer) clearInterval(_fightTimer);
  _fightTimer = setInterval(() => {
    if (!_modal || (_modal.kind !== 'monster-fight' && _modal.kind !== 'beast-fight')) {
      if (_fightTimer) {
        clearInterval(_fightTimer);
        _fightTimer = null;
      }
      return;
    }
    if (_modal.revealed < _modal.lines.length) {
      _modal.revealed += 1;
      if (_modal.revealed >= _modal.lines.length) {
        _modal.locked = false;
        if (_fightTimer) {
          clearInterval(_fightTimer);
          _fightTimer = null;
        }
      }
      if (_page) _page.render();
    }
  }, delayMs || CONFIG.ui.fightTurnDelayMs);
  if (_page) _page.render();
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function renderMain(width) {
  const economy = engine.getEconomyView();
  addImg(0, 0, width, DEVICE_HEIGHT, ASSET_BG_HOME);

  // Balance: large coin centered with the amount on a dark pill right below.
  const balanceCx = Math.floor(width / 2);
  addImg(Math.round(balanceCx - BALANCE_ICON_S / 2), BALANCE_ICON_Y, BALANCE_ICON_S, BALANCE_ICON_S, ASSET_COIN_64);
  addBadgeText(0, BALANCE_TEXT_Y, width, BALANCE_TEXT_H, String(economy.coins), BALANCE_FONT, COLOR_WHITE);

  // Buy Egg — top-left, icon only (no label). Hidden when a purchase
  // isn't available (broke or roster full).
  if (engine.canBuyEgg()) {
    addIconButton(EGG_BTN_X, EGG_BTN_Y, EGG_BTN_S, ASSET_EGG_128, startEggSpin, false);
  }

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - BEAST_BTN_OFFSET_X, BEAST_BTN_Y, BEAST_BTN_S, ASSET_BEAST_128, () => {
    openModal({ kind: 'beast-intro' });
  }, false);

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
  addImg(0, 0, width, DEVICE_HEIGHT, ASSET_BG_DRAGON);
  // Dim the bright bg artwork so the dragon and UI stay visible.
  addShade(0, 0, width, DEVICE_HEIGHT);

  if (egg) {
     // Still hatching: hide the breed so the dragon stays a surprise.
     // addBadgeText(0, 8, width, 30, 'Egg', 24, COLOR_WHITE);
   } else {
     addBadgeText(0, DRAGON_NAME_Y, width, DRAGON_NAME_H, breed.name, DRAGON_NAME_FONT, COLOR_WHITE);
     addBadgeText(0, DRAGON_SUB_Y, width, DRAGON_SUB_H, 'Lv ' + view.level + '  ·  Age ' + view.ageDays + 'd', DRAGON_SUB_FONT, COLOR_SUBTITLE);
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

   // Energy and Strength on top of the dragon (drawn after so they sit above).
   if (!egg) {
     const barH = BAR_H;
     const eIconS = ENERGY_ICON_S;
     const eGap = ENERGY_GAP;
     const eBarW = ENERGY_BAR_W;
     const eX = ENERGY_X;
     const eY = ENERGY_Y;
      addImg(eX, eY, eIconS, eIconS, ASSET_ENERGY_56);
     addBar(eX + eIconS + eGap, eY + Math.floor((eIconS - barH) / 2), eBarW, view.energy, CONFIG.energy.max);
     const sIconS = STR_ICON_S;
     const sGap = STR_GAP;
     const sPillW = STR_PILL_W;
     const sPillH = STR_PILL_H;
     const sX = STR_X;
     const sY = STR_Y;
      addImg(sX, sY, sIconS, sIconS, ASSET_STRENGTH_56);
     addBadgeText(sX + sIconS + sGap, sY + Math.floor((sIconS - sPillH) / 2), sPillW, sPillH, String(view.strength), STR_FONT, COLOR_WHITE, hmUI.align.LEFT);
   }

// Bottom action row — pinned to the very bottom (no roster strip on this
   // page). Eggs show just Home at bottom-right; hatched dragons show
   // Home / Sell / (Danger) / Training evenly spread with 20px side paddings.
   // Danger is hidden when no monsters wait. Each icon uses its exact
   // pre-scaled size (home/sell/training 84x84, danger 72x72), bottom-aligned.
   const sidePad = ACTION_SIDE_PAD;
   const bottom = DEVICE_HEIGHT - ACTION_BOTTOM_PAD;
   if (egg) {
     const eggIconS = ACTION_ICON_S;
     const eggY = bottom - eggIconS;
     addIconButton(width - sidePad - eggIconS, eggY, eggIconS, ASSET_HOME_84, () => goTo(0), false);
   } else {
     const hasMonsters = engine.getSpawnedMonsters().length > 0;
     const others = [
       { src: ASSET_SELL_84, size: ACTION_ICON_S, dimmed: false, tap: () => openModal({ kind: 'sell', dragonId: view.dragon.id }) },
     ];
     if (hasMonsters) {
       others.push({ src: ASSET_DANGER_84, size: ACTION_ICON_S, dimmed: view.energy <= 0, tap: () => openMonsterSelect(view.dragon.id) });
     }
     others.push({ src: ASSET_TRAINING_84, size: ACTION_ICON_S, dimmed: view.energy <= 0, tap: () => openModal({ kind: 'train', dragonId: view.dragon.id }) });
     const cells = [
       { src: ASSET_HOME_84, size: ACTION_ICON_S, dimmed: false, tap: () => goTo(0) },
     ].concat(others);
     const maxS = ACTION_ICON_S;
     const step = (width - sidePad * 2 - maxS) / (cells.length - 1);
     cells.forEach((cell, i) => {
       const ix = Math.round(sidePad + i * step);
       const iy = bottom - cell.size;
       addIconButton(ix, iy, cell.size, cell.src, cell.tap, cell.dimmed);
     });
   }
}

function renderRosterStrip(width) {
  // Bottom thumbnail navigation: tap a thumbnail to jump to that dragon/egg
  // page. 30px left/right paddings; always 5 slots fill the row exactly.
  // Each slot uses the ornate misc/frame_72x72.png as its pill, with the
  // 60x60 dragon/egg icon centered inside (6px pad). Empty slots render
  // the frame alone so the row is stable even with no dragons/eggs.
  const list = roster();
  const SLOT_N = ROSTER_SLOTS;
  const thumbS = ROSTER_THUMB;
  const frameS = ROSTER_FRAME;
  const left = ROSTER_LEFT;
  const y = DEVICE_HEIGHT - thumbS - ROSTER_BOTTOM_PAD;
  const pad = Math.round((frameS - thumbS) / 2);
  let start = 0;
  let visible = list;
  if (list.length > SLOT_N) {
    const cur = Math.max(0, _screenIndex - 1);
    start = Math.min(Math.max(0, cur - 2), list.length - SLOT_N);
    visible = list.slice(start, start + SLOT_N);
  }
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
// Modals
// ---------------------------------------------------------------------------

function renderModalShell(title, locked) {
  const width = DEVICE_WIDTH;
  // Dim shade with a no-op tap so it also swallows clicks in the web
  // runner (where a non-clickable layer has pointer-events:none and
  // would let clicks fall through to icons behind the modal).
  // FILL_RECT with separate alpha (API 3.0+) does the dimming.
  addShade(0, 0, width, DEVICE_HEIGHT, () => {});
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
  renderModalShell('Get a New Egg', true);
  if (modal.spinning) {
    // The dice is tappable too: rapid re-renders can swallow a button click
    // mid-press, so tapping anywhere on the dice also stops the spin.
    addImg(PANEL_X + EGG_DICE_X, PANEL_Y + EGG_DICE_Y, EGG_DICE_S, EGG_DICE_S, ASSET_DICE_80, stopEggSpin);
    addText(PANEL_X + MODAL_PAD, PANEL_Y + EGG_SPIN_HINT_Y, PANEL_W - MODAL_PAD * 2, EGG_SPIN_HINT_H, 'Tap Reveal to see your egg', EGG_SPIN_HINT_FONT, COLOR_MUTED);
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + EGG_SPIN_BTN_Y, BTN_W, BTN_H, 'Reveal', stopEggSpin);
  } else {
    // Breed stays hidden until it hatches — show the egg, not its name.
    const breed = breedForIndex(modal.breedIndex);
    const eggS = EGG_REVEAL_S;
    addImg(PANEL_X + Math.floor((PANEL_W - eggS) / 2), PANEL_Y + EGG_REVEAL_Y, eggS, eggS, eggAsset60(breed.assetKey));
    addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + EGG_REVEAL_PRICE_Y, CONFIG.egg.price, PANEL_Y + EGG_REVEAL_PRICE_TEXT_Y, EGG_PRICE_TEXT_H, EGG_PRICE_FONT, COLOR_WHITE);
    addButton(PANEL_X + BTN_CENTER_X, PANEL_Y + PANEL_H - BTN_BOTTOM_OFFSET, BTN_W, BTN_H, 'OK', confirmEgg);
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
  renderModalShell('Sell ' + view.breed.name, false);
  addImg(PANEL_X + Math.floor((PANEL_W - SELL_ICON_S) / 2), PANEL_Y + SELL_ICON_Y, SELL_ICON_S, SELL_ICON_S, dragonAsset60(view.breed.assetKey));
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
     const strIconS = MONSTER_STR_ICON_S;
     addImg(PANEL_X + MONSTER_NAME_X, rowY + MONSTER_STR_Y, strIconS, strIconS, ASSET_STRENGTH_56);
     addText(PANEL_X + MONSTER_NAME_X + strIconS + MONSTER_STR_VAL_GAP, rowY + MONSTER_STR_VAL_Y, MONSTER_STR_VAL_W, MONSTER_STR_VAL_H, String(m.strength), MONSTER_STR_VAL_FONT, COLOR_MUTED, hmUI.align.LEFT);
     addButton(PANEL_X + MONSTER_FIGHT_BTN_X, rowY + MONSTER_FIGHT_BTN_Y, MONSTER_FIGHT_BTN_W, MONSTER_FIGHT_BTN_H, 'Fight', () => startMonsterFight(view.dragon.id, m.id), { size: MONSTER_FIGHT_BTN_FONT });
   });
}

function renderFightLines(maxShown) {
  const lines = _modal.lines || [];
  const shown = lines.slice(0, _modal.revealed);
  const startY = PANEL_Y + FIGHT_LINES_Y;
  shown.slice(-(maxShown || FIGHT_MAX_LINES)).forEach((line, i) => {
    addText(PANEL_X + FIGHT_LINE_PAD, startY + i * FIGHT_LINE_GAP, PANEL_W - FIGHT_LINE_PAD * 2, FIGHT_LINE_H, line, FIGHT_LINE_FONT, COLOR_WHITE);
  });
}

function renderMonsterFight() {
  const modal = _modal;
  const view = engine.getDragonView(modal.dragonId);
  const monster = engine.getSpawnedMonsters().find((m) => m.id === modal.monsterId);
  renderModalShell('Fight', modal.locked);
  if (monster) addImg(PANEL_X + FIGHT_MONSTER_IMG_X, PANEL_Y + FIGHT_MONSTER_IMG_Y, FIGHT_MONSTER_IMG_S, FIGHT_MONSTER_IMG_S, monsterAsset72(monster.image));
  if (view) addImg(PANEL_X + PANEL_W - FIGHT_DRAGON_IMG_OFFSET_X, PANEL_Y + FIGHT_DRAGON_IMG_Y, FIGHT_DRAGON_IMG_S, FIGHT_DRAGON_IMG_S, dragonAsset60(view.breed.assetKey));
  if (monster && view) {
    addText(PANEL_X + FIGHT_VS_X, PANEL_Y + FIGHT_VS_Y, PANEL_W - FIGHT_VS_X * 2, FIGHT_VS_H, 'vs', FIGHT_VS_FONT, COLOR_COIN);
    addImg(PANEL_X + FIGHT_STR_ICON_X, PANEL_Y + FIGHT_STR_ICON_Y, FIGHT_STR_ICON_S, FIGHT_STR_ICON_S, ASSET_STRENGTH_56);
    addText(PANEL_X + FIGHT_STR_ICON_X + FIGHT_STR_ICON_S + FIGHT_STR_VAL_GAP, PANEL_Y + FIGHT_STR_ICON_Y + FIGHT_STR_VAL_Y, FIGHT_STR_VAL_W, FIGHT_STR_VAL_H, String(view.strength), FIGHT_STR_VAL_FONT, COLOR_MUTED, hmUI.align.LEFT);
  }
  renderFightLines(FIGHT_MAX_LINES);
  if (!modal.locked && modal.outcome) {
    addImg(PANEL_X + FIGHT_OUTCOME_ICON_X, PANEL_Y + PANEL_H - FIGHT_OUTCOME_ICON_Y, FIGHT_OUTCOME_ICON_S, FIGHT_OUTCOME_ICON_S, modal.outcome.won ? ASSET_VICTORY_60 : ASSET_LOSS_60);
    addText(
      PANEL_X + MODAL_PAD, PANEL_Y + PANEL_H - FIGHT_OUTCOME_TEXT_Y, PANEL_W - MODAL_PAD * 2, FIGHT_OUTCOME_TEXT_H,
      modal.outcome.won ? '+' + modal.outcome.reward + ' coins, +' + (modal.outcome.strengthGain || 0) + ' str' : 'Rest to recover',
      FIGHT_OUTCOME_FONT, modal.outcome.won ? COLOR_SUCCESS : COLOR_ERROR,
    );
  }
}

function renderBeastIntro() {
  const beast = engine.getState().beast;
  renderModalShell(CONFIG.beast.name, false);
  addImg(PANEL_X + BEAST_IMG_X, PANEL_Y + BEAST_IMG_Y, BEAST_IMG_S, BEAST_IMG_S, ASSET_BEAST_72);
  if (beast.status !== 'alive') {
    const now = timeAdapter.getTime();
    const hrs = Math.max(1, Math.ceil(((beast.respawnAtMs || now) - now) / CONFIG.economy.coinAccrualIntervalMs));
    addText(PANEL_X + MODAL_PAD, PANEL_Y + BEAST_VANISHED_Y, PANEL_W - MODAL_PAD * 2, BEAST_VANISHED_H, 'Vanished - back in ~' + hrs + 'h', BEAST_VANISHED_FONT, COLOR_MUTED);
    return;
  }
  const beastBarY = PANEL_Y + BEAST_BAR_Y;
  const beastIconS = BEAST_ICON_S;
  const beastGap = BEAST_GAP;
  const beastBarX = PANEL_X + BEAST_BAR_X + beastIconS + beastGap;
  const beastBarW = BEAST_BAR_W - beastIconS - beastGap;
  addImg(PANEL_X + BEAST_BAR_X, beastBarY + BEAST_BAR_Y_OFFSET, beastIconS, beastIconS, ASSET_ENERGY_56);
  addBar(beastBarX, beastBarY, beastBarW, beast.currentHp, beast.maxHp);
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

function renderBeastFight() {
  const modal = _modal;
  const beast = engine.getState().beast;
  renderModalShell('Beast Battle', modal.locked);
  addImg(PANEL_X + FIGHT_MONSTER_IMG_X, PANEL_Y + FIGHT_MONSTER_IMG_Y, FIGHT_MONSTER_IMG_S, FIGHT_MONSTER_IMG_S, ASSET_BEAST_72);
  const hp = modal.outcome && modal.revealed >= modal.lines.length
    ? modal.outcome.hpAfter
    : beast.currentHp;
  addBar(PANEL_X + BEAST_FIGHT_BAR_X, PANEL_Y + BEAST_FIGHT_BAR_Y, BEAST_FIGHT_BAR_W, hp, beast.maxHp);
  renderFightLines(FIGHT_BEAST_MAX_LINES);
  if (!modal.locked && modal.outcome) {
    addImg(PANEL_X + FIGHT_OUTCOME_ICON_X, PANEL_Y + PANEL_H - FIGHT_OUTCOME_ICON_Y, FIGHT_OUTCOME_ICON_S, FIGHT_OUTCOME_ICON_S, modal.outcome.won ? ASSET_VICTORY_60 : ASSET_LOSS_60);
    if (modal.outcome.won) {
      addText(
        PANEL_X + MODAL_PAD, PANEL_Y + PANEL_H - FIGHT_OUTCOME_TEXT_Y, PANEL_W - MODAL_PAD * 2, FIGHT_OUTCOME_TEXT_H,
        'Vanishes for a day! +' + modal.outcome.reward + ' coins, survivors +str',
        FIGHT_BEAST_OUTCOME_FONT, COLOR_SUCCESS,
      );
    }
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

function renderModal() {
  if (!_modal) return;
  switch (_modal.kind) {
    case 'egg-spin': renderEggSpin(); break;
    case 'train': renderTrain(); break;
    case 'train-result': renderTrainResult(); break;
    case 'sell': renderSell(); break;
    case 'monster-select': renderMonsterSelect(); break;
    case 'monster-fight': renderMonsterFight(); break;
    case 'beast-intro': renderBeastIntro(); break;
    case 'beast-fight': renderBeastFight(); break;
    case 'coin-summary': renderCoinSummary(); break;
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
    const width = DEVICE_WIDTH;

    _widgets.forEach((w) => hmUI.deleteWidget(w));
    _widgets = [];

    if (_screenIndex > roster().length) _screenIndex = roster().length;
    const view = currentView();
    if (_screenIndex === 0 || !view) {
      _screenIndex = 0;
      renderMain(width);
    } else {
      renderDragon(width, view);
    }
    renderModal();
  },
});
