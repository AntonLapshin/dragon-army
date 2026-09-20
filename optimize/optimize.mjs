#!/usr/bin/env node
/**
 * PNG optimizer — recursively compresses .png files in a folder.
 *
 * Usage:
 *   node optimize.mjs <inputDir> [options]
 *   node optimize.mjs ./assets --out-dir ./assets-opt --quality 80 --verbose
 *
 * Engine: sharp (libpng). See README.md for the description of each prop/flag.
 */

import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

const DEFAULTS = {
  outDir: null, // null = overwrite input files in place
  recursive: true,
  quality: 80, // 0-100, applies when palette:true
  palette: true, // quantize to palette (much smaller for sprites/icons)
  colours: 256, // 2-256, applies when palette:true
  effort: 10, // 1-10, higher = smaller + slower
  compressionLevel: 9, // 0-9, zlib level for libpng
  strip: true, // strip metadata (sharp strips by default; --no-strip keeps it)
  maxWidth: null, // downscale images wider than this (keeps aspect ratio)
  maxHeight: null, // downscale images taller than this (keeps aspect ratio)
  dryRun: false, // report savings without writing files
  verbose: false, // per-file log lines
  skipIfLarger: true, // keep original when optimized output is >= original
  jobs: Math.min(Math.max(os.cpus()?.length ?? 4, 1), 8),
};

function printHelp() {
  console.log(`PNG optimizer — compress .png files in a folder (recursive by default).

USAGE
  node optimize.mjs <inputDir> [options]

ARGS
  inputDir                  Folder to scan for .png files (required).

OPTIONS
  -o, --out-dir <path>      Output folder. Preserves relative structure.
                            Default: overwrite files in place.
      --recursive           Scan subfolders (default: on).
      --no-recursive        Only scan the top-level folder.
      --quality <0-100>     Palette quality. Lower = smaller + more banding.
                            Only applies when --palette is on. Default: 80.
      --palette             Quantize to a palette (default: on).
      --no-palette          Truecolor output (lossless-ish, bigger, best quality).
      --colours <2-256>     Max palette colours (alias: --colors).
                            Only applies when --palette is on. Default: 256.
      --effort <1-10>       libpng encoding effort. Higher = smaller + slower.
                            Default: 10.
      --compression-level <0-9>
                            zlib compression level. Default: 9.
      --strip               Strip metadata (default: on).
      --no-strip            Keep metadata (EXIF/ICC/etc.).
      --max-width <px>      Downscale images wider than this px (aspect kept).
      --max-height <px>     Downscale images taller than this px (aspect kept).
      --dry-run             Report savings without writing any file.
  -v, --verbose             Log every file (default: summary + skipped/failed only).
      --skip-if-larger      Keep original when output is >= input (default: on).
      --no-skip-if-larger   Always write output, even if it got bigger.
  -j, --jobs <n>            Parallel files (default: min(CPUs, 8)).
  -h, --help                Show this help.

EXAMPLES
  node optimize.mjs ./assets
  node optimize.mjs ./raw --out-dir ./assets --verbose
  node optimize.mjs ./assets --dry-run --quality 70 --colours 128
  node optimize.mjs ./assets --no-palette --effort 10 --compression-level 9
  node optimize.mjs ./assets --max-width 480 --max-height 480
`);
}

function parseIntOption(value, flag, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${flag} must be an integer in ${min}-${max} (got: ${JSON.stringify(value)})`);
  }
  return n;
}

export function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  let inputDir = null;

  const args = [...argv];
  while (args.length > 0) {
    const a = args.shift();
    const eq = a.indexOf('=');
    const key = eq === -1 ? a : a.slice(0, eq);
    const eqVal = eq === -1 ? null : a.slice(eq + 1);
    const next = () => {
      if (eqVal !== null) return eqVal;
      const v = args.shift();
      if (v === undefined) throw new Error(`${key} expects a value`);
      return v;
    };

    switch (key) {
      case '-h':
      case '--help':
        opts.help = true;
        break;
      case '-o':
      case '--out-dir':
      case '--outDir':
        opts.outDir = next();
        break;
      case '--recursive':
        opts.recursive = true;
        break;
      case '--no-recursive':
        opts.recursive = false;
        break;
      case '--quality':
        opts.quality = parseIntOption(next(), '--quality', 0, 100);
        break;
      case '--palette':
        opts.palette = true;
        break;
      case '--no-palette':
        opts.palette = false;
        break;
      case '--colours':
      case '--colors':
        opts.colours = parseIntOption(next(), '--colours', 2, 256);
        break;
      case '--effort':
        opts.effort = parseIntOption(next(), '--effort', 1, 10);
        break;
      case '--compression-level':
      case '--compressionLevel':
        opts.compressionLevel = parseIntOption(next(), '--compression-level', 0, 9);
        break;
      case '--strip':
        opts.strip = true;
        break;
      case '--no-strip':
        opts.strip = false;
        break;
      case '--max-width':
      case '--maxWidth':
        opts.maxWidth = parseIntOption(next(), '--max-width', 1, 100000);
        break;
      case '--max-height':
      case '--maxHeight':
        opts.maxHeight = parseIntOption(next(), '--max-height', 1, 100000);
        break;
      case '--dry-run':
      case '--dryRun':
        opts.dryRun = true;
        break;
      case '-v':
      case '--verbose':
        opts.verbose = true;
        break;
      case '--skip-if-larger':
        opts.skipIfLarger = true;
        break;
      case '--no-skip-if-larger':
        opts.skipIfLarger = false;
        break;
      case '-j':
      case '--jobs':
        opts.jobs = parseIntOption(next(), '--jobs', 1, 64);
        break;
      default:
        if (key.startsWith('-')) {
          throw new Error(`Unknown option: ${a} (use --help)`);
        }
        if (inputDir !== null) {
          throw new Error(`Unexpected extra argument: ${a} (only one <inputDir> is supported)`);
        }
        inputDir = a;
    }
  }

  opts.inputDir = inputDir;
  return opts;
}

/** Recursively (or not) collect *.png files under dir. Returns sorted absolute paths. */
export async function collectPngFiles(dir, recursive = true) {
  const out = [];
  async function walk(current) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(current, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (recursive) await walk(full);
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.png')) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  out.sort();
  return out;
}

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

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function formatPct(before, after) {
  if (!before) return '0%';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
}

/** Optimize one file. Returns a result record; never throws (errors become {status:'failed'}). */
export async function optimizeFile(sharp, file, opts, inputDirAbs) {
  let before;
  try {
    before = (await fs.stat(file)).size;
  } catch (err) {
    return { file, before: 0, after: 0, status: 'failed', error: `stat failed: ${err.message}` };
  }

  try {
    let pipeline = sharp(file, { failOn: 'none' });
    if (opts.maxWidth != null || opts.maxHeight != null) {
      pipeline = pipeline.resize({
        width: opts.maxWidth ?? undefined,
        height: opts.maxHeight ?? undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    pipeline = pipeline.png({
      compressionLevel: opts.compressionLevel,
      palette: opts.palette,
      // quality/colours only take effect in palette mode; passing them
      // otherwise is harmless but we keep them for predictable config.
      quality: opts.quality,
      colours: opts.colours,
      effort: opts.effort,
    });
    if (opts.strip === false) {
      pipeline = pipeline.withMetadata();
    }
    const buf = await pipeline.toBuffer();
    const after = buf.length;

    if (opts.skipIfLarger && after >= before) {
      return { file, before, after, status: 'skipped', reason: 'output not smaller' };
    }

    if (!opts.dryRun) {
      if (opts.outDir) {
        const rel = path.relative(inputDirAbs, file);
        const dest = path.join(path.resolve(opts.outDir), rel);
        await fs.mkdir(path.dirname(dest), { recursive: true });
        await fs.writeFile(dest, buf);
      } else {
        // Atomic in-place overwrite via temp file + rename.
        const tmp = `${file}.opt-tmp`;
        await fs.writeFile(tmp, buf);
        await fs.rename(tmp, file);
      }
    }
    return { file, before, after, status: opts.dryRun ? 'dry-run' : 'optimized' };
  } catch (err) {
    return { file, before, after: before, status: 'failed', error: err.message };
  }
}

/** Simple concurrency pool over items with worker fn. */
async function mapPool(items, jobs, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(jobs, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function run(opts) {
  if (!opts.inputDir) {
    printHelp();
    throw new Error('Missing required <inputDir> (use --help for usage).');
  }
  const inputDirAbs = path.resolve(opts.inputDir);
  let st;
  try {
    st = await fs.stat(inputDirAbs);
  } catch {
    throw new Error(`Input folder not found: ${opts.inputDir}`);
  }
  if (!st.isDirectory()) {
    throw new Error(`Input is not a directory: ${opts.inputDir}`);
  }
  if (opts.outDir) {
    const outAbs = path.resolve(opts.outDir);
    if (outAbs === inputDirAbs) {
      console.warn('Warning: --out-dir equals <inputDir>; files will be overwritten in place.');
      opts.outDir = null;
    }
  }

  const sharp = await loadSharp();
  const files = await collectPngFiles(inputDirAbs, opts.recursive);
  if (files.length === 0) {
    console.log(`No .png files found in ${inputDirAbs} (recursive=${opts.recursive}). Nothing to do.`);
    return { files: [], totals: { before: 0, after: 0 } };
  }

  console.log(
    `Optimizing ${files.length} PNG file(s) in ${inputDirAbs}` +
      (opts.outDir ? ` -> ${path.resolve(opts.outDir)}` : ' (in place)') +
      (opts.dryRun ? ' [dry-run]' : ''),
  );

  const results = await mapPool(files, opts.jobs, (f) => optimizeFile(sharp, f, opts, inputDirAbs));

  let totalBefore = 0;
  let totalAfter = 0;
  let nOpt = 0;
  let nSkip = 0;
  let nFail = 0;
  for (const r of results) {
    totalBefore += r.before;
    totalAfter += r.status === 'failed' ? r.before : r.after;
    if (r.status === 'optimized' || r.status === 'dry-run') nOpt++;
    else if (r.status === 'skipped') nSkip++;
    else nFail++;
    const rel = path.relative(inputDirAbs, r.file);
    if (r.status === 'failed') {
      console.error(`  FAIL    ${rel} — ${r.error}`);
    } else if (r.status === 'skipped') {
      if (opts.verbose) console.log(`  SKIP    ${rel} (${formatBytes(r.before)}, output not smaller)`);
    } else if (opts.verbose || r.status === 'dry-run') {
      console.log(
        `  ${opts.dryRun ? 'WOULD' : 'OK'}      ${rel}  ${formatBytes(r.before)} -> ${formatBytes(r.after)}  (-${formatPct(r.before, r.after)})`,
      );
    }
  }

  const saved = totalBefore - totalAfter;
  console.log(
    `\nDone: ${nOpt} optimized${opts.dryRun ? ' (dry-run, nothing written)' : ''}, ${nSkip} skipped, ${nFail} failed. ` +
      `Total ${formatBytes(totalBefore)} -> ${formatBytes(totalAfter)} ` +
      `(saved ${formatBytes(Math.max(saved, 0))}, -${formatPct(totalBefore, totalAfter)}).`,
  );
  if (nFail > 0) process.exitCode = 1;
  return { files: results, totals: { before: totalBefore, after: totalAfter } };
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    printHelp();
    process.exit(1);
  }
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  // Early check so `fs.access` gives a clean error for missing sharp-less runs too.
  try {
    await fs.access(path.resolve(opts.inputDir ?? ''), fsConstants.R_OK);
  } catch {
    console.error(`Error: Input folder not found or unreadable: ${opts.inputDir}`);
    process.exit(1);
  }
  try {
    await run(opts);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
