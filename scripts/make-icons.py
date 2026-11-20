"""Renders the Isle BnB app icons (sun, palm, swell) into public/icons.

Run with:  python scripts/make-icons.py
Pillow only — no design files needed.

Strokes are drawn as dense overlapping discs rather than `ImageDraw.line` so the
curves come out smooth at every size (PIL's wide-line joins leave notches).
"""

from __future__ import annotations

import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, '..', 'public', 'icons'))

DEEP = (11, 63, 66, 255)
SAND = (250, 246, 239, 255)
SUN = (255, 196, 107, 255)
AQUA = (53, 198, 189, 255)

S = 2048


def bezier(p0, p1, p2, steps=220):
    points = []
    for i in range(steps + 1):
        t = i / steps
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t**2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t**2 * p2[1]
        points.append((x, y))
    return points


def taper(points, start_radius, end_radius):
    """Pairs each point with an interpolated radius."""
    total = len(points) - 1
    return [
        (point, start_radius + (end_radius - start_radius) * (index / total))
        for index, point in enumerate(points)
    ]


def stroke(draw, tapered_points, fill):
    for (x, y), radius in tapered_points:
        draw.ellipse([x - radius, y - radius, x + radius, y + radius], fill=fill)


def wave_points(y, amplitude, periods, steps=240):
    left, right = 0.16 * S, 0.84 * S
    points = []
    for i in range(steps + 1):
        t = i / steps
        x = left + (right - left) * t
        points.append((x, y - amplitude * math.sin(t * math.pi * 2 * periods)))
    return points


def draw_content() -> Image.Image:
    """Palm, sun and a line of swell on a transparent canvas."""
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    # Sun
    cx, cy, r = 0.295 * S, 0.30 * S, 0.094 * S
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SUN)

    # Trunk, thick at the sand and thin at the crown
    trunk = bezier((0.445 * S, 0.825 * S), (0.475 * S, 0.565 * S), (0.610 * S, 0.335 * S))
    stroke(d, taper(trunk, 0.031 * S, 0.016 * S), SAND)

    # Fronds
    tip = (0.610 * S, 0.335 * S)
    fronds = [
        ((0.850 * S, 0.300 * S), (0.750 * S, 0.215 * S), 0.017),
        ((0.752 * S, 0.140 * S), (0.700 * S, 0.205 * S), 0.016),
        ((0.545 * S, 0.150 * S), (0.608 * S, 0.182 * S), 0.016),
        ((0.380 * S, 0.290 * S), (0.505 * S, 0.225 * S), 0.017),
        ((0.660 * S, 0.125 * S), (0.648 * S, 0.205 * S), 0.014),
    ]
    for end, control, width in fronds:
        stroke(
            d,
            taper(bezier(tip, control, end), width * S, width * 0.62 * S),
            SAND,
        )

    # Swell
    stroke(d, [(p, 0.0135 * S) for p in wave_points(0.855 * S, 0.020 * S, 2)], AQUA)
    stroke(d, [(p, 0.0095 * S) for p in wave_points(0.915 * S, 0.014 * S, 2)], AQUA)

    return layer


def scaled(layer: Image.Image, scale: float) -> Image.Image:
    if scale >= 1:
        return layer
    size = int(layer.width * scale)
    small = layer.resize((size, size), Image.LANCZOS)
    canvas = Image.new('RGBA', (layer.width, layer.height), (0, 0, 0, 0))
    offset = (layer.width - size) // 2
    canvas.paste(small, (offset, offset))
    return canvas


def render(layer: Image.Image, size: int, rounded: bool) -> Image.Image:
    if rounded:
        mask = Image.new('L', (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, S, S], radius=int(S * 0.23), fill=255
        )
        base = Image.new('RGBA', (S, S), DEEP)
        base.putalpha(mask)
    else:
        base = Image.new('RGBA', (S, S), DEEP)
    base.alpha_composite(layer)
    return base.resize((size, size), Image.LANCZOS)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    content = draw_content()

    render(scaled(content, 0.92), 192, rounded=True).save(
        os.path.join(OUT, 'icon-192.png')
    )
    render(scaled(content, 0.92), 512, rounded=True).save(
        os.path.join(OUT, 'icon-512.png')
    )
    render(scaled(content, 0.72), 512, rounded=False).save(
        os.path.join(OUT, 'icon-maskable-512.png')
    )
    render(scaled(content, 0.84), 180, rounded=False).save(
        os.path.join(OUT, 'apple-touch-icon.png')
    )
    print('icons written to', OUT)


if __name__ == '__main__':
    main()
