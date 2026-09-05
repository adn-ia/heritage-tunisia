/* ═══════════════════════════════════════════════════════════════════════════
   OÙ PLACER UN LIEU — la pépite ne tombe plus à la fin
   ───────────────────────────────────────────────────────────────────────────
   Bloc auto-porté. Une seule ligne <script src> l'attache ; l'effacer le retire.
   Il ne lit que `THEvoyage()`, l'API publique de lecture de l'hôte.

   ⚠️ CE QU'IL CORRIGE — 05/09/2026, Helmy : « quand on sélectionne plusieurs
   pépites sur le parcours, ou qu'on clique sur "ce qu'il y a autour de moi" sur
   l'étape, on peut sélectionner une ou plusieurs propositions ; si on dit
   "rajouter à l'étape", elles se mettent toutes à la fin. Alors qu'avant chaque
   ajout on peut demander où l'intercaler. Par défaut : si elles ont été
   sélectionnées sur le parcours entre deux étapes, entre ces deux étapes-là ; si
   elles sont le résultat de "ce qu'il y a autour de moi" d'une étape, juste après
   cette étape. Pour chaque sélection on propose : rajouter après l'étape X, ou à
   visiter à partir de l'étape X. »

   ⚠️ LE DÉFAUT PORTE LA PROVENANCE. Un lieu trouvé « en chemin vers l'étape 4 »
   appartient au trajet 3 → 4 : sa place naturelle est AVANT la 4, pas au bout du
   voyage. Un lieu trouvé autour de l'étape 4 appartient à la 4. L'appelant nous
   dit d'où il vient ; nous ne le devinons pas.

   ⚠️ DEUX NATURES, PAS UNE. « Après l'étape X » en fait une étape à part entière.
   « À visiter au départ de l'étape X » en fait une visite rattachée — le
   mécanisme existe déjà dans `roadtrip-plan.js` (l. 512-514) et c'est LUI qu'on
   appelle, par `THEplanRattacherVisite`. On ne réinvente pas un second modèle de
   données pour la même idée.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var I18N = null, LOADING = null;

  function langue() {
    try { return localStorage.getItem("the_lang") || "fr"; } catch (e) { return "fr"; }
  }
  function load() {
    if (LOADING) return LOADING;
    LOADING = fetch("the-placer.data.json", { cache: "no-cache" })
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
  function ech(x) {
    return String(x == null ? "" : x).replace(/[<>&"]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c];
    });
  }

  function styles() {
    if (document.getElementById("pl-css")) return;
    var s = document.createElement("style");
    s.id = "pl-css";
    s.textContent =
      /* ⚠️ `100dvh` et non `inset:0` : sur iOS la barre du bas de Safari est posée
         PAR-DESSUS la fenêtre théorique, et le dernier bouton d'une fenêtre haute
         devient intouchable. C'est la panne du bouton « Fermer » du carnet,
         réparée le même jour — on ne la refait pas ici. */
      "#pl-modal{position:fixed;inset:0;height:100dvh;z-index:1600;display:none;" +
      "align-items:center;justify-content:center;background:rgba(20,15,10,.78);" +
      "padding:18px;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px));overflow:auto}" +
      "#pl-modal.on{display:flex}" +
      "#pl-modal .pl-box{background:var(--paper,#fffdf8);color:var(--ink,#2b2318);border-radius:14px;" +
      "padding:18px;max-width:440px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.5);" +
      "max-height:calc(100dvh - 36px - env(safe-area-inset-bottom,0px));overflow:auto}" +
      "#pl-modal h3{font-family:'Cormorant Garamond',Georgia,serif;margin:0 0 12px;font-size:20px}" +
      "#pl-modal select{width:100%;padding:11px;border:1px solid var(--line,#e3d8c4);border-radius:8px;" +
      "font:inherit;font-size:16px;background:#fff;color:var(--ink,#2b2318);margin-bottom:14px}" +
      /* 44 px de haut : la règle du doigt, et celle d'Apple. */
      "#pl-modal .pl-go{display:block;width:100%;min-height:44px;margin-bottom:9px;padding:12px;" +
      "border:none;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;" +
      "background:var(--gold,#a8884f);color:#fff}" +
      "#pl-modal .pl-go.pl-second{background:var(--ivory,#f6f0e4);color:var(--ink,#2b2318);" +
      "border:1px solid var(--line,#e3d8c4);font-weight:400}" +
      "#pl-modal .pl-no{display:block;width:100%;min-height:44px;padding:11px;border:none;" +
      "background:none;color:var(--stone,#8a7c66);font:inherit;cursor:pointer}";
    document.head.appendChild(s);
  }

  function boite() {
    var m = document.getElementById("pl-modal");
    if (m) return m;
    m = document.createElement("div");
    m.id = "pl-modal";
    m.innerHTML = '<div class="pl-box"></div>';
    document.body.appendChild(m);
    /* Un seul écouteur, posé une fois — la leçon du carnet, 05/09 : trois
       câblages pour un geste, c'est trois pannes possibles. */
    m.addEventListener("click", function (e) {
      if (e.target === m) fermer(null);
    });
    return m;
  }

  var RESOUDRE = null;

  function fermer(choix) {
    var m = document.getElementById("pl-modal");
    if (m) m.classList.remove("on");
    var f = RESOUDRE; RESOUDRE = null;
    if (f) f(choix);
  }

  /* opts = { nb, apres, base }
       nb    : combien de lieux on place (le titre s'accorde)
       apres : index d'étape après lequel proposer (-1 = au début)
       base  : index de l'étape d'où vient la demande, pour la visite
     Rend une promesse : { apres: n, role: 'etape'|'visite' } ou null si on renonce. */
  function ouvrir(opts) {
    opts = opts || {};
    return load().then(function () {
      styles();
      var v = null;
      try { v = (window.THEvoyage && window.THEvoyage()) || null; } catch (e) {}
      if (!v || !v.etapes || !v.etapes.length) return null;

      var etapes = v.etapes;
      var defaut = (opts.apres == null) ? etapes.length - 1 : opts.apres;
      if (defaut < -1) defaut = -1;
      if (defaut > etapes.length - 1) defaut = etapes.length - 1;

      var options = '<option value="-1">' + ech(L("inserer.debut")) + "</option>";
      etapes.forEach(function (e, i) {
        options += '<option value="' + i + '"' + (i === defaut ? " selected" : "") + ">" +
          ech((L("inserer.apres") || "").split("{n}").join(e.nom || "")) + "</option>";
      });

      var m = boite();
      m.querySelector(".pl-box").innerHTML =
        "<h3>" + ech(opts.nb > 1 ? L("titre.n") : L("titre.un")) + "</h3>" +
        '<div style="font-size:13px;color:var(--stone,#8a7c66);margin:-6px 0 8px">' +
        ech(L("inserer")) + "</div>" +
        '<select id="pl-ou">' + options + "</select>" +
        '<button type="button" class="pl-go" id="pl-etape">' + ech(L("comme.etape")) + "</button>" +
        '<button type="button" class="pl-go pl-second" id="pl-visite">' + ech(L("comme.visite")) + "</button>" +
        '<button type="button" class="pl-no" id="pl-non">' + ech(L("annuler")) + "</button>";
      m.classList.add("on");

      function lu() {
        var s = document.getElementById("pl-ou");
        var n = parseInt(s && s.value, 10);
        return isNaN(n) ? -1 : n;
      }
      document.getElementById("pl-etape").onclick = function () { fermer({ apres: lu(), role: "etape" }); };
      document.getElementById("pl-visite").onclick = function () {
        var n = lu();
        /* ⚠️ « Au début » n'a pas d'étape d'où partir : une visite doit se
           rattacher à quelque chose. On la rattache alors à la première. */
        fermer({ apres: n, role: "visite", base: n < 0 ? 0 : n });
      };
      document.getElementById("pl-non").onclick = function () { fermer(null); };

      return new Promise(function (res) { RESOUDRE = res; });
    });
  }

  window.THEplacer = { ouvrir: ouvrir };
})();
