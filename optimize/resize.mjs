#!/usr/bin/env node
/**
 * Scale pre-cut assets to their exact on-device widget sizes.
 *
 * Reads assets.json (repo root) which maps each source PNG (relative to
 * assets/) to the list of WxH dimensions it is displayed with, e.g.:
 *   "dragons/songwing.png": ["60x60", "240x240"]
 *
 * For each entry it produces one file per dimension in the same folder:
 *   assets/dragons/songwing.png
 *     -> assets/dragons/songwing_60x60.png
 *     -> assets/dragons/songwing_240x240.png
 * then deletes the original (e.g. assets/dragons/songwing.png).
 *
 * Entries with an empty dimension list (unused assets) are just deleted.
 * Files not listed in assets.json (e.g. icon.png) are left untouched.
 *
 * This runs BEFORE optimize (see Makefile `data` target) so `optimize`
 * compresses the final exact-size images. Zepp OS draws IMG 1:1 (no runtime
 * scaling), so widgets must reference these pre-scaled files at exact w/h.
 *
 * Usage:
 *   node optimize/resize.mjs [assetsDir [manifestPath]]
 *   node optimize/resize.mjs assets assets.json
 */

import fs from 'node:fs/promises';
import path from 'node:path';

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    console.error(
      'Missing dependency "sharp". Install it first:\n' +
        '  npm install --prefix optimize   # or: npm install -C optimize\n' +
        'Then re-run the tool.',
    );
    process.exit(1);
  }
}

function parseDim(dim) {
  const m = /^(\d+)x(\d+)$/.exec(dim);
  if (!m) throw new Error(`Invalid dimension ${JSON.stringify(dim)} (expected WxH)`);
  return { w: Number(m[1]), h: Number(m[2]) };
}

async function main() {
  const assetsDir = path.resolve(process.argv[2] ?? 'assets');
  const manifestPath = path.resolve(process.argv[3] ?? 'assets.json');

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`Error: cannot read manifest ${manifestPath}: ${err.message}`);
    process.exit(1);
  }

  const sharp = await loadSharp();
  const entries = Object.entries(manifest);
  let scaled = 0;
  let deleted = 0;
  let missing = 0;

  for (const [rel, dims] of entries) {
    const src = path.join(assetsDir, rel);
    let exists = true;
    try {
      await fs.access(src);
    } catch {
      exists = false;
    }
    if (!exists) {
      console.warn(`  MISSING ${rel} (skipped)`);
      missing += 1;
      continue;
    }
    if (!Array.isArray(dims) || dims.length === 0) {
      await fs.unlink(src);
      console.log(`  DELETE  ${rel} (unused)`);
      deleted += 1;
      continue;
    }
    const ext = path.extname(src);
    const base = src.slice(0, -ext.length);
    for (const dim of dims) {
      const { w, h } = parseDim(dim);
      const dest = `${base}_${dim}${ext}`;
      await sharp(src)
        .resize({ width: w, height: h, fit: 'fill' })
        .png()
        .toFile(dest);
      scaled += 1;
      console.log(`  SCALE   ${rel} -> ${path.basename(dest)} (${dim})`);
    }
    await fs.unlink(src);
    deleted += 1;
  }

  console.log(`\nDone: ${scaled} scaled file(s), ${deleted} original(s) deleted, ${missing} missing.`);
}

await main();
