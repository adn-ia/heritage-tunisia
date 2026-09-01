/* the-etape.js — LA MISE EN FORME D'UNE ÉTAPE, REPRISE DU ROAD TRIP DE FOSS.
   Consigne de Helmy : même rendu, mêmes fonctions. Hors Firebase — donc ni
   publication, ni commentaires, ni lien famille : la gamme ne s'en sert pas.

   Le CSS et la structure viennent de `RoadTrip-Generique/index.html`, repris tels
   quels (.photo · .ribbon · .num · .badge-type · .credit · .hdr-cta), avec les
   seules couleurs du road trip remplacées par celles de Heritage. Rien n'est
   réinventé : on réagence ce que le moteur produit déjà, sans y toucher. */
(function(){
  /* Un libellé vient de l'i18n, toujours. Pas de texte français en dur : une
     traduction manquante se corrige dans i18n/, elle ne se rattrape pas ici. */
  function T(cle){
    try{ var s = window.THEi18n && THEi18n.ui && THEi18n.ui(cle); return (s && s!==cle) ? s : ''; }
    catch(e){ return ''; }
  }

  function styler(){
    if(document.getElementById('the-etape-css')) return;
    var st = document.createElement('style'); st.id = 'the-etape-css';
    st.textContent =
      /* la carte d'étape laisse la photo toucher les bords */
      '.stop.et-mise{padding:0;overflow:hidden}' +
      '.stop.et-mise .the-carnet .cn-hero{display:none!important}' +
      /* le bandeau du carnet fait doublon : la photo vit désormais en tête d'étape */
      '.stop.et-mise > *:not(.photo){padding-left:16px;padding-right:16px}' +
      '.stop.et-mise > *:last-child{padding-bottom:15px}' +

      /* ——— repris du road trip, à l'identique ——— */
      /* 01/09/2026, Helmy : « le titre sur l'entête commence en haut a gauche ». */
      '.stop .photo{position:relative;height:200px;background:#e8dcc4 center/cover no-repeat;display:flex;align-items:flex-start}' +
      '.stop .photo .credit{position:absolute;bottom:4px;right:6px;background:rgba(0,0,0,.45);color:#fff;font-size:10px;' +
        'padding:2px 6px;border-radius:4px;text-decoration:none}' +
      '.stop .photo .ribbon{position:relative;z-index:2;margin:0;padding:14px 16px 0;width:100%;' +
        'background:linear-gradient(rgba(28,20,12,.86),transparent 78%);color:#fff}' +
      /* la date et le lieu quittent le haut pour le bas de la photo : le titre
         ouvre l'étape, le contexte la referme. */
      '.stop .photo .sub{position:absolute;left:0;right:0;bottom:0;z-index:2;margin:0;padding:26px 16px 12px;' +
        'display:flex;align-items:baseline;gap:10px;font-size:13.5px;' +
        'background:linear-gradient(transparent,rgba(28,20,12,.86));color:#e6dcc8}' +
      '.stop .ribbon .num{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;' +
        'font-weight:700;font-size:14px;margin-right:8px;vertical-align:middle;background:#a8884f;color:#fff}' +
      '.stop .ribbon h3{font-family:\'Cormorant Garamond\',serif;font-weight:700;font-size:22px;margin:0;display:inline;color:#fff}' +
      '.stop .photo .sub-l{display:flex;align-items:baseline;gap:10px;font-size:13.5px;color:#e6dcc8;margin-top:5px}' +
      '.stop .photo .ruban-lieu{margin-left:auto;opacity:.78;font-style:italic}' +
      /* le pointillé dit : ceci s ouvre. Repris de leur classe `raccourci`. */
      '.stop .photo .raccourci{cursor:pointer;border-bottom:1px dotted rgba(255,255,255,.45);padding:1px 3px;border-radius:4px}' +
      '.stop .photo .raccourci:hover{background:rgba(255,255,255,.14);border-bottom-color:transparent}' +
      '.stop .badge-type.raccourci{border-bottom:0}' +
      '.stop .badge-type{font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 9px;border-radius:20px;' +
        'color:#fff;margin-left:6px;vertical-align:middle;background:#8a6d3a}' +
      '.stop .hdr-cta{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:3;' +
        'background:transparent;border:0;color:#8a7658;border-radius:20px;' +
        'padding:11px 18px;min-height:44px;font:inherit;font-size:14px;cursor:pointer;' +
        'white-space:nowrap;max-width:calc(100% - 32px);overflow:hidden;text-overflow:ellipsis}' +
      '.stop .hdr-cta:hover{color:#5a4a2a;text-decoration:underline}' +
      /* la date, posée par the-dates.js, se lit sur le bandeau */
      '.stop .ribbon .the-date{margin:6px 0 0}' +
      /* la ligne de date, venue de roadtrip-plan.js, se pose sur le bandeau */
      /* La date se pose SUR LA MÊME LIGNE que la situation, pas en dessous :
         posée en dessous, elle ajoutait 40 px au bandeau et l'écrasait — 121 px
         contre 82 chez Estonie, mesuré. Elle se lit d'un coup d'oeil et se change
         sans quitter le bandeau, mais elle ne prend pas la place de la photo. */
      '.stop .photo .ruban-date{display:inline-flex;align-items:center;gap:5px;margin:0;font-size:13px;color:#e6dcc8;flex:0 0 auto}' +
      '.stop .photo .ruban-date-vue{white-space:nowrap}' +
      '.stop .photo .ruban-date > span{opacity:.85}' +
      '.stop .photo .ruban-date input{background:rgba(255,253,248,.9);border:1px solid rgba(255,255,255,.3);color:#3d3320;border-radius:6px;padding:2px 5px;font:inherit;font-size:11.5px;min-height:26px;width:auto}' +
      '.stop .ribbon .the-date-b{background:rgba(255,253,248,.92);border-color:transparent;color:#4a3a26}' +
      '@media(max-width:520px){.stop .photo{height:170px}.stop .ribbon h3{font-size:20px}}';
    document.head.appendChild(st);
  }

  /* PAS DE CRÉDIT SUR LE CARRÉ D'EN-TÊTE.
     Le bandeau n'affiche jamais une photo de Wikimedia : il montre la photo que
     le voyageur a mise lui-même, ou rien. Le crédit du lieu, recopié là, laissait
     donc lire « Wikipedia · CC BY-SA » sur une photo personnelle. L'attribution
     reste sur les fiches (index.html), là où la photo sous licence s'affiche
     vraiment — l'obligation CC BY est tenue là et pas ailleurs. */

  function agencer(stop){
    if(stop.classList.contains('et-mise')) return;
    var head = stop.querySelector('.head'); if(!head) return;

    var idx = head.querySelector('.idx'),
        nm  = head.querySelector('.nm'),
        sub = head.querySelector('.sub'),
        bdg = head.querySelector('.badge');

    var photo = document.createElement('div'); photo.className = 'photo';
    var ribbon = document.createElement('div'); ribbon.className = 'ribbon';

    if(idx){ idx.classList.add('num'); ribbon.appendChild(idx); }
    if(nm){
      var h3 = document.createElement('h3'); h3.innerHTML = nm.innerHTML;
      ribbon.appendChild(h3);
      /* 01/09/2026, Helmy : « il n'est pas nécessaire de rajouter le thème, juste
         le titre de l'étape ». La pastille de nature reste donc dans l'en-tête
         d'origine, qui est retiré — elle ne paraît plus sur la photo. */
      nm.remove();
    }
    /* LE RUBAN, EXACTEMENT COMME TERRALOG — 01/09/2026, Helmy : « oui mais même
       présentation que Terralog exactement ». Chez eux (`blocs/20-itineraire.js`
       l.486-489) la ligne du bas porte DEUX choses : la date à gauche, le lieu à
       droite, poussé par `margin-left:auto` et mis en italique. Les deux sont des
       raccourcis : soulignés en pointillé, ils ouvrent ce qu'ils nomment.
       ⚠️ Ce que j'avais pris pour un crédit photo (« Nordkapp ») est LE LIEU de
       l'étape. Helmy m'a corrigé, leur source le confirme : `rtLieuDe(s)`. */
    if(sub){
      /* VERBATIM — leur `.sub` est un CONTENEUR, pas un texte : il porte deux
         enfants, la date à gauche et le lieu à droite, que `margin-left:auto`
         pousse au bout de la ligne (`styles/app.css` l.124). En donnant la classe
         du lieu au conteneur lui-même, la marge s'appliquait au bloc entier : les
         deux restaient collés à gauche. On enveloppe donc le texte du lieu. */
      /* JUSTE LA VILLE — 01/09/2026, Helmy : « on ne met pas le type ni à combien
         de km du précédent, on l'a ailleurs ; juste le nom de la ville, entité
         administrative, comme pour Terralog ». La ligne disait « Tunis · bâtiment
         · à ~10 km de l'étape précédente » : la nature est déjà dans le badge, la
         distance déjà dans la ligne de trajet. On coupe à la première puce et on
         ne garde que ce qui répond à « où ». */
      var brut = String(sub.textContent||'').trim();
      var ville = brut.split('\u00b7')[0].trim();
      var lieu = document.createElement('span');
      lieu.className = 'ruban-lieu';
      lieu.textContent = ville;
      sub.textContent = '';
      sub.appendChild(lieu);
      /* ⚠️ DANS LA PHOTO, PAS DANS LE RUBAN. `position:absolute` se règle sur le
         premier ancêtre positionné : tant que la ligne du bas vivait dans le
         ruban, elle se collait au bas DU RUBAN — resté en haut — et ne descendait
         jamais. Elle devient donc fille de la photo. */
      photo.appendChild(sub);
    }

    photo.appendChild(ribbon);

    stop.insertBefore(photo, stop.firstChild);
    head.remove();
    stop.classList.add('et-mise');
    remplir(stop);
  }

  /* la photo de l'étape vient du carnet ; sans elle, on invite à en poser une */
  function remplir(stop){
    var photo = stop.querySelector('.photo'); if(!photo) return;

    /* LA DATE SE LIT SUR LE BANDEAU — 01/09/2026, Helmy : « la date devait être
       insérée dans l'en-tête et modifiable comme sur Terralog ». Elle est posée
       par roadtrip-plan.js APRÈS nous, et remise à chaque passage : on la cueille
       ici, à chaque tour, au lieu de courir après. On la DÉPLACE, donc ses deux
       champs restent vivants — on lit la date et on la change au même endroit. */
    var ruban = stop.querySelector('.ribbon');
    /* ⚠️ La ligne du bas a quitté le ruban pour la photo : on la cherche donc dans
       la photo, sinon la date n'a plus où se poser et disparaît. */
    var sousLigne = photo.querySelector('.sub');
    var drow  = stop.querySelector('.rtp-daterow');
    /* La date se pose EN PREMIER dans la ligne du bas, comme chez eux : elle
       précède le lieu, que `margin-left:auto` renvoie à droite. */
    if(sousLigne && drow && drow.parentNode !== sousLigne){
      drow.classList.add('ruban-date');
      sousLigne.insertBefore(drow, sousLigne.firstChild);
    }
    /* LA DATE OUVRE L'ÉDITEUR — 01/09/2026, Helmy : « sur Terralog la date ouvre
       une modale, c'est tout, et je veux exactement verbatim la même chose ».
       Chez eux, `rtRaccourciEditer(n)` (`blocs/20-itineraire.js` l.175) ne fait
       qu'appeler `editStageFlow(n)` : trois lignes, aucun dépliage. Le clic sur
       la ville appelle la même chose (l.182) — « c'est là qu'on cherche un lieu,
       donc c'est là qu'on le corrige ».
       J'avais construit un repliage maison : deux champs qui s'ouvrent et se
       ferment sur la photo. Personne ne l'avait demandé, et l'éditeur existait
       déjà — `THEactionsEtape`, geste « editer », qui ouvre `THEetape.ouvrir()`.
       On appelle celui-là. */
    if(drow && !drow.dataset.etReplie){
      var dIn = drow.querySelector('[data-rtp-date]');
      var hIn = drow.querySelector('[data-rtp-heure]');
      var lbl = drow.querySelector('span');
      var vue = document.createElement('span');
      vue.className = 'ruban-date-vue raccourci';
      vue.setAttribute('role','button'); vue.tabIndex = 0;
      function ecrire(){
        var t = '';
        if(dIn && dIn.value){
          var p2 = dIn.value.split('-');
          var d2 = new Date(+p2[0], +p2[1]-1, +p2[2]);
          try{
            t = d2.toLocaleDateString(
              (window.THEi18n && THEi18n.lang && THEi18n.lang()) || undefined,
              {day:'numeric', month:'short'});
          }catch(e){ t = dIn.value; }
          if(hIn && hIn.value) t += ' \u00b7 ' + hIn.value;
        }
        /* 📍 une visite, 🏕️ une étape où l'on dort — leur distinction, l.487 */
        var estSejour = !!stop.querySelector('.nuit');
        vue.textContent = (estSejour ? '\uD83C\uDFD5\uFE0F ' : '\uD83D\uDCCD ')
          + (t || (lbl ? lbl.textContent.replace(/^\s*\S+\s*/, '') : ''));
      }
      ecrire();
      if(dIn) dIn.addEventListener('change', ecrire);
      if(hIn) hIn.addEventListener('change', ecrire);
      /* les champs restent dans la page — ils portent le geste — mais ne se
         montrent plus : c'est la modale qui édite. */
      if(lbl) lbl.style.display = 'none';
      if(dIn) dIn.style.display = 'none';
      if(hIn) hIn.style.display = 'none';

      function ouvrirEditeur(){
        var cartes = [].slice.call(document.querySelectorAll('.stop'));
        var n = cartes.indexOf(stop);
        var gestes = window.THEactionsEtape || [];
        for(var k=0;k<gestes.length;k++){
          if(gestes[k] && gestes[k].id === 'editer' && typeof gestes[k].run === 'function'){
            gestes[k].run(n); return;
          }
        }
      }
      vue.onclick = function(ev){ ev.stopPropagation(); ouvrirEditeur(); };
      vue.onkeydown = function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); ouvrirEditeur(); } };

      /* TROIS ENDROITS, UNE SEULE DESTINATION — leur ruban rend cliquables la
         date (l.487), la NATURE (l.485) et la ville (l.488), et les trois vont au
         même éditeur : `rtRaccourciLieu` ne fait qu'appeler `rtRaccourciEditer`.
         « C'est là qu'on cherche un lieu ou qu'on prend sa position GPS, donc
         c'est là qu'on la corrige » — Helmy, 27/08.
         (Leur garde `rtRaccourciPermis()` refuse le geste en mode public : il n'y
         a ni page famille ni mode public ici, elle n'a pas d'objet.) */
      [ruban ? ruban.querySelector('.ruban-lieu') : null].forEach(function(el){
        if(!el || el.dataset.etRacc) return;
        el.classList.add('raccourci');
        el.setAttribute('role','button'); el.tabIndex = 0;
        el.onclick = function(ev){ ev.stopPropagation(); ouvrirEditeur(); };
        el.onkeydown = function(ev){ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); ouvrirEditeur(); } };
        el.dataset.etRacc = '1';
      });

      drow.insertBefore(vue, drow.firstChild);
      drow.dataset.etReplie = '1';
    }

    var carnet = stop.querySelector('.the-carnet');
    var src = carnet ? carnet.querySelector('.cn-hero') : null;
    var fond = src ? (src.style.backgroundImage || '') : '';

    if(fond && fond !== 'none'){
      photo.style.backgroundImage = fond;
      var v = photo.querySelector('.hdr-cta'); if(v) v.remove();
    } else if(!photo.querySelector('.hdr-cta')){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'hdr-cta';
      b.textContent = '📷 ' + T('carnet.photo.en.tete');
      /* CE BOUTON OUVRE LE SÉLECTEUR D'EN-TÊTE, PAS LE GESTIONNAIRE.
         Il retombait sur THECarnet.open() — la fenêtre des médias déjà rangés sous
         l'étape — au lieu d'ouvrir la photothèque de l'appareil. C'est la fenêtre
         que Helmy voyait revenir. panneauEnTete() offre Galerie et Photo comme
         vrais champs de fichier : le sélecteur natif s'ouvre, même sur une étape
         qui n'a encore aucune image. */
      b.onclick = function(){
        var place = carnet ? (carnet.getAttribute('data-place')||'') : '';
        var nom   = carnet ? (carnet.getAttribute('data-nom')||'') : '';
        if(!place || !window.THECarnet) return;
        if(THECarnet.panneauEnTete) THECarnet.panneauEnTete(place, nom);
        else if(THECarnet.enTete) THECarnet.enTete(place, nom);
      };
      photo.appendChild(b);
    }
  }

  function passer(){
    var l = document.querySelectorAll('.stop');
    for(var i=0;i<l.length;i++){ agencer(l[i]); remplir(l[i]); }
  }
  function demarrer(){
    styler(); passer();
    try{ new MutationObserver(function(){ passer(); })
      .observe(document.getElementById('stops') || document.body, {childList:true, subtree:true}); }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
