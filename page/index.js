import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import {
  MODAL_DIM_COLOR,
  PANEL_COLOR,
  BTN_GREEN,
  BTN_GREEN_PRESS,
  TEXT_PILL_COLOR,
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

// Dark pill behind a text line so it stays readable over bright backgrounds.
function addBadgeText(x, y, w, h, text, size, color, alignH) {
  const pad = 8;
  push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: Math.max(0, x - pad), y, w: w + pad * 2, h, color: TEXT_PILL_COLOR, radius: Math.floor(h / 2),
  }));
  return addText(x, y, w, h, text, size, color, alignH);
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
  push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
    x: startX, y: y - 2, w: pillW, h: rowH, color: TEXT_PILL_COLOR, radius: 16,
  }));
  addImg(startX + pad, y, iconS, iconS, 'coin.png');
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
  let color = 0xff0000;
  if (pct > 0.7) color = 0x00cc00;
  else if (pct > 0.4) color = 0xc25a2b;
  push(hmUI.createWidget(hmUI.widget.FILL_RECT, { x, y, w, h: 20, color: 0xffffff, radius: 4 }));
  if (fillW > 0) {
    push(hmUI.createWidget(hmUI.widget.FILL_RECT, {
      x: x + 3, y: y + 2, w: fillW, h: 16, color, radius: 3,
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
    text: 'Strength +' + res.gain + ' (' + res.strengthAfter + ')'
      + (res.levelAfter > res.levelBefore ? '  Level up! Lv ' + res.levelAfter : ''),
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
  const count = roster().length;
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg-home.png');
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);
  addBadgeText(0, 8, width, 30, 'Dragons: ' + engine.hatchedCount(), 24, 0xffffff);

  // Balance row, horizontally centered as one pill.
  addCoinRow(width, 42, economy.coins, 22);

  // Buy Egg — top-left, icon only (no label). Dimmed when coins insufficient.
  addIconButton(12, 84, 64, 'egg.png', startEggSpin, !economy.canAffordEgg);

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - 76, 84, 64, 'monsters/bewilder_beast.png', () => {
    openModal({ kind: 'beast-intro' });
  }, false);

  addBadgeText(0, 190, width, 28, 'Swipe to see dragons', 18, 0xffeeaa);
  addBadgeText(0, 222, width, 24, count === 0 ? 'Buy your first egg!' : (_screenIndex + 1) + ' / ' + (1 + count), 18, 0xffffff);

  // Earn Coins — bottom-left, only when collectible coins exist.
  if (economy.hasCollectible) {
    addBadgeText(12, 326, 110, 24, '+' + economy.collectible + ' coins', 17, 0xffee88, hmUI.align.LEFT);
    addIconButton(12, 352, 64, 'coin.png', () => {
      openModal({ kind: 'coin-summary', amount: engine.getEconomyView().collectible });
    }, false);
  }

  renderNav(width);
}

function renderDragon(width, view) {
  const breed = view.breed;
  const egg = view.stage === 'egg';
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg-dragon.png');
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);

  addBadgeText(0, 8, width, 30, breed.name, 24, 0xffffff);
  if (egg) {
    addBadgeText(0, 42, width, 26, 'Egg', 18, 0xffeeaa);
  } else {
    addBadgeText(0, 42, width, 26, 'Lv ' + view.level + '  ·  Age ' + view.ageDays + 'd', 18, 0xffeeaa);
    addImg(24, 72, 26, 26, 'energy.png');
    addBar(56, 75, 200, view.energy, CONFIG.energy.max);
    addBadgeText(262, 70, 104, 28, Math.round(view.energy) + '', 18, 0xffffff, hmUI.align.LEFT);
    addBadgeText(0, 102, width, 26, 'Strength ' + view.strength, 20, 0xffffff);
  }

  const imgSize = 240;
  const imgX = Math.floor((width - imgSize) / 2);
  const imgY = 134;
  if (egg) {
    addImg(imgX, imgY, imgSize, imgSize, 'eggs/' + breed.assetKey + '.png');
    addBadgeText(0, imgY + imgSize + 4, width, 28, 'Hatching...', 22, 0xffffff);
  } else {
    addImg(imgX, imgY, imgSize, imgSize, 'dragons/' + breed.assetKey + '.png');
  }

  // Bottom row — hatched dragons only, icon-only buttons equally spaced.
  if (!egg) {
    const rowY = DEVICE_HEIGHT - 96;
    const cellW = Math.floor(width / 3);
    const iconS = 56;
    const cells = [
      { src: 'training.png', dimmed: view.energy <= 0 },
      { src: 'sell.png', dimmed: false },
      { src: 'monster.png', dimmed: view.energy <= 0 },
    ];
    cells.forEach((cell, i) => {
      const cx = i * cellW;
      const ix = cx + Math.floor((cellW - iconS) / 2);
      const tap = i === 0
        ? () => openModal({ kind: 'train', dragonId: view.dragon.id })
        : i === 1
          ? () => openModal({ kind: 'sell', dragonId: view.dragon.id })
          : () => openMonsterSelect(view.dragon.id);
      addIconButton(ix, rowY + 4, iconS, cell.src, tap, cell.dimmed);
    });
  }

  renderNav(width);
}

function renderNav(width) {
  // Swipe-only navigation (no arrow buttons): just a page indicator pill.
  const y = DEVICE_HEIGHT - 40;
  addBadgeText(0, y, width, 28, (_screenIndex + 1) + ' / ' + (1 + roster().length), 18, 0xffffff);
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

function renderModalShell(title, locked) {
  const width = DEVICE_WIDTH;
  // Dim overlay with a no-op tap so it also swallows clicks in the web
  // runner (where a non-clickable FILL_RECT has pointer-events:none and
  // would let clicks fall through to icons behind the modal).
  addRect(0, 0, width, DEVICE_HEIGHT, MODAL_DIM_COLOR, 0, () => {});
  addRect(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, PANEL_COLOR, 20);
  addText(PANEL_X, PANEL_Y + 12, PANEL_W, 34, title, 22, 0xffffff);
  if (!locked) {
    addImg(PANEL_X + PANEL_W - 46, PANEL_Y + 8, 36, 36, 'close.png', closeModal);
  }
}

function renderEggSpin() {
  const modal = _modal;
  if (modal.blocked) {
    renderModalShell('Get a New Egg', false);
    const full = modal.reason === 'roster-full';
    addText(PANEL_X + 20, PANEL_Y + 90, PANEL_W - 40, 40, full ? 'Roster is full' : 'Not enough coins', 22, 0xff8888);
    if (!full) {
      addText(PANEL_X + 20, PANEL_Y + 130, PANEL_W - 40, 30, 'Price: ' + CONFIG.egg.price + ' coins', 19, 0xdddddd);
    }
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo', null, { normal: 0x555555 });
    return;
  }
  renderModalShell('Get a New Egg', false);
  if (modal.spinning) {
    const symbols = CONFIG.ui.eggSpinSymbols;
    addText(PANEL_X + 20, PANEL_Y + 80, PANEL_W - 40, 90, symbols[modal.symbolIdx] || '?', 64, 0xffee88);
    addText(PANEL_X + 20, PANEL_Y + 180, PANEL_W - 40, 30, 'Tap Stop to lock breed', 19, 0xdddddd);
    addButton(PANEL_X + 90, PANEL_Y + 220, 160, 48, 'Stop', stopEggSpin);
  } else {
    const breed = breedForIndex(modal.breedIndex);
    addImg(PANEL_X + 130, PANEL_Y + 60, 80, 80, 'eggs/' + breed.assetKey + '.png');
    addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 36, breed.name, 22, 0xaaffaa);
    addText(PANEL_X + 20, PANEL_Y + 186, PANEL_W - 40, 28, 'Price: ' + CONFIG.egg.price + ' coins', 19, 0xdddddd);
  }
  addButton(
    PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo',
    modal.spinning ? null : confirmEgg,
    modal.spinning ? { normal: 0x555555 } : {},
  );
}

function renderTrain() {
  const view = engine.getDragonView(_modal.dragonId);
  if (!view || view.stage === 'egg') {
    closeModal();
    return;
  }
  const preview = engine.trainPreview(view.dragon.id);
  renderModalShell('Train ' + view.breed.name, false);
  addText(PANEL_X + 20, PANEL_Y + 70, PANEL_W - 40, 30, 'Cost: ' + preview.cost + ' coins', 20, 0xffffff);
  addText(PANEL_X + 20, PANEL_Y + 104, PANEL_W - 40, 30, 'Strength: ' + view.strength, 19, 0xdddddd);
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
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'victory.png');
  addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 60, _modal.text || '', 20, 0xaaffaa);
  addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo', closeModal);
}

function renderSell() {
  const price = engine.sellPreview(_modal.dragonId);
  const view = engine.getDragonView(_modal.dragonId);
  if (price === null || !view) {
    closeModal();
    return;
  }
  renderModalShell('Sell ' + view.breed.name, false);
  addImg(PANEL_X + 130, PANEL_Y + 60, 80, 80, 'dragons/' + view.breed.assetKey + '.png');
  addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 32, 'Will receive: ' + price + ' coins', 20, 0xffffff);
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
    addText(PANEL_X + 92, rowY + 32, 120, 26, 'STR ' + m.strength, 17, 0xdddddd, hmUI.align.LEFT);
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
    addImg(PANEL_X + 140, PANEL_Y + PANEL_H - 140, 60, 60, modal.outcome.won ? 'victory.png' : 'loss.png');
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
  addImg(PANEL_X + 110, PANEL_Y + 56, 120, 90, 'monsters/bewilder_beast.png');
  if (beast.status !== 'alive') {
    const now = timeAdapter.getTime();
    const hrs = Math.max(1, Math.ceil(((beast.respawnAtMs || now) - now) / CONFIG.economy.coinAccrualIntervalMs));
    addText(PANEL_X + 20, PANEL_Y + 160, PANEL_W - 40, 30, 'Vanished - back in ~' + hrs + 'h', 19, 0xdddddd);
    return;
  }
  addBar(PANEL_X + 40, PANEL_Y + 156, 260, beast.currentHp, beast.maxHp);
  addText(PANEL_X + 20, PANEL_Y + 182, PANEL_W - 40, 28, 'HP ' + beast.currentHp + ' / ' + beast.maxHp, 18, 0xffffff);
  const team = engine.getBeastParticipants();
  addText(
    PANEL_X + 20, PANEL_Y + 212, PANEL_W - 40, 30,
    team.length === 0 ? 'No dragons ready (0 energy)' : team.length + ' dragon(s) ready',
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
  addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, 'monsters/bewilder_beast.png');
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
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'coin.png');
  addText(
    PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 60,
    '+' + _modal.amount + ' coins added (hourly generation)',
    20, 0xffee88,
  );
  addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo', () => {
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
