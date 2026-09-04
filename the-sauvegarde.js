/* the-sauvegarde.js — METTRE SES ITINÉRAIRES À L'ABRI.
   Sorti d'`itineraire.html` le 04/09/2026, troisième bloc du découpage.

   POURQUOI ICI, ET PAS SUR UNE PAGE DE RÉGLAGES. `the-backup.js` existait depuis
   longtemps, mais ne se trouvait que sur la page hors-ligne, où personne ne va la
   chercher. Ces deux boutons vivent là où l'on finit un voyage. Tout reste chez
   le voyageur : le fichier ne part nulle part.

   ⚠️ CE QUE CE BLOC A APPRIS, ET QUI NE DOIT PAS SE REPERDRE.

   ① DIRE OÙ EST LE FICHIER. Helmy, 30/08/2026 : « sauvegarder, on ne sait pas où
      c'est sauvegardé et ça clignote, il faut chercher, ce n'est pas évident. »
      Le message ne NOMMAIT pas le fichier — or son nom est la seule prise pour le
      retrouver dans les téléchargements. `THEBackup.download()` le rend ; on
      l'affiche.

   ② NE PAS EFFACER LA RÉPONSE. Le téléchargement déclenche un `pageshow`, et le
      `pageshow` remettait l'explication de repos : la confirmation était remplacée
      à l'instant même où elle s'affichait. C'est ça qui « clignotait ». On ne
      remet le repos que si aucun résultat n'a été montré depuis trente secondes.

   ③ RESTAURER, C'EST CRÉER. Un fichier restauré crée des itinéraires : même règle
      que les créer à la main. Sans cette garde, un essai fini pouvait se remplir
      par fichier — signalé par DeepSeek, mesuré en ligne le 19/08/2026.

   IL NE DEMANDE RIEN À LA PAGE. Le premium se lit dans `THEPass`, l'abri dans
   `THEBackup` — deux modules publics. Après une restauration, la page se recharge :
   c'est plus sûr que de redessiner une liste dont ce bloc ne sait rien. Il se
   retire en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEsauvegarde) return;

  var dernierResultat = 0;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";
  }
  function premium() {
    try { return window.THEPass ? THEPass.isActive() : false; } catch (e) { return false; }
  }

  function brancher() {
    var ex = document.getElementById("bkExportIti"),
        im = document.getElementById("bkImportIti"),
        fi = document.getElementById("bkFileIti"),
        st = document.getElementById("bkStatusIti");
    if (!ex || !im || !fi || !st || ex._sgFait) return;
    ex._sgFait = 1;
    var repos = st.textContent;

    ex.onclick = function () {
      if (!window.THEBackup) { st.textContent = "⚠️ " + T("itin.carnet.echec"); return; }
      st.textContent = T("itin.carnet.preparation");
      THEBackup.download().then(function (r) {
        dernierResultat = Date.now();
        /* le NOM du fichier est une donnée, pas un texte : il s'ajoute au message
           traduit, il ne le remplace pas. */
        st.textContent = T("itin.carnet.faite") + ((r && r.fichier) ? ("  📄 " + r.fichier) : "");
      }, function (e) {
        dernierResultat = Date.now();
        st.textContent = "⚠️ " + ((e && e.message) || T("itin.carnet.echec"));
      });
    };

    im.onclick = function () {
      if (!premium()) {
        /* on explique, on ne coupe pas la navigation : une redirection sèche vers
           la page premium est ce qui a fait rejeter l'application. */
        if (window.THEtoast) THEtoast(T("itin.feature.enregistrer"));
        return;
      }
      fi.click();
    };

    fi.onchange = function (e) {
      var f = e.target.files[0];
      if (!f) return;
      if (!confirm(T("itin.carnet.confirmer"))) { e.target.value = ""; return; }
      st.textContent = T("itin.carnet.restauration");
      THEBackup.importFile(f).then(function () {
        dernierResultat = Date.now();
        st.textContent = T("itin.carnet.restaure");
        /* ⚠️ ON RECHARGE. Les itinéraires restaurés doivent reparaître dans la
           liste, dans le menu, partout — ce bloc ne sait pas où ils s'affichent, et
           c'est très bien : il ne prétend pas le savoir. Un rechargement remet la
           page d'accord avec ce qui vient d'entrer. */
        setTimeout(function () { location.reload(); }, 1400);
      }, function (err) {
        dernierResultat = Date.now();
        st.textContent = "⚠️ " + ((err && err.message) || T("itin.carnet.echec"));
      });
      e.target.value = "";
    };

    window.addEventListener("pageshow", function () {
      if (Date.now() - dernierResultat < 30000) return;   // voir ② dans l'en-tête
      st.textContent = repos;
    });
  }

  window.THEsauvegarde = { brancher: brancher };

  /* les boutons montent dans le menu « Documents », posé après le rendu : on les
     attend au lieu de deviner un délai. */
  function guetter() {
    brancher();
    try { new MutationObserver(brancher).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
