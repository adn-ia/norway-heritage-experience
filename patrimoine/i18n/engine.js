/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — moteur i18n minimal, PROPRE à la sous-app (non partagé).
   Mirroir du pattern de la gamme (data-i18n + uiT + token __MARQUE__), mais
   c'est une infrastructure À ELLE : aucun fichier commun avec l'app principale.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var cfg = window.PAT || {};
  var LANGS = cfg.langs || ['fr'];
  var DEF   = cfg.defaultLang || 'fr';
  var LS    = 'the_lang';   // PORTE la langue de l'hôte (clé partagée, comme les briques strictes) : patrimoine s'ouvre dans la langue choisie dans l'app, et l'y renvoie. Seul contact « doux » — i18n/données restent propres.
  var UI    = {};

  function lang(){
    try{ var l = localStorage.getItem(LS) || DEF; return LANGS.indexOf(l) >= 0 ? l : DEF; }
    catch(e){ return DEF; }
  }
  // Interpolation de tokens neutres (jamais de nom de pays en dur).
  function tok(s){
    if(typeof s !== 'string') return s;
    return s.replace(/__MARQUE__/g, cfg.marque || 'Patrimoine');
  }
  function uiT(k, vars){
    var s = (UI && UI[k] != null) ? UI[k] : k;
    s = tok(s);
    if(vars) for(var v in vars) s = s.replace(new RegExp('\\{' + v + '\\}', 'g'), vars[v]);
    return s;
  }
  function apply(root){
    root = root || document;
    root.querySelectorAll && root.querySelectorAll('[data-i18n]').forEach(function(el){ el.textContent = uiT(el.getAttribute('data-i18n')); });
    root.querySelectorAll && root.querySelectorAll('[data-i18n-html]').forEach(function(el){ el.innerHTML = uiT(el.getAttribute('data-i18n-html')); });
    root.querySelectorAll && root.querySelectorAll('[data-i18n-ph]').forEach(function(el){ el.setAttribute('placeholder', uiT(el.getAttribute('data-i18n-ph'))); });
    root.querySelectorAll && root.querySelectorAll('[data-i18n-aria]').forEach(function(el){ el.setAttribute('aria-label', uiT(el.getAttribute('data-i18n-aria'))); });
    var t = document.querySelector('title[data-i18n]'); if(t) document.title = uiT(t.getAttribute('data-i18n'));
  }
  function setLang(l){ try{ localStorage.setItem(LS, l); }catch(e){} location.reload(); }
  function boot(){
    var l = lang();
    document.documentElement.setAttribute('lang', l);
    document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
    return fetch('i18n/' + l + '.json')
      .then(function(r){ return r.json(); })
      .then(function(j){
        UI = j || {};
        apply(document);
        try{
          var mo = new MutationObserver(function(ms){
            ms.forEach(function(m){ m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function(n){ if(n.nodeType === 1) apply(n); }); });
          });
          mo.observe(document.body, { childList:true, subtree:true });
        }catch(e){}
      })
      .catch(function(){ apply(document); });
  }
  window.PATi18n = { uiT:uiT, lang:lang, setLang:setLang, apply:apply, boot:boot, langs:LANGS };
})();
