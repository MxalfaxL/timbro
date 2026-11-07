// Test del motore di Timbro:  node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../motore.js';

test('date: spostamenti, lunedì, giorni tra due date, cambio ora legale', () => {
  assert.equal(M.spostaGiorni('2026-11-07', 1), '2026-11-08');
  assert.equal(M.spostaGiorni('2026-03-01', -1), '2026-02-28');
  assert.equal(M.spostaGiorni('2026-10-24', 2), '2026-10-26');      // a cavallo del cambio d'ora
  assert.equal(M.lunediDi('2026-11-07'), '2026-11-02');              // sabato
  assert.equal(M.lunediDi('2026-11-08'), '2026-11-02');              // domenica
  assert.equal(M.lunediDi('2026-11-02'), '2026-11-02');
  assert.equal(M.giorniTra('2026-11-01', '2026-11-07'), 6);
  assert.equal([...M.giorniDa('2026-10-30', '2026-11-02')].length, 4);
});

test('giornata: di base lavoro, pullman vale andata e ritorno', () => {
  let g = M.applica(undefined, { tipo: 'mezzo', valore: 'pullman', alterna: true }, 1);
  assert.deepEqual(g, { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 0, t: 1 });
  assert.equal(M.corseTotali(g), 2);
  assert.ok(M.completo(g));
  g = M.applica(g, { tipo: 'corseLavoro', valore: 1 }, 2);
  assert.equal(M.corseTotali(g), 1);
  g = M.applica(g, { tipo: 'extra', delta: 1 }, 3);
  assert.equal(M.corseTotali(g), 2);
  g = M.applica(g, { tipo: 'mezzo', valore: 'pullman', alterna: true }, 4);   // secondo tocco: toglie il mezzo
  assert.equal(g.mezzo, null);
  assert.ok(!M.completo(g));
  assert.equal(M.corseTotali(g), 1);                                           // resta la corsa extra
});

test('giornata: macchina, non lavoro, svuota, extra mai sotto zero', () => {
  let g = M.applica(undefined, { tipo: 'mezzo', valore: 'macchina' }, 1);
  assert.equal(M.corseTotali(g), 0);
  assert.ok(M.completo(g));
  g = M.applica(g, { tipo: 'lavoro', valore: false }, 2);
  assert.ok(M.completo(g));
  assert.equal(g.mezzo, 'macchina');           // conservato se si torna a "lavoro"
  g = M.applica(g, { tipo: 'extra', delta: -1 }, 3);
  assert.equal(g.extra, 0);
  g = M.applica(g, { tipo: 'extra', delta: 1 }, 4);
  assert.equal(M.corseTotali(g), 1);
  g = M.applica(g, { tipo: 'svuota' }, 5);
  assert.deepEqual(g, { vuoto: true, t: 5 });
  assert.equal(M.corseTotali(g), 0);
  assert.ok(!M.esiste(g));
  assert.ok(M.lavora(g));
});

test('comandi da URL', () => {
  const g = M.applica(undefined, M.AZIONI_URL.pullman1, 1);
  assert.equal(M.corseTotali(g), 1);
  assert.equal(M.descrivi(g), 'lavoro in pullman, una corsa');
  assert.equal(M.descrivi(M.applica(g, M.AZIONI_URL.corsa, 2)), 'lavoro in pullman, una corsa, 1 corsa extra');
  assert.equal(M.descrivi(M.applica(undefined, M.AZIONI_URL.nonlavoro, 1)), 'non lavoro');
});

test('unione: vince la giornata più recente, le lapidi cancellano', () => {
  const a = M.statoVuoto(), b = M.statoVuoto();
  a.giorni['2026-11-02'] = { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 0, t: 10 };
  b.giorni['2026-11-02'] = { lavoro: true, mezzo: 'macchina', corseLavoro: 2, extra: 0, t: 20 };
  a.giorni['2026-11-03'] = { vuoto: true, t: 30 };
  b.giorni['2026-11-03'] = { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 0, t: 25 };
  b.giorni['2026-11-04'] = { lavoro: false, mezzo: null, corseLavoro: 2, extra: 1, t: 5 };
  b.impostazioni = { ...b.impostazioni, prezzoAnnuale: 205, prezzoConfermato: true, t: 99 };
  const u = M.unisci(a, b);
  assert.equal(u.giorni['2026-11-02'].mezzo, 'macchina');
  assert.ok(!M.esiste(u.giorni['2026-11-03']));
  assert.equal(M.corseTotali(u.giorni['2026-11-04']), 1);
  assert.equal(u.impostazioni.prezzoAnnuale, 205);
  assert.equal(M.canonico(M.unisci(u, b)), M.canonico(u));       // idempotente
  assert.equal(M.canonico(M.unisci(b, a)), M.canonico(u));       // simmetrica quando i tempi sono diversi
});

test('serializza: JSON valido, una giornata per riga, rilettura identica', () => {
  const s = M.statoVuoto();
  s.giorni['2026-11-02'] = { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 0, t: 1 };
  s.giorni['2026-11-01'] = { lavoro: false, mezzo: null, corseLavoro: 2, extra: 0, t: 2 };
  const testo = M.serializza(s);
  const riletto = JSON.parse(testo);
  assert.equal(M.canonico(riletto), M.canonico(s));
  assert.ok(testo.indexOf('"2026-11-01"') < testo.indexOf('"2026-11-02"'));
  assert.equal(testo.split('\n').filter(r => /^\s+"2026-11-\d\d": \{/.test(r)).length, 2);
  assert.doesNotThrow(() => JSON.parse(M.serializza(M.statoVuoto())));
});

test('conti: pareggio, quota, carnet contro mensile', () => {
  const s = M.statoVuoto();
  // 1-7 novembre: 4 giorni pullman A/R, 1 macchina, weekend non lavoro con 1 corsa extra il sabato
  const p = { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 0, t: 1 };
  for (const k of ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-06']) s.giorni[k] = p;
  s.giorni['2026-11-05'] = { lavoro: true, mezzo: 'macchina', corseLavoro: 2, extra: 0, t: 1 };
  s.giorni['2026-11-07'] = { lavoro: false, mezzo: null, corseLavoro: 2, extra: 1, t: 1 };
  s.giorni['2026-11-08'] = { lavoro: false, mezzo: null, corseLavoro: 2, extra: 0, t: 1 };
  const c = M.conti(s, '2026-11-08');
  assert.equal(c.tot.giorni, 8);
  assert.equal(c.tot.daRegistrare, 1);        // domenica 1 novembre
  assert.equal(c.tot.corse, 9);
  assert.equal(c.tot.giorniLavoro, 5);
  assert.equal(c.tot.pullman, 4);
  assert.equal(c.tot.macchina, 1);
  assert.equal(c.tot.nonLavoro, 2);
  assert.ok(Math.abs(c.carnet - 12.6) < 1e-9);
  assert.ok(Math.abs(c.quota - 210 * 8 / 365) < 1e-9);
  assert.equal(Math.round(c.pareggioAnno), 150);
  assert.equal(c.mensileDa, 27);
  assert.ok(Math.abs(c.corseSettimana - 9) < 1e-9);    // 9 corse in 7 giorni registrati
  assert.equal(c.mesi.length, 1);
  assert.equal(c.giorniAlRinnovo, null);

  // un mese pieno di pullman: oltre 26 corse conviene il mensile
  for (const k of M.giorniDa('2026-11-09', '2026-11-30')) s.giorni[k] = p;
  const c2 = M.conti(s, '2026-11-30');
  assert.ok(c2.mesi[0].conMensile);
  assert.equal(c2.mesi[0].migliore, 37);
});

test('conti: durata vera dalle date dell\'abbonamento', () => {
  const s = M.statoVuoto();
  s.impostazioni = { ...s.impostazioni, prezzoAnnuale: 200, inizioAbbonamento: '2026-03-01', scadenzaAbbonamento: '2027-02-28' };
  const c = M.conti(s, '2026-11-07');
  assert.equal(c.durata, 365);
  assert.equal(c.giorniAlRinnovo, 113);
  assert.ok(Math.abs(c.pareggioAnno - 200 / 1.4) < 1e-9);
});
