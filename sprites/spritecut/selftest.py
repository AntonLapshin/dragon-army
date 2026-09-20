"""spritecut --self-test: build a synthetic sheet, cut it, verify the output.

Run it right after installing - it proves Pillow and numpy work, that the
detector finds every cell and that the writer produces identical, centred
PNGs (transparent with --remove-bg, background kept by default).
"""

from __future__ import annotations

import os
import tempfile
from typing import List, Tuple

import numpy as np
from PIL import Image, ImageDraw

from .imaging import load_rgba
from .pipeline import CutOptions, cut_sprites

SHAPES = ("circle", "square", "triangle", "ring", "cross", "diamond")


def make_sample_sheet(path: str, rows: int = 2, cols: int = 3, cell: int = 160) -> Tuple[int, int]:
    """Draw a white sheet holding rows x cols` anti-aliased icons."""
    width, height = cols * cell, rows * cell
    zoom = 4
    canvas = Image.new("RGBA", (width * zoom, height * zoom), (255, 255, 255, 255))
    draw = ImageDraw.Draw(canvas)
    for row in range(rows):
        for col in range(cols):
            index = row * cols + col
            shape = SHAPES[index % len(SHAPES)]
            cx = (col + 0.5) * cell * zoom
            cy = (row + 0.5) * cell * zoom
            radius = cell * zoom * 0.28
            colour = ((index * 47) % 200 + 20, (index * 91) % 180 + 30, (index * 61) % 200 + 40, 255)
            if shape == "circle":
                draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=colour)
            elif shape == "square":
                draw.rectangle([cx - radius, cy - radius * 0.8, cx + radius, cy + radius * 0.8], fill=colour)
            elif shape == "triangle":
                draw.polygon([(cx, cy - radius), (cx + radius, cy + radius), (cx - radius, cy + radius)],
                             fill=colour)
            elif shape == "ring":
                draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
                             outline=colour, width=int(radius * 0.35))
            elif shape == "cross":
                arm = radius * 0.34
                draw.rectangle([cx - arm, cy - radius, cx + arm, cy + radius], fill=colour)
                draw.rectangle([cx - radius, cy - arm, cx + radius, cy + arm], fill=colour)
            else:
                draw.polygon([(cx, cy - radius), (cx + radius, cy), (cx, cy + radius), (cx - radius, cy)],
                             fill=colour)
    canvas = canvas.resize((width, height), Image.LANCZOS)
    folder = os.path.dirname(os.path.abspath(path))
    if folder:
        os.makedirs(folder, exist_ok=True)
    canvas.save(path, format="PNG")
    return width, height


def centre_of(data: np.ndarray) -> Tuple[float, float, int]:
    alpha = data[..., 3]
    visible = np.flatnonzero(alpha > 16)
    if visible.size == 0:
        return -1.0, -1.0, 0
    height, width = alpha.shape
    ys, xs = np.divmod(visible, width)
    return float((xs.min() + xs.max()) / 2), float((ys.min() + ys.max()) / 2), int(visible.size)


def run_selftest(verbose: bool = True) -> int:
    """Return a process exit code: 0 means everything is fine."""
    failures: List[str] = []
    rows, cols, size = 2, 3, (48, 48)
    names = [f"{shape}-{index + 1}" for index, shape in enumerate(SHAPES[: rows * cols])]

    with tempfile.TemporaryDirectory(prefix="spritecut-selftest-") as tmp:
        sheet = os.path.join(tmp, "sheet.png")
        make_sample_sheet(sheet, rows, cols)

        # 1) grid mode (with background removal, as in the old default)
        gridded = cut_sprites(
            sheet, names,
            CutOptions(out_dir=os.path.join(tmp, "grid"), size=size, grid=(rows, cols), padding=2,
                       remove_bg=True),
        )
        if len(gridded) != rows * cols:
            failures.append(f"grid mode: expected {rows * cols} sprites, got {len(gridded)}")

        for result in gridded:
            if not os.path.isfile(result.path):
                failures.append(f"{result.name}: file was not written")
                continue
            data = load_rgba(result.path)
            if data.shape[:2] != (size[1], size[0]):
                failures.append(f"{result.name}: wrong output size {data.shape[1]}x{data.shape[0]}")
                continue
            corners = [int(data[0, 0, 3]), int(data[0, -1, 3]), int(data[-1, 0, 3]), int(data[-1, -1, 3])]
            if max(corners) != 0:
                failures.append(f"{result.name}: corners are not transparent {corners}")
            cx, cy, pixels = centre_of(data)
            if pixels == 0:
                failures.append(f"{result.name}: fully transparent")
            elif abs(cx - size[0] / 2) > 2 or abs(cy - size[1] / 2) > 2:
                failures.append(f"{result.name}: not centred (centre {cx:.1f},{cy:.1f})")

        # 2) auto detection must agree with the grid
        auto = cut_sprites(sheet, names, CutOptions(out_dir=os.path.join(tmp, "auto"), size=size, padding=2,
                                                    remove_bg=True))
        if len(auto) != rows * cols:
            failures.append(f"auto detection: found {len(auto)} icons, expected {rows * cols}")
        elif [result.name for result in auto] != names:
            failures.append(f"auto detection: wrong reading order {[r.name for r in auto]}")

        # 3) a transparent sheet must behave like a white one
        transparent_sheet = os.path.join(tmp, "transparent.png")
        with Image.open(sheet) as source:
            array = np.asarray(source.convert("RGBA")).copy()
        white = (array[..., :3] >= 244).all(axis=2)
        array[..., 3] = np.where(white, 0, array[..., 3]).astype(np.uint8)
        Image.fromarray(array, mode="RGBA").save(transparent_sheet, format="PNG")
        alpha_cut = cut_sprites(transparent_sheet, names, CutOptions(out_dir=os.path.join(tmp, "alpha"), size=size,
                                                                                 remove_bg=True))
        if len(alpha_cut) != rows * cols:
            failures.append(f"transparent sheet: found {len(alpha_cut)} icons, expected {rows * cols}")

        # 4) similar-size sheets: dust specks are ignored, grid boxes stay
        #    inside their own cells (no neighbour bleed-through)
        dusty = os.path.join(tmp, "dusty.png")
        cell_px = 100
        canvas = Image.new("RGBA", (cell_px * 2, cell_px * 2), (255, 255, 255, 255))
        dusty_draw = ImageDraw.Draw(canvas)
        for r in range(2):
            for c in range(2):
                dusty_draw.rectangle(
                    [c * cell_px + 10, r * cell_px + 10,
                     c * cell_px + 90, r * cell_px + 90],
                    fill=(200, 40, 40, 255),
                )
        dusty_draw.rectangle([98, 48, 101, 51], fill=(0, 0, 0, 255))  # border speck
        dusty_draw.rectangle([5, 105, 8, 108], fill=(0, 0, 0, 255))  # dust
        canvas.save(dusty, format="PNG")
        dusty_names = ["a", "b", "c", "d"]
        dusty_auto = cut_sprites(
            dusty, dusty_names,
            CutOptions(out_dir=os.path.join(tmp, "dusty-auto"), size=size,
                       padding=4, remove_bg=True),
        )
        if len(dusty_auto) != 4:
            failures.append(
                f"dusty sheet auto: found {len(dusty_auto)} icons, expected 4 "
                "(tiny fragments must be ignored)"
            )
        dusty_grid = cut_sprites(
            dusty, dusty_names,
            CutOptions(out_dir=os.path.join(tmp, "dusty-grid"), size=size,
                       grid=(2, 2), padding=4, remove_bg=True),
        )
        if len(dusty_grid) != 4:
            failures.append(f"dusty sheet grid: found {len(dusty_grid)} icons, expected 4")
        else:
            for result in dusty_grid:
                x0, y0, x1, y1 = result.box
                col = 0 if x0 < cell_px else 1
                row = 0 if y0 < cell_px else 1
                if not (x0 >= col * cell_px and y0 >= row * cell_px
                        and x1 <= (col + 1) * cell_px and y1 <= (row + 1) * cell_px):
                    failures.append(f"dusty sheet grid: {result.name} box {result.box} left its cell")
                    break

        # 5) default (keep-bg) must NOT replace white with transparency
        kept = cut_sprites(
            sheet, names,
            CutOptions(out_dir=os.path.join(tmp, "kept"), size=size, grid=(rows, cols), padding=2),
        )
        if len(kept) != rows * cols:
            failures.append(f"keep-bg: found {len(kept)} icons, expected {rows * cols}")
        else:
            for result in kept:
                data = load_rgba(result.path)
                rgb = data[..., :3].astype(int)
                alpha = data[..., 3].astype(int)
                white_opaque = ((rgb.min(axis=2) >= 244) & (alpha > 16)).sum()
                if white_opaque == 0:
                    failures.append(f"{result.name}: keep-bg should preserve white background pixels")
                    break

    if verbose:
        if failures:
            print("spritecut self-test: FAILED")
            for failure in failures:
                print(f"  - {failure}")
        else:
            print("spritecut self-test: OK")
            print(f"  {rows * cols} icons found in grid mode, auto mode and on a transparent sheet;")
            print(f"  every file is a {size[0]}x{size[1]} centred PNG with transparent corners (--remove-bg),")
            print("  and the default keep-bg mode preserves the white background.")
    return 1 if failures else 0