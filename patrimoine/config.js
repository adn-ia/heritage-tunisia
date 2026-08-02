/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — sous-application AUTONOME (infrastructure PROPRE).
   Aucun lien avec l'app principale : ni the-pass.js, ni the-i18n.js, ni
   heritage.config.js, ni aucune fonction payante. Elle a SA config, SON i18n,
   SES scripts, SES styles, SA donnée (l'import INP, exclusive).
   ─────────────────────────────────────────────────────────────────────────
   SEUL bloc à adapter par édition (marque / email INP / langues / carte).
   Repli neutre partout : jamais de nom de pays en dur dans le code.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  window.PAT = {
    marque:      "Tunisia Heritage", // marque courte de l'édition (repli neutre → 'Patrimoine')
    langs:       ["fr","en","de","it","ar"], // langues de la sous-app = celles de l'édition THE
    defaultLang: "fr",
    dataSites:   "data/inp_sites.json",     // donnée EXCLUSIVE : tous les sites (import INP)
    dataClasses: "data/inp_classes.json",   // donnée EXCLUSIVE : monuments classés (import INP)

    // ─── Contribution / feed partagé (Firebase PROPRE à la sous-app) ───
    notifyEmail:   "",   // adresse de notification (institution/référent) — à remplir le moment venu
    adminEmail:    "helmymekaoui@gmail.com",   // Mère (Helmy) : copie notifications + rôle admin
    expertEmails:  [],   // référents (chercheurs/historiens reconnus) — plusieurs possibles, rôle valideur
    expertDomains: [],   // domaines de référents admissibles (ex. "univ-xxx.tn") — vide = aucun référent
    // config web du projet Firebase DÉDIÉ « Veille citoyenne du Patrimoine » (publique, normale à embarquer)
    firebase: {
      apiKey: "AIzaSyAYeZsZjZMTr_LFP9iO97vEaWkyWbh2yxg",
      authDomain: "veille-citoyenne-du-patrimoine.firebaseapp.com",
      projectId: "veille-citoyenne-du-patrimoine",
      storageBucket: "veille-citoyenne-du-patrimoine.firebasestorage.app",
      messagingSenderId: "564970341024",
      appId: "1:564970341024:web:34117bcc2168ddfe39bfc5",
      measurementId: "G-NVD2BPM425"
    },
    // Décoration : petits motifs évocateurs de l'édition (discrets, pilotés par config → socle générique).
    motifs: ["🏛️","🏺","🕌","🫒","🌿","🏖️","⛰️","💧","🐫","🌴"],
    // Valeurs du champ `etat` (donnée INP) considérées « en péril ». Servent au FILTRE,
    // pas à l'affichage (l'affichage passe par i18n). Ce sont des clés de donnée, pas du texte UI.
    perilStates: ["Mauvais","Détruit","Disparu","Non retrouvé","Non trouvé","Mauvais/Réemploi","Immergé","Site immergé"]
  };
})();
