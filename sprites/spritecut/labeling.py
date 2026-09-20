"""Connected-component labeling and box extraction for spritecut."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence, Tuple

import numpy as np

BBox = Tuple[int, int, int, int]


@dataclass
class Box:
    """Axis-aligned bounding box with area and optional label."""

    x0: int
    y0: int
    x1: int
    y1: int
    area: int = 0
    label: int = -1

    @property
    def width(self) -> int:
        return max(0, self.x1 - self.x0)

    @property
    def height(self) -> int:
        return max(0, self.y1 - self.y0)

    @property
    def cx(self) -> float:
        return (self.x0 + self.x1 - 1) / 2.0

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1 - 1) / 2.0

    def expanded(self, pad: int, img_w: Optional[int] = None, img_h: Optional[int] = None) -> "Box":
        x0, y0, x1, y1 = self.x0 - pad, self.y0 - pad, self.x1 + pad, self.y1 + pad
        if img_w is not None:
            x0 = max(0, min(x0, img_w))
            x1 = max(0, min(x1, img_w))
        if img_h is not None:
            y0 = max(0, min(y0, img_h))
            y1 = max(0, min(y1, img_h))
        return Box(int(x0), int(y0), int(x1), int(y1), self.area, self.label)

    def as_tuple(self) -> BBox:
        return (int(self.x0), int(self.y0), int(self.x1), int(self.y1))

    def __str__(self) -> str:  # pragma: no cover - debugging helper
        return f"Box(x={self.x0}, y={self.y0}, w={self.width}, h={self.height}, area={self.area})"


class UnionFind:
    """Union-find over run ids that also tracks pixel count and bounding box."""

    __slots__ = ("parent", "count", "bbox")

    def __init__(self) -> None:
        self.parent: dict[int, int] = {}
        self.count: dict[int, int] = {}
        self.bbox: dict[int, Optional[BBox]] = {}

    def make(self, node: int, count: int, bbox: BBox) -> None:
        self.parent[node] = node
        self.count[node] = count
        self.bbox[node] = bbox

    def find(self, node: int) -> int:
        parent = self.parent
        root = node
        while parent[root] != root:
            root = parent[root]
        while parent[node] != root:
            nxt = parent[node]
            parent[node] = root
            node = nxt
        return root

    def union(self, a: int, b: int) -> None:
        root_a, root_b = self.find(a), self.find(b)
        if root_a == root_b:
            return
        if self.count[root_a] < self.count[root_b]:
            root_a, root_b = root_b, root_a
        self.parent[root_b] = root_a
        self.count[root_a] += self.count[root_b]
        if self.bbox[root_a] is None:
            self.bbox[root_a] = self.bbox[root_b]
        elif self.bbox[root_b] is not None:
            self.bbox[root_a] = merge_bbox(self.bbox[root_a], self.bbox[root_b])

    def get_boxes(self, min_area: int, min_width: int, min_height: int) -> List[Box]:
        boxes: List[Box] = []
        for node, root in self.parent.items():
            if node != root:
                continue
            count = self.count[node]
            if count < min_area:
                continue
            bbox = self.bbox[node]
            if bbox is None:
                continue
            x0, y0, x1, y1 = bbox
            if (x1 - x0) < min_width or (y1 - y0) < min_height:
                continue
            boxes.append(Box(x0, y0, x1, y1, count))
        return boxes


def merge_bbox(a: Optional[BBox], b: Optional[BBox]) -> Optional[BBox]:
    if a is None:
        return b
    if b is None:
        return a
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3]))


def row_runs(row: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
    """Starts and exclusive ends of the True runs inside a boolean row."""
    width = int(row.shape[0])
    if width == 0:
        empty = np.empty(0, dtype=np.intp)
        return empty, empty
    padded = np.empty(width + 2, dtype=np.int8)
    padded[0] = 0
    padded[-1] = 0
    padded[1:-1] = row
    delta = np.diff(padded)
    return np.flatnonzero(delta == 1), np.flatnonzero(delta == -1)


def connected_boxes(
    foreground: np.ndarray,
    min_area: int = 1,
    min_width: int = 1,
    min_height: int = 1,
) -> List[Box]:
    """Label the 8-connected components of foreground and return their boxes."""
    mask = np.ascontiguousarray(foreground, dtype=bool)
    if mask.ndim != 2:
        raise ValueError("foreground mask must be 2-dimensional")
    height = int(mask.shape[0])

    uf = UnionFind()
    next_id = 0
    previous: List[Tuple[int, int, int]] = []

    for y in range(height):
        starts, ends = row_runs(mask[y])
        current: List[Tuple[int, int, int]] = []
        if starts.size:
            cursor = 0
            total_prev = len(previous)
            for start, end in zip(starts.tolist(), ends.tolist()):
                run_id = next_id
                next_id += 1
                uf.make(run_id, end - start, (start, y, end, y + 1))
                current.append((start, end, run_id))
                # 8-connectivity: previous-row runs within one pixel overlap.
                while cursor < total_prev and previous[cursor][1] <= start + 1:
                    cursor += 1
                for k in range(cursor, total_prev):
                    p_start, p_end, p_id = previous[k]
                    if p_start > end + 1:
                        break
                    if p_end > start - 1 and p_start < end + 1:
                        uf.union(run_id, p_id)
        previous = current

    return uf.get_boxes(min_area, min_width, min_height)


def _gap(a: Box, b: Box) -> Tuple[int, int]:
    dx = max(0, max(a.x0, b.x0) - min(a.x1, b.x1))
    dy = max(0, max(a.y0, b.y0) - min(a.y1, b.y1))
    return dx, dy


def _median(values: Sequence[float]) -> float:
    ordered = sorted(values)
    count = len(ordered)
    if count == 0:
        return 0.0
    middle = count // 2
    if count % 2:
        return float(ordered[middle])
    return (float(ordered[middle - 1]) + float(ordered[middle])) / 2.0


def filter_tiny_boxes(
    boxes: Sequence[Box],
    min_relative_area: float = 0.15,
    min_count: int = 3,
) -> List[Box]:
    """Drop dust-sized fragments when every real icon has a similar size.

    A box survives when its foreground-pixel area is at least
    ``min_relative_area`` times the median box area. With fewer than
    ``min_count`` boxes there is no reliable "typical size", so everything
    is kept. Pass ``min_relative_area <= 0`` to disable.
    """
    items = list(boxes)
    if min_relative_area <= 0 or len(items) < min_count:
        return items
    reference = _median([float(box.area) for box in items])
    if reference <= 0:
        return items
    threshold = reference * min_relative_area
    return [box for box in items if float(box.area) >= threshold]


def merge_close_boxes(
    boxes: Sequence[Box],
    distance: float,
    max_merge_factor: float = 1.6,
) -> List[Box]:
    """Merge boxes separated by less than distance pixels.

    Useful for icons drawn as several disconnected strokes (the dot of an i,
    a dashed underline, a handle floating next to a blade, ...).

    The merge is size-aware: two boxes are only joined when the resulting
    box stays within ``max_merge_factor`` times the typical (median) icon
    width/height. Without this guard a generous ``distance`` fuses two
    neighbouring icons into one "sprite". Pass ``max_merge_factor <= 0``
    to restore the legacy behaviour of merging unconditionally.
    """
    items = list(boxes)
    total = len(items)
    if distance <= 0 or total <= 1:
        return items

    median_w = _median([float(box.width) for box in items])
    median_h = _median([float(box.height) for box in items])
    guard = (
        max_merge_factor > 0 and median_w > 0 and median_h > 0 and total >= 2
    )

    parent = list(range(total))

    def find(node: int) -> int:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    def merge_allowed(a: Box, b: Box) -> bool:
        if not guard:
            return True
        width = max(a.x1, b.x1) - min(a.x0, b.x0)
        height = max(a.y1, b.y1) - min(a.y0, b.y0)
        return (
            width <= median_w * max_merge_factor
            and height <= median_h * max_merge_factor
        )

    for i in range(total):
        for j in range(i + 1, total):
            dx, dy = _gap(items[i], items[j])
            if dx <= distance and dy <= distance and merge_allowed(items[i], items[j]):
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[rj] = ri

    groups: dict[int, List[Box]] = {}
    for i, box in enumerate(items):
        root = find(i)
        groups.setdefault(root, []).append(box)

    merged: List[Box] = []
    for group in groups.values():
        if len(group) == 1:
            merged.append(group[0])
        else:
            x0 = min(b.x0 for b in group)
            y0 = min(b.y0 for b in group)
            x1 = max(b.x1 for b in group)
            y1 = max(b.y1 for b in group)
            area = sum(b.area for b in group)
            merged.append(Box(x0, y0, x1, y1, area))
    return merged


def split_merged_boxes(
    foreground: np.ndarray,
    boxes: Sequence[Box],
    factor: float = 1.6,
    bridge_fraction: float = 0.2,
) -> List[Box]:
    """Split boxes that swallowed several icons back into individuals.

    A box is suspicious when it is ``factor`` times wider (or taller) than
    the typical icon -- usually two neighbours fused by a 1px anti-aliased
    bridge or by --merge-distance. The split only happens along a column
    (or row) that is empty or carries at most ``bridge_fraction`` of the
    box height (width) in foreground pixels, so solid artwork is never cut.
    Pass ``factor <= 0`` to disable.
    """
    items = list(boxes)
    if factor <= 0 or len(items) < 2:
        return items
    mask = np.ascontiguousarray(foreground, dtype=bool)
    height, width = mask.shape
    # Leave-one-out typical size: the reference for each box is the median
    # of *the other* boxes, so one swallowed double-icon cannot inflate its
    # own reference (with 2 boxes this degrades to "the other box").
    sorted_w = sorted(float(box.width) for box in items)
    sorted_h = sorted(float(box.height) for box in items)

    def typical(sorted_values: Sequence[float], own: float) -> float:
        remaining = list(sorted_values)
        remaining.remove(float(own))
        return _median(remaining) if remaining else 0.0

    out: List[Box] = []
    for box in items:
        ref_w = typical(sorted_w, float(box.width))
        ref_h = typical(sorted_h, float(box.height))
        if ref_w <= 0 or ref_h <= 0:
            out.append(box)
            continue
        wide = box.width > ref_w * factor
        tall = box.height > ref_h * factor
        if not (wide or tall):
            out.append(box)
            continue
        x0 = max(0, box.x0)
        y0 = max(0, box.y0)
        x1 = min(width, box.x1)
        y1 = min(height, box.y1)
        region = mask[y0:y1, x0:x1]
        if region.size == 0 or not region.any():
            out.append(box)
            continue
        split = _find_split(region, wide, tall, bridge_fraction)
        if split is None:
            out.append(box)
            continue
        axis, at = split
        if axis == "x":
            left = region[:, :at]
            right = region[:, at:]
            if left.any() and right.any():
                out.append(_tight_box(left, x0, y0, box))
                out.append(_tight_box(right, x0 + at, y0, box))
            else:
                out.append(box)
        else:
            top = region[:at, :]
            bottom = region[at:, :]
            if top.any() and bottom.any():
                out.append(_tight_box(top, x0, y0, box))
                out.append(_tight_box(bottom, x0, y0 + at, box))
            else:
                out.append(box)
    return out


def _find_split(
    region: np.ndarray, wide: bool, tall: bool, bridge_fraction: float
) -> Optional[Tuple[str, int]]:
    """Locate the emptiest column/row to cut a merged region in two."""
    rows, cols = region.shape
    # Prefer the axis matching the oversized dimension; try both otherwise.
    axes: List[str] = []
    if wide:
        axes.append("x")
    if tall:
        axes.append("y")
    if not axes:
        axes = ["x", "y"]
    for axis in axes:
        if axis == "x" and cols >= 3:
            counts = region.sum(axis=0).astype(float)
            limit = max(0.0, rows * bridge_fraction)
            inner = counts[1:-1]
            if inner.size == 0:
                continue
            at = int(np.argmin(inner)) + 1
            if float(inner.min()) <= limit:
                halves = (region[:, :at].sum(), region[:, at:].sum())
                if min(halves) > 0 and min(at, cols - at) >= max(2, cols // 8):
                    return ("x", at)
        elif axis == "y" and rows >= 3:
            counts = region.sum(axis=1).astype(float)
            limit = max(0.0, cols * bridge_fraction)
            inner = counts[1:-1]
            if inner.size == 0:
                continue
            at = int(np.argmin(inner)) + 1
            if float(inner.min()) <= limit:
                halves = (region[:at, :].sum(), region[at:, :].sum())
                if min(halves) > 0 and min(at, rows - at) >= max(2, rows // 8):
                    return ("y", at)
    return None


def _tight_box(region: np.ndarray, origin_x: int, origin_y: int, source: Box) -> Box:
    """Shrink-wrap the foreground of region into global coordinates."""
    rows = np.any(region, axis=1)
    cols = np.any(region, axis=0)
    row_idx = np.flatnonzero(rows)
    col_idx = np.flatnonzero(cols)
    if row_idx.size == 0 or col_idx.size == 0:
        return source
    y0 = origin_y + int(row_idx[0])
    y1 = origin_y + int(row_idx[-1]) + 1
    x0 = origin_x + int(col_idx[0])
    x1 = origin_x + int(col_idx[-1]) + 1
    return Box(x0, y0, x1, y1, int(region.sum()))


def grid_boxes(
    foreground: np.ndarray,
    rows: int,
    cols: int,
    min_area: int = 1,
    padding: int = 0,
    min_relative_area: float = 0.08,
    spillover_fraction: float = 0.25,
) -> List[Box]:
    """Split the sheet into rows x cols cells and box the art in each.

    Every cell yields at most one box and that box never leaves its cell,
    so a neighbour's artwork can no longer leak into a sprite. Inside a
    cell the foreground is labelled into components: dust-sized fragments
    (area below ``min_relative_area`` times the cell's largest component)
    and thin slivers touching the cell border (bleed from the neighbour,
    area below ``spillover_fraction`` times the largest) are ignored, and
    the surviving parts of one icon are unioned into a single box.
    Reading order is guaranteed and empty cells are skipped.
    """
    mask = np.ascontiguousarray(foreground, dtype=bool)
    height, width = mask.shape
    if rows <= 0 or cols <= 0:
        raise ValueError("rows and cols must be >= 1")

    ys = np.linspace(0, height, rows + 1).round().astype(int)
    xs = np.linspace(0, width, cols + 1).round().astype(int)

    out: List[Box] = []
    for row in range(rows):
        for col in range(cols):
            y0, y1 = int(ys[row]), int(ys[row + 1])
            x0, x1 = int(xs[col]), int(xs[col + 1])
            cell = mask[y0:y1, x0:x1]
            if not cell.any():
                continue
            if int(cell.sum()) < min_area:
                continue
            box = _cell_box(
                cell, x0, y0, x1, y1, min_area, min_relative_area, spillover_fraction
            )
            if box is None:
                continue
            if padding:
                # Padding is clipped to the cell so it can never reach
                # into -- and steal pixels from -- a neighbouring cell.
                box = Box(
                    max(x0, box.x0 - padding),
                    max(y0, box.y0 - padding),
                    min(x1, box.x1 + padding),
                    min(y1, box.y1 + padding),
                    box.area,
                    box.label,
                )
            out.append(box)
    return out


def _cell_box(
    cell: np.ndarray,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    min_area: int,
    min_relative_area: float,
    spillover_fraction: float,
) -> Optional[Box]:
    """Union the keep-worthy components of one grid cell into a single box."""
    parts = connected_boxes(cell, min_area=1, min_width=1, min_height=1)
    if not parts:
        return None
    # to global coordinates
    shifted = [
        Box(part.x0 + x0, part.y0 + y0, part.x1 + x0, part.y1 + y0, part.area)
        for part in parts
    ]
    shifted = [part for part in shifted if part.area >= max(1, min_area)]
    if not shifted:
        return None
    largest = max(part.area for part in shifted)
    kept: List[Box] = []
    for part in shifted:
        if part.area != largest and min_relative_area > 0:
            if float(part.area) < float(largest) * min_relative_area:
                continue  # dust / detached speck inside the cell
        if part.area != largest and spillover_fraction > 0:
            touches = (
                part.x0 <= x0 or part.x1 >= x1 or part.y0 <= y0 or part.y1 >= y1
            )
            if touches and float(part.area) < float(largest) * spillover_fraction:
                continue  # sliver bleeding over from the neighbour cell
        kept.append(part)
    if not kept:
        return None
    bx0 = min(part.x0 for part in kept)
    by0 = min(part.y0 for part in kept)
    bx1 = max(part.x1 for part in kept)
    by1 = max(part.y1 for part in kept)
    return Box(bx0, by0, bx1, by1, int(sum(part.area for part in kept)))


def row_tolerance_for(boxes: Sequence[Box], factor: float = 0.5, minimum: float = 2.0) -> float:
    """Vertical slack used to decide that two boxes sit on the same row."""
    if not boxes:
        return minimum
    heights = np.array([box.height for box in boxes], dtype=float)
    return float(max(minimum, float(np.median(heights)) * factor))


def reading_order(boxes: Sequence[Box], row_tolerance: Optional[float] = None) -> List[Box]:
    """Sort boxes left-to-right / top-to-bottom, grouping them into rows."""
    items = sorted(boxes, key=lambda box: (box.cy, box.x0))
    if not items:
        return []
    if row_tolerance is None:
        row_tolerance = row_tolerance_for(items)

    rows: List[List[Box]] = []
    current: List[Box] = [items[0]]
    for box in items[1:]:
        centre = float(np.mean([item.cy for item in current]))
        if abs(box.cy - centre) <= row_tolerance:
            current.append(box)
        else:
            rows.append(sorted(current, key=lambda b: b.x0))
            current = [box]
    rows.append(sorted(current, key=lambda b: b.x0))

    # flatten
    out: List[Box] = []
    for row in rows:
        out.extend(row)
    return out