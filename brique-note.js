/* ============================================================
   BRIQUE SOCLE — « Notez l'application »   (auto-portée)
   ------------------------------------------------------------
   Invite le visiteur à laisser une VRAIE évaluation sur le store
   (App Store / Google Play), là où ça récompense le travail.

   • Auto-portée : embarque toute sa machinerie. Rien à câbler ailleurs.
   • Générique : lit UNIQUEMENT window.HConf (appStoreId / appStore /
     playStore / androidPackage / marqueCourte). AUCUNE valeur en dur.
   • S'INJECTE seule sur tout ancrage <… data-brique="note-app">.
   • Se MASQUE si aucun lien store n'est configuré (édition sans store).
   • i18n : libellés par clés note.* (traduits par the-i18n.js) — aucun
     texte en dur. Repli neutre.
   • Mise à jour : remplacer CE fichier, sans toucher aux autres briques.

   Dépendances hôte : heritage.config.js (HConf) chargé tôt, the-i18n.js,
   et les clés note.* fusionnées dans i18n/ui.<lang>.json.
   Ancrage type :  <section data-brique="note-app"></section>
   ============================================================ */
(function () {
  "use strict";
  var H = window.HConf || {};

  /* --- Liens store (deep-links de NOTATION, pas la simple fiche) --------- */
  function appStoreReview() {
    var id = H.appStoreId || "";
    if (id) return "https://apps.apple.com/app/id" + id + "?action=write-review";
    return H.appStore || "";                 // à défaut : la fiche App Store
  }
  function playReview() {
    var url = H.playStore || "";
    if (!url && H.androidPackage) {
      url = "https://play.google.com/store/apps/details?id=" + H.androidPackage;
    }
    if (url && url.indexOf("showAllReviews") < 0) {
      url += (url.indexOf("?") < 0 ? "?" : "&") + "showAllReviews=true";
    }
    return url;
  }
  function links() { return { ios: appStoreReview(), play: playReview() }; }
  function hasAny() { var l = links(); return !!(l.ios || l.play); }

  /* --- i18n : appliquer les clés note.* sur un sous-arbre injecté -------- */
  function tr(el) {
    if (!(window.THEi18n && THEi18n.ui)) return;   // observer prendra le relais
    el.querySelectorAll("[data-i18n]").forEach(function (n) {
      var s = THEi18n.ui(n.getAttribute("data-i18n")); if (s != null) n.textContent = s;
    });
  }

  /* --- Gabarit de la carte ---------------------------------------------- */
  function card() {
    var l = links(), h = '<div class="brique-note">'
      + '<h2 data-i18n="note.titre"></h2>'
      + '<p data-i18n="note.texte"></p>'
      + '<div class="brique-note-btns">';
    if (l.ios)  h += '<a class="btn" href="' + l.ios  + '" target="_blank" rel="noopener" data-i18n="note.btn.appstore"></a>';
    if (l.play) h += '<a class="btn' + (l.ios ? ' ghost' : '') + '" href="' + l.play + '" target="_blank" rel="noopener" data-i18n="note.btn.play"></a>';
    h += '</div><div class="fineprint" data-i18n="note.merci"></div></div>';
    return h;
  }

  /* --- Montage sur les ancrages ----------------------------------------- */
  function mount() {
    if (!hasAny()) return;                         // aucune config store → rien
    var els = document.querySelectorAll('[data-brique="note-app"]');
    [].forEach.call(els, function (a) {
      if (a.getAttribute("data-mounted")) return;
      a.innerHTML = card();
      a.setAttribute("data-mounted", "1");
      tr(a);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else { mount(); }

  /* --- API publique (rappel doux après engagement, optionnel) ------------
     Appeler HNote.maybePrompt() après un moment de plaisir (fin d'itinéraire,
     N fiches ouvertes…). N'affiche qu'une fois, jamais harcelant. L'hôte
     décide OÙ l'appeler ; la brique gère la fréquence.                    */
  var SEEN = "h_note_prompt";
  window.HNote = {
    links: links,
    available: hasAny,
    mount: mount,
    maybePrompt: function () {
      if (!hasAny()) return false;
      try { if (localStorage.getItem(SEEN)) return false; } catch (e) {}
      var host = document.querySelector('[data-brique="note-app-prompt"]');
      if (!host) return false;
      host.innerHTML = card();
      host.setAttribute("data-mounted", "1");
      tr(host); host.style.display = "";
      try { localStorage.setItem(SEEN, "1"); } catch (e) {}
      return true;
    }
  };
})();
