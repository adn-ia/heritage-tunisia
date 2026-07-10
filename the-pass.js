/* THE — module « passe » (freemium daté).
   Gère l'activation, la DURÉE (7 / 30 j) et l'EXPIRATION du passe.
   Règle d'or : à l'expiration, le passe se désactive MAIS aucune donnée
   créée par l'utilisateur (itinéraires, carnet) n'est touchée — jamais.

   ┌─ À BRANCHER PLUS TARD (Lemon Squeezy) ─────────────────────────────┐
   │ Colle ici les 2 liens de paiement (checkout) de tes produits.      │
   │ Tant qu'ils sont vides, le bouton fait une ACTIVATION DÉMO locale  │
   │ (pratique pour tester). Dès qu'une URL est renseignée, le bouton   │
   │ redirige vers le vrai paiement.                                    │
   │ Au retour, configure l'URL de redirection de Lemon Squeezy vers :  │
   │   https://TON-SITE/itineraire.html?pass=semaine   (ou ?pass=mois)  │
   │ (ou laisse le succès LS + le plan en attente faire le travail).    │
   └────────────────────────────────────────────────────────────────────┘ */
(function(){
  var KEY='the_pass';
  var DAYS={ semaine:7, mois:30 };
  var PRICE={ semaine:'4,90 €', mois:'9,90 €' };
  /* ═══ L'INTERRUPTEUR UNIQUE ═══ Tant que ces 2 liens sont VIDES : freemium, premium
     en « Bientôt », rien à vendre, pourboire = simple don. Dès que tu colles tes URLs
     Lemon Squeezy : le premium se vend (payé → tout) ET le pourboire offre une option. */
  var CHECKOUT={ semaine:'', mois:'' };   // ← Helmy : colle tes 2 URLs Lemon Squeezy ici
  function premiumLive(){ return !!(CHECKOUT.semaine||CHECKOUT.mois); }
  var DAY=86400000;

  /* ─── Accès offert « code » (déverrouille le FULL premium, même en freemium) ─
     La personne saisit un CODE (ou ouvre ?code=<code>). Aucun e-mail ici : on ne
     stocke que les empreintes SHA-256 des codes ; on compare le hash du code reçu.
     Correspondance code→personne = doc privé de Helmy, hors app. Durée ~10 ans. */
  var INVITE_HASHES=[
    '05784113a6edb6b845007d07f3f3b5547ee521bdb69d3910957a9686ec210801',
    'ddcfce828248f7108fab7bb31035c9e81f1fc526dfbd25a156989dd475db2fba',
    '12b912a8a9cb23d2b58acaf25d862418c6c84507bed7488ba3abcc3c4b8d231f',
    '963ee0a0a02206e629aa0a130e6c714124fc2631962eab1022fb1fc628400841',
    'dc13d4b56e727172f74149f609c8d2e766d37bd6fa7d500a089798bf9da1c616',
    '9a092543451108404b24f874a2614727587605b20ee00492630d8cb179d7b1b2',
    '97d3ae72020e6fb7cfc405c3a4f53c72e3ca934eff408ba54a907a2360ac2390',
    '4191812577dcff713e36ae2b1ed8272756c36c03c2fdb96644f6fd5695f9eb21',
    '9543e8d702b8a64c1414b6bcedb9ba7cc522644cce32a47f183919d81fe702f4',
    '58333aea61f2343b92278aa1181e7099a09c5209c0843e1e7fffb3e005ee2cb8'
  ];
  var INVITE_KEY='the_invite';
  function inviteRead(){ try{ return JSON.parse(localStorage.getItem(INVITE_KEY)||'null'); }catch(e){ return null; } }
  function inviteActive(){ var i=inviteRead(); return !!(i && i.exp && i.exp>Date.now()); }
  function sha256hex(str){
    try{ var buf=new TextEncoder().encode(str);
      return crypto.subtle.digest('SHA-256', buf).then(function(h){
        return Array.prototype.map.call(new Uint8Array(h), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); });
    }catch(e){ return Promise.resolve(''); }
  }
  function redeem(code){
    var c=String(code||'').trim().toUpperCase();
    return sha256hex(c).then(function(h){
      if(h && INVITE_HASHES.indexOf(h)>=0){ var now=Date.now();
        try{ localStorage.setItem(INVITE_KEY, JSON.stringify({ exp: now + 3650*DAY, ts:now })); }catch(e2){}
        return true; }
      return false;
    });
  }

  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function write(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
  function legacy(){ try{ return localStorage.getItem('the_premium')==='1'; }catch(e){ return false; } }

  function isActive(){
    if(inviteActive()) return true;   // accès offert (invité) → full premium, même en freemium
    if(!CHECKOUT.semaine && !CHECKOUT.mois) return false; /* Premium pas encore en vente -> personne n'est premium, on ignore tout drapeau */ if(legacy()) return true;                       // ancien drapeau démo (compat)
    var p=read(); return !!(p && p.expires && p.expires > Date.now());
  }
  function activate(plan, meta){
    var d=DAYS[plan]||7, now=Date.now(), cur=read();
    // si un passe est encore valide, on PROLONGE à partir de sa fin (cumul équitable)
    var base=(cur && cur.expires && cur.expires>now) ? cur.expires : now;
    var rec={ plan:plan, start:now, expires: base + d*DAY, order:(meta&&meta.order)||null, ts:now };
    write(rec); return rec;
  }
  function deactivate(){ try{ localStorage.removeItem(KEY); localStorage.removeItem('the_premium'); }catch(e){} }

  function info(){
    var now=Date.now();
    if(legacy()) return { active:true, plan:'démo', daysLeft:null, expires:null };
    var p=read();
    if(!p || !p.expires || p.expires<=now) return { active:false };
    return { active:true, plan:p.plan, expires:p.expires, daysLeft:Math.max(0, Math.ceil((p.expires-now)/DAY)) };
  }

  function checkoutURL(plan){ return CHECKOUT[plan]||''; }
  // Lance l'achat. Retour : 'checkout' (redirigé vers LS) ou 'demo' (activé localement).
  function buy(plan){
    if(!DAYS[plan]) return null;
    var url=checkoutURL(plan);
    if(url){
      try{ localStorage.setItem('the_pass_pending', plan); }catch(e){}
      location.href=url;
      return 'checkout';
    }
    activate(plan, {order:'demo'});
    return 'demo';
  }

  // Au retour de paiement : active le passe selon l'URL (?pass=…) ou le plan en attente.
  function handleReturn(){
    try{
      var q=new URLSearchParams(location.search);
      var inv=q.get('code')||q.get('invite');
      if(inv){ redeem(inv).then(function(ok){ try{ if(ok) localStorage.setItem('the_invite_ok','1'); }catch(e){} clean(); if(ok) location.reload(); }); return 'invite'; }
      var plan=q.get('pass');
        if(plan==='off'){ deactivate(); clean(); return 'off'; }   // ?pass=off → retour gratuit, sans console
      var success=q.get('ls_success')||q.get('success')||q.get('checkout');
      var pending=null; try{ pending=localStorage.getItem('the_pass_pending'); }catch(e){}
      if(plan && DAYS[plan]){ activate(plan,{order:q.get('order_id')||q.get('order')||null}); clean(); try{localStorage.removeItem('the_pass_pending');}catch(e){} return plan; }
      if(success && pending && DAYS[pending]){ activate(pending,{order:q.get('order_id')||null}); clean(); try{localStorage.removeItem('the_pass_pending');}catch(e){} return pending; }
      // Cadeau pourboire (web) : au retour d'un pourboire réussi → UNE feature offerte au hasard.
      // (uniquement si le Premium est en vente ; sinon le pourboire est un simple don.)
      var tipPending=null; try{ tipPending=localStorage.getItem('the_tip_pending'); }catch(e){}
      if(premiumLive() && (q.get('tip')==='ok' || (success && tipPending))){
        var gift=giftRandom();
        try{ localStorage.removeItem('the_tip_pending'); if(gift) localStorage.setItem('the_gift_new', gift); }catch(e){}
        clean(); return 'tip';
      }
    }catch(e){}
    return null;
  }
  function clean(){ try{ history.replaceState(null,'',location.pathname); }catch(e){} }

  /* ─── Cadeau « pourboire » (web-only) ────────────────────────────────────
     Chaque pourboire réussi OFFRE une feature au hasard (surprise, non annoncée).
     Ça ne débloque PAS tout le Premium — juste cette feature-là, via hasFeature()
     honoré par requirePass(). Le pool tire des features « fun » et autonomes. */
  var GIFT_POOL=['Thème Gastronomie','Mythes & Légendes','Décors de cinéma'];
  function readFeats(){ try{ return JSON.parse(localStorage.getItem('the_feats')||'[]'); }catch(e){ return []; } }
  function grantFeature(feat){ if(!feat) return; try{ var s=readFeats(); if(s.indexOf(feat)<0){ s.push(feat); localStorage.setItem('the_feats', JSON.stringify(s)); } }catch(e){} }
  function hasFeature(feat){ if(isActive()) return true; return readFeats().indexOf(feat)>=0; }
  function giftRandom(){ var pool=GIFT_POOL.filter(function(f){ return readFeats().indexOf(f)<0; }); if(!pool.length) pool=GIFT_POOL; var f=pool[Math.floor(Math.random()*pool.length)]; grantFeature(f); return f; }
  // Révèle le cadeau une seule fois (petit bandeau) sur la page d'atterrissage après le pourboire.
  function showGiftToast(){
    var g; try{ g=localStorage.getItem('the_gift_new'); }catch(e){}
    if(!g) return; try{ localStorage.removeItem('the_gift_new'); }catch(e){}
    var uiT=function(fr){ return (window.THEi18n && !THEi18n.isFr() && THEi18n.ui(fr)) || fr; };
    var add=function(){
      var d=document.createElement('div'); d.setAttribute('role','status');
      d.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:92%;background:#2b2318;color:#f6f0e4;padding:13px 18px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:inherit;font-size:14.5px;line-height:1.4;border:1px solid #a8884f';
      d.innerHTML='🎁 '+uiT('Merci pour votre pourboire ! On vous offre :')+' <b>'+(uiT(g))+'</b>';
      document.body.appendChild(d);
      setTimeout(function(){ d.style.transition='opacity .5s'; d.style.opacity='0'; setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },500); }, 6500);
    };
    if(document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  }

  /* ─── Chemin d'achat iOS (Apple In-App Purchase / StoreKit) ──────────────
     Sur iPhone, on ne redirige JAMAIS vers Lemon Squeezy (règle Apple 3.1.1).
     Le web ne fait qu'APPELER le pont natif ; c'est le code Swift StoreKit de
     la coquille PWABuilder qui lance l'achat Apple, puis rappelle iapUnlock().
     ┌─ À BRANCHER CÔTÉ NATIF (projet Xcode / build Codemagic) ──────────────┐
     │ 1. Créer les abonnements dans App Store Connect :                     │
     │      the_premium_semaine  ·  the_premium_mois                         │
     │ 2. Recevoir postMessage sur le handler « iap », lancer StoreKit.      │
     │ 3. Au succès : webView.evaluateJavaScript(                            │
     │      "THEPass.iapUnlock('semaine','<txId>')" )                        │
     └───────────────────────────────────────────────────────────────────────┘ */
  var IAP_PRODUCT={ semaine:'the_premium_semaine', mois:'the_premium_mois' };
  function isIOS(){
    var u=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(u) ||
      ((/Mac/.test(u)||navigator.platform==='MacIntel'||navigator.platform==='iPad') &&
       (navigator.maxTouchPoints>1||'ontouchend' in document));
  }
  function hasIAPBridge(){ try{ return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iap); }catch(e){ return false; } }
  // Lance l'achat Apple. Retour : 'iap' (envoyé au natif) ou 'no-bridge' (coquille sans StoreKit).
  function buyIOS(plan){
    if(!DAYS[plan]) return null;
    if(!hasIAPBridge()) return 'no-bridge';
    try{ localStorage.setItem('the_pass_pending', plan); }catch(e){}
    try{ window.webkit.messageHandlers.iap.postMessage({ action:'buy', plan:plan, product:IAP_PRODUCT[plan] }); }catch(e){ return 'no-bridge'; }
    return 'iap';
  }
  // Appelée par le code natif au succès d'un achat App Store (ou au restore).
  function iapUnlock(plan, txId){
    if(!DAYS[plan]){ try{ plan=localStorage.getItem('the_pass_pending'); }catch(e){} }
    if(!DAYS[plan]) return false;
    activate(plan, { order: txId||'ios-iap' });
    try{ localStorage.removeItem('the_pass_pending'); }catch(e){}
    try{ if(typeof window.__thePassOnUnlock==='function') window.__thePassOnUnlock(plan); }catch(e){}
    return true;
  }

  window.THEPass={ isActive:isActive, activate:activate, deactivate:deactivate, info:info,
                   buy:buy, checkoutURL:checkoutURL, handleReturn:handleReturn,
                   isIOS:isIOS, hasIAPBridge:hasIAPBridge, buyIOS:buyIOS, iapUnlock:iapUnlock,
                   IAP_PRODUCT:IAP_PRODUCT,
                   grantFeature:grantFeature, hasFeature:hasFeature, giftRandom:giftRandom, GIFT_POOL:GIFT_POOL,
                   premiumLive:premiumLive, redeem:redeem, inviteActive:inviteActive,
                   DAYS:DAYS, PRICE:PRICE, CHECKOUT:CHECKOUT };

  // Bandeau de bienvenue quand un accès offert vient d'être activé (une fois).
  function inviteToast(){
    var ok; try{ ok=localStorage.getItem('the_invite_ok'); }catch(e){}
    if(!ok) return; try{ localStorage.removeItem('the_invite_ok'); }catch(e){}
    var uiT=function(fr){ return (window.THEi18n && !THEi18n.isFr() && THEi18n.ui(fr)) || fr; };
    var add=function(){
      var d=document.createElement('div'); d.setAttribute('role','status');
      d.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:92%;background:#2b2318;color:#f6f0e4;padding:13px 18px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:inherit;font-size:14.5px;line-height:1.4;border:1px solid #a8884f';
      d.innerHTML='🎁 '+uiT('Accès Premium offert — activé. Bon voyage !');
      document.body.appendChild(d);
      setTimeout(function(){ d.style.transition='opacity .5s'; d.style.opacity='0'; setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },500); }, 6500);
    };
    if(document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  }

  handleReturn();   // traite un éventuel retour de paiement / lien invité dès le chargement
  showGiftToast();  // révèle un éventuel cadeau pourboire
  inviteToast();    // bienvenue accès offert
})();
