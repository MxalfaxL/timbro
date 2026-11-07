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
  Unione tra dispositivi: vince la giornata (e le impostazioni) con `t` più recente.
- `sincro.js`: API Contents di GitHub (GET + PUT con sha; su 409 si rilegge e si riprova).
- `index.html`: interfaccia e orchestrazione (salvataggio locale immediato, sincronizzazione dopo 600 ms).
- `sw.js`: cache-first del guscio. **A ogni modifica dell'app alza `VERSIONE` in `sw.js` e
  `VERSIONE_APP` in `index.html`**, altrimenti i telefoni restano sulla versione vecchia.
- Test: `node --test test/*.test.mjs`.

## Da sapere

- Il prezzo dell'annuale è provvisorio (210 €) finché Marco non lo comunica: si cambia dall'app
  (Impostazioni) e finisce in `dati.json`, non nel codice.
- Il tracciamento parte dal 1 novembre 2026; Marco recupera i giorni dal 1 al 7 novembre a mano.
- Comandi Rapidi: `?registra=pullman|pullman1|macchina|altro|nonlavoro|corsa` registra oggi.
