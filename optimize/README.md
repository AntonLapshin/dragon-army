# PNG Optimizer (`/optimize`)

CLI tool that compresses all `.png` images inside a folder, **recursively** by default.

- Engine: [sharp](https://sharp.pixelplumbing.com/) (libpng).
- Default strategy: palette quantization + max zlib compression + max encoding effort, metadata stripped.
- Safe by default: files whose "optimized" output is **not smaller** are kept as-is (`--skip-if-larger`).

## Install

```bash
npm install --prefix optimize
# or
npm install -C optimize
```

Requires Node >= 18.

## Usage

```bash
node optimize/optimize.mjs <inputDir> [options]

# most common
node optimize/optimize.mjs ./assets
node optimize/optimize.mjs ./raw --out-dir ./assets --verbose
node optimize/optimize.mjs ./assets --dry-run
node optimize/optimize.mjs --help
```

- `<inputDir>` is scanned for `*.png` (case-insensitive), subfolders included unless `--no-recursive` is given.
- Without `--out-dir`, files are **overwritten in place** (atomically via temp file + rename).
- With `--out-dir <path>`, the relative folder structure of `<inputDir>` is recreated under `<path>` and originals are untouched.
- Exit code is `0` on success, `1` if any file failed or arguments are invalid.

## Props / flags reference

| Prop | Flag(s) | Type | Default | Description |
|---|---|---|---|---|
| `inputDir` | `<inputDir>` (positional, required) | string (path) | — | Folder to scan for `.png` files. Must exist and be readable. Example: `./assets`. |
| `outDir` | `-o`, `--out-dir <path>` | string (path) \| null | `null` (in place) | Output folder. When set, mirrors the relative structure of `inputDir` and writes optimized copies there, leaving originals untouched. When omitted/`null`, input files are overwritten. If it resolves to the same path as `inputDir`, the tool warns and falls back to in-place mode. |
| `recursive` | `--recursive` / `--no-recursive` | boolean | `true` | When `true`, descends into all subfolders. Use `--no-recursive` to process only the top-level folder. |
| `quality` | `--quality <0-100>` | integer | `80` | Palette quantization quality. Lower = smaller file but more banding/posterization. Only takes effect when `palette` is on. Ignored in `--no-palette` mode. |
| `palette` | `--palette` / `--no-palette` | boolean | `true` | When `true`, quantizes to a palette (up to `colours` entries) — usually dramatically smaller for sprites, icons, pixel art. Use `--no-palette` for truecolor output (closer to lossless, bigger files, best gradients). |
| `colours` | `--colours <2-256>` (alias `--colors`) | integer | `256` | Maximum number of palette entries. Lower (e.g. `128`, `64`) = smaller files, more color banding. Only takes effect when `palette` is on. |
| `effort` | `--effort <1-10>` | integer | `10` | libpng encoding effort. Higher = smaller output but slower encoding. `10` is slowest/best compression; use `7`-`8` for faster runs with slightly bigger files. |
| `compressionLevel` | `--compression-level <0-9>` | integer | `9` | zlib compression level used by the PNG encoder. `9` = max compression (slowest), `0` = no compression (fastest, biggest). Usually leave at `9`. |
| `strip` | `--strip` / `--no-strip` | boolean | `true` | When `true`, strips metadata (EXIF, ICC, etc.) — sharp does this by default and it saves bytes. Use `--no-strip` to preserve metadata via `withMetadata()` (output will be slightly bigger). |
| `maxWidth` | `--max-width <px>` | integer \| null | `null` (no resize) | If set, images wider than this are downscaled to fit, preserving aspect ratio (`fit: inside`, never enlarged). Useful for watch/display targets, e.g. `--max-width 480`. |
| `maxHeight` | `--max-height <px>` | integer \| null | `null` (no resize) | If set, images taller than this are downscaled to fit, preserving aspect ratio. Combine with `maxWidth` to bound both dimensions. |
| `dryRun` | `--dry-run` | boolean | `false` | When `true`, runs the full pipeline and reports per-file + total savings but writes nothing. Use to preview savings or tune `quality`/`colours`. |
| `verbose` | `-v`, `--verbose` | boolean | `false` | When `true`, logs every file (`OK`/`SKIP` with sizes). When `false`, only failures are always logged, plus the final summary (dry-run logs every file regardless so you can see what would happen). |
| `skipIfLarger` | `--skip-if-larger` / `--no-skip-if-larger` | boolean | `true` | When `true`, keeps the original whenever the optimized output is `>=` the input (counts as `skipped`). Use `--no-skip-if-larger` to force writing the output even when it grew (e.g. when normalizing format). |
| `jobs` | `-j`, `--jobs <n>` | integer | `min(CPUs, 8)` | How many files to process in parallel. Higher = faster on multi-core, more memory. Range `1`-`64`. |
| `help` | `-h`, `--help` | boolean | `false` | Prints CLI help and exits. |

## Examples

```bash
# In-place optimize everything under ./assets (recursive)
node optimize/optimize.mjs ./assets

# Keep originals: write optimized copies to ./assets-opt, verbose logging
node optimize/optimize.mjs ./raw --out-dir ./assets-opt --verbose

# Preview savings without writing anything
node optimize/optimize.mjs ./assets --dry-run

# Smaller files, accept some quality loss (sprites/icons)
node optimize/optimize.mjs ./assets --quality 70 --colours 128

# Best quality (truecolor, no palette quantization)
node optimize/optimize.mjs ./assets --no-palette

# Top-level folder only, 4 parallel jobs
node optimize/optimize.mjs ./assets --no-recursive --jobs 4

# Bound image size for a small display (aspect ratio preserved, never enlarged)
node optimize/optimize.mjs ./assets --max-width 480 --max-height 480

# Keep metadata (default strips it)
node optimize/optimize.mjs ./assets --no-strip
```

## How it works

1. Collects `*.png` under `<inputDir>` (`fs.readdir` walk; symlinks skipped; sorted for stable output).
2. For each file (up to `jobs` in parallel):
   - `sharp(file)` → optional `resize({ fit: 'inside', withoutEnlargement: true })` when `maxWidth`/`maxHeight` is set → `.png({ compressionLevel, palette, quality, colours, effort })` → `toBuffer()`.
   - If `skipIfLarger` and output `>=` input → `skipped`, original kept.
   - Otherwise writes to `--out-dir/<relative path>` (creating folders) or atomically overwrites the input (`file.opt-tmp` + `rename`), unless `--dry-run`.
3. Prints a summary: counts (optimized / skipped / failed) and total `before → after`, bytes saved, and `%` saved.

## Tips

- Run `--dry-run` first when tuning `quality`/`colours` to find the smallest acceptable setting.
- Sprite/icon folders usually tolerate `--quality 60-75 --colours 64-128`; gradients/backgrounds may need `--quality 85-90 --colours 256` or `--no-palette`.
- Prefer `--out-dir` when you want to keep the originals (e.g. `raw/` → `assets/` workflow).
