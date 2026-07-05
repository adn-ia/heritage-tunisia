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
  var PRICE={ semaine:'2,90 €', mois:'6,90 €' };
  var CHECKOUT={ semaine:'', mois:'' };   // ← Helmy : colle tes 2 URLs Lemon Squeezy ici
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
    }catch(e){}
    return null;
  }
  function clean(){ try{ history.replaceState(null,'',location.pathname); }catch(e){} }

  window.THEPass={ isActive:isActive, activate:activate, deactivate:deactivate, info:info,
                   buy:buy, checkoutURL:checkoutURL, handleReturn:handleReturn,
                   DAYS:DAYS, PRICE:PRICE, CHECKOUT:CHECKOUT };
  handleReturn();   // traite un éventuel retour de paiement dès le chargement
})();
