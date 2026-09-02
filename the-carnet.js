/* the-carnet.js — MODULE SQUELETTE « Carnet d'étape » (reproduit Road Trip, sans Firebase).
   Section par étape : note + grille des médias + « Gérer / ajouter médias » (modale gestionnaire
   Photo/Vidéo/Son, réordonner ↑↓, supprimer 🗑️) + « Carte postale » + lien Maps + rappel confidentialité.
   Stockage : IndexedDB « the-carnet » / store « photos » (index « place ») — partagé avec the-postcard.js.
   Usage : placer <div class="the-carnet" data-place="<clé>" data-nom="<nom>" data-lat=".." data-lng=".."></div> ;
   le module rend tout seul. À inclure : <script src="the-carnet.js" defer></script> (après the-postcard.js). */
(function(){
  /* UNE CLÉ NON TRADUITE NE S'AFFICHE PAS EN CLAIR.
     T() reçoit ici des clés (« carnet.photo.en.tete »), pas du français. Quand la
     traduction manque, le moteur rend la clé telle quelle et l'utilisateur lit
     « carnet.ajouter.photo.entete » dans un bouton. On rend alors une chaîne vide :
     l'icône du bouton suffit, et rien d'illisible ne passe à l'écran. */
  function T(fr){ try{
      var v=(window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr;
      if(v===fr && /^[a-z][a-z0-9]*(\.[a-z0-9]+){2,}$/.test(fr)) return '';
      return v;
    }catch(e){ return fr; } }
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  /* ---- IndexedDB (même base que THE/le module carte postale) ---- */
  function db(){ return new Promise(function(res,rej){ var r=indexedDB.open('the-carnet',1);
    r.onupgradeneeded=function(e){ var d=e.target.result; if(!d.objectStoreNames.contains('photos')){ var os=d.createObjectStore('photos',{keyPath:'id',autoIncrement:true}); os.createIndex('place','place',{unique:false}); } };
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }
  function getMedia(place){ return db().then(function(d){ return new Promise(function(res){
    var out=[], c=d.transaction('photos','readonly').objectStore('photos').index('place').openCursor(IDBKeyRange.only(place));
    c.onsuccess=function(e){var x=e.target.result; if(x){out.push(x.value);x.continue();} else { out.sort(function(a,b){return (a.ord||a.ts||0)-(b.ord||b.ts||0);}); res(out); }}; c.onerror=function(){res([]);}; }); }); }

  /* COMPRESSER À L'ENTRÉE — vos originaux ne bougent pas.
     Un navigateur n'a pas accès au chemin d'une photo : il reçoit son contenu, et
     cette référence meurt avec la page. Garder « la photo n° 4237 » et la rechercher
     au lancement suivant est impossible sur iOS. Pour qu'une photo survive au
     redémarrage, l'application doit donc en garder une copie.
     On la garde LÉGÈRE : 1920 px au plus grand côté, qualité 0,82. L'original reste
     intact dans la photothèque, et l'appareil ne se remplit pas.
     ⏳ À VENIR (idée de Helmy, 23/08) : un dossier de classification propre à
     l'itinéraire, où les photos seraient gardées en résolution d'origine. */
  function compresser(file){
    var MAX = 1920, Q = 0.82;
    return new Promise(function(res){
      if(!file || !/^image\//.test(file.type||'') || /gif|svg/i.test(file.type||'')) { res(file); return; }
      var u = URL.createObjectURL(file), img = new Image(), fini = false;
      var abandon = setTimeout(function(){ if(!fini){ fini=true; try{URL.revokeObjectURL(u);}catch(e){} res(file); } }, 12000);
      img.onload = function(){
        if(fini) return; fini = true; clearTimeout(abandon);
        try{
          var w = img.naturalWidth, h = img.naturalHeight;
          if(Math.max(w,h) <= MAX){ URL.revokeObjectURL(u); res(file); return; }
          var k = MAX / Math.max(w,h);
          var c = document.createElement('canvas');
          c.width = Math.round(w*k); c.height = Math.round(h*k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function(b){
            URL.revokeObjectURL(u);
            res(b && b.size < file.size ? new File([b], file.name, {type:'image/jpeg'}) : file);
          }, 'image/jpeg', Q);
        }catch(e){ try{URL.revokeObjectURL(u);}catch(_){} res(file); }
      };
      img.onerror = function(){ if(fini) return; fini=true; clearTimeout(abandon); try{URL.revokeObjectURL(u);}catch(e){} res(file); };
      img.src = u;
    });
  }
  function addMedia(place,name,blob,type){ return db().then(function(d){ return new Promise(function(res,rej){
    var rq=d.transaction('photos','readwrite').objectStore('photos').add({place:place,name:name,blob:blob,type:type||(blob.type||'image'),ts:Date.now(),ord:Date.now()});
    /* on rend l'IDENTIFIANT créé : sans lui, impossible de désigner ensuite
       cette photo comme en-tête de l'étape. Il manquait. */
    rq.onsuccess=function(){res(rq.result);}; rq.onerror=function(){rej(rq.error);}; }); }); }
  function delMedia(id){ return db().then(function(d){ return new Promise(function(res){ var rq=d.transaction('photos','readwrite').objectStore('photos').delete(id); rq.onsuccess=function(){res();}; rq.onerror=function(){res();}; }); }); }
    /* modifier un média sans le recréer (légende, ordre…) */
    function majMedia(id,patch){ return db().then(function(d){ return new Promise(function(res){
      var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id);
      g.onsuccess=function(){ var v=g.result; if(!v){ res(); return; }
        for(var k in patch) v[k]=patch[k];
        var u=os.put(v); u.onsuccess=function(){res();}; u.onerror=function(){res();}; };
      g.onerror=function(){res();}; }); }); }
  function setOrd(id,ord){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){v.ord=ord; os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
  // met à jour un média (légende, drapeau héro…)
  function updateMedia(id,patch){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){ Object.assign(v,patch); os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
  // héro = LA photo d'en-tête de l'étape : on la marque, on démarque les autres
  function setHero(place,id){ return getMediaLarge(place).then(function(arr){ return Promise.all(arr.map(function(m){ return updateMedia(m.id,{hero:(m.id===id)}); })); }); }
  /* LA NOTE NE DOIT PAS SE PERDRE QUAND L'ÉTAPE CHANGE DE CLÉ
     La clé d'une étape porte l'identifiant de son itinéraire (« it123#lieu@… »).
     Une note écrite AVANT que l'itinéraire ait son identifiant est rangée sous la
     clé nue (« lieu@… ») ; à la réouverture on cherchait sous la clé longue et la
     note semblait effacée. On relit donc aussi la clé nue, et on la recopie sous
     la clé du jour pour ne plus repasser par là. Même repli que la légende
     d'album, qui l'avait déjà. */
  function cleNue(place){ var i=String(place||'').indexOf('#'); return i>=0 ? place.slice(i+1) : place; }
  function note(place,val){
    try{
      if(val==null){
        var v=localStorage.getItem('the-note-'+place);
        if(v) return v;
        var nue=cleNue(place);
        if(nue!==place){
          var a=localStorage.getItem('the-note-'+nue);
          if(a){ localStorage.setItem('the-note-'+place, a); return a; }
        }
        return '';
      }
      localStorage.setItem('the-note-'+place,val);
    }catch(e){ return ''; }
  }
  function kind(m){ var t=m.type||(m.blob&&m.blob.type)||''; if(/^video/.test(t))return'video'; if(/^audio/.test(t))return'audio'; return'image'; }
  // une IMAGE est-elle décodable par le navigateur ? (les vidéos/sons passent sans test)
  // évite de stocker un fichier illisible (ex. HEIC/HEIF importé via « Fichiers ») qui s'afficherait en carré gris.
  function decodable(file){ var t=(file.type||'').toLowerCase(); if(t.indexOf('video')===0||t.indexOf('audio')===0) return Promise.resolve(true);
    return new Promise(function(res){ var img=new Image(), u=URL.createObjectURL(file), done=false;
      // anti-blocage : certains HEIC/HEIF Android ne déclenchent NI onload NI onerror -> timeout 10 s = non décodable
      var to=setTimeout(function(){ if(done)return; done=true; try{URL.revokeObjectURL(u);}catch(e){} res(false); }, 10000);
      img.onload=function(){ if(done)return; done=true; clearTimeout(to); URL.revokeObjectURL(u); res(true); };
      img.onerror=function(){ if(done)return; done=true; clearTimeout(to); URL.revokeObjectURL(u); res(false); }; img.src=u; }); }

  /* VOIR UNE PHOTO EN GRAND — 01/09/2026, Helmy le demande, et c'était DÉJÀ FAIT :
     `the-lightbox.js` (72 lignes, chargé par itineraire.html, précaché) ouvre toute
     image de plus de 70 px au clic, en plein écran, avec croix, flèches gauche et
     droite, échappement, et une barre Enregistrer · Partager · Imprimer.
     J'en avais écrit une seconde avant de regarder. Elle est retirée : deux
     visionneuses, c'est deux comportements à tenir d'accord et une qui prend le
     pas sur l'autre selon l'ordre de chargement.
     Ce qui restait à faire, et qui est fait : la vignette annonce qu'elle s'ouvre
     — curseur d'agrandissement, `title`, et sa légende en `alt` pour qui écoute. */

  /* ---- rendu de la section d'une étape ---- */
  function renderSection(el){
    var place=el.dataset.place, nom=el.dataset.nom||'', lat=el.dataset.lat, lng=el.dataset.lng;
    el.innerHTML=
      '<div class="cn-hero" style="display:none"></div>'+
      /* Le rappel « — privé tant que vous ne partagez pas » retiré du titre le
         31/08/2026, sur demande de Helmy. Il alourdissait l'en-tête de CHAQUE
         étape pour redire ce que la ligne du bas dit déjà une fois, en bas de la
         section. La clé i18n reste en place, elle n'est pas supprimée. */
      /* LE CRAYON SEUL — 01/09/2026, Helmy : « on avait enlevé la phrase carnet
         de l'étape en laissant un crayon ». Le mot redisait ce que le crayon dit
         déjà, au-dessus d'un champ dont le texte d'invite le redit une troisieme
         fois. Le nom part en `title` et `aria-label` : à l'écran il n'y a qu'un
         crayon, à l'oreille il y a toujours un nom. */
      /* LE CRAYON SEUL — 01/09/2026, Helmy, deux fois : « j'ai demandé un crayon ».
         Le nom part en `title` et `aria-label` : rien à l'écran, tout à l'oreille. */
      '<div class="cn-head" title="'+T('carnet.carnet.de.letape')+'" aria-label="'+T('carnet.carnet.de.letape')+'">✏️</div>'+
      '<textarea class="cn-note" placeholder="'+T('carnet.un.mot.sur.cette.etape')+'"></textarea>'+
      '<div class="cn-grid"></div>'+
      /* ⚠️ DEUX BOUTONS, DEUX ICÔNES. Les deux portaient 🖼️ : rien ne distinguait
         « gérer les médias » de « carte postale », signalé par Helmy le 30/08/2026.
         La carte postale prend ✉️ — ce n'est pas un choix arbitraire : sa PROPRE
         fenêtre porte déjà ✉️ (`the-postcard.js:414`). Un bouton doit montrer
         l'icône de ce qu'il ouvre, sans quoi on ne relie pas les deux écrans.
         🖼️ reste aux médias, où il désigne bien ce qu'il fait. */
      /* DES ICÔNES, PAS DES PHRASES — 01/09/2026, Helmy : « tout le texte en bas
         doit être réduit aux icônes ». Trois libellés pleine largeur pour trois
         gestes qu'un pictogramme dit mieux. Le nom reste en `title` ET en
         `aria-label`, traduit comme avant : à l'écran il n'y a qu'une icône, à
         l'oreille il y a toujours un nom. */
      '<div class="cn-row">'+
        '<button class="cn-btn cn-ic cn-manage" title="'+T('carnet.gerer.ajouter.medias')+'" aria-label="'+T('carnet.gerer.ajouter.medias')+'">🖼️</button>'+
        '<button class="cn-btn cn-ic cn-pc" title="'+T('carnet.carte.postale')+'" aria-label="'+T('carnet.carte.postale')+'">✉️</button>'+
        (lat&&lng?'<a class="cn-btn cn-ic cn-maps" target="_blank" rel="noopener" title="'+T('carnet.cette.etape.dans.maps')+'" aria-label="'+T('carnet.cette.etape.dans.maps')+'" href="https://www.google.com/maps/search/?api=1&query='+lat+','+lng+'">🧭</a>':'')+
      '</div>'+
      '<div class="cn-note-priv">🔒 '+T('carnet.vos.medias.restent.sur.votre')+'</div>';
    var ta=el.querySelector('.cn-note'); ta.value=note(place); ta.onchange=function(){ note(place,ta.value); };
    el.querySelector('.cn-manage').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-grid').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-pc').onclick=function(){ if(window.THEPostcard) THEPostcard.open({nom:nom,ville:el.dataset.ville||'',placeKey:place}); };
    grid(el.querySelector('.cn-grid'), place);
    heroFill(el, place);
  }
  // bandeau photo d'en-tête (héro) de l'étape
  /* Les photos prises avant que l'itinéraire ait un identifiant sont rangées sous
     le seul nom du lieu. On les récupère au lieu de les laisser perdues. */
  function getMediaLarge(place){
    return getMedia(place).then(function(a){
      if(a && a.length) return a;
      /* ⚠️ `split('#').pop()` MANGE LE DIÈSE — 02/09/2026, troisième endroit où le
         même repli ratait d'un caractère. Une photo prise avant que l'itinéraire
         ait un identifiant est rangée sous « #1 », AVEC le dièse ; ce repli
         cherchait « 1 », une clé qui n'a jamais existé. On essaie les deux. */
      var court = String(place||'').split('#').pop();
      if(!court || court === place) return a;
      return getMedia('#'+court).then(function(av){ return (av && av.length) ? av : getMedia(court); });
    });
  }
  /* ── RECADRER L'IMAGE D'EN-TÊTE AU DOIGT ────────────────────────────────────────
     Demandé par Helmy le 30/08/2026 : « il faudra pouvoir CENTRER AU DOIGT car le
     format change. Sur l'étape même, en appuyant on recentre l'image où on veut. »
     Le bandeau est un fond en `cover` : selon l'écran, il coupait où il voulait.
     Terralog n'a pas ce geste — il est écrit ici, pas repris.

     ⚠️ LE POURCENTAGE NE SUIT PAS LE DOIGT. En `cover`, `background-position` ne
     parcourt QUE le débordement de l'image, pas sa largeur : 40 px de doigt ne font
     pas 40 px d'image. Il faut les dimensions naturelles de la photo pour convertir,
     sinon la carte glisse dix fois trop vite ou pas du tout.

     ⚠️ UN AXE SANS DÉBORDEMENT NE BOUGE PAS, et c'est normal : une photo qui remplit
     exactement la largeur n'a rien à découvrir de ce côté. On l'ignore au lieu de
     laisser croire à une panne — le curseur reste la seule promesse faite.

     Le cadrage est rangé sur la PHOTO (`heroPos`) : chaque enregistrement porte un
     seul `place` (cf. addMedia), donc une photo appartient à une étape et une seule.
     Limite connue : quand une étape sans photo retombe sur la clé courte (photos
     prises avant que l'itinéraire ait un identifiant), deux étapes peuvent montrer
     le même média — elles partagent alors son cadrage. C'est la même photo. */
  function tailleNaturelle(blob){
    return new Promise(function(res){
      var u=URL.createObjectURL(blob), im=new Image();
      im.onload=function(){ var s={w:im.naturalWidth,h:im.naturalHeight}; URL.revokeObjectURL(u); res(s); };
      im.onerror=function(){ URL.revokeObjectURL(u); res(null); };
      im.src=u;
    });
  }
  function debordement(box,taille){
    var r=box.getBoundingClientRect();                       // relu AU GESTE : la page a pu tourner
    if(!taille||!taille.w||!taille.h||!r.width||!r.height) return {x:0,y:0};
    var e=Math.max(r.width/taille.w, r.height/taille.h);      // c'est ce que fait « cover »
    return { x:taille.w*e-r.width, y:taille.h*e-r.height };
  }
  function lirePos(s){
    var p=String(s||'50% 50%').trim().split(/\s+/); if(p.length<2) p[1]='50%';
    var x=parseFloat(p[0]), y=parseFloat(p[1]);
    return { x:isNaN(x)?50:x, y:isNaN(y)?50:y };
  }
  function borner(v){ return v<0?0:(v>100?100:v); }
  function poserGesteEnTete(box, place, h, ouvrir){
    var g=null, avaler=false;
    box.style.touchAction='none';    // sans quoi iOS fait défiler la page et tue le geste
    box.style.cursor='grab';
    box.onpointerdown=function(e){
      if(g) return; if(e.pointerType==='mouse' && e.button!==0) return;
      g={ id:e.pointerId, x:e.clientX, y:e.clientY, pos:lirePos(box.style.backgroundPosition), deb:null, bouge:false };
      avaler=false;
      try{ box.setPointerCapture(e.pointerId); }catch(err){}   // garder le geste même hors du bandeau
    };
    box.onpointermove=function(e){
      if(!g || e.pointerId!==g.id) return;
      var dx=e.clientX-g.x, dy=e.clientY-g.y;
      if(!g.bouge && (dx*dx+dy*dy)<36) return;                 // sous 6 px c'est un APPUI, pas un glissement
      g.bouge=true;
      if(!box._tailleHero) return;
      if(!g.deb) g.deb=debordement(box, box._tailleHero);
      var px=g.pos.x, py=g.pos.y;
      if(g.deb.x>0.5) px=borner(g.pos.x-(dx/g.deb.x)*100);
      if(g.deb.y>0.5) py=borner(g.pos.y-(dy/g.deb.y)*100);
      box.style.backgroundPosition=px+'% '+py+'%';
      box.style.cursor='grabbing';
      e.preventDefault();
    };
    function fin(e){
      if(!g || e.pointerId!==g.id) return;
      if(g.bouge){ avaler=true; updateMedia(h.id,{heroPos:box.style.backgroundPosition}); }
      g=null; box.style.cursor='grab';
    }
    box.onpointerup=fin; box.onpointercancel=fin;
    box.onclick=function(ev){
      ev.stopPropagation();
      if(avaler){ avaler=false; ev.preventDefault(); return; }  // un recadrage n'ouvre pas le panneau
      ouvrir();
    };
  }
  function heroFill(el, place){ getMediaLarge(place).then(function(arr){
    var h=arr.filter(function(m){return m.hero && kind(m)==='image';})[0];
    var box=el.querySelector('.cn-hero'); if(!box) return;
    if(h){ box.style.display='block'; box.classList.remove('vide');
           /* ⚠️ LA ZONE EST PROPRE À L'ÉTAPE — 02/09/2026. Elle s'appelait 'hero'
                pour TOUTES : la deuxième étape dessinée libérait alors les liens de
                la première, encore affichés, et sa photo virait au gris. C'est le
                défaut que Helmy décrit — « elles sont grises, je dois recharger la
                page, et si je recharge ça se regrise ». Le commentaire ci-dessus
                l'avait pourtant nommé : libérer un lien encore porté casse l'image. */
             var zoneH='hero:'+place;
             var purgeH=libererZone(zoneH); box.style.backgroundImage="url('"+lien(h.blob,zoneH)+"')"; purgeH(); box.innerHTML=(h.caption?'<span class="cn-hero-cap">'+esc(h.caption)+'</span>':'');
           box.style.backgroundPosition=h.heroPos||'50% 50%';
           /* La mesure est asynchrone et le bandeau peut être re-rempli entre-temps :
              ce jeton dit si le résultat concerne encore la photo affichée. */
           var jeton={}; box._jetonHero=jeton; box._tailleHero=null;
           tailleNaturelle(h.blob).then(function(s){ if(box._jetonHero===jeton) box._tailleHero=s; });
           poserGesteEnTete(box, place, h, function(){ panneauEnTete(place, (el.dataset&&el.dataset.nom)||''); }); }
    else { /* Pas encore de photo d'en-tête : on le PROPOSE au lieu de ne rien montrer.
              Le bandeau existait mais restait caché — on ne pouvait pas deviner qu'il
              suffisait de marquer une photo d'une étoile pour l'obtenir. */
      box.style.display='block'; box.style.backgroundImage=''; box.classList.add('vide');
      /* On rend le bandeau à son état neuf : sans ça, le geste et le cadrage d'une
         photo retirée restaient collés dessus et le défilement restait bloqué. */
      box.onpointerdown=box.onpointermove=box.onpointerup=box.onpointercancel=null;
      box.style.touchAction=''; box.style.cursor='pointer'; box.style.backgroundPosition='';
      box._tailleHero=null; box._jetonHero=null;
      box.innerHTML='<button type="button" class="cn-hero-add">📷 '+T('carnet.photo.en.tete')+'</button>';
      var b=box.querySelector('.cn-hero-add');
      if(b) b.onclick=function(ev){ ev.stopPropagation(); panneauEnTete(place, (el.dataset&&el.dataset.nom)||''); };
    }
  }); }
  function grid(g,place){ getMediaLarge(place).then(function(arr){
    /* même règle qu'au bandeau : une zone par étape, sinon la dernière dessinée
       emporte les vignettes de toutes les précédentes. */
    var zoneG='grid:'+place;
    var purge=libererZone(zoneG);
    g.innerHTML=arr.map(function(m){ var k=kind(m);
      if(k==='video') return '<div class="cn-th cn-vid">▶</div>';
      if(k==='audio') return '<div class="cn-th cn-aud">🎙️</div>';
      return '<div class="cn-th" style="background-image:url(\''+lien(m.blob,zoneG)+'\')"></div>'; }).join('')
      +'<div class="cn-th cn-addt">＋</div>';
    purge();
  }); }

  /* ---- modale gestionnaire ---- */
  function modal(html){ var w=document.getElementById('cn-modal'); w.querySelector('.cn-box').innerHTML=html; w.classList.add('on'); }
  /* ── LES LIENS D'OBJET SE LIBÈRENT ──────────────────────────────────────────
     Signalé le 30/08/2026, corrigé sur ordre de Helmy. Chaque photo affichée créait
     un `URL.createObjectURL` que personne ne libérait : le bandeau, la bande de
     vignettes, le gestionnaire et le panneau d'en-tête en refaisaient à CHAQUE
     rendu. Un carnet de cinquante photos rouvert dix fois retenait cinq cents blobs
     en mémoire jusqu'à la fermeture de l'onglet — sur un iPad, c'est ce qui finit
     par faire vider la page à l'utilisateur sans qu'il comprenne pourquoi.

     ⚠️ ON LIBÈRE APRÈS AVOIR POSÉ LE NOUVEAU CONTENU, JAMAIS AVANT : libérer un
     lien encore porté par une image affichée la casse à l'écran. */
  var LIENS={};
  function lien(blob, zone){
    var u=URL.createObjectURL(blob);
    (LIENS[zone]=LIENS[zone]||[]).push(u);
    return u;
  }
  function libererZone(zone){
    var anciens=LIENS[zone]||[]; LIENS[zone]=[];
    return function(){ anciens.forEach(function(u){ try{URL.revokeObjectURL(u);}catch(e){} }); };
  }
  function closeModal(){ var w=document.getElementById('cn-modal'); if(w)w.classList.remove('on'); CUR=null; }
  var CUR=null, CNSEL=[];
  /* ── APRÈS UN AJOUT, ON MONTRE LA PHOTO AJOUTÉE ─────────────────────────────
     Helmy, 30/08/2026 : « quand on rajoute une photo l'album revient à la première
     image alors qu'il devrait être à celle qu'on a rajoutée, comme ça on sait que
     c'est bon. » Le gestionnaire se reconstruit en entier et repartait donc du haut :
     rien ne disait que l'ajout avait pris. `focusId` désigne la photo à faire voir. */
  function openManager(place,nom,focusId){
    CUR={place:place,nom:nom}; CNSEL=[];
    getMedia(place).then(function(arr){
      var purgeM=libererZone('manager');
      var list = arr.length ? arr.map(function(m,i){ var k=kind(m), url=lien(m.blob,'manager');
        var media = k==='video'?'<video src="'+url+'" controls playsinline style="width:100%;border-radius:8px"></video>'
          : k==='audio'?'<audio src="'+url+'" controls style="width:100%"></audio>'
          : '<img src="'+url+'" class="cn-ouvrable" title="'+T('carnet.voir.en.grand')+'" alt="'+esc(m.caption||'')+'" style="width:100%;border-radius:8px;cursor:zoom-in">';
        return '<div class="cn-item" data-item="'+m.id+'">'+media+
          (k==='image'?'<input class="cn-cap" data-cap="'+m.id+'" maxlength="90" placeholder="'+T('carnet.legende.photo')+'" value="'+esc(m.caption||'')+'">':'')+
          '<div class="cn-ctr">'+
          '<input type="checkbox" class="cn-selk" data-sel="'+m.id+'" style="width:18px;height:18px;margin-right:auto">'+
          (k==='image'?'<button class="cn-hero-b'+(m.hero?' on':'')+'" data-hero="'+m.id+'" title="'+T('carnet.photo.en.tete')+'">⭐</button>':'')+
          '<button '+(i===0?'disabled':'')+' data-mv="'+m.id+'" data-dir="-1" title="'+T('plan.monter')+'">↑</button>'+
          '<button '+(i===arr.length-1?'disabled':'')+' data-mv="'+m.id+'" data-dir="1" title="'+T('plan.descendre')+'">↓</button>'+
          '<button data-dl="'+m.id+'" title="'+esc(T('Enregistrer dans mes photos'))+'">⬇️ '+T('Enregistrer')+'</button>'+
          '<button class="cn-rm" data-del="'+m.id+'">🗑️ '+T('carnet.supprimer')+'</button></div></div>'; }).join('')
        : '<div class="cn-empty">'+T('carnet.aucun.media.pour.linstant.ajoutez')+'</div>';
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>🖼️ '+T('carnet.carnet')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-list">'+list+'</div>'+
        (arr.length>1?'<div style="text-align:center;margin:6px 0 0"><button class="cn-btn cn-delsel" disabled>🗑️ '+T('carnet.supprimer')+' (0)</button></div>':'')+
        /* ── DES ICÔNES, PAS DES ÉTIQUETTES ────────────────────────────────────
           Helmy, 30/08/2026 : « l'organisation des icônes sur la page média est
           chaotique […] on n'a pas besoin des écrits, seules les icônes suffisent :
           appareil photo, cadre, etc. » Cinq boutons portant chacun son mot faisaient
           une rangée qui se repliait sur deux ou trois lignes selon la langue —
           l'allemand gonfle d'un sixième, et le carnet devenait illisible.
           ⚠️ LE MOT N'EST PAS SUPPRIMÉ, IL EST DÉPLACÉ : `title` pour la souris,
           `aria-label` pour la voix de synthèse. Il reste traduit par i18n, donc
           aucun texte en dur n'entre ici. Un bouton muet pour tout le monde aurait
           été un recul, pas une simplification.
           ⚠️ 44 px de côté au moins : une cible plus petite est intouchable au doigt
           (dépannage §1a), et retirer le mot rétrécit justement le bouton. */
        '<div class="cn-row cn-row-ic" style="margin-top:12px">'+
          '<label class="cn-btn cn-ic" title="'+esc(T('carnet.photo'))+'" aria-label="'+esc(T('carnet.photo'))+'">📷<input type="file" accept="image/*" capture="environment" multiple hidden data-add="image"></label>'+
          '<label class="cn-btn cn-ic" title="'+esc(T('carnet.galerie'))+'" aria-label="'+esc(T('carnet.galerie'))+'">🖼️<input type="file" accept="image/*" multiple hidden data-add="image"></label>'+
          '<label class="cn-btn cn-ic" title="'+esc(T('carnet.video'))+'" aria-label="'+esc(T('carnet.video'))+'">🎥<input type="file" accept="video/*,.mov,.mp4,.m4v,.avi,.3gp,.mkv" capture="environment" hidden data-add="video"></label>'+
          '<label class="cn-btn cn-ic" title="'+esc(T('carnet.fichiers'))+'" aria-label="'+esc(T('carnet.fichiers'))+'">📁<input type="file" accept="image/*,video/*,audio/*,.mov,.mp4,.m4v,.m4a,.mp3,.wav,.aac,.ogg" multiple hidden data-add=""></label>'+
          '<button class="cn-btn cn-ic cn-rec" title="'+esc(T('carnet.son'))+'" aria-label="'+esc(T('carnet.son'))+'">🎙️</button></div>'+
        '<p class="cn-tip">🔒 '+T('carnet.vos.medias.restent.sur.votre')+'</p>'+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('index.fermer')+'</button>');
      purgeM();
      var w=document.getElementById('cn-modal');
      /* ⚠️ C'EST `.cn-list` QUI DÉFILE (max-height:50vh; overflow:auto), pas la page.
         Et `.cn-item` n'est pas positionné par rapport à elle : son `offsetTop` se
         compte depuis `.cn-box`, donc il mentirait. On mesure les rectangles réels.
         ⚠️ Deux `requestAnimationFrame` : le premier rend la modale visible, le
         second laisse le calcul de mise en page se faire. Sans cela on défile vers
         une position qui n'existe pas encore. */
      if(focusId){
        requestAnimationFrame(function(){ requestAnimationFrame(function(){
          var boite=w&&w.querySelector('.cn-list');
          var vign=boite&&boite.querySelector('[data-item="'+focusId+'"]');
          if(!boite||!vign) return;
          var rb=boite.getBoundingClientRect(), rv=vign.getBoundingClientRect();
          boite.scrollTop += (rv.top-rb.top) - (boite.clientHeight-vign.offsetHeight)/2;
          vign.classList.add('cn-neuf');
          setTimeout(function(){ vign.classList.remove('cn-neuf'); }, 1800);
        }); });
      }
      arr.forEach(function(){});
      /* Le bouton unique accepte tout : le type vient donc du FICHIER, pas du
         bouton. Sans cela une vidéo déposée là s'affichait comme une image. */
      function typeDu(f, indice){
        var t=(f && f.type) || '';
        if(/^video/.test(t)) return 'video';
        if(/^audio/.test(t)) return 'audio';
        if(/^image/.test(t)) return 'image';
        return (indice && indice!=='media') ? indice : 'image';
      }
      w.querySelectorAll('[data-add]').forEach(function(inp){ inp.onchange=function(e){ var fs=e.target.files?[].slice.call(e.target.files):[];
        // écarter les images non décodables (ex. HEIC/HEIF via « Fichiers ») AVANT stockage -> pas de carré gris
        Promise.all(fs.map(function(f){ return decodable(f); })).then(function(oks){
          var keep=fs.filter(function(f,i){ return oks[i]; }), skipped=fs.length-keep.length;
          Promise.all(keep.map(function(f){ var t=typeDu(f, e.target.getAttribute('data-add'));
            return (t==='image'?compresser(f):Promise.resolve(f)).then(function(ff){ return addMedia(place, f.name, ff, t); }); })).then(function(ids){ openManager(place,nom, (ids||[]).filter(Boolean).pop()); refreshSections(place); if(window.THEBackup&&THEBackup.offer) THEBackup.offer(); if(skipped) alert(T('carnet.non.lisible')); });
        }); }; });
        /* ⬇️ ENREGISTRER — un média pris dans le carnet ne va PAS dans la
           pellicule du téléphone. Sans ce bouton il reste prisonnier de
           l'application. Repris tel quel du RoadTrip. */
        w.querySelectorAll('[data-dl]').forEach(function(b){ b.onclick=function(){
          getMedia(place).then(function(arr){
            var m=arr.filter(function(x){ return x.id===+b.getAttribute('data-dl'); })[0];
            if(!m||!m.blob) return;
            var k=kind(m);
            var ext = k==='video' ? ((m.blob.type&&m.blob.type.split('/')[1])||'mp4')
                    : (k==='audio' ? ((m.blob.type&&m.blob.type.split('/')[1])||'webm') : 'jpg');
            var u=URL.createObjectURL(m.blob), a=document.createElement('a');
            a.href=u; a.download=(m.name||('souvenir.'+ext));
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function(){ URL.revokeObjectURL(u); }, 4000);
          });
        }; });
        /* la légende s'enregistre en quittant le champ */
        w.querySelectorAll('[data-cap]').forEach(function(ta){
          ta.onchange=function(){ majMedia(+ta.getAttribute('data-cap'), {caption: ta.value}); };
        });
      w.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ delMedia(+b.getAttribute('data-del')).then(function(){ openManager(place,nom); refreshSections(place); }); }; });
      // suppression MULTIPLE (point 6) : cases à cocher + bouton « Supprimer (N) »
      var delselb=w.querySelector('.cn-delsel');
      w.querySelectorAll('[data-sel]').forEach(function(cb){ cb.onchange=function(){ var id=+cb.getAttribute('data-sel'); if(cb.checked){ if(CNSEL.indexOf(id)<0)CNSEL.push(id); } else { CNSEL=CNSEL.filter(function(x){return x!==id;}); } if(delselb){ delselb.disabled=CNSEL.length===0; delselb.textContent='🗑️ '+T('carnet.supprimer')+' ('+CNSEL.length+')'; } }; });
      if(delselb) delselb.onclick=function(){ if(!CNSEL.length)return; if(!confirm(T('carnet.supprimer')+' '+CNSEL.length+' ?'))return; Promise.all(CNSEL.map(function(id){return delMedia(id);})).then(function(){ CNSEL=[]; openManager(place,nom); refreshSections(place); }); };
      w.querySelectorAll('[data-mv]').forEach(function(b){ b.onclick=function(){ moveItem(place,nom,+b.getAttribute('data-mv'),+b.getAttribute('data-dir')); }; });
      w.querySelectorAll('[data-cap]').forEach(function(inp){ inp.onchange=function(){ updateMedia(+inp.getAttribute('data-cap'),{caption:inp.value}).then(function(){ refreshSections(place); }); }; });
      w.querySelectorAll('[data-hero]').forEach(function(b){ b.onclick=function(){ setHero(place,+b.getAttribute('data-hero')).then(function(){ openManager(place,nom); refreshSections(place); }); }; });
      var rec=w.querySelector('.cn-rec'); if(rec)rec.onclick=function(){ recordAudio(place,nom); };
    });
  }
  function moveItem(place,nom,id,dir){ getMedia(place).then(function(arr){ var i=arr.findIndex(function(m){return m.id===id;}); var j=i+dir; if(i<0||j<0||j>=arr.length)return;
    var a=arr[i],b=arr[j], oa=a.ord||a.ts||0, ob=b.ord||b.ts||0; Promise.all([setOrd(a.id,ob),setOrd(b.id,oa)]).then(function(){ openManager(place,nom); refreshSections(place); }); }); }
  function recordAudio(place,nom){
    if(!navigator.mediaDevices||!window.MediaRecorder){ alert(T('carnet.enregistrement.audio.non.supporte.sur')); return; }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      var mr=new MediaRecorder(stream), chunks=[]; mr.ondataavailable=function(e){ if(e.data&&e.data.size)chunks.push(e.data); };
      mr.onstop=function(){ stream.getTracks().forEach(function(t){t.stop();}); var blob=new Blob(chunks,{type:'audio/webm'}); addMedia(place,'son.webm',blob,'audio').then(function(id){ openManager(place,nom,id); refreshSections(place); }); };
      modal('<h3>🎙️ '+T('carnet.enregistrement')+'</h3><p class="cn-tip">'+T('carnet.parlez.puis.arretez')+'</p><button class="cn-close-b" id="cn-stop">⏹ '+T('carnet.arreter')+'</button>');
      document.getElementById('cn-stop').onclick=function(){ try{mr.stop();}catch(e){} };
      mr.start();
    }).catch(function(){ alert(T('carnet.micro.refuse.ou.indisponible')); });
  }
  function refreshSections(place){ document.querySelectorAll('.the-carnet').forEach(function(el){ if(el.dataset.place===place){ grid(el.querySelector('.cn-grid'), place); heroFill(el, place); } }); }

  function init(){
    var css='.the-carnet{margin-top:12px;background:#fffdf8;border:1px solid #e3d8c4;border-radius:10px;padding:12px}'
      +'.the-carnet .cn-hero{position:relative;height:150px;border-radius:9px;background:#eee center/cover no-repeat;margin-bottom:10px;box-shadow:0 3px 12px rgba(0,0,0,.16)}'
      +'.the-carnet .cn-hero.vide{background:#f6efe2;border:1px dashed #d9c9ab;display:flex;align-items:center;justify-content:center;height:96px}'
      +'.the-carnet .cn-hero-add{background:#fff;border:1px solid #e3d8c4;color:#6b5c45;border-radius:20px;padding:9px 16px;font:inherit;font-size:14px;cursor:pointer}'
      +'.the-carnet .cn-hero-add:hover{background:#f3eee3;color:#3a2c20}'
      +'.the-carnet .cn-hero .cn-hero-cap{position:absolute;left:0;right:0;bottom:0;padding:14px 12px 8px;color:#fff;font-family:Georgia,serif;font-style:italic;font-size:14px;background:linear-gradient(transparent,rgba(0,0,0,.7))}'
      +'.cn-cap{width:100%;margin-top:6px;border:1px solid #ddd;border-radius:6px;padding:6px 8px;font:inherit;font-size:13px}'
      +'.cn-hero-b{border:1px solid #ccc;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer;font:inherit;filter:grayscale(1);opacity:.6}.cn-hero-b.on{filter:none;opacity:1;border-color:#c9a24a;background:#fdf6e6}'
      +'.the-carnet .cn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}'
      +'.the-carnet .cn-ic:hover{background:#f4ecd9}'
      +'.the-carnet .cn-head{font-family:Georgia,serif;font-weight:600;font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;color:#8a7c66;margin-bottom:7px}.the-carnet .cn-priv{font-weight:400;color:#8a7c66;font-size:12px}'
      +'.the-carnet .cn-note{width:100%;min-height:54px;margin:8px 0;border:1px solid #ddd;border-radius:8px;padding:8px;font:inherit;font-size:14px}'
      +'.the-carnet .cn-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:9px}'
      +'.the-carnet .cn-grid > *{aspect-ratio:1/1;width:100%;height:auto;border-radius:9px;overflow:hidden}'
      +'.cn-th{width:54px;height:54px;border-radius:7px;background:#eee center/cover no-repeat;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:#a8884f}'
      +'.cn-th.cn-vid,.cn-th.cn-aud{background:#26201a;color:#f5ecd8}.cn-th.cn-addt{background:#f1e7d5;border:1px dashed #c9b896}'
      +'.the-carnet .cn-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.cn-btn{flex:1;min-width:130px;min-height:44px;padding:12px 10px;border:1px solid #c9b896;border-radius:8px;background:#26201a;color:#f5ecd8;font:inherit;font-weight:600;font-size:13px;cursor:pointer;text-align:center}'
      +'.the-carnet .cn-pc{background:#14305c}.the-carnet .cn-maps{color:inherit;text-decoration:none}'
+'.cn-hprev{height:150px;border-radius:10px;background:#eef2f6 center/cover no-repeat;border:1px solid #ddd}'
      +'.cn-hpgrid{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}'
      +'.cn-hp{width:66px;height:66px;border-radius:8px;background:#eee center/cover no-repeat;border:2px solid transparent;cursor:pointer}'
      +'.cn-hp.on{border-color:#b8860b}'
      +'.the-carnet .cn-note-priv{font-size:12px;color:#8a7c66;font-style:italic;margin-top:8px}'
      +'#cn-modal{position:fixed;inset:0;z-index:1450;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px}'
      +'#cn-modal.on{display:flex}#cn-modal .cn-box{background:#fffdf8;border-radius:14px;padding:16px;max-width:440px;width:100%;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
      +'#cn-modal .cn-x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:22px;cursor:pointer;color:#666}'
      +'#cn-modal h3{font-family:Georgia,serif;margin:0 0 10px}.cn-list{display:flex;flex-direction:column;gap:12px;max-height:50vh;overflow:auto}'
      +'.cn-item{border:1px solid #eee;border-radius:8px;padding:8px}.cn-ctr{display:flex;gap:6px;margin-top:6px}.cn-ctr button{border:1px solid #ccc;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer;font:inherit}.cn-ctr .cn-rm{margin-left:auto;color:#a3402a;border-color:#e0b8ac}'
      +'.cn-row-ic{display:flex;gap:8px;justify-content:center;flex-wrap:nowrap}'
      +'.cn-btn.cn-ic{flex:0 0 auto;width:46px;min-width:46px;height:46px;min-height:46px;display:inline-flex;align-items:center;justify-content:center;font-size:22px;line-height:1;padding:0;text-decoration:none;background:#fffdf7;color:inherit;border-color:#cbbb95}'
      +'.cn-item.cn-neuf{border-color:#c9a24a;box-shadow:0 0 0 3px rgba(201,162,74,.28);transition:box-shadow .3s,border-color .3s}'
      +'.cn-empty{color:#8a7c66;font-style:italic;padding:14px;text-align:center}.cn-tip{font-size:12px;color:#8a7c66;font-style:italic;margin:9px 0 0}'
      +'.cn-close-b{width:100%;margin-top:12px;padding:11px;border:none;border-radius:8px;background:#a8884f;color:#fff;font:inherit;font-weight:700;cursor:pointer}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    if(!document.getElementById('cn-modal')){ var w=document.createElement('div'); w.id='cn-modal'; w.innerHTML='<div class="cn-box"></div>'; document.body.appendChild(w);
      w.addEventListener('click',function(e){ if(e.target===w) closeModal(); }); }
    document.querySelectorAll('.the-carnet').forEach(renderSection);
  }
  // re-rendu quand l'itinéraire (re)génère ses étapes
  var mo=new MutationObserver(function(muts){ muts.forEach(function(m){ [].forEach.call(m.addedNodes,function(n){ if(n.nodeType===1){ if(n.classList&&n.classList.contains('the-carnet')) renderSection(n); else if(n.querySelectorAll) n.querySelectorAll('.the-carnet').forEach(renderSection); } }); }); });
  function start(){ init(); try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();

  /* Poser directement une photo d'en-tête : on ouvre la GALERIE du téléphone,
     pas la liste de ce qui est déjà importé. La première image choisie devient
     le bandeau de l'étape. Demandé par Helmy le 23/08 — « ça peut être une
     option, mais vers la galerie c'est mieux ». */
  /* SÉLECTEUR DE PHOTO D'EN-TÊTE — repris de RoadTrip (openHeaderChooser,
     index.html:1483 + edHeaderGallery:1419 + onHdrPick:1420).
     Chez RoadTrip « Depuis la galerie » ouvre le sélecteur natif du téléphone :
     l'en-tête ne se choisit PAS dans les photos déjà rangées sous l'étape.
     C'est ce qui manquait ici — le bandeau vide rouvrait le gestionnaire, donc
     sur une étape sans photo il n'y avait rien à choisir. */
  function panneauEnTete(place, nom){
    getMediaLarge(place).then(function(arr){
      var purgeE=libererZone('entete');   // libéré après `modal()`, jamais avant
      var imgs = arr.filter(function(m){ return kind(m)==='image'; });
      var h = imgs.filter(function(m){ return m.hero; })[0];
      var vign = imgs.map(function(m){
        return '<div class="cn-hp'+(m.hero?' on':'')+'" data-hp="'+m.id+'" style="background-image:url(\''+lien(m.blob,'entete')+'\')"></div>'; }).join('');
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>📷 '+T('carnet.photo.en.tete')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-hprev"'+(h?' style="background-image:url(\''+lien(h.blob,'entete')+'\')"':'')+'></div>'+
        '<div class="cn-row" style="margin-top:10px">'+
          '<label class="cn-btn">🖼️ '+T('carnet.galerie')+'<input type="file" accept="image/*" hidden class="cn-hpick"></label>'+
          '<label class="cn-btn">📷 '+T('carnet.photo')+'<input type="file" accept="image/*" capture="environment" hidden class="cn-hpick"></label>'+
          (h?'<button class="cn-btn cn-hclr">✕ '+T('carnet.supprimer')+'</button>':'')+'</div>'+
        (vign?'<div class="cn-hpgrid">'+vign+'</div>':'')+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('index.fermer')+'</button>');
      purgeE();
      var w=document.getElementById('cn-modal');
      w.querySelectorAll('.cn-hpick').forEach(function(inp){ inp.onchange=function(){
        var f=inp.files&&inp.files[0]; if(!f) return;
        compresser(f).then(function(ff){ return addMedia(place, f.name, ff, 'image'); })
          .then(function(id){ return setHero(place, id); })
          .then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      }; });
      w.querySelectorAll('[data-hp]').forEach(function(b){ b.onclick=function(){
        setHero(place, +b.getAttribute('data-hp')).then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      }; });
      var c=w.querySelector('.cn-hclr'); if(c) c.onclick=function(){
        setHero(place, null).then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      };
    });
  }

  function choisirEnTete(place, nom, apres){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = false;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f){ inp.remove(); return; }
      compresser(f).then(function(ff){ return addMedia(place, f.name, ff, 'image'); }).then(function(id){
        return setHero(place, id);
      }).then(function(){
        refreshSections(place);
        if(typeof apres === 'function') apres();
      }).catch(function(){}).then(function(){ inp.remove(); });
    };
    inp.click();
  }

  /* `ajouter` et `compresser` sortent au grand jour — 02/09/2026. Ils étaient
     enfermés ici, si bien qu'un bloc extérieur voulant ranger une photo devait
     réécrire l'accès à IndexedDB : deux chemins vers la même table, dont un seul
     compresse. `the-prise.js` s'en sert pour poser la photo prise au bandeau
     dans le carnet de l'étape choisie. Rien d'autre ne change ici. */
  window.THECarnet={ open:openManager, close:closeModal, render:renderSection, enTete:choisirEnTete, panneauEnTete:panneauEnTete,
                     ajouter:addMedia, compresser:compresser };
})();
