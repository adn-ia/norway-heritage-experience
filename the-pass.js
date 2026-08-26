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

  /* Un code offert doit pouvoir être RETIRÉ. Jusqu'au 17/08/2026 il ne le
     pouvait pas : l'enregistrement ne gardait que { exp, ts }, et inviteActive()
     ne regardait que la date. Un appareil ayant saisi un code restait donc
     premium 3 650 jours même après suppression du code de heritage.config.js —
     et comme l'empreinte n'était pas gardée, on ne savait pas même LEQUEL
     retirer. Un code diffusé était un code définitif.

     Désormais l'empreinte voyage avec l'enregistrement, et l'accès est
     reconfronté à la liste à chaque lecture : retirer une ligne de
     heritage.config.js coupe l'accès au prochain chargement, sans serveur.

     Les enregistrements ANTÉRIEURS n'ont pas d'empreinte. On les garde valides :
     ils sont déjà chez des gens de bonne foi, et rien ne permet de les
     identifier. Ils s'éteindront d'eux-mêmes ; seuls les nouveaux sont
     révocables. C'est le prix d'un défaut qu'on répare après coup. */
  /* ─── LE VERROU D'APPAREIL ────────────────────────────────────────────────
     Un code offert n'a jamais été lié à l'appareil qui l'a activé : `installID`
     n'existait nulle part, alors que la règle « même code sur deux machines =
     invalidé » était le verrou 3 du design des licences nominatives, marqué
     « à construire » le 23/07 et jamais écrit. Relevé le 17/08, encore vrai en
     ligne le 19/08 sur les huit éditions.
     Ce qu'on pose ici est le verrou LOCAL : l'appareil se donne un identifiant
     au premier lancement, et l'enregistrement d'un code est lié à cet
     identifiant. Copier le stockage d'un téléphone à un autre ne suffit donc
     plus — l'identifiant recopié ne sera pas celui de la machine.
     CE QUE ÇA NE FAIT PAS, et il faut le dire : deux personnes qui saisissent
     le MÊME code sur deux appareils obtenaient chacune leur enregistrement.
     RÉPARÉ le 19/08/2026 : l'activation passe maintenant par le service
     `heritage-licences`, qui garde la trace du premier appareil ayant présenté
     chaque code et refuse les suivants. Le code en clair ne lui est jamais
     envoyé — seulement son empreinte, celle que l'application calcule déjà.
     LES ENREGISTREMENTS EXISTANTS SONT ÉPARGNÉS : ils n'ont pas d'identifiant,
     on le leur pose au premier passage au lieu de les rejeter. Couper l'accès
     de gens de bonne foi pour réparer un défaut qui n'est pas le leur serait
     pire que le défaut. */
  var INSTALL_KEY='the_install';
  function installID(){
    try{
      var v=localStorage.getItem(INSTALL_KEY);
      if(v) return v;
      v=(window.crypto && crypto.randomUUID) ? crypto.randomUUID()
        : (String(Date.now())+Math.random().toString(36).slice(2));
      localStorage.setItem(INSTALL_KEY, v);
      return v;
    }catch(e){ return ''; }
  }
  function inviteActive(){
    var i=inviteRead();
    if(!(i && i.exp && i.exp>Date.now())) return false;
    if(!i.h) return true;                       // enregistrement d'avant le 17/08 : non identifiable
    if(INVITE_HASHES.indexOf(i.h) < 0) return false;   // le code existe-t-il ENCORE ?
    var id=installID();
    if(!id) return true;                        // stockage indisponible : on n'invente pas de refus
    if(!i.dev){                                  // enregistrement d'avant le verrou : on l'adopte
      try{ i.dev=id; localStorage.setItem(INVITE_KEY, JSON.stringify(i)); }catch(e){}
      return true;
    }
    if(i.dev !== id) return false;              // sinon : cet appareil, et lui seul
    revoirSiPromis(i);                          // accepté hors ligne ? on revérifie en fond
    return true;
  }

  /* Compter l'activation, sans rien savoir de la personne.
     Les codes portent le préfixe de qui les a distribués (…-IKBL-…) ; on
     charge la page act/<TAG>.html, qui n'existe que pour émettre une visite
     comptée. Aucune donnée personnelle ne circule : un compteur, pas un
     mouchard. Les pages étaient en ligne depuis le 10/08 — rien ne les avait
     jamais appelées, et aucune activation n'a donc été mesurée depuis. */
  function pingActivation(code){
    try{
      var tags = (window.HConf && HConf.activationTags) || [];
      if(!tags.length) return;                  // édition sans campagne : rien à compter
      var m = String(code||'').toUpperCase().match(/^[A-Z]+-([A-Z0-9]{2,8})-/);
      if(!m || tags.indexOf(m[1]) < 0) return;  // segment central quelconque : ce n'est pas un ambassadeur
      /* Un iframe, PAS une Image. La page act/<TAG>.html ne compte pas parce
         qu'on la télécharge : elle compte parce que son script s'exécute et
         émet la visite. Une Image récupère les octets et s'arrête là — le
         compteur serait resté à zéro, le défaut même qu'on répare ici.
         Vérifié auprès d'un second avis avant d'être écrit. */
      var f = document.createElement('iframe');
      f.setAttribute('aria-hidden', 'true');
      f.setAttribute('title', '');
      f.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px';
      f.src = 'act/' + m[1] + '.html?t=' + Date.now();
      f.onload = function(){ setTimeout(function(){ try{ f.remove(); }catch(e){} }, 4000); };
      document.body.appendChild(f);
    }catch(e){}
  }
  function sha256hex(str){
    try{ var buf=new TextEncoder().encode(str);
      return crypto.subtle.digest('SHA-256', buf).then(function(h){
        return Array.prototype.map.call(new Uint8Array(h), function(b){ return ('0'+b.toString(16)).slice(-2); }).join(''); });
    }catch(e){ return Promise.resolve(''); }
  }
  /* ─── Le service « un code, un appareil » ────────────────────────────────
     Adresse déclarée par l'édition dans heritage.config.js (HConf.licences).
     Édition sans adresse = comportement d'avant, strictement local.

     TROIS RÉPONSES POSSIBLES, et la troisième compte autant que les deux autres :
       { ok:true }                   -> l'appareil a le droit
       { ok:false, autre-appareil }  -> le code est déjà pris ailleurs : refus
       null                          -> service injoignable

     Injoignable ne vaut PAS refus. Quelqu'un qui active son code dans un village
     sans réseau doit pouvoir entrer : on le laisse passer et on marque son
     enregistrement « à vérifier ». La vérification se fera au premier passage
     avec du réseau. Refuser hors ligne punirait les gens de bonne foi pour un
     défaut qui n'est pas le leur. */
  var DELAI_SERVICE = 6000;
  function adresseService(){
    try{ return (window.HConf && HConf.licences) || ''; }catch(e){ return ''; }
  }
  function demanderService(chemin, corps){
    var url = adresseService();
    if(!url || !window.fetch) return Promise.resolve(null);
    var ctl = (window.AbortController) ? new AbortController() : null;
    var minuteur = ctl ? setTimeout(function(){ try{ ctl.abort(); }catch(e){} }, DELAI_SERVICE) : null;
    return fetch(url.replace(/\/+$/,'') + chemin, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(corps), signal: ctl ? ctl.signal : undefined
    })
    .then(function(r){ return r.ok ? r.json() : null; })
    .catch(function(){ return null; })
    .then(function(j){ if(minuteur) clearTimeout(minuteur); return j; });
  }

  /* Revérifier après coup un enregistrement accepté hors ligne. Silencieux :
     si le service dit « autre appareil », l'accès tombe au prochain contrôle ;
     s'il ne répond toujours pas, la marque reste et on retentera plus tard. */
  var _revuLancee = false;
  function revoirSiPromis(fiche){
    if(_revuLancee || !fiche || !fiche.aVerifier || !fiche.h) return;
    if(!adresseService()) return;
    _revuLancee = true;
    demanderService('/activer', { empreinte: fiche.h, appareil: installID(), app: appIso() })
      .then(function(rep){
        if(!rep) return;                                  // toujours injoignable : on retentera
        if(rep.ok){ delete fiche.aVerifier;
          try{ localStorage.setItem(INVITE_KEY, JSON.stringify(fiche)); }catch(e){} return; }
        if(rep.raison === 'autre-appareil'){               // le code appartient à un autre
          try{ localStorage.removeItem(INVITE_KEY); }catch(e){}
        }
      });
  }
  function appIso(){
    try{ return String((window.HConf && (HConf.iso || HConf.pays)) || '').slice(0,32); }catch(e){ return ''; }
  }

  /* La raison du dernier refus, pour que la page premium dise autre chose que
     « code non reconnu » quand le code est bon mais déjà pris ailleurs. */
  var _refus = null;
  function dernierRefus(){ return _refus; }

  function redeem(code){
    var c=String(code||'').trim().toUpperCase();
    return sha256hex(c).then(function(h){
      _refus = null;
      if(!(h && INVITE_HASHES.indexOf(h)>=0)) return false;   // ce code n'existe pas
      /* Le code est bon. Reste à savoir s'il est libre. */
      return demanderService('/activer', { empreinte: h, appareil: installID(), app: appIso() })
        .then(function(rep){
          if(rep && rep.ok === false && rep.raison === 'autre-appareil'){
            _refus = 'autre-appareil';                    // bon code, déjà pris
            return false;
          }
          var now=Date.now();
          /* l'empreinte est gardée : c'est elle qui rend la révocation possible */
          /* on marque l'appareil DÈS l'activation : l'adoption d'après-coup ne sert
             qu'aux enregistrements antérieurs au verrou */
          var fiche = { exp: now + 3650*DAY, ts:now, h:h, dev:installID() };
          if(!rep) fiche.aVerifier = true;                // accepté hors ligne, à revoir
          try{ localStorage.setItem(INVITE_KEY, JSON.stringify(fiche)); }catch(e2){}
          pingActivation(c);
          return true;
        });
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
  /* Remise à zéro pilotée par l'édition : tout essai COMMENCÉ avant HConf.essaiDepuis
     est effacé, l'utilisateur repart pour une période complète. Sert quand on a corrigé
     une cause qui a gâché l'essai de tout le monde. Vide = rien ne bouge. */
  function trialEpoch(){
    var v=(window.HConf&&HConf.essaiDepuis)||0;
    if(!v) return 0;
    var t=(typeof v==='number')?v:Date.parse(v);
    return isNaN(t)?0:t;
  }
  function trialResetIfStale(){
    var ep=trialEpoch(); if(!ep) return false;
    var st=trialStartedTs(); if(!st || st>=ep) return false;
    try{ localStorage.removeItem(TRIAL_FLAG); localStorage.removeItem(TRIAL_KEY); }catch(e){}
    return true;
  }

  function trialMaybeStart(){
    if(!paywallActive()) return false;
    trialResetIfStale();                          // essai d'avant la date d'édition → on repart            // plateforme gratuite : pas d'essai daté
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
    toast(function(){ var a=uiT('pass.gift.thanks'), b=uiT('pass.gift.days'); return (a&&b) ? '🎁 '+a+' <b>'+g+' '+b+'</b>.' : ''; });
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
  /* iOS : distinguer l'APPLICATION du NAVIGATEUR — ils ne doivent PAS voir la même chose.
     ← Avant, isStoreApp() ne regardait que l'agent utilisateur : tout visiteur iPhone du
       SITE WEB voyait « l'abonnement arrive bientôt » au lieu de pouvoir s'abonner.
       Une moitié du trafic mobile ne pouvait pas acheter. (Trouvé le 15/08/2026.)
     Une WebView d'application n'annonce pas « Safari » dans son agent, là où Safari
     mobile le fait toujours — c'est le repère le plus sûr. On accepte aussi le pont
     StoreKit, le mode « installé » et un marqueur d'URL explicite. */
  function isIOSApp(){
    if(!isIOS()) return false;
    try{ if(sessionStorage.getItem('the_store_app')==='1') return true; }catch(e){}
    var marque = hasIAPBridge()
      || navigator.standalone===true
      || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)
      || (new URLSearchParams(location.search)).get('app')==='ios'
      || !/Safari/.test(navigator.userAgent||'');       // WebView, pas Safari
    if(marque){ try{ sessionStorage.setItem('the_store_app','1'); }catch(e){} }
    return !!marque;
  }
  function isStoreApp(){ return isIOSApp() || isAndroidApp(); }
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
  /* i18n par CLÉS, SANS REPLI. Il existait ici une table PASS_FR de sept phrases
     françaises. Comme the-pass.js est chargé AVANT the-i18n.js sur toutes les pages,
     le bandeau d'accueil partait avant que les traductions existent et s'affichait
     en français dans l'interface croate — vu à l'écran sur une capture destinée à
     Apple. Les sept clés étaient pourtant traduites partout : le repli ne servait
     qu'à masquer la course au chargement. On attend maintenant THEi18n.ready
     (une promesse exposée par the-i18n.js) et on n'affiche rien tant qu'elle n'a
     pas tenu. Un bandeau tardif vaut mieux qu'un bandeau dans la mauvaise langue ;
     un bandeau jamais affiché se signale en console, il ne se tait pas. */
  function uiT(key){ try{ var v=(window.THEi18n && THEi18n.ui && THEi18n.ui(key)); return (v && v!==key) ? v : ''; }catch(e){ return ''; } }
  function quandTraduit(faire){
    var t0=Date.now();
    (function attendre(){
      try{
        if(window.THEi18n && THEi18n.ready && typeof THEi18n.ready.then==='function'){
          THEi18n.ready.then(faire); return;
        }
      }catch(e){}
      if(Date.now()-t0 > 8000){
        try{ console.warn('[the-pass] THEi18n indisponible après 8 s — bandeau non affiché'); }catch(e){}
        return;
      }
      setTimeout(attendre, 60);
    })();
  }
  function toast(html, ms){
    /* Une FONCTION est évaluée seulement quand les traductions sont là ; une chaîne
       arrive déjà traduite (THEtoast, appelé par les autres modules) et part tout de suite. */
    if(typeof html==='function'){ quandTraduit(function(){ var s=html(); if(s) _afficher(s, ms); }); return; }
    _afficher(html, ms);
  }
  function _afficher(html, ms){
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
      toast(function(){
        var fin=uiT('pass.trial.ending'), jr=uiT('pass.days'), alb=uiT('pass.save.album');
        if(!fin || !jr) return '';
        return '⏳ '+fin+' <b>'+left+' '+jr+'</b>.'
          + (alb ? ' <a href="itineraire.html" style="color:#c9ad79;text-decoration:underline">'+alb+'</a>' : '');
      }, 12000);
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
    toast(function(){ var a=uiT('pass.trial.welcome'); return a ? '🎁 '+a : ''; });
  }
  function inviteToast(){
    var ok; try{ ok=localStorage.getItem('the_invite_ok'); }catch(e){}
    if(!ok) return; try{ localStorage.removeItem('the_invite_ok'); }catch(e){}
    toast(function(){ var a=uiT('pass.invite.welcome'); return a ? '🎁 '+a : ''; });
  }

  window.THEPass={ isActive:isActive, activate:activate, deactivate:deactivate, info:info,
                   buy:buy, checkoutURL:checkoutURL, handleReturn:handleReturn,
                   isIOS:isIOS, isIOSApp:isIOSApp, isAndroidApp:isAndroidApp, isStoreApp:isStoreApp, hasIAPBridge:hasIAPBridge, buyIOS:buyIOS, restoreIOS:restoreIOS,
                   hasPlayBridge:hasPlayBridge, buyAndroid:buyAndroid, restoreAndroid:restoreAndroid,
                   iapUnlock:iapUnlock, iapExpire:iapExpire, IAP_PRODUCT:IAP_PRODUCT,
                   grantFeature:grantFeature, hasFeature:hasFeature, giftRandom:giftRandom, GIFT_POOL:GIFT_POOL,
                   premiumLive:premiumLive, redeem:redeem, redeemLicense:redeemLicense, inviteActive:inviteActive,
                   dernierRefus:dernierRefus,
                   trialActive:trialActive, trialUsed:function(){ return !!trialStartedTs(); },
                   PLAN:PLAN, PERIOD:PERIOD, TRIAL_DAYS:TRIAL_DAYS, GIFT_DAYS:GIFT_DAYS,
                   DAYS:DAYS, PRICE:PRICE, CHECKOUT:CHECKOUT, APPSTORE_URL:APPSTORE_URL, PLAYSTORE_URL:PLAYSTORE_URL };

  /* LE TOAST DEVIENT PARTAGÉ. Les modules (the-carnet, roadtrip-plan, the-souvenir)
     appelaient alert() — le dialogue natif qui, en WKWebView, peut ne jamais rendre
     la main et figer la page : c'est la famille du rejet 2.1(a). Le toast existait
     déjà ici, en privé. On l'expose plutôt que d'en réécrire trois.
     the-pass.js est chargé sur index, liste et itineraire — partout où ils vivent. */
  window.THEtoast = function(msg, ms){ try{ if(msg) toast(String(msg), ms); }catch(e){} };
  /* ═══ VERROU GLOBAL ═══
     Sans essai/abonnement/code actif, toute page « contenu » renvoie vers le
     paywall (premium.html). On laisse toujours ouvertes : le paywall lui-même,
     le soutien, et les pages légales/aide (exigées par Apple près de l'achat).
     Placé tôt (the-pass.js est chargé en <head>) → pas de contenu qui clignote. */
  /* ─── PLUS DE MUR DE NAVIGATION (15/08/2026) ───────────────────────────────
     Règle posée par Helmy : « un essai actif ne doit JAMAIS masquer le paywall,
     un essai fini ne doit JAMAIS masquer la navigation. »

     Avant, cette fonction faisait `location.replace('premium.html')` dès l'essai
     terminé. Elle coupait 10 pages sur 18 — dont la CARTE, la LISTE et
     l'ITINÉRAIRE — et le paywall n'offrait aucun retour. L'application ne
     paraissait pas payante, elle paraissait cassée : c'est ce qu'Apple a décrit
     en rejetant une édition (« could not proceed further and could not return to
     the previous menu », puis « the app contents did not load »).

     Le mur faisait DOUBLON : le verrouillage par fonction existe déjà et couvre
     le modèle freemium — `requirePass()` et `isPremium()` dans itineraire.html
     (2 itinéraires max, circuits limités par FREE_TOURS, thèmes premium),
     liste.html (détail, légendes), index.html (itinéraires sur mesure), et
     `hasFeature()` ici même. On garde ces verrous, on retire le mur global.

     `gate()` est conservée — vide — pour ne pas casser l'ordre d'appel plus bas
     et pour rester le point d'accroche si un bandeau non bloquant est ajouté. */
  function gate(){ /* volontairement sans effet — voir le commentaire ci-dessus */ }

  handleReturn();       // retour paiement / lien invité
  trialMaybeStart();    // démarre l'essai (une seule fois)
  gate();               // ← MUR : après l'essai, tout renvoie au paywall SAUF bienvenue (vitrine libre)
  openAlbumIfFlagged(); // à la 1re activation : ouvre l'album par défaut
  trialEndNudge();      // rappel « enregistrez votre album » dans les 3 derniers jours
  showGiftToast();      // cadeau pourboire éventuel
  trialToast();         // bienvenue essai
  inviteToast();        // bienvenue accès offert
})();
