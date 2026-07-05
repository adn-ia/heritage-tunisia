/* THE — internationalisation (affichage multilingue).
   - Contenu des fiches : i18n/<lang>.json (clé = norm(nom) → carnet stable, noms en FR).
   - Interface : i18n/ui.<lang>.json + attributs data-i18n="clé" sur les éléments à traduire.
   - Sélecteur de langue « globe » discret, injecté dans #langSwitch.
   À inclure tôt : <script src="the-i18n.js"></script>. */
(function(){
  var LANGS={ fr:'🇫🇷 Français', en:'🇬🇧 English', it:'🇮🇹 Italiano', de:'🇩🇪 Deutsch', ar:'🇹🇳 العربية' };
  var CODE={ fr:'FR', en:'EN', it:'IT', de:'DE', ar:'ع' };
  var lang; try{ lang=localStorage.getItem('the_lang')||'fr'; }catch(e){ lang='fr'; }
  if(!LANGS[lang]) lang='fr';
  var DATA=null, UI=null;
  function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }

  if(lang==='ar') document.documentElement.setAttribute('dir','rtl');
  document.documentElement.setAttribute('lang', lang);

  // styles du sélecteur (injectés une fois)
  var css='#langSwitch{background:rgba(255,255,255,.15);color:#f6ecd8;border:1px solid rgba(255,255,255,.32);border-radius:999px;'
   +'padding:4px 10px;font-size:13px;font-family:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;outline:none;max-width:140px;}'
   +'#langSwitch:hover{background:rgba(255,255,255,.26);}'
   +'#langSwitch option{color:#2b2318;background:#fffdf8;}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  function wireSwitcher(){
    var sel=document.getElementById('langSwitch');
    if(sel && !sel._done && sel.tagName==='SELECT'){ sel._done=true; sel.innerHTML='';
      Object.keys(LANGS).forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=LANGS[k]; if(k===lang)o.selected=true; sel.appendChild(o); });
      sel.onchange=function(){ try{ localStorage.setItem('the_lang',sel.value); }catch(e){} location.reload(); };
    }
    // picker « drapeaux » de la page d'accueil (#langPick avec des [data-l])
    var pick=document.getElementById('langPick');
    if(pick && !pick._done){ pick._done=true;
      pick.querySelectorAll('[data-l]').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-l')===lang);
        b.onclick=function(){ try{ localStorage.setItem('the_lang', b.getAttribute('data-l')); }catch(e){} location.reload(); };
      });
    }
  }

  function applyUI(root){
    if(lang==='fr'||!UI) return;
    root=(root && root.querySelectorAll)?root:document.body; if(!root) return;   // robuste si appelé via un event
    // 1) éléments explicitement tagués
    root.querySelectorAll('[data-i18n]').forEach(function(el){ var k=el.getAttribute('data-i18n'); if(UI[k]) el.textContent=UI[k]; });
    // 2) balayage des nœuds de texte (interface statique : boutons, labels, options, hints…)
    try{
      var w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes=[], n;
      while(n=w.nextNode()) nodes.push(n);
      nodes.forEach(function(t){
        var raw=t.nodeValue, key=raw.replace(/ /g,' ').trim();
        if(key.length>1 && UI[key]) t.nodeValue=raw.replace(raw.trim(), UI[key]);
      });
      root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function(el){
        var k=(el.getAttribute('placeholder')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('placeholder',UI[k]); });
      root.querySelectorAll('[title]').forEach(function(el){
        var k=(el.getAttribute('title')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('title',UI[k]); });
    }catch(e){}
  }

  // chargement (contenu + interface) avant rendu
  var ready = (lang==='fr') ? Promise.resolve() : Promise.all([
    fetch('i18n/'+lang+'.json').then(function(r){return r.json();}).then(function(d){DATA=d;}).catch(function(){}),
    fetch('i18n/ui.'+lang+'.json').then(function(r){return r.json();}).then(function(d){UI=d;}).catch(function(){})
  ]);
  function startObserver(){
    if(lang==='fr'||!UI||!window.MutationObserver) return;
    try{
      var obs=new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){ var a=muts[i].addedNodes;
          for(var j=0;j<a.length;j++){ if(a[j].nodeType===1) applyUI(a[j]); } }
      });
      obs.observe(document.body,{childList:true,subtree:true});
    }catch(e){}
  }
  ready.then(function(){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){applyUI();startObserver();});
    else { applyUI(); startObserver(); }
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wireSwitcher); else wireSwitcher();

  window.THEi18n={
    lang:function(){return lang;}, ready:ready, isFr:function(){return lang==='fr';}, isRTL:function(){return lang==='ar';},
    LANGS:LANGS, set:function(l){ try{localStorage.setItem('the_lang',l);}catch(e){} location.reload(); },
    site:function(nom){ if(!DATA||!DATA.sites) return null; return DATA.sites[norm(nom)]||null; },
    cat:function(v){ if(!DATA||!DATA.cat||!v) return v; return DATA.cat[v]||v; },
    ui:function(k){ return (UI&&UI[k])||null; }, applyUI:applyUI,
    // chemin d'un JSON traduit (ex: data('tours') → 'i18n/tours.en.json' ou 'tours.json' en FR)
    data:function(base){ return lang==='fr' ? base+'.json' : 'i18n/'+base+'.'+lang+'.json'; }
  };
})();
