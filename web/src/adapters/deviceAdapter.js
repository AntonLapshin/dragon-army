// Web-preview stand-in for utils/deviceAdapter.js (swapped in by the
// zepp-web-runner Vite plugin's adapterMappings — see web/vite.config.mjs).
//
// Same shape as the watch implementation:
//   deviceAdapter.getInfo() -> { width, height, screenShape, deviceSource }
//
// The preview defaults to the Amazfit Bip 6 rect profile. The device switcher
// in the debug panel calls setDeviceOverride() to preview the round layout;
// clearDeviceOverride() (or a page reload) restores the default.

let _override = null;

export const BIP6_INFO = {
  width: 390,
  height: 450,
  screenShape: 'square',
  deviceSource: 0,
};

export const ROUND480_INFO = {
  width: 480,
  height: 480,
  screenShape: 'round',
  deviceSource: 0,
};

export function setDeviceOverride(info) {
  _override = info ? { ...info } : null;
}

export function clearDeviceOverride() {
  _override = null;
}

export const deviceAdapter = {
  getInfo() {
    if (_override) return { ..._override };
    if (typeof window !== 'undefined' && window.__DRAGON_DEVICE) {
      return { ...window.__DRAGON_DEVICE };
    }
    return { ...BIP6_INFO };
  },
};
