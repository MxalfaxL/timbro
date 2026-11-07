// Sincronizzazione contro un finto GitHub in memoria:  node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../motore.js';
import { creaSincro, allinea, ErroreGit } from '../sincro.js';

/* Finto GitHub: un repository con un file, sha che cambia a ogni scrittura,
   409 se lo sha non corrisponde, come l'API vera. */
function fintoGitHub() {
  const repo = { file: null, sha: null, commit: [], prima: null };
  let n = 0;
  const risposta = (stato, corpo) => ({ ok: stato < 300, status: stato, json: async () => corpo });
  const fetchFn = async (url, opz) => {
    if (repo.prima) { const f = repo.prima; repo.prima = null; await f(); }   // un altro dispositivo si inserisce
    const contenuto = url.includes('/contents/');
    if (opz.headers.Authorization !== 'Bearer buono') return risposta(401, { message: 'Bad credentials' });
    if (!contenuto) return risposta(200, { full_name: 'MxalfaxL/timbro-dati', private: true });
    if (opz.method === 'GET') {
      if (!repo.file) return risposta(404, { message: 'Not Found' });
      return risposta(200, { sha: repo.sha, content: Buffer.from(repo.file).toString('base64') });
    }
    if (opz.method === 'PUT') {
      const corpo = JSON.parse(opz.body);
      if (repo.file && corpo.sha !== repo.sha) return risposta(409, { message: 'does not match' });
      if (!repo.file && corpo.sha) return risposta(422, { message: 'sha wasn\'t supplied' });
      repo.file = Buffer.from(corpo.content, 'base64').toString('utf8');
      repo.sha = 'sha' + (++n);
      repo.commit.push(corpo.message);
      return risposta(200, { content: { sha: repo.sha } });
    }
    return risposta(405, {});
  };
  return { repo, fetchFn };
}

const cfg = { utente: 'MxalfaxL', repo: 'timbro-dati', token: 'buono' };
const giorno = (mezzo, t) => ({ lavoro: true, mezzo, corseLavoro: 2, extra: 0, t });

test('primo salvataggio crea il file, il secondo non scrive se non cambia nulla', async () => {
  const { repo, fetchFn } = fintoGitHub();
  const s = creaSincro(cfg, fetchFn);
  const locale = M.statoVuoto();
  locale.giorni['2026-11-02'] = giorno('pullman', 1);
  await allinea(locale, s, 'primo');
  assert.equal(repo.commit.length, 1);
  assert.equal(JSON.parse(repo.file).giorni['2026-11-02'].mezzo, 'pullman');
  await allinea(locale, s, 'di nuovo');
  assert.equal(repo.commit.length, 1);
});

test('due dispositivi: le giornate si uniscono, vince la modifica più recente', async () => {
  const { repo, fetchFn } = fintoGitHub();
  const s = creaSincro(cfg, fetchFn);
  const telefono = M.statoVuoto(), computer = M.statoVuoto();
  telefono.giorni['2026-11-02'] = giorno('pullman', 10);
  telefono.giorni['2026-11-03'] = giorno('pullman', 10);
  computer.giorni['2026-11-03'] = giorno('macchina', 20);    // corretto dopo sul computer
  computer.giorni['2026-11-04'] = giorno('altro', 20);
  await allinea(telefono, s, 'telefono');
  const unito = await allinea(computer, s, 'computer');
  assert.equal(unito.giorni['2026-11-02'].mezzo, 'pullman');
  assert.equal(unito.giorni['2026-11-03'].mezzo, 'macchina');
  assert.equal(unito.giorni['2026-11-04'].mezzo, 'altro');
  const telefonoDopo = await allinea(telefono, s, 'telefono');
  assert.equal(M.canonico(telefonoDopo), M.canonico(unito));
  assert.equal(repo.commit.length, 2);
});

test('scrittura incrociata: 409, rilettura e nessuna giornata persa', async () => {
  const { repo, fetchFn } = fintoGitHub();
  const s = creaSincro(cfg, fetchFn);
  const base = M.statoVuoto();
  base.giorni['2026-11-02'] = giorno('pullman', 1);
  await allinea(base, s, 'base');
  const computer = M.normalizza(base);
  computer.giorni['2026-11-05'] = giorno('macchina', 50);
  const telefono = M.normalizza(base);
  telefono.giorni['2026-11-06'] = giorno('pullman', 60);
  // mentre il telefono ha appena letto, il computer scrive
  let letture = 0;
  const conIntruso = async (url, opz) => {
    if (opz.method === 'GET' && url.includes('/contents/') && ++letture === 1) {
      const r = await fetchFn(url, opz);
      await allinea(computer, creaSincro(cfg, fetchFn), 'computer');
      return r;
    }
    return fetchFn(url, opz);
  };
  const unito = await allinea(telefono, creaSincro(cfg, conIntruso), 'telefono');
  const remoto = JSON.parse(repo.file);
  for (const k of ['2026-11-02', '2026-11-05', '2026-11-06']) {
    assert.ok(remoto.giorni[k], `manca ${k} su GitHub`);
    assert.ok(unito.giorni[k], `manca ${k} nello stato unito`);
  }
  assert.deepEqual(repo.commit, ['base', 'computer', 'telefono']);
});

test('token sbagliato: ErroreGit 401 con messaggio chiaro', async () => {
  const { fetchFn } = fintoGitHub();
  const s = creaSincro({ ...cfg, token: 'sbagliato' }, fetchFn);
  await assert.rejects(allinea(M.statoVuoto(), s, 'x'), e => e instanceof ErroreGit && e.stato === 401 && /Token/.test(e.message));
});

test('caratteri accentati e lapidi arrivano intatti', async () => {
  const { repo, fetchFn } = fintoGitHub();
  const s = creaSincro(cfg, fetchFn);
  const st = M.statoVuoto();
  st.giorni['2026-11-02'] = { vuoto: true, t: 5 };
  st.impostazioni = { ...st.impostazioni, nota: 'perché è così', t: 3 };
  await allinea(st, s, 'accenti: già, così');
  const { dati } = await s.leggi();
  assert.equal(dati.impostazioni.nota, 'perché è così');
  assert.deepEqual(dati.giorni['2026-11-02'], { vuoto: true, t: 5 });
  assert.equal(repo.commit[0], 'accenti: già, così');
});
