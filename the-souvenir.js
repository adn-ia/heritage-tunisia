/* Un nom de fichier lisible : on translittère les accents au lieu de les hacher.
   « Marchés » donnait « March-s » — la classe \w ne connaît pas le é, qui tombait
   donc dans « caractère à remplacer ». `normalize('NFD')` sépare la lettre de son
   accent, et l'on ne retire que l'accent. Signalé par Helmy le 01/09/2026. */
function nomDeFichier(txt, repli){
  var s = String(txt || '').trim();
  try{ s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }catch(e){}
  s = s.replace(/[\/\\?%*:|"<>&,;]/g, ' ')   // interdits par les systèmes de fichiers, ou gênants dans une adresse
       .replace(/\s+/g, '-')
       .replace(/-{2,}/g, '-')
       .replace(/^-+|-+$/g, '');
  return s || repli;
}
/* the-souvenir.js — MODULE « Site souvenir HTML »
   Exporte l'album déjà rendu (n'importe lequel des 10 styles) en UN fichier .html AUTONOME :
   photos converties en data-URI, CSS inliné → consultable HORS-LIGNE, propriété de l'utilisateur.
   Rien n'est envoyé ni conservé côté serveur. À inclure après roadtrip-plus.js.
   Réutilise le rendu de #album (.album-doc), donc suit le style choisi. */
(function(){
  function T(fr){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr; }catch(e){ return fr; } }


  /* ── LA CARTE S'APLATIT EN UNE IMAGE ─────────────────────────────────────────
     Signalé par Helmy le 03/09/2026 : « la carte itinéraire n'apparaît pas dans le
     HTML produit ». Elle était bien clonée — mais VIDE.

     Un `cloneNode` copie la balise `<canvas>`, jamais ce qui y est dessiné : le
     pixel n'appartient pas au document, il appartient au contexte de rendu. Or
     cette carte est faite de HUIT canvas de tuiles, plus deux SVG pour le tracé et
     quatre marqueurs. Le fichier partait donc avec un cadre vide.

     On la redessine ici sur un seul canvas, dans l'ordre où elle s'empile à
     l'écran — les tuiles, puis le tracé, puis les points numérotés — et le fichier
     reçoit une image plate, qui n'a plus besoin de Leaflet pour exister. C'est
     aussi ce qui la rend consultable hors ligne, des années plus tard. */
  /* ⚠️ DEUX BESOINS, UNE SEULE SAISIE — 04/09/2026.
     · L'IMPRESSION veut une image COMPLÈTE : tuiles, tracé, pastilles, tout cuit
       dedans. Une feuille de papier ne se clique pas.
     · L'EXPORT CLIQUABLE veut une image NUE : les tuiles et rien d'autre. Le
       tracé et les étapes y sont REPROJETÉS, pas photographiés — c'est la seule
       façon qu'ils tombent au même endroit que le fond.
     `opts.nu` fait la différence. Sans lui, rien ne change pour `the-print.js`. */
  /* ── LA PROJECTION, EN HUIT LIGNES ──────────────────────────────────────────
     C'est la Mercator sphérique (EPSG:3857), celle des tuiles web, avec des
     tuiles de 256 px — exactement ce que Leaflet emploie pour poser le fond. On
     la refait ici plutôt que d'en demander une : le fichier produit doit vivre
     seul, sans Leaflet, sans réseau, ouvert dans dix ans sur n'importe quoi.
     Huit lignes qu'on peut lire valent mieux qu'une dépendance qu'on subit.

     Rendu en POURCENTAGES de l'image, pas en pixels : un pourcentage suit
     l'image quand elle est redimensionnée, un pixel non — la leçon du 03/09,
     qu'on garde. */
  function projeter(vue, lng, lat){
    var s = 256 * Math.pow(2, vue.zoom);
    function px(lo, la){
      var y = Math.sin(la * Math.PI / 180);
      y = Math.max(-0.9999, Math.min(0.9999, y));
      return [ (lo + 180) / 360 * s,
               (0.5 - Math.log((1 + y) / (1 - y)) / (4 * Math.PI)) * s ];
    }
    var c = px(vue.lng, vue.lat), p = px(lng, lat);
    return { x: ((p[0] - c[0]) + vue.largeur  / 2) / vue.largeur  * 100,
             y: ((p[1] - c[1]) + vue.hauteur / 2) / vue.hauteur * 100 };
  }

  /* ── LES JALONS DU VOYAGE, DANS L'ORDRE OÙ ON LES PARCOURT ──────────────────
     Le départ, les étapes numérotées, puis la fin : le retour au départ si le
     voyage n'est pas un aller simple — règle de Terralog, `blocs/20-itineraire.js`
     l. 590 — ou le point d'arrivée s'il en a un. C'est la MÊME suite que celle
     que la carte de l'itinéraire trace : on ne compose pas un autre parcours,
     on redit celui-là. */
  function jalons(v){
    var out = [];
    if(v.origine && v.origine.coord) out.push({ r:'depart', n:'⌂', coord:v.origine.coord });
    v.etapes.forEach(function(e){ if(e.coord) out.push({ r:'etape', n:String(e.n), coord:e.coord }); });
    if(v.forme !== 'oneway'){
      /* Le retour au départ : le tracé s'y referme, mais on n'y repose PAS de
         repère — ce serait le même lieu marqué deux fois. Terralog l. 743 : son
         lieu EST le départ. */
      if(v.origine && v.origine.coord) out.push({ r:'retour', n:'', coord:v.origine.coord });
    } else if(v.arrivee && v.arrivee.coord){
      out.push({ r:'arrivee', n:'🏁', coord:v.arrivee.coord });
    }
    return out;
  }

  function aplatirCarte(cadre, opts){
    opts = opts || {};
    try{
      var r0 = cadre.getBoundingClientRect();
      if(!r0.width || !r0.height) return Promise.resolve(null);
      var ech = Math.min(2, window.devicePixelRatio || 1);   // net sans être énorme
      var c = document.createElement('canvas');
      c.width = Math.round(r0.width * ech); c.height = Math.round(r0.height * ech);
      var g = c.getContext('2d');
      g.scale(ech, ech);
      g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, r0.width, r0.height);

      /* ① les tuiles */
      [].forEach.call(cadre.querySelectorAll('canvas'), function(t){
        try{
          var r = t.getBoundingClientRect();
          if(!r.width || !r.height) return;
          g.drawImage(t, r.left - r0.left, r.top - r0.top, r.width, r.height);
        }catch(e){}
      });

      /* ⚠️ ON RETIENT CE QUE LA CARTE SAIT D'ELLE-MÊME, À L'INSTANT DE LA SAISIE
         — son centre, son zoom, sa taille. C'est tout ce qu'il faut pour
         reprojeter n'importe quel lieu sur cette image-là, par Mercator, la
         même projection que les tuiles. Saisi ICI et pas plus tard : la carte
         est masquée dès que l'album s'ouvre, et une carte masquée mesure zéro. */
      try{ window.THEcarteEtat = (window.THEcarteVue && window.THEcarteVue()) || null; }
      catch(e){ window.THEcarteEtat = null; }

      /* ② LE TRACÉ — PROJETÉ, PLUS PHOTOGRAPHIÉ.
         04/09/2026 : c'est ici que naissait le désordre vu par Helmy. On clonait
         le SVG de Leaflet et on le rasterisait à la taille du CADRE — or ce SVG
         porte son propre repère interne et son propre décalage, très différents
         de ceux du cadre. La ligne atterrissait donc à gauche pendant que les
         pastilles, mesurées au `getBoundingClientRect`, tombaient à droite. Deux
         géométries pour un seul dessin.
         On trace maintenant depuis les vraies coordonnées, par la même
         projection que les tuiles : fond, tracé et pastilles partagent enfin UNE
         géométrie, dans l'image comme dans le fichier cliquable.
         ⚠️ Sans l'état de la carte, on retombe sur l'ancienne photographie —
         imparfaite, mais mieux qu'une carte sans tracé. */
      var _vue = window.THEcarteEtat, _voy = null;
      try{ _voy = (window.THEvoyage && window.THEvoyage()) || null; }catch(e){}
      var _proj = (_vue && _voy) ? jalons(_voy).map(function(j){
            var q = projeter(_vue, j.coord[0], j.coord[1]);
            return { r:j.r, n:j.n, x:q.x/100*r0.width, y:q.y/100*r0.height };
          }) : null;

      var suite = Promise.resolve();
      if(_proj){
        if(_proj.length > 1 && !opts.nu){
          g.save();
          g.strokeStyle = '#a8884f'; g.lineWidth = 2.5; g.globalAlpha = .85;
          g.lineJoin = 'round'; g.lineCap = 'round';
          if(g.setLineDash) g.setLineDash([6, 6]);
          g.beginPath(); g.moveTo(_proj[0].x, _proj[0].y);
          for(var _i = 1; _i < _proj.length; _i++) g.lineTo(_proj[_i].x, _proj[_i].y);
          g.stroke(); g.restore();
        }
      } else if(!opts.nu)
      [].forEach.call(cadre.querySelectorAll('svg'), function(sv){
        suite = suite.then(function(){
          return new Promise(function(res){
            try{
              var r = sv.getBoundingClientRect();
              if(!r.width || !r.height) return res();
              var copie = sv.cloneNode(true);
              copie.setAttribute('width',  r.width);
              copie.setAttribute('height', r.height);
              var txt = new XMLSerializer().serializeToString(copie);
              var im = new Image();
              im.onload  = function(){ g.drawImage(im, r.left - r0.left, r.top - r0.top, r.width, r.height); res(); };
              im.onerror = function(){ res(); };
              im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
            }catch(e){ res(); }
          });
        });
      });

      /* ③ les points numérotés — REDESSINÉS, pas photographiés : ce sont des
            éléments HTML, et on ne fabrique pas une image depuis du HTML sans y
            perdre les polices. On lit leur numéro et leur place. */
      /* ⚠️ ON RETIENT AUSSI OÙ SONT LES POINTS — 03/09/2026. Le fichier souvenir
         n'est plus une page qui déroule : c'est une carte où l'on clique sur une
         étape pour voir ses photos. Il lui faut donc, pour chaque point, sa place
         SUR L'IMAGE, en pourcentage — un pourcentage suit l'image quand elle est
         redimensionnée, un pixel non. */
      var places = [];
      return suite.then(function(){
        function rond(x, y, n, ray, fond){
          g.beginPath(); g.arc(x, y, ray, 0, 6.2832);
          g.fillStyle = fond; g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
          if(n){
            g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.font = '700 ' + Math.round(ray * 1.05) + 'px Georgia, serif';
            g.fillText(n, x, y + 1);
          }
        }
        if(_proj){
          /* Les pastilles viennent de la MÊME projection que le tracé et que les
             tuiles. Plus de mesure du DOM : c'est elle qui faisait diverger les
             deux dessins. */
          _proj.forEach(function(q){
            if(q.r === 'retour') return;          // le retour ne se marque pas deux fois
            places.push({ n:q.n, r:q.r, x:(q.x / r0.width) * 100, y:(q.y / r0.height) * 100 });
            if(opts.nu) return;                   // rien de cuit : tout sera reprojeté
            rond(q.x, q.y, q.n, q.r === 'etape' ? 13 : 11,
                 q.r === 'etape' ? '#a8884f' : '#2b2318');
          });
        } else {
          [].forEach.call(cadre.querySelectorAll('.leaflet-marker-icon'), function(m){
            try{
              var r = m.getBoundingClientRect();
              var x = r.left - r0.left + r.width / 2, y = r.top - r0.top + r.height / 2;
              var n = (m.textContent || '').trim();
              if(n) places.push({ n:n, r:'etape', x:(x / r0.width) * 100, y:(y / r0.height) * 100 });
              if(opts.nu) return;
              rond(x, y, n, Math.max(11, Math.min(r.width, r.height) / 2), '#a8884f');
            }catch(e){}
          });
        }
        var url = c.toDataURL('image/jpeg', 0.9);
        /* deux appelants, deux besoins : `the-print.js` veut l'image, le fichier
           souvenir veut aussi les points. On rend l'image, et on dépose les points
           à côté — la signature ne change pas pour l'autre. */
        window.THEcartePoints = places;
        return url;
      });
    }catch(e){ return Promise.resolve(null); }
  }

  /* Publiée : `the-print.js` s'en sert avant d'imprimer. Une carte Leaflet ne
     survit ni au clonage ni au changement de largeur que l'impression impose ;
     une image plate, si. Un seul aplatissement pour les deux usages. */
  window.THEcartePlate = aplatirCarte;

  /* ── LE FICHIER SOUVENIR : UNE CARTE OÙ L'ON CLIQUE ──────────────────────────
     03/09/2026, Helmy : « HTML équivalent à album. Un HTML avec un tableau de
     bord : la carte avec les étapes cliquables, qui ouvrent une fenêtre avec les
     photos et les commentaires. »

     Ce n'est donc plus une page qui déroule les étapes les unes sous les autres —
     ça, c'est l'album à l'écran, et le PDF. C'est un objet à part : on voit le
     voyage d'un coup d'œil, on touche une étape, elle s'ouvre.

     UN SEUL FICHIER, RIEN À CÔTÉ. La carte est une image, les photos sont des
     `data:`, le script tient en trente lignes à la fin du document. Il s'ouvre
     sans réseau, sans l'application, dans dix ans, et il appartient au voyageur.

     ⚠️ IL NE COPIE PLUS LE DOM DE L'ALBUM. L'ancienne version clonait `.album-doc`
     et traînait avec elle tout le CSS de l'application — d'où un fichier qui
     changeait d'allure selon le style affiché. Ici on lit les DONNÉES (le nom, la
     ville, la note, les photos) et on écrit un document à nous. */
  function echapper(t){
    return String(t==null?'':t).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; });
  }

  function lireLesEtapes(){
    var lire = window.THECarnet && THECarnet.lire;
    var stops = [].slice.call(document.querySelectorAll('.stop'));
    return Promise.all(stops.map(function(st, i){
      var cn = st.querySelector('.the-carnet');
      var e = { n:i+1,
                nom:(cn && cn.getAttribute('data-nom')) || '',
                ville:(cn && cn.getAttribute('data-ville')) || '',
                note:'', photos:[] };
      var ta = st.querySelector('textarea');
      if(ta) e.note = ta.value || '';
      if(!cn || !lire) return Promise.resolve(e);
      return lire(cn.getAttribute('data-place')).then(function(arr){
        var images = (arr||[]).filter(function(m){
          return m && m.blob && String(m.type||m.blob.type||'').indexOf('image')===0; });
        return Promise.all(images.map(function(m){
          return new Promise(function(res){
            var fr=new FileReader();
            fr.onload=function(){ res(fr.result); };
            fr.onerror=function(){ res(null); };
            fr.readAsDataURL(m.blob);
          });
        })).then(function(urls){ e.photos = urls.filter(Boolean); return e; });
      }).catch(function(){ return e; });
    }));
  }

  function buildSite(btn, fini){
    /* ⚠️ L'IMAGE DE LA COUVERTURE D'ABORD — 03/09/2026. Le sélecteur
       `.ac-carte, #map` rendait `#map`, qui vient en premier dans le document :
       or l'album étant ouvert, `#map` est masqué, et une carte cachée mesure zéro.
       La couverture porte déjà l'image de la bonne carte : on la prend. `#map` ne
       sert que de recours, quand la couverture n'en a pas. */
    var cadre = document.querySelector('img.ac-carte')
             || document.querySelector('.ac-carte')
             || document.getElementById('map');
    if(!cadre){ alert(T('Ouvrez d’abord l’album, puis réessayez.'));
                if(typeof fini==='function') fini(); return; }
    var old = btn.textContent;
    btn.textContent = '⏳ ' + T('Création…'); btn.disabled = true;

    var titre = ((document.querySelector('.album-cover h2')||{}).textContent||T('Mon voyage')).trim();
    var meta  = ((document.querySelector('.album-cover .ac-meta')||{}).textContent||'').trim();
    var marque= (window.HConf && HConf.marque) || '';

    /* ── LA CARTE SE REPROJETTE, ELLE NE SE RECOLLE PAS ─────────────────────
       04/09/2026, Helmy : « la carte est toute désorganisée en export sur les
       documents. Vous tentez d'en créer une alors qu'il faut reprojeter juste
       celle qui est sur l'itinéraire. Elle doit être reprojetée entièrement, en
       auto-porté fonctionnel — si la personne exporte un fichier, elle clique
       sur les points étapes, non ? »

       Constaté dans le fichier produit, à l'écran : le TRACÉ tombait à gauche et
       les PASTILLES à droite. Deux géométries recollées côte à côte — la ligne
       photographiée depuis le SVG de Leaflet, qui porte son propre repère
       interne et son propre décalage, les pastilles mesurées au
       `getBoundingClientRect`. Rien ne les obligeait à coïncider, et elles ne
       coïncidaient pas.

       Désormais : le fond est l'image NUE — les tuiles seules — et le tracé
       comme les étapes sont REPROJETÉS depuis leurs vraies coordonnées, par la
       projection de Mercator, avec le centre et le zoom que la carte avait au
       moment de la saisie. Une seule géométrie pour les trois. Le tracé devient
       un SVG en pourcentages : il suit l'image à toute largeur et reste net là
       où une photographie baverait.

       ⚠️ SANS L'ÉTAT DE LA CARTE, ON NE REPROJETTE RIEN — on retombe alors sur
       l'image complète et les points mesurés, l'ancien comportement. Ce n'est
       pas un repli de traduction : c'est un document déjà fabriqué qu'on rend
       tel qu'on sait le rendre, plutôt qu'une page blanche. */
    var carteURL = null, points = [], vue = null, voyage = null;
    Promise.resolve()
      .then(function(){
        try{ voyage = (window.THEvoyage && window.THEvoyage()) || null; }catch(e){}
        vue = window.THEcarteEtat || null;
        if(vue && voyage && window.THEcarteNue){ carteURL = window.THEcarteNue; return; }
        vue = null;
        if(cadre.tagName === 'IMG'){
          carteURL = cadre.getAttribute('src');
          points = (window.THEcartePoints||[]).slice();
          return;
        }
        return window.THEcartePlate(cadre).then(function(u){
          carteURL = u; points = (window.THEcartePoints||[]).slice();
        });
      })
      .then(lireLesEtapes)
      .then(function(etapes){
        var trace = '';
        if(vue && voyage){
          var suite = jalons(voyage);
          points = suite.filter(function(j){ return j.n; }).map(function(j){
            var q = projeter(vue, j.coord[0], j.coord[1]);
            return { n:j.n, r:j.r, x:q.x, y:q.y };
          });
          if(suite.length > 1){
            var d = suite.map(function(j){
              var q = projeter(vue, j.coord[0], j.coord[1]);
              return q.x.toFixed(3)+','+q.y.toFixed(3);
            }).join(' ');
            trace = '<svg class="tr" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'
                  + '<polyline points="'+d+'"/></svg>';
          }
        }
        /* ⚠️ SEULE UNE ÉTAPE SE CLIQUE. Le départ et l'arrivée n'ont ni photos ni
           note : en faire des boutons promettait une fenêtre qui ne s'ouvrait
           jamais. Ils restent visibles — on doit voir d'où l'on part et où l'on
           finit — mais en repère, pas en bouton. */
        var pastilles = points.map(function(p){
          var pos = 'left:'+p.x.toFixed(2)+'%;top:'+p.y.toFixed(2)+'%';
          if(p.r !== 'etape'){
            return '<span class="pt borne" style="'+pos+'" aria-hidden="true">'
                 + echapper(p.n)+'</span>';
          }
          return '<button class="pt" style="'+pos+'" '
               + 'data-n="'+echapper(p.n)+'" aria-label="'+T('Étape')+' '+echapper(p.n)+'">'
               + echapper(p.n)+'</button>';
        }).join('');

        var fiches = etapes.map(function(e){
          var ph = e.photos.map(function(u){ return '<img src="'+u+'" alt="">'; }).join('');
          return '<article class="fiche" id="e'+e.n+'">'
               + '<h2><span class="num">'+e.n+'</span> '+echapper(e.nom)+'</h2>'
               + (e.ville ? '<p class="ville">'+echapper(e.ville)+'</p>' : '')
               + (e.note  ? '<p class="note">'+echapper(e.note)+'</p>' : '')
               + (ph ? '<div class="photos">'+ph+'</div>' : '')
               + '</article>';
        }).join('');

        var css =
          ':root{--ivoire:#f6f0e4;--papier:#fffdf8;--encre:#2b2318;--pierre:#8a7c66;--or:#a8884f;--filet:#e3d8c4}'
        + '*{box-sizing:border-box}'
        + 'body{margin:0;background:var(--ivoire);color:var(--encre);'
        + 'font:16px/1.65 Georgia,"Times New Roman",serif}'
        + '.enveloppe{max-width:1000px;margin:0 auto;padding:18px}'
        + 'header{text-align:center;padding:14px 0 18px}'
        + '.marque{letter-spacing:.22em;font-size:12px;color:var(--pierre);text-transform:uppercase}'
        + 'h1{font-size:30px;margin:8px 0 4px;font-weight:600}'
        + '.meta{color:var(--pierre);font-size:14px;font-style:italic}'
        + '.carte{position:relative;margin:0 auto;border-radius:12px;overflow:hidden;'
        + 'box-shadow:0 8px 30px rgba(0,0,0,.18);background:#e9e4d6}'
        + '.carte>img{display:block;width:100%;height:auto}'
        /* Le tracé est un SVG en pourcentages, étiré sur l'image : x suit la
           largeur, y suit la hauteur, indépendamment. `non-scaling-stroke`
           garde le trait à la même épaisseur quelle que soit la taille —
           sans lui, l'étirement l'écraserait dans un sens et l'épaissirait
           dans l'autre. */
        + '.carte>.tr{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'
        + '.carte>.tr polyline{fill:none;stroke:var(--or);stroke-width:2.5;'
        + 'stroke-dasharray:6 6;stroke-linejoin:round;stroke-linecap:round;'
        + 'opacity:.85;vector-effect:non-scaling-stroke}'
        + '.pt{position:absolute;transform:translate(-50%,-50%);width:34px;height:34px;'
        + 'border-radius:50%;background:var(--or);color:#fff;border:2.5px solid #fff;'
        + 'font:700 14px/1 Georgia,serif;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);'
        + 'display:flex;align-items:center;justify-content:center;padding:0}'
        + '.pt:hover,.pt:focus{background:#2e6a4d;outline:none;transform:translate(-50%,-50%) scale(1.15)}'
        + '.pt.borne{background:var(--encre,#2b2318);cursor:default;width:28px;height:28px;font-size:13px}'
        + '.pt.borne:hover{background:var(--encre,#2b2318);transform:translate(-50%,-50%)}'
        + '.aide{text-align:center;color:var(--pierre);font-size:13.5px;font-style:italic;margin:12px 0 0}'
        /* la liste sert de repli : sans script, sans souris, à l'impression */
        + '.liste{margin:26px 0 0}'
        + '.fiche{background:var(--papier);border:1px solid var(--filet);border-radius:12px;'
        + 'padding:16px 18px;margin:0 0 14px}'
        + '.fiche h2{font-size:20px;margin:0 0 2px;font-weight:600;display:flex;align-items:center;gap:10px}'
        + '.num{flex:0 0 30px;height:30px;border-radius:50%;background:var(--or);color:#fff;'
        + 'font-size:14px;display:flex;align-items:center;justify-content:center}'
        + '.ville{margin:0 0 8px;color:var(--pierre);font-size:14px;font-style:italic}'
        + '.note{margin:6px 0 10px;white-space:pre-line}'
        + '.photos{display:flex;flex-wrap:wrap;gap:10px}'
        + '.photos img{width:190px;height:145px;object-fit:cover;border-radius:8px;'
        + 'border:5px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,.2);cursor:pointer}'
        /* la fenêtre d'une étape */
        + '#vue{position:fixed;inset:0;background:rgba(20,15,10,.86);display:none;'
        + 'align-items:flex-start;justify-content:center;overflow:auto;padding:22px;z-index:50}'
        + '#vue.on{display:flex}'
        + '#vue .boite{background:var(--papier);border-radius:14px;padding:20px;'
        + 'max-width:720px;width:100%;position:relative;box-shadow:0 14px 50px rgba(0,0,0,.5)}'
        + '#vue .fermer{position:absolute;top:8px;right:12px;background:none;border:none;'
        + 'font-size:28px;line-height:1;cursor:pointer;color:var(--pierre)}'
        + '#vue .fiche{border:none;box-shadow:none;padding:0;margin:0;background:none}'
        + 'footer{text-align:center;color:var(--pierre);font-size:12px;margin:26px 0 8px}'
        + '@media print{.pt,#vue,.aide{display:none!important}'
        + '.fiche{break-inside:avoid;page-break-inside:avoid}}';

        var script =
          '(function(){'
        + 'var v=document.getElementById("vue"),b=v.querySelector(".boite");'
        + 'function ouvrir(n){var f=document.getElementById("e"+n);if(!f)return;'
        + 'b.innerHTML=f.outerHTML;'
        + 'var x=document.createElement("button");x.className="fermer";x.type="button";'
        + 'x.setAttribute("aria-label","Fermer");x.innerHTML="&times;";x.onclick=fermer;'
        + 'b.insertBefore(x,b.firstChild);'
        + 'v.classList.add("on");document.body.style.overflow="hidden";}'
        + 'function fermer(){v.classList.remove("on");document.body.style.overflow="";}'
        + 'v.addEventListener("click",function(e){if(e.target===v)fermer();});'
        + 'document.addEventListener("keydown",function(e){if(e.key==="Escape")fermer();});'
        + '[].forEach.call(document.querySelectorAll(".pt"),function(p){'
        + 'p.onclick=function(){ouvrir(p.getAttribute("data-n"));};});'
        + '})();';

        var html = '<!doctype html><html lang="'+((window.THEi18n&&THEi18n.lang())||'fr')+'">'
          + '<head><meta charset="utf-8">'
          + '<meta name="viewport" content="width=device-width,initial-scale=1">'
          + '<title>'+echapper(titre)+'</title><style>'+css+'</style></head><body>'
          + '<div class="enveloppe">'
          + '<header><div class="marque">'+echapper(marque)+'</div>'
          + '<h1>'+echapper(titre)+'</h1>'
          + (meta?'<div class="meta">'+echapper(meta)+'</div>':'')+'</header>'
          + (carteURL
              ? '<div class="carte"><img src="'+carteURL+'" alt="">'+trace+pastilles+'</div>'
                + '<p class="aide">'+T('souvenir.aide.carte')+'</p>'
              : '')
          + '<div class="liste">'+fiches+'</div>'
          + '<footer>'+T('Souvenir créé avec Heritage — ce fichier vous appartient et reste consultable hors-ligne. Nous n’en conservons aucune copie.')+'</footer>'
          + '</div><div id="vue"><div class="boite"></div></div>'
          /* ⚠️ UNE SEULE BARRE OBLIQUE INVERSE — 03/09/2026. Écrite en double,
             elle ne s'échappait plus : le fichier recevait « <\/script> » avec la
             barre VISIBLE, et le navigateur, lisant un caractère qu'il n'attendait
             pas, refusait tout le script. Le fichier s'ouvrait, la carte
             s'affichait, et aucune étape ne réagissait au clic.
             En JavaScript, « '<\/script>' » vaut « </script> » : la barre sert à
             empêcher le navigateur de croire que la balise se ferme ICI, dans le
             module. Elle ne doit pas se retrouver dans le fichier produit. */
          + '<script>'+script+'<\/script></body></html>';

        var blob = new Blob([html], {type:'text/html;charset=utf-8'});
        var url  = URL.createObjectURL(blob), a = document.createElement('a');
        /* ⚠️ UN NOM QU'ON RETROUVE — 03/09/2026, Helmy : « mon itinéraire souvenir,
           je ne le vois nulle part ». Le fichier s'appelait « 🧭-Mon-itineraire-
           souvenir.html » : un nom qui COMMENCE par un pictogramme se range en
           tête ou en queue de liste selon l'appareil, jamais à sa lettre. On
           retire donc tout ce qui n'est pas une lettre en tête, et on date le
           fichier — deux souvenirs du même voyage ne s'écrasent plus l'un l'autre
           et se rangent dans l'ordre. */
        var jour = new Date().toISOString().slice(0,10);
        var base = nomDeFichier(titre,'itineraire').replace(/^[^A-Za-zÀ-ÿ0-9]+/, '') || 'itineraire';
        a.href = url; a.download = base+'-'+jour+'.html';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function(){ URL.revokeObjectURL(url); }, 8000);
        btn.textContent = old; btn.disabled = false;
        try{ if(window.THEtoast) THEtoast(T('souvenir.enregistre')+' '+a.download); }catch(e){}
        if(typeof fini==='function') fini();
      })
      .catch(function(){
        btn.textContent = old; btn.disabled = false;
        if(typeof fini==='function') fini();
      });
  }

  function inject(){
    var bar=document.querySelector('.album-bar');
    if(!bar || document.getElementById('albumsite')) return;
    var b=document.createElement('button');
    b.className='ab'; b.id='albumsite'; b.type='button';
    /* « Enregistrer en site » ne disait pas qu'un FICHIER se télécharge — d'où
       « je ne le vois nulle part ». Le bouton dit maintenant ce qu'il fait. */
    b.textContent=T('souvenir.bouton');
    b.onclick=function(){ buildSite(b); };
    var back=document.getElementById('albumback');
    bar.insertBefore(b, back || null);
  }

  if(document.readyState!=='loading') inject(); else document.addEventListener('DOMContentLoaded', inject);
  setTimeout(inject, 1500);
  try{ new MutationObserver(inject).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();
