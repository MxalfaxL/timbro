// Prova contro il GitHub vero, su un file a parte (prova-sincro.json) che alla fine viene cancellato.
// Uso:  GH_TOKEN=$(gh auth token --user MxalfaxL) node test/prova-dal-vivo.mjs
import assert from 'node:assert/strict';
import * as M from '../motore.js';
import { creaSincro, allinea, ErroreGit } from '../sincro.js';

const token = process.env.GH_TOKEN;
if (!token) { console.error('Serve GH_TOKEN'); process.exit(1); }
const cfg = { utente: 'MxalfaxL', repo: 'timbro-dati', token, percorso: 'prova-sincro.json' };
const s = creaSincro(cfg);

const info = await s.verifica();
console.log('repository:', info.nome, info.privato ? '(privato)' : '(PUBBLICO!)');

let letto = await s.leggi();
assert.equal(letto.dati, null, 'il file di prova non dovrebbe esistere');
console.log('file assente: ok');

const a = M.statoVuoto();
a.giorni['2026-11-02'] = { lavoro: true, mezzo: 'pullman', corseLavoro: 2, extra: 1, t: 1 };
await allinea(a, s, 'prova: primo salvataggio');
letto = await s.leggi();
assert.equal(M.corseTotali(letto.dati.giorni['2026-11-02']), 3);
console.log('scrittura e rilettura: ok, sha', letto.sha.slice(0, 7));

try { await s.scrivi(a, 'b'.repeat(40), 'prova: sha vecchio'); assert.fail('doveva rifiutare'); }
catch (e) { assert.ok(e instanceof ErroreGit && [409, 422].includes(e.stato), String(e)); console.log('sha vecchio rifiutato:', e.stato); }

const b = M.statoVuoto();
b.giorni['2026-11-03'] = { lavoro: true, mezzo: 'macchina', corseLavoro: 2, extra: 0, t: 2 };
const unito = await allinea(b, s, 'prova: secondo dispositivo');
assert.ok(unito.giorni['2026-11-02'] && unito.giorni['2026-11-03']);
console.log('unione di due dispositivi: ok');

const sbagliato = creaSincro({ ...cfg, token: 'github_pat_sbagliato' });
try { await sbagliato.leggi(); assert.fail('doveva rifiutare'); }
catch (e) { assert.equal(e.stato, 401); console.log('token sbagliato:', e.message); }

letto = await s.leggi();
await s.cancella(letto.sha, 'prova: pulizia');
assert.equal((await s.leggi()).dati, null);
console.log('file di prova cancellato. Tutto ok.');
