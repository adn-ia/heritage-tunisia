/* build 2026-07-05 THE 4 langues propres (EN/IT/DE/AR) */
/* THE — service worker : rend l'app utilisable hors-ligne.
   - précache la coquille (pages + données sourcées)
   - met en cache au fil de l'eau les tuiles de carte déjà consultées
   - cache-first : une fois visité, ça remarche sans réseau. */
const VERSION = 'the-v71';
const CORE    = 'the-core-' + VERSION;
const RUNTIME = 'the-runtime-' + VERSION;
const TILES   = 'the-tiles-' + VERSION;

const CORE_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital@0;1&display=swap',
  'accueil.html', 'bienvenue.html', 'itineraire.html', 'analytics.js', 'index.html', 'liste.html', 'premium.html',
  'decouvrir.html', 'a-propos.html', 'soutien.html', 'voyage.html', 'sources-credits.html', 'credits-photos.html', 'flux.html', 'rome-immersion.html',
  'manifest.json', 'icon-the.svg', 'icon-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'logo-the.png', 'logo-threshold.png', 'the-footer.js', 'the-pass.js', 'the-i18n.js', 'the-backup.js', 'immersion-rome.mp3',
  'sites.geojson', 'sites-nature.geojson', 'tours.json', 'mer-antique.geojson', 'photos.json', 'gastronomie.json',
  'musee/index.html', 'webar/index.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CORE)
      .then(c => Promise.allSettled(CORE_ASSETS.map(u => c.add(new Request(u, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(cs => cs.forEach(c => { try { if ('navigate' in c) c.navigate(c.url); } catch(e){} }))
  );
});

const isTile = url => /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/.test(url);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Tuiles de carte : cache-first, on garde celles qu'on a vues
  if (isTile(req.url)) {
    e.respondWith(
      caches.open(TILES).then(c =>
        c.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(() => hit))
      )
    );
    return;
  }

  // Pages HTML (navigation) : network-first → toujours à jour en ligne, cache si hors-ligne.
  // (évite de servir une vieille version d'une page après une modif)
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('decouvrir.html')))
    );
    return;
  }

  // Données JSON (traductions i18n, sites, circuits…) : network-first → toujours à jour en ligne, cache en secours hors-ligne.
  if (/\.(json|geojson)(\?|$)/.test(req.url)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Reste (CDN polices/Leaflet, etc.) : cache-first + remplissage runtime
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
        const copy = res.clone();
        caches.open(RUNTIME).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => {
      // hors-ligne et non caché : pour une navigation, on retombe sur l'accueil
      if (req.mode === 'navigate') return caches.match('decouvrir.html');
    }))
  );
});
