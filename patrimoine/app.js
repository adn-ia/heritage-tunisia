/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — rendu de la liste (sous-app autonome, aucune dépendance externe).
   Lit SA donnée exclusive (import INP) : liste + filtres (état, gouvernorat,
   recherche) + modale de fiche. Tout libellé passe par PATi18n (i18n propre).
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var CFG   = window.PAT || {};
  var PERIL = {}; (CFG.perilStates||[]).forEach(function(s){ PERIL[s]=1; });
  function T(k,v){ return window.PATi18n ? PATi18n.uiT(k,v) : k; }
  function nf(n){ try{ return Number(n).toLocaleString(PATi18n?PATi18n.lang():'fr'); }catch(e){ return ''+n; } }

  var SITES = [], CLASSES_COUNT = 0;
  var Q = '', GOV = '', ETAT = '', CLASSE = false;   // ETAT ∈ '', 'peril', 'moyen', 'bon' · CLASSE = classés INP seulement

  // état (donnée) → suffixe de clé i18n
  function slug(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
  function etatLabel(e){ return T('patrimoine.etat.'+(slug(e)||'inconnu')); }
  function etatClass(e){
    if(!e) return 'na';
    if(PERIL[e]) return 'peril';
    if(e==='Moyen') return 'moyen';
    if(e==='Bon'||e==='Mis en valeur') return 'bon';
    return 'na';
  }

  function matches(s){
    if(GOV && s.gov!==GOV) return false;
    if(ETAT && etatClass(s.etat)!==ETAT) return false;
    if(CLASSE && s.classe!=='Oui') return false;
    if(Q){ var q=Q.toLowerCase();
      if((s.nom||'').toLowerCase().indexOf(q)<0 && (s.localite||'').toLowerCase().indexOf(q)<0) return false; }
    return true;
  }

  function card(s){
    var ec = etatClass(s.etat);
    var el = document.createElement('div'); el.className = 'card '+ec;
    el.innerHTML = '<h3></h3><p class="loc"></p><div class="tags"><span class="tag etat '+ec+'"></span></div>';
    el.querySelector('h3').textContent = s.nom || '—';
    el.querySelector('.loc').textContent = [s.localite, s.gov].filter(Boolean).join(' · ');
    el.querySelector('.tag.etat').textContent = etatLabel(s.etat);
    if(s.classe==='Oui'){
      var t=document.createElement('span'); t.className='tag classe'; t.textContent=T('patrimoine.badge.classe');
      el.querySelector('.tags').appendChild(t);
    }
    el.addEventListener('click', function(){ openSheet(s); });
    return el;
  }

  function render(){
    var list = document.getElementById('list'); list.innerHTML='';
    var arr = SITES.filter(matches);
    var frag = document.createDocumentFragment();
    for(var i=0;i<arr.length;i++) frag.appendChild(card(arr[i]));
    list.appendChild(frag);
    document.getElementById('empty').style.display = arr.length ? 'none' : 'block';
    document.getElementById('count').textContent = T('patrimoine.compte', { n: nf(arr.length) });
  }

  function openSheet(s){
    var sheet = document.getElementById('sheet'), ec = etatClass(s.etat);
    var osm = 'https://www.openstreetmap.org/?mlat='+s.lat+'&mlon='+s.lon+'#map=15/'+s.lat+'/'+s.lon;
    function row(k,v){ return v ? '<div class="r"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>' : ''; }
    sheet.innerHTML =
      '<button class="close" aria-label="x">×</button>'+
      '<h2></h2>'+
      '<p class="sub"></p>'+
      '<div class="rows">'+
        row(T('patrimoine.fiche.gouvernorat'), esc(s.gov))+
        row(T('patrimoine.fiche.localite'), esc(s.localite))+
        row(T('patrimoine.fiche.etat'), '<span style="color:var(--'+(ec==='na'?'stone':ec)+')">'+esc(etatLabel(s.etat))+'</span>')+
        row(T('patrimoine.fiche.statut'), s.classe==='Oui'?T('patrimoine.fiche.classe.oui'):T('patrimoine.fiche.classe.non'))+
        row(T('patrimoine.fiche.coords'), (s.lat!=null?(s.lat.toFixed(5)+', '+s.lon.toFixed(5)):''))+
      '</div>'+
      '<a class="maplink" target="_blank" rel="noopener" href="'+osm+'"></a>'+
      '<a class="signaler" href="contribuer.html?nom='+encodeURIComponent(s.nom||'')+'&etat='+encodeURIComponent(s.etat||'')+'"></a>'+
      '<div class="soon"></div>'+
      '<p class="src"></p>';
    sheet.querySelector('h2').textContent = s.nom||'—';
    sheet.querySelector('.sub').textContent = [s.localite,s.gov].filter(Boolean).join(' · ');
    sheet.querySelector('.maplink').textContent = T('patrimoine.fiche.carte');
    sheet.querySelector('.signaler').textContent = T('patrimoine.fiche.signaler');
    sheet.querySelector('.soon').textContent = T('patrimoine.fiche.soon');
    sheet.querySelector('.src').textContent = T('patrimoine.fiche.source');
    sheet.querySelector('.close').addEventListener('click', closeSheet);
    document.getElementById('modal').classList.add('on');
  }
  function closeSheet(){ document.getElementById('modal').classList.remove('on'); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function buildFilters(){
    // gouvernorats présents dans la donnée
    var govs = {}; SITES.forEach(function(s){ if(s.gov) govs[s.gov]=1; });
    govs = Object.keys(govs).sort(function(a,b){ return a.localeCompare(b); });
    var fg = document.getElementById('fGov');
    fg.innerHTML = '<option value="">'+T('patrimoine.filtre.gov.tous')+'</option>' +
      govs.map(function(g){ return '<option value="'+esc(g)+'">'+esc(g)+'</option>'; }).join('');
    var fe = document.getElementById('fEtat');
    fe.innerHTML = [
      ['','patrimoine.filtre.etat.tous'],['peril','patrimoine.filtre.etat.peril'],
      ['moyen','patrimoine.filtre.etat.moyen'],['bon','patrimoine.filtre.etat.bon']
    ].map(function(o){ return '<option value="'+o[0]+'">'+T(o[1])+'</option>'; }).join('');
    fg.addEventListener('change', function(){ GOV=fg.value; render(); });
    fe.addEventListener('change', function(){ ETAT=fe.value; render(); });
    var fc=document.getElementById('fClasse');
    if(fc) fc.addEventListener('change', function(){ CLASSE=fc.checked; render(); });
    var q=document.getElementById('q'); var to;
    q.addEventListener('input', function(){ clearTimeout(to); to=setTimeout(function(){ Q=q.value.trim(); render(); },120); });
  }

  function buildStats(){
    var peril = SITES.filter(function(s){ return etatClass(s.etat)==='peril'; }).length;
    // Cohérent avec le filtre « classés » : on compte le drapeau FIABLE de la donnée site
    // (classe='Oui'), PAS inp_classes.json (liste séparée non reliée par nom → jointure non
    // fiable). Le lien classé sera affiné par la contribution (comme l'époque).
    var classes = SITES.filter(function(s){ return s.classe==='Oui'; }).length;
    var st = document.getElementById('stats');
    function item(cls,n,key){ return '<span class="s '+cls+'"><b>'+nf(n)+'</b><span>'+T(key)+'</span></span>'; }
    st.innerHTML = item('', SITES.length, 'patrimoine.stat.sites')
      + item('peril', peril, 'patrimoine.stat.peril')
      + item('', classes, 'patrimoine.stat.classes');
  }

  function buildLangSw(){
    var sw=document.getElementById('langSw'); if(!sw||!window.PATi18n) return;
    (PATi18n.langs||[]).forEach(function(l){
      var b=document.createElement('button'); b.textContent=l.toUpperCase();
      if(l===PATi18n.lang()) b.className='on';
      b.addEventListener('click', function(){ PATi18n.setLang(l); });
      sw.appendChild(b);
    });
  }

  function loadData(){
    var pSites = fetch(CFG.dataSites).then(function(r){ return r.json(); }).then(function(j){
      SITES = (Array.isArray(j)?j:(j.features?j.features.map(function(f){ return f.properties; }):[])) || [];
    });
    var pClasses = fetch(CFG.dataClasses).then(function(r){ return r.json(); }).then(function(j){
      CLASSES_COUNT = Array.isArray(j)?j.length:0;
    }).catch(function(){ CLASSES_COUNT=0; });
    return Promise.all([pSites, pClasses]);
  }

  // fermer la modale au clic sur le fond
  document.addEventListener('click', function(e){
    var m=document.getElementById('modal'); if(e.target===m) closeSheet();
  });

  // sélection courante (filtrée) + description des filtres, pour l'export
  function filterText(){
    var p=[];
    if(ETAT) p.push(T('patrimoine.filtre.etat.'+ETAT));
    if(GOV)  p.push(GOV);
    if(Q)    p.push('« '+Q+' »');
    return p.join(' · ');
  }
  window.PATData = {
    current: function(){ return SITES.filter(matches); },
    all:     function(){ return SITES; },
    etatClass: etatClass, etatLabel: etatLabel, filterText: filterText
  };

  function start(){
    buildLangSw();
    loadData().then(function(){
      document.getElementById('loading').style.display='none';
      buildStats(); buildFilters(); render();
      if(window.PATExport) PATExport.wire();
    }).catch(function(err){
      document.getElementById('loading').textContent = 'Erreur de chargement.';
    });
  }

  if(window.PATi18n){ PATi18n.boot().then(start); }
  else { document.addEventListener('DOMContentLoaded', start); }
})();
