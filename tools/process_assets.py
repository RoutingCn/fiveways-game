from pathlib import Path
from PIL import Image
import shutil


ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "board": Path(r"C:\Users\Administrator\Downloads\棋盘图.png"),
    "wood": Path(r"C:\Users\Administrator\Downloads\树棍棋子.png"),
    "stone": Path(r"C:\Users\Administrator\Downloads\石子棋子 (2).png"),
}


def cutout(
    source: Path,
    target: Path,
    crop_box: tuple[float, float, float, float],
    size: int = 512,
) -> None:
    image = Image.open(source).convert("RGBA")
    left, top, right, bottom = crop_box
    image = image.crop(
        (
            round(image.width * left),
            round(image.height * top),
            round(image.width * right),
            round(image.height * bottom),
        )
    )
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            darkness = max(0, 255 - min(r, g, b))
            alpha = max(0, min(255, round((darkness - 28) * 8.5)))
            pixels[x, y] = (r, g, b, alpha)

    bbox = image.getbbox()
    if not bbox:
        raise ValueError(f"No opaque subject found in {source}")

    cropped = image.crop(bbox)
    ratio = min((size * 0.82) / cropped.width, (size * 0.82) / cropped.height)
    resized = cropped.resize(
        (round(cropped.width * ratio), round(cropped.height * ratio)),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGBA", (size, size))
    canvas.alpha_composite(
        resized,
        ((size - resized.width) // 2, (size - resized.height) // 2),
    )
    canvas.save(target)


def main() -> None:
    assets = ROOT / "assets"
    assets.mkdir(exist_ok=True)
    shutil.copy2(SOURCES["board"], assets / "board.png")
    cutout(SOURCES["wood"], assets / "wood-piece.png", (0.36, 0.16, 0.63, 0.89))
    cutout(SOURCES["stone"], assets / "stone-piece.png", (0.28, 0.20, 0.70, 0.84))


if __name__ == "__main__":
    main()
