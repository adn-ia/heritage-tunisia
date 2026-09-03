/* the-diaporama.js — PROJETER LE VOYAGE, PHOTO APRÈS PHOTO.
   Sorti d'`itineraire.html` le 03/09/2026, premier bloc d'un découpage demandé
   par Helmy :

     « il vous est impossible de garder la structure du code entière ni séparer. »

   Il avait raison. Ce fichier portait 4 489 lignes, dont un seul bloc de 2 738 :
   le formulaire, la carte, les étapes, l'album, le partage, la sauvegarde et le
   premium y vivaient ensemble. Deux endroits différents y attachaient le même
   bouton. Corriger à un bout cassait à l'autre.

   CE BLOC EST ENTIER. Son HTML, son CSS et son code étaient dispersés en trois
   endroits du fichier — l'écran ligne 901, les styles ligne 388, le code ligne
   3543. Ils sont réunis ici, et il se retire en effaçant sa ligne.

   IL NE DEMANDE RIEN À LA PAGE. Il lit ce que le DOM porte déjà — les `.stop` et
   leur `.the-carnet[data-place]` — et `THECarnet.lire` pour les médias. Aucune
   variable partagée, aucune fonction empruntée : c'est ce qui l'empêche de casser
   ce qu'il ne touche pas. */
(function () {
  "use strict";
  if (window.THEdiaporama) return;

  var PROJ = [], idx = 0, joue = true, liens = [], gen = 0, son = null, minuteur = null;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";
  }
  function dire(t) { if (window.THEtoast) THEtoast(t); else if (window.THEmessage) THEmessage(t); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[<&>]/g, function (c) {
      return { "<": "&lt;", "&": "&amp;", ">": "&gt;" }[c]; });
  }
  function libererLiens() {
    liens.forEach(function (u) { try { URL.revokeObjectURL(u); } catch (e) {} });
    liens = [];
  }
  function couperLeSon() { if (son) { try { son.pause(); } catch (e) {} son = null; } }

  /* ── l'écran, posé une seule fois ─────────────────────────────────────────── */
  function ecran() {
    var ov = document.getElementById("dp-ov");
    if (ov) return ov;

    var css = document.createElement("style");
    css.textContent =
      "#dp-ov{display:none;position:fixed;inset:0;z-index:10000;background:#0b0a08}" +
      "#dp-scene{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden}" +
      "#dp-ov .dp-media{max-width:100%;max-height:100%;object-fit:contain;display:block}" +
      "#dp-num{position:absolute;top:16px;left:18px;color:#fff;font-size:13px;letter-spacing:1px;opacity:.85;z-index:2}" +
      "#dp-ctl{position:absolute;top:12px;right:12px;display:flex;gap:6px;z-index:3}" +
      "#dp-ctl button{background:rgba(255,255,255,.14);color:#fff;border:0;border-radius:8px;" +
      "width:44px;height:40px;font-size:16px;cursor:pointer}" +
      "#dp-ctl button:hover{background:rgba(255,255,255,.30)}" +
      "#dp-close{background:rgba(190,55,40,.62);font-weight:700}" +
      "#dp-close:hover{background:rgba(190,55,40,.9)}" +
      "#dp-leg{position:absolute;left:0;right:0;bottom:0;padding:26px 28px 32px;z-index:2;color:#fff;" +
      "background:linear-gradient(transparent,rgba(0,0,0,.85))}" +
      "#dp-leg .dp-nom{font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:700;line-height:1.12}" +
      "#dp-leg .dp-sous{font-size:13px;opacity:.82;letter-spacing:.5px;margin-top:2px}" +
      "#dp-leg .dp-note{font-size:16px;margin-top:9px;max-width:780px;line-height:1.5}" +
      "#dp-leg .dp-cap{font-size:15px;margin-top:6px;font-style:italic;opacity:.9}" +
      "@media print{#dp-ov{display:none!important}}";
    document.head.appendChild(css);

    ov = document.createElement("div");
    ov.id = "dp-ov";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.setAttribute("data-i18n-aria", "itineraire.aria.diaporama.du.carnet");
    ov.setAttribute("aria-label", T("itineraire.aria.diaporama.du.carnet"));
    ov.innerHTML =
      '<div id="dp-scene"></div>' +
      '<div id="dp-num"></div>' +
      '<div id="dp-ctl">' +
        '<button id="dp-prev" type="button">⏮</button>' +
        '<button id="dp-play" type="button">⏸</button>' +
        '<button id="dp-next" type="button">⏭</button>' +
        '<button id="dp-fs" type="button">⛶</button>' +
        '<button id="dp-close" type="button">✕</button>' +
      "</div>" +
      '<div id="dp-leg"></div>';
    document.body.appendChild(ov);

    ov.querySelector("#dp-prev").onclick  = precedent;
    ov.querySelector("#dp-next").onclick  = suivant;
    ov.querySelector("#dp-play").onclick  = lecturePause;
    ov.querySelector("#dp-close").onclick = fermer;
    ov.querySelector("#dp-fs").onclick = function () {
      try {
        if (!document.fullscreenElement) ov.requestFullscreen && ov.requestFullscreen();
        else document.exitFullscreen && document.exitFullscreen();
      } catch (e) {}
    };
    /* les noms sont lus par les lecteurs d'écran : ils vivent en `title` et
       `aria-label`, jamais dans un pictogramme seul. */
    [["dp-prev","diapo.precedent"],["dp-play","diapo.lecture"],["dp-next","diapo.suivant"],
     ["dp-fs","diapo.plein.ecran"],["dp-close","print.fermer"]].forEach(function (p) {
      var b = ov.querySelector("#" + p[0]), n = T(p[1]);
      if (b && n) { b.title = n; b.setAttribute("aria-label", n); }
    });
    return ov;
  }

  /* ── ce qu'il y a à projeter, lu dans le DOM ──────────────────────────────── */
  function rassembler() {
    var lire = window.THECarnet && THECarnet.lire;
    var stops = [].slice.call(document.querySelectorAll(".stop"));
    return Promise.all(stops.map(function (st) {
      var cn = st.querySelector(".the-carnet");
      if (!cn || !lire) return Promise.resolve([]);
      var nom = cn.getAttribute("data-nom") || "";
      var sous = cn.getAttribute("data-ville") || "";
      var ta = st.querySelector("textarea");
      var note = ta ? (ta.value || "") : "";
      return lire(cn.getAttribute("data-place")).then(function (arr) {
        return (arr || [])
          .filter(function (m) { return m && m.blob; })
          .sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); })
          .map(function (m, k) {
            return { nom: nom, sous: sous, blob: m.blob,
                     cap: m.caption || "", audio: m.audio || null,
                     /* la note ne se répète pas sur chaque photo d'une même étape */
                     note: (k === 0 ? note : "") };
          });
      }).catch(function () { return []; });
    })).then(function (parEtape) {
      var out = [];
      parEtape.forEach(function (l) { l.forEach(function (m) { out.push(m); }); });
      return out;
    });
  }

  /* ── projeter ─────────────────────────────────────────────────────────────── */
  function montrer(i) {
    var moi = ++gen;
    clearTimeout(minuteur); couperLeSon();
    var it = PROJ[i]; if (!it) return;
    var ov = ecran();
    var scene = ov.querySelector("#dp-scene");
    libererLiens(); scene.innerHTML = "";

    var video = String(it.blob.type || "").indexOf("video") === 0;
    var u = URL.createObjectURL(it.blob); liens.push(u);
    var media;
    if (video) {
      media = document.createElement("video");
      media.src = u; media.autoplay = true; media.playsInline = true; media.muted = !!it.audio;
    } else {
      media = document.createElement("img"); media.src = u;
    }
    media.className = "dp-media";
    scene.appendChild(media);

    ov.querySelector("#dp-num").textContent = (i + 1) + " / " + PROJ.length;
    ov.querySelector("#dp-leg").innerHTML =
        '<div class="dp-nom">' + esc(it.nom) + "</div>"
      + (it.sous ? '<div class="dp-sous">' + esc(it.sous) + "</div>" : "")
      + (it.note ? '<div class="dp-note">' + esc(it.note) + "</div>" : "")
      + (it.cap  ? '<div class="dp-cap">« ' + esc(it.cap) + " »</div>" : "");

    /* ⚠️ LE JETON `moi` — sans lui, une image quittée continue d'avancer en
       arrière-plan et fait sauter deux vues d'un coup. Chaque minuterie vérifie
       qu'elle appartient encore à la vue affichée. */
    function avancer() { if (joue && moi === gen) suivant(); }

    if (it.audio) {
      var au = URL.createObjectURL(it.audio); liens.push(au);
      son = new Audio(au);
      son.play().catch(function () {});
      if (!video) son.onended = function () { if (moi === gen) minuteur = setTimeout(avancer, 1000); };
    }
    if (video) media.onended = function () { if (moi === gen) minuteur = setTimeout(avancer, 800); };
    else if (!it.audio) minuteur = setTimeout(avancer, 6000);
  }

  function suivant()   { couperLeSon(); idx = (idx + 1) % PROJ.length; montrer(idx); }
  function precedent() { couperLeSon(); idx = (idx - 1 + PROJ.length) % PROJ.length; montrer(idx); }

  function lecturePause() {
    joue = !joue;
    var ov = ecran();
    ov.querySelector("#dp-play").textContent = joue ? "⏸" : "▶";
    if (joue) { montrer(idx); return; }
    clearTimeout(minuteur); couperLeSon();
    var v = ov.querySelector("#dp-scene video");
    if (v) { try { v.pause(); } catch (e) {} }
  }

  function fermer() {
    ++gen; clearTimeout(minuteur); couperLeSon(); libererLiens();
    var ov = document.getElementById("dp-ov");
    if (ov) { ov.querySelector("#dp-scene").innerHTML = ""; ov.style.display = "none"; }
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
  }

  function ouvrir() {
    rassembler().then(function (items) {
      if (!items.length) {
        dire(T("itineraire.votre.carnet.est.vide.pour"));
        return;
      }
      PROJ = items; idx = 0; joue = true;
      var ov = ecran();
      ov.style.display = "block";
      ov.querySelector("#dp-play").textContent = "⏸";
      try { ov.requestFullscreen && ov.requestFullscreen(); } catch (e) {}
      montrer(0);
    }).catch(function () { dire(T("itineraire.votre.carnet.est.vide.pour")); });
  }

  document.addEventListener("keydown", function (e) {
    var ov = document.getElementById("dp-ov");
    if (!ov || ov.style.display !== "block") return;
    if (e.key === "Escape") fermer();
    else if (e.key === "ArrowRight") suivant();
    else if (e.key === "ArrowLeft") precedent();
    else if (e.key === " ") { e.preventDefault(); lecturePause(); }
  });

  window.THEdiaporama = { ouvrir: ouvrir, fermer: fermer };

  /* le bouton vit dans la barre du document, posée après coup : on l'attend */
  function poser() {
    var b = document.getElementById("albumproject");
    if (b && !b._dpFait) { b._dpFait = 1; b.onclick = ouvrir; }
  }
  function guetter() {
    poser();
    try { new MutationObserver(poser).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
