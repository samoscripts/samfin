#!/usr/bin/env python3
"""Generuje ikony launchera Android z frontend/public/images/samfin_logo_ico.png."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Wymagany Pillow. WSL: sudo apt install python3-pil", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "frontend/public/images/samfin_logo_ico.png"
RES = ROOT / "mobile/android/app/src/main/res"
BG = (0x11, 0x18, 0x27, 255)  # gray-900, jak sidebar

LAUNCHER = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def fit_logo(logo: Image.Image, canvas: int, ratio: float) -> Image.Image:
    max_w = int(canvas * ratio)
    scale = max_w / logo.width
    h = max(1, int(logo.height * scale))
    return logo.resize((max_w, h), Image.Resampling.LANCZOS)


def compose_square(logo: Image.Image, size: int, bg: tuple[int, ...] | None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    fitted = fit_logo(logo, size, 0.72 if bg else 0.58)
    x = (size - fitted.width) // 2
    y = (size - fitted.height) // 2
    canvas.paste(fitted, (x, y), fitted)
    return canvas


def main() -> None:
    if not SRC.is_file():
        print(f"Brak pliku: {SRC}", file=sys.stderr)
        sys.exit(1)

    logo = Image.open(SRC).convert("RGBA")

    for folder, size in LAUNCHER.items():
        out_dir = RES / folder
        out = compose_square(logo, size, BG)
        out.save(out_dir / "ic_launcher.png")
        out.save(out_dir / "ic_launcher_round.png")

    for folder, size in FOREGROUND.items():
        out = compose_square(logo, size, None)
        out.save(RES / folder / "ic_launcher_foreground.png")

    print(f"Ikony wygenerowane w {RES}/mipmap-*")


if __name__ == "__main__":
    main()
