import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { createZeppOsPlugin } from 'zepp-web-runner/plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const webSrc = path.resolve(__dirname, 'src');

/**
 * zepp-web-runner keeps widget state in module scope (`let _widgets` in
 * shims/hmUI.js). In Vite dev that file is served as TWO distinct ES modules:
 * page/index.js (source importer) gets `/node_modules/.../hmUI.js` while
 * WatchPage.jsx (itself in node_modules) gets `/node_modules/.../hmUI.js?v=<hash>`.
 * Distinct URLs = distinct module instances = page pushes widgets into one
 * array while WatchPage collects from the other (always empty -> black screen).
 * Patch the shim to keep its state on globalThis so every instance shares it.
 */
function hmUISingleton() {
  return {
    name: 'hmui-singleton',
    transform(code, id) {
      if (!id.includes('zepp-web-runner/shims/hmUI')) return null;
      let out = code
        .replace('let _widgets = [];', 'const __G = globalThis; __G.__zepp_hmUI_widgets ??= [];')
        .replace('let _nextId = 0;', '__G.__zepp_hmUI_nextId ??= 0;')
        .replace(/\b_widgets\b/g, '__G.__zepp_hmUI_widgets')
        .replace(/\b_nextId\b/g, '__G.__zepp_hmUI_nextId');
      return { code: out, map: null };
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    hmUISingleton(),
    createZeppOsPlugin({
      root,
      adapterMappings: {
        [path.resolve(root, 'utils/storageAdapter.js')]: `export { storageAdapter } from '${path.resolve(webSrc, 'adapters/storageAdapter.js')}';`,
        [path.resolve(root, 'utils/sensorAdapter.js')]: `export { stepsAdapter, sensorAdapter } from '${path.resolve(webSrc, 'adapters/stepsAdapter.js')}';`,
        [path.resolve(root, 'utils/timeAdapter.js')]: `export { timeAdapter } from '${path.resolve(webSrc, 'adapters/timeAdapter.js')}';`,
      },
    }),
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'shared'),
    },
  },
});
