"""Disegna le icone di Timbro (180, 192, 512 px): un pullman visto di fronte, su fondo
arancio sfumato, con il bollino verde del "timbrato".

Uso:  python3 strumenti/disegna_icone.py   (dalla cartella del progetto, serve Pillow)
Si disegna a 2048 px e si riduce, per avere bordi morbidi. Il disegno sta nell'80%
centrale, così l'icona regge anche il ritaglio "maskable" di Android.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

F = 2                       # le coordinate sono pensate su 1024, si disegna al doppio
LATO = 1024 * F
ARANCIO_CHIARO = (255, 146, 72)   # anche nella testata (index.html, #fondoMarchio)
ARANCIO_SCURO = (214, 72, 14)
BIANCO = (255, 255, 255, 255)
LAVAGNA = (35, 49, 63, 255)
FARO = (255, 201, 74, 255)
INSEGNA = (255, 227, 209, 255)
VERDE = (47, 158, 68, 255)


def s(*v):
    return tuple(int(x * F) for x in v)


def sfondo():
    """Sfumatura diagonale dall'arancio chiaro (in alto a sinistra) allo scuro."""
    g = Image.linear_gradient("L").resize((LATO * 2, LATO * 2)).rotate(-45, resample=Image.BICUBIC)
    g = g.crop((LATO // 2, LATO // 2, LATO // 2 + LATO, LATO // 2 + LATO))
    chiaro = Image.new("RGBA", (LATO, LATO), ARANCIO_CHIARO + (255,))
    scuro = Image.new("RGBA", (LATO, LATO), ARANCIO_SCURO + (255,))
    return Image.composite(scuro, chiaro, g)


def pullman():
    st = Image.new("RGBA", (LATO, LATO), (0, 0, 0, 0))
    d = ImageDraw.Draw(st)
    x0, x1, y0, y1 = 236, 756, 170, 772           # carrozzeria
    # ruote (sotto la carrozzeria)
    d.rounded_rectangle(s(286, y1 - 30, 380, y1 + 62), 28 * F, fill=LAVAGNA)
    d.rounded_rectangle(s(612, y1 - 30, 706, y1 + 62), 28 * F, fill=LAVAGNA)
    # specchietti
    d.rounded_rectangle(s(x0 - 46, 300, x0 - 6, 410), 18 * F, fill=LAVAGNA)
    d.rounded_rectangle(s(x1 + 6, 300, x1 + 46, 410), 18 * F, fill=LAVAGNA)
    d.rectangle(s(x0 - 10, 318, x0 + 4, 330), fill=LAVAGNA)
    d.rectangle(s(x1 - 4, 318, x1 + 10, 330), fill=LAVAGNA)
    # carrozzeria
    d.rounded_rectangle(s(x0, y0, x1, y1), 112 * F, fill=BIANCO)
    # insegna della linea
    d.rounded_rectangle(s(366, 212, 626, 266), 27 * F, fill=INSEGNA)
    for i, cx in enumerate((416, 456, 496, 536, 576)):
        d.ellipse(s(cx - 9, 230, cx + 9, 248), fill=ARANCIO_SCURO + (255,) if i != 2 else ARANCIO_CHIARO + (255,))
    # parabrezza con riflesso
    vetro = (282, 300, 710, 548)
    d.rounded_rectangle(s(*vetro), 48 * F, fill=LAVAGNA)
    riflesso = Image.new("RGBA", (LATO, LATO), (0, 0, 0, 0))
    dr = ImageDraw.Draw(riflesso)
    dr.polygon([s(560, 300), s(640, 300), s(500, 548), s(420, 548)], fill=(255, 255, 255, 34))
    dr.polygon([s(662, 300), s(690, 300), s(550, 548), s(522, 548)], fill=(255, 255, 255, 22))
    maschera = Image.new("L", (LATO, LATO), 0)
    ImageDraw.Draw(maschera).rounded_rectangle(s(*vetro), 48 * F, fill=255)
    st.paste(riflesso, (0, 0), Image.composite(riflesso, Image.new("RGBA", (LATO, LATO)), maschera).split()[3])
    # fari e griglia
    for cx in (336, 656):
        d.ellipse(s(cx - 42, 618, cx + 42, 702), fill=FARO)
        d.ellipse(s(cx - 16, 636, cx + 8, 660), fill=(255, 255, 255, 220))
    for y in (636, 660, 684):
        d.rounded_rectangle(s(424, y - 7, 568, y + 7), 7 * F, fill=(222, 226, 230, 255))
    # paraurti
    d.rounded_rectangle(s(266, 722, 726, 758), 18 * F, fill=(222, 226, 230, 255))
    return st


def ombra(strato, dy=26, raggio=22, alfa=90):
    a = strato.split()[3].point(lambda v: alfa if v else 0)
    o = Image.new("RGBA", strato.size, (110, 30, 0, 0))
    o.putalpha(a)
    o = o.filter(ImageFilter.GaussianBlur(raggio * F))
    out = Image.new("RGBA", strato.size, (0, 0, 0, 0))
    out.paste(o, (0, dy * F))
    return out


def bollino():
    st = Image.new("RGBA", (LATO, LATO), (0, 0, 0, 0))
    d = ImageDraw.Draw(st)
    cx, cy, r = 768, 768, 116
    d.ellipse(s(cx - r - 16, cy - r - 16, cx + r + 16, cy + r + 16), fill=BIANCO)
    d.ellipse(s(cx - r, cy - r, cx + r, cy + r), fill=VERDE)
    punti = [s(cx - 52, cy + 4), s(cx - 14, cy + 42), s(cx + 56, cy - 36)]
    d.line(punti, fill=BIANCO, width=31 * F, joint="curve")
    for p in (punti[0], punti[2]):
        d.ellipse((p[0] - 15 * F, p[1] - 15 * F, p[0] + 15 * F, p[1] + 15 * F), fill=BIANCO)
    return st


def main():
    cartella = Path(__file__).resolve().parent.parent
    img = sfondo()
    bus = pullman()
    img.alpha_composite(ombra(bus))
    img.alpha_composite(bus)
    b = bollino()
    img.alpha_composite(ombra(b, dy=14, raggio=14, alfa=70))
    img.alpha_composite(b)
    finale = img.convert("RGB")
    for n in (180, 192, 512, 1024):
        nome = f"icona-{n}.png" if n != 1024 else "strumenti/icona-grande.png"
        finale.resize((n, n), Image.LANCZOS).save(cartella / nome, optimize=True)
    print("icone scritte in", cartella)


if __name__ == "__main__":
    main()
