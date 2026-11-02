#!/usr/bin/env python3
"""Generate macOS menu-bar template icons (black + alpha)."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


def draw_glyph(size: int) -> Image.Image:
    """Book + magnifier silhouette sized for the macOS menu bar."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    scale = size / 100.0
    stroke = max(2, round(size * 0.10))
    stroke_inner = max(1, round(size * 0.07))

    doc = (18, 14, 72, 70)
    draw.rounded_rectangle(
        [doc[0] * scale, doc[1] * scale, doc[2] * scale, doc[3] * scale],
        radius=max(1, round(3 * scale)),
        outline=(0, 0, 0, 255),
        width=stroke,
    )

    mid_x = 48 * scale
    draw.line(
        [(mid_x, (doc[1] + 6) * scale), (mid_x, (doc[3] - 6) * scale)],
        fill=(0, 0, 0, 255),
        width=stroke_inner,
    )

    for y in (26, 36, 46):
        draw.line(
            [(24 * scale, y * scale), (42 * scale, y * scale)],
            fill=(0, 0, 0, 255),
            width=stroke_inner,
        )

    cx, cy, radius = 66 * scale, 66 * scale, 18 * scale
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        outline=(0, 0, 0, 255),
        width=stroke,
    )
    draw.line(
        [
            (cx + radius * 0.65, cy + radius * 0.65),
            (cx + radius * 1.45, cy + radius * 1.45),
        ],
        fill=(0, 0, 0, 255),
        width=max(stroke, stroke + 1),
    )
    return img


def main() -> None:
    outputs = [
        (22, ROOT / 'resources' / 'icon-tray-template.png'),
        (44, ROOT / 'resources' / 'icon-tray-template@2x.png'),
    ]
    for size, path in outputs:
        draw_glyph(size).save(path)
        print(f'wrote {path.relative_to(ROOT)} ({size}x{size})')


if __name__ == '__main__':
    main()
