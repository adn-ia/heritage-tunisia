/* build 2026-08-05 — fix i18n textes en dur (badge footer plan/jours, data-i18n-alt, replis decouvrir) */
/* THE — service worker : rend l'app utilisable hors-ligne.
   - précache la coquille (pages + données sourcées)
   - met en cache au fil de l'eau les tuiles de carte déjà consultées
   - cache-first : une fois visité, ça remarche sans réseau. */
const VERSION = 'heritage-cd4ca023';
const CORE    = 'the-core-' + VERSION;
const RUNTIME = 'the-runtime-' + VERSION;
/* ⚠️ LE CACHE DES TUILES NE PORTE PAS DE VERSION, ET SURVIT AUX MISES À JOUR.
   Il s'appelait `the-tiles-<VERSION>` : à chaque nouvelle version, la purge de
   l'activation l'emportait. Un voyageur qui avait emporté sa carte la perdait à
   la première mise à jour, sans rien comprendre. Repris de Terralog
   (`RoadTrip-Generique/sw.js:109-113`), où le défaut a été corrigé le 26/08. */
const TILES   = 'the-tuiles';

const CORE_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=EB+Garamond:ital@0;1&display=swap',
  'accueil.html', 'bienvenue.html', 'itineraire.html', 'circuits.html', 'analytics.js', 'index.html', 'liste.html', 'premium.html', 'confidentialite.html', 'hors-ligne.html', 'contribuer.html',
  'decouvrir.html', 'a-propos.html', 'soutien.html', 'voyage.html', 'sources-credits.html', 'credits-photos.html', 'rome-immersion.html', 'contribuer.html',
  'manifest.json', 'icon-the.svg', 'icon-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'logo-the.png', 'logo-threshold.png', 'the-footer.js', 'the-pass.js', 'the-lightbox.js', 'the-print.js', 'the-souvenir.js', 'the-i18n.js', 'the-backup.js',
  /* ⚠️ HUIT FICHIERS APPELÉS PAR LES PAGES MANQUAIENT À CETTE LISTE — relevé le
     30/08/2026 en croisant les <script src> des 19 pages précachées avec ce tableau.
     Le plus lourd de conséquences : `heritage.config.js`, réclamé par DIX-SEPT pages.
     C'est lui qui dit à l'application quel pays elle est — marque, langues, carte,
     domaine. Absent du précache, une ouverture hors-réseau pouvait le manquer, et
     l'application ne savait plus qui elle était. Les quatre `brique-*.data.json` sont
     les dictionnaires de leurs briques : sans eux la brique se charge et n'a rien à
     dire. Ce n'était pas visible en ligne — le réseau les servait à chaque fois. */
  'heritage.config.js',
  'the-carnet.js', 'the-prise.js', 'the-planche.js', 'the-diaporama.js', 'the-partage.js', 'the-sauvegarde.js', 'the-sorties-carte.js', 'the-document.js', 'the-etape.js', 'the-message.js', 'the-postcard.js', 'the-fiche-audio.js',
  /* LES TRADUCTIONS, PRÉCACHÉES — 01/09/2026, Helmy. Elles n'y étaient pas du
     tout : hors réseau, l'application n'avait aucune garantie d'avoir ses textes,
     et le cœur multilingue tenait à une connexion. Les treize fichiers y sont —
     l'interface, les contenus, les circuits, dans les cinq langues. */
  'i18n/ar.json', 'i18n/de.json', 'i18n/en.json',
  'i18n/it.json', 'i18n/tours.ar.json', 'i18n/tours.de.json',
  'i18n/tours.en.json', 'i18n/tours.it.json', 'i18n/ui.ar.json',
  'i18n/ui.de.json', 'i18n/ui.en.json', 'i18n/ui.fr.json',
  'i18n/ui.it.json',
  'brique-qr.js', 'brique-qr.data.json',
  'brique-meteo.js', 'brique-meteo.data.json',
  'brique-decouvrir-lieu.js', 'brique-decouvrir-lieu.data.json',
  'brique-partage-lieu.js', 'brique-partage-lieu.data.json',
  // Le rendu du fond de carte. SANS LUI, la carte ne se peint pas hors-ligne :
  // les tuiles seraient en cache et personne pour les dessiner. `tuile.php`, lui,
  // n'est PAS précaché — c'est voulu : ce sont les TUILES qui se gardent, une à une.
  'vendor/protomaps-leaflet.js', 'brique-note.js', 'brique-contact.js', 'brique-tour.js', 'brique-etape.js', 'brique-etape.data.json', 'the-bornes.js', 'the-bornes.data.json', 'the-carte-plein.js', 'the-carte-plein.data.json', 'the-placer.js', 'the-placer.data.json', 'the-album-fichiers.js', 'the-album-fichiers.data.json', 'roadtrip-plus.js', 'roadtrip-plan.js', 'brique-modes.js', 'brique-modes.data.json', 'brique-hors-ligne.js', 'brique-hors-ligne.data.json', 'brique-tour.data.json', 'brique-note.data.json', 'brique-contact.data.json', 'immersion-rome.mp3',
  'sites.geojson', 'sites-nature.geojson', 'tours.json', 'mer-antique.geojson', 'photos.json', 
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
      // `TILES` et `heritage-offline` ne sont PAS versionnés : ce que l'utilisateur a
      // emporté lui appartient et ne se jette pas à la mise à jour suivante.
      .then(keys => Promise.all(keys
        .filter(k => !k.endsWith(VERSION) && k !== TILES && k !== 'heritage-offline')
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(cs => cs.forEach(c => { try { if ('navigate' in c) c.navigate(c.url); } catch(e){} }))
  );
});

/* ⚠️ NOS TUILES SONT SERVIES PAR NOTRE PROPRE ADRESSE depuis le 30/08 — `tuile.php`,
   qui lit le fond de carte dans `tuiles/fond.pmtiles`. L'ancien motif ne visait que
   les serveurs de CARTO : il ne reconnaîtrait plus rien, donc plus une seule tuile ne
   serait gardée, et le hors-réseau tomberait EN SILENCE. Les deux anciens noms restent
   pour ne pas jeter ce qu'un utilisateur a déjà emporté avant la bascule.
   Repris de Terralog (`RoadTrip-Generique/sw.js:119`). */
const isTile = url => /\/tuile\.php\?|basemaps\.cartocdn\.com|tile\.openstreetmap\.org/.test(url);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Contenu téléchargé pour hors-ligne (voix .mp3 + photos /img/) : servir depuis le cache dédié.
  if (/\.(mp3|m4a|ogg|wav)(\?|$)/i.test(req.url) || /\/img\//.test(req.url)) {
    e.respondWith(
      caches.open('heritage-offline').then(c => c.match(req, { ignoreVary: true }))
        .then(hit => hit || fetch(req)).catch(() => fetch(req))
    );
    return;
  }

  /* ── LES CAPTURES DE LA PAGE « À QUOI SERT » — 07/09/2026 ───────────────────
     Elles étaient dans CORE_ASSETS : 700 Ko payés au PREMIER lancement par tout
     le monde, y compris ceux qui n'ouvriront jamais cette page. Motif de refus de
     DeepSeek, et il a raison — le précache est le squelette de l'application, pas
     ses illustrations.
     Elles suivent donc la règle des photos hors-ligne (`/img/` ci-dessus) : rien
     au démarrage, gardées dès la première visite de la page, disponibles hors
     réseau ensuite. Le cache ne porte pas de version : les images ne changent pas
     à chaque correctif, il serait absurde de les retélécharger. */
  if (/\/captures\//.test(req.url)) {
    e.respondWith(
      caches.open('heritage-captures').then(c =>
        c.match(req).then(hit => hit || fetch(req).then(res => {
          if (res && res.ok) c.put(req, res.clone());
          return res;
        }).catch(() => hit))
      )
    );
    return;
  }

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

  // Code de l'application (.js) : network-first, comme les données.
  //    ← il était en cache-first avec tout le reste. Or heritage.config.js, the-pass.js
  //      et les briques changent à chaque correctif : servis depuis le cache, un défaut
  //      corrigé restait visible chez l'utilisateur. Pire, le serveur n'envoyant aucun
  //      Cache-Control, le navigateur rendait AU service worker sa propre copie périmée,
  //      qui repartait alors dans le cache neuf. Constaté le 16/08/2026 : une clé
  //      ajoutée à la configuration n'arrivait jamais jusqu'à la page.
  if (/\.js(\?|$)/.test(req.url) && new URL(req.url).origin === self.location.origin) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req))
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
