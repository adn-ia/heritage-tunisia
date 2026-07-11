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

  function buildSite(btn){
    var doc=document.querySelector('.album-doc');
    if(!doc){ alert(T('Ouvrez d’abord l’album (choisissez un style), puis réessayez.')); return; }
    var old=btn.textContent; btn.textContent='⏳ '+T('Création…'); btn.disabled=true;
    var clone=doc.cloneNode(true);
    var medias=[].slice.call(clone.querySelectorAll('img,video,source'));
    // convertir chaque média (blob:/http) en data-URI, en série
    var chain=Promise.resolve();
    medias.forEach(function(m){
      var src=m.getAttribute('src');
      if(!src || src.indexOf('data:')===0) return;
      chain=chain.then(function(){ return toDataURL(src).then(function(d){ m.setAttribute('src',d); m.removeAttribute('crossorigin'); }); });
    });
    chain.then(function(){
      var tplM=(document.body.className.match(/tpl-[a-zàâäéèêëîïôöùûüç-]+/)||['tpl-baroudeur']);
      var tpl=tplM[0];
      var title=((document.querySelector('.album-cover h2')||{}).textContent||T('Mon voyage')).trim();
      var css=collectCSS()
        +'\nbody{margin:0;background:#e9e4d6;padding:16px;font-family:Georgia,"Times New Roman",serif}'
        +'#album{display:block !important;max-width:820px;margin:0 auto}'
        +'.album-bar,.share-panel,.leaflet-control-container,#projOv{display:none!important}';
      var footer='<p style="text-align:center;font-size:12px;color:#8a7c66;margin:22px auto 6px;max-width:820px">'
        + T('Souvenir créé avec Heritage — ce fichier vous appartient et reste consultable hors-ligne. Nous n’en conservons aucune copie.') + '</p>';
      var html='<!doctype html><html lang="fr"><head><meta charset="utf-8">'
        +'<meta name="viewport" content="width=device-width,initial-scale=1">'
        +'<title>'+title.replace(/</g,'&lt;')+' — souvenir</title>'
        +'<style>'+css+'</style></head><body class="'+tpl+'">'
        +'<div id="album">'+clone.outerHTML+'</div>'+footer+'</body></html>';
      var blob=new Blob([html],{type:'text/html;charset=utf-8'});
      var url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download=(title.replace(/[^\w-]+/g,'-').replace(/^-+|-+$/g,'')||'voyage')+'-souvenir.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
      btn.textContent=old; btn.disabled=false;
      try{ if(window.toast) toast(T('Site souvenir enregistré — il est à vous, hors-ligne.')); }catch(e){}
    });
  }

  function inject(){
    var bar=document.querySelector('.album-bar');
    if(!bar || document.getElementById('albumsite')) return;
    var b=document.createElement('button');
    b.className='ab'; b.id='albumsite'; b.type='button';
    b.textContent='🌐 '+T('Enregistrer en site');
    b.onclick=function(){ buildSite(b); };
    var back=document.getElementById('albumback');
    bar.insertBefore(b, back || null);
  }

  if(document.readyState!=='loading') inject(); else document.addEventListener('DOMContentLoaded', inject);
  setTimeout(inject, 1500);
  try{ new MutationObserver(inject).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();
