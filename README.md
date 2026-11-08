# Timbro

Web app personale per segnare, giorno per giorno, **come vado al lavoro** (pullman, macchina, altro)
e **quante corse in pullman** faccio, e capire se l'abbonamento annuale conviene rispetto al carnet.

App: **https://mxalfaxl.github.io/timbro/**

## Come si usa

- Si apre sempre su **oggi**. Di base è giorno di lavoro: un tocco su 🚌 Pullman (andata e ritorno),
  🚗 Macchina o 🤝 Altro e la giornata è registrata. Se non lavoro, «Non lavoro».
- Le corse in pullman fuori dal lavoro si aggiungono col **+** («Altre corse in pullman»).
- Frecce, settimana in alto o **Calendario** per tornare ai giorni passati; i giorni dimenticati sono in rosso.
- **Conti**: quanto ho risparmiato (o perso) con l'annuale rispetto al carnet, il ritmo di corse a settimana
  rispetto al pareggio, come vado al lavoro e il dettaglio mese per mese.
- **Impostazioni**: prezzo dell'abbonamento e date, prezzi di biglietto, carnet e mensile,
  collegamento a GitHub, indirizzi per Comandi Rapidi, esportazione CSV.

## I conti

- Una corsa = un biglietto che avrei timbrato. Col carnet (14 € per 10) costa 1,40 €.
- Quota dell'annuale = prezzo × giorni contati ÷ durata dell'abbonamento (365 giorni se non ci sono le date).
- Senza abbonamento, ogni mese compro la cosa che costa meno tra carnet e mensile (37 €).
- Pareggio: prezzo dell'annuale ÷ 1,40 € (con 210 € sono 150 corse l'anno, circa 2,9 a settimana;
  al prezzo pieno di 370 € ne servono 265, circa 5,1 a settimana).
- Nei Conti: classifica di tutte le opzioni (annuale 210 €, annuale 370 €, mensile, carnet, singolo)
  al ritmo attuale, grafico «dove conviene cosa» da toccare per provare altri ritmi, scenari di rinnovo.

## Dove stanno i dati

- Sul dispositivo (localStorage), così l'app è istantanea e funziona anche senza rete.
- Nel repository **privato** `MxalfaxL/timbro-dati`, file `dati.json`: ogni modifica è un commit,
  quindi c'è lo storico completo. Ogni dispositivo si collega una volta con un token GitHub
  fine-grained limitato a quel solo repository (permesso *Contents: Read and write*).
- Questo repository (il codice) è pubblico perché GitHub Pages gratuito lo richiede: non contiene dati.

## Comandi Rapidi (iPhone)

Un comando con l'azione «Apri URL» registra la giornata di oggi con un tocco o con Siri:

| Indirizzo | Cosa registra |
|---|---|
| `https://mxalfaxl.github.io/timbro/?registra=pullman` | lavoro in pullman, andata e ritorno |
| `https://mxalfaxl.github.io/timbro/?registra=pullman1` | lavoro in pullman, una corsa |
| `https://mxalfaxl.github.io/timbro/?registra=macchina` | lavoro in macchina |
| `https://mxalfaxl.github.io/timbro/?registra=altro` | lavoro con altro mezzo |
| `https://mxalfaxl.github.io/timbro/?registra=nonlavoro` | non lavoro |
| `https://mxalfaxl.github.io/timbro/?registra=corsa` | una corsa extra in pullman (+1) |

L'URL si apre in Safari, che ha una memoria separata dall'app sulla Home: anche lì va collegato
il token una volta. I dati si ritrovano poi ovunque grazie a GitHub.

## Sviluppo

- `index.html` interfaccia, `motore.js` logica pura (date, giornate, unione dati, conti),
  `sincro.js` lettura/scrittura su GitHub, `sw.js` cache offline, `strumenti/disegna_icone.py` icone.
- Test: `node --test test/*.test.mjs`
- Prova locale: `python3 -m http.server 8740` e apri http://localhost:8740
  (in locale il service worker non si registra).
- A ogni rilascio: `python3 strumenti/versione.py AAAA.MM.GG` (versione di cache e import).
