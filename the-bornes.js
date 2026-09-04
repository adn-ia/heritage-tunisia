/* ═══════════════════════════════════════════════════════════════════════════
   LES BORNES DU VOYAGE — le départ et l'arrivée
   ───────────────────────────────────────────────────────────────────────────
   Bloc auto-porté. Il s'attache par une seule ligne <script src>, et se retire
   en supprimant cette ligne : il ne lit que le DOM et les objets publics de
   l'hôte (`THEvoyage()`, `THEetape`), et n'écrit rien ailleurs.

   ⚠️ CE QU'IL FAIT, ET POURQUOI — 04/09/2026, Helmy :
   « sur Terralog on définit un point de départ dès le début. Si le voyage est
     une boucle ou un aller-retour, le point de départ et le point d'arrivée
     clôture l'itinéraire — bien entendu on peut changer le point de départ.
     Sur un aller simple le point de départ est différent du point d'arrivée,
     donc on définit le point d'arrivée à la fin de l'itinéraire. Ou alors au
     début on définit le point de départ puis on définit le point d'arrivée, et
     on remplit entre. Si on change, on édite. »

   Trois manques mesurés dans la Tunisie ce jour-là :
     · aucune fiche d'arrivée dans la liste, même en boucle (Terralog en pose
       une : `blocs/20-itineraire.js` l. 745-753) ;
     · aucun moyen de changer le point de départ, jamais ;
     · aucun point d'arrivée en aller simple.

   ⚠️ L'ARRIVÉE N'EST PAS UNE ÉTAPE. En boucle et en aller-retour elle n'a
   AUCUNE existence propre : elle EST le départ, et le dire deux fois serait
   mentir. On l'affiche donc en lecture seule, avec un mot qui renvoie au
   départ — Terralog l. 743 : « elle ne se change pas directement : son lieu
   EST le départ ». En aller simple seulement, elle a son propre lieu.

   ⚠️ « rtReturnsHome » EST LA RÈGLE, PAS « boucle ». Terralog
   (`blocs/20-itineraire.js` l. 590) : `rtReturnsHome() = forme !== 'oneway'`.
   La Tunisie ne refermait que la boucle ; l'aller-retour doublait les
   kilomètres sans jamais rentrer. Même règle ici : tout ce qui n'est pas un
   aller simple revient au départ.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var I18N = null, LOADING = null;

  function langue() {
    try { return localStorage.getItem("the_lang") || "fr"; } catch (e) { return "fr"; }
  }
  function load() {
    if (LOADING) return LOADING;
    LOADING = fetch("the-bornes.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }
  /* ⚠️ ZÉRO REPLI. Une clé absente rend une chaîne vide — jamais du français
     glissé dans une page allemande. Un repli masque le trou et le fait croire
     réparé ; le vide se voit et se répare. */
  function L(k) {
    var d = (I18N && (I18N[langue()] || I18N.en)) || {};
    return d[k] || "";
  }
  function ech(x) {
    return String(x == null ? "" : x).replace(/[<>&"]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
    });
  }

  function styles() {
    if (document.getElementById("bornes-css")) return;
    var s = document.createElement("style");
    s.id = "bornes-css";
    s.textContent =
      /* ⚠️ SUR SON PROPRE PAPIER — 04/09/2026. Première écriture : fond
         transparent, encre `--ink`. Vu à l'écran : le nom du départ INVISIBLE.
         Les bornes sont hors des panneaux clairs, posées sur le fond sombre de
         la page ; l'encre des panneaux y disparaît. Une fiche d'étape le savait
         déjà — `.stop` porte `background:var(--paper)` (itineraire.html l. 127).
         On prend le même papier, et le trait reste pointillé : une borne n'est
         pas une étape, et ça doit se voir d'un coup d'œil. */
      ".borne{display:flex;align-items:center;gap:10px;padding:11px 13px;margin:10px 0;" +
      "border:1px dashed var(--gold-soft,#c9ad79);border-radius:8px;" +
      "background:var(--paper,#fffdf8);color:var(--ink,#2b2318)}" +
      ".borne .b-ic{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;" +
      "justify-content:center;background:var(--ivory,#f6f0e4);flex:0 0 auto;font-size:14px}" +
      ".borne .b-txt{flex:1;min-width:0}" +
      ".borne .b-lbl{font-size:12px;letter-spacing:.04em;text-transform:uppercase;" +
      "color:var(--stone,#8a7c66)}" +
      ".borne .b-nom{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".borne .b-note{font-size:12px;color:var(--stone,#8a7c66);white-space:normal}" +
      /* 44 px de cible : la règle d'Apple, et celle du doigt. */
      ".borne .b-go{min-width:44px;min-height:44px;border:1px solid var(--line,#e3d8c4);" +
      "border-radius:8px;background:var(--ivory,#f6f0e4);color:var(--ink,#2b2318);" +
      "font-family:inherit;font-size:13px;cursor:pointer;" +
      "padding:0 12px;flex:0 0 auto}" +
      ".borne.b-vide .b-nom{color:var(--stone,#8a7c66);font-weight:400;font-style:italic}";
    document.head.appendChild(s);
  }

  /* ⚠️ ON NE LIT PAS `LASTRES` : IL N'EST PAS SUR `window` — mesuré le 04/09/2026.
     La page le déclare en `let` dans sa propre portée (`itineraire.html` l. 1259) ;
     `window.LASTRES` vaut donc `undefined`, et le bloc ne dessinait rien du tout
     sans lever la moindre erreur. L'API publique de lecture, c'est `THEvoyage()`
     — faite pour ça, et qui rend une COPIE : lire ne devient jamais une porte
     pour écrire. Un bloc auto-porté ne connaît l'hôte que par là. */
  function voyage() {
    try { return (window.THEvoyage && THEvoyage()) || null; } catch (e) { return null; }
  }
  function forme() {
    var v = voyage();
    return (v && v.forme) || "oneway";
  }
  /* La règle de Terralog, `blocs/20-itineraire.js` l. 590, mot pour mot. */
  function revientAuDepart() { return forme() !== "oneway"; }

  function fiche(quoi, icone, libelle, nom, note, action, vide) {
    var d = document.createElement("div");
    d.className = "borne b-" + quoi + (vide ? " b-vide" : "");
    d.innerHTML =
      '<div class="b-ic">' + icone + "</div>" +
      '<div class="b-txt"><div class="b-lbl">' + ech(libelle) + "</div>" +
      '<div class="b-nom">' + ech(nom) + "</div>" +
      (note ? '<div class="b-note">' + ech(note) + "</div>" : "") +
      "</div>" +
      (action ? '<button type="button" class="b-go">' + ech(action) + "</button>" : "");
    if (action) {
      d.querySelector(".b-go").onclick = function () { editer(quoi); };
    }
    return d;
  }

  function editer(quoi) {
    if (!window.THEetape || !THEetape.ouvrir) return;
    var v = null, j = voyage();
    if (j) {
      if (quoi === "depart" && j.origine) v = { nom: j.origine.label || "", coord: j.origine.coord };
      else if (quoi === "arrivee" && j.arrivee) v = { nom: j.arrivee.label || "", coord: j.arrivee.coord };
    }
    THEetape.ouvrir({ borne: quoi, valeurs: v });
  }

  /* ⚠️ UNE BORNE N'EST PAS UNE ÉTAPE : ELLE NE VA PAS DANS `#stops` — 04/09/2026.
     Première écriture : j'insérais les deux fiches DANS la liste des étapes. Mesuré :
     `dessiner()` appelée **8 513 fois** en un rendu. `the-etape.js` l. 271 pose un
     MutationObserver sur `#stops` ; toute insertion le réveille, il repasse sur les
     cartes, le rendu repart, et me rappelle — une boucle qui ne se referme jamais et
     qui finit par tout effacer. D'où l'écran sans bornes : elles étaient posées et
     reprises des milliers de fois.

     La correction est aussi la bonne conception : le départ et l'arrivée ne sont pas
     des étapes — pas de numéro, pas de carnet, pas de place dans l'ordre. Ils ont
     donc leurs propres boîtes, l'une AVANT la liste et l'autre APRÈS. Le conteneur
     observé n'est plus touché du tout. */
  function boite(id, avant) {
    var b = document.getElementById(id);
    if (b) return b;
    var stops = document.getElementById("stops");
    if (!stops || !stops.parentNode) return null;
    b = document.createElement("div");
    b.id = id;
    stops.parentNode.insertBefore(b, avant ? stops : stops.nextSibling);
    return b;
  }

  /* Appelée par l'hôte à la fin de `render()`. Elle ne dessine QUE les bornes :
     les étapes, la carte et l'en-tête ne la regardent pas. */
  function dessiner() {
    var haut = boite("the-borne-haut", true), bas = boite("the-borne-bas", false);
    if (!haut || !bas) return;
    load().then(function () {
      haut.innerHTML = ""; bas.innerHTML = "";
      var j = voyage();
      if (!j || !j.etapes || !j.etapes.length) return;
      styles();

      /* ── LE DÉPART, AVANT LA LISTE ───────────────────────────────────────
         Il existe toujours : l'hôte en pose un dès la composition. Ce qui
         manquait, c'est de le VOIR et de pouvoir le changer. */
      var o = j.origine;
      haut.appendChild(fiche("depart", "⌂", L("depart"),
        (o && o.label) || L("depart.aucun"), "", L("changer"), !(o && o.coord)));

      /* ⚠️ UN VOYAGE LIBRE N'A PAS D'ARRIVÉE — 04/09/2026, Helmy : « le voyage
         libre n'a pas besoin de forme. Il se définit de jour en jour, étape par
         étape. Il a besoin d'un point de départ, c'est tout. »
         C'est exact, et ça se voyait : on lui demandait « dites où le voyage se
         termine » alors que par nature il ne le sait pas — c'est même sa
         définition. On ne pose donc que le départ, et la liste finit sur la
         dernière étape posée, comme le voyage lui-même. La forme, elle, n'est
         demandée que dans « Composer » (question 6) : il n'y a rien à y ajouter. */
      if (j.mode === "libre") return;

      /* ── L'ARRIVÉE, APRÈS LA LISTE ───────────────────────────────────────
         Boucle et aller-retour : c'est le départ, en lecture seule — le
         changer ici serait mentir, son lieu EST le départ (Terralog l. 743).
         Aller simple : son propre lieu, à définir puis à changer. */
      if (j.forme !== "oneway") {
        if (!o || !o.coord) return;
        bas.appendChild(fiche("arrivee", "🏁", L("arrivee"),
          (o.label || "") + " — " + L("arrivee.retour"),
          L("arrivee.retour.note"), "", false));
      } else {
        var a = j.arrivee, pose = !!(a && a.coord);
        bas.appendChild(fiche("arrivee", "🏁", L("arrivee"),
          pose ? a.label || "" : L("arrivee.aucune"), "",
          pose ? L("changer") : L("definir"), !pose));
      }
    });
  }

  load();
  window.THEbornes = { dessiner: dessiner, editer: editer, revientAuDepart: revientAuDepart };

  /* ⚠️ UNE PREMIÈRE PASSE POUR SON PROPRE COMPTE — 04/09/2026. Le crochet de
     l'hôte (`itineraire.html`, fin de `render()`) teste `window.THEbornes` et
     saute en silence s'il n'existe pas encore. Or au tout premier rendu il
     n'existe PAS : la page se dessine pendant son analyse, et ce fichier est
     `defer` — il ne s'exécute qu'après. Mesuré : les bornes n'apparaissaient
     qu'au deuxième rendu, donc jamais si l'on ne touchait à rien.
     Un bloc auto-porté ne doit pas dépendre de l'ordre de chargement : il se
     dessine donc une fois tout seul, à l'arrivée. Idiome de la maison, repris
     de Terralog `blocs/roadtrip-plan.js` l. 570 — même remède, même raison. */
  function premierePasse() { setTimeout(dessiner, 400); }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", premierePasse);
  } else {
    premierePasse();
  }
})();
