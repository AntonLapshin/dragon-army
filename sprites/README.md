# spritecut – Cut a sprite sheet into individual icons

A command‑line utility (wrapped in `sprites/spritecut/`) that extracts, resizes and centres every icon from a grid or auto‑detected sprite sheet into uniformly‑sized PNGs. The sheet background is kept by default; pass `--remove-bg` to replace white with transparency.

## Quick start

```bash
# Basic usage – 4×4 sheet, 64 px output icons, named left‑to‑right / top‑bottom
python -m spritecut.cli raw/ui-icons.png -s 64x64 \
    -n "egg" "coin" "energy" "sell" \
    "victory" "loss" "_danger" "training" \
    "close" "dice" "home" "_coin" \
    "_shop" "monster" "_training" "_dice" -o assets
```

Or use the wrapper script (no global install needed):

```bash
./spritecut.sh raw/ui-icons.png -s 64x64 \
    -n "egg coin energy sell victory loss _danger training close dice home _coin _shop monster _training _dice" -o assets -g 4x4
```

The command above produces 16 PNGs inside `assets/` (each 64 × 64 px, sheet background kept; add `--remove-bg` for a transparent background).

---

## Installation (optional)

If you want `spritecut` available globally:

```bash
# Using uv (recommended on Omarchy/Arch)
uv tool install .

# Using pipx
pipx install .

# Using pip (user install)
pip install --user .

# Editable install for development
uv tool install --editable .    # or: pip install -e .
```

Then you can run `spritecut` directly instead of `python -m spritecut.cli`.

---

## Running without installation

From the `sprites/` directory:

```bash
# Using the module directly
python -m spritecut.cli [args...]

# Using the wrapper script (chmod +x first if needed)
./spritecut.sh [args...]
```

From anywhere with PYTHONPATH:

```bash
PYTHONPATH=/path/to/sprites python -m spritecut.cli [args...]
```

---

## Command‑line reference

| Flag | Short | Description | Example |
|------|-------|-------------|---------|
| **input** | (positional) | Path to the sprite‑sheet image (PNG/JPG/WEBP). | `raw/ui-icons.png` |
| `--size` | `-s` | Output size for every sprite, `WxH` (e.g. `64x64`; one number = square). | `-s 128x96` |
| `--names` | `-n` | Icon names, space or comma separated; repeat the flag for more than ~6 names. | `-n "play" "pause" "stop"` |
| `--names-file` | `-N` | File containing one icon name per line (`#` starts a comment). | `-N names.txt` |
| `--out` | `-o` | Directory to write the extracted PNGs (default: `sprites`). | `-o assets` |
| `--grid` | `-g` | Known layout as `ROWSxCOLS`; forces that grid and skips auto‑detection. | `-g 4x4` |
| `--padding` | `-p` | Extra source pixels kept around each icon before scaling (default 4; always clipped so boxes never overlap / leave their grid cell). | `--padding 8` |
| `--min-relative-area` | – | Ignore blobs smaller than this fraction of the median icon area (default 0.15; `0` disables). | `--min-relative-area 0.25` |
| `--merge-max-factor` | – | Never merge into a box wider/taller than this multiple of the typical icon (default 1.6; `0` disables the guard). | `--merge-max-factor 2` |
| `--no-split-merged` | – | Do not split boxes that swallowed several icons back apart. | `--no-split-merged` |
| `--margin` | – | Empty border around the art inside the canvas, fraction of output size (0‑0.45, default 0.05). | `--margin 0.1` |
| `--fit` | – | How the art fits the output size: `contain` (keeps aspect ratio, default) or `stretch` (fills exactly). | `--fit stretch` |
| `--valign` / `--vertical-align` | – | Vertical placement inside the canvas: `top` \| `center` (default) \| `bottom`. `bottom` pins the art to the bottom margin so legs stay at the same distance from the bottom. | `--valign bottom` |
| `--resample` | – | Resampling filter when scaling: `nearest|box|bilinear|hamming|bicubic|lanczos` (default `lanczos`). | `--resample bilinear` |
| `--out-bg` | – | Background of written files: `transparent` (default), `#RRGGBB` or `white`. | `--out-bg '#101014'` |
| `--template` | – | File‑name pattern; `{name}` and `{index}` are substituted (default `{name}.png`). | `--template "{index}_{name}.png"` |
| `--start-index` | – | First value for `{index}` in the template (default 1). | `--start-index 0` |
| `--no-clobber` | – | Error if an output file already exists (overwrite by default). | `--no-clobber` |
| `--overwrite` / `--force` | – | Force replacement of existing files (default). | `--overwrite` |
| `--remove-bg` | – | Replace the sheet background with transparency (off by default; white is kept as‑is). | `--remove-bg` |
| `--keep-bg` / `--no-remove-bg` | – | Keep the sheet background as‑is (default). | `--keep-bg` |
| `--white-threshold` | – | Channel value (0‑255) above which a pixel is considered white background (default 244; only with `--remove-bg`). | `--white-threshold 200` |
| `--alpha-threshold` | – | Alpha value (0‑255) below which a pixel is considered transparent (default 8). | `--alpha-threshold 16` |
| `--feather` | – | Softness of the cut edge, `0` = hard cut (default 8; only with `--remove-bg`). | `--feather 0` |
| `--bg-color` | – | Treat this colour as the sheet background instead of white (`#RRGGBB`; implies `--remove-bg`). | `--bg-color '#101014'` |
| `--color-tolerance` | – | Tolerance for `--bg-color` and near‑white greys (0‑255, default 24). | `--color-tolerance 30` |
| `--no-defringe` | – | Keep the whitish halo on semi‑transparent edge pixels (default off; only with `--remove-bg`). | `--no-defringe` |
| `--manifest` | – | Path to write a JSON manifest describing every sprite. | `--manifest sprites/manifest.json` |
| `--json` | – | Print the result as JSON instead of a table. | `--json` |
| `--preview` | – | Write a debug sheet with detected boxes and reading order (optional path). | `--preview debug.png` |
| `--dry-run` | – | Detect and report sprites but do **not** write any files. | `--dry-run` |
| `-v` / `--verbose` | – | Chatty progress output on stderr. | `-v` |
| `-q` / `--quiet` | – | Suppress all output except errors. | `-q` |
| `--self-test` | – | Generate a sample sheet, cut it, verify the output and exit. | `--self-test` |

### Name‑resolution order

1. `-n` / `-N` names are matched 1‑to‑1 with the detected sprites (left‑to‑right / top‑to‑bottom).
2. If fewer names than sprites, the tool aborts with an error – increase `-n` or use `--auto-name`.
3. `--auto-name` generates `icon-01.png`, `icon-02.png`, … for any leftover sprites.

### Typical workflows

| Goal | Command |
|------|---------|
| **Cut a known 4×4 grid, 64 px icons** | `python -m spritecut.cli sheet.png -s 64x64 -g 4x4 -N names.txt -o out/` |
| **Auto‑detect icons on a dark background** | `python -m spritecut.cli sheet.png -s 48 --remove-bg --bg-color '#101014' --color-tolerance 30 -o out/` |
| **Cut with a transparent background** | `python -m spritecut.cli sheet.png -s 64x64 -g 4x4 -N names.txt --remove-bg -o out/` |
| **Export with a custom filename pattern** | `python -m spritecut.cli sheet.png -s 128 -n "a" "b" "c" --template "{index}-{name}.png" -o out/` |
| **Only inspect, don't write files** | `python -m spritecut.cli sheet.png -s 64 -n "icon1" "icon2" --dry-run -v` |
| **Generate a manifest for build scripts** | `python -m spritecut.cli sheet.png -s 64 -n "a" "b" --manifest manifest.json -q` |

---

## Tips

* **Grid vs auto‑detect** – If you know the exact rows × columns, use `-g`; it's faster and avoids mis‑detecting merged icons. Grid mode confines every sprite to its own cell: padding never bleeds into a neighbour, border-touching slivers from adjacent art are discarded, and each cell yields at most one box.
* **Background colour** – Detection always treats white as background; for dark sheets set `--bg-color` to the sheet's background hue (implies `--remove-bg`) and adjust `--color-tolerance` until all art is kept.
* **Merged parts** – Use `--merge-distance` (in pixels) to join blobs that belong to a single multi‑part icon. Merging is size-aware (`--merge-max-factor`, default 1.6): two full-size neighbours are never fused. Oversized boxes are split back apart automatically (disable with `--no-split-merged`).
* **Tiny fragments** – Icons on a sheet share one size, so blobs smaller than `--min-relative-area` (default 0.15) times the median icon area are ignored as dust/specks, in both grid and auto modes.
* **Preview** – `--preview` writes a PNG with green boxes and reading‑order numbers; handy for debugging detection.

---

*Built from the `sprites/spritecut/` pipeline. See the source files `cli.py`, `pipeline.py`, `imaging.py`, `labeling.py` for full implementation details.*