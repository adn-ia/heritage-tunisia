/* the-message.js — DIRE SANS BLOQUER.
   Posé le 02/09/2026, sur la demande de Helmy : « pourquoi quand on rajoute ou
   enlève quelque chose ça ne peut pas être un bloc seul qui s'attache, au lieu de
   mélanger les codes ». Celui-ci s'attache : une ligne dans la page, rien à
   modifier ailleurs, et il se retire d'une ligne.

   CE QU'IL RÈGLE. `alert()` est une boîte SYSTÈME : dans la vue web d'iOS elle
   fige le fil de la page, et l'application entière avec. C'est l'une des causes
   de rejet 2.1(a) relevées sur le Portugal, et un commentaire d'itineraire.html
   l'avait déjà noté pour Android — « il cliquait, rien ne se passait, il croyait
   l'application cassée ». Le remède avait été appliqué à un endroit sur quinze.

   CE QU'IL FAIT. Il remplace `window.alert` par un bandeau qui s'efface seul.
   Le code appelant ne change pas : `alert('…')` continue de s'écrire partout, et
   ne bloque plus rien. Aucun fichier existant n'est touché.

   ⚠️ `confirm()` et `prompt()` ne sont PAS remplacés : ils RENDENT une réponse,
   et un bandeau ne sait pas répondre. Les remplacer en silence changerait le sens
   du code appelant — un « annuler » deviendrait un « oui ». Ils restent donc, et
   restent à traiter un par un, avec une vraie fenêtre de confirmation.

   ⚠️ Il ne s'installe QUE si la page n'a pas déjà son propre bandeau (`THEtoast`,
   posé par itineraire.html). Deux mécanismes pour la même chose, c'est un de trop. */
(function () {
  "use strict";
  if (window.THEmessage) return;                       // déjà là

  function bandeau() {
    var d = document.getElementById("the-msg");
    if (d) return d;
    d = document.createElement("div");
    d.id = "the-msg";
    d.setAttribute("role", "status");                  // lu par les lecteurs d'écran
    d.setAttribute("aria-live", "polite");
    d.style.cssText =
      "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);" +
      "max-width:min(92vw,460px);background:#2b2318;color:#f6f0e4;" +
      "padding:12px 16px;border-radius:10px;font:15px/1.5 Georgia,serif;" +
      "box-shadow:0 8px 28px rgba(0,0,0,.4);z-index:100002;opacity:0;" +
      "transition:opacity .25s;pointer-events:none;white-space:pre-line";
    (document.body || document.documentElement).appendChild(d);
    return d;
  }

  function montrer(txt, ms) {
    try {
      var d = bandeau();
      d.textContent = String(txt == null ? "" : txt);
      /* ⚠️ L'OPACITÉ SE POSE TOUT DE SUITE. Le 01/09, elle était réglée dans un
         `requestAnimationFrame` : celui-ci ne s'exécute pas quand la page n'est
         pas au premier plan, et le message restait dans le document à zéro
         d'opacité — présent, jamais vu. */
      d.style.opacity = "1";
      clearTimeout(d._t);
      d._t = setTimeout(function () { d.style.opacity = "0"; }, ms || 5200);
    } catch (e) { /* un message qui échoue ne doit rien casser autour de lui */ }
  }

  window.THEmessage = montrer;

  /* On ne se substitue à `alert` que si la page n'a pas déjà le sien. */
  if (!window.THEtoast) {
    window.THEtoast = montrer;
    window.alert = function (txt) { montrer(txt); };
  } else {
    window.alert = function (txt) { window.THEtoast(txt); };
  }
})();
