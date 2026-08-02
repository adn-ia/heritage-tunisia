/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — pont Firebase (sous-app autonome, PROPRE à patrimoine).
   Firebase ne sert QU'ICI (jamais l'app hôte). Firestore = feed partagé des
   contributions (soumission → stockée → affichée sur les 3 entités) + commentaires.
   Auth Google = INP + Mère (pouvoirs privilégiés) ; le public soumet sans compte
   (formulaire nominatif). Photos = URL collée en F1 (upload en F3).

   INERTE tant que PAT.firebase.projectId est vide → l'app marche (parcours/filtres/
   export), seul le feed affiche « à venir ». Utilise le SDK compat chargé par la page
   (firebase-app/firestore/auth-compat). Aucune dépendance à l'app hôte.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = (window.PAT && window.PAT.firebase) || {};
  var ADMIN = (window.PAT && window.PAT.adminEmail || "").toLowerCase();
  // Référents (chercheurs / historiens reconnus) — plusieurs possibles. Compat ancien nom inpEmails.
  var EXPERTS = ((window.PAT && (window.PAT.expertEmails || window.PAT.inpEmails)) || []).map(function (e) { return String(e).toLowerCase(); });

  var ready = !!(CFG && CFG.projectId && CFG.apiKey && window.firebase);
  var db = null, auth = null, user = null, authCbs = [];

  if (ready) {
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
      db = firebase.firestore();
      if (firebase.auth) {
        auth = firebase.auth();
        auth.onAuthStateChanged(function (u) { user = u; authCbs.forEach(function (cb) { try { cb(u, role()); } catch (e) {} }); });
      }
    } catch (e) { ready = false; }
  }

  // Domaines de référents admissibles (config). Vide → aucun rôle référent n'existe. Compat inpDomains.
  var EXPERTDOMS = ((window.PAT && (window.PAT.expertDomains || window.PAT.inpDomains)) || []).map(function (d) { return String(d).toLowerCase().replace(/^@/, ""); });
  function emailDom(m) { var i = String(m || "").toLowerCase().lastIndexOf("@"); return i >= 0 ? m.toLowerCase().slice(i + 1) : ""; }
  // Un e-mail est « crédité » (→ on demande le mot de passe) s'il est le tien ou d'un référent (e-mail/domaine).
  function isCredited(m) { m = String(m || "").toLowerCase(); return m === ADMIN || EXPERTS.indexOf(m) >= 0 || (EXPERTDOMS.length > 0 && EXPERTDOMS.indexOf(emailDom(m)) >= 0); }
  // Rôle réel (pouvoirs gardés par la vérif e-mail + les règles Firestore).
  function role() {
    if (!user || !user.email) return null;
    var m = user.email.toLowerCase();
    if (m === ADMIN) return "mere";
    if (EXPERTS.indexOf(m) >= 0 || (EXPERTDOMS.length > 0 && EXPERTDOMS.indexOf(emailDom(m)) >= 0)) return "expert";
    return "connecte"; // authentifié mais hors périmètre = pas de pouvoir
  }
  function emailVerified() { return !!(user && user.emailVerified); }

  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }

  // ─── Contributions (soumissions) ───
  // data = { site, gov, etat, obs, photoUrl, photoCredit, rightsOk, nom, email }
  function addSubmission(data) {
    if (!ready) return Promise.reject(new Error("offline"));
    var doc = {
      site: data.site || "", siteId: data.siteId || "", gov: data.gov || "", etat: data.etat || "",
      obs: data.obs || "", photoUrl: data.photoUrl || "", photoCredit: data.photoCredit || "",
      rightsOk: !!data.rightsOk, prenom: data.prenom || "", nom: data.nom || "", email: data.email || "",
      status: "pending", createdAt: ts()
    };
    return db.collection("submissions").add(doc);
  }
  // écoute temps réel de TOUTES les soumissions (les vues filtrent par statut), plus récentes d'abord
  function watchSubmissions(cb, max) {
    if (!ready) { cb(null); return function () {}; }
    return db.collection("submissions").orderBy("createdAt", "desc").limit(max || 300)
      .onSnapshot(function (snap) {
        var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); });
        cb(out);
      }, function () { cb(null); });
  }

  // ─── Modération (INP / Mère seulement — imposé par les règles Firestore) ───
  function setStatus(id, status, reason) {   // status: 'pending'|'validated'|'rejected'
    if (!ready) return Promise.reject(new Error("offline"));
    var u = { status: status, reviewedBy: (user && user.email) || "", reviewedAt: ts() };
    if (reason != null) u.reason = reason;
    return db.collection("submissions").doc(id).update(u);
  }
  function updateSubmission(id, fields) {   // éditer le contenu (site/etat/obs/photoUrl/photoCredit)
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(id).update(fields || {});
  }
  function deleteSubmission(id) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(id).delete();
  }

  // ─── Commentaires (sous une soumission) ───
  function addComment(subId, data) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(subId).collection("comments")
      .add({ nom: data.nom || "", email: data.email || "", text: data.text || "", replyTo: data.replyTo || null, role: role() || "public", createdAt: ts() });
  }
  function watchComments(subId, cb) {
    if (!ready) { cb([]); return function () {}; }
    return db.collection("submissions").doc(subId).collection("comments").orderBy("createdAt", "asc")
      .onSnapshot(function (snap) { var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); }); cb(out); });
  }

  // ─── Auth email + mot de passe (Mère / INP) ───
  // Connexion ; si le compte n'existe pas encore → création + e-mail de vérification.
  // Les pouvoirs ne s'activent que si l'e-mail est VÉRIFIÉ (imposé par les règles).
  function signInEmail(email, pw) {
    if (!ready || !auth) return Promise.reject(new Error("no-auth"));
    return auth.signInWithEmailAndPassword(email, pw).catch(function (e) {
      if (e && (e.code === "auth/user-not-found" || e.code === "auth/invalid-login-credentials")) {
        return auth.createUserWithEmailAndPassword(email, pw).then(function (cred) {
          try { if (cred.user && !cred.user.emailVerified) cred.user.sendEmailVerification(); } catch (x) {}
          return cred;
        });
      }
      throw e;
    }).then(function (cred) {
      try { if (cred && cred.user && !cred.user.emailVerified) cred.user.sendEmailVerification(); } catch (x) {}
      return cred;
    });
  }
  function resendVerification() { try { return user ? user.sendEmailVerification() : Promise.reject(); } catch (e) { return Promise.reject(e); } }
  function signOut() { return auth ? auth.signOut() : Promise.resolve(); }
  function onAuth(cb) { authCbs.push(cb); cb(user, role()); }

  window.PatFB = {
    ready: ready,
    addSubmission: addSubmission, watchSubmissions: watchSubmissions,
    addComment: addComment, watchComments: watchComments,
    setStatus: setStatus, updateSubmission: updateSubmission, deleteSubmission: deleteSubmission,
    signInEmail: signInEmail, resendVerification: resendVerification, signOut: signOut, onAuth: onAuth,
    isCredited: isCredited, emailVerified: emailVerified,
    role: role, user: function () { return user; }
  };
})();
