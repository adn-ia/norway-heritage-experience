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
        name: _HC.marque || 'Heritage Experience',
        short_name: _HC.marqueCourte || _HC.marque || 'Heritage',
        description: 'Patrimoine, itinéraires et carnet de voyage, hors-ligne.',
        id: '/?app=' + _HC.iso,
        start_url: 'bienvenue.html',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#2b2318',
        theme_color: '#2b2318',
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
      _t.setAttribute('content', _HC.marqueCourte || _HC.marque || 'Heritage');
    }
  }catch(e){}

  var DATA=null, UI=null;
  function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,' ').trim(); }

  // « UN FICHIER, UN PAYS » — interpolation à l'exécution : les libellés ui.*.json contiennent
  // des tokens (__MARQUE__, __MARQUE_COURTE__, __PAYS__, __PAYS_MAJ__, __LANGUE_NAT__, __ENDONYME__)
  // remplis depuis HConf → ui.*.json restent 100% génériques, seul heritage.config.js change.
  function _pick(v){ if(v && typeof v==='object') return v[lang]||v.fr||v.en||''; return v||''; }
  function fillStr(s){
    if(typeof s!=='string' || s.indexOf('__')<0) return s;
    var H=window.HConf||{}, pays=_pick(H.pays), langueNat=_pick(H.langueNat);
    return s.replace(/__MARQUE_MARK__/g,   H.marqueMark||H.marque||'')
            .replace(/__MARQUE_COURTE__/g, H.marqueCourte||'')
            .replace(/__MARQUE__/g,        H.marque||'')
            .replace(/__PAYS_DE__/g,       (H.paysDe|| ('de '+pays)))
            .replace(/__LE_PAYS__/g,       (_pick(H.paysLe)|| pays))
            .replace(/__PAYS_MAJ__/g,      (pays||'').toLocaleUpperCase())
            .replace(/__PAYS__/g,          pays)
            .replace(/__LANGUE_NAT__/g,    langueNat)
            .replace(/__langue_nat__/g,    (langueNat||'').toLocaleLowerCase())
            .replace(/__ENDONYME__/g,      H.endonyme||'');
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
        b.textContent=FLAG[k]||'🏳️';
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

  // chargement (contenu + interface) avant rendu
  var ready = Promise.all([
    fetch('i18n/'+lang+'.json').then(function(r){return r.json();}).then(function(d){DATA=d;}).catch(function(){}),
    fetch('i18n/ui.'+lang+'.json').then(function(r){return r.json();}).then(function(d){UI=fillAll(d); try{applyUI(document.body);}catch(e){} }).catch(function(){})
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
  window.uiT=function(k,vars){
    var s=(UI&&UI[k]!=null)?UI[k]:k;
    if(vars) for(var p in vars){ s=s.split('{'+p+'}').join(vars[p]); }
    return s;
  };
})();
