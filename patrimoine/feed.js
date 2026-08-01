/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — Contributions & modération (F2). Fille publique + console.
   • Onglet Contributions : liste linéaire (titre + réf. site) → MODALE (grande,
     pas plein écran) : détail + commentaires + photo. Tous lisent/commentent.
   • INP/Mère connectés (Google) : valider · rejeter (motif) · éditer · supprimer
     · télécharger (PDF/HTML). Pouvoirs imposés par les règles Firestore.
   • Onglet Statuts : contributions validées / rejetées + motif.
   Rôle = login Google (allowlist config). Public = sans compte (form nominatif).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  function T(k, v) { return window.PATi18n ? PATi18n.uiT(k, v) : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function okMail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function fmt(ts) { try { var d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleDateString(PATi18n ? PATi18n.lang() : "fr") : ""; } catch (e) { return ""; } }
  function isAdmin() { var r = window.PatFB && PatFB.ready && PatFB.role && PatFB.role(); return r === "mere" || r === "inp"; }
  function statusKey(st) { return { pending: "attente", validated: "valide", rejected: "rejete" }[st] || "attente"; }
  function badge(st) { var k = statusKey(st); return '<span class="fb-badge ' + k + '">' + esc(T("patrimoine.feed.statut." + k)) + "</span>"; }

  var SUBS = [], curId = null, unsubComments = null;

  /* ── liste linéaire (une ligne = titre + réf. + statut) ── */
  function rowEl(s) {
    var el = document.createElement("button"); el.type = "button"; el.className = "fb-row";
    el.innerHTML =
      '<span class="fb-row-main"><b>' + esc(s.site || T("patrimoine.feed.site.inconnu")) + "</b>" +
      (s.siteId ? '<span class="fb-ref">' + esc(T("patrimoine.feed.ref")) + " " + esc(s.siteId) + "</span>" : "") +
      "</span>" +
      '<span class="fb-row-meta">' + badge(s.status) + '<span class="fb-row-date">' + fmt(s.createdAt) + "</span></span>";
    el.addEventListener("click", function () { openModal(s.id); });
    return el;
  }

  /* ── modale (grande, pas plein écran) ── */
  function ensureModal() {
    var m = document.getElementById("cmodal");
    if (m) return m;
    m = document.createElement("div"); m.className = "cmodal"; m.id = "cmodal"; m.hidden = true;
    m.innerHTML = '<div class="cmodal-box"><button class="cmodal-x" type="button" aria-label="fermer">×</button><div class="cmodal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) closeModal(); });
    m.querySelector(".cmodal-x").addEventListener("click", closeModal);
    return m;
  }
  function closeModal() { var m = document.getElementById("cmodal"); if (m) m.hidden = true; curId = null; if (unsubComments) { unsubComments(); unsubComments = null; } }

  function find(id) { for (var i = 0; i < SUBS.length; i++) if (SUBS[i].id === id) return SUBS[i]; return null; }

  function openModal(id) {
    var s = find(id); if (!s) return;
    curId = id;
    var m = ensureModal(), body = m.querySelector(".cmodal-body");
    var photo = s.photoUrl ? '<a class="fb-photo" href="' + esc(s.photoUrl) + '" target="_blank" rel="noopener">' + esc(T("patrimoine.feed.photo")) + (s.photoCredit ? " — " + esc(s.photoCredit) : "") + "</a>" : "";
    var admin = isAdmin();
    body.innerHTML =
      '<div class="cm-head"><h2>' + esc(s.site || T("patrimoine.feed.site.inconnu")) + "</h2>" + badge(s.status) + "</div>" +
      (s.siteId ? '<div class="cm-ref">' + esc(T("patrimoine.feed.ref")) + " " + esc(s.siteId) + (s.gov ? " · " + esc(s.gov) : "") + "</div>" : (s.gov ? '<div class="cm-ref">' + esc(s.gov) + "</div>" : "")) +
      (s.etat ? '<div class="cm-etat">' + esc(T("patrimoine.fiche.etat")) + " : " + esc(s.etat) + "</div>" : "") +
      '<p class="cm-obs">' + esc(s.obs) + "</p>" + photo +
      '<div class="cm-meta">' + esc(T("patrimoine.feed.par")) + " " + esc(s.nom) + " · " + fmt(s.createdAt) + "</div>" +
      (s.status === "rejected" && s.reason ? '<div class="cm-reason">' + esc(T("patrimoine.statuts.motif")) + " " + esc(s.reason) + "</div>" : "") +
      (admin ? adminBar(s) : "") +
      '<div class="cm-comments"><h3>' + esc(T("patrimoine.feed.commentaires")) + '</h3><div class="cm-clist">…</div>' +
        '<div class="cm-cform"><input class="cm-cnom" placeholder="' + esc(T("patrimoine.contrib.nom")) + '"><input class="cm-cmail" placeholder="' + esc(T("patrimoine.contrib.email")) + '">' +
        '<textarea class="cm-ctext" placeholder="' + esc(T("patrimoine.feed.votre.commentaire")) + '"></textarea>' +
        '<button class="cm-csend" type="button">' + esc(T("patrimoine.feed.publier")) + '</button><span class="cm-cmsg"></span></div></div>';
    wireComments(id, body);
    if (admin) wireAdmin(id, body);
    m.hidden = false;
  }

  function adminBar(s) {
    return '<div class="cm-admin"><span class="cm-admin-lbl">' + esc(T("patrimoine.mod.moderation")) + "</span>" +
      (s.status !== "validated" ? '<button class="cm-btn ok" data-act="validate">' + esc(T("patrimoine.mod.valider")) + "</button>" : "") +
      (s.status !== "rejected" ? '<button class="cm-btn no" data-act="reject">' + esc(T("patrimoine.mod.rejeter")) + "</button>" : "") +
      '<button class="cm-btn" data-act="edit">' + esc(T("patrimoine.mod.editer")) + "</button>" +
      '<button class="cm-btn" data-act="download">' + esc(T("patrimoine.mod.telecharger")) + "</button>" +
      '<button class="cm-btn danger" data-act="delete">' + esc(T("patrimoine.mod.supprimer")) + "</button></div>";
  }

  function wireAdmin(id, body) {
    var s = find(id);
    body.querySelectorAll(".cm-admin [data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        if (act === "validate") { PatFB.setStatus(id, "validated").catch(err); }
        else if (act === "reject") { var r = prompt(T("patrimoine.mod.motif")); if (r != null) PatFB.setStatus(id, "rejected", r).catch(err); }
        else if (act === "delete") { if (confirm(T("patrimoine.mod.confirm.suppr"))) { PatFB.deleteSubmission(id).then(closeModal, err); } }
        else if (act === "edit") { editForm(id, body); }
        else if (act === "download") { downloadOne(s); }
      });
    });
  }
  function err(e) { alert(T("patrimoine.contrib.erreur")); }

  /* ── édition admin en place ── */
  function editForm(id, body) {
    var s = find(id); if (!s) return;
    var wrap = document.createElement("div"); wrap.className = "cm-edit";
    wrap.innerHTML =
      '<label>' + esc(T("patrimoine.contrib.site")) + '</label><input class="e-site" value="' + esc(s.site) + '">' +
      '<label>' + esc(T("patrimoine.contrib.obs")) + '</label><textarea class="e-obs">' + esc(s.obs) + "</textarea>" +
      '<label>' + esc(T("patrimoine.contrib.photo")) + '</label><input class="e-photo" value="' + esc(s.photoUrl || "") + '">' +
      '<div class="cm-edit-act"><button class="cm-btn ok" data-e="save">' + esc(T("patrimoine.mod.enregistrer")) + '</button><button class="cm-btn" data-e="cancel">' + esc(T("patrimoine.mod.annuler")) + "</button></div>";
    body.querySelector(".cm-admin").after(wrap);
    wrap.querySelector('[data-e="cancel"]').addEventListener("click", function () { wrap.remove(); });
    wrap.querySelector('[data-e="save"]').addEventListener("click", function () {
      PatFB.updateSubmission(id, { site: wrap.querySelector(".e-site").value.trim(), obs: wrap.querySelector(".e-obs").value.trim(), photoUrl: wrap.querySelector(".e-photo").value.trim() })
        .then(function () { wrap.remove(); }, err);
    });
  }

  /* ── commentaires ── */
  function wireComments(id, body) {
    var list = body.querySelector(".cm-clist");
    if (unsubComments) { unsubComments(); unsubComments = null; }
    unsubComments = PatFB.watchComments(id, function (cs) {
      if (!cs.length) { list.innerHTML = '<div class="fb-cempty">' + esc(T("patrimoine.feed.aucun.commentaire")) + "</div>"; return; }
      list.innerHTML = cs.map(function (c) {
        return '<div class="fb-c"><span class="fb-cauthor">' + esc(c.nom) + (c.role && c.role !== "public" ? ' <em class="fb-crole">' + esc(c.role) + "</em>" : "") + '</span><span class="fb-cdate">' + fmt(c.createdAt) + "</span><p>" + esc(c.text) + "</p></div>";
      }).join("");
    });
    var send = body.querySelector(".cm-csend"), msg = body.querySelector(".cm-cmsg");
    send.addEventListener("click", function () {
      var nom = body.querySelector(".cm-cnom").value.trim(), mail = body.querySelector(".cm-cmail").value.trim(), text = body.querySelector(".cm-ctext").value.trim();
      if (!nom || !text || !okMail(mail)) { msg.textContent = T("patrimoine.contrib.requis"); return; }
      send.disabled = true; msg.textContent = T("patrimoine.contrib.envoi");
      PatFB.addComment(id, { nom: nom, email: mail, text: text }).then(function () { body.querySelector(".cm-ctext").value = ""; msg.textContent = ""; send.disabled = false; }, function () { msg.textContent = T("patrimoine.contrib.erreur"); send.disabled = false; });
    });
  }

  /* ── téléchargement d'une contribution (PDF via impression + HTML autonome) ── */
  function contribHTML(s) {
    return '<!doctype html><meta charset="utf-8"><title>' + esc(s.site || "Contribution") + '</title>' +
      '<style>body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#2b2318;line-height:1.6;padding:0 20px}h1{font-size:26px}.k{color:#8a7c66;font-size:13px}.r{margin:6px 0}a{color:#a8884f}</style>' +
      "<h1>" + esc(s.site || "—") + "</h1>" +
      (s.siteId ? '<div class="r"><span class="k">Réf.</span> ' + esc(s.siteId) + "</div>" : "") +
      (s.gov ? '<div class="r"><span class="k">Gouvernorat</span> ' + esc(s.gov) + "</div>" : "") +
      (s.etat ? '<div class="r"><span class="k">État</span> ' + esc(s.etat) + "</div>" : "") +
      '<div class="r"><span class="k">Observation</span><br>' + esc(s.obs) + "</div>" +
      (s.photoUrl ? '<div class="r"><span class="k">Photo</span> <a href="' + esc(s.photoUrl) + '">' + esc(s.photoUrl) + "</a>" + (s.photoCredit ? " (" + esc(s.photoCredit) + ")" : "") + "</div>" : "") +
      '<div class="r"><span class="k">Proposé par</span> ' + esc(s.nom) + " · " + esc(s.email) + " · " + fmt(s.createdAt) + "</div>" +
      '<div class="r"><span class="k">Statut</span> ' + esc(T("patrimoine.feed.statut." + statusKey(s.status))) + (s.reason ? " — " + esc(s.reason) : "") + "</div>";
  }
  function downloadOne(s) {
    // HTML autonome
    try {
      var blob = new Blob([contribHTML(s)], { type: "text/html" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "contribution-" + (s.siteId || s.id) + ".html"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    } catch (e) {}
    // PDF via fenêtre d'impression
    try {
      var w = window.open("", "_blank");
      if (w) { w.document.write(contribHTML(s)); w.document.close(); setTimeout(function () { w.print(); }, 300); }
    } catch (e) {}
  }

  /* ── rendus des 2 onglets ── */
  function note(el, key) { el.innerHTML = '<p class="fb-note">' + esc(T(key)) + "</p>"; }
  function renderAll() {
    var fl = document.getElementById("feedList"), sl = document.getElementById("statutsList");
    if (SUBS === null) { if (fl) note(fl, "patrimoine.feed.avenir"); if (sl) note(sl, "patrimoine.feed.avenir"); return; }
    var pending = SUBS.filter(function (s) { return s.status !== "validated" && s.status !== "rejected"; });
    var done = SUBS.filter(function (s) { return s.status === "validated" || s.status === "rejected"; });
    if (fl) { if (!pending.length) note(fl, "patrimoine.feed.vide"); else { fl.innerHTML = ""; pending.forEach(function (s) { fl.appendChild(rowEl(s)); }); } }
    if (sl) { if (!done.length) note(sl, "patrimoine.statuts.vide"); else { sl.innerHTML = ""; done.forEach(function (s) { sl.appendChild(rowEl(s)); }); } }
    if (curId && document.getElementById("cmodal") && !document.getElementById("cmodal").hidden) openModal(curId); // rafraîchit la modale ouverte
  }

  /* ── bouton connexion admin ── */
  function renderAuth() {
    var el = document.getElementById("authBtn"); if (!el || !window.PatFB || !PatFB.ready) return;
    var u = PatFB.user && PatFB.user();
    if (u) { el.innerHTML = '<span class="auth-who">' + esc(u.email) + (isAdmin() ? ' · <b>' + esc(PatFB.role()) + "</b>" : "") + '</span> <button class="auth-b" data-a="out">' + esc(T("patrimoine.auth.deconnexion")) + "</button>"; }
    else { el.innerHTML = '<button class="auth-b" data-a="in">' + esc(T("patrimoine.auth.connexion")) + "</button>"; }
    var b = el.querySelector("[data-a]");
    if (b) b.addEventListener("click", function () { if (b.getAttribute("data-a") === "in") PatFB.signInGoogle().catch(function () {}); else PatFB.signOut(); });
  }

  /* ── panneau « Partager » (Mère seulement) : lien public + lien INP ── */
  function baseUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); } // .../patrimoine/
  function renderShare() {
    var el = document.getElementById("sharePanel"); if (!el) return;
    var isMere = window.PatFB && PatFB.ready && PatFB.role && PatFB.role() === "mere";
    if (!isMere) { el.hidden = true; el.innerHTML = ""; return; }
    var pub = baseUrl(), inp = pub + "#contrib";
    el.hidden = false;
    function line(lbl, u) { return '<div class="share-row"><span class="share-lbl">' + esc(lbl) + '</span><code>' + esc(u) + '</code><button class="share-b" type="button" data-u="' + esc(u) + '">' + esc(T("patrimoine.share.copier")) + "</button></div>"; }
    el.innerHTML = '<div class="share-h">' + esc(T("patrimoine.share.titre")) + "</div>" +
      line(T("patrimoine.share.public"), pub) + line(T("patrimoine.share.inp"), inp) +
      '<div class="share-note">' + esc(T("patrimoine.share.inp.note")) + "</div>";
    el.querySelectorAll(".share-b").forEach(function (b) {
      b.addEventListener("click", function () {
        var u = b.getAttribute("data-u");
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { b.textContent = T("patrimoine.share.copie"); setTimeout(function () { b.textContent = T("patrimoine.share.copier"); }, 1500); });
      });
    });
  }

  function boot() {
    if (!document.getElementById("feed") && !document.getElementById("statutsList")) return;
    if (!window.PatFB || !PatFB.ready) { SUBS = null; renderAll(); return; }
    PatFB.onAuth(function () { renderAuth(); renderShare(); renderAll(); });
    renderAuth(); renderShare();
    PatFB.watchSubmissions(function (subs) { SUBS = subs; renderAll(); }, 300);
  }
  if (window.PATi18n && PATi18n.boot) PATi18n.boot().then(boot); else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
