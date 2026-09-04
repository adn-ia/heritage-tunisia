/* ═══════════════════════════════════════════════════════════════════════════
   LA CARTE EN PLEIN ÉCRAN — point 29
   ───────────────────────────────────────────────────────────────────────────
   Bloc auto-porté. Une seule ligne <script src> l'attache, effacer cette ligne
   le retire. Il ne lit que le DOM.

   ⚠️ CE QU'IL REMPLACE. Helmy, point 29 : « "🗺️ Voir sur la grande carte" fait
   doublon avec le bouton de la carte. Le supprimer ; à la place, plein écran
   sur la carte + une croix pour revenir. »
   L'ancien bouton QUITTAIT la page pour `index.html?route=…`, puis il fallait
   restaurer l'itinéraire au retour (`sessionStorage 'the_return'`, l. 1509) —
   tout ça pour revoir une carte que la page avait déjà sous les yeux.

   ⚠️ PAS `requestFullscreen`. iOS Safari ne l'accorde qu'à une vidéo : sur un
   iPhone, l'appel échoue en silence et le bouton ne fait rien. La Tunisie est en
   production sur l'App Store — on ne peut pas se le permettre. On agrandit donc
   par le style : `position:fixed; inset:0`, ce qui marche partout, échappe à
   tout `overflow:hidden` d'un ancêtre, et se défait aussi simplement.

   ⚠️ LEAFLET DOIT APPRENDRE SA NOUVELLE TAILLE, sinon les tuiles restent
   découpées à l'ancienne mesure. On ne va pas chercher `mapObj` — il n'est pas
   sur `window` (c'est un `let` de la page, l. 1259, le piège qui a coûté trois
   défauts le 04/09). On envoie un `resize` : Leaflet l'écoute déjà de
   lui-même (`trackResize`, vrai par défaut) et se remesure tout seul.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var I18N = null, LOADING = null;

  function langue() {
    try { return localStorage.getItem("the_lang") || "fr"; } catch (e) { return "fr"; }
  }
  function load() {
    if (LOADING) return LOADING;
    LOADING = fetch("the-carte-plein.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }
  /* Zéro repli : une clé absente rend du vide, jamais du français. */
  function L(k) {
    var d = (I18N && (I18N[langue()] || I18N.en)) || {};
    return d[k] || "";
  }

  function styles() {
    if (document.getElementById("cp-css")) return;
    var s = document.createElement("style");
    s.id = "cp-css";
    s.textContent =
      /* le bouton d'entrée, sous les commandes de zoom de Leaflet */
      ".cp-go{position:absolute;left:10px;top:76px;z-index:700;width:34px;height:34px;" +
      "border:1px solid rgba(0,0,0,.2);border-radius:5px;background:#fff;color:#333;" +
      "font:16px/1 system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;" +
      "justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.25);padding:0}" +
      ".cp-go:hover{background:#f4f4f4}" +
      /* le plein écran : par le style, pas par l'API — voir l'en-tête */
      ".the-plein{position:fixed !important;inset:0 !important;width:100% !important;" +
      "height:100% !important;z-index:9000 !important;margin:0 !important;border-radius:0 !important}" +
      /* ⚠️ 44 px de côté et le coin OPPOSÉ au zoom : la croix ne doit tomber ni
         sous le pouce qui zoome, ni sous l'encoche d'un iPhone. */
      ".cp-x{position:fixed;top:calc(12px + env(safe-area-inset-top,0px));" +
      "right:calc(12px + env(safe-area-inset-right,0px));z-index:9001;" +
      "min-width:44px;min-height:44px;border:none;border-radius:50%;" +
      "background:rgba(20,15,10,.82);color:#fff;font:20px/1 system-ui,sans-serif;" +
      "cursor:pointer;display:flex;align-items:center;justify-content:center;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.4)}";
    document.head.appendChild(s);
  }

  var CROIX = null, OUVERT = false;

  /* Leaflet se remesure sur `resize` : on le lui envoie, plusieurs fois, le
     temps que la transition de taille se pose. Trois passages valent mieux
     qu'un pari sur une durée. */
  function remesurer() {
    [0, 120, 320].forEach(function (d) {
      setTimeout(function () {
        try { window.dispatchEvent(new Event("resize")); } catch (e) {}
        /* ⚠️ SE REMESURER NE SUFFIT PAS À SE REPEINDRE — vu à l'écran le
           04/09 : la carte remplissait bien la fenêtre, mais les tuiles
           restaient à l'ancien format, un rectangle au milieu d'un grand
           vide. La couche vectorielle ne peint que sur un vrai mouvement
           (Terralog, `blocs/40-carte.js` l. 71). L'hôte publie le geste ;
           on le lui demande. */
        try { if (window.THEcarteRepeindre) window.THEcarteRepeindre(); } catch (e) {}
        /* ⚠️ ET UN VRAI MOUVEMENT — mesuré en ligne le 04/09 : remesurer et
           redessiner ne suffisent pas, les tuiles du nouvel espace ne sont pas
           allées se chercher. Seul un CADRAGE les fait venir. Terralog,
           `blocs/40-carte.js` l. 71-73. En prime, c'est ce qu'on veut voir en
           plein écran : le voyage entier. */
        try { if (window.THEcarteRecadrer) window.THEcarteRecadrer(); } catch (e) {}
      }, d);
    });
  }

  function ouvrir(carte) {
    if (OUVERT) return;
    OUVERT = true;
    carte.classList.add("the-plein");
    CROIX = document.createElement("button");
    CROIX.type = "button"; CROIX.className = "cp-x";
    CROIX.textContent = "✕";
    CROIX.setAttribute("aria-label", L("quitter"));
    CROIX.title = L("quitter");
    CROIX.onclick = function () { fermer(carte); };
    document.body.appendChild(CROIX);
    document.addEventListener("keydown", auClavier);
    remesurer();
  }

  function fermer(carte) {
    if (!OUVERT) return;
    OUVERT = false;
    carte.classList.remove("the-plein");
    if (CROIX && CROIX.parentNode) CROIX.parentNode.removeChild(CROIX);
    CROIX = null;
    document.removeEventListener("keydown", auClavier);
    remesurer();
  }

  function auClavier(e) {
    if (e.key === "Escape") {
      var c = document.getElementById("map");
      if (c) fermer(c);
    }
  }

  function poser() {
    var carte = document.getElementById("map");
    if (!carte || document.querySelector(".cp-go")) return;
    styles();
    load().then(function () {
      if (document.querySelector(".cp-go")) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "cp-go";
      b.textContent = "⛶";
      b.setAttribute("aria-label", L("plein"));
      b.title = L("plein");
      b.onclick = function () { OUVERT ? fermer(carte) : ouvrir(carte); };
      carte.appendChild(b);
    });
  }

  /* La carte naît avec le rendu de l'itinéraire, pas au chargement de la page :
     on repasse tant qu'elle n'est pas là, puis on s'arrête. Même raison que la
     première passe des bornes — un bloc `defer` n'existe pas au premier rendu. */
  var essais = 0;
  var minuteur = setInterval(function () {
    poser();
    if (document.querySelector(".cp-go") || ++essais > 40) clearInterval(minuteur);
  }, 500);
  poser();

  window.THEcartePlein = { ouvrir: function () {
    var c = document.getElementById("map"); if (c) ouvrir(c); },
    fermer: function () { var c = document.getElementById("map"); if (c) fermer(c); } };
})();
