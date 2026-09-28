// Dragon Army UI theme — palette, typography, translucency and assets.
//
// Placement geometry (every pixel coordinate and widget size) does NOT live
// here: it lives in ./layouts.js as per-device tables (Bip 6 rect 390x450,
// round 480x480). page/index.js imports positions/sizes from layouts.js and
// colors/fonts/assets from this file, so the UI code has no device forks.
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

// Modal panel look (geometry — position/size — is per-device in layouts.js).
export const PANEL_COLOR = 0x1a1a2e;
export const PANEL_ALPHA = 238; // 0xEE

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
// Generic widgets (device-independent styling)
// ---------------------------------------------------------------------------

// Default text widget.
export const TEXT_DEFAULT_SIZE = FONT_20;

// addShade(): sharp corners by default (full-screen dims); pills pass a radius.
export const SHADE_DEFAULT_RADIUS = 0;

// addBadgeText(): dark pill auto-sized around the text line. Font-relative
// heuristics — identical on all devices.
export const BADGE_PAD = 8;
export const BADGE_MIN_W = 24;
export const BADGE_TEXT_MIN_W = 10;
export const BADGE_WIDTH_FACTOR = 0.6; // estTextW = len * size * factor

// Segment color thresholds (shared with the old continuous bar).
export const BAR_HIGH_AT = 0.7;
export const BAR_MID_AT = 0.4;
// Legacy continuous-bar geometry (addBar removed in favor of the segmented
// gold bar; kept for reference).
export const BAR_H = 30; // 1.5x the old 20px bar
export const BAR_RADIUS = 4;
export const BAR_FILL_RADIUS = 3;
export const BAR_INSET = 3;

// addIconButton(): dimmed (unavailable) state via IMG alpha.
// Zepp OS IMG supports `alpha` (API 3.0+: 0-255, 255 opaque).
// 128 = ~50% opacity for disabled icons (egg/danger/training).
export const IMG_DISABLED_ALPHA = 128;

// Legacy dim overlay (FILL_RECT black pill over a tapped-out icon).
// Kept for compatibility; prefer IMG_DISABLED_ALPHA for icons.
export const DIM_ALPHA = 136;
export const DIM_RADIUS = 12;

// addRect() defaults.
export const RECT_DEFAULT_RADIUS = 0;
export const RECT_DEFAULT_ALPHA = 255;

// addButton() look. Geometry (BTN_W/H/CENTER_X/BOTTOM_OFFSET) is per-device
// in layouts.js.
export const BTN_RADIUS = 14;
export const BTN_FONT = FONT_20;

// ---------------------------------------------------------------------------
// Modal shell look
// ---------------------------------------------------------------------------
export const MODAL_RADIUS = 20;
export const MODAL_TITLE_FONT = FONT_22;

// ---------------------------------------------------------------------------
// Main hub look
// ---------------------------------------------------------------------------
export const BALANCE_FONT = FONT_32;
export const EARN_FONT = FONT_17;

// ---------------------------------------------------------------------------
// Dragon detail screen look
// ---------------------------------------------------------------------------
export const CENTER_IMG = 240;
export const DRAGON_NAME_FONT = FONT_24;
export const DRAGON_SUB_Y = 42;
export const DRAGON_SUB_H = 26;
export const DRAGON_SUB_FONT = FONT_18;

// Segmented gold energy bar (raw/energy_bar.png 467x78, 8 slots).
// Asset-intrinsic slot map — identical on all devices (per-device rendering
// size/position is ENERGY_BAR_* in layouts.js).
export const ENERGY_BAR_NATIVE_W = 467;
export const ENERGY_BAR_NATIVE_H = 78;
export const ENERGY_SEG_X0 = [26, 79, 131, 183, 236, 288, 340, 394];
export const ENERGY_SEG_X1 = [72, 125, 178, 230, 282, 335, 388, 440];
export const ENERGY_SEG_Y0 = 13;
export const ENERGY_SEG_Y1 = 64;
export const ENERGY_SEG_INSET = 2;
export const ENERGY_SEG_COLOR_LOW = 0xff0000;
export const ENERGY_SEG_COLOR_MID = 0xffcc00;
export const ENERGY_SEG_COLOR_HIGH = 0x00cc00;

export const STR_ICON_S = 56;
export const STR_GAP = 6;
export const STR_PILL_W = 84;
export const STR_PILL_H = 30;
export const STR_X = 12;
export const STR_Y = 132;
export const STR_FONT = FONT_22;

// Strength stars (5 str = 1 silver, 5 silver = 1 gold, max 125 = 5 gold).
// 16px with a tiny 2px gap; rows are centered via addStrengthStars().
// (STAR_S/STAR_GAP sizes and row Y positions live in layouts.js.)
export const ASSET_SILVER_STAR_16 = 'ui/silver_star_16x16.png';
export const ASSET_GOLD_STAR_16 = 'ui/gold_star_16x16.png';

// Manual hatch (egg detail screen) typography.
export const HATCH_TEXT_FONT = FONT_20;

// ---------------------------------------------------------------------------
// Egg-spin modal look
// ---------------------------------------------------------------------------
export const EGG_BLOCKED_FONT = FONT_22;
export const EGG_PRICE_FONT = FONT_40;
export const EGG_SPIN_HINT_FONT = FONT_19;

// ---------------------------------------------------------------------------
// Train modal + train-result modal look
// ---------------------------------------------------------------------------
export const TRAIN_COIN_FONT = FONT_44;
export const TRAIN_ENERGY_FONT = FONT_16;
export const TRAIN_WARN_FONT = FONT_18;
export const TRAIN_RESULT_GAIN_FONT = FONT_20;
export const TRAIN_RESULT_ENERGY_FONT = FONT_16;
export const TRAIN_RESULT_LEVEL_FONT = FONT_20;

// ---------------------------------------------------------------------------
// Sell modal look
// ---------------------------------------------------------------------------
export const SELL_LABEL_FONT = FONT_20;
export const SELL_COIN_FONT = FONT_44;

// ---------------------------------------------------------------------------
// Monster-select modal look
// ---------------------------------------------------------------------------
export const MONSTER_NAME_FONT = FONT_19;
export const MONSTER_GAIN_FONT = FONT_14;
export const MONSTER_STR_ICON_S = 56;
export const MONSTER_STR_Y = 50;
export const MONSTER_STR_VAL_GAP = 4;
export const MONSTER_STR_VAL_Y = 52;
export const MONSTER_STR_VAL_W = 40;
export const MONSTER_STR_VAL_H = 26;
export const MONSTER_STR_VAL_FONT = FONT_17;
export const MONSTER_FIGHT_BTN_FONT = FONT_19;

// ---------------------------------------------------------------------------
// Fight modals (monster-fight + beast-fight) look
// ---------------------------------------------------------------------------
export const FIGHT_LINE_FONT = FONT_16;
export const FIGHT_VS_FONT = FONT_20;
export const FIGHT_STR_ICON_X = 119;
export const FIGHT_STR_ICON_Y = 92;
export const FIGHT_STR_ICON_S = 56;
export const FIGHT_STR_VAL_GAP = 6;
export const FIGHT_STR_VAL_Y = 15; // offset inside the icon row
export const FIGHT_STR_VAL_W = 50;
export const FIGHT_STR_VAL_H = 26;
export const FIGHT_STR_VAL_FONT = FONT_17;
export const FIGHT_OUTCOME_FONT = FONT_18;
export const FIGHT_BEAST_OUTCOME_FONT = FONT_17;

// ---------------------------------------------------------------------------
// Beast-intro modal look
// ---------------------------------------------------------------------------
export const BEAST_VANISHED_FONT = FONT_19;
export const BEAST_TEAM_FONT = FONT_18;
export const BEAST_WARN_FONT = FONT_16;

// ---------------------------------------------------------------------------
// Coin-summary modal look
// ---------------------------------------------------------------------------
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
export const ASSET_ENERGY_BAR_250 = 'ui/energy_bar_250x42.png';
export const ASSET_ENERGY_BAR_190 = 'ui/energy_bar_190x32.png';
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

// ---------------------------------------------------------------------------
// Per-device layout bindings (re-exported from ./layouts.js for convenience).
//
// page/index.js imports positions/sizes from this theme module exactly as
// before, but these names are LIVE bindings owned by layouts.js: build()
// calls refreshLayout(deviceAdapter.getInfo()) once, which assigns the whole
// table for the detected device (Bip 6 rect vs round 480x480). The geometry
// tables themselves — the only place coordinates may be added or tuned per
// device — live in ./layouts.js; nothing is duplicated here.
// ---------------------------------------------------------------------------
export {
  BG_X, BG_Y, BG_W, BG_H,
  PANEL_X, PANEL_Y, PANEL_W, PANEL_H,
  BTN_W, BTN_H, BTN_CENTER_X, BTN_BOTTOM_OFFSET,
  MODAL_PAD, MODAL_TITLE_Y, MODAL_TITLE_H,
  MODAL_CLOSE_S, MODAL_CLOSE_OFFSET, MODAL_CLOSE_Y,
  BALANCE_ICON_S, BALANCE_ICON_Y, BALANCE_TEXT_Y, BALANCE_TEXT_H,
  EGG_BTN_X, EGG_BTN_Y, EGG_BTN_S,
  BEAST_BTN_OFFSET_X, BEAST_BTN_Y, BEAST_BTN_S,
  EARN_TEXT_Y, EARN_TEXT_H, EARN_ICON_S, EARN_ICON_Y,
  DRAGON_IMG_S, DRAGON_IMG_Y, DRAGON_IMG_HATCHED_OFFSET,
  SHADOW_W, SHADOW_H, SHADOW_Y_OFFSET,
  DRAGON_NAME_Y, DRAGON_NAME_H,
  ENERGY_BAR_W, ENERGY_BAR_H, ENERGY_BAR_X, ENERGY_BAR_Y, ENERGY_SEG_COUNT,
  STAR_S, STAR_GAP,
  DRAGON_STARS_Y, BEAST_STARS_Y, MONSTER_STARS_Y_OFFSET, FIGHT_STARS_Y,
  ACTION_SIDE_PAD, ACTION_BOTTOM_PAD, ACTION_ICON_S,
  HATCH_TEXT_Y, HATCH_TEXT_H, HATCH_BTN_Y,
  ROSTER_SLOTS, ROSTER_THUMB, ROSTER_FRAME, ROSTER_LEFT, ROSTER_BOTTOM_PAD,
  EGG_BLOCKED_TEXT_Y, EGG_BLOCKED_TEXT_H,
  EGG_PRICE_ICON_Y, EGG_PRICE_TEXT_Y, EGG_PRICE_TEXT_H,
  EGG_DICE_S, EGG_DICE_X, EGG_DICE_Y,
  EGG_SPIN_HINT_Y, EGG_SPIN_HINT_H, EGG_SPIN_BTN_Y,
  EGG_REVEAL_S, EGG_REVEAL_Y, EGG_REVEAL_PRICE_Y, EGG_REVEAL_PRICE_TEXT_Y,
  TRAIN_COIN_Y, TRAIN_COIN_TEXT_Y, TRAIN_COIN_TEXT_H,
  TRAIN_ENERGY_Y, TRAIN_ENERGY_H, TRAIN_WARN_Y, TRAIN_WARN_H,
  TRAIN_RESULT_ICON_S, TRAIN_RESULT_ICON_X, TRAIN_RESULT_ICON_Y,
  TRAIN_RESULT_GAIN_Y, TRAIN_RESULT_GAIN_H,
  TRAIN_RESULT_ENERGY_Y, TRAIN_RESULT_ENERGY_H,
  TRAIN_RESULT_LEVEL_Y, TRAIN_RESULT_LEVEL_H,
  SELL_ICON_S, SELL_ICON_Y, SELL_LABEL_Y, SELL_LABEL_H,
  SELL_COIN_Y, SELL_COIN_TEXT_Y, SELL_COIN_TEXT_H,
  SELL_BTN_W, SELL_BTN_X, KEEP_BTN_X,
  MONSTER_ROW_Y, MONSTER_ROW_H, MONSTER_ROW_MAX_H, MONSTER_ROW_BOTTOM_PAD,
  MONSTER_IMG_X, MONSTER_IMG_S,
  MONSTER_NAME_X, MONSTER_NAME_W, MONSTER_NAME_H,
  MONSTER_GAIN_Y, MONSTER_GAIN_W, MONSTER_GAIN_H,
  MONSTER_FIGHT_BTN_X, MONSTER_FIGHT_BTN_Y, MONSTER_FIGHT_BTN_W, MONSTER_FIGHT_BTN_H,
  FIGHT_LINES_Y, FIGHT_LINE_H, FIGHT_LINE_GAP, FIGHT_LINE_PAD,
  FIGHT_MAX_LINES, FIGHT_BEAST_MAX_LINES,
  FIGHT_MONSTER_IMG_X, FIGHT_MONSTER_IMG_Y, FIGHT_MONSTER_IMG_S,
  FIGHT_DRAGON_IMG_OFFSET_X, FIGHT_DRAGON_IMG_Y, FIGHT_DRAGON_IMG_S,
  FIGHT_VS_X, FIGHT_VS_Y, FIGHT_VS_H,
  FIGHT_OUTCOME_ICON_S, FIGHT_OUTCOME_ICON_X, FIGHT_OUTCOME_ICON_Y,
  FIGHT_OUTCOME_TEXT_Y, FIGHT_OUTCOME_TEXT_H,
  BEAST_IMG_X, BEAST_IMG_Y, BEAST_IMG_S,
  BEAST_VANISHED_Y, BEAST_VANISHED_H,
  BEAST_BAR_X, BEAST_BAR_Y, BEAST_BAR_W, BEAST_BAR_H,
  BEAST_TEAM_Y, BEAST_TEAM_H, BEAST_WARN_Y, BEAST_WARN_H,
  BEAST_FIGHT_BAR_X, BEAST_FIGHT_BAR_Y, BEAST_FIGHT_BAR_W, BEAST_FIGHT_BAR_H,
  COINS_ICON_X, COINS_ICON_Y, COINS_ICON_S, COINS_TEXT_Y, COINS_TEXT_H,
  ICON_SIZE, COIN_BIG_TEXT_W,
} from './layouts.js';
