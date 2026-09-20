import hmUI from '@zos/ui';
import { DEVICE_WIDTH, DEVICE_HEIGHT } from '../utils/constants.js';
import { storageAdapter } from '../utils/storageAdapter.js';
import { timeAdapter } from '../utils/timeAdapter.js';
import {
  MODAL_DIM_COLOR,
  PANEL_COLOR,
  BTN_GREEN,
  BTN_GREEN_PRESS,
} from './index.style.js';

/**
 * Dragon Army — swipeable UI (interface.md) in the ws/koala style.
 *
 * Screens (GESTURE swipe + ◀/▶ fallback buttons):
 *   index 0            → Main Control Screen (bg-home.png)
 *   index 1..N         → one Dragon Detail Screen per dragon/egg (bg-dragon.png)
 *
 * Modals (§3, no animation, dim overlay, X top-right except locked fights):
 *   egg-spin / train / train-result / sell / monster-select /
 *   monster-fight / beast-intro / beast-fight / coin-summary
 *
 * Balance numbers mirror engine/config.ts (the source of truth for tests);
 * this file is intentionally dependency-free pure JS so it runs on-device.
 */

// ---------------------------------------------------------------------------
// Balance (must stay in sync with engine/config.ts)
// ---------------------------------------------------------------------------

const STARTING_COINS = 100;
const EGG_PRICE = 100;
const HOURLY_COINS = 12;
const ACCRUAL_MS = 60 * 60 * 1000;
const MAX_UNCOLLECTED_MS = 12 * ACCRUAL_MS;
const HATCH_MIN_MS = 24 * ACCRUAL_MS;
const HATCH_MAX_MS = 48 * ACCRUAL_MS;
const ENERGY_MAX = 100;
const ENERGY_RECOVERY_PER_H = 10;
const TRAIN_BASE = 8;
const TRAIN_PER_STR = 0.8;
const TRAIN_GAIN_MIN = 3;
const TRAIN_GAIN_MAX = 7;
const SELL_BASE = 20;
const SELL_PER_STR = 3.0;
const SELL_PER_AGE = 5;
const BONUS_MIN = 0;
const BONUS_MAX = 10;
const BEAST_HP = 260;
const BEAST_STR = 20;
const BEAST_COUNTER_MIN = 18;
const BEAST_COUNTER_MAX = 28;
const BEAST_REWARD_MIN = 150;
const BEAST_REWARD_MAX = 200;
const BEAST_RESPAWN_MS = 24 * ACCRUAL_MS;
const SPIN_SYMBOLS = '167468123?!-+';
const SPIN_FRAME_MS = 120;
const FIGHT_TURN_MS = 900;
const TICK_MS = 5 * 1000;
const MAX_ROSTER = 12;
const DAY_MS = 24 * ACCRUAL_MS;

// Semi-transparent black pill drawn behind texts so they stay readable
// over the bright bg-home / bg-dragon artwork.
const TEXT_PILL_COLOR = 0xcc000000;

const LEVELS = [0, 15, 25, 35, 45, 60, 75, 90, 110, 135];

// Catalogue: key = asset basename in assets/dragons + assets/eggs.
const BREEDS = [
  { key: 'gronkle', name: 'Gronkle', mult: 1.0, sMin: 8, sMax: 14 },
  { key: 'hideous_zippleback', name: 'Hideous Zippleback', mult: 1.0, sMin: 8, sMax: 14 },
  { key: 'snowtail', name: 'Snowtail', mult: 1.0, sMin: 8, sMax: 14 },
  { key: 'windwalker', name: 'Windwalker', mult: 1.05, sMin: 9, sMax: 14 },
  { key: 'deadly_nadder', name: 'Deadly Nadder', mult: 1.05, sMin: 9, sMax: 15 },
  { key: 'wooly_howl', name: 'Wooly Howl', mult: 1.15, sMin: 11, sMax: 16 },
  { key: 'monstrous_nightmare', name: 'Monstrous Nightmare', mult: 1.15, sMin: 11, sMax: 17 },
  { key: 'razorwhip', name: 'Razorwhip', mult: 1.2, sMin: 12, sMax: 17 },
  { key: 'songwing', name: 'Songwing', mult: 1.2, sMin: 12, sMax: 18 },
  { key: 'triple_stryke', name: 'Triple Stryke', mult: 1.25, sMin: 13, sMax: 18 },
  { key: 'stormcutter', name: 'Stormcutter', mult: 1.3, sMin: 14, sMax: 20 },
  { key: 'skrill', name: 'Skrill', mult: 1.3, sMin: 14, sMax: 20 },
  { key: 'light_night', name: 'Light Night', mult: 1.35, sMin: 15, sMax: 21 },
  { key: 'night_light', name: 'Night Light', mult: 1.45, sMin: 16, sMax: 22 },
  { key: 'light_fury', name: 'Light Fury', mult: 1.55, sMin: 18, sMax: 24 },
  { key: 'night_fury', name: 'Night Fury', mult: 1.7, sMin: 20, sMax: 28 },
];

// Monster rows map onto the sliced assets/monsters images.
const MONSTERS = [
  {
    id: 'monster-1', difficulty: 'Easy', img: 'monsters/gronkle.png',
    strength: 15, rewardMin: 15, rewardMax: 25, spawnChance: 0.65,
    lossWinMin: 6, lossWinMax: 12, lossLoseMin: 12, lossLoseMax: 20,
  },
  {
    id: 'monster-2', difficulty: 'Medium', img: 'monsters/deadly_nadder.png',
    strength: 32, rewardMin: 35, rewardMax: 55, spawnChance: 0.28,
    lossWinMin: 10, lossWinMax: 16, lossLoseMin: 16, lossLoseMax: 26,
  },
  {
    id: 'monster-3', difficulty: 'Hard', img: 'monsters/monstrous_nightmare.png',
    strength: 55, rewardMin: 70, rewardMax: 110, spawnChance: 0.12,
    lossWinMin: 14, lossWinMax: 22, lossLoseMin: 22, lossLoseMax: 34,
  },
];

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function levelFor(strength) {
  let level = 1;
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (strength >= LEVELS[i]) level = i + 1;
  }
  return level;
}

function trainingCost(strength) {
  return Math.floor(TRAIN_BASE + strength * TRAIN_PER_STR);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// ---------------------------------------------------------------------------
// Persistent store (JSON via storageAdapter)
// ---------------------------------------------------------------------------

let _store = null;
let _page = null;
let _widgets = [];
let _tickTimer = null;
let _spinTimer = null;
let _fightTimer = null;

// Screen: 0 = main, 1..N = dragon detail (roster order).
let _screenIndex = 0;
// Modal: null or { kind, ...payload }. Fight modals carry reveal progress.
let _modal = null;

function freshStore(now) {
  return {
    coins: STARTING_COINS,
    dragons: [],
    lastCoinCollectMs: now,
    beastHp: BEAST_HP,
    beastStatus: 'alive',
    beastRespawnAt: null,
    spawned: [],
    spawnTs: 0,
    createdAt: now,
  };
}

function loadStore() {
  let saved = null;
  try {
    saved = storageAdapter.load();
  } catch (_) {
    saved = null;
  }
  const now = timeAdapter.getTime();
  if (saved && typeof saved.coins === 'number' && Array.isArray(saved.dragons)) {
    _store = Object.assign(freshStore(now), saved);
  } else {
    _store = freshStore(now);
  }
  persist();
}

function persist() {
  try {
    storageAdapter.save(_store);
  } catch (_) {}
}

function breedOf(dragon) {
  return BREEDS[clamp(dragon.breedIdx, 0, BREEDS.length - 1)];
}

function isHatched(dragon) {
  return dragon.hatchedAt !== null && dragon.hatchedAt !== undefined;
}

function liveEnergy(dragon, now) {
  const elapsedH = Math.max(0, now - dragon.energyTs) / ACCRUAL_MS;
  return clamp(dragon.energy + elapsedH * ENERGY_RECOVERY_PER_H, 0, ENERGY_MAX);
}

function ageDays(dragon, now) {
  if (!isHatched(dragon)) return 0;
  const elapsed = now - dragon.hatchedAt;
  if (elapsed <= 0) return 0;
  return Math.floor(elapsed / DAY_MS);
}

function sellPrice(dragon, now) {
  const breed = breedOf(dragon);
  const energy = liveEnergy(dragon, now);
  const factor = 0.5 + 0.5 * (energy / ENERGY_MAX);
  return Math.floor(
    (SELL_BASE + dragon.strength * SELL_PER_STR + ageDays(dragon, now) * SELL_PER_AGE) *
      breed.mult *
      factor,
  );
}

function collectible(now) {
  const elapsed = Math.max(0, now - _store.lastCoinCollectMs);
  if (elapsed < ACCRUAL_MS) return 0;
  const earned = Math.floor(elapsed / ACCRUAL_MS) * HOURLY_COINS;
  const cap = HOURLY_COINS * (MAX_UNCOLLECTED_MS / ACCRUAL_MS);
  return Math.min(earned, cap);
}

function hatchedCount() {
  return _store.dragons.filter(isHatched).length;
}

function screenCount() {
  return 1 + _store.dragons.length;
}

function currentDragon() {
  if (_screenIndex <= 0) return null;
  return _store.dragons[_screenIndex - 1] || null;
}

function findDragon(id) {
  return _store.dragons.find((d) => d.id === id) || null;
}

// Idempotent wall-clock tick: hatching + beast respawn (recovery is derived).
function tick() {
  const now = timeAdapter.getTime();
  let changed = false;
  for (const d of _store.dragons) {
    if (!isHatched(d) && now >= d.hatchAt) {
      const breed = breedOf(d);
      d.hatchedAt = now;
      d.strength = randInt(breed.sMin, breed.sMax);
      changed = true;
    }
  }
  if (_store.beastStatus === 'vanished' && _store.beastRespawnAt !== null && now >= _store.beastRespawnAt) {
    _store.beastStatus = 'alive';
    _store.beastHp = BEAST_HP;
    _store.beastRespawnAt = null;
    changed = true;
  }
  if (changed) persist();
  if (_screenIndex > _store.dragons.length) _screenIndex = _store.dragons.length;
}

function refreshSpawn(force) {
  const now = timeAdapter.getTime();
  if (!force && now - _store.spawnTs < 15 * 60 * 1000 && _store.spawned.length >= 0 && _store.spawnTs !== 0) {
    return _store.spawned;
  }
  const spawned = MONSTERS.filter((m) => Math.random() < m.spawnChance).slice(0, 3);
  _store.spawned = spawned.map((m) => m.id);
  _store.spawnTs = now;
  persist();
  return _store.spawned;
}

function spawnedMonsters() {
  return _store.spawned
    .map((id) => MONSTERS.find((m) => m.id === id))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function goTo(index) {
  _screenIndex = clamp(index, 0, _store.dragons.length);
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
// Actions (egg / train / sell / coins / fights)
// ---------------------------------------------------------------------------

function startEggSpin() {
  if (_store.coins < EGG_PRICE || _store.dragons.length >= MAX_ROSTER) {
    openModal({ kind: 'egg-spin', blocked: true });
    return;
  }
  const modal = {
    kind: 'egg-spin',
    blocked: false,
    spinning: true,
    symbolIdx: 0,
    breedIdx: randInt(0, BREEDS.length - 1),
  };
  _modal = modal;
  if (_page) _page.render();
  if (_spinTimer) clearInterval(_spinTimer);
  _spinTimer = setInterval(() => {
    if (!_modal || _modal.kind !== 'egg-spin' || !_modal.spinning) {
      if (_spinTimer) {
        clearInterval(_spinTimer);
        _spinTimer = null;
      }
      return;
    }
    _modal.symbolIdx = (_modal.symbolIdx + 1) % SPIN_SYMBOLS.length;
    if (_page) _page.render();
  }, SPIN_FRAME_MS);
}

function stopEggSpin() {
  if (!_modal || _modal.kind !== 'egg-spin' || !_modal.spinning) return;
  _modal.spinning = false;
  // Re-draw breed at stop time (spin-then-pay: frozen combo maps to breed).
  _modal.breedIdx = randInt(0, BREEDS.length - 1);
  if (_spinTimer) {
    clearInterval(_spinTimer);
    _spinTimer = null;
  }
  if (_page) _page.render();
}

function confirmEgg() {
  const modal = _modal;
  if (!modal || modal.kind !== 'egg-spin' || modal.blocked || modal.spinning) return;
  if (_store.coins < EGG_PRICE) {
    _modal.blocked = true;
    if (_page) _page.render();
    return;
  }
  const now = timeAdapter.getTime();
  const breed = BREEDS[modal.breedIdx];
  _store.coins -= EGG_PRICE;
  const id = 'dragon-' + now.toString(36) + '-' + Math.floor(Math.random() * 36 ** 4).toString(36);
  const egg = {
    id,
    breedIdx: modal.breedIdx,
    strength: 0,
    energy: ENERGY_MAX,
    energyTs: now,
    purchasedAt: now,
    hatchAt: now + HATCH_MIN_MS + Math.floor(Math.random() * (HATCH_MAX_MS - HATCH_MIN_MS + 1)),
    hatchedAt: null,
  };
  _store.dragons.push(egg);
  persist();
  void breed;
  _modal = null;
  closeTimersForScreen();
  _screenIndex = _store.dragons.length;
  if (_page) _page.render();
}

function startTrain(dragonId) {
  const d = findDragon(dragonId);
  if (!d) return;
  const now = timeAdapter.getTime();
  const cost = trainingCost(d.strength);
  if (liveEnergy(d, now) <= 0 || _store.coins < cost) return;
  _store.coins -= cost;
  const gain = randInt(TRAIN_GAIN_MIN, TRAIN_GAIN_MAX);
  const before = levelFor(d.strength);
  d.strength += gain;
  persist();
  openModal({
    kind: 'train-result',
    dragonId,
    text: 'Strength +' + gain + ' (' + d.strength + ')'
      + (levelFor(d.strength) > before ? '  Level up! Lv ' + levelFor(d.strength) : ''),
  });
}

function confirmSell(dragonId) {
  const idx = _store.dragons.findIndex((d) => d.id === dragonId);
  if (idx < 0) return;
  const now = timeAdapter.getTime();
  const price = sellPrice(_store.dragons[idx], now);
  _store.dragons.splice(idx, 1);
  _store.coins += price;
  persist();
  _modal = null;
  _screenIndex = 0;
  if (_page) _page.render();
}

function openMonsterSelect(dragonId) {
  const d = findDragon(dragonId);
  if (!d || !isHatched(d)) return;
  if (liveEnergy(d, timeAdapter.getTime()) <= 0) return;
  refreshSpawn(true);
  openModal({ kind: 'monster-select', dragonId });
}

function startMonsterFight(dragonId, monsterId) {
  const d = findDragon(dragonId);
  const monster = MONSTERS.find((m) => m.id === monsterId);
  if (!d || !monster) return;
  const now = timeAdapter.getTime();
  const energy = liveEnergy(d, now);
  if (energy <= 0) return;
  const bonus = randInt(BONUS_MIN, BONUS_MAX);
  const rawDamage = d.strength + bonus - monster.strength;
  const won = rawDamage >= 0;
  const reward = won ? randInt(monster.rewardMin, monster.rewardMax) : 0;
  const loss = won
    ? randInt(monster.lossWinMin, monster.lossWinMax)
    : randInt(monster.lossLoseMin, monster.lossLoseMax);
  const energyAfter = clamp(energy - loss, 0, ENERGY_MAX);
  d.energy = energyAfter;
  d.energyTs = now;
  if (won) _store.coins += reward;
  persist();
  const name = breedOf(d).name;
  const lines = [
    'Dragon ' + name + ' attacks - damage ' + rawDamage,
    won
      ? 'Victory! +' + reward + ' coins'
      : 'Dragon is tired, will recover automatically',
  ];
  openLockedFight(
    { kind: 'monster-fight', dragonId, monsterId },
    lines,
    { won, reward, energyAfter, rawDamage },
  );
}

function beastParticipants() {
  const now = timeAdapter.getTime();
  return _store.dragons.filter((d) => isHatched(d) && liveEnergy(d, now) > 0);
}

function startBeastFight() {
  if (_store.beastStatus !== 'alive') return;
  const lineup = beastParticipants();
  if (lineup.length === 0) return;
  const now = timeAdapter.getTime();
  let hp = _store.beastHp;
  const lines = [];
  const removedIds = [];
  const finalEnergies = {};
  let defeated = false;
  for (const d of lineup) {
    let energy = liveEnergy(d, now);
    finalEnergies[d.id] = energy;
    const name = breedOf(d).name;
    while (energy > 0 && !defeated) {
      const bonus = randInt(BONUS_MIN, BONUS_MAX);
      const raw = d.strength + bonus - BEAST_STR;
      hp = Math.max(0, hp - Math.max(0, raw));
      if (hp <= 0) {
        defeated = true;
        lines.push('Dragon ' + name + ' deals ' + Math.max(0, raw) + ' damage to Bewilder Beast');
        break;
      }
      const counter = randInt(BEAST_COUNTER_MIN, BEAST_COUNTER_MAX);
      energy = clamp(energy - counter, 0, ENERGY_MAX);
      finalEnergies[d.id] = energy;
      lines.push('Dragon ' + name + ' deals ' + Math.max(0, raw) + ' damage (retaliation ' + counter + ')');
      if (energy <= 0) {
        removedIds.push(d.id);
        lines.push('Dragon ' + name + ' is out');
        break;
      }
    }
    if (defeated) break;
  }
  let reward = 0;
  if (defeated) {
    reward = randInt(BEAST_REWARD_MIN, BEAST_REWARD_MAX);
    _store.coins += reward;
    _store.beastHp = 0;
    _store.beastStatus = 'vanished';
    _store.beastRespawnAt = now + BEAST_RESPAWN_MS;
  } else {
    _store.beastHp = hp;
  }
  for (const d of _store.dragons) {
    if (finalEnergies[d.id] !== undefined && removedIds.indexOf(d.id) < 0) {
      d.energy = finalEnergies[d.id];
      d.energyTs = now;
    }
  }
  if (removedIds.length > 0) {
    const gone = {};
    removedIds.forEach((id) => {
      gone[id] = true;
    });
    _store.dragons = _store.dragons.filter((d) => !gone[d.id]);
  }
  persist();
  if (_screenIndex > _store.dragons.length) _screenIndex = _store.dragons.length;
  lines.push(
    defeated
      ? 'Bewilder Beast vanishes for a day. Continue adventure. +' + reward + ' coins'
      : 'Defeat - roster empty. Buy a new egg. Return to Main Screen.',
  );
  openLockedFight(
    { kind: 'beast-fight' },
    lines,
    { won: defeated, reward, hpAfter: defeated ? 0 : hp },
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
  }, FIGHT_TURN_MS);
  if (_page) _page.render();
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function renderMain(width) {
  const now = timeAdapter.getTime();
  const due = collectible(now);
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg-home.png');
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);
  addBadgeText(0, 8, width, 30, 'Dragons: ' + hatchedCount(), 24, 0xffffff);

  // Balance row, horizontally centered as one pill.
  addCoinRow(width, 42, _store.coins, 22);

  // Buy Egg — top-left, icon only (no label). Dimmed when coins insufficient.
  const canBuy = _store.coins >= EGG_PRICE;
  addIconButton(12, 84, 64, 'egg.png', startEggSpin, !canBuy);

  // Bewilder Beast — top-right, icon only, always visible.
  addIconButton(width - 76, 84, 64, 'monsters/bewilder_beast.png', () => {
    openModal({ kind: 'beast-intro' });
  }, false);

  addBadgeText(0, 190, width, 28, 'Swipe to see dragons', 18, 0xffeeaa);
  addBadgeText(0, 222, width, 24, _store.dragons.length === 0 ? 'Buy your first egg!' : (_screenIndex + 1) + ' / ' + screenCount(), 18, 0xffffff);

  // Earn Coins — bottom-left, only when collectible coins exist.
  if (due > 0) {
    addBadgeText(12, 326, 110, 24, '+' + due + ' coins', 17, 0xffee88, hmUI.align.LEFT);
    addIconButton(12, 352, 64, 'coin.png', () => {
      openModal({ kind: 'coin-summary', amount: due });
    }, false);
  }

  renderNav(width);
}

function renderDragon(width, dragon) {
  const now = timeAdapter.getTime();
  const breed = breedOf(dragon);
  const egg = !isHatched(dragon);
  const energy = liveEnergy(dragon, now);
  addImg(0, 0, width, DEVICE_HEIGHT, 'bg-dragon.png');
  // Swipe layer first so it never covers tappable icons.
  addSwipeNav(width);

  addBadgeText(0, 8, width, 30, breed.name, 24, 0xffffff);
  if (egg) {
    addBadgeText(0, 42, width, 26, 'Egg', 18, 0xffeeaa);
  } else {
    addBadgeText(0, 42, width, 26, 'Lv ' + levelFor(dragon.strength) + '  ·  Age ' + ageDays(dragon, now) + 'd', 18, 0xffeeaa);
    addImg(24, 72, 26, 26, 'energy.png');
    addBar(56, 75, 200, energy, ENERGY_MAX);
    addBadgeText(262, 70, 104, 28, Math.round(energy) + '', 18, 0xffffff, hmUI.align.LEFT);
    addBadgeText(0, 102, width, 26, 'Strength ' + dragon.strength, 20, 0xffffff);
  }

  const imgSize = 240;
  const imgX = Math.floor((width - imgSize) / 2);
  const imgY = 134;
  if (egg) {
    addImg(imgX, imgY, imgSize, imgSize, 'eggs/' + breed.key + '.png');
    addBadgeText(0, imgY + imgSize + 4, width, 28, 'Hatching...', 22, 0xffffff);
  } else {
    addImg(imgX, imgY, imgSize, imgSize, 'dragons/' + breed.key + '.png');
  }

  // Bottom row — hatched dragons only, icon-only buttons equally spaced.
  if (!egg) {
    const rowY = DEVICE_HEIGHT - 96;
    const cellW = Math.floor(width / 3);
    const iconS = 56;
    const cells = [
      { src: 'training.png', dimmed: energy <= 0 },
      { src: 'sell.png', dimmed: false },
      { src: 'monster.png', dimmed: energy <= 0 },
    ];
    cells.forEach((cell, i) => {
      const cx = i * cellW;
      const ix = cx + Math.floor((cellW - iconS) / 2);
      const tap = i === 0
        ? () => openModal({ kind: 'train', dragonId: dragon.id })
        : i === 1
          ? () => openModal({ kind: 'sell', dragonId: dragon.id })
          : () => openMonsterSelect(dragon.id);
      addIconButton(ix, rowY + 4, iconS, cell.src, tap, cell.dimmed);
    });
  }

  renderNav(width);
}

function renderNav(width) {
  // Swipe-only navigation (no arrow buttons): just a page indicator pill.
  const y = DEVICE_HEIGHT - 40;
  addBadgeText(0, y, width, 28, (_screenIndex + 1) + ' / ' + screenCount(), 18, 0xffffff);
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------

const PANEL_W = 340;
const PANEL_H = 370;
const PANEL_X = 25;
const PANEL_Y = 40;

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
  if (modal.blocked || _store.coins < EGG_PRICE) {
    renderModalShell('Get a New Egg', false);
    addText(PANEL_X + 20, PANEL_Y + 90, PANEL_W - 40, 40, 'Not enough coins', 22, 0xff8888);
    addText(PANEL_X + 20, PANEL_Y + 130, PANEL_W - 40, 30, 'Price: ' + EGG_PRICE + ' coins', 19, 0xdddddd);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo', null, { normal: 0x555555 });
    return;
  }
  if (_store.dragons.length >= MAX_ROSTER) {
    renderModalShell('Get a New Egg', false);
    addText(PANEL_X + 20, PANEL_Y + 90, PANEL_W - 40, 40, 'Roster is full', 22, 0xff8888);
    return;
  }
  renderModalShell('Get a New Egg', false);
  if (modal.spinning) {
    addText(PANEL_X + 20, PANEL_Y + 80, PANEL_W - 40, 90, SPIN_SYMBOLS[modal.symbolIdx] || '?', 64, 0xffee88);
    addText(PANEL_X + 20, PANEL_Y + 180, PANEL_W - 40, 30, 'Tap Stop to lock breed', 19, 0xdddddd);
    addButton(PANEL_X + 90, PANEL_Y + 220, 160, 48, 'Stop', stopEggSpin);
  } else {
    const breed = BREEDS[modal.breedIdx];
    addImg(PANEL_X + 130, PANEL_Y + 60, 80, 80, 'eggs/' + breed.key + '.png');
    addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 36, breed.name, 22, 0xaaffaa);
    addText(PANEL_X + 20, PANEL_Y + 186, PANEL_W - 40, 28, 'Price: ' + EGG_PRICE + ' coins', 19, 0xdddddd);
  }
  addButton(
    PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo',
    modal.spinning ? null : confirmEgg,
    modal.spinning ? { normal: 0x555555 } : {},
  );
}

function renderTrain() {
  const d = findDragon(_modal.dragonId);
  if (!d) {
    closeModal();
    return;
  }
  const breed = breedOf(d);
  const now = timeAdapter.getTime();
  const cost = trainingCost(d.strength);
  const energy = liveEnergy(d, now);
  renderModalShell('Train ' + breed.name, false);
  addText(PANEL_X + 20, PANEL_Y + 70, PANEL_W - 40, 30, 'Cost: ' + cost + ' coins', 20, 0xffffff);
  addText(PANEL_X + 20, PANEL_Y + 104, PANEL_W - 40, 30, 'Strength: ' + d.strength, 19, 0xdddddd);
  if (energy <= 0) {
    addText(PANEL_X + 20, PANEL_Y + 140, PANEL_W - 40, 30, 'No energy - recover first', 18, 0xff8888);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', null, { normal: 0x555555 });
  } else if (_store.coins < cost) {
    addText(PANEL_X + 20, PANEL_Y + 140, PANEL_W - 40, 30, 'Not enough coins', 18, 0xff8888);
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', null, { normal: 0x555555 });
  } else {
    addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Start', () => startTrain(d.id));
  }
}

function renderTrainResult() {
  renderModalShell('Training', false);
  addImg(PANEL_X + 140, PANEL_Y + 70, 60, 60, 'victory.png');
  addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 60, _modal.text || '', 20, 0xaaffaa);
  addButton(PANEL_X + 90, PANEL_Y + PANEL_H - 70, 160, 48, 'Yo hoo', closeModal);
}

function renderSell() {
  const d = findDragon(_modal.dragonId);
  if (!d || !isHatched(d)) {
    closeModal();
    return;
  }
  const breed = breedOf(d);
  const price = sellPrice(d, timeAdapter.getTime());
  renderModalShell('Sell ' + breed.name, false);
  addImg(PANEL_X + 130, PANEL_Y + 60, 80, 80, 'dragons/' + breed.key + '.png');
  addText(PANEL_X + 20, PANEL_Y + 150, PANEL_W - 40, 32, 'Will receive: ' + price + ' coins', 20, 0xffffff);
  addButton(PANEL_X + 40, PANEL_Y + PANEL_H - 70, 120, 48, 'Sell', () => confirmSell(d.id), { normal: 0xb71c1c });
  addButton(PANEL_X + 180, PANEL_Y + PANEL_H - 70, 120, 48, 'Keep', closeModal);
}

function renderMonsterSelect() {
  const d = findDragon(_modal.dragonId);
  if (!d) {
    closeModal();
    return;
  }
  renderModalShell('Battle Monster', false);
  const list = spawnedMonsters();
  if (list.length === 0) {
    addText(PANEL_X + 20, PANEL_Y + 120, PANEL_W - 40, 40, 'No monsters right now', 20, 0xdddddd);
    return;
  }
  list.forEach((m, i) => {
    const rowY = PANEL_Y + 64 + i * 92;
    if (rowY + 84 > PANEL_Y + PANEL_H - 10) return;
    addImg(PANEL_X + 24, rowY, 60, 60, m.img);
    addText(PANEL_X + 92, rowY, 120, 30, m.difficulty, 19, 0xffffff, hmUI.align.LEFT);
    addText(PANEL_X + 92, rowY + 32, 120, 26, 'STR ' + m.strength, 17, 0xdddddd, hmUI.align.LEFT);
    addButton(PANEL_X + 210, rowY + 12, 100, 44, 'Fight', () => startMonsterFight(d.id, m.id), { size: 19 });
  });
}

function renderFightLines(maxLines) {
  const lines = _modal.lines || [];
  const shown = lines.slice(0, _modal.revealed);
  const startY = PANEL_Y + 150;
  shown.slice(-4).forEach((line, i) => {
    addText(PANEL_X + 16, startY + i * 40, PANEL_W - 32, 40, line, 16, 0xffffff);
  });
  void maxLines;
}

function renderMonsterFight() {
  const modal = _modal;
  const d = findDragon(modal.dragonId);
  const monster = MONSTERS.find((m) => m.id === modal.monsterId);
  renderModalShell('Fight', modal.locked);
  if (monster) addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, monster.img);
  if (d) addImg(PANEL_X + PANEL_W - 102, PANEL_Y + 56, 72, 72, 'dragons/' + breedOf(d).key + '.png');
  if (monster && d) {
    addText(PANEL_X + 108, PANEL_Y + 66, PANEL_W - 216, 26, 'vs', 20, 0xffee88);
    addText(PANEL_X + 108, PANEL_Y + 94, PANEL_W - 216, 26, 'STR ' + d.strength, 17, 0xdddddd);
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
  const now = timeAdapter.getTime();
  renderModalShell('Bewilder Beast', false);
  addImg(PANEL_X + 110, PANEL_Y + 56, 120, 90, 'monsters/bewilder_beast.png');
  if (_store.beastStatus !== 'alive') {
    const hrs = Math.max(1, Math.ceil(((_store.beastRespawnAt || now) - now) / ACCRUAL_MS));
    addText(PANEL_X + 20, PANEL_Y + 160, PANEL_W - 40, 30, 'Vanished - back in ~' + hrs + 'h', 19, 0xdddddd);
    return;
  }
  addBar(PANEL_X + 40, PANEL_Y + 156, 260, _store.beastHp, BEAST_HP);
  addText(PANEL_X + 20, PANEL_Y + 182, PANEL_W - 40, 28, 'HP ' + _store.beastHp + ' / ' + BEAST_HP, 18, 0xffffff);
  const team = beastParticipants();
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
  renderModalShell('Beast Battle', modal.locked);
  addImg(PANEL_X + 30, PANEL_Y + 56, 72, 72, 'monsters/bewilder_beast.png');
  const hp = modal.outcome && modal.revealed >= modal.lines.length
    ? modal.outcome.hpAfter
    : _store.beastHp;
  addBar(PANEL_X + 116, PANEL_Y + 76, 190, hp, BEAST_HP);
  addText(PANEL_X + 116, PANEL_Y + 100, 190, 24, 'HP ' + hp, 17, 0xffffff, hmUI.align.LEFT);
  renderFightLines();
  if (!modal.locked && modal.outcome) {
    addText(
      PANEL_X + 20, PANEL_Y + PANEL_H - 76, PANEL_W - 40, 28,
      modal.outcome.won ? 'Vanishes for a day! +' + modal.outcome.reward : 'Defeat - buy a new egg',
      17, modal.outcome.won ? 0xaaffaa : 0xff8888,
    );
    if (!modal.outcome.won && _store.dragons.length === 0) {
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
    const now = timeAdapter.getTime();
    const amount = collectible(now);
    if (amount > 0) {
      const intervals = Math.floor(Math.max(0, now - _store.lastCoinCollectMs) / ACCRUAL_MS);
      _store.lastCoinCollectMs += intervals * ACCRUAL_MS;
      _store.coins += amount;
      persist();
    }
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
    tick();
    page.render();
  }, TICK_MS);
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
    loadStore();
    tick();
    startTickTimer(this);
    this.render();
  },

  onResume() {
    tick();
    startTickTimer(this);
    this.render();
  },

  onPause() {
    stopTickTimer();
    persist();
  },

  onDestroy() {
    stopTickTimer();
    closeTimersForScreen();
    persist();
  },

  render() {
    tick();
    const width = DEVICE_WIDTH;
    const height = DEVICE_HEIGHT;
    void height;

    _widgets.forEach((w) => hmUI.deleteWidget(w));
    _widgets = [];

    const dragon = currentDragon();
    if (_screenIndex === 0 || !dragon) {
      _screenIndex = 0;
      renderMain(width);
    } else {
      renderDragon(width, dragon);
    }
    renderModal();
  },
});
