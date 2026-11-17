# Timbro

Web app personale per segnare, giorno per giorno, **come vado al lavoro** (pullman, macchina, altro)
e **quante corse in pullman** faccio, e capire se l'abbonamento annuale conviene rispetto al carnet.

App: **https://mxalfaxl.github.io/timbro/**

## Come si usa

- Si apre sempre su **oggi**. Di base è giorno di lavoro: un tocco su 🚌 Pullman (andata e ritorno),
  🚗 Macchina o 🤝 Altro e la giornata è registrata. Se non lavoro, «Non lavoro».
- Pullman, macchina e altro hanno sotto la scelta «Andata e ritorno» o un viaggio solo (per i giorni in cui
  si va e si torna in date diverse, per esempio dormendo fuori).
- Le corse in pullman fuori dal lavoro si aggiungono col **+** («Altre corse in pullman»).
- Frecce, settimana in alto o **Calendario** per tornare ai giorni passati; i giorni dimenticati sono in rosso.
- **Dove hai lavorato**: sotto il mezzo scegli la sede (VSL, Mestre, DL). Di base il giro è
  Casa → sede → Casa (o solo andata con «un viaggio solo»); con «Più tappe» si compone a mano un giro
  qualsiasi, anche con partenza e arrivo diversi (es. Casa → Mestre → DL → Casa, oppure VSL → DL → Casa).
  Da lì l'app conta i km e, in macchina, la benzina.
- Si può andare anche **nel futuro** (fino a un anno) e segnare in anticipo: quei giorni entrano nei conti
  solo quando arrivano.
- **Tira giù** dall'alto della pagina per aggiornare a mano i dati e, se c'è, la versione nuova dell'app.
  I dati si aggiornano comunque da soli all'apertura, al ritorno dallo sfondo e dopo ogni tocco.
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

## Chilometri e benzina

- Le distanze tra Casa, VSL, Mestre e DL si inseriscono in Impostazioni → «Distanze e benzina»
  (una per coppia, uguali nei due sensi), insieme al prezzo della benzina (1,94 €/l) e ai km con un litro (13).
- Km del giorno = somma dei tratti del giro. Benzina = km × prezzo ÷ km al litro (circa 0,15 € al km).
- Nei Conti: km per lavoro, benzina spesa in macchina, benzina «risparmiata» (i km fatti in pullman
  moltiplicati per il costo al km in macchina), giorni per sede, tabella per mese. I giorni senza sede
  o con una distanza mancante sono segnalati e non contano nei km.

## Dove stanno i dati

- Sul dispositivo (localStorage), così l'app è istantanea e funziona anche senza rete.
- Nel repository **privato** `MxalfaxL/timbro-dati`, file `dati.json`: ogni modifica è un commit,
  quindi c'è lo storico completo. Ogni dispositivo si collega una volta con un token GitHub
  fine-grained limitato a quel solo repository (permesso *Contents: Read and write*).
- Questo repository (il codice) è pubblico perché GitHub Pages gratuito lo richiede: non contiene dati.

## Comandi Rapidi (iPhone)

Un comando con l'azione «Apri URL» registra la giornata di oggi con un tocco o con Siri:
(si può aggiungere la sede, per esempio `?registra=macchina&sede=mestre`; sedi: `vsl`, `mestre`, `dl`)

| Indirizzo | Cosa registra |
|---|---|
| `https://mxalfaxl.github.io/timbro/?registra=pullman` | lavoro in pullman, andata e ritorno |
| `https://mxalfaxl.github.io/timbro/?registra=pullman1` | lavoro in pullman, una corsa |
| `https://mxalfaxl.github.io/timbro/?registra=macchina` | lavoro in macchina, andata e ritorno |
| `https://mxalfaxl.github.io/timbro/?registra=macchina1` | lavoro in macchina, un viaggio solo |
| `https://mxalfaxl.github.io/timbro/?registra=altro` | lavoro con altro mezzo, andata e ritorno |
| `https://mxalfaxl.github.io/timbro/?registra=altro1` | lavoro con altro mezzo, un viaggio solo |
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
