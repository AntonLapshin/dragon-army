import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import {
  PANEL_COLOR,
  BTN_GREEN,
  BTN_GREEN_PRESS,
  PANEL_W,
  PANEL_H,
  PANEL_X,
  PANEL_Y,
} from './index.style.js';
import { CONFIG, MONSTERS, breedForIndex, clamp } from '../engine/config';
import { createGameEngine, createNewGameState } from '../engine/engine';

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
// Navigation
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

// Zepp OS ignores FILL_RECT alpha, so every translucent surface (text
// pills, modal dim, bg dimming) uses the pre-baked translucent PNG
// misc/overlay.png instead of a semi-transparent color. The IMG widget
// stretches it to the requested box; the source is a flat shade so any
// target size keeps the same translucency.
function addShade(x, y, w, h, onTap) {
  return addImg(x, y, w, h, 'misc/overlay.png', onTap);
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
  push(hmUI.createWidget(hmUI.widget.IMG, {
    x: Math.max(0, pillX), y, w: pillW, h, src: 'misc/overlay.png',
  }));
  return addText(textX, y, textW, h, str, fs, color, alignH);
}

// Horizontally centered "coin icon + value" row with a dark pill behind it.
function addCoinRow(width, y, coins, size) {
  const iconS = 28;
  const gap = 6;
  const text = String(coins);
  const charW = Math.ceil((size || 22) * 0.62);
  const textW = Math.max(30, text.length * charW + 10);
  const pad = 10;
  const totalW = iconS + gap + textW;
  const pillW = totalW + pad * 2;
  const startX = Math.floor((width - pillW) / 2);
  const rowH = 32;
  addShade(startX, y - 2, pillW, rowH);
  addImg(startX + pad, y, iconS, iconS, 'ui/coin.png');
  addText(startX + pad + iconS + gap, y, textW, iconS, text, size || 22, 0xffffff, hmUI.align.LEFT);
}

// Full-screen swipe navigation. Must be created FIRST (bottom z-layer) so the
// overlay never sits on top of icons/buttons and blocks their clicks.
// (In zepp-web-runner the GESTURE div renders last-on-top when created last,
// which swallowed every click in desktop testing.)
function addSwipeNav(width) {
  try {
    const g = push(hmUI.createWidget(hmUI.widget.GESTURE, { x: 0, y: 0, w: width, h: DEVICE_HEIGHT }));
    g.addEventListener(hmUI.event.SWIPE_LEFT, () => goTo(_screenIndex + 1));
    g.addEventListener(hmUI.event.SWIPE_RIGHT, () => goTo(_screenIndex - 1));
  } catch (_) {}
}

function addImg(x, y, w, h, src, onTap) {
  const img = push(hmUI.createWidget(hmUI.widget.IMG, { x, y, w, h, src }));
  if (onTap) img.addEventListener(hmUI.event.CLICK_DOWN, onTap);
  return img;
}

function addRect(x, y, w, h, color, radius, onTap) {
  const rect = push(
    hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x, y, w, h, color, radius: radius || 0,
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
      x, y, w: size, h: size, color: 0x88000000, radius: 12,
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
        ? 'Victory! +' + res.coinReward + ' coins'
        : 'Dragon is tired, will recover automatically',
    ],
    { won: res.won, reward: res.coinReward, energyAfter: res.energyAfter, rawDamage: res.rawDamage },
  );
}

function startBeastFight() {
  if (!engine.canFightBeast().ok) return;
  const res = engine.fightBeast();
  if (!res.ok) return;
  const lines = res.turns.map((t) => t.text);
  lines.push(
    res.won
      ? 'Bewilder Beast vanishes for a day. Continue adventure. +' + res.reward + ' coins'
      : 'Defeat - roster empty. Buy a new egg. Return to Main Screen.',
  );
  openLockedFight(
    { kind: 'beast-fight' },
    lines,
    { won: res.won, reward: res.reward, hpAfter: res.beastHpAfter },
  );
}

// Locked fight modal: X hidden until every turn line has been revealed.
function openLockedFight(base, lines, outcome) {
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
  }, CONFIG.ui.fightTurnDelayMs);
  if (_page) _page.render();
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function renderMain(width) {
  const economy = engine.getEconomyView();
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg/bg-home.png');
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);

  // Balance row, horizontally centered as one pill.
  addCoinRow(width, 42, economy.coins, 22);

  // Buy Egg — top-left, icon only (no label). Hidden when a purchase
  // isn't available (broke or roster full).
  if (engine.canBuyEgg()) {
    addIconButton(12, 84, 128, 'ui/egg.png', startEggSpin, false);
  }

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - 140, 84, 128, 'ui/bewilder_beast.png', () => {
    openModal({ kind: 'beast-intro' });
  }, false);

  // Earn Coins — centered horizontally, slightly below the screen center,
  // only when collectible coins exist.
  if (economy.hasCollectible) {
    const coinS = 64;
    addBadgeText(0, 236, width, 24, '+' + economy.collectible + ' coins', 17, 0xffee88);
    addIconButton(Math.floor((width - coinS) / 2), 264, coinS, 'ui/coin.png', () => {
      openModal({ kind: 'coin-summary', amount: engine.getEconomyView().collectible });
    }, false);
  }

  renderNav(width);
}

function renderDragon(width, view) {
  const breed = view.breed;
  const egg = view.stage === 'egg';
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg/bg-dragon.png');
  // Dim the bright bg artwork so the dragon and UI stay visible.
  addShade(0, 0, width, DEVICE_HEIGHT);
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);

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
   addImg(Math.floor((width - shW) / 2), imgY + imgSize - 22, shW, shH, 'misc/shadow.png');
   if (egg) {
     addImg(imgX, imgY, imgSize, imgSize, 'eggs/' + breed.assetKey + '.png');
   } else {
     addImg(imgX, imgY, imgSize, imgSize, 'dragons/' + breed.assetKey + '.png');
   }

   // Energy and Strength on top of the dragon (drawn after so they sit above).
   if (!egg) {
     const barH = 30;
     const eIconS = 56;
     const eGap = 8;
     const eBarW = 120;
     const eX = 12;
     const eY = 70;
     addImg(eX, eY, eIconS, eIconS, 'ui/energy.png');
     addBar(eX + eIconS + eGap, eY + Math.floor((eIconS - barH) / 2), eBarW, view.energy, CONFIG.energy.max);
     const sIconS = 56;
     const sGap = 6;
     const sPillW = 84;
     const sPillH = 30;
     const sX = 12;
     const sY = 132;
     addImg(sX, sY, sIconS, sIconS, 'ui/strength.png');
     addBadgeText(sX + sIconS + sGap, sY + Math.floor((sIconS - sPillH) / 2), sPillW, sPillH, String(view.strength), 22, 0xffffff, hmUI.align.LEFT);
   }

// Bottom action row — pinned to the very bottom (no roster strip on this
   // page). Eggs show just Home at bottom-right; hatched dragons show
   // Home / Train / Sell / (Danger) evenly spread with 30px side paddings.
   // Danger is hidden when no monsters wait.
   const sidePad = 30;
   if (egg) {
     const eggIconS = 84;
     const eggY = DEVICE_HEIGHT - eggIconS - 12;
     addIconButton(width - sidePad - eggIconS, eggY, eggIconS, 'ui/home.png', () => goTo(0), false);
   } else {
     const hasMonsters = engine.getSpawnedMonsters().length > 0;
     const others = [
       { src: 'ui/sell.png', dimmed: false, tap: () => openModal({ kind: 'sell', dragonId: view.dragon.id }) },
     ];
     if (hasMonsters) {
       others.push({ src: 'ui/danger.png', dimmed: view.energy <= 0, tap: () => openMonsterSelect(view.dragon.id) });
     }
     others.push({ src: 'ui/training.png', dimmed: view.energy <= 0, tap: () => openModal({ kind: 'train', dragonId: view.dragon.id }) });
     // 4 icons of 84px would overlap in 330px, so shrink when Danger is shown.
     const iconS = others.length >= 3 ? 72 : 84;
     const rowY = DEVICE_HEIGHT - iconS - 12;
     const cells = [
       { src: 'ui/home.png', dimmed: false, tap: () => goTo(0) },
     ].concat(others);
     const step = (width - sidePad * 2 - iconS) / (cells.length - 1);
     cells.forEach((cell, i) => {
       const ix = Math.round(sidePad + i * step);
       addIconButton(ix, rowY, iconS, cell.src, cell.tap, cell.dimmed);
     });
   }
}

function renderRosterStrip(width) {
  // Bottom thumbnail navigation: tap a thumbnail to jump to that dragon/egg
  // page. 30px left/right paddings; 5 slots fill the row exactly.
  const list = roster();
  if (list.length === 0) return;
  const thumbS = 60;
  const left = 30;
  const y = DEVICE_HEIGHT - thumbS - 12;
  let start = 0;
  let visible = list;
  if (list.length > 5) {
    const cur = Math.max(0, _screenIndex - 1);
    start = Math.min(Math.max(0, cur - 2), list.length - 5);
    visible = list.slice(start, start + 5);
  }
  visible.forEach((d, i) => {
    const idx = start + i;
    let src = 'ui/egg.png';
    try {
      const v = engine.getDragonView(d.id);
      if (v) src = v.stage === 'egg'
        ? 'eggs/' + v.breed.assetKey + '.png'
        : 'dragons/' + v.breed.assetKey + '.png';
    } catch (_) {}
    // 5 slots: spread exactly from 30px to width-30px. Fewer: left-aligned.
    const n = visible.length;
    const step = n >= 5 ? (width - left * 2 - thumbS) / 4 : thumbS + 8;
    const x = Math.round(left + i * step);
    addImg(x, y, thumbS, thumbS, src, () => goTo(idx + 1));
  });
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
  // Dim overlay with a no-op tap so it also swallows clicks in the web
  // runner (where a non-clickable layer has pointer-events:none and
  // would let clicks fall through to icons behind the modal).
  // Uses misc/overlay.png: Zepp OS ignores FILL_RECT alpha, so a
  // pre-baked translucent image does the dimming instead.
  addShade(0, 0, width, DEVICE_HEIGHT, () => {});
  addRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_COLOR, 20);
  addText(PANEL_X, PANEL_Y + 12, PANEL_W, 34, title, 22, 0xffffff);
  if (!locked) {
    addImg(PANEL_X + PANEL_W - 46, PANEL_Y + 8, 36, 36, 'ui/close.png', closeModal);
  }
}

function renderEggSpin() {
  const modal = _modal;
  if (modal.blocked) {
    renderModalShell('Get a New Egg', true);
    const full = modal.reason === 'roster-full';
    addText(PANEL_X + 20, PANEL_Y + 90, PANEL_W - 40, 40, full ? 'Roster is full' : 'Not enough coins', 22, 0xff8888);
    if (!full) {
      addCoinRow(DEVICE_WIDTH, PANEL_Y + 140, CONFIG.egg.price, 20);
    }
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'OK', closeModal);
    return;
  }
  renderModalShell('Get a New Egg', true);
  if (modal.spinning) {
    // The dice is tappable too: rapid re-renders can swallow a button click
    // mid-press, so tapping anywhere on the dice also stops the spin.
    addImg(PANEL_X + 130, PANEL_Y + 80, 80, 80, 'ui/dice.png', stopEggSpin);
    addText(PANEL_X + 20, PANEL_Y + 180, PANEL_W - 40, 30, 'Tap Reveal to see your egg', 19, 0xdddddd);
    addButton(PANEL_X + 90, PANEL_Y + 220, 160, 48, 'Reveal', stopEggSpin);
  } else {
    // Breed stays hidden until it hatches — show the egg, not its name.
    const breed = breedForIndex(modal.breedIndex);
    const eggS = 160;
    addImg(PANEL_X + Math.floor((PANEL_W - eggS) / 2), PANEL_Y + 56, eggS, eggS, 'eggs/' + breed.assetKey + '.png');
    addCoinRow(DEVICE_WIDTH, PANEL_Y + 232, CONFIG.egg.price, 20);
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
  addCoinRow(DEVICE_WIDTH, PANEL_Y + 90, preview.cost, 22);
  if (!preview.canTrain) {
    const msg = preview.reason === 'no-energy'
      ? 'No energy - recover first'
      : preview.reason === 'not-enough-coins'
        ? 'Not enough coins'
        : 'Cannot train now';
    addText(PANEL_X + 20, PANEL_Y + 140, PANEL_W - 40, 30, msg, 18, 0xff8888);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', null, { normal: 0x555555 });
  } else {
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', () => startTrain(view.dragon.id));
  }
}

function renderTrainResult() {
  renderModalShell('Training', false);
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'ui/victory.png');
  const gainLine = _modal.text
    || ('Strength +' + _modal.gain + ' (' + _modal.strengthAfter + ')');
  addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 30, gainLine, 20, 0xaaffaa);
  if (_modal.leveledUp || (typeof _modal.text === 'string' && _modal.text.indexOf('Level up') !== -1)) {
    const lv = _modal.levelAfter !== undefined
      ? _modal.levelAfter
      : _modal.text.replace(/^.*Lv\s*/, '');
    addText(PANEL_X + 20, PANEL_Y + 182, PANEL_W - 40, 30, 'Level up! Lv ' + lv, 20, 0xffee88);
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
  addImg(PANEL_X + Math.floor((PANEL_W - 160) / 2), PANEL_Y + 50, 160, 160, 'dragons/' + view.breed.assetKey + '.png');
  addText(PANEL_X + 20, PANEL_Y + 216, PANEL_W - 40, 28, 'Will receive:', 20, 0xffffff);
  addCoinRow(DEVICE_WIDTH, PANEL_Y + 248, price, 22);
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
     if (rowY + 84 > PANEL_Y + PANEL_H - 10) return;
     addImg(PANEL_X + 24, rowY, 60, 60, m.image);
     addText(PANEL_X + 92, rowY, 120, 30, m.difficulty, 19, 0xffffff, hmUI.align.LEFT);
     const strIconS = 22;
     addImg(PANEL_X + 92, rowY + 34, strIconS, strIconS, 'ui/strength.png');
     addText(PANEL_X + 92 + strIconS + 4, rowY + 32, 120, 26, String(m.strength), 17, 0xdddddd, hmUI.align.LEFT);
     addButton(PANEL_X + 210, rowY + 12, 100, 44, 'Fight', () => startMonsterFight(view.dragon.id, m.id), { size: 19 });
   });
}

function renderFightLines() {
  const lines = _modal.lines || [];
  const shown = lines.slice(0, _modal.revealed);
  const startY = PANEL_Y + 150;
  shown.slice(-4).forEach((line, i) => {
    addText(PANEL_X + 16, startY + i * 40, PANEL_W - 32, 40, line, 16, 0xffffff);
  });
}

function renderMonsterFight() {
  const modal = _modal;
  const view = engine.getDragonView(modal.dragonId);
  const monster = engine.getSpawnedMonsters().find((m) => m.id === modal.monsterId);
  renderModalShell('Fight', modal.locked);
  if (monster) addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, monster.image);
  if (view) addImg(PANEL_X + PANEL_W - 102, PANEL_Y + 56, 72, 72, 'dragons/' + view.breed.assetKey + '.png');
  if (monster && view) {
    addText(PANEL_X + 108, PANEL_Y + 66, PANEL_W - 216, 26, 'vs', 20, 0xffee88);
    addText(PANEL_X + 108, PANEL_Y + 94, PANEL_W - 216, 26, 'STR ' + view.strength, 17, 0xdddddd);
  }
  renderFightLines();
  if (!modal.locked && modal.outcome) {
    addImg(PANEL_X + 140, PANEL_Y + PANEL_H - 140, 60, 60, modal.outcome.won ? 'ui/victory.png' : 'ui/loss.png');
    addText(
      PANEL_X + 20, PANEL_Y + PANEL_H - 76, PANEL_W - 40, 28,
      modal.outcome.won ? '+' + modal.outcome.reward + ' coins' : '0 energy? rest to recover',
      18, modal.outcome.won ? 0xaaffaa : 0xff8888,
    );
  }
}

function renderBeastIntro() {
  const beast = engine.getState().beast;
  renderModalShell(CONFIG.beast.name, false);
  addImg(PANEL_X + 110, PANEL_Y + 56, 120, 90, 'ui/bewilder_beast.png');
  if (beast.status !== 'alive') {
    const now = timeAdapter.getTime();
    const hrs = Math.max(1, Math.ceil(((beast.respawnAtMs || now) - now) / CONFIG.economy.coinAccrualIntervalMs));
    addText(PANEL_X + 20, PANEL_Y + 160, PANEL_W - 40, 30, 'Vanished - back in ~' + hrs + 'h', 19, 0xdddddd);
    return;
  }
  const beastBarY = PANEL_Y + 156;
  const beastIconS = 36;
  const beastGap = 8;
  const beastBarX = PANEL_X + 20 + beastIconS + beastGap;
  const beastBarW = 260 - beastIconS - beastGap;
  addImg(PANEL_X + 20, beastBarY - 3, beastIconS, beastIconS, 'ui/energy.png');
  addBar(beastBarX, beastBarY, beastBarW, beast.currentHp, beast.maxHp);
  const team = engine.getBeastParticipants();
  addText(
    PANEL_X + 20, PANEL_Y + 196, PANEL_W - 40, 30,
    team.length === 0 ? 'No dragons ready' : team.length + ' dragon(s) ready',
    18, team.length === 0 ? 0xff8888 : 0xaaffaa,
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
  addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, 'ui/bewilder_beast.png');
  const hp = modal.outcome && modal.revealed >= modal.lines.length
    ? modal.outcome.hpAfter
    : beast.currentHp;
  addBar(PANEL_X + 116, PANEL_Y + 76, 190, hp, beast.maxHp);
  addText(PANEL_X + 116, PANEL_Y + 100, 190, 24, 'HP ' + hp, 17, 0xffffff, hmUI.align.LEFT);
  renderFightLines();
  if (!modal.locked && modal.outcome) {
    addText(
      PANEL_X + 20, PANEL_Y + PANEL_H - 76, PANEL_W - 40, 28,
      modal.outcome.won ? 'Vanishes for a day! +' + modal.outcome.reward : 'Defeat - buy a new egg',
      17, modal.outcome.won ? 0xaaffaa : 0xff8888,
    );
    if (!modal.outcome.won && roster().length === 0) {
      addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 118, 160, 40, 'Main Screen', () => {
        _modal = null;
        _screenIndex = 0;
        if (_page) _page.render();
      }, { size: 18 });
    }
  }
}

function renderCoinSummary() {
  renderModalShell('Coins', false);
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'ui/coin.png');
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
