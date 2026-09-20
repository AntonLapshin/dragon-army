#!/usr/bin/env node
/**
 * Round the corners of pre-scaled overlay pills.
 *
 * Zepp OS ignores FILL_RECT alpha, so text pills / modal dimming use
 * pre-baked `assets/misc/overlay_WxH.png` images (see assets.json +
 * page/index.js `overlaySrc()`). A plain resized rectangle has sharp
 * corners; this tool re-masks every overlay variant with a rounded rect
 * so pills look prettier on-device.
 *
 * Reads the dimension list from assets.json (`misc/overlay.png`) and
 * rewrites each `assets/misc/overlay_WxH.png` in place:
 *   radius = min(floor(min(w, h) / 2), 16)
 * (stadium pills for h<=32 text rows, softly rounded squares / dim layers
 * for larger sizes). Corners become transparent.
 *
 * Missing variants are rebuilt from raw/overlay.png (or the 390x450
 * variant as fallback, the shade is flat so any larger source is exact)
 * before rounding, so adding a new dimension to assets.json only needs:
 *   make scale
 *
 * Usage:
 *   node optimize/round-overlay.mjs [assetsDir [manifestPath [--radius N]]]
 *   node optimize/round-overlay.mjs assets assets.json
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

function radiusFor(w, h, override) {
  if (override !== undefined) return override;
  return Math.min(Math.floor(Math.min(w, h) / 2), 8);
}

function roundedMaskSvg(w, h, r) {
  const rr = Math.max(0, Math.min(r, Math.floor(Math.min(w, h) / 2)));
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">`
    + `<rect width="${w}" height="${h}" rx="${rr}" ry="${rr}" fill="#fff"/>`
    + `</svg>`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  let radiusOverride;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--radius') {
      radiusOverride = Number(args[++i]);
      if (!Number.isInteger(radiusOverride) || radiusOverride < 0) {
        console.error('Error: --radius must be a non-negative integer');
        process.exit(1);
      }
    } else {
      positional.push(args[i]);
    }
  }
  const assetsDir = path.resolve(positional[0] ?? 'assets');
  const manifestPath = path.resolve(positional[1] ?? 'assets.json');

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (err) {
    console.error(`Error: cannot read manifest ${manifestPath}: ${err.message}`);
    process.exit(1);
  }
  const dims = manifest['misc/overlay.png'];
  if (!Array.isArray(dims)) {
    console.error('Error: manifest has no "misc/overlay.png" entry');
    process.exit(1);
  }

  const sharp = await loadSharp();
  const miscDir = path.join(assetsDir, 'misc');
  await fs.mkdir(miscDir, { recursive: true });

  let rounded = 0;
  let rebuilt = 0;
  for (const dim of dims) {
    const { w, h } = parseDim(dim);
    const dest = path.join(miscDir, `overlay_${dim}.png`);
    let exists = true;
    try {
      await fs.access(dest);
    } catch {
      exists = false;
    }
    if (!exists) {
      // Rebuild a missing variant from the raw source (flat shade, so any
      // resize is exact) before rounding.
      const rawCandidates = [
        path.resolve(path.dirname(manifestPath), 'raw/overlay.png'),
        path.join(miscDir, 'overlay_390x450.png'),
      ];
      let src = null;
      for (const c of rawCandidates) {
        try {
          await fs.access(c);
          src = c;
          break;
        } catch {}
      }
      if (!src) {
        console.warn(`  MISSING ${dim} (no source to rebuild, skipped)`);
        continue;
      }
      await sharp(src).resize({ width: w, height: h, fit: 'fill' }).png().toFile(dest);
      rebuilt += 1;
      console.log(`  REBUILD misc/overlay_${dim}.png from ${path.basename(src)}`);
    }
    const r = radiusFor(w, h, radiusOverride);
    const tmp = `${dest}.round-tmp`;
    await sharp(dest)
      .composite([{ input: roundedMaskSvg(w, h, r), blend: 'dest-in' }])
      .png()
      .toFile(tmp);
    await fs.rename(tmp, dest);
    rounded += 1;
    console.log(`  ROUND   misc/overlay_${dim}.png (${dim} r=${r})`);
  }

  console.log(`\nDone: ${rounded} overlay(s) rounded, ${rebuilt} rebuilt.`);
}

await main();
