"""End-to-end pipeline: sprite sheet in -> N equally sized transparent PNGs out."""

from __future__ import annotations

import json
import os
import re
from dataclasses import asdict, dataclass, field
from typing import Callable, List, Optional, Sequence, Set, Tuple

import numpy as np
from PIL import Image, ImageDraw

from .imaging import (
    RESAMPLERS,
    BackgroundSpec,
    background_mask,
    crop_box,
    crop_mask,
    fit_center,
    flatten,
    load_rgba,
    parse_color,
    parse_grid,
    parse_size,
    save_png,
    strip_background,
)
from .labeling import Box, connected_boxes, grid_boxes, merge_close_boxes, reading_order

__all__ = [
    "CutOptions",
    "SpriteResult",
    "cut_sprites",
    "sanitize_name",
    "render_preview",
    "write_manifest",
]

BBox = Tuple[int, int, int, int]


@dataclass
class CutOptions:
    """Every knob of a run, kept together so the CLI stays readable."""

    out_dir: str = "sprites"
    size: Tuple[int, int] = (64, 64)
    grid: Optional[Tuple[int, int]] = None
    padding: int = 4
    margin: float = 0.05
    fit: str = "contain"
    resample: str = "lanczos"
    background: BackgroundSpec = field(default_factory=BackgroundSpec)
    min_area: int = 8
    min_size: int = 2
    merge_distance: float = 0.0
    row_tolerance: Optional[float] = None
    out_bg: str = "transparent"
    template: str = "{name}.png"
    start_index: int = 1
    clobber: bool = True
    auto_name: bool = False
    dry_run: bool = False
    preview_path: Optional[str] = None


@dataclass
class SpriteResult:
    index: int
    name: str
    path: str
    box: BBox
    source_size: Tuple[int, int]
    output_size: Tuple[int, int]
    scale: float

    def to_dict(self) -> dict:
        data = asdict(self)
        x0, y0, x1, y1 = self.box
        data["box"] = {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}
        data["source_size"] = {"w": self.source_size[0], "h": self.source_size[1]}
        data["output_size"] = {"w": self.output_size[0], "h": self.output_size[1]}
        return data


_UNSAFE = re.compile(r"[^\w.\-+@ ]+", re.UNICODE)


def sanitize_name(raw: str, fallback: str = "icon") -> str:
    """Turn an arbitrary user supplied name into a safe file name."""
    name = _UNSAFE.sub("-", str(raw).strip()).strip().strip(".")
    name = re.sub(r"\s+", "-", name)
    name = re.sub(r"-{2,}", "-", name).strip("-")
    return name[:80] or fallback


def _unique(name: str, taken: Set[str]) -> str:
    if name not in taken:
        taken.add(name)
        return name
    counter = 2
    while f"{name}-{counter}" in taken:
        counter += 1
    unique = f"{name}-{counter}"
    taken.add(unique)
    return unique


def render_preview(sheet: np.ndarray, boxes: Sequence[Box], names: Sequence[str], path: str) -> None:
    """Save a copy of the sheet with detection boxes and reading order drawn on it."""
    image = Image.fromarray(np.ascontiguousarray(sheet[..., :3]), mode="RGB")
    draw = ImageDraw.Draw(image)
    unit = max(1, round(min(image.size) / 600))
    for index, box in enumerate(boxes):
        color = (0, 200, 0)
        draw.rectangle([box.x0, box.y0, box.x1, box.y1], outline=color, width=max(1, unit))
        text = str(index + 1)
        tag_w = len(text) * 7 * unit + 6
        tag_h = 10 * unit + 2
        tag_x = box.x0
        tag_y = box.y0 - tag_h - unit
        if tag_y < 0:
            tag_y = box.y1 + unit
        draw.rectangle([tag_x, tag_y, tag_x + tag_w, tag_y + tag_h], fill=(255, 40, 90))
        draw.text((tag_x + 3, tag_y + 1), text, fill=(255, 255, 255))
    folder = os.path.dirname(os.path.abspath(path))
    if folder:
        os.makedirs(folder, exist_ok=True)
    image.save(path, format="PNG")


def resolve_names(
    names: Sequence[str], boxes: Sequence[Box], options: CutOptions, log: Callable[[str], None]
) -> List[str]:
    resolved = list(names)
    if len(resolved) > len(boxes):
        raise SystemExit(
            f"error: {len(resolved)} name(s) given but only {len(boxes)} icon(s) detected. "
            "Part of the art may have been eaten as background (try --feather 0 or a higher "
            "--white-threshold) or the sheet layout differs from what you expect."
        )
    if len(resolved) < len(boxes):
        if options.auto_name:
            for i in range(len(resolved), len(boxes)):
                resolved.append(f"icon-{i + 1}")
            log(f"auto-name: generated {len(boxes) - len(names)} name(s) for remaining icons")
        else:
            raise SystemExit(
                f"error: {len(resolved)} name(s) given but {len(boxes)} icon(s) detected. "
                "Use --auto-name to generate names for the remaining icons, or provide more names."
            )
    taken: Set[str] = set()
    return [
        _unique(sanitize_name(name, f"icon-{index + 1}"), taken)
        for index, name in enumerate(resolved)
    ]


def cut_sprites(
    sheet_path: str,
    names: Sequence[str],
    options: CutOptions,
    log: Callable[[str], None] = lambda _message: None,
) -> List[SpriteResult]:
    """Detect, extract, clean, fit, centre and save every icon of sheet_path."""
    rgba = load_rgba(sheet_path)
    height, width = rgba.shape[:2]
    log(f"sheet {sheet_path}: {width}x{height}px")

    background = background_mask(rgba, options.background)
    foreground = ~background
    if not foreground.any():
        raise SystemExit(
            f"error: no foreground pixels found in {sheet_path!r}. "
            "Lower --white-threshold (or pass --bg-color) if the background is not pure white."
        )

    if options.grid:
        rows, cols = options.grid
        boxes = grid_boxes(foreground, rows, cols, options.min_area, options.padding)
        log(f"grid {rows}x{cols}: {len(boxes)} non-empty cell(s) out of {rows * cols}")
    else:
        boxes = connected_boxes(
            foreground,
            min_area=options.min_area,
            min_width=options.min_size,
            min_height=options.min_size,
        )
        log(f"auto-detect: {len(boxes)} blob(s) with area >= {options.min_area}")
        if options.merge_distance > 0:
            before = len(boxes)
            boxes = merge_close_boxes(boxes, options.merge_distance)
            log(f"merge-distance {options.merge_distance:g}: {before} -> {len(boxes)} sprite(s)")
        boxes = reading_order(boxes, options.row_tolerance)
        if options.padding:
            boxes = [box.expanded(options.padding, width, height) for box in boxes]

    if not boxes:
        raise SystemExit(
            f"error: nothing detected in {sheet_path!r}. Try --min-area 1 --min-size 1, "
            "or inspect the detection with --preview."
        )

    resolved = resolve_names(names, boxes, options, log)

    if not options.dry_run:
        os.makedirs(options.out_dir, exist_ok=True)

    resample = RESAMPLERS.get(str(options.resample).lower(), Image.LANCZOS)
    out_w, out_h = options.size
    solid_bg: Optional[Tuple[int, int, int]] = None
    if str(options.out_bg).lower() not in ("transparent", "alpha", "none"):
        solid_bg = (255, 255, 255) if str(options.out_bg).lower() == "white" else parse_color(options.out_bg)

    results: List[SpriteResult] = []
    for index, box in enumerate(boxes):
        name = resolved[index]
        filename = options.template.format(name=name, index=index + options.start_index)
        target = os.path.join(options.out_dir, filename)

        crop = crop_box(rgba, box.as_tuple())
        crop_background = crop_mask(background, box.as_tuple())
        cleaned = strip_background(crop, crop_background, options.background)
        if solid_bg is not None:
            cleaned = flatten(cleaned, solid_bg)
        fitted = fit_center(cleaned, out_w, out_h, options.margin, resample, options.fit)

        src_h, src_w = crop.shape[:2]
        if options.fit == "stretch":
            scale = out_w / src_w if src_w else 0.0
        else:
            scale = min(out_w / src_w, out_h / src_h) if src_w and src_h else 0.0

        if not options.dry_run:
            if os.path.exists(target) and not options.clobber:
                raise SystemExit(f"error: {target} already exists (pass --overwrite to replace it)")
            save_png(fitted, target)
            log(f"  {name}: box={box.as_tuple()} src={src_w}x{src_h} -> {target}")

        results.append(
            SpriteResult(
                index=index + options.start_index,
                name=name,
                path=target,
                box=box.as_tuple(),
                source_size=(int(src_w), int(src_h)),
                output_size=(int(out_w), int(out_h)),
                scale=round(scale, 4),
            )
        )

    if options.preview_path and not options.dry_run:
        render_preview(rgba, boxes, resolved, options.preview_path)
        log(f"preview -> {options.preview_path}")

    return results


def write_manifest(results: Sequence[SpriteResult], path: str, sheet: str, options: CutOptions) -> None:
    """Write a JSON manifest describing every produced sprite."""
    payload = {
        "input": os.path.abspath(sheet),
        "count": len(results),
        "size": {"w": options.size[0], "h": options.size[1]},
        "grid": list(options.grid) if options.grid else None,
        "sprites": [result.to_dict() for result in results],
    }
    folder = os.path.dirname(os.path.abspath(path))
    if folder:
        os.makedirs(folder, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)