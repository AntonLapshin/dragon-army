export const TEXT_SIZE_SMALL = 12;
export const TEXT_SIZE_MEDIUM = 16;
export const TEXT_SIZE_LARGE = 20;

// Dragon Army UI theme (mirrors koala page/index.style.js role).
//
// FILL_RECT opacity comes from the separate `alpha` prop (API 3.0+, 0-255:
// 255 opaque, 0 transparent). Color stays 24-bit RGB — never pack alpha into
// color as 8-digit ARGB.
export const SHADE_COLOR = 0x000000;
export const SHADE_ALPHA = 153; // 0x99 ~= 60% black dim
export const TEXT_PILL_RADIUS = 8;
export const PANEL_COLOR = 0x1a1a2e;
export const PANEL_ALPHA = 238; // 0xEE
export const BTN_GREEN = 0x4caf50;
export const BTN_GREEN_PRESS = 0x2e7d32;
export const ICON_SIZE = 64;
export const CENTER_IMG = 240;

// Semi-transparent black pill drawn behind texts so they stay readable
// over the bright bg-home / bg-dragon artwork (FILL_RECT color + alpha).
export const TEXT_PILL_COLOR = 0x000000;
export const TEXT_PILL_ALPHA = 153; // 0x99 ~= 60%

// Modal panel layout (fixed geometry for the 390x450 watch screen).
export const PANEL_W = 340;
export const PANEL_H = 370;
export const PANEL_X = 25;
export const PANEL_Y = 40;
