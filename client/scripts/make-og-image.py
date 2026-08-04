"""Generate the default social share image.

    server/.venv/Scripts/python scripts/make-og-image.py     (needs Pillow)

Run from client/. Writes client/public/og-default.jpg — the og:image every
page falls back to when it has nothing more specific of its own.

WHY IT IS GENERATED RATHER THAN PICKED. Every platform that renders a link
preview crops to 1200x630; hand one of the site's own images to WhatsApp and
it centre-crops a 2000x1250 photograph to something nobody chose. Fixing the
size once here means the preview is composed rather than cropped.

WHY JPEG, when the source is WebP and the site is otherwise WebP throughout:
Facebook, WhatsApp and LinkedIn scrapers are still unreliable with WebP, and a
share image that silently fails to render is worse than one 40KB larger.

The favicon suite is NOT generated here — those files are supplied in
public/images/favicon_io/.
"""

from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parent / 'public'

SOURCE = PUBLIC / 'images' / 'contact' / 'centre-exterior.webp'
OUT = PUBLIC / 'og-default.jpg'
LOGO = PUBLIC / 'Glaze Logo Transparent.png'

WIDTH, HEIGHT = 1200, 630
INK = (27, 27, 27)  # --arch-black


def cover(image, width, height):
    """Fill the frame, cropping the overflow — never letterbox.

    Anchored slightly above centre: architectural photography puts the
    building in the upper two thirds and the foreground in the lower one, so a
    true centre crop tends to keep the pavement and lose the glazing.
    """
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.LANCZOS,
    )
    left = (resized.width - width) // 2
    top = int((resized.height - height) * 0.38)
    return resized.crop((left, top, left + width, top + height))


BAND = 132        # the brand bar along the foot
CHAMPAGNE = (167, 154, 135)


def main():
    canvas = cover(Image.open(SOURCE).convert('RGB'), WIDTH, HEIGHT - BAND)

    # ⚠ A SOLID BAND, NOT A SCRIM OVER THE PHOTOGRAPH. The first version
    # blended the whole frame toward black and dropped the mark in the corner;
    # the wordmark's taupe over a sunlit white villa was unreadable and the
    # "WINDOW SYSTEMS" sub-line disappeared entirely. Whether a logo lands on
    # something it can be read against is not a thing to leave to whatever the
    # next photograph happens to be doing in that corner.
    frame = Image.new('RGB', (WIDTH, HEIGHT), INK)
    frame.paste(canvas, (0, 0))

    # The champagne hairline the site uses wherever a dark panel meets an
    # image, so the join reads as designed rather than as a crop.
    frame.paste(Image.new('RGB', (WIDTH, 2), CHAMPAGNE), (0, HEIGHT - BAND))

    logo = Image.open(LOGO).convert('RGBA')
    target_height = BAND - 56
    scale = target_height / logo.height
    logo = logo.resize(
        (max(1, round(logo.width * scale)), target_height), Image.LANCZOS,
    )
    frame.paste(logo, (56, HEIGHT - BAND + 28), logo)

    frame.save(OUT, 'JPEG', quality=86, optimize=True)
    print(f'wrote {OUT} ({OUT.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
