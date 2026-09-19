import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createZeppOsPlugin } from 'zepp-web-runner/plugin';

const root = path.resolve(__dirname, '..');
const webSrc = path.resolve(__dirname, 'src');

export default defineConfig({
  plugins: [
    react(),
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
