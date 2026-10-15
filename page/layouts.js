// Dragon Army per-device layouts — the single source of truth for every
// pixel coordinate and widget size used by page/index.js.
//
// Data-driven approach: page/index.js contains NO device forks. It reads
// placement values (EGG_BTN_X, PANEL_W, ...) as live bindings from this
// module and lays out the same way on every watch. At startup build() calls
// refreshLayout(deviceAdapter.getInfo()), which picks one geometry table and
// assigns it onto the exported bindings. The web preview can switch devices
// at runtime the same way (debug panel -> refreshLayout + re-render).
//
// Rules:
// - This file owns everything that MAY differ per device: positions, sizes,
//   insets, slot counts, plus the background image sources (BG_HOME_SRC /
//   BG_DRAGON_SRC — 390x450 art for Bip 6, 480x480 art for round). Colors,
//   fonts, alphas, radii, other asset paths and asset-intrinsic numbers
//   (energy-bar slot map, badge heuristics) stay in ./index.style.js and
//   are identical on all devices.
// - Zepp OS IMG widgets draw 1:1 (no runtime scaling), so a layout must never
//   size a widget box smaller than its PNG source — that would crop the art.
//   All icon/bar/dragon sizes below are therefore identical across profiles;
//   only POSITIONS (and the modal panel) change.
// - Round-screen math: 480x480, center (240,240), R=240. Usable half-width at
//   height y is hw(y) = sqrt(240^2 - (y-240)^2). Every value marked "round:"
//   was checked against it with an ~8px safety margin; the derivation is kept
//   next to the value so the next device port can follow the same recipe.

export const DEVICE_PROFILES = {
  bip6: {
    id: 'bip6',
    name: 'Amazfit Bip 6 (rect 390x450)',
    width: 390,
    height: 450,
    shape: 'rect',
  },
  round480: {
    id: 'round480',
    // Covers the perfectly-round 480x480 class (Balance / Active round
    // series, T-Rex 3/Ultra); 466/454/416 rounds reuse it — a few px of
    // extra margin, still inside the circle (see resolveProfileId).
    name: 'Round 480x480 (Active / Balance / T-Rex)',
    width: 480,
    height: 480,
    shape: 'round',
  },
};

// Confirmed deviceSource -> profile mapping (from @zos/device getDeviceInfo).
// Prefer an explicit entry here over heuristics once a source id is known.
const DEVICE_SOURCE_PROFILE = {
  9765120: 'bip6', // Amazfit Bip 6 (square 390x450)
};

// ---------------------------------------------------------------------------
// Bip 6 geometry — extracted verbatim from the original index.style.js values.
// ---------------------------------------------------------------------------
export const BIP6_LAYOUT = {
  BG_X: 0, BG_Y: 0, BG_W: 390, BG_H: 450,
  BG_HOME_SRC: 'bg/bg-home_390x450.png',
  BG_DRAGON_SRC: 'bg/bg-dragon_390x450.png',
  PANEL_X: 25, PANEL_Y: 40, PANEL_W: 340, PANEL_H: 370,
  BTN_W: 160, BTN_H: 48, BTN_CENTER_X: 90, BTN_BOTTOM_OFFSET: 70,
  MODAL_PAD: 20, MODAL_TITLE_Y: 12, MODAL_TITLE_H: 34,
  MODAL_CLOSE_S: 36, MODAL_CLOSE_OFFSET: 46, MODAL_CLOSE_Y: 8,
  BALANCE_ICON_S: 64, BALANCE_ICON_Y: 8, BALANCE_TEXT_Y: 76, BALANCE_TEXT_H: 35,
  EGG_BTN_X: 12, EGG_BTN_Y: 84, EGG_BTN_S: 128,
  BEAST_BTN_OFFSET_X: 140, BEAST_BTN_Y: 84, BEAST_BTN_S: 128,
  EARN_TEXT_Y: 236, EARN_TEXT_H: 24, EARN_ICON_S: 64, EARN_ICON_Y: 264,
  DRAGON_IMG_S: 240, DRAGON_IMG_Y: 134, DRAGON_IMG_HATCHED_OFFSET: 6,
  SHADOW_W: 114, SHADOW_H: 28, SHADOW_Y_OFFSET: -22,
  DRAGON_NAME_Y: 8, DRAGON_NAME_H: 30,
  ENERGY_BAR_W: 250, ENERGY_BAR_H: 42, ENERGY_BAR_X: 70, ENERGY_BAR_Y: 76,
  ENERGY_SEG_COUNT: 8,
  STAR_S: 16, STAR_GAP: 2,
  DRAGON_STARS_Y: 124,
  // "?": battle-record button right of the energy bar (bar ends at 320).
  STATS_BTN_S: 40, STATS_BTN_X: 328, STATS_BTN_Y: 76,
  // Equipment button: mirror of "?" on the left (right margin 22 = left
  // margin 22). 40x40 art (ui/equipment_40x40.png), clears the bar (70..).
  EQUIP_BTN_S: 40, EQUIP_BTN_X: 22, EQUIP_BTN_Y: 76,
  // Battle-record modal: 5 rows under the title, shared by both devices.
  STATS_ROW_Y: 64, STATS_ROW_GAP: 40, STATS_ROW_H: 30,
  // Equipment page: title (DRAGON_NAME_Y/H) + combat line, then two slot
  // rows (3 pieces / 4 legs). Row = 72 icon + 18 name + 18 bonus/price.
  EQUIP_COMBAT_Y: 44, EQUIP_COMBAT_H: 24,
  EQUIP_GRID_Y: 88, EQUIP_ROW_H: 108,
  // Equipment buy modal (panel-relative): 72px piece icon, bonus / price /
  // wallet lines; Buy/Cancel reuse SELL_BTN_X / KEEP_BTN_X.
  EQUIP_BUY_ICON_S: 72, EQUIP_BUY_ICON_Y: 60,
  EQUIP_BUY_BONUS_Y: 140, EQUIP_BUY_BONUS_H: 28,
  EQUIP_BUY_PRICE_Y: 172, EQUIP_BUY_PRICE_H: 28,
  EQUIP_BUY_WALLET_Y: 204, EQUIP_BUY_WALLET_H: 28,
  BEAST_STARS_Y: 130,
  MONSTER_STARS_Y_OFFSET: 74,
  ACTION_SIDE_PAD: 20, ACTION_BOTTOM_PAD: 12, ACTION_ICON_S: 84,
  HATCH_TEXT_Y: 76, HATCH_TEXT_H: 30, HATCH_BTN_Y: 294,
  ROSTER_SLOTS: 5, ROSTER_THUMB: 60, ROSTER_FRAME: 72, ROSTER_LEFT: 20, ROSTER_BOTTOM_PAD: 40,
  EGG_BLOCKED_TEXT_Y: 90, EGG_BLOCKED_TEXT_H: 40,
  EGG_PRICE_ICON_Y: 140, EGG_PRICE_TEXT_Y: 208, EGG_PRICE_TEXT_H: 40,
  EGG_DICE_S: 80, EGG_DICE_X: 130, EGG_DICE_Y: 80,
  EGG_SPIN_HINT_Y: 180, EGG_SPIN_HINT_H: 30, EGG_SPIN_BTN_Y: 220,
  EGG_REVEAL_S: 60, EGG_REVEAL_Y: 56, EGG_REVEAL_PRICE_Y: 150, EGG_REVEAL_PRICE_TEXT_Y: 218,
  // Choose-a-specific-egg mode (150 coins): full-size 240 egg + Buy button.
  // Egg 50..290 leaves title (12..46) clear and a 22px gap to the Buy
  // button at 312..360 (10px bottom margin in the 370-tall panel).
  // Arrows (48x48) sit mid-egg (146 = 50 + (240-48)/2); X is derived from
  // PANEL_W/MODAL_PAD in index.js so both devices share the same logic.
  EGG_CHOOSE_S: 240, EGG_CHOOSE_Y: 50, EGG_CHOOSE_BTN_Y: 312,
  EGG_ARROW_S: 48, EGG_ARROW_Y: 146,
  TRAIN_COIN_Y: 60, TRAIN_COIN_TEXT_Y: 128, TRAIN_COIN_TEXT_H: 40,
  TRAIN_ENERGY_Y: 168, TRAIN_ENERGY_H: 26, TRAIN_WARN_Y: 194, TRAIN_WARN_H: 30,
  TRAIN_RESULT_ICON_S: 60, TRAIN_RESULT_ICON_X: 140, TRAIN_RESULT_ICON_Y: 70,
  TRAIN_RESULT_GAIN_Y: 140, TRAIN_RESULT_GAIN_H: 30,
  TRAIN_RESULT_ENERGY_Y: 170, TRAIN_RESULT_ENERGY_H: 26,
  TRAIN_RESULT_LEVEL_Y: 196, TRAIN_RESULT_LEVEL_H: 30,
  SELL_ICON_S: 60, SELL_ICON_Y: 50, SELL_LABEL_Y: 120, SELL_LABEL_H: 28,
  SELL_COIN_Y: 155, SELL_COIN_TEXT_Y: 223, SELL_COIN_TEXT_H: 40,
  SELL_BTN_W: 120, SELL_BTN_X: 180, KEEP_BTN_X: 40,
  MONSTER_ROW_Y: 64, MONSTER_ROW_H: 92, MONSTER_ROW_MAX_H: 90, MONSTER_ROW_BOTTOM_PAD: 10,
  MONSTER_IMG_X: 24, MONSTER_IMG_S: 72,
  MONSTER_NAME_X: 100, MONSTER_NAME_W: 100, MONSTER_NAME_H: 28,
  MONSTER_GAIN_Y: 28, MONSTER_GAIN_W: 110, MONSTER_GAIN_H: 20,
  MONSTER_FIGHT_BTN_X: 210, MONSTER_FIGHT_BTN_Y: 12, MONSTER_FIGHT_BTN_W: 100, MONSTER_FIGHT_BTN_H: 44,
  // Fight screen (full-screen, not a modal): title, arena (dragons left,
  // enemy right, green HP bar above every unit), one log line, Continue
  // button floats over the arena bottom when the replay ends.
  // Arena 40..404; log 410..436. Enemy 302..374 (16px right margin).
  FIGHT_TITLE_Y: 8, FIGHT_TITLE_H: 26,
  FIGHT_ARENA_Y: 40, FIGHT_ARENA_H: 364,
  FIGHT_LOG_Y: 410, FIGHT_LOG_H: 26, FIGHT_LOG_FONT: 16,
  FIGHT_CONTINUE_Y: 348, // == ARENA_Y + ARENA_H - BTN_H - 8
  FIGHT_LEFT_X: 16, FIGHT_LEFT_X_WIDE: 16, FIGHT_COL_GAP: 12,
  FIGHT_ENEMY_X: 302,
  FIGHT_DRAGON_S: 60, FIGHT_ENEMY_S: 72,
  FIGHT_HP_BAR_H: 8, FIGHT_HP_BAR_GAP: 2, FIGHT_ROW_GAP: 4,
  FIGHT_FIREBALL_S: 28, FIGHT_IMPACT_S: 48, FIGHT_MISS_H: 24,
  BEAST_IMG_X: 134, BEAST_IMG_Y: 56, BEAST_IMG_S: 72,
  BEAST_VANISHED_Y: 160, BEAST_VANISHED_H: 30,
  BEAST_BAR_X: 45, BEAST_BAR_Y: 150, BEAST_BAR_W: 250, BEAST_BAR_H: 42,
  BEAST_TEAM_Y: 198, BEAST_TEAM_H: 30, BEAST_WARN_Y: 230, BEAST_WARN_H: 44,
  COINS_ICON_X: 138, COINS_ICON_Y: 70, COINS_ICON_S: 64,
  COINS_TEXT_Y: 150, COINS_TEXT_H: 60,
  ICON_SIZE: 64, COIN_BIG_TEXT_W: 300,
};

// ---------------------------------------------------------------------------
// Round 480x480 geometry. Sizes are unchanged (IMG draws 1:1 — shrinking a
// box would crop the art); positions move inside the safe circle.
// Panel is centered (80,70,320,340): corners sit at dist ~233 < 240, and
// panel top+height (410) still equals the Bip 6 bottom edge, so every
// bottom-anchored modal element lands on the same absolute Y as before.
// ---------------------------------------------------------------------------
export const ROUND480_LAYOUT = {
  // round: native 480x480 full-bleed art (see assets.json — bg-home and
  // bg-dragon are produced in both 390x450 for Bip 6 and 480x480 for
  // Active 3 / Balance).
  BG_X: 0, BG_Y: 0, BG_W: 480, BG_H: 480,
  BG_HOME_SRC: 'bg/bg-home_480x480.png',
  BG_DRAGON_SRC: 'bg/bg-dragon_480x480.png',
  // round: centered 320x340; see module header for the corner math.
  PANEL_X: 80, PANEL_Y: 70, PANEL_W: 320, PANEL_H: 340,
  BTN_W: 160, BTN_H: 48,
  // round: (320-160)/2 = 80.
  BTN_CENTER_X: 80, BTN_BOTTOM_OFFSET: 70,
  MODAL_PAD: 20, MODAL_TITLE_Y: 12, MODAL_TITLE_H: 34,
  MODAL_CLOSE_S: 36, MODAL_CLOSE_OFFSET: 46, MODAL_CLOSE_Y: 8,
  BALANCE_ICON_S: 64,
  // round: +28/+28 — clears the narrow top of the circle (hw(36)=~140).
  BALANCE_ICON_Y: 36, BALANCE_TEXT_Y: 104, BALANCE_TEXT_H: 35,
  // round: at y=96 hw=192 -> usable [48,432]; 128px icons at 60..188 and
  // 292..420 (top outer corners at dist ~230 < 240). OFFSET = 480-292 = 188.
  EGG_BTN_X: 60, EGG_BTN_Y: 96, EGG_BTN_S: 128,
  BEAST_BTN_OFFSET_X: 188, BEAST_BTN_Y: 96, BEAST_BTN_S: 128,
  // round: lifted above the roster strip (frames start at abs y=314);
  // keeps clearance above the strip (icon 224..288 vs 314).
  EARN_TEXT_Y: 196, EARN_TEXT_H: 24, EARN_ICON_S: 64, EARN_ICON_Y: 224,
  DRAGON_IMG_S: 240,
  // round: name(44..74) -> energy(96..138) -> stars(144) -> img(150..390);
  // corners (120,150) d=150 and (360,390) d=192, both inside.
  DRAGON_IMG_Y: 150, DRAGON_IMG_HATCHED_OFFSET: 6,
  SHADOW_W: 114, SHADOW_H: 28, SHADOW_Y_OFFSET: -22,
  // round: +36 — full-width name pill needs hw>=~100 (true below y~40).
  DRAGON_NAME_Y: 44, DRAGON_NAME_H: 30,
  // round: centered (480-250)/2 = 115; top corners d=~191.
  ENERGY_BAR_W: 250, ENERGY_BAR_H: 42, ENERGY_BAR_X: 115, ENERGY_BAR_Y: 96,
  ENERGY_SEG_COUNT: 8,
  STAR_S: 16, STAR_GAP: 2,
  // round: bar ends at 138, same 6px gap as Bip 6.
  DRAGON_STARS_Y: 144,
  // round: "?": right of the energy bar (bar ends at 365); worst corner
  // (415,96) is d~=227 from center — inside the 480 circle with margin.
  STATS_BTN_S: 40, STATS_BTN_X: 375, STATS_BTN_Y: 96,
  // round: equipment button mirrors "?" (right margin 65 = left margin 65);
  // worst corner (65,96) is d~=227 — inside with margin. Bar starts 115.
  EQUIP_BTN_S: 40, EQUIP_BTN_X: 65, EQUIP_BTN_Y: 96,
  // Battle-record modal: 5 rows under the title, shared by both devices.
  STATS_ROW_Y: 64, STATS_ROW_GAP: 40, STATS_ROW_H: 30,
  // round: title 44..74, combat line 80..104, grid 104..320 (nav top 326).
  EQUIP_COMBAT_Y: 80, EQUIP_COMBAT_H: 24,
  EQUIP_GRID_Y: 104, EQUIP_ROW_H: 108,
  // Equipment buy modal (panel-relative, same as Bip 6).
  EQUIP_BUY_ICON_S: 72, EQUIP_BUY_ICON_Y: 60,
  EQUIP_BUY_BONUS_Y: 140, EQUIP_BUY_BONUS_H: 28,
  EQUIP_BUY_PRICE_Y: 172, EQUIP_BUY_PRICE_H: 28,
  EQUIP_BUY_WALLET_Y: 204, EQUIP_BUY_WALLET_H: 28,
  BEAST_STARS_Y: 130,
  MONSTER_STARS_Y_OFFSET: 74,
  // round: 84px icons stay (assets are 84x84 — smaller would crop). Row at
  // y=326..410 (10px lower than before); side pad 77 is the widest the
  // 480 circle allows at this height — bottom corners at d=~236, inside
  // the 4px test margin. Overlap shrinks from ~5px to ~3px; a true gap
  // needs smaller icon art, not just repositioning.
  // Feet overlap the dragon art more than on Bip 6 — same pattern (icons
  // draw on top), accepted for the curved bottom dead-zone.
  ACTION_SIDE_PAD: 77, ACTION_BOTTOM_PAD: 70, ACTION_ICON_S: 84,
  // round: energy slot (96) + button with a 12px gap above the action row.
  HATCH_TEXT_Y: 96, HATCH_TEXT_H: 30, HATCH_BTN_Y: 256,
  ROSTER_SLOTS: 5, ROSTER_THUMB: 60, ROSTER_FRAME: 72,
  // round: frames at abs y=314..386, x=64..416; corners d=~229 < 240.
  ROSTER_LEFT: 70, ROSTER_BOTTOM_PAD: 100,
  EGG_BLOCKED_TEXT_Y: 90, EGG_BLOCKED_TEXT_H: 40,
  EGG_PRICE_ICON_Y: 140, EGG_PRICE_TEXT_Y: 208, EGG_PRICE_TEXT_H: 40,
  EGG_DICE_S: 80,
  // round: (320-80)/2 = 120.
  EGG_DICE_X: 120, EGG_DICE_Y: 80,
  EGG_SPIN_HINT_Y: 180, EGG_SPIN_HINT_H: 30, EGG_SPIN_BTN_Y: 220,
  EGG_REVEAL_S: 60, EGG_REVEAL_Y: 56, EGG_REVEAL_PRICE_Y: 150, EGG_REVEAL_PRICE_TEXT_Y: 218,
  // round: 240 egg at 46..286 fills title-to-button exactly (title ends 46,
  // Buy at 286..334, 6px bottom margin in the 340-tall panel). Arrows at
  // 142 = 46 + (240-48)/2. X derived from PANEL_W/MODAL_PAD like Bip 6.
  EGG_CHOOSE_S: 240, EGG_CHOOSE_Y: 46, EGG_CHOOSE_BTN_Y: 286,
  EGG_ARROW_S: 48, EGG_ARROW_Y: 142,
  TRAIN_COIN_Y: 60, TRAIN_COIN_TEXT_Y: 128, TRAIN_COIN_TEXT_H: 40,
  TRAIN_ENERGY_Y: 168, TRAIN_ENERGY_H: 26, TRAIN_WARN_Y: 194, TRAIN_WARN_H: 30,
  TRAIN_RESULT_ICON_S: 60,
  // round: (320-60)/2 = 130.
  TRAIN_RESULT_ICON_X: 130, TRAIN_RESULT_ICON_Y: 70,
  TRAIN_RESULT_GAIN_Y: 140, TRAIN_RESULT_GAIN_H: 30,
  TRAIN_RESULT_ENERGY_Y: 170, TRAIN_RESULT_ENERGY_H: 26,
  TRAIN_RESULT_LEVEL_Y: 196, TRAIN_RESULT_LEVEL_H: 30,
  SELL_ICON_S: 60, SELL_ICON_Y: 50, SELL_LABEL_Y: 120, SELL_LABEL_H: 28,
  SELL_COIN_Y: 155, SELL_COIN_TEXT_Y: 223, SELL_COIN_TEXT_H: 40,
  SELL_BTN_W: 120,
  // round: symmetric 30px margins (30+120+20+120+30 = 320); Sell right.
  SELL_BTN_X: 170, KEEP_BTN_X: 30,
  // round: 52 — three 92px rows (52/144/236) fit while rowY+90 <= 330.
  MONSTER_ROW_Y: 52, MONSTER_ROW_H: 92, MONSTER_ROW_MAX_H: 90, MONSTER_ROW_BOTTOM_PAD: 10,
  MONSTER_IMG_X: 24, MONSTER_IMG_S: 72,
  MONSTER_NAME_X: 100,
  // round: narrowed so name/gain (100..180) clear the fight button (190..).
  MONSTER_NAME_W: 80, MONSTER_NAME_H: 28,
  MONSTER_GAIN_Y: 28, MONSTER_GAIN_W: 80, MONSTER_GAIN_H: 20,
  // round: 30px right margin like Bip 6 (320-30-100 = 190).
  MONSTER_FIGHT_BTN_X: 190, MONSTER_FIGHT_BTN_Y: 12, MONSTER_FIGHT_BTN_W: 100, MONSTER_FIGHT_BTN_H: 44,
  // Fight screen (full-screen, not a modal): title, arena (dragons left,
  // enemy right, green HP bar above every unit), one log line, Continue
  // button floats over the arena bottom when the replay ends.
  // round: title 26..50, arena 56..440, log 404..430. Log chord at
  // y~417 is ~324px: a 37-char line at 12px (~266px) fits; at the old
  // 446 the chord is ~200px and the damage number clipped off.
  // Continue 26..74 (title hides once done) so it never collides with
  // the log or the arena-bottom units. Enemy 356..428: at y=257..329
  // the corners sit at d~=208 < 236. Left columns at 52 (<=6 dragons;
  // circle allows y in [97,383] there) or 140 (7+ dragons; the circle
  // allows y in [26,454] there, room for 6 rows).
  FIGHT_TITLE_Y: 26, FIGHT_TITLE_H: 24,
  FIGHT_ARENA_Y: 56, FIGHT_ARENA_H: 384,
  FIGHT_LOG_Y: 404, FIGHT_LOG_H: 26, FIGHT_LOG_FONT: 12,
  FIGHT_CONTINUE_Y: 26,
  FIGHT_LEFT_X: 52, FIGHT_LEFT_X_WIDE: 140, FIGHT_COL_GAP: 12,
  FIGHT_ENEMY_X: 356,
  FIGHT_DRAGON_S: 60, FIGHT_ENEMY_S: 72,
  FIGHT_HP_BAR_H: 8, FIGHT_HP_BAR_GAP: 2, FIGHT_ROW_GAP: 4,
  FIGHT_FIREBALL_S: 28, FIGHT_IMPACT_S: 48, FIGHT_MISS_H: 24,
  // round: (320-72)/2 = 124.
  BEAST_IMG_X: 124, BEAST_IMG_Y: 56, BEAST_IMG_S: 72,
  BEAST_VANISHED_Y: 160, BEAST_VANISHED_H: 30,
  // round: (320-250)/2 = 35 — bar keeps its 250px asset size.
  BEAST_BAR_X: 35, BEAST_BAR_Y: 150, BEAST_BAR_W: 250, BEAST_BAR_H: 42,
  BEAST_TEAM_Y: 198, BEAST_TEAM_H: 30, BEAST_WARN_Y: 230, BEAST_WARN_H: 44,
  // round: (320-64)/2 = 128.
  COINS_ICON_X: 128, COINS_ICON_Y: 70, COINS_ICON_S: 64,
  COINS_TEXT_Y: 150, COINS_TEXT_H: 60,
  ICON_SIZE: 64, COIN_BIG_TEXT_W: 300,
};

// ---------------------------------------------------------------------------
// Profile resolution (pure — no device APIs, fully unit-testable).
// ---------------------------------------------------------------------------

export function resolveProfileId(info) {
  if (info && info.deviceSource && DEVICE_SOURCE_PROFILE[info.deviceSource]) {
    return DEVICE_SOURCE_PROFILE[info.deviceSource];
  }
  const shape = info && info.screenShape;
  if (shape === 'round' || shape === 'ROUND') return 'round480';
  if (shape === 'square' || shape === 'rect' || shape === 'SQUARE') return 'bip6';
  // Fall back to resolution: every round Zepp OS watch ships square pixels
  // (480x480, 466x466, 454x454, 416x416, ...); rect watches never do.
  // Tiny square-pixel watches (176x176 class) keep the rect layout.
  const w = info ? Number(info.width) : NaN;
  const h = info ? Number(info.height) : NaN;
  if (w && h && w === h) return w > 300 ? 'round480' : 'bip6';
  return 'bip6';
}

export function layoutFor(profileId) {
  return profileId === 'round480' ? ROUND480_LAYOUT : BIP6_LAYOUT;
}

// ---------------------------------------------------------------------------
// Live bindings: page/index.js imports these names (same identifiers the
// old index.style.js exported) and uses them as plain constants. The UI code
// has no device forks — refreshLayout() swaps the values underneath.
// ---------------------------------------------------------------------------

export const DEVICE = { width: 390, height: 450, shape: 'rect', profileId: 'bip6' };

export let BG_X = BIP6_LAYOUT.BG_X;
export let BG_Y = BIP6_LAYOUT.BG_Y;
export let BG_W = BIP6_LAYOUT.BG_W;
export let BG_H = BIP6_LAYOUT.BG_H;
export let BG_HOME_SRC = BIP6_LAYOUT.BG_HOME_SRC;
export let BG_DRAGON_SRC = BIP6_LAYOUT.BG_DRAGON_SRC;
export let PANEL_X = BIP6_LAYOUT.PANEL_X;
export let PANEL_Y = BIP6_LAYOUT.PANEL_Y;
export let PANEL_W = BIP6_LAYOUT.PANEL_W;
export let PANEL_H = BIP6_LAYOUT.PANEL_H;
export let BTN_W = BIP6_LAYOUT.BTN_W;
export let BTN_H = BIP6_LAYOUT.BTN_H;
export let BTN_CENTER_X = BIP6_LAYOUT.BTN_CENTER_X;
export let BTN_BOTTOM_OFFSET = BIP6_LAYOUT.BTN_BOTTOM_OFFSET;
export let MODAL_PAD = BIP6_LAYOUT.MODAL_PAD;
export let MODAL_TITLE_Y = BIP6_LAYOUT.MODAL_TITLE_Y;
export let MODAL_TITLE_H = BIP6_LAYOUT.MODAL_TITLE_H;
export let MODAL_CLOSE_S = BIP6_LAYOUT.MODAL_CLOSE_S;
export let MODAL_CLOSE_OFFSET = BIP6_LAYOUT.MODAL_CLOSE_OFFSET;
export let MODAL_CLOSE_Y = BIP6_LAYOUT.MODAL_CLOSE_Y;
export let BALANCE_ICON_S = BIP6_LAYOUT.BALANCE_ICON_S;
export let BALANCE_ICON_Y = BIP6_LAYOUT.BALANCE_ICON_Y;
export let BALANCE_TEXT_Y = BIP6_LAYOUT.BALANCE_TEXT_Y;
export let BALANCE_TEXT_H = BIP6_LAYOUT.BALANCE_TEXT_H;
export let EGG_BTN_X = BIP6_LAYOUT.EGG_BTN_X;
export let EGG_BTN_Y = BIP6_LAYOUT.EGG_BTN_Y;
export let EGG_BTN_S = BIP6_LAYOUT.EGG_BTN_S;
export let BEAST_BTN_OFFSET_X = BIP6_LAYOUT.BEAST_BTN_OFFSET_X;
export let BEAST_BTN_Y = BIP6_LAYOUT.BEAST_BTN_Y;
export let BEAST_BTN_S = BIP6_LAYOUT.BEAST_BTN_S;
export let EARN_TEXT_Y = BIP6_LAYOUT.EARN_TEXT_Y;
export let EARN_TEXT_H = BIP6_LAYOUT.EARN_TEXT_H;
export let EARN_ICON_S = BIP6_LAYOUT.EARN_ICON_S;
export let EARN_ICON_Y = BIP6_LAYOUT.EARN_ICON_Y;
export let DRAGON_IMG_S = BIP6_LAYOUT.DRAGON_IMG_S;
export let DRAGON_IMG_Y = BIP6_LAYOUT.DRAGON_IMG_Y;
export let DRAGON_IMG_HATCHED_OFFSET = BIP6_LAYOUT.DRAGON_IMG_HATCHED_OFFSET;
export let SHADOW_W = BIP6_LAYOUT.SHADOW_W;
export let SHADOW_H = BIP6_LAYOUT.SHADOW_H;
export let SHADOW_Y_OFFSET = BIP6_LAYOUT.SHADOW_Y_OFFSET;
export let DRAGON_NAME_Y = BIP6_LAYOUT.DRAGON_NAME_Y;
export let DRAGON_NAME_H = BIP6_LAYOUT.DRAGON_NAME_H;
export let ENERGY_BAR_W = BIP6_LAYOUT.ENERGY_BAR_W;
export let ENERGY_BAR_H = BIP6_LAYOUT.ENERGY_BAR_H;
export let ENERGY_BAR_X = BIP6_LAYOUT.ENERGY_BAR_X;
export let ENERGY_BAR_Y = BIP6_LAYOUT.ENERGY_BAR_Y;
export let ENERGY_SEG_COUNT = BIP6_LAYOUT.ENERGY_SEG_COUNT;
export let STAR_S = BIP6_LAYOUT.STAR_S;
export let STAR_GAP = BIP6_LAYOUT.STAR_GAP;
export let DRAGON_STARS_Y = BIP6_LAYOUT.DRAGON_STARS_Y;
export let STATS_BTN_S = BIP6_LAYOUT.STATS_BTN_S;
export let STATS_BTN_X = BIP6_LAYOUT.STATS_BTN_X;
export let STATS_BTN_Y = BIP6_LAYOUT.STATS_BTN_Y;
export let EQUIP_BTN_S = BIP6_LAYOUT.EQUIP_BTN_S;
export let EQUIP_BTN_X = BIP6_LAYOUT.EQUIP_BTN_X;
export let EQUIP_BTN_Y = BIP6_LAYOUT.EQUIP_BTN_Y;
export let EQUIP_COMBAT_Y = BIP6_LAYOUT.EQUIP_COMBAT_Y;
export let EQUIP_COMBAT_H = BIP6_LAYOUT.EQUIP_COMBAT_H;
export let EQUIP_GRID_Y = BIP6_LAYOUT.EQUIP_GRID_Y;
export let EQUIP_ROW_H = BIP6_LAYOUT.EQUIP_ROW_H;
export let EQUIP_BUY_ICON_S = BIP6_LAYOUT.EQUIP_BUY_ICON_S;
export let EQUIP_BUY_ICON_Y = BIP6_LAYOUT.EQUIP_BUY_ICON_Y;
export let EQUIP_BUY_BONUS_Y = BIP6_LAYOUT.EQUIP_BUY_BONUS_Y;
export let EQUIP_BUY_BONUS_H = BIP6_LAYOUT.EQUIP_BUY_BONUS_H;
export let EQUIP_BUY_PRICE_Y = BIP6_LAYOUT.EQUIP_BUY_PRICE_Y;
export let EQUIP_BUY_PRICE_H = BIP6_LAYOUT.EQUIP_BUY_PRICE_H;
export let EQUIP_BUY_WALLET_Y = BIP6_LAYOUT.EQUIP_BUY_WALLET_Y;
export let EQUIP_BUY_WALLET_H = BIP6_LAYOUT.EQUIP_BUY_WALLET_H;
export let STATS_ROW_Y = BIP6_LAYOUT.STATS_ROW_Y;
export let STATS_ROW_GAP = BIP6_LAYOUT.STATS_ROW_GAP;
export let STATS_ROW_H = BIP6_LAYOUT.STATS_ROW_H;
export let BEAST_STARS_Y = BIP6_LAYOUT.BEAST_STARS_Y;
export let MONSTER_STARS_Y_OFFSET = BIP6_LAYOUT.MONSTER_STARS_Y_OFFSET;
export let ACTION_SIDE_PAD = BIP6_LAYOUT.ACTION_SIDE_PAD;
export let ACTION_BOTTOM_PAD = BIP6_LAYOUT.ACTION_BOTTOM_PAD;
export let ACTION_ICON_S = BIP6_LAYOUT.ACTION_ICON_S;
export let HATCH_TEXT_Y = BIP6_LAYOUT.HATCH_TEXT_Y;
export let HATCH_TEXT_H = BIP6_LAYOUT.HATCH_TEXT_H;
export let HATCH_BTN_Y = BIP6_LAYOUT.HATCH_BTN_Y;
export let ROSTER_SLOTS = BIP6_LAYOUT.ROSTER_SLOTS;
export let ROSTER_THUMB = BIP6_LAYOUT.ROSTER_THUMB;
export let ROSTER_FRAME = BIP6_LAYOUT.ROSTER_FRAME;
export let ROSTER_LEFT = BIP6_LAYOUT.ROSTER_LEFT;
export let ROSTER_BOTTOM_PAD = BIP6_LAYOUT.ROSTER_BOTTOM_PAD;
export let EGG_BLOCKED_TEXT_Y = BIP6_LAYOUT.EGG_BLOCKED_TEXT_Y;
export let EGG_BLOCKED_TEXT_H = BIP6_LAYOUT.EGG_BLOCKED_TEXT_H;
export let EGG_PRICE_ICON_Y = BIP6_LAYOUT.EGG_PRICE_ICON_Y;
export let EGG_PRICE_TEXT_Y = BIP6_LAYOUT.EGG_PRICE_TEXT_Y;
export let EGG_PRICE_TEXT_H = BIP6_LAYOUT.EGG_PRICE_TEXT_H;
export let EGG_DICE_S = BIP6_LAYOUT.EGG_DICE_S;
export let EGG_DICE_X = BIP6_LAYOUT.EGG_DICE_X;
export let EGG_DICE_Y = BIP6_LAYOUT.EGG_DICE_Y;
export let EGG_SPIN_HINT_Y = BIP6_LAYOUT.EGG_SPIN_HINT_Y;
export let EGG_SPIN_HINT_H = BIP6_LAYOUT.EGG_SPIN_HINT_H;
export let EGG_SPIN_BTN_Y = BIP6_LAYOUT.EGG_SPIN_BTN_Y;
export let EGG_REVEAL_S = BIP6_LAYOUT.EGG_REVEAL_S;
export let EGG_REVEAL_Y = BIP6_LAYOUT.EGG_REVEAL_Y;
export let EGG_REVEAL_PRICE_Y = BIP6_LAYOUT.EGG_REVEAL_PRICE_Y;
export let EGG_REVEAL_PRICE_TEXT_Y = BIP6_LAYOUT.EGG_REVEAL_PRICE_TEXT_Y;
export let EGG_CHOOSE_S = BIP6_LAYOUT.EGG_CHOOSE_S;
export let EGG_CHOOSE_Y = BIP6_LAYOUT.EGG_CHOOSE_Y;
export let EGG_CHOOSE_BTN_Y = BIP6_LAYOUT.EGG_CHOOSE_BTN_Y;
export let EGG_ARROW_S = BIP6_LAYOUT.EGG_ARROW_S;
export let EGG_ARROW_Y = BIP6_LAYOUT.EGG_ARROW_Y;
export let TRAIN_COIN_Y = BIP6_LAYOUT.TRAIN_COIN_Y;
export let TRAIN_COIN_TEXT_Y = BIP6_LAYOUT.TRAIN_COIN_TEXT_Y;
export let TRAIN_COIN_TEXT_H = BIP6_LAYOUT.TRAIN_COIN_TEXT_H;
export let TRAIN_ENERGY_Y = BIP6_LAYOUT.TRAIN_ENERGY_Y;
export let TRAIN_ENERGY_H = BIP6_LAYOUT.TRAIN_ENERGY_H;
export let TRAIN_WARN_Y = BIP6_LAYOUT.TRAIN_WARN_Y;
export let TRAIN_WARN_H = BIP6_LAYOUT.TRAIN_WARN_H;
export let TRAIN_RESULT_ICON_S = BIP6_LAYOUT.TRAIN_RESULT_ICON_S;
export let TRAIN_RESULT_ICON_X = BIP6_LAYOUT.TRAIN_RESULT_ICON_X;
export let TRAIN_RESULT_ICON_Y = BIP6_LAYOUT.TRAIN_RESULT_ICON_Y;
export let TRAIN_RESULT_GAIN_Y = BIP6_LAYOUT.TRAIN_RESULT_GAIN_Y;
export let TRAIN_RESULT_GAIN_H = BIP6_LAYOUT.TRAIN_RESULT_GAIN_H;
export let TRAIN_RESULT_ENERGY_Y = BIP6_LAYOUT.TRAIN_RESULT_ENERGY_Y;
export let TRAIN_RESULT_ENERGY_H = BIP6_LAYOUT.TRAIN_RESULT_ENERGY_H;
export let TRAIN_RESULT_LEVEL_Y = BIP6_LAYOUT.TRAIN_RESULT_LEVEL_Y;
export let TRAIN_RESULT_LEVEL_H = BIP6_LAYOUT.TRAIN_RESULT_LEVEL_H;
export let SELL_ICON_S = BIP6_LAYOUT.SELL_ICON_S;
export let SELL_ICON_Y = BIP6_LAYOUT.SELL_ICON_Y;
export let SELL_LABEL_Y = BIP6_LAYOUT.SELL_LABEL_Y;
export let SELL_LABEL_H = BIP6_LAYOUT.SELL_LABEL_H;
export let SELL_COIN_Y = BIP6_LAYOUT.SELL_COIN_Y;
export let SELL_COIN_TEXT_Y = BIP6_LAYOUT.SELL_COIN_TEXT_Y;
export let SELL_COIN_TEXT_H = BIP6_LAYOUT.SELL_COIN_TEXT_H;
export let SELL_BTN_W = BIP6_LAYOUT.SELL_BTN_W;
export let SELL_BTN_X = BIP6_LAYOUT.SELL_BTN_X;
export let KEEP_BTN_X = BIP6_LAYOUT.KEEP_BTN_X;
export let MONSTER_ROW_Y = BIP6_LAYOUT.MONSTER_ROW_Y;
export let MONSTER_ROW_H = BIP6_LAYOUT.MONSTER_ROW_H;
export let MONSTER_ROW_MAX_H = BIP6_LAYOUT.MONSTER_ROW_MAX_H;
export let MONSTER_ROW_BOTTOM_PAD = BIP6_LAYOUT.MONSTER_ROW_BOTTOM_PAD;
export let MONSTER_IMG_X = BIP6_LAYOUT.MONSTER_IMG_X;
export let MONSTER_IMG_S = BIP6_LAYOUT.MONSTER_IMG_S;
export let MONSTER_NAME_X = BIP6_LAYOUT.MONSTER_NAME_X;
export let MONSTER_NAME_W = BIP6_LAYOUT.MONSTER_NAME_W;
export let MONSTER_NAME_H = BIP6_LAYOUT.MONSTER_NAME_H;
export let MONSTER_GAIN_Y = BIP6_LAYOUT.MONSTER_GAIN_Y;
export let MONSTER_GAIN_W = BIP6_LAYOUT.MONSTER_GAIN_W;
export let MONSTER_GAIN_H = BIP6_LAYOUT.MONSTER_GAIN_H;
export let MONSTER_FIGHT_BTN_X = BIP6_LAYOUT.MONSTER_FIGHT_BTN_X;
export let MONSTER_FIGHT_BTN_Y = BIP6_LAYOUT.MONSTER_FIGHT_BTN_Y;
export let MONSTER_FIGHT_BTN_W = BIP6_LAYOUT.MONSTER_FIGHT_BTN_W;
export let MONSTER_FIGHT_BTN_H = BIP6_LAYOUT.MONSTER_FIGHT_BTN_H;
export let FIGHT_TITLE_Y = BIP6_LAYOUT.FIGHT_TITLE_Y;
export let FIGHT_TITLE_H = BIP6_LAYOUT.FIGHT_TITLE_H;
export let FIGHT_ARENA_Y = BIP6_LAYOUT.FIGHT_ARENA_Y;
export let FIGHT_ARENA_H = BIP6_LAYOUT.FIGHT_ARENA_H;
export let FIGHT_LOG_Y = BIP6_LAYOUT.FIGHT_LOG_Y;
export let FIGHT_LOG_H = BIP6_LAYOUT.FIGHT_LOG_H;
export let FIGHT_LOG_FONT = BIP6_LAYOUT.FIGHT_LOG_FONT;
export let FIGHT_CONTINUE_Y = BIP6_LAYOUT.FIGHT_CONTINUE_Y;
export let FIGHT_LEFT_X = BIP6_LAYOUT.FIGHT_LEFT_X;
export let FIGHT_LEFT_X_WIDE = BIP6_LAYOUT.FIGHT_LEFT_X_WIDE;
export let FIGHT_COL_GAP = BIP6_LAYOUT.FIGHT_COL_GAP;
export let FIGHT_ENEMY_X = BIP6_LAYOUT.FIGHT_ENEMY_X;
export let FIGHT_DRAGON_S = BIP6_LAYOUT.FIGHT_DRAGON_S;
export let FIGHT_ENEMY_S = BIP6_LAYOUT.FIGHT_ENEMY_S;
export let FIGHT_HP_BAR_H = BIP6_LAYOUT.FIGHT_HP_BAR_H;
export let FIGHT_HP_BAR_GAP = BIP6_LAYOUT.FIGHT_HP_BAR_GAP;
export let FIGHT_ROW_GAP = BIP6_LAYOUT.FIGHT_ROW_GAP;
export let FIGHT_FIREBALL_S = BIP6_LAYOUT.FIGHT_FIREBALL_S;
export let FIGHT_IMPACT_S = BIP6_LAYOUT.FIGHT_IMPACT_S;
export let FIGHT_MISS_H = BIP6_LAYOUT.FIGHT_MISS_H;
export let BEAST_IMG_X = BIP6_LAYOUT.BEAST_IMG_X;
export let BEAST_IMG_Y = BIP6_LAYOUT.BEAST_IMG_Y;
export let BEAST_IMG_S = BIP6_LAYOUT.BEAST_IMG_S;
export let BEAST_VANISHED_Y = BIP6_LAYOUT.BEAST_VANISHED_Y;
export let BEAST_VANISHED_H = BIP6_LAYOUT.BEAST_VANISHED_H;
export let BEAST_BAR_X = BIP6_LAYOUT.BEAST_BAR_X;
export let BEAST_BAR_Y = BIP6_LAYOUT.BEAST_BAR_Y;
export let BEAST_BAR_W = BIP6_LAYOUT.BEAST_BAR_W;
export let BEAST_BAR_H = BIP6_LAYOUT.BEAST_BAR_H;
export let BEAST_TEAM_Y = BIP6_LAYOUT.BEAST_TEAM_Y;
export let BEAST_TEAM_H = BIP6_LAYOUT.BEAST_TEAM_H;
export let BEAST_WARN_Y = BIP6_LAYOUT.BEAST_WARN_Y;
export let BEAST_WARN_H = BIP6_LAYOUT.BEAST_WARN_H;
export let COINS_ICON_X = BIP6_LAYOUT.COINS_ICON_X;
export let COINS_ICON_Y = BIP6_LAYOUT.COINS_ICON_Y;
export let COINS_ICON_S = BIP6_LAYOUT.COINS_ICON_S;
export let COINS_TEXT_Y = BIP6_LAYOUT.COINS_TEXT_Y;
export let COINS_TEXT_H = BIP6_LAYOUT.COINS_TEXT_H;
export let ICON_SIZE = BIP6_LAYOUT.ICON_SIZE;
export let COIN_BIG_TEXT_W = BIP6_LAYOUT.COIN_BIG_TEXT_W;

// Pick the profile for `info` ({ width, height, screenShape, deviceSource }
// as returned by deviceAdapter.getInfo()), assign its table onto the live
// bindings above, and refresh DEVICE. Returns the resolved screen descriptor.
// Safe to call repeatedly (web device switcher); unknown info -> Bip 6.
export function refreshLayout(info) {
  const profileId = resolveProfileId(info);
  const profile = DEVICE_PROFILES[profileId] || DEVICE_PROFILES.bip6;
  const L = layoutFor(profileId);
  BG_X = L.BG_X;
  BG_Y = L.BG_Y;
  BG_W = L.BG_W;
  BG_H = L.BG_H;
  BG_HOME_SRC = L.BG_HOME_SRC;
  BG_DRAGON_SRC = L.BG_DRAGON_SRC;
  PANEL_X = L.PANEL_X;
  PANEL_Y = L.PANEL_Y;
  PANEL_W = L.PANEL_W;
  PANEL_H = L.PANEL_H;
  BTN_W = L.BTN_W;
  BTN_H = L.BTN_H;
  BTN_CENTER_X = L.BTN_CENTER_X;
  BTN_BOTTOM_OFFSET = L.BTN_BOTTOM_OFFSET;
  MODAL_PAD = L.MODAL_PAD;
  MODAL_TITLE_Y = L.MODAL_TITLE_Y;
  MODAL_TITLE_H = L.MODAL_TITLE_H;
  MODAL_CLOSE_S = L.MODAL_CLOSE_S;
  MODAL_CLOSE_OFFSET = L.MODAL_CLOSE_OFFSET;
  MODAL_CLOSE_Y = L.MODAL_CLOSE_Y;
  BALANCE_ICON_S = L.BALANCE_ICON_S;
  BALANCE_ICON_Y = L.BALANCE_ICON_Y;
  BALANCE_TEXT_Y = L.BALANCE_TEXT_Y;
  BALANCE_TEXT_H = L.BALANCE_TEXT_H;
  EGG_BTN_X = L.EGG_BTN_X;
  EGG_BTN_Y = L.EGG_BTN_Y;
  EGG_BTN_S = L.EGG_BTN_S;
  BEAST_BTN_OFFSET_X = L.BEAST_BTN_OFFSET_X;
  BEAST_BTN_Y = L.BEAST_BTN_Y;
  BEAST_BTN_S = L.BEAST_BTN_S;
  EARN_TEXT_Y = L.EARN_TEXT_Y;
  EARN_TEXT_H = L.EARN_TEXT_H;
  EARN_ICON_S = L.EARN_ICON_S;
  EARN_ICON_Y = L.EARN_ICON_Y;
  DRAGON_IMG_S = L.DRAGON_IMG_S;
  DRAGON_IMG_Y = L.DRAGON_IMG_Y;
  DRAGON_IMG_HATCHED_OFFSET = L.DRAGON_IMG_HATCHED_OFFSET;
  SHADOW_W = L.SHADOW_W;
  SHADOW_H = L.SHADOW_H;
  SHADOW_Y_OFFSET = L.SHADOW_Y_OFFSET;
  DRAGON_NAME_Y = L.DRAGON_NAME_Y;
  DRAGON_NAME_H = L.DRAGON_NAME_H;
  ENERGY_BAR_W = L.ENERGY_BAR_W;
  ENERGY_BAR_H = L.ENERGY_BAR_H;
  ENERGY_BAR_X = L.ENERGY_BAR_X;
  ENERGY_BAR_Y = L.ENERGY_BAR_Y;
  ENERGY_SEG_COUNT = L.ENERGY_SEG_COUNT;
  STAR_S = L.STAR_S;
  STAR_GAP = L.STAR_GAP;
  DRAGON_STARS_Y = L.DRAGON_STARS_Y;
  STATS_BTN_S = L.STATS_BTN_S;
  STATS_BTN_X = L.STATS_BTN_X;
  STATS_BTN_Y = L.STATS_BTN_Y;
  EQUIP_BTN_S = L.EQUIP_BTN_S;
  EQUIP_BTN_X = L.EQUIP_BTN_X;
  EQUIP_BTN_Y = L.EQUIP_BTN_Y;
  EQUIP_COMBAT_Y = L.EQUIP_COMBAT_Y;
  EQUIP_COMBAT_H = L.EQUIP_COMBAT_H;
  EQUIP_GRID_Y = L.EQUIP_GRID_Y;
  EQUIP_ROW_H = L.EQUIP_ROW_H;
  EQUIP_BUY_ICON_S = L.EQUIP_BUY_ICON_S;
  EQUIP_BUY_ICON_Y = L.EQUIP_BUY_ICON_Y;
  EQUIP_BUY_BONUS_Y = L.EQUIP_BUY_BONUS_Y;
  EQUIP_BUY_BONUS_H = L.EQUIP_BUY_BONUS_H;
  EQUIP_BUY_PRICE_Y = L.EQUIP_BUY_PRICE_Y;
  EQUIP_BUY_PRICE_H = L.EQUIP_BUY_PRICE_H;
  EQUIP_BUY_WALLET_Y = L.EQUIP_BUY_WALLET_Y;
  EQUIP_BUY_WALLET_H = L.EQUIP_BUY_WALLET_H;
  STATS_ROW_Y = L.STATS_ROW_Y;
  STATS_ROW_GAP = L.STATS_ROW_GAP;
  STATS_ROW_H = L.STATS_ROW_H;
  BEAST_STARS_Y = L.BEAST_STARS_Y;
  MONSTER_STARS_Y_OFFSET = L.MONSTER_STARS_Y_OFFSET;
  ACTION_SIDE_PAD = L.ACTION_SIDE_PAD;
  ACTION_BOTTOM_PAD = L.ACTION_BOTTOM_PAD;
  ACTION_ICON_S = L.ACTION_ICON_S;
  HATCH_TEXT_Y = L.HATCH_TEXT_Y;
  HATCH_TEXT_H = L.HATCH_TEXT_H;
  HATCH_BTN_Y = L.HATCH_BTN_Y;
  ROSTER_SLOTS = L.ROSTER_SLOTS;
  ROSTER_THUMB = L.ROSTER_THUMB;
  ROSTER_FRAME = L.ROSTER_FRAME;
  ROSTER_LEFT = L.ROSTER_LEFT;
  ROSTER_BOTTOM_PAD = L.ROSTER_BOTTOM_PAD;
  EGG_BLOCKED_TEXT_Y = L.EGG_BLOCKED_TEXT_Y;
  EGG_BLOCKED_TEXT_H = L.EGG_BLOCKED_TEXT_H;
  EGG_PRICE_ICON_Y = L.EGG_PRICE_ICON_Y;
  EGG_PRICE_TEXT_Y = L.EGG_PRICE_TEXT_Y;
  EGG_PRICE_TEXT_H = L.EGG_PRICE_TEXT_H;
  EGG_DICE_S = L.EGG_DICE_S;
  EGG_DICE_X = L.EGG_DICE_X;
  EGG_DICE_Y = L.EGG_DICE_Y;
  EGG_SPIN_HINT_Y = L.EGG_SPIN_HINT_Y;
  EGG_SPIN_HINT_H = L.EGG_SPIN_HINT_H;
  EGG_SPIN_BTN_Y = L.EGG_SPIN_BTN_Y;
  EGG_REVEAL_S = L.EGG_REVEAL_S;
  EGG_REVEAL_Y = L.EGG_REVEAL_Y;
  EGG_REVEAL_PRICE_Y = L.EGG_REVEAL_PRICE_Y;
  EGG_REVEAL_PRICE_TEXT_Y = L.EGG_REVEAL_PRICE_TEXT_Y;
  EGG_CHOOSE_S = L.EGG_CHOOSE_S;
  EGG_CHOOSE_Y = L.EGG_CHOOSE_Y;
  EGG_CHOOSE_BTN_Y = L.EGG_CHOOSE_BTN_Y;
  EGG_ARROW_S = L.EGG_ARROW_S;
  EGG_ARROW_Y = L.EGG_ARROW_Y;
  TRAIN_COIN_Y = L.TRAIN_COIN_Y;
  TRAIN_COIN_TEXT_Y = L.TRAIN_COIN_TEXT_Y;
  TRAIN_COIN_TEXT_H = L.TRAIN_COIN_TEXT_H;
  TRAIN_ENERGY_Y = L.TRAIN_ENERGY_Y;
  TRAIN_ENERGY_H = L.TRAIN_ENERGY_H;
  TRAIN_WARN_Y = L.TRAIN_WARN_Y;
  TRAIN_WARN_H = L.TRAIN_WARN_H;
  TRAIN_RESULT_ICON_S = L.TRAIN_RESULT_ICON_S;
  TRAIN_RESULT_ICON_X = L.TRAIN_RESULT_ICON_X;
  TRAIN_RESULT_ICON_Y = L.TRAIN_RESULT_ICON_Y;
  TRAIN_RESULT_GAIN_Y = L.TRAIN_RESULT_GAIN_Y;
  TRAIN_RESULT_GAIN_H = L.TRAIN_RESULT_GAIN_H;
  TRAIN_RESULT_ENERGY_Y = L.TRAIN_RESULT_ENERGY_Y;
  TRAIN_RESULT_ENERGY_H = L.TRAIN_RESULT_ENERGY_H;
  TRAIN_RESULT_LEVEL_Y = L.TRAIN_RESULT_LEVEL_Y;
  TRAIN_RESULT_LEVEL_H = L.TRAIN_RESULT_LEVEL_H;
  SELL_ICON_S = L.SELL_ICON_S;
  SELL_ICON_Y = L.SELL_ICON_Y;
  SELL_LABEL_Y = L.SELL_LABEL_Y;
  SELL_LABEL_H = L.SELL_LABEL_H;
  SELL_COIN_Y = L.SELL_COIN_Y;
  SELL_COIN_TEXT_Y = L.SELL_COIN_TEXT_Y;
  SELL_COIN_TEXT_H = L.SELL_COIN_TEXT_H;
  SELL_BTN_W = L.SELL_BTN_W;
  SELL_BTN_X = L.SELL_BTN_X;
  KEEP_BTN_X = L.KEEP_BTN_X;
  MONSTER_ROW_Y = L.MONSTER_ROW_Y;
  MONSTER_ROW_H = L.MONSTER_ROW_H;
  MONSTER_ROW_MAX_H = L.MONSTER_ROW_MAX_H;
  MONSTER_ROW_BOTTOM_PAD = L.MONSTER_ROW_BOTTOM_PAD;
  MONSTER_IMG_X = L.MONSTER_IMG_X;
  MONSTER_IMG_S = L.MONSTER_IMG_S;
  MONSTER_NAME_X = L.MONSTER_NAME_X;
  MONSTER_NAME_W = L.MONSTER_NAME_W;
  MONSTER_NAME_H = L.MONSTER_NAME_H;
  MONSTER_GAIN_Y = L.MONSTER_GAIN_Y;
  MONSTER_GAIN_W = L.MONSTER_GAIN_W;
  MONSTER_GAIN_H = L.MONSTER_GAIN_H;
  MONSTER_FIGHT_BTN_X = L.MONSTER_FIGHT_BTN_X;
  MONSTER_FIGHT_BTN_Y = L.MONSTER_FIGHT_BTN_Y;
  MONSTER_FIGHT_BTN_W = L.MONSTER_FIGHT_BTN_W;
  MONSTER_FIGHT_BTN_H = L.MONSTER_FIGHT_BTN_H;
  FIGHT_TITLE_Y = L.FIGHT_TITLE_Y;
  FIGHT_TITLE_H = L.FIGHT_TITLE_H;
  FIGHT_ARENA_Y = L.FIGHT_ARENA_Y;
  FIGHT_ARENA_H = L.FIGHT_ARENA_H;
  FIGHT_LOG_Y = L.FIGHT_LOG_Y;
  FIGHT_LOG_H = L.FIGHT_LOG_H;
  FIGHT_LOG_FONT = L.FIGHT_LOG_FONT;
  FIGHT_CONTINUE_Y = L.FIGHT_CONTINUE_Y;
  FIGHT_LEFT_X = L.FIGHT_LEFT_X;
  FIGHT_LEFT_X_WIDE = L.FIGHT_LEFT_X_WIDE;
  FIGHT_COL_GAP = L.FIGHT_COL_GAP;
  FIGHT_ENEMY_X = L.FIGHT_ENEMY_X;
  FIGHT_DRAGON_S = L.FIGHT_DRAGON_S;
  FIGHT_ENEMY_S = L.FIGHT_ENEMY_S;
  FIGHT_HP_BAR_H = L.FIGHT_HP_BAR_H;
  FIGHT_HP_BAR_GAP = L.FIGHT_HP_BAR_GAP;
  FIGHT_ROW_GAP = L.FIGHT_ROW_GAP;
  FIGHT_FIREBALL_S = L.FIGHT_FIREBALL_S;
  FIGHT_IMPACT_S = L.FIGHT_IMPACT_S;
  FIGHT_MISS_H = L.FIGHT_MISS_H;
  BEAST_IMG_X = L.BEAST_IMG_X;
  BEAST_IMG_Y = L.BEAST_IMG_Y;
  BEAST_IMG_S = L.BEAST_IMG_S;
  BEAST_VANISHED_Y = L.BEAST_VANISHED_Y;
  BEAST_VANISHED_H = L.BEAST_VANISHED_H;
  BEAST_BAR_X = L.BEAST_BAR_X;
  BEAST_BAR_Y = L.BEAST_BAR_Y;
  BEAST_BAR_W = L.BEAST_BAR_W;
  BEAST_BAR_H = L.BEAST_BAR_H;
  BEAST_TEAM_Y = L.BEAST_TEAM_Y;
  BEAST_TEAM_H = L.BEAST_TEAM_H;
  BEAST_WARN_Y = L.BEAST_WARN_Y;
  BEAST_WARN_H = L.BEAST_WARN_H;
  COINS_ICON_X = L.COINS_ICON_X;
  COINS_ICON_Y = L.COINS_ICON_Y;
  COINS_ICON_S = L.COINS_ICON_S;
  COINS_TEXT_Y = L.COINS_TEXT_Y;
  COINS_TEXT_H = L.COINS_TEXT_H;
  ICON_SIZE = L.ICON_SIZE;
  COIN_BIG_TEXT_W = L.COIN_BIG_TEXT_W;
  // Screen size follows the live device report (falls back to the profile
  // canonical size); placement above follows the profile table.
  const w = info && Number(info.width);
  const h = info && Number(info.height);
  DEVICE.width = w > 0 ? w : profile.width;
  DEVICE.height = h > 0 ? h : profile.height;
  DEVICE.shape = profile.shape;
  DEVICE.profileId = profileId;
  return { profileId, width: DEVICE.width, height: DEVICE.height, shape: DEVICE.shape };
}
