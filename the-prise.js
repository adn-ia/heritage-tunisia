/* the-prise.js — PRENDRE UNE PHOTO, PRENDRE UNE VIDÉO, DEPUIS LE BANDEAU.
   Posé le 02/09/2026.

   POURQUOI. Le bandeau portait une icône d'appareil photo qui ouvrait la caméra
   pour LIRE UN QR — une fonction que rien, dans l'application, ne nourrit : aucun
   écran ne produit de QR à lire. Helmy, 02/09 : « l'icône appareil photo ouvre
   l'appareil photo pour lire un QR, ce n'est pas une fonction développée ; dans
   Terralog c'est juste pour prendre une photo rapidement, comme la vidéo ».

   CE QU'EN FAIT TERRALOG (lu, pas deviné) : `RoadTrip-Generique/index.html`
   l. 213 et 217 posent deux boutons dont le LIBELLÉ EST L'ICÔNE — `pouce.photo`
   vaut « 📷 », `pouce.video.court` vaut « 🎥 » — le nom vivant en `data-t-titre`.
   Ils appellent `publishMoment('camera'|'video')` (`blocs/90-live.js` l. 129),
   qui ouvre l'appareil et publie le média À LA POSITION DU MOMENT.

   CE QUE FAIT CELUI-CI, ET EN QUOI IL DIFFÈRE. Tunisia n'a pas de diffusion :
   un média s'y range dans le carnet d'une ÉTAPE. Helmy a tranché le 02/09 :
   « on choisit l'étape ». Après la prise, la liste des étapes s'ouvre et il
   désigne la sienne. Aucune position n'est lue, aucune supposition n'est faite.

   COMMENT IL S'ATTACHE. Une ligne dans la page, rien d'autre. Il ne connaît du
   reste que ce qui est écrit dans le DOM — les cartes `.stop` et leur
   `.the-carnet[data-place][data-nom]`, que `itineraire.html` pose déjà — et deux
   fonctions publiées par `the-carnet.js` : `THECarnet.ajouter` et
   `THECarnet.compresser`. Il se retire en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEprise) return;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    /* ⚠️ ZÉRO REPLI EN DUR (règle en granit). Une clé absente rend du vide, et
       le vide se voit : c'est le défaut qu'on veut voir, pas celui qu'on masque. */
    return (v && v !== cle) ? v : "";
  }

  function dire(txt) {
    if (window.THEtoast) window.THEtoast(txt);
    else if (window.THEmessage) window.THEmessage(txt);
  }

  /* Les étapes, telles que la page les a écrites. On ne recalcule rien. */
  function etapes() {
    return [].slice.call(document.querySelectorAll(".stop")).map(function (st, i) {
      var cn = st.querySelector(".the-carnet");
      var h = st.querySelector(".ribbon h3") || st.querySelector("h3");
      return {
        n: i + 1,
        place: cn ? cn.getAttribute("data-place") : "",
        nom: (cn && cn.getAttribute("data-nom")) || (h ? h.textContent.trim() : "")
      };
    }).filter(function (e) { return e.place; });
  }

  /* La fenêtre de choix est celle qui existe déjà dans la page — on ne pose pas
     une seconde modale à côté de la première (le doublon de visionneuse du 31/08). */
  function choisirEtape(apres) {
    var liste = etapes();
    if (!liste.length) { dire(T("prise.aucune.etape")); return; }
    if (liste.length === 1) { apres(liste[0]); return; }

    var mod = document.getElementById("itiModal"),
        ul  = document.getElementById("itiListe"),
        ttl = document.getElementById("itiTitre");
    if (!mod || !ul) { apres(liste[0]); return; }

    if (ttl) ttl.textContent = T("prise.a.quelle.etape");
    ul.innerHTML = "";
    liste.forEach(function (e) {
      var b = document.createElement("button");
      b.type = "button";
      b.style.cssText = "display:flex;gap:10px;align-items:center;width:100%;text-align:left;" +
        "padding:11px 4px;border:none;border-bottom:1px solid #efe7d8;background:none;font:inherit;cursor:pointer";
      var num = document.createElement("span");
      num.style.cssText = "flex:0 0 26px;height:26px;border-radius:50%;background:#b08b57;color:#fff;" +
        "display:flex;align-items:center;justify-content:center;font-size:13px";
      num.textContent = e.n;
      var nom = document.createElement("b");
      nom.style.cssText = "flex:1";
      nom.textContent = e.nom;                       // textContent : jamais d'innerHTML sur une donnée
      b.appendChild(num); b.appendChild(nom);
      b.onclick = function () { mod.style.display = "none"; apres(e); };
      ul.appendChild(b);
    });
    mod.style.display = "flex";
  }

  function ranger(fichier, etape, estVideo) {
    if (!window.THECarnet || !THECarnet.ajouter) { dire(T("prise.carnet.absent")); return; }
    var prep = (!estVideo && THECarnet.compresser)
      ? THECarnet.compresser(fichier)
      : Promise.resolve(fichier);
    prep.then(function (f) {
      return THECarnet.ajouter(etape.place, fichier.name || "", f, estVideo ? "video" : "image");
    }).then(function () {
      dire(T("prise.rangee") + " " + etape.nom);
      /* la vignette doit apparaître sans qu'on recharge : on redessine ce carnet-là */
      if (THECarnet.render) { try { THECarnet.render(etape.place); } catch (e) {} }
    }).catch(function () { dire(T("prise.echec")); });
  }

  /* Un bouton = un `label` qui porte son propre `input`. Pas de `click()` sur un
     champ caché ailleurs dans la page : sur iOS, un clic simulé hors du geste de
     l'utilisateur n'ouvre pas l'appareil photo. */
  function bouton(cleIcone, cleNom, accept, capture, estVideo) {
    var lab = document.createElement("label");
    lab.className = "bd-ic";
    /* ⚠️ `data-i18n` NE DOIT JAMAIS ÊTRE POSÉ SUR UN ÉLÉMENT QUI A DES ENFANTS —
       05/09/2026, Helmy : « l'appareil photo et la vidéo tout en haut de
       l'itinéraire ne fonctionnent pas, ce sont des icônes vides ».
       Il avait le mot juste : VIDES. Le moteur applique une langue en écrivant
       `el.textContent = UI[cle]` (`the-i18n.js` l. 166) — et écrire `textContent`
       **efface tous les enfants**. L'entrée fichier accrochée à ce label était donc
       détruite à chaque application de langue : au chargement, puis à chaque
       changement de langue. Il restait un label avec un emoji dedans et plus rien
       derrière. Mesuré à l'écran : entrée présente avant, ABSENTE après.
       ⚠️ Le geste ne pouvait même pas échouer bruyamment : un label sans entrée
       ne fait rien, sans erreur, sans trace.
       L'icône vit donc maintenant dans un `<span>` à elle : le moteur peut réécrire
       ce span autant qu'il veut, l'entrée est ailleurs dans le label. Le nom reste
       sur le label, où `data-i18n-title` et `-aria` n'écrivent que des ATTRIBUTS —
       eux ne détruisent rien. */
    lab.setAttribute("data-i18n-title", cleNom);
    lab.setAttribute("data-i18n-aria", cleNom);
    lab.style.cursor = "pointer";
    lab.title = T(cleNom);
    lab.setAttribute("aria-label", T(cleNom));

    var ic = document.createElement("span");
    ic.setAttribute("data-i18n", cleIcone);
    ic.textContent = T(cleIcone);
    lab.appendChild(ic);

    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    if (capture) inp.setAttribute("capture", "environment");
    inp.hidden = true;
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      inp.value = "";
      if (!f) return;
      choisirEtape(function (etape) { ranger(f, etape, estVideo); });
    };
    lab.appendChild(inp);
    return lab;
  }

  function poser() {
    var barre = document.getElementById("bdIcones");
    if (!barre || barre.querySelector("[data-prise]")) return;

    /* On se glisse APRÈS l'enregistrement (💾) et AVANT la sortie (🚪) : les deux
       gestes du carnet vivant se tiennent, la porte reste la dernière chose. */
    var sortie = barre.lastElementChild;
    var photo = bouton("prise.photo.icone", "prise.photo", "image/*", true, false);
    var video = bouton("prise.video.icone", "prise.video", "video/*,.mov,.mp4", true, true);
    photo.setAttribute("data-prise", "1");
    video.setAttribute("data-prise", "1");
    if (sortie) { barre.insertBefore(photo, sortie); barre.insertBefore(video, sortie); }
    else { barre.appendChild(photo); barre.appendChild(video); }
  }

  window.THEprise = { poser: poser };

  /* Le bandeau se monte quand un itinéraire s'affiche, pas au chargement : on
     attend qu'il paraisse au lieu de deviner un délai. */
  function guetter() {
    poser();
    var obs = new MutationObserver(function () { poser(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
