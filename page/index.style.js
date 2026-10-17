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
export const COLOR_BLACK = 0x000000; // fight-screen tap shade
export const COLOR_COIN = 0xffee88; // earn-coins / coin-summary amounts
export const COLOR_ERROR = 0xff8888; // blocked / warning text
export const COLOR_SUCCESS = 0xaaffaa; // gains / ready states
export const COLOR_MUTED = 0xdddddd; // hints / secondary text
export const COLOR_BTN_TEXT = 0xffffff;
export const COLOR_BTN_DISABLED = 0x555555;
export const COLOR_BTN_SELL = 0xb71c1c;

// Translucent dim behind text pills / modals / bright backgrounds.
export const SHADE_COLOR = 0x000000;
export const SHADE_ALPHA = 153; // 0x99 ~= 60% black dim
export const TEXT_PILL_RADIUS = 8;

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

// Segment color thresholds for the segmented energy bar.
export const BAR_HIGH_AT = 0.7;
export const BAR_MID_AT = 0.4;

// addIconButton(): dimmed (unavailable) state via IMG alpha.
// Zepp OS IMG supports `alpha` (API 3.0+: 0-255, 255 opaque).
// 128 = ~50% opacity for disabled icons (egg/danger/training).
export const IMG_DISABLED_ALPHA = 128;


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
export const DRAGON_NAME_FONT = FONT_24;

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
export const MONSTER_FIGHT_BTN_FONT = FONT_19;

// ---------------------------------------------------------------------------
// Fight screen (full-screen replay, not a modal) look
// ---------------------------------------------------------------------------
export const FIGHT_TITLE_FONT = FONT_22;
// Log font is per-device in layouts.js (FIGHT_LOG_FONT): round needs 12px
// so the narration fits the circle chord; Bip 6 uses 16px.
export const FIGHT_MISS_FONT = FONT_18;
// Green HP bar above every unit (track is dark so the fill reads on any bg).
export const FIGHT_HP_COLOR = 0x00cc00;
export const FIGHT_HP_TRACK_COLOR = 0x333333;
// Attacker highlight: translucent warm pill behind the attacking unit.
export const FIGHT_ATTACKER_COLOR = 0xffcc00;
export const FIGHT_ATTACKER_ALPHA = 64;

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
// Equipment page + buy modal look
// ---------------------------------------------------------------------------
export const EQUIP_COMBAT_FONT = FONT_18;
export const EQUIP_SLOT_NAME_FONT = FONT_16;
export const EQUIP_SLOT_SUB_FONT = FONT_16;
export const EQUIP_BUY_BONUS_FONT = FONT_20;
export const EQUIP_BUY_PRICE_FONT = FONT_20;
export const EQUIP_BUY_WALLET_FONT = FONT_18;

// ---------------------------------------------------------------------------
// Villages list + village page look
// ---------------------------------------------------------------------------
export const VILLAGE_NAME_FONT = FONT_16;
export const VILLAGE_PAGE_NAME_FONT = FONT_24;
export const VILLAGE_INFO_FONT = FONT_18;
export const VILLAGE_CAPTURED_FONT = FONT_18;
// backgrounds — BG_HOME_SRC / BG_DRAGON_SRC live in ./layouts.js and are
// picked via refreshLayout(): 390x450 art for Bip 6, 480x480 art for round).
// ---------------------------------------------------------------------------
export const ASSET_COIN_64 = 'ui/coin_64x64.png';
export const ASSET_EGG_128 = 'ui/egg_128x128.png';
export const ASSET_BEAST_128 = 'ui/bewilder_beast_128x128.png';
export const ASSET_BEAST_72 = 'ui/bewilder_beast_72x72.png';
export const ASSET_SHADOW = 'misc/shadow_114x28.png';
export const ASSET_FRAME_72 = 'misc/frame_72x72.png';
export const ASSET_ENERGY_BAR_250 = 'ui/energy_bar_250x42.png';
export const ASSET_ENERGY_BAR_190 = 'ui/energy_bar_190x32.png';
export const ASSET_HOME_84 = 'ui/home_84x84.png';
export const ASSET_SELL_84 = 'ui/sell_84x84.png';
export const ASSET_DANGER_84 = 'ui/danger_84x84.png';
export const ASSET_TRAINING_84 = 'ui/training_84x84.png';
export const ASSET_DICE_80 = 'ui/dice_80x80.png';
export const ASSET_EQUIPMENT_40 = 'ui/equipment_40x40.png';
export const ASSET_EQUIP_HELM_72 = 'ui/helm_72x72.png';
export const ASSET_EQUIP_WING_72 = 'ui/wing_guards_72x72.png';
export const ASSET_EQUIP_TAIL_72 = 'ui/tail_guard_72x72.png';
export const ASSET_EQUIP_LEG_72 = 'ui/leg_guard_72x72.png';
export const ASSET_VICTORY_60 = 'ui/victory_60x60.png';
export const ASSET_LOSS_60 = 'ui/loss_60x60.png';
export const ASSET_CLOSE_36 = 'ui/close_36x36.png';
export const ASSET_FIREBALL_28 = 'ui/fireball_28x28.png';
export const ASSET_IMPACT_48 = 'ui/impact_48x48.png';
export const ASSET_MAP_84 = 'ui/map_84x84.png';
export const ASSET_CHECKMARK_32 = 'ui/checkmark_32x32.png';
export const ASSET_VILLAGE_EASY_72 = 'ui/village-outpost_72x72.png';
export const ASSET_VILLAGE_MEDIUM_72 = 'ui/village-hamlet_72x72.png';
export const ASSET_VILLAGE_HARD_72 = 'ui/village-stronghold_72x72.png';
export const ASSET_VILLAGE_EASY_128 = 'ui/village-outpost_128x128.png';
export const ASSET_VILLAGE_MEDIUM_128 = 'ui/village-hamlet_128x128.png';
export const ASSET_VILLAGE_HARD_128 = 'ui/village-stronghold_128x128.png';

/** Village icon by tier (72px grid / 128px page). */
export function villageAsset72(tier) {
  if (tier === 'medium') return ASSET_VILLAGE_MEDIUM_72;
  if (tier === 'hard') return ASSET_VILLAGE_HARD_72;
  return ASSET_VILLAGE_EASY_72;
}
export function villageAsset128(tier) {
  if (tier === 'medium') return ASSET_VILLAGE_MEDIUM_128;
  if (tier === 'hard') return ASSET_VILLAGE_HARD_128;
  return ASSET_VILLAGE_EASY_128;
}

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

