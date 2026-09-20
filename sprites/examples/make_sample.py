from future import annotations

import argparse
import math
import os
from typing import List, Sequence, Tuple

from PIL import Image, ImageDraw

NAMES: Sequence[str] = (
    "play", "pause", "stop", "record",
    "heart", "star", "bolt", "gear",
    "home", "search", "bell", "mail",
    "cloud", "lock", "camera", "trash",
)

def _star(cx: float, cy: float, radius: float, points: int = 5) -> List[Tuple[float, float]]:
    coords: List[Tuple[float, float]] = []
    for i in range(points * 2):
        angle = -math.pi / 2 + i * math.pi / points
        r = radius if i % 2 == 0 else radius * 0.45
        coords.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return coords

def draw_icon(draw: ImageDraw.ImageDraw, shape: str, cx: float, cy: float, r: float,
              colour: Tuple[int, int, int]) -> None:
    """Draw one icon centred on (cx, cy) with a nominal radius r."""
    if shape == "play":
        draw.polygon([(cx - r * 0.7, cy - r), (cx - r * 0.7, cy + r), (cx + r, cy)], fill=colour)
    elif shape == "pause":
        draw.rectangle([cx - r, cy - r, cx - r * 0.2, cy + r], fill=colour)
        draw.rectangle([cx + r * 0.2, cy - r, cx + r, cy + r], fill=colour)
    elif shape == "stop":
        draw.rectangle([cx - r * 0.85, cy - r * 0.85, cx + r * 0.85, cy + r * 0.85], fill=colour)
    elif shape == "record":
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)
    elif shape == "heart":
        draw.ellipse([cx - r, cy - r * 0.85, cx, cy + r * 0.15], fill=colour)
        draw.ellipse([cx, cy - r * 0.85, cx + r, cy + r * 0.15], fill=colour)
        draw.polygon([(cx - r * 0.95, cy - r * 0.05), (cx + r * 0.95, cy - r * 0.05), (cx, cy + r)],
                     fill=colour)
    elif shape == "star":
        draw.polygon(_star(cx, cy, r), fill=colour)
    elif shape == "bolt":
        draw.polygon([(cx + r * 0.25, cy - r), (cx - r * 0.65, cy + r * 0.15), (cx - r * 0.05, cy + r * 0.15),
                      (cx - r * 0.25, cy + r), (cx + r * 0.65, cy - r * 0.15), (cx + r * 0.05, cy - r * 0.15)],
                     fill=colour)
    elif shape == "gear":
        teeth = 8
        for i in range(teeth):
            angle = i * 2 * math.pi / teeth
            tx, ty = cx + math.cos(angle) * r, cy + math.sin(angle) * r
            half = r * 0.26
            draw.rectangle([tx - half, ty - half, tx + half, ty + half], fill=colour)
        draw.ellipse([cx - r * 0.72, cy - r * 0.72, cx + r * 0.72, cy + r * 0.72], fill=colour)
        draw.ellipse([cx - r * 0.28, cy - r * 0.28, cx + r * 0.28, cy + r * 0.28], fill=(255, 255, 255))
    elif shape == "home":
        draw.polygon([(cx, cy - r), (cx + r, cy), (cx - r, cy)], fill=colour)
        draw.rectangle([cx - r * 0.65, cy, cx + r * 0.65, cy + r * 0.9], fill=colour)
    elif shape == "search":
        draw.ellipse([cx - r, cy - r, cx + r * 0.5, cy + r * 0.5], outline=colour, width=int(r * 0.3))
        draw.line([(cx + r * 0.35, cy + r * 0.35), (cx + r, cy + r)], fill=colour, width=int(r * 0.3))
    elif shape == "bell":
        draw.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=colour)
        draw.rectangle([cx - r, cy, cx + r, cy + r * 0.4], fill=colour)
        draw.ellipse([cx - r * 0.25, cy + r * 0.4, cx + r * 0.25, cy + r * 0.9], fill=colour)
    elif shape == "mail":
        draw.rectangle([cx - r, cy - r * 0.7, cx + r, cy + r * 0.7], outline=colour, width=int(r * 0.22))
        draw.line([(cx - r * 0.8, cy - r * 0.5), (cx, cy + r * 0.1)], fill=colour, width=int(r * 0.2))
        draw.line([(cx + r * 0.8, cy - r * 0.5), (cx, cy + r * 0.1)], fill=colour, width=int(r * 0.2))
    elif shape == "cloud":
        draw.ellipse([cx - r, cy - r * 0.5, cx, cy + r * 0.5], fill=colour)
        draw.ellipse([cx - r * 0.3, cy - r * 0.9, cx + r * 0.7, cy + r * 0.2], fill=colour)
        draw.rectangle([cx - r, cy, cx + r, cy + r * 0.5], fill=colour)
    elif shape == "lock":
        draw.rectangle([cx - r * 0.8, cy - r * 0.1, cx + r * 0.8, cy + r], fill=colour)
        draw.arc([cx - r * 0.5, cy - r, cx + r * 0.5, cy], 180, 360, fill=colour, width=int(r * 0.25))
    elif shape == "camera":
        draw.rectangle([cx - r, cy - r * 0.6, cx + r, cy + r * 0.8], fill=colour)
        draw.rectangle([cx - r * 0.35, cy - r * 0.95, cx + r * 0.35, cy - r * 0.55], fill=colour)
        draw.ellipse([cx - r * 0.42, cy - r * 0.32, cx + r * 0.42, cy + r * 0.52], fill=(255, 255, 255))
    elif shape == "trash":
        draw.rectangle([cx - r * 0.9, cy - r * 0.6, cx + r * 0.9, cy - r * 0.35], fill=colour)
        draw.polygon([(cx - r * 0.65, cy - r * 0.3), (cx + r * 0.65, cy - r * 0.3),
                      (cx + r * 0.45, cy + r), (cx - r * 0.45, cy + r)], fill=colour)
    else:
        draw.ellipse([cx - r * 0.6, cy - r * 0.6, cx + r * 0.6, cy + r * 0.6], fill=colour)

def main() -> int:
    parser = argparse.ArgumentParser(description=doc,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("-r", "--rows", type=int, default=2)
    parser.add_argument("-c", "--cols", type=int, default=4)
    parser.add_argument("--cell", type=int, default=180, help="cell size in px")
    parser.add_argument("-o", "--out", default=None, help="output sheet path")
    parser.add_argument("--names-out", default=None, help="output names file path")
    parser.add_argument("--dark", action="storetrue", help="light icons on #101014 instead of white")
    args = parser.parse_args()

    count = args.rows * args.cols
    if count > len(NAMES):
        raise SystemExit(f"error: this demo knows {len(NAMES)} icons, you asked for {count}")

    names = list(NAMES[:count])
    here = os.path.dirname(os.path.abspath(file))
    sheet_path = args.out or os.path.join(here, f"sample-{args.rows}x{args.cols}.png")
    namespath = args.namesout or os.path.join(here, f"names-{args.rows}x{args.cols}.txt")

    background = (16, 16, 20) if args.dark else (255, 255, 255)
    ink = (232, 232, 236) if args.dark else (37, 45, 66)

    width, height = args.cols * args.cell, args.rows * args.cell
    zoom = 4  # supersample so the demo sheet has real anti-aliased edges
    canvas = Image.new("RGB", (width * zoom, height * zoom), background)
    draw = ImageDraw.Draw(canvas)

    for index, name in enumerate(names):
        row, col = divmod(index, args.cols)
        cx = (col + 0.5) * args.cell * zoom
        cy = (row + 0.5) * args.cell * zoom
        radius = args.cell * zoom * 0.3
        colour = ink
        if name == "record":
            colour = (206, 62, 78) if not args.dark else (255, 122, 138)
        draw_icon(draw, name, cx, cy, radius, colour)

    canvas = canvas.resize((width, height), Image.LANCZOS)
    canvas.save(sheet_path, format="PNG")

    with open(names_path, "w", encoding="utf-8") as handle:
        handle.write(f"# {args.rows} rows x {args.cols} cols, left-to-right / top-to-bottom\n")
        for name in names:
            handle.write(name + "\n")

    print(f"sheet -> {sheet_path}  ({width}x{height}, {args.rows}x{args.cols})")
    print(f"names -> {names_path}  ({len(names)} names)")
    print()
    print("now cut it:")
    size = 64
    if args.dark:
        print(f"  spritecut {sheetpath} -s {size} -N {namespath} -o sprites/ -g {args.rows}x{args.cols} --remove-bg --bg-color '#101014' --preview")
    else:
        print(f"  spritecut {sheetpath} -s {size} -N {namespath} -o sprites/ -g {args.rows}x{args.cols} --remove-bg --preview")
    return 0

if name == "main":
    raise SystemExit(main())