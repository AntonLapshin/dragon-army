export const TEXT_SIZE_SMALL = 12;
export const TEXT_SIZE_MEDIUM = 16;
export const TEXT_SIZE_LARGE = 20;

// Dragon Army UI theme (mirrors koala page/index.style.js role).
export const OVERLAY_COLOR = 0x8c222222;
// NOTE: Zepp OS ignores FILL_RECT alpha, so these translucent colors are
// no longer used for dimming — page/index.js uses misc/overlay.png instead.
// Kept exported for compatibility.
export const MODAL_DIM_COLOR = 0x99000000;
export const PANEL_COLOR = 0xee1a1a2e;
export const BTN_GREEN = 0x4caf50;
export const BTN_GREEN_PRESS = 0x2e7d32;
export const ICON_SIZE = 64;
export const CENTER_IMG = 240;

// Semi-transparent black pill drawn behind texts so they stay readable
// over the bright bg-home / bg-dragon artwork.
// (Unused on-device for the same alpha reason — see above.)
export const TEXT_PILL_COLOR = 0xcc000000;

// Modal panel layout (fixed geometry for the 390x450 watch screen).
export const PANEL_W = 340;
export const PANEL_H = 370;
export const PANEL_X = 25;
export const PANEL_Y = 40;
