/* the-lightbox.js — clic sur une photo → visionneuse plein écran.
   Zoom (clic), navigation ‹ ›, et par photo : ⬇️ enregistrer · 📤 partager · 🖨️ imprimer.
   100% local, rien envoyé. Délégué : marche sur album, carnet, fiches, découvrir.
   À inclure : <script src="the-lightbox.js" defer></script> */
(function(){
  function T(fr){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr; }catch(e){ return fr; } }
  var GAL='.album-ph,.pic,.cn-grid,.cn-media,.dep-photos,.pp-media,figure,.photo-grid,.pgrid,.sm-photos,.album-doc';
  var ov, imgEl, cur=[], idx=0, zoom=false;

  function build(){
    var css=document.createElement('style');
    css.textContent='#lbx{position:fixed;inset:0;z-index:100000;background:rgba(8,10,12,.95);display:none;align-items:center;justify-content:center}'
    +'#lbx.on{display:flex}'
    +'#lbx .lbx-img{max-width:94vw;max-height:82vh;object-fit:contain;border-radius:6px;box-shadow:0 12px 44px rgba(0,0,0,.6);cursor:zoom-in;transition:transform .15s ease}'
    +'#lbx .lbx-img.z{cursor:zoom-out;transform:scale(2)}'
    +'#lbx .rb{position:absolute;background:rgba(255,255,255,.13);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:22px;cursor:pointer;display:grid;place-items:center}'
    +'#lbx .lbx-x{top:14px;right:14px}'
    +'#lbx .nav{top:50%;transform:translateY(-50%);width:50px;height:50px;font-size:30px}'
    +'#lbx .prev{left:10px}#lbx .next{right:10px}'
    +'#lbx .tools{position:absolute;bottom:18px;left:0;right:0;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:0 12px}'
    +'#lbx .tools button{background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:22px;padding:10px 16px;font:inherit;font-size:14px;cursor:pointer}'
    +'#lbx .tools button:active{background:rgba(255,255,255,.28)}';
    document.head.appendChild(css);
    ov=document.createElement('div'); ov.id='lbx';
    ov.innerHTML='<button class="rb lbx-x" aria-label="Fermer">✕</button>'
    +'<button class="rb nav prev" aria-label="Précédent">‹</button>'
    +'<button class="rb nav next" aria-label="Suivant">›</button>'
    +'<img class="lbx-img" alt="">'
    +'<div class="tools"><button data-a="dl">⬇️ '+T('Enregistrer')+'</button>'
    +'<button data-a="share">📤 '+T('Partager')+'</button>'
    +'<button data-a="print">🖨️ '+T('Imprimer')+'</button></div>';
    document.body.appendChild(ov);
    imgEl=ov.querySelector('.lbx-img');
    ov.querySelector('.lbx-x').onclick=close;
    ov.querySelector('.prev').onclick=function(e){ e.stopPropagation(); go(-1); };
    ov.querySelector('.next').onclick=function(e){ e.stopPropagation(); go(1); };
    ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
    imgEl.addEventListener('click',function(e){ e.stopPropagation(); zoom=!zoom; imgEl.classList.toggle('z',zoom); });
    ov.querySelector('.tools').addEventListener('click',function(e){ var b=e.target.closest('button'); if(b){ e.stopPropagation(); action(b.dataset.a);} });
    document.addEventListener('keydown',function(e){ if(!ov||!ov.classList.contains('on')) return; if(e.key==='Escape')close(); else if(e.key==='ArrowLeft')go(-1); else if(e.key==='ArrowRight')go(1); });
  }
  function openLb(list,i){ if(!ov) build(); cur=list; idx=i; render(); ov.classList.add('on'); document.documentElement.style.overflow='hidden'; }
  function render(){ zoom=false; imgEl.classList.remove('z'); imgEl.src=cur[idx].currentSrc||cur[idx].src;
    var multi=cur.length>1; ov.querySelector('.prev').style.display=multi?'grid':'none'; ov.querySelector('.next').style.display=multi?'grid':'none'; }
  function go(d){ idx=(idx+d+cur.length)%cur.length; render(); }
  function close(){ ov.classList.remove('on'); document.documentElement.style.overflow=''; }

  function srcToFile(src){ return fetch(src).then(function(r){return r.blob();}).then(function(b){ return new File([b],'photo.jpg',{type:b.type||'image/jpeg'}); }); }
  function action(a){
    var src=imgEl.src;
    if(a==='dl'){ var x=document.createElement('a'); x.href=src; x.download='photo-'+(idx+1)+'.jpg'; document.body.appendChild(x); x.click(); x.remove(); }
    else if(a==='share'){
      srcToFile(src).then(function(f){
        if(navigator.canShare && navigator.canShare({files:[f]})) return navigator.share({files:[f]});
        if(navigator.share) return navigator.share({url:src});
        alert(T('Partage non disponible sur cet appareil.'));
      }).catch(function(){});
    }
    else if(a==='print'){ var w=window.open('','_blank'); if(w){ w.document.write('<html><head><title>Photo</title></head><body style="margin:0;text-align:center"><img src="'+src+'" style="max-width:100%" onload="window.focus();window.print()"></body></html>'); w.document.close(); } }
  }

  document.addEventListener('click',function(e){
    var t=e.target;
    if(!t || t.tagName!=='IMG') return;
    if(t.closest('#lbx,.topbar,.langtog,.bar,.album-bar,button,a')) return;   // ignorer UI / logos / liens
    var box=t.closest(GAL);
    if(!box && t.getBoundingClientRect().width<70) return;                    // petit = icône
    var list = box ? [].slice.call(box.querySelectorAll('img')) : [t];
    var i=list.indexOf(t); if(i<0){ list=[t]; i=0; }
    e.preventDefault(); openLb(list,i);
  }, true);
})();
