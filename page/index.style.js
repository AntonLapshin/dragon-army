// Dragon Army UI theme — the single source of truth for every visual
// constant used by page/index.js (mirrors koala page/index.style.js role).
//
// page/index.js must not contain hardcoded colors, sizes, radii, alphas,
// positions or asset paths: import them from here instead. Game balance
// numbers and timers stay in engine/config.js (CONFIG) — this file is
// presentation only.
//
// FILL_RECT opacity comes from the separate `alpha` prop (API 3.0+, 0-255:
// 255 opaque, 0 transparent). Color stays 24-bit RGB — never pack alpha into
// color as 8-digit ARGB. Common alphas: 255 = 100%, 192 = 75%, 128 = 50%,
// 64 = 25%, 0 = 0%.

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
export const COLOR_WHITE = 0xffffff;
export const COLOR_BLACK = 0x000000;
export const COLOR_COIN = 0xffee88; // earn-coins / coin-summary amounts
export const COLOR_SUBTITLE = 0xffeeaa; // dragon "Lv · Age" line
export const COLOR_ERROR = 0xff8888; // blocked / warning text
export const COLOR_SUCCESS = 0xaaffaa; // gains / ready states
export const COLOR_MUTED = 0xdddddd; // hints / secondary text
export const COLOR_BTN_TEXT = 0xffffff;
export const COLOR_BTN_DISABLED = 0x555555;
export const COLOR_BTN_SELL = 0xb71c1c;
export const COLOR_BAR_HIGH = 0x00cc00;
export const COLOR_BAR_MID = 0xc25a2b;
export const COLOR_BAR_LOW = 0xff0000;
export const COLOR_BAR_TRACK = 0xffffff;

// Translucent dim behind text pills / modals / bright backgrounds.
export const SHADE_COLOR = 0x000000;
export const SHADE_ALPHA = 153; // 0x99 ~= 60% black dim
export const TEXT_PILL_RADIUS = 8;

// Semi-transparent black pill drawn behind texts so they stay readable
// over the bright bg-home / bg-dragon artwork (FILL_RECT color + alpha).
export const TEXT_PILL_COLOR = 0x000000;
export const TEXT_PILL_ALPHA = 153; // 0x99 ~= 60%

// Modal panel (fixed geometry for the 390x450 watch screen).
export const PANEL_COLOR = 0x1a1a2e;
export const PANEL_ALPHA = 238; // 0xEE
export const PANEL_W = 340;
export const PANEL_H = 370;
export const PANEL_X = 25;
export const PANEL_Y = 40;

// Primary buttons.
export const BTN_GREEN = 0x4caf50;
export const BTN_GREEN_PRESS = 0x2e7d32;

// ---------------------------------------------------------------------------
// Typography (every text_size used by the page)
// ---------------------------------------------------------------------------
export const FONT_14 = 14;
export const FONT_16 = 16;
export const FONT_17 = 17;
export const FONT_18 = 18;
export const FONT_19 = 19;
export const FONT_20 = 20;
export const FONT_22 = 22;
export const FONT_24 = 24;
export const FONT_32 = 32;
export const FONT_40 = 40;
export const FONT_44 = 44;

// ---------------------------------------------------------------------------
// Generic widgets
// ---------------------------------------------------------------------------

// Default text widget.
export const TEXT_DEFAULT_SIZE = FONT_20;

// addShade(): sharp corners by default (full-screen dims); pills pass a radius.
export const SHADE_DEFAULT_RADIUS = 0;

// addBadgeText(): dark pill auto-sized around the text line.
export const BADGE_PAD = 8;
export const BADGE_MIN_W = 24;
export const BADGE_TEXT_MIN_W = 10;
export const BADGE_WIDTH_FACTOR = 0.6; // estTextW = len * size * factor

// addCoinBig(): large centered coin + amount below.
export const ICON_SIZE = 64;
export const COIN_BIG_TEXT_W = 300;

// addBar(): white track with a threshold-colored fill.
export const BAR_H = 30; // 1.5x the old 20px bar
export const BAR_RADIUS = 4;
export const BAR_FILL_RADIUS = 3;
export const BAR_INSET = 3;
export const BAR_HIGH_AT = 0.7;
export const BAR_MID_AT = 0.4;

// addIconButton(): dimmed (tapped-out) overlay.
export const DIM_ALPHA = 136;
export const DIM_RADIUS = 12;

// addRect() defaults.
export const RECT_DEFAULT_RADIUS = 0;
export const RECT_DEFAULT_ALPHA = 255;

// addButton() defaults + shared modal button geometry.
export const BTN_RADIUS = 14;
export const BTN_FONT = FONT_20;
export const BTN_W = 160;
export const BTN_H = 48;
export const BTN_CENTER_X = 90; // x offset inside the panel when centered
export const BTN_BOTTOM_OFFSET = 70; // y = PANEL_Y + PANEL_H - 70

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------
export const MODAL_RADIUS = 20;
export const MODAL_PAD = 20; // content inset: x = PANEL_X + PAD, w = PANEL_W - PAD*2
export const MODAL_TITLE_Y = 12;
export const MODAL_TITLE_H = 34;
export const MODAL_TITLE_FONT = FONT_22;
export const MODAL_CLOSE_S = 36;
export const MODAL_CLOSE_OFFSET = 46; // x = PANEL_X + PANEL_W - 46
export const MODAL_CLOSE_Y = 8;

// ---------------------------------------------------------------------------
// Main hub
// ---------------------------------------------------------------------------
export const BALANCE_ICON_S = 64;
export const BALANCE_ICON_Y = 8;
export const BALANCE_TEXT_Y = 76;
export const BALANCE_TEXT_H = 35;
export const BALANCE_FONT = FONT_32;

export const EGG_BTN_X = 12;
export const EGG_BTN_Y = 84;
export const EGG_BTN_S = 128;

export const BEAST_BTN_OFFSET_X = 140; // x = width - 140
export const BEAST_BTN_Y = 84;
export const BEAST_BTN_S = 128;

export const EARN_TEXT_Y = 236;
export const EARN_TEXT_H = 24;
export const EARN_FONT = FONT_17;
export const EARN_ICON_S = 64;
export const EARN_ICON_Y = 264;

// ---------------------------------------------------------------------------
// Dragon detail screen
// ---------------------------------------------------------------------------
export const CENTER_IMG = 240;
export const DRAGON_IMG_S = CENTER_IMG;
export const DRAGON_IMG_Y = 134;
export const DRAGON_IMG_HATCHED_OFFSET = 28; // hatched art sits lower
export const SHADOW_W = 114;
export const SHADOW_H = 28;
export const SHADOW_Y_OFFSET = -22; // relative to imgY + imgSize

export const DRAGON_NAME_Y = 8;
export const DRAGON_NAME_H = 30;
export const DRAGON_NAME_FONT = FONT_24;
export const DRAGON_SUB_Y = 42;
export const DRAGON_SUB_H = 26;
export const DRAGON_SUB_FONT = FONT_18;

export const ENERGY_ICON_S = 56;
export const ENERGY_GAP = 8;
export const ENERGY_BAR_W = 120;
export const ENERGY_X = 12;
export const ENERGY_Y = 70;

export const STR_ICON_S = 56;
export const STR_GAP = 6;
export const STR_PILL_W = 84;
export const STR_PILL_H = 30;
export const STR_X = 12;
export const STR_Y = 132;
export const STR_FONT = FONT_22;

// Bottom action row (pinned to the very bottom).
export const ACTION_SIDE_PAD = 20;
export const ACTION_BOTTOM_PAD = 12;
export const ACTION_ICON_S = 84;

// ---------------------------------------------------------------------------
// Roster strip (bottom thumbnail navigation)
// ---------------------------------------------------------------------------
export const ROSTER_SLOTS = 5;
export const ROSTER_THUMB = 60;
export const ROSTER_FRAME = 72;
export const ROSTER_LEFT = 30;
export const ROSTER_BOTTOM_PAD = 12;

// ---------------------------------------------------------------------------
// Egg-spin modal
// ---------------------------------------------------------------------------
export const EGG_BLOCKED_TEXT_Y = 90;
export const EGG_BLOCKED_TEXT_H = 40;
export const EGG_BLOCKED_FONT = FONT_22;
export const EGG_PRICE_ICON_Y = 140;
export const EGG_PRICE_TEXT_Y = 208;
export const EGG_PRICE_TEXT_H = 40;
export const EGG_PRICE_FONT = FONT_40;
export const EGG_DICE_S = 80;
export const EGG_DICE_X = 130;
export const EGG_DICE_Y = 80;
export const EGG_SPIN_HINT_Y = 180;
export const EGG_SPIN_HINT_H = 30;
export const EGG_SPIN_HINT_FONT = FONT_19;
export const EGG_SPIN_BTN_Y = 220;
export const EGG_REVEAL_S = 60;
export const EGG_REVEAL_Y = 56;
export const EGG_REVEAL_PRICE_Y = 150;
export const EGG_REVEAL_PRICE_TEXT_Y = 218;

// ---------------------------------------------------------------------------
// Train modal + train-result modal
// ---------------------------------------------------------------------------
export const TRAIN_COIN_Y = 60;
export const TRAIN_COIN_TEXT_Y = 128;
export const TRAIN_COIN_TEXT_H = 40;
export const TRAIN_COIN_FONT = FONT_44;
export const TRAIN_ENERGY_Y = 168;
export const TRAIN_ENERGY_H = 26;
export const TRAIN_ENERGY_FONT = FONT_16;
export const TRAIN_WARN_Y = 194;
export const TRAIN_WARN_H = 30;
export const TRAIN_WARN_FONT = FONT_18;

export const TRAIN_RESULT_ICON_S = 60;
export const TRAIN_RESULT_ICON_X = 140; // x offset inside the panel
export const TRAIN_RESULT_ICON_Y = 70;
export const TRAIN_RESULT_GAIN_Y = 140;
export const TRAIN_RESULT_GAIN_H = 30;
export const TRAIN_RESULT_GAIN_FONT = FONT_20;
export const TRAIN_RESULT_ENERGY_Y = 170;
export const TRAIN_RESULT_ENERGY_H = 26;
export const TRAIN_RESULT_ENERGY_FONT = FONT_16;
export const TRAIN_RESULT_LEVEL_Y = 196;
export const TRAIN_RESULT_LEVEL_H = 30;
export const TRAIN_RESULT_LEVEL_FONT = FONT_20;

// ---------------------------------------------------------------------------
// Sell modal
// ---------------------------------------------------------------------------
export const SELL_ICON_S = 60;
export const SELL_ICON_Y = 50;
export const SELL_LABEL_Y = 120;
export const SELL_LABEL_H = 28;
export const SELL_LABEL_FONT = FONT_20;
export const SELL_COIN_Y = 155;
export const SELL_COIN_TEXT_Y = 223;
export const SELL_COIN_TEXT_H = 40;
export const SELL_COIN_FONT = FONT_44;
export const SELL_BTN_W = 120;
export const SELL_BTN_X = 40; // x offset inside the panel
export const KEEP_BTN_X = 180;

// ---------------------------------------------------------------------------
// Monster-select modal
// ---------------------------------------------------------------------------
export const MONSTER_ROW_Y = 64; // first row offset inside the panel
export const MONSTER_ROW_H = 92;
export const MONSTER_ROW_MAX_H = 90; // rows stop when rowY + 90 overflows
export const MONSTER_ROW_BOTTOM_PAD = 10;
export const MONSTER_IMG_X = 24;
export const MONSTER_IMG_S = 72;
export const MONSTER_NAME_X = 100;
export const MONSTER_NAME_W = 100;
export const MONSTER_NAME_H = 28;
export const MONSTER_NAME_FONT = FONT_19;
export const MONSTER_GAIN_Y = 28;
export const MONSTER_GAIN_W = 110;
export const MONSTER_GAIN_H = 20;
export const MONSTER_GAIN_FONT = FONT_14;
export const MONSTER_STR_ICON_S = 32;
export const MONSTER_STR_Y = 50;
export const MONSTER_STR_VAL_GAP = 4;
export const MONSTER_STR_VAL_Y = 52;
export const MONSTER_STR_VAL_W = 40;
export const MONSTER_STR_VAL_H = 26;
export const MONSTER_STR_VAL_FONT = FONT_17;
export const MONSTER_FIGHT_BTN_X = 210;
export const MONSTER_FIGHT_BTN_Y = 12;
export const MONSTER_FIGHT_BTN_W = 100;
export const MONSTER_FIGHT_BTN_H = 44;
export const MONSTER_FIGHT_BTN_FONT = FONT_19;

// ---------------------------------------------------------------------------
// Fight modals (monster-fight + beast-fight)
// ---------------------------------------------------------------------------
export const FIGHT_LINES_Y = 150;
export const FIGHT_LINE_H = 40;
export const FIGHT_LINE_GAP = 40;
export const FIGHT_LINE_FONT = FONT_16;
export const FIGHT_LINE_PAD = 16;
export const FIGHT_MAX_LINES = 4;
export const FIGHT_BEAST_MAX_LINES = 2;

export const FIGHT_MONSTER_IMG_X = 30;
export const FIGHT_MONSTER_IMG_Y = 56;
export const FIGHT_MONSTER_IMG_S = 72;
export const FIGHT_DRAGON_IMG_OFFSET_X = 102; // x = PANEL_X + PANEL_W - 102
export const FIGHT_DRAGON_IMG_Y = 56;
export const FIGHT_DRAGON_IMG_S = 60;
export const FIGHT_VS_X = 108;
export const FIGHT_VS_Y = 66;
export const FIGHT_VS_H = 26;
export const FIGHT_VS_FONT = FONT_20;
export const FIGHT_STR_ICON_X = 119;
export const FIGHT_STR_ICON_Y = 92;
export const FIGHT_STR_ICON_S = 56;
export const FIGHT_STR_VAL_GAP = 6;
export const FIGHT_STR_VAL_Y = 15; // offset inside the icon row
export const FIGHT_STR_VAL_W = 50;
export const FIGHT_STR_VAL_H = 26;
export const FIGHT_STR_VAL_FONT = FONT_17;

export const FIGHT_OUTCOME_ICON_S = 60;
export const FIGHT_OUTCOME_ICON_X = 140; // x offset inside the panel
export const FIGHT_OUTCOME_ICON_Y = 140; // y = PANEL_Y + PANEL_H - 140
export const FIGHT_OUTCOME_TEXT_Y = 76; // y = PANEL_Y + PANEL_H - 76
export const FIGHT_OUTCOME_TEXT_H = 28;
export const FIGHT_OUTCOME_FONT = FONT_18;
export const FIGHT_BEAST_OUTCOME_FONT = FONT_17;

// ---------------------------------------------------------------------------
// Beast-intro modal
// ---------------------------------------------------------------------------
export const BEAST_IMG_X = 134;
export const BEAST_IMG_Y = 56;
export const BEAST_IMG_S = 72;
export const BEAST_VANISHED_Y = 160;
export const BEAST_VANISHED_H = 30;
export const BEAST_VANISHED_FONT = FONT_19;
export const BEAST_BAR_Y = 156;
export const BEAST_ICON_S = 56;
export const BEAST_GAP = 8;
export const BEAST_BAR_X = 20; // + icon + gap (see BEAST_BAR_W)
export const BEAST_BAR_Y_OFFSET = -13; // icon y relative to the bar
export const BEAST_BAR_W = 260; // total row width incl. icon + gap
export const BEAST_TEAM_Y = 206;
export const BEAST_TEAM_H = 30;
export const BEAST_TEAM_FONT = FONT_18;
export const BEAST_WARN_Y = 238;
export const BEAST_WARN_H = 44;
export const BEAST_WARN_FONT = FONT_16;

// Beast-fight modal HP bar.
export const BEAST_FIGHT_BAR_X = 116; // x offset inside the panel
export const BEAST_FIGHT_BAR_Y = 76; // y offset inside the panel
export const BEAST_FIGHT_BAR_W = 190;

// ---------------------------------------------------------------------------
// Coin-summary modal
// ---------------------------------------------------------------------------
export const COINS_ICON_X = 138;
export const COINS_ICON_Y = 70;
export const COINS_ICON_S = 64;
export const COINS_TEXT_Y = 150;
export const COINS_TEXT_H = 60;
export const COINS_FONT = FONT_20;

// ---------------------------------------------------------------------------
// Assets (every image path used by the page)
// ---------------------------------------------------------------------------
export const ASSET_BG_HOME = 'bg/bg-home_390x450.png';
export const ASSET_BG_DRAGON = 'bg/bg-dragon_390x450.png';
export const ASSET_COIN_64 = 'ui/coin_64x64.png';
export const ASSET_EGG_128 = 'ui/egg_128x128.png';
export const ASSET_BEAST_128 = 'ui/bewilder_beast_128x128.png';
export const ASSET_BEAST_72 = 'ui/bewilder_beast_72x72.png';
export const ASSET_SHADOW = 'misc/shadow_114x28.png';
export const ASSET_FRAME_72 = 'misc/frame_72x72.png';
export const ASSET_ENERGY_56 = 'ui/energy_56x56.png';
export const ASSET_STRENGTH_56 = 'ui/strength_56x56.png';
export const ASSET_HOME_84 = 'ui/home_84x84.png';
export const ASSET_SELL_84 = 'ui/sell_84x84.png';
export const ASSET_DANGER_84 = 'ui/danger_84x84.png';
export const ASSET_TRAINING_84 = 'ui/training_84x84.png';
export const ASSET_DICE_80 = 'ui/dice_80x80.png';
export const ASSET_VICTORY_60 = 'ui/victory_60x60.png';
export const ASSET_LOSS_60 = 'ui/loss_60x60.png';
export const ASSET_CLOSE_36 = 'ui/close_36x36.png';

/** Fallback roster thumbnail when a dragon view is unavailable. */
export const FALLBACK_ROSTER_ICON = 'eggs/night_fury_60x60.png';

/** Breed artwork: `eggs/<assetKey>_240x240.png` / `dragons/<assetKey>_240x240.png`. */
export function eggAsset240(assetKey) {
  return 'eggs/' + assetKey + '_240x240.png';
}
export function dragonAsset240(assetKey) {
  return 'dragons/' + assetKey + '_240x240.png';
}
export function eggAsset60(assetKey) {
  return 'eggs/' + assetKey + '_60x60.png';
}
export function dragonAsset60(assetKey) {
  return 'dragons/' + assetKey + '_60x60.png';
}
/** Monster catalogue images are stored full-size; list rows use _72x72. */
export function monsterAsset72(image) {
  return String(image).replace('.png', '_72x72.png');
}
