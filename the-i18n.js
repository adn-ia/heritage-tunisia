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
  // « UN FICHIER, UN PAYS » — interpolation à l'exécution : les libellés ui.*.json peuvent
  // contenir des tokens (__MARQUE__, __MARQUE_COURTE__, __PAYS__, __PAYS_MAJ__, __LE_PAYS__,
  // __PAYS_DE__) remplis depuis HConf → le CODE reste générique, seul heritage.config.js change.
  // Porté du socle (HERITAGE-SOCLE/the-i18n.js) — même comportement, mêmes noms de tokens.
  function _pick(v){ if(v && typeof v==='object') return v[lang]||v.fr||v.en||''; return v||''; }
  function fillStr(s){
    if(typeof s!=='string' || s.indexOf('__')<0) return s;
    var H=window.HConf||{}, pays=_pick(H.pays);
    return s.replace(/__MARQUE_MARK__/g,   H.marqueMark||H.marque||'')
            .replace(/__MARQUE_COURTE__/g, H.marqueCourte||'')
            .replace(/__MARQUE__/g,        H.marque||'')
            .replace(/__PAYS_DE__/g,       (_pick(H.paysDe)|| ('de '+pays)))
            .replace(/__LE_PAYS__/g,       (_pick(H.paysLe)|| pays))
            .replace(/__PAYS_MAJ__/g,      (pays||'').toLocaleUpperCase())
            .replace(/__PAYS__/g,          pays);
  }
  function fillAll(o){ if(o) for(var k in o){ if(typeof o[k]==='string') o[k]=fillStr(o[k]); } return o; }

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
    if(!UI) return;   // FR inclus dès qu'un ui.fr.json est présent (aligné socle) ; sinon UI=null → no-op (pages FR inchangées)
    root=(root && root.querySelectorAll)?root:document.body; if(!root) return;   // robuste si appelé via un event
    // 1) éléments explicitement tagués (clés abstraites — méthode socle, zéro texte en dur)
    root.querySelectorAll('[data-i18n]').forEach(function(el){ var k=el.getAttribute('data-i18n'); if(UI[k]) el.textContent=UI[k]; });
    root.querySelectorAll('[data-i18n-html]').forEach(function(el){ var k=el.getAttribute('data-i18n-html'); if(UI[k]) el.innerHTML=UI[k]; });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){ var k=el.getAttribute('data-i18n-placeholder'); if(UI[k]) el.setAttribute('placeholder',UI[k]); });
    root.querySelectorAll('[data-i18n-title]').forEach(function(el){ var k=el.getAttribute('data-i18n-title'); if(UI[k]) el.setAttribute('title',UI[k]); });
    root.querySelectorAll('[data-i18n-aria]').forEach(function(el){ var k=el.getAttribute('data-i18n-aria'); if(UI[k]) el.setAttribute('aria-label',UI[k]); });
    root.querySelectorAll('[data-i18n-alt]').forEach(function(el){ var k=el.getAttribute('data-i18n-alt'); if(UI[k]) el.setAttribute('alt',UI[k]); });
    try{ var _t=document.querySelector('title[data-i18n]'); if(_t){ var _k=_t.getAttribute('data-i18n'); if(UI[_k]) document.title=UI[_k]; } }catch(e){}
    // 2) balayage des nœuds de texte (interface statique : boutons, labels, options, hints…)
    try{
      var w=document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes=[], n;
      while(n=w.nextNode()) nodes.push(n);
      nodes.forEach(function(t){
        var raw=t.nodeValue, key=raw.replace(/ /g,' ').trim();
        if(key.length>1 && UI[key]) t.nodeValue=raw.replace(raw.trim(), UI[key]);
        ['Description :','Données :','Photo :','Source —','Source :'].forEach(function(pre){ if(t.nodeValue.indexOf(pre)>=0 && UI[pre]) t.nodeValue=t.nodeValue.split(pre).join(UI[pre]); });
      });
      root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function(el){
        var k=(el.getAttribute('placeholder')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('placeholder',UI[k]); });
      root.querySelectorAll('[title]').forEach(function(el){
        var k=(el.getAttribute('title')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('title',UI[k]); });
    }catch(e){}
    try{ if(document.title){ document.title=document.title.split(/\s+[\u2014\u2013]\s+/).map(function(p){var k=p.replace(/\u00a0/g,' ').trim(); return UI[k]||p;}).join(' \u2014 '); } }catch(e){}
  }

  // chargement (contenu + interface) avant rendu — ui.<lang>.json chargé pour TOUTES les langues (FR inclus).
  // Le contenu des fiches (i18n/<lang>.json) reste FR-source (pas de fr.json).
  var ready = Promise.all([
    (lang==='fr') ? Promise.resolve() : fetch('i18n/'+lang+'.json').then(function(r){return r.json();}).then(function(d){DATA=d;}).catch(function(){}),
    fetch('i18n/ui.'+lang+'.json').then(function(r){return r.json();}).then(function(d){UI=fillAll(d);}).catch(function(){})
  ]);
  function startObserver(){
    if(!UI||!window.MutationObserver) return;
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
