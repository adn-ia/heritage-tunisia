/* the-print.js — impression du carnet AU CHOIX (composition / disposition).
   Remplace le bouton « PDF / Imprimer » de l'album par un choix de mise en page.
   7 dispositions, 100% CSS d'impression (aucune donnée envoyée) :
     📔 Album (actuel) · 🖼️ Une photo par page · 🔲 Planche-contact ·
     📖 Livret 2 par page · 🖼️ Grande photo + légende · 📰 Magazine 2 colonnes · 📝 Carnet écrit (sans photos).
   Modale AUTONOME (ne dépend d'aucun showModal global). À inclure après roadtrip-plus.js. */
(function(){
  /* Une clé absente rend du VIDE, jamais la clé elle-même : « print.titre » affiché
     à l'écran serait pire qu'un trou, et un trou se voit et se corrige. */
  function T(cle){ try{ var v=(window.THEi18n && THEi18n.ui && THEi18n.ui(cle)); return (v && v!==cle) ? v : ''; }catch(e){ return ''; } }
  /* Dispositions : '' album · one · contact · two · big · mag · text · fridge */

  /* ---------- CSS d'impression pour chaque disposition ---------- */
  var CSS='@media print{'
    +'body.pr-mode .topbar,body.pr-mode .toolbar,body.pr-mode .album-bar,body.pr-mode #lbx,body.pr-mode .share-panel,body.pr-mode #projOv,body.pr-mode #pr-modal{display:none!important}'
    /* --- 🖼️ une photo par page --- */
    +'body.pr-one .album-doc .pic{page-break-after:always;break-inside:avoid;display:flex;align-items:center;justify-content:center;height:95vh;margin:0;padding:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-one .album-doc .pic img,body.pr-one .album-doc .pic video{max-width:100%;max-height:95vh;width:auto;height:auto;object-fit:contain}'
    +'body.pr-one .album-doc .album-cover{page-break-after:always}'
    +'body.pr-one .album-doc .pg-nm,body.pr-one .album-doc .pg-sub,body.pr-one .album-doc .album-cap,body.pr-one .album-doc .pic-cap{display:none!important}'
    +'body.pr-one .album-doc .album-page{padding:0;border:none}'
    /* --- 🔲 planche-contact (grille) --- */
    /* ⚠️ CE N'ÉTAIT PAS UNE PLANCHE-CONTACT — refait le 02/09/2026, Helmy :
       « si vous appuyez sur le format planche-contact, ce n'est vraiment pas une
       planche-contact ». La grille de trois était posée sur `.album-ph`, c'est-à-dire
       sur CHAQUE ÉTAPE prise à part. Une étape d'une seule photo donnait donc une
       photo de 590 px et deux cases vides à côté, et les titres d'étape séparaient
       le tout. Mesuré : 590 px de large là où une vignette en fait 40.
       Une planche-contact, c'est TOUT le carnet en petites vignettes serrées sur la
       même feuille, sans rien entre elles. Les boîtes intermédiaires s'effacent donc
       (`display:contents` : la boîte disparaît, ses enfants remontent) et la grille
       se pose sur le document entier. Quatre par ligne, 34 mm de côté. */
    +'body.pr-contact .album-doc{display:grid!important;grid-template-columns:repeat(4,1fr);gap:3mm;padding:6mm}'
    +'body.pr-contact .album-doc .album-page,body.pr-contact .album-doc .album-ph{display:contents!important}'
    +'body.pr-contact .album-doc .album-cover{grid-column:1/-1;page-break-after:auto}'
    +'body.pr-contact .album-doc .pic{transform:none!important;margin:0;padding:0;box-shadow:none;background:none;border:none;break-inside:avoid}'
    +'body.pr-contact .album-doc .pic img,body.pr-contact .album-doc .pic video{width:100%;height:34mm;object-fit:cover;background:#f4f0e8;display:block}'
    /* rien entre les vignettes : ni titre d'étape, ni note, ni légende */
    +'body.pr-contact .album-doc .pic-cap,body.pr-contact .album-doc .album-cap,'
    +'body.pr-contact .album-doc .pg-sub,body.pr-contact .album-doc .pg-nm,'
    +'body.pr-contact .album-doc .album-empty{display:none!important}'
    /* --- 📖 livret 2 par page : ~2 étapes par feuille (pagination naturelle par la hauteur) --- */
    +'body.pr-two .album-doc .album-page{break-inside:avoid;page-break-inside:avoid;height:47vh;overflow:hidden;padding:8mm 12mm;box-sizing:border-box}'
    +'body.pr-two .album-doc .album-cover{page-break-after:always}'
    +'body.pr-two .album-doc .album-ph{gap:4mm}'
    +'body.pr-two .album-doc .pic{margin:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-two .album-doc .pic img,body.pr-two .album-doc .pic video{max-height:26vh;width:auto;object-fit:contain}'
    +'body.pr-two .album-doc .pic-cap{display:none!important}'
    +'body.pr-two .album-doc .album-cap{max-height:3.4em;overflow:hidden}'
    /* --- 🖼️ grande photo + légende : 1 étape / page, 1re photo dominante --- */
    +'body.pr-big .album-doc .album-page{page-break-after:always;break-inside:avoid;padding:12mm;text-align:center;border:none}'
    +'body.pr-big .album-doc .album-cover{page-break-after:always}'
    +'body.pr-big .album-doc .album-ph{display:block}'
    +'body.pr-big .album-doc .pic{margin:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-big .album-doc .pic:not(:first-child){display:none!important}'
    +'body.pr-big .album-doc .pic img,body.pr-big .album-doc .pic video{max-width:100%;max-height:68vh;width:auto;object-fit:contain;display:block;margin:0 auto}'
    +'body.pr-big .album-doc .pg-nm{font-size:22pt;margin:8mm 0 1mm}'
    +'body.pr-big .album-doc .pg-sub{margin-bottom:6mm}'
    +'body.pr-big .album-doc .pic-cap{font-size:11pt;margin-top:4mm}'
    +'body.pr-big .album-doc .album-cap{display:block;border:none!important;background:transparent!important;text-align:center;max-width:120mm;margin:6mm auto 0}'
    /* --- 📰 magazine 2 colonnes : texte + photos en colonnes --- */
    +'body.pr-mag .album-doc .album-page{break-inside:avoid;column-count:2;column-gap:9mm;padding:12mm}'
    +'body.pr-mag .album-doc .album-cover{page-break-after:always}'
    +'body.pr-mag .album-doc .pg-nm,body.pr-mag .album-doc .pg-sub{-webkit-column-span:all;column-span:all}'
    +'body.pr-mag .album-doc .album-ph{display:block}'
    +'body.pr-mag .album-doc .pic{break-inside:avoid;margin:0 0 4mm;box-shadow:none;transform:none!important;background:none;border:none;padding:0}'
    +'body.pr-mag .album-doc .pic img,body.pr-mag .album-doc .pic video{width:100%;height:auto;display:block}'
    +'body.pr-mag .album-doc .album-cap{display:block;border:none!important;background:transparent!important;padding:0;margin:0 0 4mm}'
    /* --- 📝 carnet écrit : seulement les notes, sans photos --- */
    +'body.pr-text .album-doc .album-ph,body.pr-text .album-doc .pic,body.pr-text .album-doc .album-empty{display:none!important}'
    +'body.pr-text .album-doc .album-page{break-inside:avoid;padding:6mm 14mm;border:none;border-bottom:1px solid #d8cdb8}'
    +'body.pr-text .album-doc .pg-nm{font-size:16pt;margin:4mm 0 1mm}'
    +'body.pr-text .album-doc .album-cap{display:block;width:100%;min-height:22mm;height:auto;border:none!important;background:transparent!important;padding:0;overflow:visible;white-space:pre-wrap;resize:none;font-size:12pt;line-height:1.5}'
    /* --- 🧲 frigo vintage : polaroïds collés, aimants du pays --- */
    +'body.pr-fridge .album-doc{background:linear-gradient(135deg,#e2e7ea,#c4ccd2 42%,#d9dee2 60%,#bcc5cb);-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:10mm 8mm}'
    +'body.pr-fridge .album-cover{background:transparent!important;border:none!important;page-break-after:always}'
    +'body.pr-fridge .album-page{background:transparent!important;border:none!important;break-inside:avoid;padding:5mm 2mm 8mm}'
    +'body.pr-fridge .pg-nm{font-family:"Cormorant Garamond",Georgia,serif;background:#fff6c9;color:#3a2c18;display:inline-block;padding:1.5mm 5mm;transform:rotate(-2deg);box-shadow:1px 2px 3px rgba(0,0,0,.25);border-radius:2px;font-size:14pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body.pr-fridge .pg-sub,body.pr-fridge .album-cap,body.pr-fridge .album-empty{display:none!important}'
    +'body.pr-fridge .album-ph{display:flex;flex-wrap:wrap;gap:9mm 8mm;justify-content:center;align-items:flex-start;padding-top:7mm}'
    +'body.pr-fridge .pic{position:relative;background:#fff;padding:2.5mm 2.5mm 8mm;box-shadow:0 3px 8px rgba(0,0,0,.35);border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body.pr-fridge .pic img,body.pr-fridge .pic video{width:44mm;height:44mm;object-fit:contain;background:#f4f0e8;display:block}'
    +'body.pr-fridge .pic-cap{font-size:8.5pt;text-align:center;margin-top:1.5mm;color:#444;max-width:44mm}'
    +'body.pr-fridge .pic:nth-child(4n+1){transform:rotate(-4deg)}'
    +'body.pr-fridge .pic:nth-child(4n+2){transform:rotate(3deg)}'
    +'body.pr-fridge .pic:nth-child(4n+3){transform:rotate(-1.5deg)}'
    +'body.pr-fridge .pic:nth-child(4n){transform:rotate(2.5deg)}'
    +'body.pr-fridge .pic::before{position:absolute;top:-4mm;left:50%;transform:translateX(-50%);font-size:15pt;z-index:2;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'}';

  /* 🧲 LES AIMANTS VIENNENT DU PAYS, PAS DU MODULE — 02/09/2026. Ils étaient
     écrits ici en dur, repris du Québec : ⚜️ fleur de lys, 🍁 érable, 🏒 hockey,
     🫎 orignal — sur l'édition tunisienne, et la description disait « aimants du
     Québec ». C'est une donnée de pays : elle vit dans `heritage.config.js`.
     Sans elle, aucun aimant n'est posé — un polaroïd nu vaut mieux que le
     souvenir d'un autre pays. Ce module redevient ainsi 100 % générique. */
  var AIM = (window.HConf && Array.isArray(HConf.aimants)) ? HConf.aimants : [];
  if(AIM.length){
    var regAim='@media print{';
    for(var a=0; a<4; a++){
      var em = String(AIM[a % AIM.length]).replace(/["\\]/g,'');   // rien d'autre qu'un pictogramme
      var nth = (a===3) ? '4n' : ('4n+'+(a+1));
      regAim += 'body.pr-fridge .pic:nth-child('+nth+')::before{content:"'+em+'"}';
    }
    CSS += regAim + '}';
  }
  var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);

  /* ---------- impression ---------- */
  /* ⚠️ UNE COMPOSITION SANS MATIÈRE NE DOIT PAS SORTIR DES PAGES BLANCHES —
     03/09/2026, Helmy : « tronqué », capture à l'appui. Il avait choisi « Une
     photo par page » sur un itinéraire de six étapes SANS PHOTO. Cette
     composition masque les titres et les notes — c'est son principe, elle ne
     montre que l'image — si bien qu'il ne restait sur la feuille que le message
     « Pas de photo ici » répété six fois, sous une page blanche.
     Quatre des huit compositions reposent entièrement sur les photos. Quand il
     n'y en a aucune, elles le disent maintenant, au lieu de produire du vide. */
  /* ⚠️ CE GARDE-FOU DORT AVEC LES COMPOSITIONS QU'IL PROTÈGE — 03/09/2026. Depuis
     que la fenêtre de choix est retirée, `doPrint` n'est plus appelé qu'avec la
     composition vide (l'album tel qu'à l'écran), qui ne figure pas ici : le test
     ne se déclenche donc jamais. Il reste en place avec elles, prêt à servir si
     l'une revient — il a été écrit pour un défaut réel, six pages blanches
     imprimées le 03/09. On ne jette pas une leçon avec la porte qu'on ferme. */
  var EXIGE_PHOTOS = { one:1, contact:1, big:1, fridge:1 };

  function combienDePhotos(){
    try{ return document.querySelectorAll('.album-doc .pic').length; }catch(e){ return 0; }
  }

  function doPrint(mode){
    if(EXIGE_PHOTOS[mode] && combienDePhotos() === 0){
      var dire = window.THEtoast || window.THEmessage;
      if(dire) dire(T('print.sans.photo'));
      return;
    }
    document.body.classList.remove('pr-one','pr-contact','pr-two','pr-big','pr-mag','pr-text','pr-fridge');
    document.body.classList.add('pr-mode');
    if(mode) document.body.classList.add('pr-'+mode);

    /* ⚠️ LA CARTE S'IMPRIMAIT COUPÉE — 03/09/2026, Helmy : « tronqué », avec une
       bande grise à droite de la carte sur la feuille. Une carte Leaflet ne charge
       que les tuiles de la zone qu'elle croit occuper ; or l'impression change la
       largeur ET la hauteur de son conteneur (`@media print{.ac-carte{height:170px}}`)
       APRÈS coup. Leaflet ne l'apprend jamais, et tout ce qui dépasse reste gris.
       Recadrer avant ne suffirait pas : on ne connaît pas encore la taille imprimée.
       On remplace donc la carte par une IMAGE PLATE le temps d'imprimer — une image
       s'adapte à n'importe quelle largeur sans rien avoir à recharger — puis on la
       remet telle qu'elle était. Même aplatissement que pour le fichier HTML :
       une seule fonction, publiée par `the-souvenir.js`. */
    var cadre = document.querySelector('.ac-carte');
    var plate = (cadre && window.THEcartePlate) ? window.THEcartePlate(cadre) : Promise.resolve(null);

    function imprimer(remis){
      setTimeout(function(){
        window.print();
        setTimeout(function(){
          document.body.classList.remove('pr-mode','pr-one','pr-contact','pr-two','pr-big','pr-mag','pr-text','pr-fridge');
          if(remis) remis();
        }, 600);
      }, 180);
    }

    plate.then(function(url){
      var remis = null;
      if(url && cadre && cadre.parentNode){
        var parent = cadre.parentNode;                 // ⚠️ retenu AVANT le retrait
        var suivant = cadre.nextSibling;               // pour remettre à la même place
        var im = document.createElement('img');
        im.src = url; im.alt = '';
        im.className = 'ac-carte ac-carte-plate';
        im.style.cssText = 'display:block;width:100%;height:auto;object-fit:contain';
        parent.replaceChild(im, cadre);
        /* ⚠️ ON NE PASSE PAS PAR `im.parentNode` — 03/09/2026. La restauration
           échouait en silence : elle demandait à l'image son parent, mais entre
           l'impression et le retour l'album peut s'être redessiné, et l'image se
           retrouve alors hors du document — `parentNode` vaut null, le
           `replaceChild` lève, le `catch` avale, et la carte ne revient jamais.
           Constaté à l'écran : l'image plate restait à sa place, la vraie carte
           avait disparu. On retient le parent et le voisin AVANT de retirer, et
           on remet là, quoi qu'il soit arrivé entre-temps. Et la remise ne se
           fait qu'UNE fois, même si les deux déclencheurs tombent. */
        var fait = false;
        remis = function(){
          if(fait) return; fait = true;
          try{
            if(im.parentNode) im.parentNode.removeChild(im);
            parent.insertBefore(cadre, suivant);
          }catch(e){
            try{ parent.appendChild(cadre); }catch(e2){}
          }
        };
        /* deux déclencheurs valent mieux qu'un : le navigateur annonce la fin de
           l'impression, mais il ne le fait pas partout — le délai reste le filet. */
        try{ window.addEventListener('afterprint', remis, { once:true }); }catch(e){}
      }
      imprimer(remis);
    }).catch(function(){ imprimer(null); });
  }

  /* ── 🚫 LE CHOIX DE COMPOSITION EST RETIRÉ — 03/09/2026 ──────────────────────
     Helmy, capture de la fenêtre à l'appui : « on va enlever les 7 dernières
     options, on laisse le premier ».
     Il ne reste donc que « Album (mise en page actuelle) » — c'est-à-dire la
     feuille telle qu'on la voit à l'écran. Une fenêtre qui ne propose qu'une
     chose n'est plus un choix : c'est un obstacle de plus entre le bouton et le
     papier. Le bouton imprime maintenant directement.

     CE MODULE RESTE, ET IL SERT. Deux choses vivent ici et n'ont rien à voir avec
     le choix disparu :
       · le CSS d'impression `pr-mode`, qui écarte les barres et les fenêtres de
         la feuille ;
       · l'aplatissement de la carte, sans lequel elle s'imprime coupée (voir le
         commentaire de `doPrint`).
     Les sept compositions elles-mêmes — leurs règles CSS plus haut — restent en
     place, inertes : elles ne coûtent rien, et le jour où l'une d'elles est
     redemandée, elle est là. Seule leur PORTE est fermée. */

  /* ---------- branchement sur le bouton PDF/Imprimer de l'album ---------- */
  function hook(){ var b=document.getElementById('albumprint'); if(b && b._prhook!==3){ b._prhook=3; b.onclick=function(e){ if(e)e.preventDefault(); doPrint(''); }; } }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
  setTimeout(hook, 1200); setTimeout(hook, 2200);
  try{ new MutationObserver(hook).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();
