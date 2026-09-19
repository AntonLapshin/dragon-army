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


def merge_close_boxes(boxes: Sequence[Box], distance: float) -> List[Box]:
    """Merge boxes separated by less than distance pixels.

    Useful for icons drawn as several disconnected strokes (the dot of an i,
    a dashed underline, a handle floating next to a blade, ...).
    """
    items = list(boxes)
    total = len(items)
    if distance <= 0 or total <= 1:
        return items

    parent = list(range(total))

    def find(node: int) -> int:
        while parent[node] != node:
            parent[node] = parent[parent[node]]
            node = parent[node]
        return node

    for i in range(total):
        for j in range(i + 1, total):
            dx, dy = _gap(items[i], items[j])
            if dx <= distance and dy <= distance:
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


def grid_boxes(
    foreground: np.ndarray,
    rows: int,
    cols: int,
    min_area: int = 1,
    padding: int = 0,
) -> List[Box]:
    """Split the sheet into rows x cols cells and box the art in each.

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
            area = int(cell.sum())
            if area < min_area:
                continue
            # find content bbox inside cell
            cell_rows = np.any(cell, axis=1)
            cell_cols = np.any(cell, axis=0)
            r0 = int(np.flatnonzero(cell_rows)[0])
            r1 = int(np.flatnonzero(cell_rows)[-1]) + 1
            c0 = int(np.flatnonzero(cell_cols)[0])
            c1 = int(np.flatnonzero(cell_cols)[-1]) + 1
            box = Box(x0 + c0, y0 + r0, x0 + c1, y0 + r1, area)
            if padding:
                box = box.expanded(padding, width, height)
            out.append(box)
    return out


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