"""Image processing utilities for spritecut."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from PIL import Image

# Resampling filters
RESAMPLERS = {
    "nearest": Image.NEAREST,
    "box": Image.BOX,
    "bilinear": Image.BILINEAR,
    "hamming": Image.HAMMING,
    "bicubic": Image.BICUBIC,
    "lanczos": Image.LANCZOS,
}

SIZERE = re.compile(r"^(\d+)x(\d+)$")
GRIDRE = re.compile(r"^(\d+)x(\d+)$")
HEXRE = re.compile(r"^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")

BBox = Tuple[int, int, int, int]


def parse_size(text: str) -> Tuple[int, int]:
    """'64x48' -> (64, 48); '64' -> (64, 64)."""
    raw = str(text).strip()
    match = SIZERE.match(raw)
    if match:
        width, height = int(match.group(1)), int(match.group(2))
    elif raw.isdigit():
        width = height = int(raw)
    else:
        raise SystemExit(f"error: cannot parse size {text!r}, expected WxH such as 64x64")
    if width <= 0 or height <= 0:
        raise SystemExit("error: size dimensions must be positive")
    return width, height


def parse_grid(text: str) -> Tuple[int, int]:
    """'2x4' -> (rows=2, cols=4)."""
    return parse_size(text)


def parse_color(text: str) -> Tuple[int, int, int]:
    match = HEXRE.match(str(text).strip())
    if not match:
        raise SystemExit(f"error: cannot parse colour {text!r}, expected #RRGGBB")
    digits = match.group(1)
    if len(digits) == 3:
        digits = "".join(char * 2 for char in digits)
    return (int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16))


@dataclass
class BackgroundSpec:
    """Rules that decide whether a pixel belongs to the sheet background."""

    white_threshold: int = 244
    alpha_threshold: int = 8
    color: Optional[Tuple[int, int, int]] = None
    color_tolerance: int = 24
    feather: int = 8
    defringe: bool = True


def load_rgba(path: str) -> np.ndarray:
    """Load any Pillow readable file as an (H, W, 4) uint8 RGBA array."""
    with Image.open(path) as image:
        if image.mode == "P":
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        return np.asarray(image.convert("RGBA"), dtype=np.uint8)


def background_mask(rgba: np.ndarray, spec: BackgroundSpec) -> np.ndarray:
    """True where the pixel is background (white / transparent / bg colour)."""
    rgb = rgba[..., :3].astype(np.int16)
    alpha = rgba[..., 3].astype(np.int16)
    transparent = alpha <= spec.alpha_threshold
    brightest = np.max(rgb, axis=2)
    darkest = np.min(rgb, axis=2)
    near_white = (darkest >= spec.white_threshold) & ((brightest - darkest) <= spec.color_tolerance)
    if spec.color is not None:
        target = np.array(spec.color, dtype=np.int16)
        diff = np.abs(rgb - target).sum(axis=2)
        near_bg = diff <= spec.color_tolerance * 3
        return transparent | near_white | near_bg
    return transparent | near_white


def strip_background(
    rgba: np.ndarray, background: np.ndarray, spec: BackgroundSpec
) -> np.ndarray:
    """Return a copy of rgba with the background made transparent.

    feather keeps anti-aliased edges smooth instead of producing a jagged
    white halo, and defringe un-blends those semi transparent pixels from
    the backdrop so the colour that survives is the real icon colour.
    """
    out = np.array(rgba, dtype=np.uint8, copy=True)
    out[background, 3] = 0
    if spec.feather > 0:
        alpha = out[..., 3].astype(np.float32) / 255.0
        soft = (alpha > 0.0) & (alpha < 1.0)
        if not soft.any():
            return out

        new_alpha = np.clip(alpha * (1.0 / (1.0 - 0.5 * (1.0 - alpha))), 0.0, 1.0)
        result = out.astype(np.float32)
        if spec.defringe:
            # observed = a * foreground + (1 - a) * backdrop  ->  solve for foreground
            safe = np.maximum(new_alpha, 1e-3)[..., None]
            backdrop = np.array([255.0, 255.0, 255.0], dtype=np.float32)
            if spec.color is not None:
                backdrop = np.array(spec.color, dtype=np.float32)
            unblended = (result[..., :3] - (1.0 - new_alpha[..., None]) * backdrop[None, None, :]) / safe
            result[..., :3] = np.where(soft[..., None], np.clip(unblended, 0.0, 255.0), result[..., :3])
        result[..., 3] = np.where(soft, np.round(new_alpha * 255.0), result[..., 3])
        out = np.clip(result, 0.0, 255.0).astype(np.uint8)
        out[background, 3] = 0
    return out


def _clamp(box: Tuple[int, int, int, int], height: int, width: int) -> Tuple[int, int, int, int]:
    x0, y0, x1, y1 = box
    x0 = max(0, min(int(x0), width))
    y0 = max(0, min(int(y0), height))
    x1 = max(x0 + 1, min(int(x1), width))
    y1 = max(y0 + 1, min(int(y1), height))
    return x0, y0, x1, y1


def crop_box(rgba: np.ndarray, box: Tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = _clamp(box, rgba.shape[0], rgba.shape[1])
    return rgba[y0:y1, x0:x1]


def crop_mask(mask: np.ndarray, box: Tuple[int, int, int, int]) -> np.ndarray:
    x0, y0, x1, y1 = _clamp(box, mask.shape[0], mask.shape[1])
    return mask[y0:y1, x0:x1]


def fit_center(
    rgba: np.ndarray,
    out_width: int,
    out_height: int,
    margin: float = 0.0,
    resample: int = Image.LANCZOS,
    mode: str = "contain",
) -> np.ndarray:
    """Scale rgba into an out_width x out_height canvas and centre it.

    margin is the fraction (0 .. 0.45) of the canvas kept empty around the
    artwork.  mode is contain (aspect preserved) or stretch.
    """
    srch, srcw = rgba.shape[:2]
    if srcw == 0 or srch == 0:
        return np.zeros((out_height, out_width, 4), dtype=np.uint8)

    if mode == "stretch":
        scale_w = out_width / srcw
        scale_h = out_height / srch
    else:
        scale = min(out_width / srcw, out_height / srch)
        scale_w = scale_h = scale

    # apply margin
    scale_w *= 1.0 - 2.0 * margin
    scale_h *= 1.0 - 2.0 * margin

    new_w = max(1, int(round(srcw * scale_w)))
    new_h = max(1, int(round(srch * scale_h)))

    # Resize using PIL
    img = Image.fromarray(np.ascontiguousarray(rgba), mode="RGBA")
    img = img.resize((new_w, new_h), resample)
    resized = np.asarray(img, dtype=np.uint8)

    # Centre on canvas
    canvas = np.zeros((out_height, out_width, 4), dtype=np.uint8)
    y0 = (out_height - new_h) // 2
    x0 = (out_width - new_w) // 2
    canvas[y0:y0 + new_h, x0:x0 + new_w] = resized
    return canvas


def flatten(rgba: np.ndarray, color: Tuple[int, int, int]) -> np.ndarray:
    """Composite rgba over a solid colour (used by --out-bg)."""
    alpha = rgba[..., 3:4].astype(np.float32) / 255.0
    backdrop = np.zeros_like(rgba)
    backdrop[..., 0], backdrop[..., 1], backdrop[..., 2] = color[0], color[1], color[2]
    backdrop[..., 3] = 255
    out = backdrop.copy()
    out[..., :3] = np.clip(
        rgba[..., :3].astype(np.float32) * alpha
        + backdrop[..., :3].astype(np.float32) * (1.0 - alpha),
        0.0,
        255.0,
    ).astype(np.uint8)
    return out


def save_png(rgba: np.ndarray, path: str, optimize: bool = True) -> None:
    folder = os.path.dirname(os.path.abspath(path))
    if folder:
        os.makedirs(folder, exist_ok=True)
    Image.fromarray(np.ascontiguousarray(rgba), mode="RGBA").save(
        path, format="PNG", optimize=optimize
    )