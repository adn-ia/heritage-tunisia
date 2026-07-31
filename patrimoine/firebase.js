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
  var INPS = ((window.PAT && window.PAT.inpEmails) || []).map(function (e) { return String(e).toLowerCase(); });

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

  // Rôle dérivé de l'e-mail authentifié (allowlist config). Public = null (pas de compte).
  function role() {
    if (!user || !user.email) return null;
    var m = user.email.toLowerCase();
    if (m === ADMIN) return "mere";
    if (INPS.indexOf(m) >= 0) return "inp";
    return "connecte"; // authentifié mais hors allowlist = pas de pouvoir
  }

  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }

  // ─── Contributions (soumissions) ───
  // data = { site, gov, etat, obs, photoUrl, photoCredit, rightsOk, nom, email }
  function addSubmission(data) {
    if (!ready) return Promise.reject(new Error("offline"));
    var doc = {
      site: data.site || "", gov: data.gov || "", etat: data.etat || "",
      obs: data.obs || "", photoUrl: data.photoUrl || "", photoCredit: data.photoCredit || "",
      rightsOk: !!data.rightsOk, nom: data.nom || "", email: data.email || "",
      status: "pending", createdAt: ts()
    };
    return db.collection("submissions").add(doc);
  }
  // écoute temps réel du feed (les soumissions non rejetées), plus récentes d'abord
  function watchSubmissions(cb, max) {
    if (!ready) { cb(null); return function () {}; }
    return db.collection("submissions").orderBy("createdAt", "desc").limit(max || 100)
      .onSnapshot(function (snap) {
        var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; if (v.status !== "rejected") out.push(v); });
        cb(out);
      }, function () { cb(null); });
  }

  // ─── Commentaires (sous une soumission) ───
  function addComment(subId, data) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(subId).collection("comments")
      .add({ nom: data.nom || "", email: data.email || "", text: data.text || "", role: role() || "public", createdAt: ts() });
  }
  function watchComments(subId, cb) {
    if (!ready) { cb([]); return function () {}; }
    return db.collection("submissions").doc(subId).collection("comments").orderBy("createdAt", "asc")
      .onSnapshot(function (snap) { var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); }); cb(out); });
  }

  // ─── Auth (F2 : INP + Mère) ───
  function signInGoogle() {
    if (!ready || !auth) return Promise.reject(new Error("no-auth"));
    return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  }
  function signOut() { return auth ? auth.signOut() : Promise.resolve(); }
  function onAuth(cb) { authCbs.push(cb); cb(user, role()); }

  window.PatFB = {
    ready: ready,
    addSubmission: addSubmission, watchSubmissions: watchSubmissions,
    addComment: addComment, watchComments: watchComments,
    signInGoogle: signInGoogle, signOut: signOut, onAuth: onAuth,
    role: role, user: function () { return user; }
  };
})();
