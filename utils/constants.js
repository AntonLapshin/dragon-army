// Deprecated fallback: screen size is now resolved per device at startup.
// Use DEVICE from page/layouts.js instead (refreshLayout() picks the Bip 6
// rect vs round 480x480 tables via deviceAdapter.getInfo()). These constants
// stay only so older imports keep working; they always describe Bip 6.
export const DEVICE_WIDTH = 390;
export const DEVICE_HEIGHT = 450;
