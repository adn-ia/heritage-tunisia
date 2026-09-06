/* the-partage.js — ENVOYER SON ITINÉRAIRE.
   Sorti d'`itineraire.html` le 04/09/2026, deuxième bloc du découpage.

   CE QU'IL PORTE. Le panneau qui se déplie sous la barre du document, ses quatre
   sorties — WhatsApp, e-mail, le partage du téléphone — et le texte que
   toutes envoient. Son écran vivait ligne 905, son code lignes 2816 et 3046, son
   branchement ligne 3525 : trois endroits pour un seul geste.

   ⚠️ LE PARTAGE NATIF DOIT RESTER DANS LE GESTE. Sur iOS, `navigator.share` n'est
   accepté que s'il est appelé DANS le clic de l'utilisateur — pas après une
   attente. Les photos sont donc préparées à l'OUVERTURE du panneau, et l'envoi ne
   fait plus que les prendre. C'est la raison d'être de `preparerLesFichiers`, et
   la raison pour laquelle elle ne doit jamais devenir asynchrone au moment du clic.

   IL NE DEMANDE RIEN À LA PAGE. Le titre, les étapes et les photos se lisent dans
   le DOM — `.album-cover h2`, les `.stop` et leur `.the-carnet[data-place]` — et
   les médias par `THECarnet.lire`. Il se retire en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEpartage) return;

  var FICHIERS = [];

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";
  }
  function dire(t) { if (window.THEtoast) THEtoast(t); else if (window.THEmessage) THEmessage(t); }

  function sansAccent(s) {
    var t = String(s || "");
    try { t = t.normalize("NFD").replace(/[̀-ͯ]/g, ""); } catch (e) {}
    return t.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "etape";
  }

  /* ── ce qu'on envoie, lu dans le DOM ──────────────────────────────────────── */
  function etapes() {
    return [].slice.call(document.querySelectorAll(".stop")).map(function (st, i) {
      var cn = st.querySelector(".the-carnet");
      return { n: i + 1,
               place: cn ? cn.getAttribute("data-place") : "",
               nom: (cn && cn.getAttribute("data-nom")) || "",
               ville: (cn && cn.getAttribute("data-ville")) || "" };
    }).filter(function (e) { return e.nom; });
  }

  function texte() {
    var liste = etapes();
    if (!liste.length) return "";
    var h = document.querySelector(".album-cover h2, #rsum h2");
    var titre = h ? h.textContent.trim() : T("itin.mon.itineraire");
    var lignes = liste.map(function (e) {
      return e.n + ". " + e.nom + (e.ville ? " (" + e.ville + ")" : "");
    });
    var marque = (window.HConf && HConf.marqueCourte) || "";
    return titre + "\n" + lignes.join("\n") + (marque ? "\n\n" + marque : "");
  }

  /* ── les photos, préparées AVANT le clic ──────────────────────────────────── */
  function preparerLesFichiers() {
    FICHIERS = [];
    if (!navigator.canShare) return;
    var lire = window.THECarnet && THECarnet.lire;
    if (!lire) return;
    etapes().forEach(function (e) {
      if (!e.place) return;
      lire(e.place).then(function (arr) {
        (arr || []).forEach(function (m, k) {
          if (!m || !m.blob) return;
          if (String(m.type || m.blob.type || "").indexOf("image") !== 0) return;
          try {
            FICHIERS.push(new File([m.blob],
              sansAccent(e.nom) + "-" + (k + 1) + ".jpg",
              { type: m.blob.type || "image/jpeg" }));
          } catch (err) {}
        });
      }).catch(function () {});
    });
  }

  /* ── les quatre sorties ───────────────────────────────────────────────────── */
  function versWhatsApp() {
    var t = texte(); if (!t) return;
    window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank");
  }
  function versEmail() {
    var t = texte(); if (!t) return;
    location.href = "mailto:?subject=" + encodeURIComponent(T("itin.mail.sujet"))
                  + "&body=" + encodeURIComponent(t);
  }
  function versTelephone() {
    if (!navigator.share) { dire(T("partage.natif.indisponible")); return; }
    var d = { title: (document.querySelector(".album-cover h2") || {}).textContent || "", text: texte() };
    /* ⚠️ SYNCHRONE. Les fichiers sont déjà là ; on n'attend rien ici, sinon iOS
       considère que le geste est fini et refuse le partage. */
    if (FICHIERS.length && navigator.canShare && navigator.canShare({ files: FICHIERS })) d.files = FICHIERS;
    navigator.share(d).catch(function () {});
  }
  /* ⚠️ « 🌍 PUBLIER SUR LE SITE » A ÉTÉ RETIRÉ — 06/09/2026, sur ordre de Helmy.
     Le bouton existait, il était traduit en cinq langues, et il répondait
     « à venir ». Un bouton qui promet sans tenir, offert au voyageur à côté de
     trois sorties qui, elles, fonctionnent. On ne le remplace pas par un
     message : on le retire. La fonction part avec lui. */

  /* ── le panneau, posé sous la barre du document ───────────────────────────── */
  function panneau() {
    var p = document.getElementById("pt-panneau");
    if (p) return p;
    var barre = document.querySelector(".album-bar");
    if (!barre || !barre.parentNode) return null;

    var css = document.createElement("style");
    css.textContent =
      "#pt-panneau{background:var(--paper,#fffdf8);border:1px solid var(--line,#e3d8c4);" +
      "border-radius:8px;padding:14px;margin-top:14px;box-shadow:0 6px 20px rgba(0,0,0,.18);display:none}" +
      "#pt-panneau.on{display:block}" +
      "#pt-panneau .pt-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}" +
      "#pt-panneau button{border:1px solid var(--line,#e3d8c4);background:#fff;border-radius:6px;" +
      "padding:10px 16px;font-family:inherit;font-size:14px;cursor:pointer;color:var(--ink,#2b2318)}" +
      "#pt-panneau button:hover{border-color:var(--gold-soft,#c9ad79)}" +
      "#pt-panneau .pt-note{font-size:12.5px;color:var(--stone,#8a7c66);text-align:center;margin-top:10px;line-height:1.5}" +
      "@media print{#pt-panneau{display:none!important}}";
    document.head.appendChild(css);

    p = document.createElement("div");
    p.id = "pt-panneau";
    p.innerHTML =
      '<div class="pt-row">' +
        '<button id="pt-wa" type="button" data-i18n="iti.whatsapp"></button>' +
        '<button id="pt-mail" type="button" data-i18n="iti.e.mail"></button>' +
        '<button id="pt-tel" type="button" data-i18n="iti.partager.photos"></button>' +
      "</div>" +
      '<div class="pt-note" data-i18n="partage.note"></div>';
    barre.parentNode.insertBefore(p, barre.nextSibling);

    p.querySelector("#pt-wa").onclick   = versWhatsApp;
    p.querySelector("#pt-mail").onclick = versEmail;
    p.querySelector("#pt-tel").onclick  = versTelephone;
    /* les libellés viennent de l'i18n ; on les pose tout de suite pour le cas où
       le balayage général est déjà passé. */
    [["pt-wa","iti.whatsapp"],["pt-mail","iti.e.mail"],["pt-tel","iti.partager.photos"],
     [null,"partage.note"]].forEach(function (c) {
      var el = c[0] ? p.querySelector("#" + c[0]) : p.querySelector(".pt-note");
      var v = T(c[1]); if (el && v) el.textContent = v;
    });
    return p;
  }

  function basculer() {
    var p = panneau(); if (!p) return;
    var ouvre = !p.classList.contains("on");
    p.classList.toggle("on", ouvre);
    if (!ouvre) return;
    preparerLesFichiers();
    /* on a pu descendre dans le document avant d'appuyer : sans cela le panneau
       s'ouvrirait hors de l'écran et le geste paraîtrait sans effet. */
    try { p.scrollIntoView({ block: "nearest", behavior: "smooth" }); } catch (e) {}
  }

  window.THEpartage = { ouvrir: basculer, texte: texte };

  function poser() {
    var b = document.getElementById("albumshare");
    if (b && !b._ptFait) { b._ptFait = 1; b.onclick = basculer; }
  }
  function guetter() {
    poser();
    try { new MutationObserver(poser).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
