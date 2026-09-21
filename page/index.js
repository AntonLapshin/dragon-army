import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import {
  PANEL_COLOR,
  PANEL_ALPHA,
  SHADE_COLOR,
  SHADE_ALPHA,
  TEXT_PILL_RADIUS,
  BTN_GREEN,
  BTN_GREEN_PRESS,
  PANEL_W,
  PANEL_H,
  PANEL_X,
  PANEL_Y,
} from './index.style.js';
import { CONFIG, MONSTERS, breedForIndex, clamp } from '../engine/config.js';
import { createGameEngine, createNewGameState } from '../engine/engine.js';

/**
 * Dragon Army — thin UI layer (screens + modals, see docs/interface.md).
 *
 * All game state, balance numbers and rules live in engine/:
 * - engine/config.ts  — the single source of truth for balance/catalogue.
 * - engine/engine.ts  — state flow (tick, egg/train/sell/fights, coins).
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
      return coerceSave(raw);
    },
    save(state) {
      try {
        storageAdapter.save(state);
      } catch (_) {}
    },
  },
  getTime: () => timeAdapter.getTime(),
});

/**
 * Accept an engine-shaped save as-is; upgrade the legacy page-owned shape
 * ({ coins, dragons with breedIdx, beastHp, ... }) from before the engine
 * refactor so existing progress is kept. Anything else → null (fresh game).
 */
function coerceSave(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.player && Array.isArray(raw.player.dragons)) return raw;
  if (typeof raw.coins === 'number' && Array.isArray(raw.dragons)) {
    return migrateLegacySave(raw);
  }
  return null;
}

function migrateLegacySave(raw) {
  const now = timeAdapter.getTime();
  const state = createNewGameState({
    playerId: 'player-1',
    nowMs: now,
    configVersion: CONFIG.meta.configVersion,
    beastMaxHp: CONFIG.beast.hp,
  });
  state.player.coins = raw.coins;
  state.player.createdAtMs = typeof raw.createdAt === 'number' ? raw.createdAt : now;
  state.player.lastSeenMs = now;
  state.player.lastCoinCollectMs = typeof raw.lastCoinCollectMs === 'number'
    ? raw.lastCoinCollectMs
    : now;
  state.player.dragons = raw.dragons
    .filter((d) => d && typeof d.id === 'string')
    .map((d) => ({
      id: d.id,
      breedId: breedForIndex(typeof d.breedIdx === 'number' ? d.breedIdx : 0).id,
      strength: typeof d.strength === 'number' ? d.strength : 0,
      energy: typeof d.energy === 'number' ? d.energy : CONFIG.energy.initial,
      purchasedAtMs: typeof d.purchasedAt === 'number' ? d.purchasedAt : now,
      hatchAtMs: typeof d.hatchAt === 'number' ? d.hatchAt : now,
      hatchedAtMs: typeof d.hatchedAt === 'number' ? d.hatchedAt : null,
      lastEnergyUpdateMs: typeof d.energyTs === 'number' ? d.energyTs : now,
    }));
  state.beast.currentHp = typeof raw.beastHp === 'number' ? raw.beastHp : CONFIG.beast.hp;
  state.beast.status = raw.beastStatus === 'vanished' ? 'vanished' : 'alive';
  state.beast.respawnAtMs = typeof raw.beastRespawnAt === 'number' ? raw.beastRespawnAt : null;
  const spawnedIds = new Set(Array.isArray(raw.spawned) ? raw.spawned : []);
  state.monsterSpawn.spawned = MONSTERS.filter((m) => spawnedIds.has(m.id));
  state.monsterSpawn.lastRefreshMs = typeof raw.spawnTs === 'number' ? raw.spawnTs : 0;
  return state;
}

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
      text_size: size || 20,
      color: color === undefined ? 0xffffff : color,
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
      radius: o.radius === undefined ? 0 : o.radius,
    }),
  );
  if (onTap) rect.addEventListener(hmUI.event.CLICK_DOWN, onTap);
  return rect;
}

// Dark pill behind a text line so it stays readable over bright backgrounds.
// The pill wraps the text (auto-sized + centered) instead of stretching full width.
function addBadgeText(x, y, w, h, text, size, color, alignH) {
  const pad = 8;
  const str = String(text);
  const fs = size || 20;
  const estTextW = Math.ceil(str.length * fs * 0.6);
  const pillW = Math.max(24, Math.min(w, estTextW + pad * 2));
  const isLeft = alignH !== undefined && alignH !== null
    && (alignH === hmUI.align.LEFT || alignH === 'left' || alignH === 'LEFT');
  let pillX;
  let textX;
  const textW = Math.max(10, pillW - pad * 2);
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
  const s = 64;
  addImg(Math.round(cx - s / 2), iconY, s, s, 'ui/coin_64x64.png');
  addText(Math.round(cx - 150), textY, 300, textH, String(coins), fontSize, color);
}

function addImg(x, y, w, h, src, onTap) {
  const img = push(hmUI.createWidget(hmUI.widget.IMG, { x, y, w, h, src }));
  if (onTap) img.addEventListener(hmUI.event.CLICK_DOWN, onTap);
  return img;
}

function addRect(x, y, w, h, color, radius, onTap, alpha) {
  const rect = push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w, h, color, radius: radius || 0,
      alpha: alpha === undefined ? 255 : alpha,
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
      radius: o.radius === undefined ? 14 : o.radius,
      color: 0xffffff,
      normal_color: o.normal === undefined ? BTN_GREEN : o.normal,
      press_color: o.press === undefined ? BTN_GREEN_PRESS : o.press,
      text_size: o.size || 20,
      click_func: () => {
        if (onTap) onTap();
      },
    }),
  );
}

function addBar(x, y, w, value, max) {
  const pct = clamp(value / max, 0, 1);
  const fillW = Math.round(pct * (w - 6));
  const barH = 30; // 1.5x the old 20px bar
  let color = 0xff0000;
  if (pct > 0.7) color = 0x00cc00;
  else if (pct > 0.4) color = 0xc25a2b;
  push(hmUI.createWidget(hmUI.widget.FILL_RECT, { x, y, w, h: barH, color: 0xffffff, radius: 4 }));
  if (fillW > 0) {
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: x + 3, y: y + 3, w: fillW, h: barH - 6, color, radius: 3,
    }));
  }
}

function addIconButton(x, y, size, src, onTap, dimmed) {
  addImg(x, y, size, size, src, dimmed ? null : onTap);
  if (dimmed) {
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w: size, h: size, color: 0x000000, alpha: 136, radius: 12,
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
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg/bg-home_390x450.png');

  // Balance: large coin centered with the amount on a dark pill right below.
  const balanceCx = Math.floor(width / 2);
  addImg(Math.round(balanceCx - 32), 8, 64, 64, 'ui/coin_64x64.png');
  addBadgeText(0, 76, width, 35, String(economy.coins), 32, 0xffffff);

  // Buy Egg — top-left, icon only (no label). Hidden when a purchase
  // isn't available (broke or roster full).
  if (engine.canBuyEgg()) {
    addIconButton(12, 84, 128, 'ui/egg_128x128.png', startEggSpin, false);
  }

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - 140, 84, 128, 'ui/bewilder_beast_128x128.png', () => {
    openModal({ kind: 'beast-intro' });
  }, false);

  // Earn Coins — centered horizontally, slightly below the screen center,
  // only when collectible coins exist.
  if (economy.hasCollectible) {
    const coinS = 64;
    addBadgeText(0, 236, width, 24, '+' + economy.collectible + ' coins', 17, 0xffee88);
    addIconButton(Math.floor((width - coinS) / 2), 264, coinS, 'ui/coin_64x64.png', () => {
      openModal({ kind: 'coin-summary', amount: engine.getEconomyView().collectible });
    }, false);
  }

  renderNav(width);
}

function renderDragon(width, view) {
  const breed = view.breed;
  const egg = view.stage === 'egg';
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg/bg-dragon_390x450.png');
  // Dim the bright bg artwork so the dragon and UI stay visible.
  addShade(0, 0, width, DEVICE_HEIGHT);

  if (egg) {
     // Still hatching: hide the breed so the dragon stays a surprise.
     // addBadgeText(0, 8, width, 30, 'Egg', 24, 0xffffff);
   } else {
     addBadgeText(0, 8, width, 30, breed.name, 24, 0xffffff);
     addBadgeText(0, 42, width, 26, 'Lv ' + view.level + '  ·  Age ' + view.ageDays + 'd', 18, 0xffeeaa);
   }

   const imgSize = 240;
   const imgX = Math.floor((width - imgSize) / 2);
   const imgY = 134;
   // Ground shadow under the egg / dragon (drawn first so it stays behind).
   const shW = 114;
   const shH = 28;
    addImg(Math.floor((width - shW) / 2), imgY + imgSize - 22, shW, shH, 'misc/shadow_114x28.png');
    if (egg) {
      addImg(imgX, imgY, imgSize, imgSize, 'eggs/' + breed.assetKey + '_240x240.png');
    } else {
      addImg(imgX, imgY + 28, imgSize, imgSize, 'dragons/' + breed.assetKey + '_240x240.png');
    }

   // Energy and Strength on top of the dragon (drawn after so they sit above).
   if (!egg) {
     const barH = 30;
     const eIconS = 56;
     const eGap = 8;
     const eBarW = 120;
     const eX = 12;
     const eY = 70;
      addImg(eX, eY, eIconS, eIconS, 'ui/energy_56x56.png');
     addBar(eX + eIconS + eGap, eY + Math.floor((eIconS - barH) / 2), eBarW, view.energy, CONFIG.energy.max);
     const sIconS = 56;
     const sGap = 6;
     const sPillW = 84;
     const sPillH = 30;
     const sX = 12;
     const sY = 132;
      addImg(sX, sY, sIconS, sIconS, 'ui/strength_56x56.png');
     addBadgeText(sX + sIconS + sGap, sY + Math.floor((sIconS - sPillH) / 2), sPillW, sPillH, String(view.strength), 22, 0xffffff, hmUI.align.LEFT);
   }

// Bottom action row — pinned to the very bottom (no roster strip on this
   // page). Eggs show just Home at bottom-right; hatched dragons show
   // Home / Sell / (Danger) / Training evenly spread with 20px side paddings.
   // Danger is hidden when no monsters wait. Each icon uses its exact
   // pre-scaled size (home/sell/training 84x84, danger 72x72), bottom-aligned.
   const sidePad = 20;
   const bottom = DEVICE_HEIGHT - 12;
   if (egg) {
     const eggIconS = 84;
     const eggY = bottom - eggIconS;
     addIconButton(width - sidePad - eggIconS, eggY, eggIconS, 'ui/home_84x84.png', () => goTo(0), false);
   } else {
     const hasMonsters = engine.getSpawnedMonsters().length > 0;
     const others = [
       { src: 'ui/sell_84x84.png', size: 84, dimmed: false, tap: () => openModal({ kind: 'sell', dragonId: view.dragon.id }) },
     ];
     if (hasMonsters) {
       others.push({ src: 'ui/danger_84x84.png', size: 84, dimmed: view.energy <= 0, tap: () => openMonsterSelect(view.dragon.id) });
     }
     others.push({ src: 'ui/training_84x84.png', size: 84, dimmed: view.energy <= 0, tap: () => openModal({ kind: 'train', dragonId: view.dragon.id }) });
     const cells = [
       { src: 'ui/home_84x84.png', size: 84, dimmed: false, tap: () => goTo(0) },
     ].concat(others);
     const maxS = 84;
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
  const SLOT_N = 5;
  const thumbS = 60;
  const frameS = 72;
  const left = 30;
  const y = DEVICE_HEIGHT - thumbS - 12;
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
      addImg(x - pad, y - pad, frameS, frameS, 'misc/frame_72x72.png');
      continue;
    }
    const idx = start + i;
    let src = 'eggs/night_fury_60x60.png';
    try {
      const v = engine.getDragonView(d.id);
      if (v) src = v.stage === 'egg'
        ? 'eggs/' + v.breed.assetKey + '_60x60.png'
        : 'dragons/' + v.breed.assetKey + '_60x60.png';
    } catch (_) {}
    const tap = () => goTo(idx + 1);
    addImg(x - pad, y - pad, frameS, frameS, 'misc/frame_72x72.png', tap);
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
  addRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_COLOR, 20, null, PANEL_ALPHA);
  addText(PANEL_X, PANEL_Y + 12, PANEL_W, 34, title, 22, 0xffffff);
  if (!locked) {
    addImg(PANEL_X + PANEL_W - 46, PANEL_Y + 8, 36, 36, 'ui/close_36x36.png', closeModal);
  }
}

function renderEggSpin() {
  const modal = _modal;
  if (modal.blocked) {
    renderModalShell('Get a New Egg', true);
    const full = modal.reason === 'roster-full';
    addText(PANEL_X + 20, PANEL_Y + 90, PANEL_W - 40, 40, full ? 'Roster is full' : 'Not enough coins', 22, 0xff8888);
    if (!full) {
      addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + 140, CONFIG.egg.price, PANEL_Y + 208, 40, 40, 0xffffff);
    }
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'OK', closeModal);
    return;
  }
  renderModalShell('Get a New Egg', true);
  if (modal.spinning) {
    // The dice is tappable too: rapid re-renders can swallow a button click
    // mid-press, so tapping anywhere on the dice also stops the spin.
    addImg(PANEL_X + 130, PANEL_Y + 80, 80, 80, 'ui/dice_80x80.png', stopEggSpin);
    addText(PANEL_X + 20, PANEL_Y + 180, PANEL_W - 40, 30, 'Tap Reveal to see your egg', 19, 0xdddddd);
    addButton(PANEL_X + 90, PANEL_Y + 220, 160, 48, 'Reveal', stopEggSpin);
  } else {
    // Breed stays hidden until it hatches — show the egg, not its name.
    const breed = breedForIndex(modal.breedIndex);
    const eggS = 60;
    addImg(PANEL_X + Math.floor((PANEL_W - eggS) / 2), PANEL_Y + 56, eggS, eggS, 'eggs/' + breed.assetKey + '_60x60.png');
    addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + 150, CONFIG.egg.price, PANEL_Y + 218, 40, 40, 0xffffff);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'OK', confirmEgg);
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
  addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + 60, preview.cost, PANEL_Y + 128, 40, 44, 0xffffff);
  addText(PANEL_X + 20, PANEL_Y + 168, PANEL_W - 40, 26, '-' + CONFIG.training.energyCost + ' energy per session', 16, 0xdddddd);
  if (!preview.canTrain) {
    const msg = preview.reason === 'no-energy'
      ? 'No energy - recover first'
      : preview.reason === 'not-enough-coins'
        ? 'Not enough coins'
        : 'Cannot train now';
    addText(PANEL_X + 20, PANEL_Y + 194, PANEL_W - 40, 30, msg, 18, 0xff8888);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', null, { normal: 0x555555 });
  } else {
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', () => startTrain(view.dragon.id));
  }
}

function renderTrainResult() {
  renderModalShell('Training', false);
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'ui/victory_60x60.png');
  const gainLine = _modal.text
    || ('Strength +' + _modal.gain + ' (' + _modal.strengthAfter + ')');
  addText(PANEL_X + 20, PANEL_Y + 140, PANEL_W - 40, 30, gainLine, 20, 0xaaffaa);
  if (_modal.energyCost !== undefined) {
    addText(PANEL_X + 20, PANEL_Y + 170, PANEL_W - 40, 26, '-' + _modal.energyCost + ' energy', 16, 0xdddddd);
  }
  if (_modal.leveledUp || (typeof _modal.text === 'string' && _modal.text.indexOf('Level up') !== -1)) {
    const lv = _modal.levelAfter !== undefined
      ? _modal.levelAfter
      : _modal.text.replace(/^.*Lv\s*/, '');
    addText(PANEL_X + 20, PANEL_Y + 196, PANEL_W - 40, 30, 'Level up! Lv ' + lv, 20, 0xffee88);
  }
  addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'OK', closeModal);
}

function renderSell() {
  const price = engine.sellPreview(_modal.dragonId);
  const view = engine.getDragonView(_modal.dragonId);
  if (price === null || !view) {
    closeModal();
    return;
  }
  renderModalShell('Sell ' + view.breed.name, false);
  addImg(PANEL_X + Math.floor((PANEL_W - 60) / 2), PANEL_Y + 50, 60, 60, 'dragons/' + view.breed.assetKey + '_60x60.png');
  addText(PANEL_X + 20, PANEL_Y + 120, PANEL_W - 40, 28, 'Will receive:', 20, 0xffffff);
  addCoinBig(PANEL_X + PANEL_W / 2, PANEL_Y + 155, price, PANEL_Y + 223, 40, 44, 0xffffff);
  addButton(PANEL_X + 40, PANEL_Y + PANEL_H - 70, 120, 48, 'Sell', () => confirmSell(view.dragon.id), { normal: 0xb71c1c });
  addButton(PANEL_X + 180, PANEL_Y + PANEL_H - 70, 120, 48, 'Keep', closeModal);
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
    addText(PANEL_X + 20, PANEL_Y + 120, PANEL_W - 40, 40, CONFIG.monsterSpawn.emptyStateText, 20, 0xdddddd);
    return;
  }
list.forEach((m, i) => {
     const rowY = PANEL_Y + 64 + i * 92;
     if (rowY + 90 > PANEL_Y + PANEL_H - 10) return;
     addImg(PANEL_X + 24, rowY, 72, 72, m.image.replace('.png', '_72x72.png'));
     addText(PANEL_X + 100, rowY, 100, 28, m.difficulty, 19, 0xffffff, hmUI.align.LEFT);
     addText(PANEL_X + 100, rowY + 28, 110, 20, 'win: +' + m.strengthGainWinMin + '-' + m.strengthGainWinMax + ' str', 14, 0xaaffaa, hmUI.align.LEFT);
     const strIconS = 32;
     addImg(PANEL_X + 100, rowY + 50, strIconS, strIconS, 'ui/strength_56x56.png');
     addText(PANEL_X + 100 + strIconS + 4, rowY + 52, 40, 26, String(m.strength), 17, 0xdddddd, hmUI.align.LEFT);
     addButton(PANEL_X + 210, rowY + 12, 100, 44, 'Fight', () => startMonsterFight(view.dragon.id, m.id), { size: 19 });
   });
}

function renderFightLines(maxShown) {
  const lines = _modal.lines || [];
  const shown = lines.slice(0, _modal.revealed);
  const startY = PANEL_Y + 150;
  shown.slice(-(maxShown || 4)).forEach((line, i) => {
    addText(PANEL_X + 16, startY + i * 40, PANEL_W - 32, 40, line, 16, 0xffffff);
  });
}

function renderMonsterFight() {
  const modal = _modal;
  const view = engine.getDragonView(modal.dragonId);
  const monster = engine.getSpawnedMonsters().find((m) => m.id === modal.monsterId);
  renderModalShell('Fight', modal.locked);
  if (monster) addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, monster.image.replace('.png', '_72x72.png'));
  if (view) addImg(PANEL_X + PANEL_W - 102, PANEL_Y + 56, 60, 60, 'dragons/' + view.breed.assetKey + '_60x60.png');
  if (monster && view) {
    addText(PANEL_X + 108, PANEL_Y + 66, PANEL_W - 216, 26, 'vs', 20, 0xffee88);
    addImg(PANEL_X + 119, PANEL_Y + 92, 56, 56, 'ui/strength_56x56.png');
    addText(PANEL_X + 119 + 56 + 6, PANEL_Y + 92 + 15, 50, 26, String(view.strength), 17, 0xdddddd, hmUI.align.LEFT);
  }
  renderFightLines(4);
  if (!modal.locked && modal.outcome) {
    addImg(PANEL_X + 140, PANEL_Y + PANEL_H - 140, 60, 60, modal.outcome.won ? 'ui/victory_60x60.png' : 'ui/loss_60x60.png');
    addText(
      PANEL_X + 20, PANEL_Y + PANEL_H - 76, PANEL_W - 40, 28,
      modal.outcome.won ? '+' + modal.outcome.reward + ' coins, +' + (modal.outcome.strengthGain || 0) + ' str' : 'Rest to recover',
      18, modal.outcome.won ? 0xaaffaa : 0xff8888,
    );
  }
}

function renderBeastIntro() {
  const beast = engine.getState().beast;
  renderModalShell(CONFIG.beast.name, false);
  addImg(PANEL_X + 134, PANEL_Y + 56, 72, 72, 'ui/bewilder_beast_72x72.png');
  if (beast.status !== 'alive') {
    const now = timeAdapter.getTime();
    const hrs = Math.max(1, Math.ceil(((beast.respawnAtMs || now) - now) / CONFIG.economy.coinAccrualIntervalMs));
    addText(PANEL_X + 20, PANEL_Y + 160, PANEL_W - 40, 30, 'Vanished - back in ~' + hrs + 'h', 19, 0xdddddd);
    return;
  }
  const beastBarY = PANEL_Y + 156;
  const beastIconS = 56;
  const beastGap = 8;
  const beastBarX = PANEL_X + 20 + beastIconS + beastGap;
  const beastBarW = 260 - beastIconS - beastGap;
  addImg(PANEL_X + 20, beastBarY - 13, beastIconS, beastIconS, 'ui/energy_56x56.png');
  addBar(beastBarX, beastBarY, beastBarW, beast.currentHp, beast.maxHp);
  const team = engine.getBeastParticipants();
  addText(
    PANEL_X + 20, PANEL_Y + 206, PANEL_W - 40, 30,
    team.length === 0 ? 'No dragons ready' : team.length + ' dragon(s) ready',
    18, team.length === 0 ? 0xff8888 : 0xaaffaa,
  );
  addText(
    PANEL_X + 20, PANEL_Y + 238, PANEL_W - 40, 44,
    'Warning: you can lose dragons if defeated! Winners gain strength.',
    16, 0xff8888,
  );
  if (team.length > 0) {
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Fight', startBeastFight);
  } else {
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Fight', null, { normal: 0x555555 });
  }
}

function renderBeastFight() {
  const modal = _modal;
  const beast = engine.getState().beast;
  renderModalShell('Beast Battle', modal.locked);
  addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, 'ui/bewilder_beast_72x72.png');
  const hp = modal.outcome && modal.revealed >= modal.lines.length
    ? modal.outcome.hpAfter
    : beast.currentHp;
  addBar(PANEL_X + 116, PANEL_Y + 76, 190, hp, beast.maxHp);
  renderFightLines(2);
  if (!modal.locked && modal.outcome) {
    addImg(PANEL_X + 140, PANEL_Y + PANEL_H - 140, 60, 60, modal.outcome.won ? 'ui/victory_60x60.png' : 'ui/loss_60x60.png');
    if (modal.outcome.won) {
      addText(
        PANEL_X + 20, PANEL_Y + PANEL_H - 76, PANEL_W - 40, 28,
        'Vanishes for a day! +' + modal.outcome.reward + ' coins, survivors +str',
        17, 0xaaffaa,
      );
    }
  }
}

function renderCoinSummary() {
  renderModalShell('Coins', false);
  addImg(PANEL_X + 138, PANEL_Y + 70, 64, 64, 'ui/coin_64x64.png');
  addText(
    PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 60,
    '+' + _modal.amount + ' coins added',
    20, 0xffee88,
  );
  addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'OK', () => {
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
