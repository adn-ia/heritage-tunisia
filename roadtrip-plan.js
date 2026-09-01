/* ============================================================
   GREFFE « RoadTrip — planificateur MANUEL » sur l'itinéraire Heritage
   Donne à l'utilisateur la main que le générateur ne donne pas :
     LOT 1  RÉORDONNER (monter/descendre) · INTERCALER à une position
            (lieux sourcés OU adresse OpenStreetMap) · RETIRER
     LOT 2  DATE par étape (calendrier)
     LOT 3  BASE + VISITES : définir une base, y ajouter des visites,
            retirer une visite, transformer base ↔ étape
     LOT 4  RECALAGE GPS d'un arrêt (poser sa vraie position)
   Persistance : l'ORDRE vit dans LASTRES.route (déjà sérialisé par
   l'autosave the_current / les enregistrements the_saved). Les métadonnées
   par étape (date, rôle base/visite, coord recalée) vivent dans UN seul
   objet localStorage « the_plan_meta », indexé par placeKey(lieu) — stable
   au réordonnancement et au rechargement. Aucune dépendance Firebase.
   Lit les globales : LASTRES, LASTORIGIN, render, haversine, norm, SITES,
   placeKey. Tout texte visible passe par uiT() (règle : 0 texte en dur).
   ============================================================ */
(function () {
  /* i18n EMBARQUÉ (module autonome : indépendant du système i18n de l'app → marche sur THE & Estonia) */
  var DICO = {"plan.monter": {"fr": "Monter", "en": "Move up", "et": "Üles", "it": "Su", "de": "Nach oben", "ar": "أعلى"}, "plan.descendre": {"fr": "Descendre", "en": "Move down", "et": "Alla", "it": "Giù", "de": "Nach unten", "ar": "أسفل"}, "plan.retirer": {"fr": "Retirer cette étape", "en": "Remove this stop", "et": "Eemalda see etapp", "it": "Rimuovi questa tappa", "de": "Diesen Halt entfernen", "ar": "إزالة هذه المحطة"}, "plan.inserer.ici": {"fr": "Ajouter une étape ici", "en": "Add a stop here", "et": "Lisa etapp siia", "it": "Aggiungi una tappa qui", "de": "Hier einen Halt hinzufügen", "ar": "أضف محطة هنا"}, "plan.chercher.placeholder": {"fr": "Chercher un lieu ou une adresse…", "en": "Search a place or address…", "et": "Otsi kohta või aadressi…", "it": "Cerca un luogo o un indirizzo…", "de": "Ort oder Adresse suchen…", "ar": "ابحث عن مكان أو عنوان…"}, "plan.chercher": {"fr": "Chercher", "en": "Search", "et": "Otsi", "it": "Cerca", "de": "Suchen", "ar": "بحث"}, "plan.insert.hint": {"fr": "Un lieu sourcé, ou une adresse via OpenStreetMap.", "en": "A sourced place, or an address via OpenStreetMap.", "et": "Allikaga koht või aadress OpenStreetMapi kaudu.", "it": "Un luogo documentato o un indirizzo tramite OpenStreetMap.", "de": "Ein belegter Ort oder eine Adresse über OpenStreetMap.", "ar": "مكان موثّق أو عنوان عبر OpenStreetMap."}, "plan.ou.adresse": {"fr": "Ou une adresse ci-dessous.", "en": "Or an address below.", "et": "Või aadress allpool.", "it": "Oppure un indirizzo qui sotto.", "de": "Oder eine Adresse unten.", "ar": "أو عنوان أدناه."}, "plan.recherche.adresse": {"fr": "Recherche d’adresse…", "en": "Searching address…", "et": "Aadressi otsimine…", "it": "Ricerca indirizzo…", "de": "Adresssuche…", "ar": "البحث عن عنوان…"}, "plan.adresse.osm": {"fr": "Adresse · OpenStreetMap", "en": "Address · OpenStreetMap", "et": "Aadress · OpenStreetMap", "it": "Indirizzo · OpenStreetMap", "de": "Adresse · OpenStreetMap", "ar": "عنوان · OpenStreetMap"}, "plan.aucun.resultat": {"fr": "Aucun lieu trouvé.", "en": "No place found.", "et": "Kohta ei leitud.", "it": "Nessun luogo trovato.", "de": "Kein Ort gefunden.", "ar": "لم يُعثر على مكان."}, "plan.etape.ajoutee": {"fr": "Étape ajoutée à votre itinéraire.", "en": "Stop added to your itinerary.", "et": "Etapp lisatud teie teekonda.", "it": "Tappa aggiunta al tuo itinerario.", "de": "Halt zu Ihrer Route hinzugefügt.", "ar": "تمت إضافة المحطة إلى مسارك."}, "plan.lieu.ajoute": {"fr": "Lieu ajouté", "en": "Added place", "et": "Lisatud koht", "it": "Luogo aggiunto", "de": "Ort hinzugefügt", "ar": "تمت إضافة المكان"}, "plan.gardez.une.etape": {"fr": "Gardez au moins une étape.", "en": "Keep at least one stop.", "et": "Jätke vähemalt üks etapp.", "it": "Mantieni almeno una tappa.", "de": "Behalten Sie mindestens einen Halt.", "ar": "احتفظ بمحطة واحدة على الأقل."}, "plan.quand": {"fr": "Quand ?", "en": "When?", "et": "Millal?", "it": "Quando?", "de": "Wann?", "ar": "متى؟"}, "plan.definir.base": {"fr": "Définir comme base (séjour)", "en": "Set as a base (stay)", "et": "Määra baasiks (peatus)", "it": "Imposta come base (soggiorno)", "de": "Als Basis festlegen (Aufenthalt)", "ar": "تعيين كقاعدة (إقامة)"}, "plan.retirer.base": {"fr": "Redevenir une étape", "en": "Back to a normal stop", "et": "Tagasi tavaliseks etapiks", "it": "Torna a essere una tappa", "de": "Wieder zum Halt machen", "ar": "العودة إلى محطة"}, "plan.base.badge": {"fr": "Base", "en": "Base", "et": "Baas", "it": "Base", "de": "Basis", "ar": "قاعدة"}, "plan.visite.badge": {"fr": "Visite", "en": "Visit", "et": "Külastus", "it": "Visita", "de": "Besuch", "ar": "زيارة"}, "plan.detacher.visite": {"fr": "Détacher de la base", "en": "Detach from base", "et": "Eralda baasist", "it": "Stacca dalla base", "de": "Von der Basis lösen", "ar": "فصل عن القاعدة"}, "plan.ajouter.visite": {"fr": "Une visite depuis cette base", "en": "A visit from this base", "et": "Külastus sellest baasist", "it": "Una visita da questa base", "de": "Ein Besuch von dieser Basis", "ar": "زيارة من هذه القاعدة"}, "plan.recaler.gps": {"fr": "Recaler ma position ici", "en": "Set my GPS position here", "et": "Määra siia minu GPS-asukoht", "it": "Aggiorna la mia posizione qui", "de": "Meine Position hier setzen", "ar": "ضبط موقعي هنا"}, "plan.gps.en.cours": {"fr": "Localisation…", "en": "Locating…", "et": "Asukoha määramine…", "it": "Localizzazione…", "de": "Ortung…", "ar": "تحديد الموقع…"}, "plan.gps.refuse": {"fr": "Position GPS indisponible.", "en": "GPS position unavailable.", "et": "GPS-asukoht pole saadaval.", "it": "Posizione GPS non disponibile.", "de": "GPS-Position nicht verfügbar.", "ar": "موقع GPS غير متاح."}, "plan.gps.recale": {"fr": "Position mise à jour.", "en": "Position updated.", "et": "Asukoht uuendatud.", "it": "Posizione aggiornata.", "de": "Position aktualisiert.", "ar": "تم تحديث الموقع."}, "rt.fermer": {"fr": "Fermer", "en": "Close", "et": "Sulge", "it": "Chiudi", "de": "Schließen", "ar": "إغلاق"}, "plan.modifier": {"fr": "Modifier", "en": "Edit", "et": "Muuda", "it": "Modifica", "de": "Bearbeiten", "ar": "تعديل"}, "plan.visites.titre": {"fr": "Visites depuis cette étape", "en": "Visits from this stop", "et": "Külastused sellest peatusest", "it": "Visite da questa tappa", "de": "Ausflüge von diesem Halt", "ar": "زيارات من هذه المحطة"}, "plan.visites.aucune": {"fr": "aucune pour l'instant", "en": "none yet", "et": "veel ühtegi", "it": "nessuna per ora", "de": "noch keine", "ar": "لا شيء حتى الآن"}};
  function T(k, v) {
    var lang = (window.THEi18n && THEi18n.lang && THEi18n.lang()) || 'fr';
    var row = DICO[k];
    var s = row ? (row[lang] || row.fr || k) : k;
    if (v) for (var p in v) { s = s.split('{'+p+'}').join(v[p]); }
    return s;
  }
  function xe(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function nrm(s){ return (typeof norm==="function")?norm(s):String(s||"").toLowerCase(); }
  function hav(a,b){ return (typeof haversine==="function")?haversine(a,b):0; }
  function haveRoute(){ return (typeof LASTRES!=="undefined") && LASTRES && LASTRES.route && LASTRES.route.length; }
  /* Une étape peut arriver SANS coordonnée — un lien reçu porte c:null quand le
     lieu n'est pas dans la base. toFixed levait alors une exception, et comme
     pkey() est appelée dès la première ligne de la boucle de décoration, TOUT
     sautait : gestes, dates, visites et liens d'insertion compris. */
  function pkey(s){ try{
    if(!s || !s.p) return "";
    var c=s.c;
    if(!Array.isArray(c) || !isFinite(c[0]) || !isFinite(c[1])) return nrm(s.p.nom||"");
    return (typeof placeKey==="function") ? placeKey(s) : (nrm(s.p.nom)+"@"+c[0].toFixed(4)+","+c[1].toFixed(4));
  }catch(e){ return nrm(s&&s.p&&s.p.nom)||""; } }

  /* --- métadonnées par étape (date, rôle, coord recalée) --- */
  var META_KEY="the_plan_meta";
  function metaAll(){ try{ return JSON.parse(localStorage.getItem(META_KEY)||"{}"); }catch(e){ return {}; } }
  function metaSave(o){ try{ localStorage.setItem(META_KEY, JSON.stringify(o)); }catch(e){} }
  function metaFor(s){ var m=metaAll(); return m[pkey(s)]||{}; }
  function metaPatch(s, patch){ var m=metaAll(), k=pkey(s); m[k]=Object.assign(m[k]||{}, patch); metaSave(m); }
  function metaMove(oldKey, newKey){ var m=metaAll(); if(m[oldKey]){ m[newKey]=Object.assign(m[newKey]||{}, m[oldKey]); delete m[oldKey]; metaSave(m); } }

  /* --- styles (injectés une fois) --- */
  /* un menu ouvert se referme dès qu'on touche ailleurs */
  document.addEventListener("click", function(){
    [].forEach.call(document.querySelectorAll(".rtp-menu.on"), function(x){ x.classList.remove("on"); });
  });
  function rtpFermerMenus(){}

  function css(){
    if(document.getElementById("rtp-css")) return;
    var s=document.createElement("style"); s.id="rtp-css";
    s.textContent=
      ".rtp-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px;}"+".rtp-actions .rtp-pb,.rtp-actions .rtp-mb{border:1px solid var(--line,#e3d8c4);background:#fff;color:#6b5a39;  border-radius:7px;width:46px;min-width:46px;height:46px;display:inline-flex;align-items:center;justify-content:center;padding:0;font:inherit;font-size:19px;line-height:1;cursor:pointer;}"+/* Le bouton d'un geste en icône : carré, lisible, et surtout ASSEZ GRAND. Une cible de 24 px est intouchable au doigt — Apple demande 44, et le dépannage §1a garde la trace du bouton qu'on croyait mort et qui était seulement trop petit. */".rtp-actions .rtp-ib{border:1px solid var(--line,#e3d8c4);background:#fff;border-radius:7px;width:46px;min-width:46px;height:46px;display:inline-flex;align-items:center;justify-content:center;font-size:19px;line-height:1;padding:0;cursor:pointer;}"+".rtp-menu{position:relative;display:inline-block;}"+".rtp-pop{display:none;position:absolute;right:0;bottom:calc(100% + 6px);z-index:60;background:#fffdf8;  border:1px solid var(--line,#e3d8c4);border-radius:9px;box-shadow:0 8px 26px rgba(0,0,0,.16);  min-width:214px;padding:5px;}"+".rtp-menu.on .rtp-pop{display:block;}"+".rtp-pop button{display:block;width:100%;text-align:left;border:none;background:none;font:inherit;  font-size:14px;color:#6b5a39;padding:9px 11px;border-radius:6px;cursor:pointer;}"+".rtp-pop button:hover{background:#f6efe2;}"+".rtp-pop button.danger{color:#a4442f;}"+".rtp-visits{margin-top:10px;border-top:1px solid #efe7d8;padding-top:8px;}"+".rtp-visits>summary{cursor:pointer;font-size:14px;color:#8a7c66;list-style:none;}"+".rtp-visits>summary::-webkit-details-marker{display:none}"+".rtp-visits-in{padding:8px 0 2px;}"+".rtp-visit-item{font-size:14px;color:#6b5a39;padding:3px 0;}"+".rtp-addvisit{margin-top:6px;border:1px solid var(--line,#e3d8c4);background:#fff;color:#6b5a39;  border-radius:7px;padding:8px 12px;font:inherit;font-size:14px;cursor:pointer;}"+
      "  width:32px;height:30px;line-height:1;cursor:pointer;font-size:14px;font-family:inherit;padding:0;transition:.12s;}"+
      ".rtp-daterow{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:13px;color:var(--stone,#8a7c66);}"+
      ".rtp-daterow input{font-family:inherit;font-size:14px;border:1px solid var(--line,#e3d8c4);border-radius:6px;padding:5px 8px;background:#fff;color:var(--ink,#2b2318);}"+
      ".rtp-ins{display:flex;justify-content:center;margin:-4px 0 12px;}"+
      ".rtp-ins>button{border:1px dashed var(--gold-soft,#c9ad79);background:#fdf8ee;color:#8a6d3a;border-radius:16px;"+
      "  padding:4px 14px;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.12s;}"+
      ".rtp-ins>button:hover{background:#f7edd6;}"+
      ".rtp-addvisit{margin:2px 0 10px;}"+
      ".rtp-addvisit button{border:1px solid var(--gold,#a8884f);background:#fff;color:#8a6d3a;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:13.5px;cursor:pointer;}"+
      ".rtp-addvisit button:hover{background:#faf5ea;}"+
      ".stop.rtp-base{border-left:4px solid var(--gold,#a8884f);}"+
      ".stop.rtp-visit{margin-left:20px;border-left:3px solid var(--gold-soft,#c9ad79);}"+
      ".rtp-role{display:inline-block;font-size:11px;letter-spacing:.5px;border-radius:4px;padding:1px 8px;margin-left:6px;vertical-align:middle;}"+
      ".rtp-role.base{background:var(--gold,#a8884f);color:#fff;}"+
      ".rtp-role.visit{background:#efe6d2;color:#8a6d3a;border:1px solid var(--gold-soft,#c9ad79);}"+
      ".rtp-panel{background:var(--paper,#fffdf8);border:1px solid var(--line,#e3d8c4);border-radius:10px;"+
      "  padding:12px;margin:0 0 12px;box-shadow:0 6px 20px rgba(0,0,0,.14);}"+
      ".rtp-panel .rtp-row{display:flex;gap:8px;}"+
      ".rtp-panel input{flex:1;padding:10px 12px;font-family:inherit;font-size:15px;border:1px solid var(--line,#e3d8c4);border-radius:6px;background:#fff;color:var(--ink,#2b2318);}"+
      ".rtp-panel .rtp-go{border:none;background:var(--ink,#2b2318);color:var(--ivory,#f6f0e4);border-radius:6px;padding:0 16px;font-family:inherit;font-weight:600;cursor:pointer;}"+
      ".rtp-panel .rtp-x{border:1px solid var(--line,#e3d8c4);background:#fff;color:var(--stone,#8a7c66);border-radius:6px;padding:0 12px;cursor:pointer;font-family:inherit;}"+
      ".rtp-res{margin-top:8px;display:flex;flex-direction:column;gap:5px;max-height:230px;overflow:auto;}"+
      ".rtp-res button{text-align:left;border:1px solid var(--line,#e3d8c4);background:#fff;border-radius:7px;padding:8px 11px;"+
      "  font-family:inherit;font-size:14px;color:var(--ink,#2b2318);cursor:pointer;}"+
      ".rtp-res button:hover{background:#f6f0e4;border-color:var(--gold-soft,#c9ad79);}"+
      ".rtp-res button small{display:block;color:var(--stone,#8a7c66);font-size:12px;margin-top:1px;}"+
      ".rtp-msg{font-size:12.5px;color:var(--stone,#8a7c66);margin-top:7px;}";
    document.head.appendChild(s);
  }

  /* --- mutations de l'ordre (source de vérité = LASTRES.route) --- */
  function recompute(){
    if(!haveRoute()) return;
    var prev=(typeof LASTORIGIN!=="undefined"&&LASTORIGIN)?LASTORIGIN.coord:LASTRES.route[0].c;
    LASTRES.route.forEach(function(s){ s.fromPrev=hav(prev,s.c); prev=s.c; });
  }
  function rerender(){ if(typeof render==="function") render(LASTORIGIN, LASTRES); }

  function moveStep(i, dir){
    if(!haveRoute()) return;
    var r=LASTRES.route, j=i+dir;
    if(j<0||j>=r.length) return;
    var t=r[i]; r[i]=r[j]; r[j]=t;
    LASTRES.manualOrder=true;
    recompute(); rerender();
  }
  function dropStep(i){
    if(!haveRoute()) return;
    if(typeof removeStep==="function"){ removeStep(i); return; }   // garde-fous + i18n du moteur
    if(LASTRES.route.length<=1){ alert(T("plan.gardez.une.etape")); return; }
    LASTRES.route.splice(i,1); recompute(); rerender();
  }
  function insertAt(idx, stop, meta){
    if(!haveRoute() && !(typeof LASTRES!=="undefined"&&LASTRES)) return;
    if(!LASTRES.route) LASTRES.route=[];
    idx=Math.max(0, Math.min(idx, LASTRES.route.length));
    LASTRES.route.splice(idx, 0, stop);
    if(meta) metaPatch(stop, meta);
    LASTRES.manualOrder=true;
    recompute(); rerender();
  }
  window.__planMove=moveStep; window.__planDrop=dropStep; window.__planInsertAt=insertAt;

  /* --- date par étape --- */
  function setDate(i, val){
    if(!haveRoute()) return;
    metaPatch(LASTRES.route[i], {date: val||""});
    rerender();
  }
  function setHeure(i, val){
    if(!window.LASTRES || !LASTRES.route || !LASTRES.route[i]) return;
    metaPatch(LASTRES.route[i], {heure: val||""});
  }

  /* --- rôle base / visite / normal --- */
  function role(s){ return (metaFor(s).kind)||""; }
  function toggleBase(i){
    if(!haveRoute()) return;
    var s=LASTRES.route[i], cur=role(s);
    metaPatch(s, {kind: cur==="base" ? "" : "base", baseKey:""});
    rerender();
  }
  function detachVisit(i){           // visite -> étape normale
    if(!haveRoute()) return;
    metaPatch(LASTRES.route[i], {kind:"", baseKey:""});
    rerender();
  }

  /* --- recalage GPS d'un arrêt --- */
  function getPos(){ return new Promise(function(res,rej){
    if(!navigator.geolocation) return rej();
    navigator.geolocation.getCurrentPosition(function(p){ res([p.coords.longitude,p.coords.latitude]); }, rej, {enableHighAccuracy:true,timeout:15000,maximumAge:4000});
  }); }
  function recalGPS(i){
    if(!haveRoute()) return;
    var s=LASTRES.route[i], oldKey=pkey(s);
    if(typeof showGuide==="function") showGuide(T("plan.gps.en.cours"), 4000);
    getPos().then(function(c){
      s.c=[c[0],c[1]];
      metaMove(oldKey, pkey(s));            // la métadonnée suit le lieu recalé
      recompute(); rerender();
      if(typeof showGuide==="function") showGuide(T("plan.gps.recale"), 5000);
    }).catch(function(){ alert(T("plan.gps.refuse")); });
  }

  /* --- construction d'une étape « manuelle » --- */
  function stopFromSite(site){ return { p:site.p, c:site.c.slice(), genre:site.genre||"", layer:site.layer||"histoire" }; }
  function stopFromAddress(lon, lat, label){
    return { c:[lon,lat], layer:"perso", genre:"perso",
      p:{ nom:label||T("plan.lieu.ajoute"), type:"", region:"", "région":"", description:"",
          source:"OpenStreetMap", a_voir:"", conseil:"" } };
  }

  /* --- recherche pour intercaler : lieux sourcés puis adresse OSM --- */
  function searchSites(q){
    if(typeof SITES==="undefined"||!SITES) return [];
    var nq=nrm(q); if(!nq) return [];
    var out=[];
    for(var i=0;i<SITES.length && out.length<8;i++){
      var s=SITES[i]; if(!s||!s.p) continue;
      if(nrm(s.p.nom).indexOf(nq)>=0) out.push(s);
    }
    return out;
  }
  function geocode(q){
    var _iso=(window.HConf&&HConf.iso)||"";
    return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes="+_iso+"&q="+encodeURIComponent(q),
      {headers:{"Accept":"application/json"}}).then(function(r){return r.json();}).catch(function(){return [];});
  }

  /* --- panneau d'insertion (intercaler OU visite depuis une base) --- */
  function openInsert(idx, insBtn, visitMeta){
    var existing=document.getElementById("rtp-panel"); if(existing) existing.remove();
    var panel=document.createElement("div"); panel.id="rtp-panel"; panel.className="rtp-panel";
    panel.innerHTML=
      '<div class="rtp-row">'+
        '<input id="rtp-q" type="text" autocomplete="off" placeholder="'+xe(T("plan.chercher.placeholder"))+'">'+
        '<button class="rtp-go" id="rtp-search" type="button">'+xe(T("plan.chercher"))+'</button>'+
        '<button class="rtp-x" id="rtp-cancel" type="button" aria-label="'+xe(T("rt.fermer"))+'">✕</button>'+
      '</div>'+
      '<div class="rtp-res" id="rtp-res"></div>'+
      '<div class="rtp-msg" id="rtp-msg">'+xe(T("plan.insert.hint"))+'</div>';
    insBtn.parentNode.insertBefore(panel, insBtn.nextSibling);
    var q=panel.querySelector("#rtp-q"), res=panel.querySelector("#rtp-res"), msg=panel.querySelector("#rtp-msg");
    q.focus();

    function pick(stop){ panel.remove(); insertAt(idx, stop, visitMeta||null); if(typeof showGuide==="function") showGuide(T("plan.etape.ajoutee"),6000); }
    function renderSites(){
      var arr=searchSites(q.value); res.innerHTML="";
      arr.forEach(function(s){
        var b=document.createElement("button"); b.type="button";
        var meta=[s.p.region, (window.THEi18n&&!THEi18n.isFr()&&THEi18n.cat)?THEi18n.cat(s.p.type):s.p.type].filter(Boolean).join(" · ");
        b.innerHTML=xe(s.p.nom)+(meta?"<small>"+xe(meta)+"</small>":"");
        b.onclick=function(){ pick(stopFromSite(s)); };
        res.appendChild(b);
      });
      return arr.length;
    }
    function runSearch(){
      var n=renderSites();
      msg.textContent = n ? T("plan.ou.adresse") : T("plan.recherche.adresse");
      geocode(q.value).then(function(list){
        (list||[]).forEach(function(x){
          var b=document.createElement("button"); b.type="button";
          var name=String(x.display_name||"").split(",").slice(0,3).join(", ");
          b.innerHTML="📍 "+xe(name)+"<small>"+xe(T("plan.adresse.osm"))+"</small>";
          b.onclick=function(){ pick(stopFromAddress(Number(x.lon), Number(x.lat), name.split(",")[0])); };
          res.appendChild(b);
        });
        if(!res.children.length) msg.textContent=T("plan.aucun.resultat");
      });
    }
    panel.querySelector("#rtp-search").onclick=runSearch;
    panel.querySelector("#rtp-cancel").onclick=function(){ panel.remove(); };
    q.onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } };
    q.oninput=function(){ if(q.value.trim().length>=2) renderSites(); };
  }

  /* --- injection des contrôles dans chaque carte étape --- */
  function inject(){
    if(!haveRoute()) return;
    var stopsWrap=document.getElementById("stops"); if(!stopsWrap) return;
    var cards=stopsWrap.querySelectorAll(":scope > .stop");
    if(!cards.length) return;
    css();
    var route=LASTRES.route;

    cards.forEach(function(card, i){
      var s=route[i]; if(!s) return;
      /* CEINTURE : une carte qui échoue ne doit pas emporter les suivantes.
         C'est exactement ce qui s'est produit — une insertion DOM invalide sur la
         première carte laissait les deux autres nues, sans gestes ni liens. */
      try{
      var r=role(s), md=metaFor(s);

      // rôle : classes + badge
      card.classList.toggle("rtp-base", r==="base");
      card.classList.toggle("rtp-visit", r==="visite");
      if(!card.querySelector(".rtp-role")){
        var nm=card.querySelector(".nm");
        if(nm && r){ var badge=document.createElement("span"); badge.className="rtp-role "+(r==="base"?"base":"visit");
          badge.textContent = r==="base" ? T("plan.base.badge") : T("plan.visite.badge"); nm.appendChild(badge); }
      }

      /* 1) UNE SEULE RANGÉE D'ACTIONS, comme dans le RoadTrip
         La carte recevait une barre d'icônes muettes (▲▼⚓📍🗑) posée par ce
         module, PLUS des boutons posés par la page : deux décorateurs pour une
         même carte, d'où l'éparpillement. Ici on reproduit la carte du
         RoadTrip : les gestes rares vivent dans un menu « Modifier », les
         gestes fréquents restent en clair. La page dépose les siens dans la
         même rangée via THEactionsEtape, au lieu d'en créer une autre. */
      if(!card.querySelector(".rtp-actions")){
        var row=document.createElement("div"); row.className="rtp-actions";

        var wrap=document.createElement("span"); wrap.className="rtp-menu";
        var mb=document.createElement("button"); mb.type="button"; mb.className="rtp-mb";
        mb.textContent="✏️"; mb.title=T("plan.modifier"); mb.setAttribute("aria-label", T("plan.modifier"));
        var pop=document.createElement("span"); pop.className="rtp-pop";
        wrap.appendChild(mb); wrap.appendChild(pop);

        function item(txt, fn, danger){
          var b=document.createElement("button"); b.type="button";
          b.textContent=txt; if(danger) b.className="danger";
          b.onclick=function(ev){ ev.stopPropagation(); wrap.classList.remove("on"); fn(); };
          pop.appendChild(b); return b;
        }
        mb.onclick=function(ev){
          ev.stopPropagation();
          var ouvert=wrap.classList.contains("on");
          [].forEach.call(document.querySelectorAll(".rtp-menu.on"), function(x){ x.classList.remove("on"); });
          if(!ouvert){
            wrap.classList.add("on");
            /* IL DOIT RESTER DANS L'ÉCRAN — 01/09/2026, Helmy : « le crayon
               cliquable en bas de chaque étape ouvre sa modale hors écran ».
               Le menu s'ouvre vers le haut ; sur une étape haute dans la page il
               sort par le dessus. On le mesure APRÈS l'avoir montré — avant, il
               n'a pas de taille — et on le bascule vers le bas s'il ne tient pas.
               Même chose à droite si le bouton est près du bord. */
            /* ⚠️ LA PREMIÈRE CORRECTION NE SUFFISAIT PAS — 02/09/2026, Helmy :
               « la modale du crayon sur chaque étape apparaît hors écran, on avait
               déjà corrigé ça, ça recommence ». Elle basculait vers le bas quand le
               haut manquait — SANS vérifier que ça tenait en bas, et sans borner la
               hauteur. Ce menu fait 358 px pour neuf entrées : en paysage sur un
               téléphone, aucun des deux côtés ne l'accueille, et il sortait quoi
               qu'on fasse. C'est le défaut qui a valu le rejet 2.1(a) sur le ✕ d'une
               fiche, à l'identique.
               On choisit maintenant le côté qui a le PLUS de place, on borne la
               hauteur à cette place, et le menu défile en lui-même s'il le faut. */
            try{
              pop.style.bottom=''; pop.style.top=''; pop.style.left=''; pop.style.right='';
              pop.style.maxHeight=''; pop.style.overflowY='';
              var MARGE=10;
              var rb=mb.getBoundingClientRect();
              var dessus  = rb.top - MARGE;                        // place au-dessus
              var dessous = window.innerHeight - rb.bottom - MARGE; // place au-dessous
              var h = pop.getBoundingClientRect().height;

              if(h <= dessus){
                /* il tient au-dessus : c'est sa place d'origine, on n'y touche pas */
              } else if(h <= dessous || dessous > dessus){
                pop.style.bottom='auto'; pop.style.top='calc(100% + 6px)';
                if(h > dessous){ pop.style.maxHeight=Math.max(120,dessous)+'px'; pop.style.overflowY='auto'; }
              } else {
                pop.style.maxHeight=Math.max(120,dessus)+'px'; pop.style.overflowY='auto';
              }

              /* et jamais hors des bords latéraux */
              var r2=pop.getBoundingClientRect();
              if(r2.right > window.innerWidth - 8){ pop.style.left='auto'; pop.style.right='0'; }
              r2=pop.getBoundingClientRect();
              if(r2.left < 8){ pop.style.right='auto'; pop.style.left='0'; }
            }catch(e){}
          }
        };

        /* Les actions de la PAGE (éditer, météo, partager…) : elle les décrit,
           elle les exécute ; le module ne fait que leur donner leur place. */
        var hote = (window.THEactionsEtape || []);
        var icones = [];   // posés APRÈS « Modifier » — voir plus bas
        hote.forEach(function(a){
          if(!a || typeof a.run!=="function") return;
          var lib = (typeof a.label==="function") ? a.label() : (a.label||"");
          if(a.principal){
            var pb=document.createElement("button"); pb.type="button"; pb.className="rtp-pb";
            pb.textContent=lib;
            (function(idx){ pb.onclick=function(){ a.run(idx); }; })(i);
            row.appendChild(pb);
          } else {
            (function(idx){ item(lib, function(){ a.run(idx); }); })(i);
            /* ── UN GESTE PEUT DEMANDER SA PLACE SUR LA CARTE, EN ICÔNE ────────
               La page déclare `icone` ; le module la pose dans la rangée, sans
               savoir de quel geste il s'agit — il place, il ne décide pas.
               Le geste RESTE dans le menu ci-dessus : on ne le déplace pas, on
               le rend atteignable en un doigt.
               ⚠️ Le libellé complet part en `aria-label` : une icône seule est
               muette pour une synthèse vocale. `title` ne suffit pas sur mobile. */
            if(a.icone){
              (function(idx){
                var ib=document.createElement("button"); ib.type="button"; ib.className="rtp-ib";
                ib.textContent=a.icone; ib.title=lib; ib.setAttribute("aria-label", lib);
                ib.onclick=function(){ a.run(idx); };
                /* ⚠️ PAS POSÉ ICI. Helmy, 31/08/2026 : « tout à fait à droite de
                   Modifier, le plus à droite possible ». Dans la boucle, il se
                   retrouvait AVANT le menu. On le réserve.
                   ⚠️ ET SA TAILLE SE RÈGLE ICI, EN LIGNE — PAS DANS LE CSS.
                   Le 31/08 j'ai voulu modifier la règle `.rtp-ib` : tout le CSS de
                   ce fichier tient sur UNE seule ligne, et le remplacement a emporté
                   `.rtp-menu` et `.rtp-pop` avec elle. Le JavaScript restait valide,
                   `node --check` passait — mais le menu « Modifier » ne se repliait
                   plus et la carte éclatait. On ne retouche plus cette ligne. */
                ib.style.minWidth='0'; ib.style.minHeight='0';
                ib.style.display='inline-block';
                ib.style.padding='8px 12px';      // exactement `.rtp-pb` / `.rtp-mb`
                ib.style.fontSize='16px';         // le glyphe seul se lit moins qu'un mot
                ib.style.lineHeight='1.15';
                icones.push(ib);
              })(i);
            }
          }
        });

        if(i>0)              item("↑ "+T("plan.monter"),    function(){ moveStep(i,-1); });
        if(i<cards.length-1) item("↓ "+T("plan.descendre"), function(){ moveStep(i,1); });
        item("⚓ "+T(r==="base"?"plan.retirer.base":"plan.definir.base"), function(){ toggleBase(i); });
        if(r==="visite") item("⤴ "+T("plan.detacher.visite"), function(){ detachVisit(i); });
        item("📍 "+T("plan.recaler.gps"), function(){ recalGPS(i); });
        item("🗑 "+T("plan.retirer"), function(){ dropStep(i); }, true);

        row.appendChild(wrap);
        /* Les gestes en icône ferment la rangée, APRÈS « Modifier ». Le premier reçoit
           `margin-left:auto` : dans une rangée en flex, c'est ce qui le pousse contre le
           bord droit — « le plus à droite possible ». */
        icones.forEach(function(ib, n){ if(n===0) ib.style.marginLeft='auto'; row.appendChild(ib); });
        card.appendChild(row);
      }

      // 2) date par étape (une seule fois)
      if(!card.querySelector(".rtp-daterow")){
        var drow=document.createElement("div"); drow.className="rtp-daterow";
        /* Date ET heure : une halte se note parfois sur le moment, parfois le soir.
           Les deux vivent dans la MÊME métadonnée d'étape que le reste — jamais
           dans un second endroit de stockage. */
        /* ── LA DATE SE PRÉSENTE REMPLIE, PAS VIDE ────────────────────────────
           Helmy, 30/08/2026 : « le rendu de la date est mauvais — juste mettre la
           date de création et l'heure, et laisser cliquable pour changer. »
           Les deux champs s'affichaient VIDES : rien ne disait quand l'étape avait
           été posée, et il fallait tout saisir pour obtenir une information que
           l'application avait déjà. On les pré-remplit avec la date de création.

           ⚠️ ON NE REMPLACE PAS LES CHAMPS PAR DU TEXTE. Ils sont déjà cliquables :
           les changer en libellé retirerait la saisie directe et obligerait à passer
           par un écran de plus. C'est le RENDU qui était mauvais, pas la saisie.

           ⚠️ HEURE LOCALE, JAMAIS `toISOString()`. Celle-ci rend de l'UTC : en
           Tunisie comme en Belgique l'heure affichée aurait été fausse d'une à deux
           heures. On découpe à la main, comme `rtLocalISO` chez Terralog
           (`RoadTrip-Generique/blocs/05-dates.js:64`).

           ⚠️ AUCUNE DATE INVENTÉE : une étape enregistrée avant ce jour n'a pas de
           date de création. Les champs restent alors vides, comme avant. */
        var _cree = (s && +s.cree) || 0;
        var _p = function(n){ return (n<10?'0':'')+n; };
        var _dCree = _cree ? new Date(_cree) : null;
        var _dateDef = md.date || (_dCree ? (_dCree.getFullYear()+'-'+_p(_dCree.getMonth()+1)+'-'+_p(_dCree.getDate())) : "");
        var _heureDef = md.heure || (_dCree ? (_p(_dCree.getHours())+':'+_p(_dCree.getMinutes())) : "");
        drow.innerHTML='<span>📅 '+xe(T("plan.quand"))+'</span>'
          + '<input type="date" data-rtp-date value="'+xe(_dateDef)+'">'
          + '<input type="time" data-rtp-heure value="'+xe(_heureDef)+'">';
        /* La date se lit avec le nom de l'étape, comme le sous-titre d'une carte de
           RoadTrip : elle se place juste après lui. On insère chez SON parent —
           le nom est niché dans l'en-tête, donc son voisin n'est pas un enfant de
           la carte. L'oublier levait une erreur qui tuait toute la décoration :
           plus de liens « ajouter ici », plus de visites, et une seule carte
           garnie sur trois. Une seule ligne fautive, tout le reste emporté. */
        var nomEl=card.querySelector(".nm");
        var hote=nomEl && nomEl.parentNode;
        if(hote) hote.insertBefore(drow, nomEl.nextSibling);
        else card.insertBefore(drow, card.firstChild);
        drow.querySelector("[data-rtp-date]").onchange=function(e){ setDate(i, e.target.value); };
        drow.querySelector("[data-rtp-heure]").onchange=function(e){ setHeure(i, e.target.value); };
      }

      /* 3) LES VISITES DE CETTE ÉTAPE, dans une section repliable de SA carte
         — exactement la section « Visites depuis cette base » du RoadTrip. Le
         bouton d'ajout vit DEDANS : on ne peut plus se demander à quelle étape
         il se rapporte. */
      if(r!=="visite" && !card.querySelector(".rtp-visits")){
        var mesVis=(route||[]).filter(function(x){ return metaFor(x).baseKey===pkey(s); });
        var det=document.createElement("details"); det.className="rtp-visits";
        var som=document.createElement("summary");
        som.textContent="📍 "+T("plan.visites.titre")
          + (mesVis.length ? " ("+mesVis.length+")" : " — "+T("plan.visites.aucune"));
        det.appendChild(som);
        var dedans=document.createElement("div"); dedans.className="rtp-visits-in";
        mesVis.forEach(function(v){
          var li=document.createElement("div"); li.className="rtp-visit-item";
          li.textContent="• "+v.p.nom; dedans.appendChild(li);
        });
        var avb=document.createElement("button"); avb.type="button"; avb.className="rtp-addvisit";
        avb.textContent="➕ "+T("plan.ajouter.visite");
        (function(baseStop, pos){ avb.onclick=function(){
          if(role(baseStop)!=="base") metaPatch(baseStop, {kind:"base", baseKey:""});
          ouvrirSaisie(pos, {kind:"visite", baseKey:pkey(baseStop)}, avb); }; })(s, i);
        dedans.appendChild(avb);
        det.appendChild(dedans);
        card.appendChild(det);
      }
      }catch(errCarte){}          // voir la ceinture ci-dessus
    });

    /* 4) « AJOUTER UNE ÉTAPE ICI », ENTRE DEUX ÉTAPES
       Descendre tout en bas pour insérer au milieu du parcours ne se lit pas.
       Le lien se pose donc là où l'étape ira. Il n'ouvre PAS un second écran :
       c'est le même que « Ajouter une étape », à qui il transmet seulement la
       position à laquelle il est ancré. */
    cards.forEach(function(card, i){
      var apres=card.nextElementSibling;
      if(apres && apres.classList && apres.classList.contains("rtp-ins")) return;
      var ins=document.createElement("div"); ins.className="rtp-ins";
      var b=document.createElement("button"); b.type="button";
      b.textContent="＋ "+T("plan.inserer.ici");
      (function(pos, node){ b.onclick=function(){ ouvrirSaisie(pos, null, node); }; })(i, ins);
      ins.appendChild(b);
      card.parentNode.insertBefore(ins, card.nextSibling);
    });
    /* et un pour ouvrir le parcours, avant la première étape */
    if(cards.length){
      var avant=cards[0].previousElementSibling;
      if(!(avant && avant.classList && avant.classList.contains("rtp-ins"))){
        var ins0=document.createElement("div"); ins0.className="rtp-ins";
        var b0=document.createElement("button"); b0.type="button";
        b0.textContent="＋ "+T("plan.inserer.ici");
        b0.onclick=function(){ ouvrirSaisie(-1, null, ins0); };
        ins0.appendChild(b0);
        cards[0].parentNode.insertBefore(ins0, cards[0]);
      }
    }
  }

  /* Un seul écran de saisie d'étape pour toute l'application.
     apres = -1 pour « au début », sinon l'indice de l'étape qu'on suit.
     meta = {kind:"visite", baseKey} quand l'étape naît comme visite. */
  function ouvrirSaisie(apres, meta, noeud){
    if(!window.THEetape || !THEetape.ouvrir){
      openInsert(apres+1, noeud, meta||null);      // la brique n'est pas là : ancien panneau
      return;
    }
    window.__rtpMetaEnAttente = meta || null;
    var route=(window.LASTRES && LASTRES.route) || [];
    THEetape.ouvrir({ premiere:false, apres:apres,
      etapes: route.map(function(s){ return {nom:s.p.nom}; }) });
  }
  /* L'hôte insère l'étape, puis nous demande d'y coller son rôle. */
  window.__planAppliquerMetaEnAttente = function(stop){
    var m=window.__rtpMetaEnAttente; window.__rtpMetaEnAttente=null;
    if(!m || !stop) return;
    try{ metaPatch(stop, m); }catch(e){}
  };

  /* --- patch de render : ré-injecte après chaque rendu --- */
  if(typeof render==="function"){
    var _render=render;
    render=function(o, r){
      _render(o, r);
      setTimeout(inject, 340);   // après roadtrip-plus (300ms)
    };
  }
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(inject, 900); });
})();
