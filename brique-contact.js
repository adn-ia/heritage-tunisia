/* ============================================================
   BRIQUE SOCLE — « Contact / Signaler »   (auto-portée)
   ------------------------------------------------------------
   Un bug, une info erronée, une idée → e-mail vers l'éditeur.

   • Auto-portée : embarque toute sa machinerie. Rien à câbler ailleurs.
   • Générique : lit UNIQUEMENT window.HConf (support, marqueCourte).
     AUCUNE adresse en dur. Se masque si HConf.support est vide.
   • S'INJECTE seule sur tout ancrage <… data-brique="contact">.
   • mailto SÛR : si aucune appli mail, copie l'adresse + prévient.
   • i18n : libellés par clés contact.* — aucun texte en dur.
   • Mise à jour : remplacer CE fichier, sans toucher aux autres briques.

   Dépendances hôte : heritage.config.js (HConf) tôt, the-i18n.js,
   clés contact.* fusionnées dans i18n/ui.<lang>.json.
   Ancrage type :  <section data-brique="contact"></section>
   ============================================================ */
(function () {
  "use strict";
  var H = window.HConf || {};
  function email() { return (H.support || "").trim(); }
  function brand() { return H.marqueCourte || "Heritage Experience"; }

  function t(k, v) {
    var s = (window.THEi18n && THEi18n.ui(k)); if (s == null) s = k;
    return v ? s.replace(/\{(\w+)\}/g, function (_, n) { return v[n] != null ? v[n] : "{" + n + "}"; }) : s;
  }
  function tr(el) {
    if (!(window.THEi18n && THEi18n.ui)) return;
    el.querySelectorAll("[data-i18n]").forEach(function (n) {
      var s = THEi18n.ui(n.getAttribute("data-i18n")); if (s != null) n.textContent = s;
    });
    el.querySelectorAll("[data-i18n-html]").forEach(function (n) {
      var s = THEi18n.ui(n.getAttribute("data-i18n-html")); if (s != null) n.innerHTML = s;
    });
  }

  /* mailto avec repli « copier l'adresse » si aucune appli mail ---------- */
  function safeMailto(subject, body) {
    var addr = email(); if (!addr) return;
    var blurred = false, ob = function () { blurred = true; };
    window.addEventListener("blur", ob);
    location.href = "mailto:" + addr
      + "?subject=" + encodeURIComponent(subject)
      + "&body=" + encodeURIComponent(body || "");
    setTimeout(function () {
      window.removeEventListener("blur", ob);
      if (!blurred) {
        var msg = t("contact.aucune.appli.mail") + " " + addr;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(addr).then(
            function () { alert(msg + " " + t("contact.adresse.copiee")); },
            function () { alert(msg); });
        } else { alert(msg); }
      }
    }, 1200);
  }

  function card() {
    return '<div class="brique-contact">'
      + '<h2 data-i18n="contact.titre"></h2>'
      + '<p data-i18n-html="contact.texte"></p>'
      + '<button class="btn" type="button" data-brique-contact="bug" data-i18n="contact.btn.bug"></button>'
      + '<div class="fineprint" data-i18n="contact.par.email"></div>'
      + '</div>';
  }

  function wire(root) {
    var b = root.querySelector('[data-brique-contact="bug"]');
    if (b) b.onclick = function () {
      safeMailto(t("contact.sujet.bug", { app: brand() }), t("contact.corps.bug"));
    };
  }

  function mount() {
    if (!email()) return;                          // pas d'adresse → rien
    var els = document.querySelectorAll('[data-brique="contact"]');
    [].forEach.call(els, function (a) {
      if (a.getAttribute("data-mounted")) return;
      a.innerHTML = card();
      a.setAttribute("data-mounted", "1");
      tr(a); wire(a);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else { mount(); }

  window.HContact = { email: email, mount: mount, send: safeMailto };
})();
