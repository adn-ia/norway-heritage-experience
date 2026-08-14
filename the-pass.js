/* THE — module « passe » (essai daté → paywall, modèle 2026-07).
   ┌─ LE MODÈLE ─────────────────────────────────────────────────────────┐
   │ • ESSAI 2 SEMAINES : tout le Premium, gratuit.                       │
   │     · iOS  : essai NATIF Apple (offre d'intro de l'abonnement).      │
   │     · Web  : essai géré par l'app (14 j), démarré 1 seule fois.      │
   │ • PASS 1 AN : 14,99 €/an, AUTO-RENOUVELABLE (abonnement Apple).      │
   │   Achat via l'App Store (StoreKit). Lemon Squeezy dormant (web).     │
   │ • CODES offerts : déverrouillent le Premium complet (~10 ans).       │
   │ • VERROU GLOBAL : sans essai/abonnement/code actif, toute page       │
   │   renvoie vers premium.html (le mur = l'écran d'achat).              │
   │ Règle d'or : à l'expiration, le Premium se coupe MAIS aucune donnée  │
   │ créée par l'utilisateur (itinéraires, carnet) n'est touchée. Jamais. │
   └──────────────────────────────────────────────────────────────────────┘ */
(function(){
  var DAY=86400000;

  /* ═══════════════════════════════════════════════════════════════════════
     CONFIG PAR ÉDITION — SEULS CES 2 BLOCS CHANGENT D'UN PAYS À L'AUTRE.
     (le reste du fichier est strictement identique dans toutes les éditions)
     ═══════════════════════════════════════════════════════════════════════ */
  var IAP_PREFIX=(window.HConf&&HConf.iso)||'';                    // → produit App Store : the_pass_an
  var INVITE_HASHES=[/* codes premium à générer (SHA-256) — voir CODES-PREMIUM-PRIVE */];
  /* ═══════════════════════════════════════════════════════════════════════ */

  /* ─── L'offre unique : le pass 1 an (abonnement annuel auto-renouvelable) ─── */
  var PLAN='an';
  var DAYS={ an:365 };
  /* Prix : montant + devise via HConf (repli neutre), MIS EN FORME SELON LA LANGUE affichée.
     Écrire « 14,99 € » en dur donnait une virgule française jusqu'en anglais. Intl s'en charge :
     fr/de/it/cs/hr/nb/et « 14,99 € », en/ga « €14.99 », pt « € 14,99 », ar chiffres latins.
     Getter volontaire : la langue n'est connue qu'après le chargement du dictionnaire. */
  var PRICE_AN=(window.HConf&&HConf.prixAn)||14.99;
  var PRICE_CUR=(window.HConf&&HConf.devise)||'EUR';
  function fmtPrix(v){
    var lg=(window.THEi18n&&THEi18n.lang&&THEi18n.lang())||'fr';
    try{ return new Intl.NumberFormat(lg,{style:'currency',currency:PRICE_CUR}).format(v); }
    catch(e){ return v.toFixed(2).replace('.',',')+' \u20ac'; }
  }
  var PRICE={ get an(){ return fmtPrix(PRICE_AN); } };
  var PERIOD='an';
  var TRIAL_DAYS=14;                         // essai gratuit (web) — 2 semaines, comme l'essai natif iOS
  var GIFT_DAYS=3;                           // café/pourboire (web) → petit cadeau surprise : accès complet N jours
  var IAP_PRODUCT={ an: IAP_PREFIX+'_sub_annual' };  // abonnement auto-renouvelable, groupe « Premium »

  /* Lemon Squeezy en sommeil (web). Vide = pas de vente web ; l'achat se fait
     via l'App Store (Apple). Le jour où tu actives la vente web, colle l'URL. */
  var CHECKOUT={ an:(window.HConf&&HConf.checkout)||'' };   // Lemon Squeezy — abonnement 14,99 €/an (active le mur web)
  var APPSTORE_URL=(window.HConf&&HConf.appStore)||'';    // ← lit HConf.appStore (vide = masqué)
  var PLAYSTORE_URL=(window.HConf&&HConf.playStore)||'';  // ← lit HConf.playStore (vide = masqué)
  function premiumLive(){ return !!CHECKOUT.an; }

  /* ═══ OÙ le premium est-il PAYANT ? ═══
     Le mur (et l'essai daté) ne s'activent QUE là où l'achat est possible :
       • dans l'app iOS quand le pont StoreKit est présent (hasIAPBridge), OU
       • sur le web si la vente Lemon Squeezy est activée (premiumLive).
     Sinon = site web gratuit : tout reste ouvert, aucun mur (vitrine + acquisition).
     Conséquence : tant que le code natif iOS n'est pas livré, il n'y a de mur
     NULLE PART — l'upload web est donc sans risque. */
  function paywallActive(){ return hasIAPBridge() || premiumLive(); }

  var KEY='the_pass';                       // le passe payé
  var TRIAL_KEY='the_trial';                // l'essai en cours
  var TRIAL_FLAG='the_trial_started';       // garde : essai déjà consommé (même expiré)
  var INVITE_KEY='the_invite';              // accès offert par code

  /* ─── Passe payé ────────────────────────────────────────────────────── */
  function read(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function write(o){ try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){} }
  function paidActive(){ var p=read(); return !!(p && p.expires && p.expires>Date.now()); }

  /* ─── Accès offert « code » (SHA-256, aucune donnée perso stockée) ───── */
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

  /* ─── Clé de licence Lemon Squeezy (achat web) — validée EN LIGNE, multi-appareils ─
     La personne colle la clé reçue par mail après l'achat ; on l'active via l'API
     publique de Lemon Squeezy (CORS OK, AUCUN serveur requis). Débloque le Premium
     1 an sur cet appareil. La limite d'appareils est réglée côté produit LS. */
  function deviceName(){
    try{ var d=localStorage.getItem('the_device');
      if(!d){ d='web-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*1e6).toString(36); localStorage.setItem('the_device', d); }
      return d; }catch(e){ return 'web'; }
  }
  function redeemLicense(key){
    key=String(key||'').trim();
    if(!key) return Promise.resolve(false);
    return fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
      method:'POST', headers:{ 'Accept':'application/json', 'Content-Type':'application/json' },
      body: JSON.stringify({ license_key:key, instance_name: deviceName() })
    }).then(function(r){ return r.json(); }).then(function(j){
      if(j && j.activated){
        try{ localStorage.setItem('the_license', JSON.stringify({ key:key, instance:(j.instance&&j.instance.id)||null, ts:Date.now() })); }catch(e){}
        activate('an', { order:'ls-license' });   // 1 an d'accès
        return true;
      }
      return false;
    }).catch(function(){ return false; });
  }

  /* ─── Essai (démarré automatiquement, une seule fois) ─── voir TRIAL_DAYS ─── */
  function trialRead(){ try{ return JSON.parse(localStorage.getItem(TRIAL_KEY)||'null'); }catch(e){ return null; } }
  function trialStartedTs(){ try{ return parseInt(localStorage.getItem(TRIAL_FLAG)||'0',10)||0; }catch(e){ return 0; } }
  function trialActive(){ var t=trialRead(); return !!(t && t.expires && t.expires>Date.now()); }
  // Démarre l'essai UNE seule fois. Si déjà consommé (même expiré) → jamais réarmé.
  function trialMaybeStart(){
    if(!paywallActive()) return false;            // plateforme gratuite : pas d'essai daté
    if(trialStartedTs()) return false;            // déjà utilisé une fois
    if(paidActive() || inviteActive()) return false; // déjà premium : inutile
    var now=Date.now();
    try{
      localStorage.setItem(TRIAL_FLAG, String(now));
      localStorage.setItem(TRIAL_KEY, JSON.stringify({ start:now, expires: now + TRIAL_DAYS*DAY }));
      localStorage.setItem('the_trial_new','1');  // pour le petit bandeau de bienvenue
    }catch(e){}
    return true;
  }

  /* ─── L'état premium global ─── */
  function isActive(){
    if(!paywallActive()) return true;   // plateforme gratuite (web sans vente) → tout ouvert
    return inviteActive() || paidActive() || trialActive();
  }

  function activate(plan, meta){
    var d=DAYS[plan]||DAYS.an, now=Date.now(), cur=read();
    var wasActive=!!(cur && cur.expires && cur.expires>now);
    // si un passe est encore valide, on PROLONGE à partir de sa fin (cumul équitable)
    var base=wasActive ? cur.expires : now;
    var rec={ plan:plan||PLAN, start:now, expires: base + d*DAY, order:(meta&&meta.order)||null, ts:now };
    write(rec);
    // 1re activation (pas une simple ré-assertion iOS au lancement) → ouvrir l'album par défaut.
    if(!wasActive){ try{ localStorage.setItem('the_open_album','1'); }catch(e){} }
    return rec;
  }
  function deactivate(){ try{ localStorage.removeItem(KEY); }catch(e){} }

  function info(){
    var now=Date.now(), p=read();
    if(p && p.expires && p.expires>now)
      return { active:true, plan:p.plan||PLAN, paid:true, expires:p.expires, daysLeft:Math.max(0,Math.ceil((p.expires-now)/DAY)) };
    if(inviteActive()){ var i=inviteRead();
      return { active:true, plan:'code', invite:true, expires:i.exp, daysLeft:Math.max(0,Math.ceil((i.exp-now)/DAY)) }; }
    if(trialActive()){ var t=trialRead();
      return { active:true, plan:'essai', trial:true, expires:t.expires, daysLeft:Math.max(0,Math.ceil((t.expires-now)/DAY)) }; }
    return { active:false, trialUsed: !!trialStartedTs() };
  }

  /* ─── Achat web (Lemon Squeezy — dormant pour l'instant) ─────────────── */
  function checkoutURL(plan){ return CHECKOUT[plan]||''; }
  // Retour : 'checkout' (redirigé LS) ou 'soon' (vente web pas encore active).
  function buy(plan){
    plan=plan||PLAN; if(!DAYS[plan]) return null;
    var url=checkoutURL(plan);
    if(url){ try{ localStorage.setItem('the_pass_pending', plan); }catch(e){} location.href=url; return 'checkout'; }
    return 'soon';   // pas de démo silencieuse : sur le web, l'achat se fait via l'App Store
  }

  // Au retour de paiement (LS) ou lien : active selon ?pass=… / plan en attente / code.
  function handleReturn(){
    try{
      var q=new URLSearchParams(location.search);
      var inv=q.get('code')||q.get('invite');
      if(inv){ redeem(inv).then(function(ok){ try{ if(ok) localStorage.setItem('the_invite_ok','1'); }catch(e){} clean(); if(ok) location.reload(); }); return 'invite'; }
      var plan=q.get('pass');
      if(plan==='off'){ deactivate(); clean(); return 'off'; }
      var success=q.get('ls_success')||q.get('success')||q.get('checkout');
      var pending=null; try{ pending=localStorage.getItem('the_pass_pending'); }catch(e){}
      if(plan && DAYS[plan]){ activate(plan,{order:q.get('order_id')||q.get('order')||null}); clean(); try{localStorage.removeItem('the_pass_pending');}catch(e){} return plan; }
      if(success && pending && DAYS[pending]){ activate(pending,{order:q.get('order_id')||null}); clean(); try{localStorage.removeItem('the_pass_pending');}catch(e){} return pending; }
      // Cadeau pourboire (web) : au retour d'un pourboire réussi → UNE feature offerte au hasard.
      var tipPending=null; try{ tipPending=localStorage.getItem('the_tip_pending'); }catch(e){}
      if(premiumLive() && (q.get('tip')==='ok' || (success && tipPending))){
        giftAccess();   // café/pourboire → petit cadeau surprise : quelques jours de Premium
        try{ localStorage.removeItem('the_tip_pending'); localStorage.setItem('the_gift_new', String(GIFT_DAYS)); }catch(e){}
        clean(); return 'tip';
      }
    }catch(e){}
    return null;
  }
  function clean(){ try{ history.replaceState(null,'',location.pathname); }catch(e){} }

  /* ─── Cadeau « pourboire » (web-only) — inchangé ─────────────────────── */
  // Petit cadeau surprise du pourboire (web) : quelques jours d'accès complet.
  function giftAccess(){
    var now=Date.now(), cur=read();
    var base=(cur && cur.expires && cur.expires>now) ? cur.expires : now;   // prolonge si déjà actif
    write({ plan:'cadeau', start:now, expires: base + GIFT_DAYS*DAY, order:'tip-gift', ts:now });
  }
  var GIFT_POOL=['Thème Gastronomie','Mythes & Légendes','Décors de cinéma'];
  function readFeats(){ try{ return JSON.parse(localStorage.getItem('the_feats')||'[]'); }catch(e){ return []; } }
  function grantFeature(feat){ if(!feat) return; try{ var s=readFeats(); if(s.indexOf(feat)<0){ s.push(feat); localStorage.setItem('the_feats', JSON.stringify(s)); } }catch(e){} }
  function hasFeature(feat){ if(isActive()) return true; return readFeats().indexOf(feat)>=0; }
  function giftRandom(){ var pool=GIFT_POOL.filter(function(f){ return readFeats().indexOf(f)<0; }); if(!pool.length) pool=GIFT_POOL; var f=pool[Math.floor(Math.random()*pool.length)]; grantFeature(f); return f; }
  function showGiftToast(){
    var g; try{ g=localStorage.getItem('the_gift_new'); }catch(e){}
    if(!g) return; try{ localStorage.removeItem('the_gift_new'); }catch(e){}
    toast('🎁 '+uiT('pass.gift.thanks')+' <b>'+g+' '+uiT('pass.gift.days')+'</b>.');
  }

  /* ─── Achat iOS (Apple In-App Purchase / StoreKit) ───────────────────────
     Sur iPhone, on ne redirige JAMAIS vers un paiement web (règle Apple 3.1.1).
     Le web APPELLE le pont natif ; le code Swift StoreKit de la coquille lance
     l'achat/restaure Apple, puis rappelle iapUnlock / iapExpire.
     ┌─ À BRANCHER CÔTÉ NATIF (Xcode / build Codemagic) ─────────────────────┐
     │ 1. App Store Connect → « Abonnements auto-renouvelables » :           │
     │      Groupe « Premium » → produit  <iso>_sub_annual  (1 an, 14,99 €) │
     │      + Offre d'introduction : ESSAI GRATUIT 2 SEMAINES.               │
     │ 2. Au LANCEMENT, interroger l'entitlement StoreKit courant :         │
     │      · abonné/essai actif → evaluateJavaScript("THEPass.iapUnlock('an')")│
     │      · sinon              → evaluateJavaScript("THEPass.iapExpire()")  │
     │ 3. Recevoir postMessage { action:'buy'|'restore' } sur le handler     │
     │    « iap », lancer StoreKit (purchase / restoreCompletedTransactions).│
     │ 4. Au succès d'achat/restore : "THEPass.iapUnlock('an','<txId>')".    │
     │  (l'essai natif Apple compte comme « actif » → l'app est déverrouillée)│
     └───────────────────────────────────────────────────────────────────────┘ */
  function isIOS(){
    var u=navigator.userAgent||'';
    return /iPad|iPhone|iPod/.test(u) ||
      ((/Mac/.test(u)||navigator.platform==='MacIntel'||navigator.platform==='iPad') &&
       (navigator.maxTouchPoints>1||'ontouchend' in document));
  }
  function hasIAPBridge(){ try{ return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.iap); }catch(e){ return false; } }
  /* ─── App Android (Play/TWA) : masquer LS/café comme sur iOS (Google Play Billing) ───
     Détection TWA : referrer 'android-app://…' au lancement OU marqueur ?app=play
     (posé dans le start_url du package Android). Persisté en sessionStorage (ne
     FUIT PAS vers le navigateur Chrome : session séparée). */
  function isAndroidApp(){
    try{
      if(sessionStorage.getItem('the_store_app')==='1') return true;
      var u=navigator.userAgent||''; if(!/Android/.test(u)) return false;
      var marker=(new URLSearchParams(location.search)).get('app')==='play'
                 || (document.referrer||'').indexOf('android-app://')===0;
      if(marker){ try{ sessionStorage.setItem('the_store_app','1'); }catch(e){} return true; }
    }catch(e){}
    return false;
  }
  // Dans une APP de store (iOS OU Android) : on masque Lemon Squeezy + café (règles Apple 3.1.1 / Google Play Billing).
  function isStoreApp(){ return isIOS() || isAndroidApp(); }
  // Lance l'achat Apple. Retour : 'iap' (envoyé au natif) ou 'no-bridge'.
  function buyIOS(plan){
    plan=plan||PLAN; if(!DAYS[plan]) return null;
    if(!hasIAPBridge()) return 'no-bridge';
    try{ localStorage.setItem('the_pass_pending', plan); }catch(e){}
    try{ window.webkit.messageHandlers.iap.postMessage({ action:'buy', plan:plan, product:IAP_PRODUCT[plan] }); }catch(e){ return 'no-bridge'; }
    return 'iap';
  }
  // Restaurer un achat (obligation Apple). Le natif rappelle iapUnlock au succès.
  function restoreIOS(){
    if(!hasIAPBridge()) return 'no-bridge';
    try{ window.webkit.messageHandlers.iap.postMessage({ action:'restore', product:IAP_PRODUCT[PLAN] }); }catch(e){ return 'no-bridge'; }
    return 'iap';
  }

  /* ─── Google Play Billing (app Android / TWA) via Digital Goods API ───────
     Standard web (PWABuilder/TWA) : aucun code natif custom. Mêmes SKU qu'iOS
     (<iapPrefix>_sub_annual). C'est la contrepartie Android de StoreKit ; dans l'app
     Android on ne montre JAMAIS Lemon Squeezy ni l'App Store. iapUnlock au succès. */
  function hasPlayBridge(){ try{ return typeof window.getDigitalGoodsService==='function'; }catch(e){ return false; } }
  // Lance l'achat Play. Promise → 'ok' | 'no-bridge' | 'no-sku' | 'error'.
  function buyAndroid(plan){
    plan=plan||PLAN;
    try{
      if(!DAYS[plan]) return Promise.resolve(null);
      if(!hasPlayBridge() || typeof PaymentRequest==='undefined') return Promise.resolve('no-bridge');
      var sku=IAP_PRODUCT[plan];
      return window.getDigitalGoodsService('https://play.google.com/billing').then(function(svc){
        return svc.getDetails([sku]).then(function(items){
          if(!items || !items.length) return 'no-sku';
          var it=items[0];
          var pr=new PaymentRequest(
            [{ supportedMethods:'https://play.google.com/billing', data:{ sku:sku } }],
            { total:{ label:'Total', amount:{ currency:it.price.currency, value:it.price.value } } }
          );
          return pr.show().then(function(resp){
            var token=(resp.details&&(resp.details.token||resp.details.purchaseToken))||'';
            var ack=(svc.acknowledge? svc.acknowledge(token) : Promise.resolve());   // abonnement → acknowledge, JAMAIS consume
            return ack.then(function(){ return resp.complete('success'); }).then(function(){ iapUnlock(plan, token); return 'ok'; });
          });
        });
      }).catch(function(){ return 'error'; });
    }catch(e){ return Promise.resolve('error'); }
  }
  // Restaurer : re-vérifier les abonnements Play actifs (entitlement).
  function restoreAndroid(){
    try{
      if(!hasPlayBridge()) return Promise.resolve('no-bridge');
      return window.getDigitalGoodsService('https://play.google.com/billing').then(function(svc){
        if(!svc.listPurchases) return 'none';
        return svc.listPurchases().then(function(ps){
          for(var i=0;i<(ps||[]).length;i++){ if(ps[i].itemId===IAP_PRODUCT[PLAN]){ iapUnlock(PLAN, ps[i].purchaseToken||''); return 'ok'; } }
          return 'none';
        });
      }).catch(function(){ return 'error'; });
    }catch(e){ return Promise.resolve('error'); }
  }
  // Appelée par le natif au succès d'un achat/restore OU au lancement si entitlement actif.
  function iapUnlock(plan, txId){
    if(!DAYS[plan]){ try{ plan=localStorage.getItem('the_pass_pending'); }catch(e){} }
    if(!DAYS[plan]) plan=PLAN;
    activate(plan, { order: txId||'ios-iap' });
    try{ localStorage.removeItem('the_pass_pending'); }catch(e){}
    try{ if(typeof window.__thePassOnUnlock==='function') window.__thePassOnUnlock(plan); }catch(e){}
    return true;
  }
  // Appelée par le natif au lancement si l'abonnement n'est PLUS actif (annulé/expiré).
  // Coupe le cache local du passe payé (les données utilisateur ne sont jamais touchées).
  function iapExpire(){ deactivate(); return true; }

  /* ─── Petits bandeaux (toasts) ───────────────────────────────────────── */
  /* i18n par CLÉS : THEi18n.ui('pass.xxx') ; repli FR si non chargé */
  var PASS_FR={
    'pass.trial.welcome':'Premium offert pendant 2 semaines — profitez-en !',
    'pass.invite.welcome':'Accès Premium offert — activé. Bon voyage !',
    'pass.gift.thanks':'Merci pour votre café ! On vous offre',
    'pass.gift.days':'jours de Premium',
    'pass.trial.ending':'Votre essai se termine dans',
    'pass.days':'jour(s)',
    'pass.save.album':'Enregistrez votre album souvenir'
  };
  function uiT(key){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(key)) || PASS_FR[key] || key; }catch(e){ return PASS_FR[key]||key; } }
  function toast(html, ms){
    var add=function(){
      var d=document.createElement('div'); d.setAttribute('role','status');
      d.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;max-width:92%;background:#2b2318;color:#f6f0e4;padding:13px 18px;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.35);font-family:inherit;font-size:14.5px;line-height:1.4;border:1px solid #a8884f';
      d.innerHTML=html; document.body.appendChild(d);
      setTimeout(function(){ d.style.transition='opacity .5s'; d.style.opacity='0'; setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); },500); }, ms||6500);
    };
    if(document.body) add(); else document.addEventListener('DOMContentLoaded', add);
  }

  /* ─── Sauvegarde des souvenirs : rappel avant le mur + album à l'abonnement ───
     Les photos/souvenirs ne sont JAMAIS retenus ni supprimés (carnet local). On
     évite juste que quelqu'un se fasse surprendre par le mur : dans les 3 derniers
     jours d'essai, un rappel (1×/jour) invite à enregistrer l'album. Et à la 1re
     activation, l'album s'ouvre par défaut (openAlbumIfFlagged, via le drapeau posé
     par activate()). */
  function trialEndNudge(){
    try{
      if(!trialActive()) return;
      var t=trialRead(); var left=Math.max(0, Math.ceil((t.expires-Date.now())/DAY));
      if(left>3) return;
      if(/premium\.html|itineraire\.html/i.test(location.pathname)) return;   // déjà sur l'album / le paywall
      var bucket=String(Math.floor(Date.now()/DAY)), seen=null;
      try{ seen=localStorage.getItem('the_nudge_day'); }catch(e){}
      if(seen===bucket) return;                                               // 1 rappel par jour max
      try{ localStorage.setItem('the_nudge_day', bucket); }catch(e){}
      toast('⏳ '+uiT('pass.trial.ending')+' <b>'+left+' '+uiT('pass.days')+'</b>. '
        +'<a href="itineraire.html" style="color:#c9ad79;text-decoration:underline">'+uiT('pass.save.album')+'</a>', 12000);
    }catch(e){}
  }
  function openAlbumIfFlagged(){
    try{
      if(!/itineraire\.html/i.test(location.pathname)) return;
      var f=null; try{ f=localStorage.getItem('the_open_album'); }catch(e){}
      if(!f) return; try{ localStorage.removeItem('the_open_album'); }catch(e){}
      if(!isActive()) return;
      var open=function(){ var b=document.getElementById('albumbtn'); if(b){ try{ b.click(); }catch(e){} } };
      if(document.readyState!=='loading') setTimeout(open,600);
      else document.addEventListener('DOMContentLoaded', function(){ setTimeout(open,600); });
    }catch(e){}
  }
  function trialToast(){
    var n; try{ n=localStorage.getItem('the_trial_new'); }catch(e){}
    if(!n) return; try{ localStorage.removeItem('the_trial_new'); }catch(e){}
    toast('🎁 '+uiT('pass.trial.welcome'));
  }
  function inviteToast(){
    var ok; try{ ok=localStorage.getItem('the_invite_ok'); }catch(e){}
    if(!ok) return; try{ localStorage.removeItem('the_invite_ok'); }catch(e){}
    toast('🎁 '+uiT('pass.invite.welcome'));
  }

  window.THEPass={ isActive:isActive, activate:activate, deactivate:deactivate, info:info,
                   buy:buy, checkoutURL:checkoutURL, handleReturn:handleReturn,
                   isIOS:isIOS, isAndroidApp:isAndroidApp, isStoreApp:isStoreApp, hasIAPBridge:hasIAPBridge, buyIOS:buyIOS, restoreIOS:restoreIOS,
                   hasPlayBridge:hasPlayBridge, buyAndroid:buyAndroid, restoreAndroid:restoreAndroid,
                   iapUnlock:iapUnlock, iapExpire:iapExpire, IAP_PRODUCT:IAP_PRODUCT,
                   grantFeature:grantFeature, hasFeature:hasFeature, giftRandom:giftRandom, GIFT_POOL:GIFT_POOL,
                   premiumLive:premiumLive, redeem:redeem, redeemLicense:redeemLicense, inviteActive:inviteActive,
                   trialActive:trialActive, trialUsed:function(){ return !!trialStartedTs(); },
                   PLAN:PLAN, PERIOD:PERIOD, TRIAL_DAYS:TRIAL_DAYS, GIFT_DAYS:GIFT_DAYS,
                   DAYS:DAYS, PRICE:PRICE, CHECKOUT:CHECKOUT, APPSTORE_URL:APPSTORE_URL, PLAYSTORE_URL:PLAYSTORE_URL };

  /* ═══ VERROU GLOBAL ═══
     Sans essai/abonnement/code actif, toute page « contenu » renvoie vers le
     paywall (premium.html). On laisse toujours ouvertes : le paywall lui-même,
     le soutien, et les pages légales/aide (exigées par Apple près de l'achat).
     Placé tôt (the-pass.js est chargé en <head>) → pas de contenu qui clignote. */
  function gateAllow(path){
    return /(?:^|\/)(bienvenue|decouvrir|premium|soutien|cgu|cgv|confidentialite|mentions-legales|remboursement|a-propos|sources-credits|credits-photos)\.html?$/i.test(path)
        || /\/$/.test(path);   // racine « / » = bienvenue (vitrine toujours libre, toutes langues)
  }
  function gate(){
    try{
      if(!paywallActive()) return;               // site gratuit (web sans vente) → aucun mur
      if(gateAllow(location.pathname)) return;
      if(isActive()) return;
      // Laisse passer le retour de code (?code=…) que handleReturn traite en asynchrone.
      if(/[?&](code|invite|pass)=/.test(location.search)) return;
      location.replace('premium.html');
    }catch(e){}
  }

  handleReturn();       // retour paiement / lien invité
  trialMaybeStart();    // démarre l'essai (une seule fois)
  gate();               // ← MUR : après l'essai, tout renvoie au paywall SAUF bienvenue (vitrine libre)
  openAlbumIfFlagged(); // à la 1re activation : ouvre l'album par défaut
  trialEndNudge();      // rappel « enregistrez votre album » dans les 3 derniers jours
  showGiftToast();      // cadeau pourboire éventuel
  trialToast();         // bienvenue essai
  inviteToast();        // bienvenue accès offert
})();
