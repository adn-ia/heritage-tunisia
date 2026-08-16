/* the-carnet.js — MODULE SQUELETTE « Carnet d'étape » (reproduit Road Trip, sans Firebase).
   Section par étape : note + grille des médias + « Gérer / ajouter médias » (modale gestionnaire
   Photo/Vidéo/Son, réordonner ↑↓, supprimer 🗑️) + « Carte postale » + lien Maps + rappel confidentialité.
   Stockage : IndexedDB « the-carnet » / store « photos » (index « place ») — partagé avec the-postcard.js.
   Usage : placer <div class="the-carnet" data-place="<clé>" data-nom="<nom>" data-lat=".." data-lng=".."></div> ;
   le module rend tout seul. À inclure : <script src="the-carnet.js" defer></script> (après the-postcard.js). */
(function(){
  function T(fr){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr; }catch(e){ return fr; } }
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  /* ---- IndexedDB (même base que THE/le module carte postale) ---- */
  function db(){ return new Promise(function(res,rej){ var r=indexedDB.open('the-carnet',1);
    r.onupgradeneeded=function(e){ var d=e.target.result; if(!d.objectStoreNames.contains('photos')){ var os=d.createObjectStore('photos',{keyPath:'id',autoIncrement:true}); os.createIndex('place','place',{unique:false}); } };
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }
  function getMedia(place){ return db().then(function(d){ return new Promise(function(res){
    var out=[], c=d.transaction('photos','readonly').objectStore('photos').index('place').openCursor(IDBKeyRange.only(place));
    c.onsuccess=function(e){var x=e.target.result; if(x){out.push(x.value);x.continue();} else { out.sort(function(a,b){return (a.ord||a.ts||0)-(b.ord||b.ts||0);}); res(out); }}; c.onerror=function(){res([]);}; }); }); }
  function addMedia(place,name,blob,type){ return db().then(function(d){ return new Promise(function(res,rej){
    var rq=d.transaction('photos','readwrite').objectStore('photos').add({place:place,name:name,blob:blob,type:type||(blob.type||'image'),ts:Date.now(),ord:Date.now()});
    rq.onsuccess=function(){res();}; rq.onerror=function(){rej(rq.error);}; }); }); }
  function delMedia(id){ return db().then(function(d){ return new Promise(function(res){ var rq=d.transaction('photos','readwrite').objectStore('photos').delete(id); rq.onsuccess=function(){res();}; rq.onerror=function(){res();}; }); }); }
    /* modifier un média sans le recréer (légende, ordre…) */
    function majMedia(id,patch){ return db().then(function(d){ return new Promise(function(res){
      var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id);
      g.onsuccess=function(){ var v=g.result; if(!v){ res(); return; }
        for(var k in patch) v[k]=patch[k];
        var u=os.put(v); u.onsuccess=function(){res();}; u.onerror=function(){res();}; };
      g.onerror=function(){res();}; }); }); }
  function setOrd(id,ord){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){v.ord=ord; os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
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

  /* ---- rendu de la section d'une étape ---- */
  function renderSection(el){
    var place=el.dataset.place, nom=el.dataset.nom||'', lat=el.dataset.lat, lng=el.dataset.lng;
    el.innerHTML=
      '<div class="cn-head">✏️ '+T('Carnet de l’étape')+' <span class="cn-priv">— '+T('privé tant que vous ne partagez pas')+'</span></div>'+
      '<textarea class="cn-note" placeholder="'+T('Un mot sur cette étape…')+'"></textarea>'+
      '<div class="cn-grid"></div>'+
      '<div class="cn-row"><button class="cn-btn cn-manage">🖼️ '+T('Gérer / ajouter médias')+'</button>'+
        '<button class="cn-btn cn-pc">🖼️ '+T('Carte postale')+'</button></div>'+
      (lat&&lng?'<a class="cn-maps" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+lat+','+lng+'">🧭 '+T('cette étape dans Maps')+'</a>':'')+
      '<div class="cn-note-priv">🔒 '+T('Vos médias restent sur votre téléphone tant que vous ne les avez pas partagés.')+'</div>';
    var ta=el.querySelector('.cn-note'); ta.value=note(place); ta.onchange=function(){ note(place,ta.value); };
    el.querySelector('.cn-manage').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-grid').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-pc').onclick=function(){ if(window.THEPostcard) THEPostcard.open({nom:nom,ville:el.dataset.ville||'',placeKey:place}); };
    grid(el.querySelector('.cn-grid'), place);
  }
  function grid(g,place){ getMedia(place).then(function(arr){
    g.innerHTML=arr.map(function(m){ var k=kind(m);
      if(k==='video') return '<div class="cn-th cn-vid">▶</div>';
      if(k==='audio') return '<div class="cn-th cn-aud">🎙️</div>';
      return '<div class="cn-th" style="background-image:url(\''+URL.createObjectURL(m.blob)+'\')"></div>'; }).join('')
      +'<div class="cn-th cn-addt">＋</div>';
  }); }

  /* ---- modale gestionnaire ---- */
  function modal(html){ var w=document.getElementById('cn-modal'); w.querySelector('.cn-box').innerHTML=html; w.classList.add('on'); }
  function closeModal(){ var w=document.getElementById('cn-modal'); if(w)w.classList.remove('on'); CUR=null; }
  var CUR=null;
  function openManager(place,nom){
    CUR={place:place,nom:nom};
    getMedia(place).then(function(arr){
      var list = arr.length ? arr.map(function(m,i){ var k=kind(m), url=URL.createObjectURL(m.blob);
        var media = k==='video'?'<video src="'+url+'" controls playsinline style="width:100%;border-radius:8px"></video>'
          : k==='audio'?'<audio src="'+url+'" controls style="width:100%"></audio>'
          : '<img src="'+url+'" style="width:100%;border-radius:8px">';
        /* UNE LÉGENDE PAR SOUVENIR — on pouvait écrire un mot sur l'étape, jamais
           sur la photo elle-même. Elle voyage avec le média : les sauvegardes
           l'emportent déjà, et la carte postale peut s'en servir. */
        return '<div class="cn-item">'+media+
          '<textarea class="cn-cap" data-cap="'+m.id+'" rows="2" placeholder="'+esc(T('Un mot sur ce souvenir…'))+'">'+esc(m.caption||'')+'</textarea>'+
          '<div class="cn-ctr">'+
          '<button '+(i===0?'disabled':'')+' data-mv="'+m.id+'" data-dir="-1" title="Monter">↑</button>'+
          '<button '+(i===arr.length-1?'disabled':'')+' data-mv="'+m.id+'" data-dir="1" title="Descendre">↓</button>'+
          '<button data-dl="'+m.id+'" title="'+esc(T('Enregistrer dans mes photos'))+'">⬇️ '+T('Enregistrer')+'</button>'+
          '<button class="cn-rm" data-del="'+m.id+'">🗑️ '+T('Supprimer')+'</button></div></div>'; }).join('')
        : '<div class="cn-empty">'+T('Aucun média pour l’instant. Ajoutez une photo, une vidéo ou un son ci-dessous.')+'</div>';
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>🖼️ '+T('Carnet')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-list">'+list+'</div>'+
        '<div class="cn-row" style="margin-top:12px">'+
          /* UN SEUL BOUTON : C'EST UN MÉDIA.
             Trois boutons séparés — photo, vidéo, son — obligeaient à savoir
             d'avance ce qu'on déposait, et le son ne pouvait qu'être enregistré,
             jamais importé. Un souvenir est un média : image, vidéo ou son, en
             autant d'exemplaires qu'on veut. La prise de vue garde son bouton
             (elle ouvre l'appareil), l'enregistrement aussi (il ouvre le micro). */
          '<label class="cn-btn">📎 '+T('Ajouter un média')+'<input type="file" accept="image/*,video/*,audio/*" multiple hidden data-add="media"></label>'+
          '<label class="cn-btn">📷 '+T('Prendre une photo')+'<input type="file" accept="image/*" capture="environment" multiple hidden data-add="image"></label>'+
          '<button class="cn-btn cn-rec">🎙️ '+T('Son')+'</button></div>'+
        '<p class="cn-tip">'+T('Photo, vidéo ou son — autant que vous voulez.')+'</p>'+
        '<p class="cn-tip">🔒 '+T('Vos médias restent sur votre téléphone tant que vous ne les avez pas partagés.')+'</p>'+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('Fermer')+'</button>');
      var w=document.getElementById('cn-modal');
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
      w.querySelectorAll('[data-add]').forEach(function(inp){ inp.onchange=function(e){
        var fs=e.target.files?[].slice.call(e.target.files):[];
        var indice=e.target.getAttribute('data-add');
        Promise.all(fs.map(function(f){ return addMedia(place, f.name, f, typeDu(f, indice)); }))
          .then(function(){ openManager(place,nom); refreshSections(place); });
        e.target.value='';                    // on peut redéposer le même fichier
      }; });
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
      w.querySelectorAll('[data-mv]').forEach(function(b){ b.onclick=function(){ moveItem(place,nom,+b.getAttribute('data-mv'),+b.getAttribute('data-dir')); }; });
      var rec=w.querySelector('.cn-rec'); if(rec)rec.onclick=function(){ recordAudio(place,nom); };
    });
  }
  function moveItem(place,nom,id,dir){ getMedia(place).then(function(arr){ var i=arr.findIndex(function(m){return m.id===id;}); var j=i+dir; if(i<0||j<0||j>=arr.length)return;
    var a=arr[i],b=arr[j], oa=a.ord||a.ts||0, ob=b.ord||b.ts||0; Promise.all([setOrd(a.id,ob),setOrd(b.id,oa)]).then(function(){ openManager(place,nom); refreshSections(place); }); }); }
  function recordAudio(place,nom){
    if(!navigator.mediaDevices||!window.MediaRecorder){ alert(T('Enregistrement audio non supporté sur cet appareil.')); return; }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      var mr=new MediaRecorder(stream), chunks=[]; mr.ondataavailable=function(e){ if(e.data&&e.data.size)chunks.push(e.data); };
      mr.onstop=function(){ stream.getTracks().forEach(function(t){t.stop();}); var blob=new Blob(chunks,{type:'audio/webm'}); addMedia(place,'son.webm',blob,'audio').then(function(){ openManager(place,nom); refreshSections(place); }); };
      modal('<h3>🎙️ '+T('Enregistrement…')+'</h3><p class="cn-tip">'+T('Parlez, puis arrêtez.')+'</p><button class="cn-close-b" id="cn-stop">⏹ '+T('Arrêter')+'</button>');
      document.getElementById('cn-stop').onclick=function(){ try{mr.stop();}catch(e){} };
      mr.start();
    }).catch(function(){ alert(T('Micro refusé ou indisponible.')); });
  }
  function refreshSections(place){ document.querySelectorAll('.the-carnet').forEach(function(el){ if(el.dataset.place===place) grid(el.querySelector('.cn-grid'), place); }); }

  function init(){
    var css='.the-carnet{margin-top:12px;background:#fffdf8;border:1px solid #e3d8c4;border-radius:10px;padding:12px}'
      +'.the-carnet .cn-head{font-family:Georgia,serif;font-weight:700;font-size:15px}.the-carnet .cn-priv{font-weight:400;color:#8a7c66;font-size:12px}'
      +'.the-carnet .cn-note{width:100%;min-height:54px;margin:8px 0;border:1px solid #ddd;border-radius:8px;padding:8px;font:inherit;font-size:14px}'
      +'.the-carnet .cn-grid{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}'
      +'.cn-th{width:54px;height:54px;border-radius:7px;background:#eee center/cover no-repeat;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:#a8884f}'
      +'.cn-th.cn-vid,.cn-th.cn-aud{background:#26201a;color:#f5ecd8}.cn-th.cn-addt{background:#f1e7d5;border:1px dashed #c9b896}'
      +'.the-carnet .cn-row{display:flex;gap:8px;flex-wrap:wrap}.cn-btn{flex:1;min-width:130px;padding:10px;border:1px solid #c9b896;border-radius:8px;background:#26201a;color:#f5ecd8;font:inherit;font-weight:600;font-size:13px;cursor:pointer;text-align:center}'
      +'.the-carnet .cn-pc{background:#14305c}.the-carnet .cn-maps{display:inline-block;margin-top:8px;color:#9a6a2e;text-decoration:underline;font-size:13px}'
      +'#cn-modal .cn-cap{width:100%;margin:6px 0 0;border:1px solid #e3d8c4;border-radius:7px;padding:7px;font:inherit;font-size:13.5px;background:#fffdf8;color:#4b3f2a}'
      +'.the-carnet .cn-note-priv{font-size:12px;color:#8a7c66;font-style:italic;margin-top:8px}'
      +'#cn-modal{position:fixed;inset:0;z-index:1450;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px}'
      +'#cn-modal.on{display:flex}#cn-modal .cn-box{background:#fffdf8;border-radius:14px;padding:16px;max-width:440px;width:100%;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
      +'#cn-modal .cn-x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:22px;cursor:pointer;color:#666}'
      +'#cn-modal h3{font-family:Georgia,serif;margin:0 0 10px}.cn-list{display:flex;flex-direction:column;gap:12px;max-height:50vh;overflow:auto}'
      +'.cn-item{border:1px solid #eee;border-radius:8px;padding:8px}.cn-ctr{display:flex;gap:6px;margin-top:6px}.cn-ctr button{border:1px solid #ccc;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer;font:inherit}.cn-ctr .cn-rm{margin-left:auto;color:#a3402a;border-color:#e0b8ac}'
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
  window.THECarnet={ open:openManager, close:closeModal, render:renderSection };
})();
