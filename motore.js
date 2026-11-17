/* Timbro — il motore: date, giornate, unione dei dati tra dispositivi e conti.
   Niente DOM qui dentro: lo usa l'app (index.html) e lo provano i test con node
   (test/motore.test.mjs). */

export const VERSIONE_DATI = 1;
export const MEZZI = ['pullman', 'macchina', 'altro'];

/* I posti tra cui ci si muove. Casa è sempre il punto di partenza di base;
   le sedi di lavoro sono gli altri. Le distanze stanno nelle impostazioni,
   una per coppia (uguali all'andata e al ritorno). */
export const LUOGHI = Object.freeze([
  { id: 'casa', nome: 'Casa', lungo: 'Casa' },
  { id: 'vsl', nome: 'VSL', lungo: 'Venezia Santa Lucia' },
  { id: 'mestre', nome: 'Mestre', lungo: 'Venezia Mestre' },
  { id: 'dl', nome: 'DL', lungo: 'Deposito di Marghera' },
]);
export const SEDI = LUOGHI.filter(l => l.id !== 'casa');
const ID_LUOGHI = LUOGHI.map(l => l.id), ID_SEDI = SEDI.map(l => l.id);
export const nomeLuogo = id => LUOGHI.find(l => l.id === id)?.nome ?? id;
export const chiaveTratto = (a, b) => [a, b].sort().join('-');
export const COPPIE = Object.freeze([['casa', 'vsl'], ['casa', 'mestre'], ['casa', 'dl'],
                                     ['vsl', 'mestre'], ['vsl', 'dl'], ['mestre', 'dl']]);

export const IMPOSTAZIONI_BASE = Object.freeze({
  prezzoAnnuale: 210,            // quello pagato (in promozione)
  prezzoConfermato: false,
  prezzoListino: 370,            // l'annuale a prezzo pieno, se al rinnovo la promozione non c'è
  inizioAbbonamento: '',         // 'AAAA-MM-GG', facoltativo
  scadenzaAbbonamento: '',       // ultimo giorno valido, facoltativo: abilita il conto alla rovescia
  inizioTracciamento: '2026-11-01',
  singolo: 1.5,
  carnetPrezzo: 14,
  carnetCorse: 10,
  mensile: 37,
  distanze: {},                  // { 'casa-mestre': km, ... } chiave da chiaveTratto()
  prezzoBenzina: 1.94,           // € al litro
  consumo: 13,                   // km con un litro
  t: 0,
});

export const statoVuoto = () => ({ v: VERSIONE_DATI, impostazioni: { ...IMPOSTAZIONI_BASE }, giorni: {} });

/* ---------- date: sempre stringhe 'AAAA-MM-GG' in ora locale ----------
   Le Date si costruiscono a mezzogiorno, così il cambio dell'ora legale
   non sposta mai un giorno. */

const due = n => String(n).padStart(2, '0');
export const chiave = d => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
export const daChiave = k => { const [a, m, g] = k.split('-').map(Number); return new Date(a, m - 1, g, 12); };
export const oggi = (ora = new Date()) => chiave(ora);
export const spostaGiorni = (k, n) => { const d = daChiave(k); d.setDate(d.getDate() + n); return chiave(d); };
export const giorniTra = (da, a) => Math.round((daChiave(a) - daChiave(da)) / 86400000);
export const meseDi = k => k.slice(0, 7);
export const lunediDi = k => { const d = daChiave(k); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return chiave(d); };
export function* giorniDa(da, a) { for (let k = da; k <= a; k = spostaGiorni(k, 1)) yield k; }

/* ---------- la giornata ----------
   { lavoro: true|false, mezzo: 'pullman'|'macchina'|'altro'|null,
     corseLavoro: 1|2, extra: n, sede?: 'vsl'|'mestre'|'dl', percorso?: [luoghi], t: ms }
   corseLavoro = tratte del tragitto di lavoro (2 andata e ritorno, 1 un viaggio solo):
   vale per tutti i mezzi: per il pullman sono corse da pagare, per macchina e altro statistica.
   sede = dove si è lavorato: di base il percorso è Casa → sede → Casa (o solo Casa → sede).
   percorso = giro a più tappe scelto a mano (es. Casa → Mestre → DL → Casa): se c'è,
   comanda lui e le tratte sono i suoi tratti.
   Svuotata: { vuoto: true, t } — resta come lapide, così l'altro dispositivo
   capisce che è stata cancellata e non la fa ricomparire. */

export const esiste = g => !!g && !g.vuoto;
export const lavora = g => !esiste(g) || g.lavoro !== false;          // di base è giorno di lavoro
export const completo = g => esiste(g) && (g.lavoro === false || MEZZI.includes(g.mezzo));
export const corseLavoro = g => g?.mezzo === 'pullman' ? tratte(g) : 0;
export const corseExtra = g => esiste(g) ? Math.max(0, g.extra | 0) : 0;
export const corseTotali = g => corseLavoro(g) + corseExtra(g);
export const MEZZI_CON_TRATTE = MEZZI;
const percorsoValido = g => (Array.isArray(g?.percorso) && g.percorso.length >= 2
  && g.percorso.every(id => ID_LUOGHI.includes(id))) ? g.percorso : null;
export const percorsoAMano = g => (esiste(g) && percorsoValido(g)) || null;
export function tratte(g) {
  if (!(esiste(g) && g.lavoro !== false && MEZZI.includes(g.mezzo))) return 0;
  const p = percorsoValido(g);
  return p ? p.length - 1 : (g.corseLavoro === 1 ? 1 : 2);
}
export const viaggiMacchina = g => g?.mezzo === 'macchina' ? tratte(g) : 0;
export const viaggiAltro = g => g?.mezzo === 'altro' ? tratte(g) : 0;

/* Il giro della giornata: quello a mano, oppure quello di base dalla sede. null se non si sa. */
export function percorso(g) {
  if (!tratte(g)) return null;
  const p = percorsoValido(g);
  if (p) return p;
  if (ID_SEDI.includes(g.sede)) return tratte(g) === 2 ? ['casa', g.sede, 'casa'] : ['casa', g.sede];
  return null;
}

export function distanza(imp, a, b) {
  if (a === b) return 0;
  const v = Number(imp?.distanze?.[chiaveTratto(a, b)]);
  return v > 0 ? v : null;
}

/* Chilometri del tragitto di lavoro; null se manca la sede o una distanza. */
export function kmGiorno(g, imp) {
  const p = percorso(g);
  if (!p) return null;
  let km = 0;
  for (let i = 1; i < p.length; i++) {
    const d = distanza(imp, p[i - 1], p[i]);
    if (d === null) return null;
    km += d;
  }
  return km;
}
export const euroKm = imp => (imp.prezzoBenzina > 0 && imp.consumo > 0) ? imp.prezzoBenzina / imp.consumo : 0;

export function applica(g, azione, ora = Date.now()) {
  if (azione.tipo === 'svuota') return { vuoto: true, t: ora };
  const n = esiste(g)
    ? { lavoro: g.lavoro !== false, mezzo: MEZZI.includes(g.mezzo) ? g.mezzo : null,
        corseLavoro: g.corseLavoro === 1 ? 1 : 2, extra: corseExtra(g),
        sede: ID_SEDI.includes(g.sede) ? g.sede : null, percorso: percorsoValido(g) ? [...g.percorso] : null }
    : { lavoro: true, mezzo: null, corseLavoro: 2, extra: 0, sede: null, percorso: null };
  switch (azione.tipo) {
    case 'lavoro':
      n.lavoro = !!azione.valore;
      break;
    case 'mezzo':
      n.lavoro = true;
      n.mezzo = azione.alterna && n.mezzo === azione.valore ? null : azione.valore;
      if (azione.corse) n.corseLavoro = azione.corse === 1 ? 1 : 2;
      break;
    case 'corseLavoro':
      n.lavoro = true;
      if (!MEZZI_CON_TRATTE.includes(n.mezzo)) n.mezzo = 'pullman';
      n.corseLavoro = azione.valore === 1 ? 1 : 2;
      n.percorso = null;                       // si torna al giro semplice dalla sede
      break;
    case 'sede':
      n.lavoro = true;
      n.sede = azione.alterna && n.sede === azione.valore ? null : (ID_SEDI.includes(azione.valore) ? azione.valore : null);
      n.percorso = null;
      break;
    case 'percorso': {
      n.lavoro = true;
      const p = (azione.valore || []).filter(id => ID_LUOGHI.includes(id));
      n.percorso = p.length >= 2 ? p : null;
      if (n.percorso) {
        n.sede = p.find(id => id !== 'casa') ?? n.sede;   // la prima sede del giro
        n.corseLavoro = p.length - 1 === 1 ? 1 : 2;       // per chi ha ancora l'app vecchia
      }
      break;
    }
    case 'extra':
      n.extra = Math.min(20, Math.max(0, n.extra + (azione.delta | 0)));
      break;
    default:
      throw new Error('azione sconosciuta: ' + azione.tipo);
  }
  if (!n.sede) delete n.sede;
  if (!n.percorso) delete n.percorso;
  n.t = ora;
  return n;
}

/* Comandi da URL (?registra=...), pensati per Comandi Rapidi su iPhone. */
export const AZIONI_URL = Object.freeze({
  pullman:   { tipo: 'mezzo', valore: 'pullman', corse: 2 },
  pullman1:  { tipo: 'mezzo', valore: 'pullman', corse: 1 },
  macchina:  { tipo: 'mezzo', valore: 'macchina', corse: 2 },
  macchina1: { tipo: 'mezzo', valore: 'macchina', corse: 1 },
  altro:     { tipo: 'mezzo', valore: 'altro', corse: 2 },
  altro1:    { tipo: 'mezzo', valore: 'altro', corse: 1 },
  nonlavoro: { tipo: 'lavoro', valore: false },
  corsa:     { tipo: 'extra', delta: 1 },
});

const COME = { pullman: 'in pullman', macchina: 'in macchina', altro: 'con altro mezzo' };
export function descrivi(g) {
  if (!esiste(g)) return 'giornata svuotata';
  const parti = [];
  if (g.lavoro === false) parti.push('non lavoro');
  else if (!COME[g.mezzo]) parti.push('lavoro, mezzo da indicare');
  else if (percorsoValido(g)) parti.push(`lavoro ${COME[g.mezzo]}, ${g.percorso.map(nomeLuogo).join(' → ')}`);
  else {
    const quanto = tratte(g) === 2 ? 'andata e ritorno' : g.mezzo === 'pullman' ? 'una corsa' : 'un viaggio solo';
    parti.push(`lavoro ${COME[g.mezzo]}, ${quanto}` + (ID_SEDI.includes(g.sede) ? `, ${nomeLuogo(g.sede)}` : ''));
  }
  const e = corseExtra(g);
  if (e) parti.push(`${e} ${e === 1 ? 'corsa extra' : 'corse extra'}`);
  return parti.join(', ');
}

/* ---------- unione tra dispositivi ----------
   Vince la versione più recente di ogni giornata (e delle impostazioni).
   A parità vince il primo argomento, cioè il dispositivo locale. */

export function unisci(a, b) {
  const out = statoVuoto();
  const ia = a?.impostazioni, ib = b?.impostazioni;
  out.impostazioni = { ...IMPOSTAZIONI_BASE, ...((ib?.t || 0) > (ia?.t || 0) ? ib : ia) };
  const ga = a?.giorni || {}, gb = b?.giorni || {};
  for (const k of new Set([...Object.keys(ga), ...Object.keys(gb)])) {
    const x = ga[k], y = gb[k];
    out.giorni[k] = !x ? y : !y ? x : ((y.t || 0) > (x.t || 0) ? y : x);
  }
  return out;
}
export const normalizza = s => unisci(s, null);

/* JSON con le chiavi in ordine: serve a confrontare due stati. */
export function canonico(v) {
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().filter(k => v[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + canonico(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

/* Il file su GitHub: una giornata per riga, così lo storico dei commit si legge bene. */
export function serializza(s) {
  const imp = Object.keys(s.impostazioni).sort()
    .map(k => `    ${JSON.stringify(k)}: ${JSON.stringify(s.impostazioni[k])}`).join(',\n');
  const giorni = Object.keys(s.giorni).sort()
    .map(k => `    ${JSON.stringify(k)}: ${canonico(s.giorni[k])}`).join(',\n');
  return `{\n  "v": ${s.v},\n  "impostazioni": {\n${imp}\n  },\n  "giorni": {${giorni ? '\n' + giorni + '\n  ' : ''}}\n}\n`;
}

/* ---------- conti ---------- */

const contatore = () => ({
  giorni: 0, registrati: 0, daRegistrare: 0,
  corse: 0, corseLavoro: 0, corseExtra: 0,
  giorniLavoro: 0, pullman: 0, macchina: 0, altro: 0, nonLavoro: 0,
  viaggiMacchina: 0, viaggiAltro: 0, giorniTrattaSola: 0,
  kmMacchina: 0, kmPullman: 0, kmAltro: 0, litri: 0, benzina: 0, giorniSenzaKm: 0,
  sedi: Object.fromEntries(ID_SEDI.map(id => [id, 0])),
});

const KM = { pullman: 'kmPullman', macchina: 'kmMacchina', altro: 'kmAltro' };
function somma(c, g, imp) {
  c.giorni++;
  if (completo(g)) c.registrati++; else c.daRegistrare++;
  const cl = corseLavoro(g), ce = corseExtra(g);
  c.corse += cl + ce; c.corseLavoro += cl; c.corseExtra += ce;
  c.viaggiMacchina += viaggiMacchina(g);
  c.viaggiAltro += viaggiAltro(g);
  if (tratte(g) === 1) c.giorniTrattaSola++;
  if (esiste(g)) {
    if (g.lavoro === false) c.nonLavoro++;
    else if (MEZZI.includes(g.mezzo)) {
      c.giorniLavoro++; c[g.mezzo]++;
      if (ID_SEDI.includes(g.sede)) c.sedi[g.sede]++;
      const km = kmGiorno(g, imp);
      if (km === null) c.giorniSenzaKm++;
      else {
        c[KM[g.mezzo]] += km;
        if (g.mezzo === 'macchina' && imp.consumo > 0) { c.litri += km / imp.consumo; c.benzina += km * euroKm(imp); }
      }
    }
  }
}

/* Costo in un anno di un'opzione, facendo n corse a settimana. */
export const costoAnno = (o, corseSettimana, durata = 365) =>
  o.fisso != null ? o.fisso : o.perCorsa * corseSettimana * durata / 7;

export function riepilogo(stato, da, a) {
  const c = contatore(), imp = { ...IMPOSTAZIONI_BASE, ...stato.impostazioni };
  if (a >= da) for (const k of giorniDa(da, a)) somma(c, stato.giorni[k], imp);
  return c;
}

export function conti(stato, finoA = oggi()) {
  const imp = { ...IMPOSTAZIONI_BASE, ...stato.impostazioni };
  const prezzoCorsa = imp.carnetPrezzo / imp.carnetCorse;
  const durata = imp.inizioAbbonamento && imp.scadenzaAbbonamento && imp.scadenzaAbbonamento > imp.inizioAbbonamento
    ? giorniTra(imp.inizioAbbonamento, imp.scadenzaAbbonamento) + 1
    : 365;
  const quotaGiorno = imp.prezzoAnnuale / durata;
  const da = imp.inizioTracciamento, a = finoA;

  const tot = contatore(), mesi = [];
  let mese = null;
  if (a >= da) for (const k of giorniDa(da, a)) {
    if (!mese || mese.mese !== meseDi(k)) { mese = { mese: meseDi(k), ...contatore() }; mesi.push(mese); }
    somma(mese, stato.giorni[k], imp);
    somma(tot, stato.giorni[k], imp);
  }
  for (const m of mesi) {
    m.carnet = m.corse * prezzoCorsa;
    m.migliore = Math.min(m.carnet, imp.mensile);   // senza annuale compreresti la cosa che costa meno
    m.conMensile = m.carnet > imp.mensile;
    m.quota = m.giorni * quotaGiorno;
    m.risparmio = m.migliore - m.quota;             // > 0: l'annuale ha convenuto
  }

  const migliore = mesi.reduce((s, m) => s + m.migliore, 0);
  const quota = tot.giorni * quotaGiorno;
  const base = tot.registrati || tot.giorni;
  const corseSettimana = base ? tot.corse / base * 7 : 0;
  const pareggioAnno = imp.prezzoAnnuale / prezzoCorsa;

  /* Tutte le opzioni a confronto. "fisso" = costo l'anno qualunque cosa fai,
     "perCorsa" = si paga a corsa. anno: al ritmo attuale; periodo: nei giorni contati;
     soglia: corse a settimana da cui un'opzione fissa costa meno del carnet. */
  const settimane = durata / 7;
  const listino = imp.prezzoListino > imp.prezzoAnnuale ? imp.prezzoListino : null;
  const opzioni = [
    { id: 'annuale', fisso: imp.prezzoAnnuale },
    ...(listino ? [{ id: 'listino', fisso: listino }] : []),
    { id: 'mensile', fisso: imp.mensile * 12 * durata / 365 },
    { id: 'carnet', perCorsa: prezzoCorsa },
    { id: 'singolo', perCorsa: imp.singolo },
  ].map(o => ({
    ...o,
    anno: costoAnno(o, corseSettimana, durata),
    periodo: o.fisso != null ? o.fisso * tot.giorni / durata : o.perCorsa * tot.corse,
    soglia: o.fisso != null ? o.fisso / prezzoCorsa / settimane : null,
  }));

  return {
    imp, prezzoCorsa, durata, quotaGiorno, da, a, mesi, tot, opzioni,
    euroKm: euroKm(imp),
    benzinaRisparmiata: tot.kmPullman * euroKm(imp),   // la benzina che avresti speso facendo quei km in macchina
    carnet: tot.corse * prezzoCorsa,
    singoli: tot.corse * imp.singolo,
    migliore, quota, risparmio: migliore - quota,
    corseSettimana,
    proiezioneAnno: corseSettimana / 7 * durata,
    pareggioAnno,
    pareggioSettimana: pareggioAnno / durata * 7,
    mensileDa: Math.floor(imp.mensile / prezzoCorsa) + 1,
    giorniAlRinnovo: imp.scadenzaAbbonamento ? giorniTra(finoA, imp.scadenzaAbbonamento) : null,
  };
}
