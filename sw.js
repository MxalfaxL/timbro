/* Timbro — cache dell'app, così si apre all'istante e anche senza rete
   (sul pullman il segnale va e viene). Le chiamate a GitHub non passano
   di qui: quelle vanno sempre in rete.

   Quando cambia qualcosa nell'app, alza VERSIONE: il vecchio guscio viene
   buttato e il nuovo scaricato alla prima apertura con rete. */
const VERSIONE = '2026.11.08';
const CACHE = 'timbro-' + VERSIONE;
const GUSCIO = ['./', './index.html', './motore.js', './sincro.js', './manifest.webmanifest',
                './icona-180.png', './icona-192.png', './icona-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(GUSCIO)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(chiavi => Promise.all(chiavi.filter(k => k.startsWith('timbro-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // l'app: prima la copia salvata (apertura istantanea), la rete solo se manca.
  // ignoreSearch: i comandi ?registra=... aprono la stessa pagina anche offline.
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const salvata = e.request.mode === 'navigate'
      ? await c.match('./index.html')
      : await c.match(e.request, { ignoreSearch: true });
    if (salvata) return salvata;
    try { return await fetch(e.request); }
    catch { return new Response('Timbro è offline e questa risorsa non è in cache.', { status: 503 }); }
  })());
});
