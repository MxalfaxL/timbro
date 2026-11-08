"""Alza la versione di Timbro in tutti i punti che devono cambiare insieme.

Uso:  python3 strumenti/versione.py 2026.11.09        (dalla cartella del progetto)

Tocca: VERSIONE in sw.js (nuova cache offline), VERSIONE_APP in index.html, e il ?v=
degli import di motore.js e sincro.js (in index.html e sincro.js), così un browser non
mescola mai una pagina nuova con un modulo vecchio preso dalla sua cache.
"""
import re
import sys
from pathlib import Path

VERSIONE = r"\d{4}\.\d{2}\.\d{2}(?:-\d+)?"


def main():
    if len(sys.argv) != 2 or not re.fullmatch(VERSIONE, sys.argv[1]):
        sys.exit("uso: python3 strumenti/versione.py AAAA.MM.GG[-n]")
    nuova = sys.argv[1]
    cartella = Path(__file__).resolve().parent.parent
    regole = {
        "sw.js": [(rf"const VERSIONE = '{VERSIONE}'", f"const VERSIONE = '{nuova}'")],
        "index.html": [(rf"const VERSIONE_APP = '{VERSIONE}'", f"const VERSIONE_APP = '{nuova}'"),
                       (rf"(motore|sincro)\.js\?v={VERSIONE}", rf"\1.js?v={nuova}")],
        "sincro.js": [(rf"motore\.js\?v={VERSIONE}", f"motore.js?v={nuova}")],
    }
    for nome, sostituzioni in regole.items():
        p = cartella / nome
        testo = p.read_text()
        for cerca, metti in sostituzioni:
            testo, n = re.subn(cerca, metti, testo)
            if n == 0:
                sys.exit(f"{nome}: non trovo {cerca}")
            print(f"{nome}: {n} × → {nuova}")
        p.write_text(testo)


if __name__ == "__main__":
    main()
