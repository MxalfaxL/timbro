/* Timbro — lettura e scrittura del file dati sul repository privato GitHub
   (API Contents). Il token resta sul dispositivo: passa solo nell'intestazione
   delle chiamate verso api.github.com. */

import { serializza, unisci, normalizza, canonico } from './motore.js?v=2026.11.08-3';

export class ErroreGit extends Error {
  constructor(stato, messaggio) { super(messaggio); this.name = 'ErroreGit'; this.stato = stato; }
}

function aBase64(testo) {
  const b = new TextEncoder().encode(testo);
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
const daBase64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

function spiega(stato, dettaglio) {
  if (stato === 401) return 'Token non valido o scaduto';
  if (stato === 403) return 'Il token non ha i permessi sul repository dei dati';
  if (stato === 404) return 'Repository non trovato, o il token non lo vede';
  if (stato === 409) return 'Salvataggio incrociato da un altro dispositivo';
  return `GitHub ha risposto ${stato}${dettaglio ? ': ' + dettaglio : ''}`;
}

export function creaSincro({ utente, repo, token, percorso = 'dati.json' }, fetchFn = (...a) => fetch(...a)) {
  const base = `https://api.github.com/repos/${encodeURIComponent(utente)}/${encodeURIComponent(repo)}`;

  async function chiama(metodo, url, corpo) {
    const r = await fetchFn(url, {
      method: metodo,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!r.ok) {
      let dettaglio = '';
      try { dettaglio = (await r.json()).message || ''; } catch { /* corpo vuoto */ }
      throw new ErroreGit(r.status, spiega(r.status, dettaglio));
    }
    return r.json();
  }

  const sincro = {
    async verifica() {
      const j = await chiama('GET', base);
      return { nome: j.full_name, privato: !!j.private };
    },

    /* { sha, dati } — sha e dati null se il file non esiste ancora. */
    async leggi() {
      try {
        const j = await chiama('GET', `${base}/contents/${percorso}`);
        return { sha: j.sha, dati: JSON.parse(daBase64(j.content)) };
      } catch (e) {
        if (!(e instanceof ErroreGit) || e.stato !== 404) throw e;
        await sincro.verifica();              // se manca il repo, esce di qui con l'errore giusto
        return { sha: null, dati: null };
      }
    },

    /* Scrive lo stato; con uno sha vecchio GitHub risponde 409 e si rilegge. */
    async scrivi(stato, sha, messaggio) {
      const corpo = { message: messaggio, content: aBase64(serializza(stato)) };
      if (sha) corpo.sha = sha;
      const j = await chiama('PUT', `${base}/contents/${percorso}`, corpo);
      return j.content.sha;
    },

    async cancella(sha, messaggio) {
      await chiama('DELETE', `${base}/contents/${percorso}`, { message: messaggio, sha });
    },
  };
  return sincro;
}

/* Allinea lo stato locale con GitHub: legge, unisce e, se GitHub è indietro, scrive.
   Se un altro dispositivo ha scritto nel frattempo (409), rilegge e riprova.
   Restituisce lo stato unito, che il chiamante fonde col proprio (che può essere
   cambiato mentre si aspettava la rete). */
export async function allinea(locale, sincro, messaggio, tentativi = 4) {
  for (let t = 0; ; t++) {
    const { sha, dati } = await sincro.leggi();
    const unito = dati ? unisci(locale, dati) : normalizza(locale);
    if (dati && canonico(unito) === canonico(normalizza(dati))) return unito;   // GitHub è già aggiornato
    try {
      await sincro.scrivi(unito, sha, messaggio);
      return unito;
    } catch (e) {
      if (e instanceof ErroreGit && (e.stato === 409 || e.stato === 422) && t < tentativi - 1) continue;
      throw e;
    }
  }
}
