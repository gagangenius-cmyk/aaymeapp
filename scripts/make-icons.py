"""Builds the app icon, adaptive icon, splash, favicon and in-app wordmark from the AAYME wordmark artwork.

  python scripts/make-icons.py path/to/aayme-wordmark.png [out_dir]

The artwork is the red "aa" + black "yme" wordmark on a light background (the larger and sharper, the better; 1500px wide or more).
The icon uses the red "aa" mark alone, the splash and the in-app logo use the whole wordmark.
"""
import os
import sys
from PIL import Image

src = sys.argv[1]
out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'assets')
os.makedirs(out, exist_ok=True)

im = Image.open(src).convert('RGB')
px = im.load()
w, h = im.size

# the light background becomes transparent; the ink keeps its colour
rgba = Image.new('RGBA', im.size)
rp = rgba.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        lum = (r + g + b) / 3
        a = 0 if lum > 238 else 255 if lum < 200 else int((238 - lum) / 38 * 255)
        rp[x, y] = (r, g, b, a)
box = rgba.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
word = rgba.crop(box)

# the mark = everything left of the first dark (black) ink column
ww, wh = word.size
wp = word.load()
cut = ww
for x in range(ww):
    if any(wp[x, y][3] > 200 and wp[x, y][0] < 90 and wp[x, y][1] < 90 for y in range(wh)):
        cut = x
        break
mark = word.crop((0, 0, max(cut - 4, 1), wh))
mark = mark.crop(mark.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())


def fit(img, size, frac):
    s = size * frac / max(img.size)
    return img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)


def centred(img, size, bg=None):
    c = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    c.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return c


centred(fit(mark, 1024, 0.62), 1024, (255, 255, 255, 255)).convert('RGB').save(os.path.join(out, 'icon.png'))
centred(fit(mark, 1024, 0.50), 1024).save(os.path.join(out, 'android-icon-foreground.png'))
Image.new('RGBA', (1024, 1024), (255, 255, 255, 255)).convert('RGB').save(os.path.join(out, 'android-icon-background.png'))
mono = fit(mark, 1024, 0.50)
black = Image.new('RGBA', mono.size, (0, 0, 0, 255))
black.putalpha(mono.getchannel('A'))
centred(black, 1024).save(os.path.join(out, 'android-icon-monochrome.png'))
centred(fit(mark, 96, 0.8), 96, (255, 255, 255, 255)).convert('RGB').save(os.path.join(out, 'favicon.png'))
centred(fit(word, 1024, 0.62), 1024).save(os.path.join(out, 'splash-icon.png'))
fit(word, 900, 1.0).save(os.path.join(out, 'logo-wordmark.png'))
print('wrote icon, adaptive icon (3), favicon, splash and logo-wordmark to', os.path.abspath(out))
