"""Remove the Veo watermark from the 40 frame sequence."""
import sys
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
__doc__ = """Remove the Veo watermark from the 40 frame sequence.

For every pixel inside the watermark box we sample three nearby clean rows/cols:
  - the row above the box  (y_top - 10)
  - the column left of box (x_left - 10)
  - the row below the box  (y_bottom + 5)

Each sample is weighted by the inverse of its distance to the pixel, then
normalized so the weights sum to 1. This gives a smooth, content-aware fill
that matches the surrounding dark-green background better than a flat blur.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "figsequence"
DST_DIR = ROOT / "next" / "public" / "frames"

# Watermark box (pixel coordinates, inclusive top-left)
WM_X = 1799
WM_Y = 1005
WM_W = 130
WM_H = 70

# Sample offsets relative to the box edges
SAMPLE_ABOVE_OFFSET = 10  # pixels above WM_Y
SAMPLE_LEFT_OFFSET = 10   # pixels left of WM_X
SAMPLE_BELOW_OFFSET = 5   # pixels below WM_Y + WM_H


def clean_frame(arr: np.ndarray) -> np.ndarray:
    """Vectorized distance-weighted fill over the watermark box."""
    h, w, _ = arr.shape
    x1 = max(0, WM_X)
    y1 = max(0, WM_Y)
    x2 = min(w, WM_X + WM_W)  # exclusive
    y2 = min(h, WM_Y + WM_H)  # exclusive

    # Source row above and below (clipped to image bounds)
    src_above_y = max(0, y1 - SAMPLE_ABOVE_OFFSET)
    src_below_y = min(h - 1, y2 - 1 + SAMPLE_BELOW_OFFSET)
    src_left_x = max(0, x1 - SAMPLE_LEFT_OFFSET)

    box_h = y2 - y1
    box_w = x2 - x1

    # Build per-pixel coordinate grids inside the box
    ys = np.arange(y1, y2).reshape(-1, 1)  # (box_h, 1)
    xs = np.arange(x1, x2).reshape(1, -1)  # (1, box_w)

    # Distances to each clean source line
    d_above = (ys - src_above_y).astype(np.float32)         # (box_h, 1)
    d_below = (src_below_y - ys).astype(np.float32)         # (box_h, 1)
    d_left = (xs - src_left_x).astype(np.float32)           # (1, box_w)

    eps = 1.0
    w_above = 1.0 / (d_above + eps)
    w_below = 1.0 / (d_below + eps)
    w_left = 1.0 / (d_left + eps)

    # Broadcast to (box_h, box_w)
    w_above_b = np.broadcast_to(w_above, (box_h, box_w))
    w_below_b = np.broadcast_to(w_below, (box_h, box_w))
    w_left_b = np.broadcast_to(w_left, (box_h, box_w))

    w_sum = w_above_b + w_below_b + w_left_b
    w_above_n = (w_above_b / w_sum)[..., None]
    w_below_n = (w_below_b / w_sum)[..., None]
    w_left_n = (w_left_b / w_sum)[..., None]

    # Source pixel arrays (each broadcast to box shape)
    src_above_row = arr[src_above_y, x1:x2, :].astype(np.float32)       # (box_w, 3)
    src_below_row = arr[src_below_y, x1:x2, :].astype(np.float32)       # (box_w, 3)
    src_left_col = arr[y1:y2, src_left_x, :].astype(np.float32)         # (box_h, 3)

    src_above_b = np.broadcast_to(src_above_row[None, :, :], (box_h, box_w, 3))
    src_below_b = np.broadcast_to(src_below_row[None, :, :], (box_h, box_w, 3))
    src_left_b = np.broadcast_to(src_left_col[:, None, :], (box_h, box_w, 3))

    fill = (
        w_above_n * src_above_b
        + w_below_n * src_below_b
        + w_left_n * src_left_b
    )
    fill = np.clip(fill, 0, 255).astype(np.uint8)

    out = arr.copy()
    out[y1:y2, x1:x2, :] = fill
    return out


def main() -> None:
    if not SRC_DIR.is_dir():
        raise SystemExit(f"Source dir not found: {SRC_DIR}")
    DST_DIR.mkdir(parents=True, exist_ok=True)

    for i in range(1, 41):
        src = SRC_DIR / f"ezgif-frame-{i:03d}.jpg"
        dst = DST_DIR / f"frame{i:03d}.jpg"
        if not src.is_file():
            raise SystemExit(f"Missing frame: {src}")

        img = Image.open(src).convert("RGB")
        if img.size != (1920, 1080):
            print(f"! {src.name} is {img.size}, expected 1920x1080 — proceeding anyway")
        arr = np.array(img)
        cleaned = clean_frame(arr)
        Image.fromarray(cleaned).save(dst, "JPEG", quality=92, optimize=True)
        print(f"✓ {dst.name}")

    total = len(list(DST_DIR.glob("frame*.jpg")))
    print(f"\nDone. {total} frames in {DST_DIR}")


if __name__ == "__main__":
    main()
