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

  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function write(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
  function legacy(){ try{ return localStorage.getItem('the_premium')==='1'; }catch(e){ return false; } }

  function isActive(){
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
                   premiumLive:premiumLive,
                   DAYS:DAYS, PRICE:PRICE, CHECKOUT:CHECKOUT };
  handleReturn();   // traite un éventuel retour de paiement dès le chargement
  showGiftToast();  // révèle un éventuel cadeau pourboire
})();
