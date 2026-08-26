/* Heritage — internationalisation (affichage multilingue).
   - Contenu des fiches : i18n/<lang>.json (clé = norm(nom) → carnet stable, noms en FR).
   - Interface : i18n/ui.<lang>.json + attributs data-i18n="clé" sur les éléments à traduire.
   - Sélecteur de langue « globe » discret, injecté dans #langSwitch.
   À inclure tôt : <script src="the-i18n.js"></script>. */
(function(){
  // VOIX : ne jamais PRONONCER emojis/symboles ("👋" → "waving sign"). Filtre GLOBAL sur
  // SpeechSynthesisUtterance → couvre toutes les lectures navigateur (récit, fiche, voyage…).
  try{
    var _U=window.SpeechSynthesisUtterance;
    if(_U && !_U.__stripped){
      var _EMO=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2300}-\u{23FF}\u{200D}\u{20E3}\u{2022}]/gu;
      var _clean=function(s){ return String(s==null?'':s).replace(_EMO,'').replace(/\s{2,}/g,' ').trim(); };
      var _P=function(t){ var u=new _U(_clean(t)); return u; };
      _P.prototype=_U.prototype; _P.__stripped=true;
      window.SpeechSynthesisUtterance=_P;
    }
  }catch(e){}
  // « UN FICHIER, UN PAYS » : les langues dispo = FR + EN + la langue NATIONALE, déduite de
  // HConf.langNatCode (ex. "ga","it","pt","hr","cs"). Aucune langue en dur ici ni dans la garde.
  var _HC=(window.HConf||{});
  var LANGS={ fr:'lang.fr', en:'lang.en' };
  [].concat(_HC.langNatCode||[]).forEach(function(c){ if(c) LANGS[c]='lang.'+c; });  // string OU liste (pays bilingue ex. FI: ["fi","sv"])
  // table drapeaux générique (code langue → emoji) ; repli neutre 🏳️
  var FLAG={ fr:'🇫🇷', en:'🇬🇧', ga:'🇮🇪', it:'🇮🇹', pt:'🇵🇹', hr:'🇭🇷', cs:'🇨🇿', et:'🇪🇪', de:'🇩🇪', es:'🇪🇸', nl:'🇳🇱', pl:'🇵🇱', ar:'🇸🇦' };
  var CODE={ fr:'FR', en:'EN', it:'IT', de:'DE', ar:'ع' };
  var lang; try{ lang=localStorage.getItem('the_lang')||'fr'; localStorage.setItem('the_lang', lang); }catch(e){ lang='fr'; }
  if(!LANGS[lang]) lang='fr';

  // « UN FICHIER, UN PAYS » — MANIFEST PWA généré depuis HConf : nom + id UNIQUES par pays.
  // Sinon toutes les éditions partagent le même id ("/?app=heritage") → collision à l'installation
  // (installer/ouvrir une app en ouvre une autre déjà installée, ex. IE → EHE). Le manifest.json
  // statique reste un repli ; ce bloc l'écrase à l'exécution avec les valeurs du pays courant.
  try{
    var _mfLink=document.querySelector('link[rel="manifest"]');
    if(_mfLink && _HC.iso){
      var _mf={
        name: _pick(_HC.marque) || 'Heritage Experience',
        short_name: _pick(_HC.marqueCourte) || _pick(_HC.marque) || 'Heritage',
        description: 'Patrimoine, itinéraires et carnet de voyage, hors-ligne.',
        id: '/?app=' + _HC.iso,
        start_url: 'bienvenue.html',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2b2318',
        theme_color: '#2b2318',
        // même cible de partage que dans heritage.config.js : ce bloc ÉCRASE
        // le manifeste, il doit donc la reconduire ou elle disparaîtrait.
        share_target: { action:'itineraire.html', method:'GET',
                        params:{ title:'titre', text:'texte', url:'lien' } },
        icons: [
          { src:'icon-192.png', sizes:'192x192', type:'image/png', purpose:'any' },
          { src:'logo-the.png', sizes:'512x512', type:'image/png', purpose:'any' },
          { src:'icon-maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable' }
        ]
      };
      _mfLink.setAttribute('href', URL.createObjectURL(new Blob([JSON.stringify(_mf)],{type:'application/manifest+json'})));
      // iOS : nom affiché sur l'écran d'accueil (Safari lit cette meta, pas seulement le manifest)
      var _t=document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if(!_t){ _t=document.createElement('meta'); _t.setAttribute('name','apple-mobile-web-app-title'); document.head.appendChild(_t); }
      _t.setAttribute('content', _pick(_HC.marqueCourte) || _pick(_HC.marque) || 'Heritage');
    }
  }catch(e){}

  var DATA=null, UI=null;
  function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }

  // « UN FICHIER, UN PAYS » — interpolation à l'exécution : les libellés ui.*.json contiennent
  // des tokens (__MARQUE__, __MARQUE_COURTE__, __PAYS__, __PAYS_MAJ__, __LANGUE_NAT__, __ENDONYME__, __NB_LIEUX__)
  // remplis depuis HConf → ui.*.json restent 100% génériques, seul heritage.config.js change.
  function _pick(v){ if(v && typeof v==='object') return v[lang]||v.fr||v.en||''; return v||''; }
  function fillStr(s){
    if(typeof s!=='string' || s.indexOf('__')<0) return s;
    var H=window.HConf||{}, pays=_pick(H.pays), langueNat=_pick(H.langueNat);
    /* TOUT passe par _pick : une valeur de HConf peut être une chaîne OU un
       objet par langue. « paysDe » était lu brut et rendait « [object Object] »
       en pleine page d'accueil — « Sites antiques, monuments et paysages
       [object Object] ». Les autres jetons sont filtrés par prudence : sur une
       chaîne, _pick ne fait rien. */
    return s.replace(/__MARQUE_MARK__/g,   _pick(H.marqueMark)||_pick(H.marque)||'')
            .replace(/__MARQUE_COURTE__/g, _pick(H.marqueCourte)||'')
            .replace(/__MARQUE__/g,        _pick(H.marque)||'')
            .replace(/__PAYS_DE__/g,       (_pick(H.paysDe)|| ('de '+pays)))
            .replace(/__LE_PAYS__/g,       (_pick(H.paysLe)|| pays))
            .replace(/__PAYS_MAJ__/g,      (pays||'').toLocaleUpperCase())
            .replace(/__PAYS__/g,          pays)
            .replace(/__LANGUE_NAT__/g,    langueNat)
            .replace(/__langue_nat__/g,    (langueNat||'').toLocaleLowerCase())
            .replace(/__NB_LIEUX__/g,      _pick(H.nbLieux)||'')
            .replace(/__ENDONYME__/g,      _pick(H.endonyme)||'');
  }
  function fillAll(o){ if(o) for(var k in o){ if(typeof o[k]==='string') o[k]=fillStr(o[k]); } return o; }

  if(lang==='ar') document.documentElement.setAttribute('dir','rtl');
  document.documentElement.setAttribute('lang', lang);

  // styles du sélecteur (injectés une fois)
  var css='#langSwitch{background:rgba(255,255,255,.15);color:#f6ecd8;border:1px solid rgba(255,255,255,.32);border-radius:999px;'
   +'padding:4px 10px;font-size:13px;font-family:inherit;cursor:pointer;-webkit-appearance:none;appearance:none;outline:none;max-width:140px;}'
   +'#langSwitch:hover{background:rgba(255,255,255,.26);}'
   +'#langSwitch option{color:#2b2318;background:#fffdf8;}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // Sélecteur intelligent : une langue n'est proposée que si elle est « prête »
  // (manifeste i18n/langs.json, généré par le build/audit-langues : ready=true si ≥90% UI+desc).
  // Pas de manifeste → rétro-compatible, on affiche tout.
  var READY=null;
  /* Le drapeau de la LANGUE NATIONALE se déduit du code pays de HConf : deux
     lettres ISO donnent l'emoji correspondant. Sans cela on écrivait un drapeau
     en dur — et une édition affichait celui d'une autre, tandis que la table
     générique proposait pour l'arabe un drapeau qui n'est le pays de personne.
     Une langue n'est pas un pays : seul le pays de l'ÉDITION a un drapeau. */
  function drapeauNational(code) {
    var nat = [].concat((window.HConf && HConf.langNatCode) || []);
    if (nat.indexOf(code) < 0) return '';
    var iso = String((window.HConf && HConf.iso) || '').toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) return '';
    try {
      return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65,
                                  0x1F1E6 + iso.charCodeAt(1) - 65);
    } catch (e) { return ''; }
  }

  function availLangs(){
    return Object.keys(LANGS).filter(function(k){ return k==='fr' || !READY || (READY[k] && READY[k].ready); });
  }
  function buildSwitcher(){
    var avail=availLangs();
    var sel=document.getElementById('langSwitch');
    if(sel && !sel._done && sel.tagName==='SELECT'){ sel._done=true; sel.innerHTML='';
      avail.forEach(function(k){ var o=document.createElement('option'); o.value=k; o.textContent=(UI&&UI[LANGS[k]])||LANGS[k]; if(k===lang)o.selected=true; sel.appendChild(o); });
      sel.onchange=function(){ try{ localStorage.setItem('the_lang',sel.value); }catch(e){} location.reload(); };
    }
    // picker « drapeaux » de la page d'accueil : GÉNÉRÉ dynamiquement depuis les langues dispo
    // (jamais de drapeau en dur dans bienvenue.html — #langPick est un conteneur vide).
    var pick=document.getElementById('langPick');
    if(pick && !pick._done){ pick._done=true; pick.innerHTML='';
      avail.forEach(function(k){
        var b=document.createElement('button');
        b.setAttribute('data-l', k);
        b.setAttribute('data-i18n-title', LANGS[k]);
        b.textContent=drapeauNational(k)||FLAG[k]||'🏳️';
        b.title=(UI&&UI[LANGS[k]])||k;
        if(k===lang) b.classList.add('on');
        b.onclick=function(){ try{ localStorage.setItem('the_lang', k); }catch(e){} location.reload(); };
        pick.appendChild(b);
      });
    }
  }
  function wireSwitcher(){
    fetch('i18n/langs.json').then(function(r){return r.json();}).then(function(m){READY=m;})
      .catch(function(){READY=null;}).then(buildSwitcher);
  }

  function applyUI(root){
    if(!UI) return;   // FR inclus : les libellés viennent de ui.fr.json
    root=(root && root.querySelectorAll)?root:document.body; if(!root) return;   // robuste si appelé via un event
    // 1) éléments explicitement tagués
    root.querySelectorAll('[data-i18n]').forEach(function(el){ var k=el.getAttribute('data-i18n'); if(UI[k]) el.textContent=UI[k]; });
    // texte riche (contient du balisage inline : <b>, <br>, <a>…) -> innerHTML
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
      });
      root.querySelectorAll('input[placeholder],textarea[placeholder]').forEach(function(el){
        var k=(el.getAttribute('placeholder')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('placeholder',UI[k]); });
      root.querySelectorAll('[title]').forEach(function(el){
        var k=(el.getAttribute('title')||'').replace(/ /g,' ').trim(); if(UI[k]) el.setAttribute('title',UI[k]); });
    }catch(e){}
    try{ if(document.title){ document.title=document.title.split(/\s+[\u2014\u2013]\s+/).map(function(p){var k=p.replace(/\u00a0/g,' ').trim(); return UI[k]||p;}).join(' \u2014 '); } }catch(e){}
  }

  /* ── Chargement, avec REPLI EN CHAÎNE ──────────────────────────────────────
     Avant : un seul dictionnaire. Une clé absente laissait `UI[k]` indéfini, et
     comme la plupart des éléments sont écrits vides — `<span data-i18n="x"></span>` —
     le voyageur ne voyait RIEN. Pas le français : rien. Un trou blanc à l'écran.
     C'est ce qui a rendu la dette de traduction bloquante : on ne pouvait pas
     livrer une langue à 91 % sans afficher 9 % de vide.

     Désormais on charge aussi l'anglais puis le français, et on les met SOUS la
     langue choisie : elle gagne partout où elle existe, et là où elle manque le
     voyageur lit une phrase — en anglais, à défaut en français — au lieu d'un vide.
     Le français est la source de vérité : il ferme la chaîne, il ne manque jamais.

     Ni traduction inventée ni texte en dur : ce sont les mêmes fichiers, seulement
     empilés dans le bon ordre. Et le jour où la traduction arrive, elle recouvre
     le repli sans qu'on touche à une ligne de code. */
  var CHAINE = [lang, 'en', 'fr'].filter(function(v,i,a){ return a.indexOf(v)===i; });
  function dico(lg){
    return fetch('i18n/ui.'+lg+'.json')
      .then(function(r){ return r.ok ? r.json() : {}; })
      .catch(function(){ return {}; });
  }
  var ready = Promise.all([
    fetch('i18n/'+lang+'.json').then(function(r){return r.json();}).then(function(d){DATA=d;}).catch(function(){}),
    Promise.all(CHAINE.map(dico)).then(function(dicos){
      var fondu = {};
      for (var i = dicos.length - 1; i >= 0; i--) {          // du repli vers la langue choisie
        var d = dicos[i] || {};
        for (var k in d) if (String(d[k] == null ? '' : d[k]).trim()) fondu[k] = d[k];
      }
      UI = fillAll(fondu);
      try{ applyUI(document.body); }catch(e){}
    }).catch(function(){})
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
    try{ var _s=document.getElementById('langSwitch'); if(_s&&UI) [].forEach.call(_s.options,function(o){ if(UI[LANGS[o.value]]) o.textContent=UI[LANGS[o.value]]; }); }catch(e){}
  });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',wireSwitcher); else wireSwitcher();

  // Stockage DURABLE : demande au navigateur de ne jamais effacer le carnet photo
  // (IndexedDB) ni l'itineraire (localStorage), meme sous pression de stockage.
  try{ if(navigator.storage && navigator.storage.persist){
    navigator.storage.persisted().then(function(p){ if(!p) navigator.storage.persist(); }).catch(function(){});
  } }catch(e){}

  window.THEi18n={
    lang:function(){return lang;}, ready:ready, isFr:function(){return lang==='fr';}, isRTL:function(){return lang==='ar';},
    LANGS:LANGS, set:function(l){ try{localStorage.setItem('the_lang',l);}catch(e){} location.reload(); },
    site:function(nom){ if(!DATA||!DATA.sites) return null; return DATA.sites[norm(nom)]||null; },
    cat:function(v){ if(!DATA||!DATA.cat||!v) return v; return DATA.cat[v]||v; },
    ui:function(k){ return (UI&&UI[k])||null; }, applyUI:applyUI,
    t:function(k,fb){ return (UI&&UI[k]) || fb || k; },   // clé -> libellé
    // chemin d'un JSON traduit (ex: data('tours') → 'i18n/tours.en.json' ou 'tours.json' en FR)
    data:function(base){ return lang==='fr' ? base+'.json' : 'i18n/'+base+'.'+lang+'.json'; }
  };

  // ── Crédit photo — format GÉNÉRIQUE (aucune donnée pays ici) ────────────────
  // `photo_credit` vaut soit une CHAÎNE (anciennes éditions), soit un OBJET
  // {auteur, licence, url}. Les deux doivent s'afficher, jamais « [object Object] ».
  //   THEcredit.text(pc) → texte brut (« Auteur · CC BY-SA 4.0 ») pour regrouper/compter
  //   THEcredit.html(pc) → HTML échappé, lien vers la page Commons si `url`
  function credEsc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function credText(pc){
    if(!pc) return '';
    if(typeof pc==='string') return pc;
    return [pc.auteur,pc.licence].filter(Boolean).join(' · ');
  }
  window.THEcredit={
    text:credText,
    html:function(pc){
      var t=credText(pc); if(!t) return '';
      var u=(pc && typeof pc==='object') ? pc.url : '';
      return u ? '<a href="'+credEsc(u)+'" target="_blank" rel="noopener">'+credEsc(t)+'</a>' : credEsc(t);
    }
  };

  // Alias global uiT(clé[,vars]) — compat gamme : tout le code des pages appelle uiT('clé').
  // Renvoie le libellé de la clé dans la langue courante (UI chargé pour TOUTES les langues, FR inclus),
  // avec substitution {placeholder}, et repli sur la clé si absente.
  /* _pick EXPOSÉ. Six champs de HConf sont des objets par langue ; sept endroits
     les lisaient bruts et rendaient « [object Object] » — dont l'en-tête de la page
     de confidentialité, celle que l'examinateur Apple ouvre. Le sélecteur existait
     déjà, il était seulement privé. Il rend '' quand rien ne convient : l'appelant
     garde donc son propre repli. */
  window.THEi18n.pick=_pick;

  window.uiT=function(k,vars){
    var s=(UI&&UI[k]!=null)?UI[k]:k;
    if(vars) for(var p in vars){ s=s.split('{'+p+'}').join(vars[p]); }
    return s;
  };
})();

/* TOAST PARTAGÉ — remplace alert(), le dialogue natif qui, en WKWebView, peut ne
   jamais rendre la main et figer la page (famille du rejet 2.1(a)).
   Défini ici parce que the-i18n.js est chargé sur toutes les pages.
   the-pass.js en pose une version plus soignée quand il est présent : on n'écrase
   donc que s'il n'y a rien (||). */
window.THEtoast = window.THEtoast || function(msg, ms){
  try{
    if(!msg) return;
    var d=document.createElement('div'); d.setAttribute('role','status');
    d.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;'+
      'max-width:92%;background:#2b2318;color:#f6f0e4;padding:11px 16px;border-radius:10px;'+
      'font:15px/1.4 system-ui,sans-serif;box-shadow:0 8px 26px rgba(0,0,0,.28);text-align:center;';
    d.textContent=String(msg);
    document.body.appendChild(d);
    setTimeout(function(){ try{ d.remove(); }catch(e){} }, ms||3800);
  }catch(e){}
};
