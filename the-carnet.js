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
  function setOrd(id,ord){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){v.ord=ord; os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
  function note(place,val){ try{ if(val==null) return localStorage.getItem('the-note-'+place)||''; localStorage.setItem('the-note-'+place,val); }catch(e){ return ''; } }
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
        return '<div class="cn-item">'+media+'<div class="cn-ctr">'+
          '<button '+(i===0?'disabled':'')+' data-mv="'+m.id+'" data-dir="-1" title="Monter">↑</button>'+
          '<button '+(i===arr.length-1?'disabled':'')+' data-mv="'+m.id+'" data-dir="1" title="Descendre">↓</button>'+
          '<button class="cn-rm" data-del="'+m.id+'">🗑️ '+T('Supprimer')+'</button></div></div>'; }).join('')
        : '<div class="cn-empty">'+T('Aucun média pour l’instant. Ajoutez une photo, une vidéo ou un son ci-dessous.')+'</div>';
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>🖼️ '+T('Carnet')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-list">'+list+'</div>'+
        '<div class="cn-row" style="margin-top:12px">'+
          '<label class="cn-btn">📷 '+T('Photo')+'<input type="file" accept="image/*" capture="environment" multiple hidden data-add="image"></label>'+
          '<label class="cn-btn">🎥 '+T('Vidéo')+'<input type="file" accept="video/*" capture="environment" hidden data-add="video"></label>'+
          '<button class="cn-btn cn-rec">🎙️ '+T('Son')+'</button></div>'+
        '<p class="cn-tip">🔒 '+T('Vos médias restent sur votre téléphone tant que vous ne les avez pas partagés.')+'</p>'+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('Fermer')+'</button>');
      var w=document.getElementById('cn-modal');
      arr.forEach(function(){});
      w.querySelectorAll('[data-add]').forEach(function(inp){ inp.onchange=function(e){ var fs=e.target.files?[].slice.call(e.target.files):[]; Promise.all(fs.map(function(f){return addMedia(place,f.name,f,e.target.getAttribute('data-add'));})).then(function(){ openManager(place,nom); refreshSections(place); }); }; });
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
