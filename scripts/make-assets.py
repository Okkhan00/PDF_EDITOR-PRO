#!/usr/bin/env python3
"""Generates launcher icons + splash screens for PdfEdit Pro (needs Pillow).
Run once; outputs are committed in android/app/src/main/res."""
import os, glob
from PIL import Image, ImageDraw, ImageFont

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
ACCENT = (194, 65, 12)       # app accent #c2410c
PAPER  = (244, 241, 236)     # app paper  #f4f1ec
INK    = (26, 29, 31)

def doc_glyph(size, with_bg=None):
    """Document-with-pencil glyph on a transparent (or coloured) square. Content sits in the central ~60%."""
    S = size * 4
    im = Image.new('RGBA', (S, S), with_bg or (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    u = S / 100.0
    # page
    x0, y0, x1, y1 = 31*u, 22*u, 69*u, 78*u
    fold = 12*u
    d.polygon([(x0, y0), (x1-fold, y0), (x1, y0+fold), (x1, y1), (x0, y1)], fill=(255, 255, 255, 255))
    d.polygon([(x1-fold, y0), (x1, y0+fold), (x1-fold, y0+fold)], fill=(226, 214, 200, 255))
    # text lines
    for i, (w, yy) in enumerate([(24, 42), (24, 49), (16, 56)]):
        d.rounded_rectangle([36*u, yy*u, (36+w)*u, (yy+3)*u], radius=1.5*u, fill=(*ACCENT, 255))
    # pencil (diagonal, bottom-right)
    import math
    def rot(px, py, cx, cy, a):
        c, s = math.cos(a), math.sin(a)
        return (cx + (px-cx)*c - (py-cy)*s, cy + (px-cx)*s + (py-cy)*c)
    a = math.radians(40)
    cx, cy = 62*u, 66*u
    body = [(-4*u, -16*u), (4*u, -16*u), (4*u, 8*u), (0, 15*u), (-4*u, 8*u)]
    pts = [rot(cx+px, cy+py, cx, cy, a) for px, py in body]
    d.polygon(pts, fill=(*INK, 255))
    tip = [rot(cx+px, cy+py, cx, cy, a) for px, py in [(-4*u, 8*u), (4*u, 8*u), (0, 15*u)]]
    d.polygon(tip, fill=(245, 200, 140, 255))
    band = [rot(cx+px, cy+py, cx, cy, a) for px, py in [(-4*u, -16*u), (4*u, -16*u), (4*u, -11*u), (-4*u, -11*u)]]
    d.polygon(band, fill=(*ACCENT, 255))
    # thin outline so the pencil reads on the white page
    d.line(pts + [pts[0]], fill=(255, 255, 255, 255), width=int(1.2*u), joint='curve')
    return im.resize((size, size), Image.LANCZOS)

def save(im, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path)

dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in dens.items():
    base = os.path.join(RES, 'mipmap-' + name)
    # adaptive foreground (108dp canvas)
    save(doc_glyph(int(108*k)), os.path.join(base, 'ic_launcher_foreground.png'))
    # legacy icons (48dp)
    n = int(48*k)
    square = Image.new('RGBA', (n, n), (*ACCENT, 255))
    gs = int(n*1.25)
    g = doc_glyph(gs)
    square.alpha_composite(g.crop(((gs-n)//2, (gs-n)//2, (gs-n)//2+n, (gs-n)//2+n)))
    mask = Image.new('L', (n*4, n*4), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, n*4-1, n*4-1], radius=int(n*4*0.18), fill=255)
    rounded = square.copy(); rounded.putalpha(mask.resize((n, n), Image.LANCZOS))
    save(rounded, os.path.join(base, 'ic_launcher.png'))
    cm = Image.new('L', (n*4, n*4), 0)
    ImageDraw.Draw(cm).ellipse([0, 0, n*4-1, n*4-1], fill=255)
    circ = square.copy(); circ.putalpha(cm.resize((n, n), Image.LANCZOS))
    save(circ, os.path.join(base, 'ic_launcher_round.png'))

with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w') as f:
    f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#C2410C</color>\n</resources>\n')

# ---- splash: paper background, icon tile, app name ----
def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf']:
        if os.path.exists(p): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def splash(w, h):
    im = Image.new('RGB', (w, h), PAPER)
    m = min(w, h)
    tile = int(m * 0.30)
    t = Image.new('RGBA', (tile*4, tile*4), (0, 0, 0, 0))
    ImageDraw.Draw(t).rounded_rectangle([0, 0, tile*4-1, tile*4-1], radius=int(tile*4*0.22), fill=(*ACCENT, 255))
    t = t.resize((tile, tile), Image.LANCZOS)
    gs = int(tile*1.25)
    g = doc_glyph(gs)
    t.alpha_composite(g.crop(((gs-tile)//2, (gs-tile)//2, (gs-tile)//2+tile, (gs-tile)//2+tile)))
    tx, ty = (w - tile)//2, int(h*0.5 - tile*0.75)
    im.paste(t, (tx, ty), t)
    d = ImageDraw.Draw(im)
    f = font(int(m*0.075))
    text = 'PdfEdit Pro'
    bb = d.textbbox((0, 0), text, font=f)
    d.text(((w-(bb[2]-bb[0]))//2, ty + tile + int(m*0.05)), text, font=f, fill=INK)
    return im

for p in glob.glob(os.path.join(RES, 'drawable*', 'splash.png')):
    w, h = Image.open(p).size
    splash(w, h).save(p)
print('assets generated')
