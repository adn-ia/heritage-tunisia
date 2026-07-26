/* THE — pied de page commun : copyright Threshold-Analytics, statut du passe, mise à jour.
   À inclure en bas de page : <script src="the-footer.js" defer></script>
   (remplace l'enregistrement inline du service worker). */
(function(){
  // ---------- config par édition (liens stores ; VIDE = badge masqué) ----------
  var APPSTORE_URL  = '';   // ex. MHE : https://apps.apple.com/app/…/id…
  var PLAYSTORE_URL = '';   // rempli seulement quand publié sur Google Play

  // ---------- styles (injectés une fois) ----------
  var css = ''
   + '#the-footer{margin-top:36px;padding:18px 16px 26px;border-top:1px solid rgba(140,120,90,.25);'
   + '  display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;font-family:inherit;}'
   + '#the-footer .thf-in{display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;}'
   + '#the-footer .thf-logo{height:34px;width:auto;background:#fff;border-radius:7px;padding:5px 8px;box-shadow:0 2px 8px rgba(43,35,24,.12);}'
   + '#the-footer .thf-txt{font-size:12.5px;line-height:1.5;color:#6b5e49;text-align:left;}'
   + '#the-footer .thf-sub{font-size:11.5px;color:#8a7c66;}'
   + '#the-footer a{color:#9a6a2e;text-decoration:underline;cursor:pointer;}'
   + '#the-update{display:none;align-items:center;gap:10px;background:#2b2318;color:#f5ecd8;'
   + '  padding:8px 14px;border-radius:999px;font-size:13px;box-shadow:0 4px 14px rgba(43,35,24,.3);}'
   + '#the-update button{background:#d8a24a;color:#2b2318;border:0;border-radius:999px;padding:5px 12px;font-weight:700;cursor:pointer;}'
   + '#the-footer .thf-dl{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:4px;}'
   + '#the-footer .thf-dl img{height:40px;width:auto;}'
   + '#the-footer .thf-dl a.thf-txtlink{font-size:12.5px;color:#9a6a2e;text-decoration:underline;}'
   + '@media(max-width:480px){#the-footer .thf-txt{text-align:center;}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  function passInfo(){
    if(window.THEPass) return window.THEPass.info();                 // pages app : module présent
    try{ if(localStorage.getItem('the_premium')==='1') return {active:true,plan:'démo',daysLeft:null}; }catch(e){}
    try{ var p=JSON.parse(localStorage.getItem('the_pass')||'null');
      if(p && p.expires && p.expires>Date.now()) return {active:true,plan:p.plan,daysLeft:Math.max(0,Math.ceil((p.expires-Date.now())/86400000))}; }catch(e){}
    return {active:false};
  }

  function renderPassStatus(){
    var el=document.getElementById('thf-pass'); if(!el) return;
    var i=passInfo();
    if(i.active){
      var lbl='✦ Passe actif'+(i.plan && i.plan!=='démo' ? ' ('+i.plan+(i.daysLeft!=null?', '+i.daysLeft+' j':'')+')' : '');
      el.innerHTML=lbl+' · <a id="thf-reset">revenir au gratuit (test)</a>';
      var r=document.getElementById('thf-reset');
      if(r) r.onclick=function(){ try{ localStorage.removeItem('the_premium'); localStorage.removeItem('the_pass'); }catch(e){} location.reload(); };
    } else {
      el.textContent='Version gratuite';
    }
  }

  // ---------- « Télécharger l'app » : UNIQUEMENT en navigateur web ----------
  // App installée (PWA standalone / wrapper iOS / TWA android) → aucun bloc, aucun lien store.
  function _installed(){
    try{
      if(window.matchMedia && matchMedia('(display-mode: standalone)').matches) return true;
      if(navigator.standalone===true) return true;                                  // iOS PWA
      if((document.referrer||'').indexOf('android-app://')===0) return true;         // wrapper Android
    }catch(e){}
    return false;
  }
  // iOS (identique au garde donation) : sur iOS on ne montre JAMAIS de badge ni Google Play.
  function _ios(){
    var u=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(u) || ((/Mac/.test(u)||navigator.platform==='MacIntel'||navigator.platform==='iPad') && (navigator.maxTouchPoints>1||'ontouchend' in document));
  }
  function _lang(){ try{ return (window.THEi18n&&THEi18n.lang())||document.documentElement.lang||'fr'; }catch(e){ return 'fr'; } }
  function downloadHTML(){
    if(_installed()) return '';                       // app installée → RIEN
    var l=_lang();
    if(_ios()){                                       // iOS web : lien TEXTE App Store seulement (jamais Play, jamais badge)
      if(!APPSTORE_URL) return '';
      var t={en:'Available on the App Store',it:'Disponibile su App Store',de:'Im App Store verfügbar',ar:'متوفّر على App Store'}[l]||'Disponible sur l’App Store';
      return '<div class="thf-dl"><a class="thf-txtlink" href="'+APPSTORE_URL+'" target="_blank" rel="noopener">'+t+'</a></div>';
    }
    // Navigateur web non-iOS : badges officiels selon les URLs renseignées.
    var loc ={fr:'fr-fr',it:'it-it',de:'de-de',ar:'ar-sa'}[l]||'en-us';
    var gl  ={fr:'fr_fr',it:'it_it',de:'de_de',ar:'ar'}[l]||'en_us';
    var glg ={fr:'fr',it:'it',de:'de',ar:'ar'}[l]||'en';
    var h='';
    if(APPSTORE_URL)  h+='<a href="'+APPSTORE_URL+'" target="_blank" rel="noopener"><img loading="lazy" alt="Download on the App Store" src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/'+loc+'?size=250x83"></a>';
    if(PLAYSTORE_URL) h+='<a href="'+PLAYSTORE_URL+'" target="_blank" rel="noopener"><img loading="lazy" alt="Get it on Google Play" src="https://play.google.com/intl/'+gl+'/badges/static/images/badges/'+glg+'_badge_web_generic.png"></a>';
    return h?'<div class="thf-dl">'+h+'</div>':'';
  }

  function buildFooter(){
    if(document.getElementById('the-footer')) return;
    if(document.body && document.body.hasAttribute('data-nofooter')) return;
    var f=document.createElement('footer'); f.id='the-footer';
    f.innerHTML =
      '<div class="thf-in">'
        +'<img src="logo-threshold.png" alt="Threshold-Analytics" class="thf-logo" loading="lazy">'
        +'<div class="thf-txt">Édité par <b>Threshold-Analytics</b> · © 2026 — Tous droits réservés.'
          +'<br><span class="thf-sub">'+((window.HConf&&HConf.marque)||'Heritage Experience')+' · <a href="sources-credits.html">Sources &amp; crédits</a> · <span id="thf-pass"></span></span></div>'
      +'</div>'
      + downloadHTML()
      +'<div id="the-update"><span>🔄 Nouvelle version disponible</span><button type="button" id="thf-upd-btn">Mettre à jour</button></div>';
    document.body.appendChild(f);
    var b=document.getElementById('thf-upd-btn'); if(b) b.onclick=function(){ location.reload(); };
    renderPassStatus();
  }

  function showUpdate(){ var u=document.getElementById('the-update'); if(u) u.style.display='inline-flex'; }

  // ---------- service worker + détection de mise à jour ----------
  if('serviceWorker' in navigator){
    var _theRefreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){ if(_theRefreshing) return; _theRefreshing=true; window.location.reload(); });
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('sw.js').then(function(reg){
        reg.update();
        setInterval(function(){ reg.update(); }, 60*60*1000);   // re-vérifie chaque heure
        reg.addEventListener('updatefound', function(){
          var nw=reg.installing; if(!nw) return;
          nw.addEventListener('statechange', function(){
            if(nw.state==='installed' && navigator.serviceWorker.controller) showUpdate();
          });
        });
      }).catch(function(){});
    });
  }

  if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', buildFooter);
  else buildFooter();
})();
