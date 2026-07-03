#!/usr/bin/env python3
"""Quita el fondo blanco de los logos institucionales (transparencia PNG)."""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "site-template" / "assets"

LOGOS = [
    "logo-bogota-educacion.png",
    "logo-uniminuto.png",
    "logo-uniminuto-pdf.png",
    "logo-olimpiadas-stem.png",
]


def is_background_pixel(r: int, g: int, b: int, threshold: int) -> bool:
    return r >= threshold and g >= threshold and b >= threshold


def remove_white_background(path: Path, threshold: int = 242) -> None:
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            r, g, b, _ = pixels[x, y]
            if is_background_pixel(r, g, b, threshold):
                queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            r, g, b, _ = pixels[x, y]
            if is_background_pixel(r, g, b, threshold):
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited:
            continue
        if x < 0 or x >= width or y < 0 or y >= height:
            continue
        r, g, b, _ = pixels[x, y]
        if not is_background_pixel(r, g, b, threshold):
            continue
        visited.add((x, y))
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    for x, y in visited:
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)

    img.save(path, "PNG", optimize=True)
    print(f"OK {path.name} ({len(visited)} px transparentes)")


def main() -> None:
    for name in LOGOS:
        remove_white_background(ASSETS / name)


if __name__ == "__main__":
    main()
