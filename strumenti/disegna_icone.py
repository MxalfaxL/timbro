"""Disegna le icone di Timbro (180, 192, 512 px): un biglietto timbrato su fondo arancio.

Uso:  python3 strumenti/disegna_icone.py   (dalla cartella del progetto, serve Pillow)
Il disegno sta nell'80% centrale, così l'icona regge anche il ritaglio "maskable" di Android.
"""
from pathlib import Path
from PIL import Image, ImageDraw

LATO = 1024
ARANCIO = (217, 83, 15, 255)
CARTA = (255, 250, 243, 255)
INCHIOSTRO = (217, 83, 15, 255)
OMBRA = (120, 40, 0, 70)

def biglietto():
    strato = Image.new("RGBA", (LATO, LATO), (0, 0, 0, 0))
    d = ImageDraw.Draw(strato)
    l, a = 600, 360
    x0, y0 = (LATO - l) // 2, (LATO - a) // 2
    # ombra morbida sotto il biglietto
    d.rounded_rectangle((x0 + 10, y0 + 22, x0 + l + 10, y0 + a + 22), 40, fill=OMBRA)
    d.rounded_rectangle((x0, y0, x0 + l, y0 + a), 40, fill=CARTA)
    # le due tacche laterali del biglietto
    r = 34
    cy = y0 + a // 2
    d.ellipse((x0 - r, cy - r, x0 + r, cy + r), fill=(0, 0, 0, 0))
    d.ellipse((x0 + l - r, cy - r, x0 + l + r, cy + r), fill=(0, 0, 0, 0))
    # perforazione
    px = x0 + int(l * 0.72)
    for y in range(y0 + 34, y0 + a - 30, 30):
        d.rounded_rectangle((px - 5, y, px + 5, y + 16), 5, fill=INCHIOSTRO)
    # il timbro: anello con la spunta
    cx, cy2, R = x0 + int(l * 0.36), cy, 118
    d.ellipse((cx - R, cy2 - R, cx + R, cy2 + R), outline=INCHIOSTRO, width=30)
    d.line([(cx - 52, cy2 + 2), (cx - 12, cy2 + 42), (cx + 58, cy2 - 40)], fill=INCHIOSTRO, width=32, joint="curve")
    for (px2, py2) in [(cx - 52, cy2 + 2), (cx + 58, cy2 - 40)]:
        d.ellipse((px2 - 16, py2 - 16, px2 + 16, py2 + 16), fill=INCHIOSTRO)
    return strato.rotate(12, resample=Image.BICUBIC, center=(LATO // 2, LATO // 2))

def main():
    cartella = Path(__file__).resolve().parent.parent
    fondo = Image.new("RGBA", (LATO, LATO), ARANCIO)
    fondo.alpha_composite(biglietto())
    finale = fondo.convert("RGB")
    for n in (180, 192, 512):
        finale.resize((n, n), Image.LANCZOS).save(cartella / f"icona-{n}.png", optimize=True)
    print("icone scritte in", cartella)

if __name__ == "__main__":
    main()
