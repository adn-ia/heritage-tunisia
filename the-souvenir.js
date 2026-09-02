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

  function toDataURL(url){
    return fetch(url).then(function(r){ return r.blob(); }).then(function(b){
      return new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){res(fr.result);}; fr.onerror=function(){res(url);}; fr.readAsDataURL(b); });
    }).catch(function(){ return url; });
  }
  function collectCSS(){
    var out=''; var st=document.querySelectorAll('style');
    for(var i=0;i<st.length;i++) out+=st[i].textContent+'\n';
    return out;
  }

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
  function aplatirCarte(cadre){
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

      /* ② le tracé, porté par le SVG de Leaflet */
      var suite = Promise.resolve();
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
      return suite.then(function(){
        [].forEach.call(cadre.querySelectorAll('.leaflet-marker-icon'), function(m){
          try{
            var r = m.getBoundingClientRect();
            var x = r.left - r0.left + r.width / 2, y = r.top - r0.top + r.height / 2;
            var n = (m.textContent || '').trim();
            var ray = Math.max(11, Math.min(r.width, r.height) / 2);
            g.beginPath(); g.arc(x, y, ray, 0, 6.2832);
            g.fillStyle = '#a8884f'; g.fill();
            g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
            if(n){
              g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
              g.font = '700 ' + Math.round(ray * 1.05) + 'px Georgia, serif';
              g.fillText(n, x, y + 1);
            }
          }catch(e){}
        });
        return c.toDataURL('image/jpeg', 0.9);
      });
    }catch(e){ return Promise.resolve(null); }
  }

  /* Publiée : `the-print.js` s'en sert avant d'imprimer. Une carte Leaflet ne
     survit ni au clonage ni au changement de largeur que l'impression impose ;
     une image plate, si. Un seul aplatissement pour les deux usages. */
  window.THEcartePlate = aplatirCarte;

  /* ── LE FICHIER NE DÉPEND PAS DU BOUTON OÙ L'ON SE TROUVE ────────────────────
     03/09/2026, Helmy : « HTML n'a rien à voir avec le style ».
     Retirer la classe du `<body>` ne suffisait pas : le passeport et le dépliant
     changent aussi la STRUCTURE — l'un range les étapes en livre à deux pages sur
     papier ligné, l'autre en bande horizontale. Le fichier gardait donc leur
     forme, tampon compris.
     On repasse au rendu de base le temps de fabriquer le fichier, puis on remet
     l'écran comme on l'a trouvé. Le même itinéraire donne ainsi le même fichier,
     qu'on ait appuyé depuis Baroudeur, Passeport ou Dépliant. */
  function surRenduDeBase(faire){
    var actif = document.querySelector('.album-bar .tpl.on');
    var base  = document.querySelector('.album-bar .tpl[data-tpl="baroudeur"]');
    if(!actif || !base || actif === base) return faire().then(function(r){ return r; });
    base.click();
    return new Promise(function(res){ setTimeout(res, 1400); })   // le rendu se refait
      .then(faire)
      .then(function(r){ try{ actif.click(); }catch(e){} return r; })
      .catch(function(e){ try{ actif.click(); }catch(e2){} throw e; });
  }

  function buildSite(btn, fini){
    var doc=document.querySelector('.album-doc');
    if(!doc){ alert(T('Ouvrez d’abord l’album (choisissez un style), puis réessayez.'));
              if(typeof fini==='function') fini(); return; }
    var old=btn.textContent; btn.textContent='⏳ '+T('Création…'); btn.disabled=true;
    var clone=doc.cloneNode(true);

    /* ⚠️ PLUS RIEN À APLATIR ICI — 03/09/2026. Depuis que la couverture porte
       l'image de la carte de l'itinéraire (voir `openAlbum`), `.ac-carte` EST
       une `<img>` en `data:`. L'aplatissement que j'avais posé la veille
       s'exécutait quand même : ne trouvant ni canvas ni SVG dans une image, il
       rendait un aplat uni de 4 Ko et REMPLAÇAIT la vraie carte par ce vide.
       Le fichier repartait donc sans carte — le défaut d'origine, recréé par son
       propre correctif. Le clonage suffit : une image se clone entière. */
    var medias=[].slice.call(clone.querySelectorAll('img,video,source'));
    // convertir chaque média (blob:/http) en data-URI, en série
    var chain=Promise.resolve();
    medias.forEach(function(m){
      var src=m.getAttribute('src');
      if(!src || src.indexOf('data:')===0) return;
      chain=chain.then(function(){ return toDataURL(src).then(function(d){ m.setAttribute('src',d); m.removeAttribute('crossorigin'); }); });
    });
    chain.then(function(){
      /* ⚠️ LE FICHIER N'HÉRITE D'AUCUN HABILLAGE — 03/09/2026, Helmy : « HTML n'a
         rien à voir avec le style ».
         Il a raison, et c'est sa règle depuis la veille : Baroudeur, Passeport et
         Dépliant sont des PRODUITS ; imprimer, partager, enregistrer sont des
         SORTIES. On ne dit pas « un PDF en passeport » — on ne dira pas non plus
         « un HTML en passeport ». Le fichier portait pourtant `class="tpl-…"`,
         reprise de l'écran : le même itinéraire donnait trois fichiers différents
         selon le bouton où l'on se trouvait par hasard.
         Le `<body>` n'a donc plus de classe de style. Les règles `tpl-*` voyagent
         toujours dans le CSS embarqué — elles ne s'appliquent simplement à rien,
         faute de classe pour les déclencher. Reste l'itinéraire sur fond neutre :
         la couverture, la carte, les étapes, les photos, les notes. */
      var title=((document.querySelector('.album-cover h2')||{}).textContent||T('Mon voyage')).trim();
      var css=collectCSS()
        +'\nbody{margin:0;background:#e9e4d6;padding:16px;font-family:Georgia,"Times New Roman",serif;color:#2b2318}'
        +'#album{display:block !important;max-width:820px;margin:0 auto}'
        +'.album-bar,.share-panel,.leaflet-control-container,#projOv{display:none!important}'
        /* ⚠️ LA STRUCTURE SURVIT AU STYLE. Le passeport range ses étapes en livre à
           deux pages, le dépliant en bande horizontale : sans leurs règles, ces
           dispositions se lisent mal. On les ramène à une lecture simple, de haut
           en bas — celle qui vaut sur n'importe quel écran. */
        +'\n.pp-book,.depliant-strip{display:block !important;width:auto !important;overflow:visible !important}'
        +'.pp-page,.dep-panel{display:block !important;width:auto !important;min-width:0 !important;margin:0 0 18px !important}'
        +'.album-doc{background:#fffdf8 !important;color:#2b2318 !important;border-radius:10px;overflow:visible !important}'
        +'.album-cover{background:#e4d6b8 !important;color:#3a2c18 !important}'
        +'.ac-carte{display:block;width:100%;height:auto}';
      var footer='<p style="text-align:center;font-size:12px;color:#8a7c66;margin:22px auto 6px;max-width:820px">'
        + T('Souvenir créé avec Heritage — ce fichier vous appartient et reste consultable hors-ligne. Nous n’en conservons aucune copie.') + '</p>';
      var html='<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        +'<meta name="viewport" content="width=device-width,initial-scale=1">'
        +'<title>'+title.replace(/</g,'&lt;')+' — souvenir</title>'
        +'<style>'+css+'</style></head><body>'
        +'<div id="album">'+clone.outerHTML+'</div>'+footer+'</body></html>';
      var blob=new Blob([html],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=nomDeFichier(title,'voyage')+'-souvenir.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
      btn.textContent=old; btn.disabled=false;
      try{ if(window.toast) toast(T('Site souvenir enregistré — il est à vous, hors-ligne.')); }catch(e){}
      if(typeof fini==='function') fini();
    });
  }

  function inject(){
    var bar=document.querySelector('.album-bar');
    if(!bar || document.getElementById('albumsite')) return;
    var b=document.createElement('button');
    b.className='ab'; b.id='albumsite'; b.type='button';
    b.textContent='🌐 '+T('Enregistrer en site');
    b.onclick=function(){
      /* rendu de base, fabrication, puis on remet l'écran comme il était */
      surRenduDeBase(function(){ return new Promise(function(res){ buildSite(b, res); }); });
    };
    var back=document.getElementById('albumback');
    bar.insertBefore(b, back || null);
  }

  if(document.readyState!=='loading') inject(); else document.addEventListener('DOMContentLoaded', inject);
  setTimeout(inject, 1500);
  try{ new MutationObserver(inject).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();
