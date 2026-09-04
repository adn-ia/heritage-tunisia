/* the-sorties-carte.js — EMPORTER SON ITINÉRAIRE AILLEURS.
   Sorti d'`itineraire.html` le 04/09/2026, quatrième bloc du découpage.

   CE QU'IL PORTE. Les cinq façons de sortir un itinéraire de l'application :
   Google Maps, OpenStreetMap, Plans (Apple), Waze, et le fichier GPX. Plus la
   fenêtre qui les propose.

   ⚠️ POURQUOI LE NOM PLUTÔT QUE LA COORDONNÉE, POUR GOOGLE. Un lieu sourcé a une
   entrée, un parking, une adresse officielle — Google les connaît par son nom et
   y conduit. La coordonnée brute, elle, tombe souvent au CENTRE des ruines, où
   aucune route ne mène. On ne passe donc la coordonnée que pour la position GPS
   du voyageur et pour les étapes qu'il a posées lui-même, qui n'ont rien d'autre.

   ⚠️ ET LE POINT D'ACCÈS EN VOITURE. Quand une étape déclare un `acces` distinct
   de sa position, c'est lui qu'on donne aux applications de navigation : un site
   peut se visiter à pied depuis un parking qui n'est pas dessus.

   IL NE FOUILLE PAS DANS LA PAGE. Il lit `THEvoyage()`, la source unique publiée
   par `itineraire.html` : les étapes, leurs coordonnées, la forme du trajet.
   Rien d'autre. Il se retire en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEsortiesCarte) return;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";
  }
  function voyage() {
    try { return window.THEvoyage ? THEvoyage() : null; } catch (e) { return null; }
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  /* « lat,lon » — l'ordre qu'attendent toutes les applications de navigation,
     alors que nos coordonnées sont rangées [lon, lat]. */
  function ll(c) { return c ? (c[1] + "," + c[0]) : ""; }

  function points() {
    var v = voyage();
    if (!v || !v.etapes.length) return null;
    var arrets = v.etapes.map(function (e) { return e.acces || e.coord; }).filter(Boolean);
    var depart = (v.origine && v.origine.coord) || arrets[0];
    return { depart: depart, arrets: arrets, forme: v.forme, voyage: v };
  }

  /* ── les quatre applications ──────────────────────────────────────────────── */
  function versGoogle() {
    var p = points(); if (!p) return;
    var v = p.voyage;
    /* le NOM pour les lieux sourcés, la coordonnée pour les ajouts personnels */
    var etapes = v.etapes.map(function (e) {
      return (e.genre !== "perso" && e.nom) ? e.nom : ll(e.acces || e.coord);
    });
    var arrivee = (p.forme === "boucle") ? ll(p.depart) : etapes.pop();
    var u = "https://www.google.com/maps/dir/?api=1"
          + "&origin=" + encodeURIComponent(ll(p.depart))
          + "&destination=" + encodeURIComponent(arrivee)
          + (etapes.length ? "&waypoints=" + encodeURIComponent(etapes.join("|")) : "")
          + "&travelmode=driving";
    window.open(u, "_blank", "noopener");
  }
  function versOSM() {
    var p = points(); if (!p) return;
    var suite = [p.depart].concat(p.arrets);
    if (p.forme === "boucle") suite.push(p.depart);
    window.open("https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route="
      + suite.map(ll).join(";"), "_blank", "noopener");
  }
  function versApple() {
    var p = points(); if (!p) return;
    var fin = (p.forme === "boucle") ? p.depart : p.arrets[p.arrets.length - 1];
    window.open("https://maps.apple.com/?saddr=" + encodeURIComponent(ll(p.depart))
      + "&daddr=" + encodeURIComponent(ll(fin)) + "&dirflg=d", "_blank", "noopener");
  }
  function versWaze() {
    var p = points(); if (!p) return;
    /* ⚠️ WAZE NE PREND QU'UNE DESTINATION. On l'envoie donc au premier arrêt, pas
       au dernier : c'est celui vers lequel on part maintenant. */
    window.open("https://waze.com/ul?ll=" + ll(p.arrets[0]) + "&navigate=yes", "_blank", "noopener");
  }

  /* ── le fichier GPX ───────────────────────────────────────────────────────── */
  function nomDeFichier(txt, repli) {
    var s = String(txt || "").trim();
    try { s = s.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    s = s.replace(/[\/\\?%*:|"<>&,;]/g, " ").replace(/\s+/g, "-")
         .replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
    /* ⚠️ PAS DE PICTOGRAMME EN TÊTE — même défaut que le fichier souvenir, corrigé
       le 03/09 : un nom qui commence par un emoji se range en tête ou en queue de
       liste selon l'appareil, jamais à sa lettre. Et on date, pour que deux sorties
       du même voyage ne s'écrasent pas. */
    s = s.replace(/^[^A-Za-zÀ-ÿ0-9]+/, "");
    return (s || repli) + "-" + new Date().toISOString().slice(0, 10);
  }
  function versGPX() {
    var v = voyage(); if (!v || !v.etapes.length) return;
    var nom = v.titre || T("itin.mon.itineraire");
    var wpts = v.etapes.map(function (e) {
      if (!e.coord) return "";
      return '  <wpt lat="' + e.coord[1] + '" lon="' + e.coord[0] + '">'
           + "<name>" + esc(e.nom) + "</name>"
           + (e.ville ? "<desc>" + esc(e.ville) + "</desc>" : "") + "</wpt>";
    }).filter(Boolean).join("\n");
    var rtepts = v.etapes.map(function (e) {
      if (!e.coord) return "";
      return '    <rtept lat="' + e.coord[1] + '" lon="' + e.coord[0] + '">'
           + "<name>" + esc(e.nom) + "</name></rtept>";
    }).filter(Boolean).join("\n");
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n'
      + '<gpx version="1.1" creator="' + esc((window.HConf && HConf.marque) || "") + '" '
      + 'xmlns="http://www.topografix.com/GPX/1/1">\n'
      + wpts + "\n  <rte><name>" + esc(nom) + "</name>\n" + rtepts + "\n  </rte>\n</gpx>";
    var blob = new Blob([gpx], { type: "application/gpx+xml" });
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url;
    a.download = nomDeFichier(nom, "itineraire") + ".gpx";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
  }

  /* ── la fenêtre de choix, celle que la page porte déjà ────────────────────── */
  function ouvrir() {
    var v = voyage(); if (!v || !v.etapes.length) return;
    var m = document.getElementById("navModal");
    if (m) m.style.display = "flex";
  }
  function fermer() {
    var m = document.getElementById("navModal");
    if (m) m.style.display = "none";
  }

  window.THEsortiesCarte = {
    ouvrir: ouvrir, fermer: fermer,
    google: versGoogle, osm: versOSM, apple: versApple, waze: versWaze, gpx: versGPX
  };

  function brancher() {
    var m = document.getElementById("navModal");
    if (!m || m._scFait) return;
    m._scFait = 1;
    var x = document.getElementById("navX");
    if (x) x.onclick = fermer;
    m.onclick = function (e) { if (e.target === m) fermer(); };
    [].forEach.call(document.querySelectorAll(".nav-opt"), function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-nav");
        fermer();
        if (k === "google") versGoogle();
        else if (k === "osm") versOSM();
        else if (k === "apple") versApple();
        else if (k === "waze") versWaze();
        else if (k === "gpx") versGPX();
      };
    });
    /* le bouton d'ouverture a rejoint la carte : on ne câble que s'il est là. */
    var gb = document.getElementById("gmapsbtn");
    if (gb) gb.onclick = ouvrir;
  }
  function guetter() {
    brancher();
    try { new MutationObserver(brancher).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
