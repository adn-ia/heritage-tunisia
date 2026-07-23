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
    carte:        { lat: 34.5, lon: 9.5, zoom: 7 },
    cloudflare:   "de37166feb0649ccb405647109e25906",
    exportNom:    "Tunisia-Heritage",
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
  } catch (e) {}
})();
