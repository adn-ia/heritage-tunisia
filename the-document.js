/* the-document.js — OUVRIR, FERMER, ET RETROUVER UN DOCUMENT.
   Sorti d'`itineraire.html` le 04/09/2026, cinquième bloc du découpage.

   CE QU'IL PORTE. Tout ce qui entoure l'album sans être son contenu : la saisie
   de la carte, l'ouverture, la fermeture, et la mémoire de l'état dans l'adresse.
   Le RENDU lui-même — les trois habillages, leurs filigranes, leurs gabarits —
   reste dans la page pour l'instant : il est le morceau le plus lourd et le plus
   souvent cassé, et il sera sorti à part, quand rien d'urgent n'attendra.

   ⚠️ TROIS LEÇONS Y VIVENT, ET ELLES SONT CHÈREMENT ACQUISES.

   ① LA CARTE SE SAISIT AVANT LE MASQUAGE. Helmy, 03/09 : « vous faites une
      capture de la carte dans l'itinéraire, avec TOUT l'itinéraire, et vous la
      collez — il ne faut pas reconstruire la carte ». L'album fabriquait sa PROPRE
      instance Leaflet dans un cadre court, qui se recadrait à sa façon : sur
      300 km elle n'en montrait qu'un morceau. On prend celle de l'itinéraire, en
      image. Et on la prend AVANT de la masquer : une carte cachée mesure zéro et
      rendrait une image vide.

   ② L'ADRESSE RETIENT L'ÉTAT. Helmy, 03/09 : « quand j'appuie sur Documents et
      que je veux rafraîchir, je retombe sur l'itinéraire ». L'album n'était qu'un
      `display:block` en mémoire ; un rechargement le perdait. Il s'écrit donc dans
      l'adresse — et s'en efface en sortant, sans quoi un paramètre resté là
      rouvrirait un document qu'on vient de fermer (le défaut de `?choix=1`).

   ③ TOUS LES HABILLAGES SE RETIRENT. La fermeture n'en retirait que deux sur
      trois : en sortant depuis le dépliant, son habillage restait collé à la page.

   IL DEMANDE PEU À LA PAGE : `renderAlbum()` pour le contenu, `THEcartePlate` pour
   l'image. Le reste, il le fait seul. */
(function () {
  "use strict";
  if (window.THEdocument) return;

  var CARTE = null;
  var HABILLAGES = ["tpl-baroudeur", "tpl-passeport", "tpl-depliant"];

  /* ── ① la carte de l'itinéraire, en image ─────────────────────────────────── */
  function saisirLaCarte() {
    try {
      var m = document.getElementById("map");
      if (!m || !m.offsetParent || !window.THEcartePlate) return Promise.resolve(null);
      /* ⚠️ DEUX IMAGES, PRISES AU MÊME INSTANT — 04/09/2026.
         L'album et l'impression veulent la carte COMPLÈTE, tracé et pastilles
         cuits dedans. Le fichier cliquable veut la carte NUE, où tout sera
         REPROJETÉ. Les deux se prennent ICI, tant que `#map` est encore visible :
         dès que l'album s'ouvre, la carte est masquée et ne mesure plus rien —
         c'est la leçon du 03/09, déjà écrite plus bas (`buildSite`, l. 169). */
      /* ⚠️ ON CADRE SUR LE PARCOURS AVANT DE PHOTOGRAPHIER, PUIS ON REND SA VUE.
         Sur l'itinéraire, un cadrage moyen se rattrape du doigt ; dans un
         document, ce qui est mal cadré le reste. `THEcarteDocument()` ajuste la
         carte exactement sur le voyage, attend que le fond soit peint, et rend
         une fonction qui lui rend sa vue — appelée quoi qu'il arrive, réussite
         comme échec : laisser l'itinéraire cadré autrement serait pire que le
         défaut qu'on corrige. */
      var rendreLaVue = null;
      return (window.THEcarteDocument ? window.THEcarteDocument() : Promise.resolve(null))
        .then(function (r) { rendreLaVue = r; return window.THEcartePlate(m); })
        .then(function (u) {
          CARTE = u || null;
          return window.THEcartePlate(m, { nu: true });
        })
        .then(function (n) { window.THEcarteNue = n || null; })
        .catch(function () { window.THEcarteNue = null; })
        .then(function () {
          if (rendreLaVue) { try { rendreLaVue(); } catch (e) {} }
          return CARTE;
        });
    } catch (e) { return Promise.resolve(null); }
  }

  /* ── ② l'adresse se souvient ──────────────────────────────────────────────── */
  function marquer(ouvert) {
    try {
      var u = new URL(location.href);
      if (ouvert) {
        u.searchParams.set("doc", "1");
        var st = (document.body.className.match(/tpl-([a-zé]+)/) || [])[1];
        if (st) u.searchParams.set("style", st); else u.searchParams.delete("style");
      } else {
        u.searchParams.delete("doc");
        u.searchParams.delete("style");
      }
      history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    } catch (e) {}
  }

  function ouvrir() {
    return saisirLaCarte().then(function () {
      var res = document.getElementById("result"),
          alb = document.getElementById("album");
      if (res) res.style.display = "none";
      var pt = document.getElementById("pt-panneau");
      if (pt) pt.classList.remove("on");
      if (alb) alb.style.display = "block";
      document.body.classList.add("doc-ouvert");
      if (typeof window.renderAlbum === "function") window.renderAlbum();
      marquer(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function fermer(versFormulaire) {
    /* ③ les TROIS habillages, pas deux */
    document.body.classList.remove.apply(document.body.classList, HABILLAGES);
    var alb = document.getElementById("album");
    if (alb) alb.style.display = "none";
    document.body.classList.remove("doc-ouvert");
    marquer(false);
    var res = document.getElementById("result"),
        frm = document.getElementById("builder");
    if (versFormulaire) {
      if (res) res.style.display = "none";
      if (frm) frm.style.display = "block";
    } else if (res) {
      res.style.display = "block";
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ⚠️ LE CHANGEMENT D'HABILLAGE DOIT SUIVRE DANS L'ADRESSE — 04/09/2026, vu à
     l'épreuve : on passait au Passeport, on rafraîchissait, et l'album revenait en
     Baroudeur. L'adresse n'était écrite qu'à l'OUVERTURE, elle gardait donc
     l'habillage d'alors. On la remet à jour à chaque changement. */
  function suivreLHabillage() {
    [].forEach.call(document.querySelectorAll(".album-bar .tpl"), function (c) {
      if (c._dcStyle) return;
      c._dcStyle = 1;
      c.addEventListener("click", function () {
        setTimeout(function () {
          if (document.body.classList.contains("doc-ouvert")) marquer(true);
        }, 60);
      });
    });
  }

  window.THEdocument = { ouvrir: ouvrir, fermer: fermer, carte: function () { return CARTE; } };

  /* ── ② la reprise au rafraîchissement ─────────────────────────────────────── */
  (function reprendre() {
    var p; try { p = new URLSearchParams(location.search); } catch (e) { return; }
    if (p.get("doc") !== "1") return;
    var style = p.get("style"), essais = 0;
    (function attendre() {
      if (++essais > 60) return;                       // ~6 s, puis on renonce
      var res = document.getElementById("result");
      if (!res || res.style.display !== "block" || !document.querySelector(".stop")) {
        return setTimeout(attendre, 100);
      }
      try { if (style && typeof window.albumTemplate !== "undefined") window.albumTemplate = style; }
      catch (e) {}
      ouvrir();
    })();
  })();

  function brancher() {
    suivreLHabillage();
    var o = document.getElementById("albumbtn"),
        f = document.getElementById("albumback");
    if (o && !o._dcFait) { o._dcFait = 1; o.onclick = function () { ouvrir(); }; }
    if (f && !f._dcFait) { f._dcFait = 1; f.onclick = function () { fermer(false); }; }
  }
  function guetter() {
    brancher();
    try { new MutationObserver(brancher).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
