# Timbro — note per Claude

App personale di Marco: traccia ogni giorno come va al lavoro (pullman / macchina / altro) e le corse
in pullman, per decidere al rinnovo se l'abbonamento annuale conviene rispetto al carnet.
Tutto in italiano: interfaccia, codice, commenti, messaggi di commit.

## Dove sta

- Codice: `MxalfaxL/timbro` (pubblico), pubblicato su https://mxalfaxl.github.io/timbro/ da `main`, cartella `/`.
- Dati: `MxalfaxL/timbro-dati` (privato), file `dati.json`, scritto solo dall'app.
- Account GitHub: **MxalfaxL** (personale), non MarcoRenais. Per non cambiare l'account attivo di `gh`:
  `GH_TOKEN=$(gh auth token --user MxalfaxL) gh ...`. Autore dei commit:
  `MxalfaxL <102927637+MxalfaxL@users.noreply.github.com>` (già nella config locale del repo).

## Struttura

- `motore.js`: logica pura, senza DOM. Date come stringhe `AAAA-MM-GG` in ora locale.
  Giornata `{lavoro, mezzo, corseLavoro: 1|2, extra, t}`; svuotata = lapide `{vuoto: true, t}`.
  `corseLavoro` = tratte del tragitto di lavoro (2 andata e ritorno, 1 un viaggio solo) per pullman e
  macchina: per il pullman sono corse da pagare (`corseLavoro()`), per la macchina statistica (`viaggiMacchina()`).
  Unione tra dispositivi: vince la giornata (e le impostazioni) con `t` più recente.
- `sincro.js`: API Contents di GitHub (GET + PUT con sha; su 409 si rilegge e si riprova).
- `index.html`: interfaccia e orchestrazione (salvataggio locale immediato, sincronizzazione dopo 600 ms).
- `sw.js`: cache-first del guscio (scaricato con `cache: 'reload'`). **A ogni modifica dell'app
  lancia `python3 strumenti/versione.py AAAA.MM.GG[-n]`**: alza insieme `VERSIONE` in `sw.js`,
  `VERSIONE_APP` e i `?v=` degli import in `index.html` e `sincro.js`. Senza, i telefoni restano sulla
  versione vecchia o mescolano una pagina nuova con un modulo vecchio (successo l'8/11: Conti vuota).
- Icone: `strumenti/disegna_icone.py`; se cambiano, alza anche il `?v=` delle icone in
  `index.html` e `manifest.webmanifest`.
- Test: `node --test test/*.test.mjs`.

## Da sapere

- Prezzi in `dati.json` (Impostazioni dell'app), non nel codice: annuale pagato 210 € in promozione,
  prezzo pieno 370 € (`prezzoListino`), carnet 14 €/10, singolo 1,50 €, mensile 37 €.
- Conti: `conti().opzioni` confronta annuale, prezzo pieno, mensile, carnet e singolo (costo l'anno al
  ritmo attuale, costo nel periodo, soglia in corse a settimana). Colori del grafico validati col
  validatore dataviz (chiaro e scuro): carnet blu, annuale arancio (pieno = tratteggiato), mensile verde acqua.
- `#calendario`, `#conti`, `#impostazioni` nell'indirizzo aprono quella pagina.
- Navigazione fino a un anno nel futuro (`limiteFuturo()`); `conti()` e i riepiloghi contano solo fino a oggi.
- «Tira giù per aggiornare» fatto a mano (la web app su iPhone non ce l'ha): `sincronizza()` +
  `reg.update()`; se c'è una versione nuova ricarica la pagina.
- Il tracciamento parte dal 1 novembre 2026.
- Comandi Rapidi: `?registra=pullman|pullman1|macchina|macchina1|altro|nonlavoro|corsa` registra oggi.
