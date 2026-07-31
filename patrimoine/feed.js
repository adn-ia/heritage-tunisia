/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — feed des contributions (F1). Affiche les soumissions Firestore
   (temps réel) + fil de commentaires par soumission. C'est la « fille publique » :
   tout le monde lit ; soumettre/commenter = nominatif. Validation/modération = F2.
   Inerte proprement si Firebase pas configuré (message « à venir »).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  function T(k, v) { return window.PATi18n ? PATi18n.uiT(k, v) : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function okMail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function fmt(ts) { try { var d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleDateString(PATi18n ? PATi18n.lang() : "fr") : ""; } catch (e) { return ""; } }

  function badge(st) {
    var m = { pending: "attente", validated: "valide", rejected: "rejete" };
    var k = m[st] || "attente";
    return '<span class="fb-badge ' + k + '">' + esc(T("patrimoine.feed.statut." + k)) + "</span>";
  }

  function card(s) {
    var el = document.createElement("div"); el.className = "fb-card";
    var photo = s.photoUrl ? '<a class="fb-photo" href="' + esc(s.photoUrl) + '" target="_blank" rel="noopener">' + esc(T("patrimoine.feed.photo")) + (s.photoCredit ? " — " + esc(s.photoCredit) : "") + "</a>" : "";
    el.innerHTML =
      '<div class="fb-top"><b>' + esc(s.site || T("patrimoine.feed.site.inconnu")) + "</b>" + badge(s.status) + "</div>" +
      (s.gov ? '<div class="fb-gov">' + esc(s.gov) + "</div>" : "") +
      '<p class="fb-obs">' + esc(s.obs) + "</p>" + photo +
      '<div class="fb-meta">' + esc(s.nom) + " · " + fmt(s.createdAt) + "</div>" +
      '<button class="fb-ctoggle" type="button">' + esc(T("patrimoine.feed.commenter")) + "</button>" +
      '<div class="fb-comments" hidden></div>';
    var box = el.querySelector(".fb-comments"), tog = el.querySelector(".fb-ctoggle"), wired = false;
    tog.addEventListener("click", function () {
      box.hidden = !box.hidden;
      if (!wired && !box.hidden) { wired = true; wireComments(s.id, box); }
    });
    return el;
  }

  function wireComments(subId, box) {
    box.innerHTML = '<div class="fb-clist">…</div>' +
      '<div class="fb-cform"><input class="fb-cnom" placeholder="' + esc(T("patrimoine.contrib.nom")) + '">' +
      '<input class="fb-cmail" placeholder="' + esc(T("patrimoine.contrib.email")) + '">' +
      '<textarea class="fb-ctext" placeholder="' + esc(T("patrimoine.feed.votre.commentaire")) + '"></textarea>' +
      '<button class="fb-csend" type="button">' + esc(T("patrimoine.feed.publier")) + '</button>' +
      '<span class="fb-cmsg"></span></div>';
    var list = box.querySelector(".fb-clist");
    PatFB.watchComments(subId, function (cs) {
      if (!cs.length) { list.innerHTML = '<div class="fb-cempty">' + esc(T("patrimoine.feed.aucun.commentaire")) + "</div>"; return; }
      list.innerHTML = cs.map(function (c) {
        return '<div class="fb-c"><span class="fb-cauthor">' + esc(c.nom) + (c.role && c.role !== "public" ? ' <em class="fb-crole">' + esc(c.role) + "</em>" : "") + '</span><span class="fb-cdate">' + fmt(c.createdAt) + "</span><p>" + esc(c.text) + "</p></div>";
      }).join("");
    });
    var send = box.querySelector(".fb-csend"), msg = box.querySelector(".fb-cmsg");
    send.addEventListener("click", function () {
      var nom = box.querySelector(".fb-cnom").value.trim(), mail = box.querySelector(".fb-cmail").value.trim(), text = box.querySelector(".fb-ctext").value.trim();
      if (!nom || !text || !okMail(mail)) { msg.textContent = T("patrimoine.contrib.requis"); return; }
      send.disabled = true; msg.textContent = T("patrimoine.contrib.envoi");
      PatFB.addComment(subId, { nom: nom, email: mail, text: text }).then(function () {
        box.querySelector(".fb-ctext").value = ""; msg.textContent = "";
        send.disabled = false;
      }).catch(function () { msg.textContent = T("patrimoine.contrib.erreur"); send.disabled = false; });
    });
  }

  function render(subs) {
    var wrap = document.getElementById("feedList"); if (!wrap) return;
    if (subs === null) { wrap.innerHTML = '<p class="fb-note">' + esc(T("patrimoine.feed.avenir")) + "</p>"; return; }
    if (!subs.length) { wrap.innerHTML = '<p class="fb-note">' + esc(T("patrimoine.feed.vide")) + "</p>"; return; }
    wrap.innerHTML = ""; var frag = document.createDocumentFragment();
    subs.forEach(function (s) { frag.appendChild(card(s)); });
    wrap.appendChild(frag);
  }

  function boot() {
    if (!document.getElementById("feed")) return;
    if (!window.PatFB || !PatFB.ready) { render(null); return; }
    PatFB.watchSubmissions(render, 50);
  }
  if (window.PATi18n && PATi18n.boot) PATi18n.boot().then(boot); else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
