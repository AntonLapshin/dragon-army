import { getDeviceInfo } from '@zos/device';

// Device-info adapter (watch implementation).
//
// The web preview cannot import '@zos/device', so it swaps this module out
// via vite.config.mjs adapterMappings (see web/src/adapters/deviceAdapter.js).
// Both implementations expose the same shape:
//
//   deviceAdapter.getInfo() -> { width, height, screenShape, deviceSource }
//
// Fields mirror @zos/device getDeviceInfo(); on any failure we fall back to
// the Amazfit Bip 6 rect profile (390x450) so the UI always has sane numbers.
// Shape interpretation (square vs round) lives in page/layouts.js — this
// module only reports raw device numbers, never layout decisions.

export const deviceAdapter = {
  getInfo() {
    try {
      const info = getDeviceInfo();
      if (!info || typeof info !== 'object') throw new Error('no device info');
      return {
        width: Number(info.width) || 390,
        height: Number(info.height) || 450,
        screenShape: info.screenShape,
        deviceSource: info.deviceSource,
      };
    } catch (_) {
      return { width: 390, height: 450, screenShape: undefined, deviceSource: 0 };
    }
  },
};
