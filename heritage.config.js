/* ============================================================
   HERITAGE — CONFIG UNIQUE PAR PAYS (squelette)
   Édition : THE — Tunisia Heritage Experience
   Cloner = éditer CE SEUL fichier + déposer les données.
   Chargé en TOUT PREMIER dans le <head>.
   ============================================================ */
(function () {
  var C = {
    iso:          "tn",
    domaine:      "heritage.threshold-analytics.com",
    marque:       "Tunisia Heritage Experience",
    marqueCourte: "Tunisia Heritage",
    marqueMark:   "Tunisia&nbsp;Heritage<br>Experience",   // marque du LOGO (HTML, <br> permis) — data-brand-mark
    monogram:     "THE",   // monogramme court du logo (data-brand-mono)
    carte:        { lat: 34.5, lon: 9.5, zoom: 7 },
    cloudflare:   "de37166feb0649ccb405647109e25906",
    exportNom:    "Tunisia-Heritage",
    description:  "Découvrir, comprendre et garder un souvenir du patrimoine tunisien — sites, itinéraires et carnet de voyage, hors-ligne.",   // manifest PWA/SEO
    appStore:     "https://apps.apple.com/app/id6785249427",   // lien App Store (badge pied de page) — vide = masqué
    appStoreId:   "6785249427",   // id App Store (deep-link go.html / apps.html) — propre à l'édition
    support:      "support@threshold-analytics.com",   // e-mail contact/signalement (briques)
    iapPrefix:    "the",   // préfixe produit App Store (the_sub_annual) — propre à l'édition
    checkout:     "https://boutique.threshold-analytics.com/checkout/buy/be44afe6-f994-4429-b1fc-fc0cd377b0ed",  // Lemon Squeezy (web) ; vide = pas de vente web
    tip:          "https://boutique.threshold-analytics.com/checkout/buy/3987d8ab-b0cb-4833-b110-a4d6893dd264",  // pourboire/soutien (web) ; vide = pas de bouton
    patrimoineEmail: "patrimoine_tunisie@threshold-analytics.com",  // veille citoyenne (contribuer.html) ; vide = formulaire inactif
    invites:      [   // codes offerts (SHA-256), propres à l'édition
      "05784113a6edb6b845007d07f3f3b5547ee521bdb69d3910957a9686ec210801",
      "ddcfce828248f7108fab7bb31035c9e81f1fc526dfbd25a156989dd475db2fba",
      "12b912a8a9cb23d2b58acaf25d862418c6c84507bed7488ba3abcc3c4b8d231f",
      "963ee0a0a02206e629aa0a130e6c714124fc2631962eab1022fb1fc628400841",
      "dc13d4b56e727172f74149f609c8d2e766d37bd6fa7d500a089798bf9da1c616",
      "9a092543451108404b24f874a2614727587605b20ee00492630d8cb179d7b1b2",
      "97d3ae72020e6fb7cfc405c3a4f53c72e3ca934eff408ba54a907a2360ac2390",
      "4191812577dcff713e36ae2b1ed8272756c36c03c2fdb96644f6fd5695f9eb21",
      "9543e8d702b8a64c1414b6bcedb9ba7cc522644cce32a47f183919d81fe702f4",
      "58333aea61f2343b92278aa1181e7099a09c5209c0843e1e7fffb3e005ee2cb8"
    ],
    ref:          "THE-v81"
  };
  window.HConf = C;
  try {
    var page = (location.pathname.split("/").pop() || "");
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = "https://" + C.domaine + "/" + page;

    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!at) { at = document.createElement("meta"); at.setAttribute("name", "apple-mobile-web-app-title"); document.head.appendChild(at); }
    at.setAttribute("content", C.marqueCourte);

    var pb = document.querySelector('meta[name="pc-brand"]');
    if (!pb) { pb = document.createElement("meta"); pb.setAttribute("name", "pc-brand"); document.head.appendChild(pb); }
    pb.setAttribute("content", C.marqueCourte);
    // Cloudflare : géré par analytics.js (lit HConf.cloudflare).

    // manifest PWA DYNAMIQUE (depuis HConf) — le manifest.json statique reste NEUTRE.
    var _lang = "fr"; try { _lang = localStorage.getItem("the_lang") || "fr"; } catch (e) {}
    document.documentElement.lang = _lang;
    var mf = {
      name: C.marque, short_name: C.marqueCourte, description: C.description || "",
      id: "/?app=heritage", start_url: "bienvenue.html", scope: "./",
      display: "standalone", orientation: "portrait",
      background_color: "#2b2318", theme_color: "#2b2318", lang: _lang,
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "logo-the.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };
    var mfUrl = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: "application/manifest+json" }));
    var mfLink = document.querySelector('link[rel="manifest"]');
    if (!mfLink) { mfLink = document.createElement("link"); mfLink.rel = "manifest"; document.head.appendChild(mfLink); }
    mfLink.href = mfUrl;
  } catch (e) {}
  // Marque affichée (hero + <title>) : remplie depuis HConf après parse du DOM.
  // Les éléments portent un repli NEUTRE en dur ; le loader y pose la marque du pays.
  function _fillBrand() {
    try {
      var el, i;
      el = document.querySelectorAll("[data-brand]");       for (i = 0; i < el.length; i++) el[i].textContent = C.marque;
      el = document.querySelectorAll("[data-brand-short]"); for (i = 0; i < el.length; i++) el[i].textContent = C.marqueCourte;
      el = document.querySelectorAll("[data-brand-mark]");  for (i = 0; i < el.length; i++) el[i].innerHTML  = C.marqueMark || C.marque;
      el = document.querySelectorAll("[data-brand-mono]");  for (i = 0; i < el.length; i++) { if (C.monogram) el[i].textContent = C.monogram; }
      var tt = document.querySelector("title[data-brand-title]"); if (tt) document.title = C.marque;
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _fillBrand);
  else _fillBrand();
})();
