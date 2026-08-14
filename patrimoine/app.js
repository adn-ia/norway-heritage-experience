/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — rendu de la liste (sous-app autonome, aucune dépendance externe).
   Lit SA donnée exclusive (import INP) : liste + filtres (état, gouvernorat,
   recherche) + modale de fiche. Tout libellé passe par PATi18n (i18n propre).
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var CFG   = window.PAT || {};
  var PERIL = {}; (CFG.perilStates||[]).forEach(function(s){ PERIL[s]=1; });
  function T(k,v){ return window.PATi18n ? PATi18n.uiT(k,v) : k; }
  function nf(n){ try{ return Number(n).toLocaleString(PATi18n?PATi18n.lang():'fr'); }catch(e){ return ''+n; } }

  var SITES = [], CLASSES_COUNT = 0;
  var Q = '', GOV = '', ETAT = '', CLASSE = false;   // ETAT ∈ '', 'peril', 'moyen', 'bon' · CLASSE = classés INP seulement
  // Photos par site : contributions VALIDÉES (via feed.js) + sources libres sourcées (data/photos.json).
  // JAMAIS l'INP (photos probablement protégées). siteId → TABLEAU de {url,credit,par?,source?,sourceUrl?}
  var COMMUNITY_PHOTOS = {}, STATIC_PHOTOS = {};   // siteId → [photo, …]
  var _sheetSite = null;
  function arr(v){ return !v ? [] : (Array.isArray(v) ? v : [v]); }
  function photosFor(id){ return id ? arr(COMMUNITY_PHOTOS[id]).concat(arr(STATIC_PHOTOS[id])) : []; }
  function photoFor(id){ return photosFor(id)[0] || null; }   // 1re = vignette de la carte
  function photoCred(ph){ return ph ? (ph.credit || [ph.source, ph.par].filter(Boolean).join(' · ') || '') : ''; }

  // état (donnée) → suffixe de clé i18n
  function slug(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,''); }
  function etatLabel(e){ return T('patrimoine.etat.'+(slug(e)||'inconnu')); }
  function etatClass(e){
    if(!e) return 'na';
    if(PERIL[e]) return 'peril';
    if(e==='Moyen') return 'moyen';
    if(e==='Bon'||e==='Mis en valeur') return 'bon';
    return 'na';
  }

  function matches(s){
    if(GOV && s.gov!==GOV) return false;
    if(ETAT && etatClass(effEtat(s))!==ETAT) return false;
    if(CLASSE && effClasse(s)!=='Oui') return false;
    if(Q){ var q=Q.toLowerCase();
      if((s.nom||'').toLowerCase().indexOf(q)<0 && (s.localite||'').toLowerCase().indexOf(q)<0) return false; }
    return true;
  }

  function card(s){
    var ec = etatClass(effEtat(s));
    var ph = photoFor(s.id);
    var el = document.createElement('div'); el.className = 'card '+ec+(ph?' has-photo':'');
    el.innerHTML =
      (ph ? '<div class="card-thumb"></div>' : '') +
      '<div class="card-main"><h3></h3><p class="loc"></p><div class="tags"><span class="tag etat '+ec+'"></span></div></div>';
    if(ph) el.querySelector('.card-thumb').style.backgroundImage = "url('"+String(ph.url).replace(/["'\\]/g,encodeURIComponent)+"')";
    el.querySelector('h3').textContent = s.nom || '—';
    el.querySelector('.loc').textContent = [effLoc(s), s.gov].filter(Boolean).join(' · ');
    el.querySelector('.tag.etat').textContent = etatLabel(effEtat(s));
    if(effClasse(s)==='Oui'){
      var t=document.createElement('span'); t.className='tag classe'; t.textContent=T('patrimoine.badge.classe');
      el.querySelector('.tags').appendChild(t);
    }
    el.addEventListener('click', function(){ openSheet(s); });
    return el;
  }

  function render(){
    var list = document.getElementById('list'); list.innerHTML='';
    var arr = SITES.filter(matches);
    var frag = document.createDocumentFragment();
    for(var i=0;i<arr.length;i++) frag.appendChild(card(arr[i]));
    list.appendChild(frag);
    document.getElementById('empty').style.display = arr.length ? 'none' : 'block';
    document.getElementById('count').textContent = T('patrimoine.compte', { n: nf(arr.length) });
  }

  function openSheet(s){
    var sheet = document.getElementById('sheet'), ec = etatClass(effEtat(s));
    var osm = 'https://www.openstreetmap.org/?mlat='+s.lat+'&mlon='+s.lon+'#map=15/'+s.lat+'/'+s.lon;
    function row(k,v){ return v ? '<div class="r"><span class="k">'+k+'</span><span class="v">'+v+'</span></div>' : ''; }
    function mk(field){ return corrHas(s.id,field) ? ' <span class="corrige">'+esc(T('patrimoine.fiche.corrige'))+'</span>' : ''; }
    var cNote = (corr(s.id)&&corr(s.id).note) ? corr(s.id).note : '';
    sheet.innerHTML =
      '<button class="close" aria-label="x">×</button>'+
      '<h2></h2>'+
      '<p class="sub"></p>'+
      '<div class="fiche-gallery"></div>'+
      '<div class="rows">'+
        row(T('patrimoine.fiche.gouvernorat'), esc(s.gov))+
        row(T('patrimoine.fiche.localite'), esc(effLoc(s))+mk('localite'))+
        row(T('patrimoine.fiche.etat'), '<span style="color:var(--'+(ec==='na'?'stone':ec)+')">'+esc(etatLabel(effEtat(s)))+'</span>'+mk('etat'))+
        row(T('patrimoine.fiche.statut'), (effClasse(s)==='Oui'?T('patrimoine.fiche.classe.oui'):T('patrimoine.fiche.classe.non'))+mk('classe'))+
        row(T('patrimoine.fiche.coords'), (s.lat!=null?(s.lat.toFixed(5)+', '+s.lon.toFixed(5)):''))+
      '</div>'+
      (cNote ? '<div class="fiche-note"><span class="fn-k">'+esc(T('patrimoine.fiche.note'))+'</span> '+esc(cNote)+'</div>' : '')+
      '<div class="fiche-edit"></div>'+
      '<div class="fiche-enrich"></div>'+
      '<a class="maplink" target="_blank" rel="noopener" href="'+osm+'"></a>'+
      '<div class="fc"></div>'+
      '<div class="soon"></div>'+
      '<p class="src"></p>';
    sheet.querySelector('h2').textContent = s.nom||'—';
    sheet.querySelector('.sub').textContent = [effLoc(s),s.gov].filter(Boolean).join(' · ');
    sheet.querySelector('.maplink').textContent = T('patrimoine.fiche.carte');
    sheet.querySelector('.soon').textContent = T('patrimoine.fiche.soon');
    sheet.querySelector('.src').textContent = T('patrimoine.fiche.source');
    sheet.querySelector('.close').addEventListener('click', closeSheet);
    fillGallery(sheet.querySelector('.fiche-gallery'), s);
    fillEnrich(sheet.querySelector('.fiche-enrich'), s);
    fillFicheEdit(sheet.querySelector('.fiche-edit'), s);
    buildFicheContrib(sheet.querySelector('.fc'), s);
    _sheetSite = s;
    document.getElementById('modal').classList.add('on');
  }
  // Édition de la fiche (privilégiés) : corrige état / localité / classement + note → couche `corrections`.
  function fillFicheEdit(el, s){
    if(!el || !isPriv() || !(window.PatFB && PatFB.ready)) { if(el) el.innerHTML=''; return; }
    var c = corr(s.id) || {};
    el.innerHTML =
      '<button type="button" class="fe-edit-toggle"></button>'+
      '<form class="fe-edit-form" hidden novalidate>'+
        '<label class="fc-lbl">'+esc(T('patrimoine.fiche.etat'))+'</label>'+
        '<select class="fc-i" data-e="etat">'+etatOptions(c.etat||s.etat)+'</select>'+
        '<label class="fc-lbl">'+esc(T('patrimoine.fiche.localite'))+'</label>'+
        '<input class="fc-i" data-e="localite">'+
        '<label class="fc-rights"><input type="checkbox" data-e="classe"> <span>'+esc(T('patrimoine.fiche.classe.oui'))+'</span></label>'+
        '<label class="fc-lbl">'+esc(T('patrimoine.fiche.note'))+'</label>'+
        '<textarea class="fc-i fc-ta" data-e="note" rows="2"></textarea>'+
        '<div class="fc-msg" role="status"></div>'+
        '<button type="submit" class="fc-send"></button>'+
      '</form>';
    var toggle=el.querySelector('.fe-edit-toggle'), form=el.querySelector('.fe-edit-form');
    function q(f){ return form.querySelector('[data-e="'+f+'"]'); }
    toggle.textContent=T('patrimoine.fiche.modifier');
    q('localite').value = (c.localite!=null?c.localite:s.localite)||'';
    q('classe').checked = (effClasse(s)==='Oui');
    q('note').value = c.note||'';
    q('note').placeholder = T('patrimoine.fiche.note.ph');
    form.querySelector('.fc-send').textContent=T('patrimoine.mod.enregistrer');
    toggle.addEventListener('click', function(){ var o=form.hasAttribute('hidden'); if(o) form.removeAttribute('hidden'); else form.setAttribute('hidden',''); });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var msg=form.querySelector('.fc-msg'), send=form.querySelector('.fc-send');
      var fields={ etat:q('etat').value||'', localite:q('localite').value.trim(), classe:q('classe').checked?'Oui':'Non', note:q('note').value.trim() };
      send.disabled=true; msg.style.color=''; msg.textContent=T('patrimoine.contrib.envoi');
      PatFB.setCorrection(s.id, fields).then(function(){
        msg.style.color='#5c7a52'; msg.textContent=T('patrimoine.mod.enregistre'); send.disabled=false;
      }).catch(function(){ msg.style.color=''; msg.textContent=T('patrimoine.contrib.erreur'); send.disabled=false; });
    });
  }
  // Enrichissements de la fiche : contributions VALIDÉES rattachées à ce site (texte + photo + auteur).
  function fillEnrich(el, s){
    if(!el) return;
    var cs = contribsFor(s.id);
    if(!cs.length){ el.innerHTML=''; return; }
    el.innerHTML = '<h3 class="fe-h">'+esc(T('patrimoine.fiche.enrich.titre'))+'</h3>' +
      cs.map(function(c){
        var d = c.t ? new Date(c.t).toLocaleDateString(window.PATi18n?PATi18n.lang():'fr') : '';
        var ph = c.photoUrl ? '<a class="fe-photo" href="'+esc(c.photoUrl)+'" target="_blank" rel="noopener">'+esc(T('patrimoine.feed.photo'))+'</a>' : '';
        return '<div class="fe-item">'+(c.obs?'<p class="fe-obs">'+esc(c.obs)+'</p>':'')+ph+
          '<div class="fe-meta">'+esc(T('patrimoine.feed.par'))+' '+esc(c.who)+(d?' · '+esc(d):'')+'</div></div>';
      }).join('');
  }
  // Galerie de la fiche : TOUTES les photos dispo (contributions validées + sources libres).
  // Vide → placeholder discret (la zone existe, se remplit quand des photos arrivent).
  function fillGallery(el, s){
    if(!el) return;
    var ps = photosFor(s.id);
    if(!ps.length){ el.className='fiche-gallery empty'; el.innerHTML='<div class="fg-ph">'+esc(T('patrimoine.fiche.photos.vide'))+'</div>'; return; }
    el.className='fiche-gallery';
    var cur=ps[0];
    el.innerHTML =
      '<figure class="fiche-photo"><img src="'+esc(cur.url)+'" alt="" loading="lazy" onerror="this.closest(\'.fiche-gallery\').classList.add(\'imgerr\')">'+
        '<figcaption>'+esc(photoCred(cur))+'</figcaption></figure>'+
      (ps.length>1 ? '<div class="fiche-thumbs">'+ps.map(function(p,i){ return '<button type="button" class="fg-t'+(i===0?' on':'')+'" data-i="'+i+'" aria-label="photo '+(i+1)+'" style="background-image:url(\''+String(p.url).replace(/["'\\]/g,encodeURIComponent)+'\')"></button>'; }).join('')+'</div>' : '');
    var img=el.querySelector('.fiche-photo img'), cap=el.querySelector('.fiche-photo figcaption');
    el.querySelectorAll('.fg-t').forEach(function(b){
      b.addEventListener('click', function(){
        var p=ps[+b.getAttribute('data-i')]; el.classList.remove('imgerr'); img.src=p.url; cap.textContent=photoCred(p);
        el.querySelectorAll('.fg-t').forEach(function(x){ x.classList.remove('on'); }); b.classList.add('on');
      });
    });
  }

  // ── Contribution INLINE dans la fiche (auto-porté : envoi direct Firebase).
  //    Repli si Firebase absent = lien vers contribuer.html (comportement précédent).
  function okMail(e){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  // Upload photo via Worker R2 (inerte si PAT.uploadWorker vide → seul le champ lien reste).
  function uploadOn(){ return !!(((window.PAT&&window.PAT.uploadWorker)||'').trim()); }
  function uploadPhoto(file){
    var url=((window.PAT&&window.PAT.uploadWorker)||'').trim();
    if(!url) return Promise.reject(new Error('no-worker'));
    return fetch(url, { method:'POST', headers:{'Content-Type':file.type||'application/octet-stream'}, body:file })
      .then(function(r){ if(!r.ok) throw new Error('http'); return r.json(); })
      .then(function(j){ if(!j||!j.url) throw new Error('nourl'); return j.url; });
  }
  function etatOptions(sel){
    var opts=[['','patrimoine.contrib.etat.choisir'],['Bon','patrimoine.etat.bon'],['Moyen','patrimoine.etat.moyen'],['Mauvais','patrimoine.etat.mauvais'],['Détruit','patrimoine.etat.detruit'],['Disparu','patrimoine.etat.disparu']];
    return opts.map(function(o){ return '<option value="'+esc(o[0])+'"'+(o[0]===sel?' selected':'')+'>'+esc(T(o[1]))+'</option>'; }).join('');
  }
  function buildFicheContrib(box, s){
    if(!box) return;
    if(!(window.PatFB && PatFB.ready)){
      var a=document.createElement('a'); a.className='signaler';
      a.href='contribuer.html?site='+encodeURIComponent(s.id||'')+'&nom='+encodeURIComponent(s.nom||'')+'&gov='+encodeURIComponent(s.gov||'')+'&etat='+encodeURIComponent(s.etat||'');
      a.textContent=T('patrimoine.fiche.signaler'); box.appendChild(a); return;
    }
    box.innerHTML =
      '<button type="button" class="signaler fc-toggle" aria-expanded="false"></button>'+
      '<form class="fc-form" hidden novalidate>'+
        '<div class="fc-ctx"><span class="fc-ctx-lead"></span><b class="fc-ctx-nom"></b><span class="fc-ctx-meta"></span></div>'+
        '<div class="fc-two">'+
          '<input class="fc-i" data-f="prenom" autocomplete="given-name">'+
          '<input class="fc-i" data-f="nom" autocomplete="family-name">'+
        '</div>'+
        '<input class="fc-i" data-f="mail" type="email" autocomplete="email">'+
        '<select class="fc-i" data-f="etat">'+etatOptions(s.etat)+'</select>'+
        '<textarea class="fc-i fc-ta" data-f="obs" rows="3"></textarea>'+
        '<label class="fc-lbl fc-photolbl"></label>'+
        (uploadOn() ? '<input type="file" class="fc-file" data-f="photofile" accept="image/jpeg,image/png,image/webp,image/gif"><div class="fc-upmsg" role="status"></div>' : '')+
        '<input class="fc-i" data-f="photo" inputmode="url">'+
        '<figure class="fc-photoprev" hidden><img alt=""></figure>'+
        '<input class="fc-i" data-f="credit">'+
        '<label class="fc-rights"><input type="checkbox" data-f="rights"> <span></span></label>'+
        '<div class="fc-msg" role="status"></div>'+
        '<button type="submit" class="fc-send"></button>'+
      '</form>';
    var toggle=box.querySelector('.fc-toggle'), form=box.querySelector('.fc-form');
    function q(f){ return form.querySelector('[data-f="'+f+'"]'); }
    toggle.textContent=T('patrimoine.fiche.signaler');
    // Aperçu de la fiche en haut du formulaire (à confirmation)
    form.querySelector('.fc-ctx-lead').textContent=T('patrimoine.contrib.surfiche');
    form.querySelector('.fc-ctx-nom').textContent=s.nom||'—';
    form.querySelector('.fc-ctx-meta').textContent=[s.localite,s.gov,etatLabel(s.etat)].filter(Boolean).join(' · ');
    q('prenom').placeholder=T('patrimoine.contrib.prenom');
    q('nom').placeholder=T('patrimoine.contrib.nom');
    q('mail').placeholder=T('patrimoine.contrib.email');
    q('obs').placeholder=T('patrimoine.contrib.obs.ph');
    form.querySelector('.fc-photolbl').textContent=T('patrimoine.contrib.photo');
    q('photo').placeholder=T('patrimoine.contrib.photo.ph');
    q('credit').placeholder=T('patrimoine.contrib.credit.ph');
    form.querySelector('.fc-rights span').textContent=T('patrimoine.contrib.droits');
    form.querySelector('.fc-send').textContent=T('patrimoine.contrib.envoyer');
    // Miniature en direct quand on colle un lien d'image
    var prev=form.querySelector('.fc-photoprev'), prevImg=prev.querySelector('img');
    q('photo').addEventListener('input', function(){
      var u=q('photo').value.trim();
      if(/^https?:\/\/\S+/i.test(u)){ prevImg.src=u; prev.hidden=false; } else { prev.hidden=true; prevImg.removeAttribute('src'); }
    });
    prevImg.addEventListener('error', function(){ prev.hidden=true; });
    // Upload de fichier (si Worker R2 configuré) → remplit le champ lien + aperçu
    var fileEl=form.querySelector('[data-f="photofile"]');
    if(fileEl){
      var upmsg=form.querySelector('.fc-upmsg');
      fileEl.addEventListener('change', function(){
        var f=fileEl.files&&fileEl.files[0]; if(!f) return;
        if(f.size>5*1024*1024){ upmsg.style.color=''; upmsg.textContent=T('patrimoine.contrib.upload.trop'); fileEl.value=''; return; }
        upmsg.style.color=''; upmsg.textContent=T('patrimoine.contrib.upload.encours');
        uploadPhoto(f).then(function(url){
          q('photo').value=url; q('photo').dispatchEvent(new Event('input',{bubbles:true}));
          upmsg.style.color='#5c7a52'; upmsg.textContent=T('patrimoine.contrib.upload.ok');
        }).catch(function(){ upmsg.style.color=''; upmsg.textContent=T('patrimoine.contrib.upload.err'); });
      });
    }
    toggle.addEventListener('click', function(){
      var open=form.hasAttribute('hidden');
      if(open){ form.removeAttribute('hidden'); toggle.setAttribute('aria-expanded','true'); q('prenom').focus(); }
      else { form.setAttribute('hidden',''); toggle.setAttribute('aria-expanded','false'); }
    });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var msg=form.querySelector('.fc-msg'), send=form.querySelector('.fc-send');
      var prenom=q('prenom').value.trim(), nom=q('nom').value.trim(), mail=q('mail').value.trim(), obs=q('obs').value.trim();
      if(!prenom||!nom||!obs||!okMail(mail)){ msg.style.color=''; msg.textContent=T('patrimoine.contrib.requis'); return; }
      var data={ site:s.nom||'', gov:s.gov||'', siteId:s.id||'', etat:q('etat').value||'',
        obs:obs, photoUrl:q('photo').value.trim(), photoCredit:q('credit').value.trim(),
        rightsOk:!!q('rights').checked, prenom:prenom, nom:nom, email:mail };
      send.disabled=true; msg.style.color=''; msg.textContent=T('patrimoine.contrib.envoi');
      PatFB.addSubmission(data).then(function(){
        msg.style.color='#5c7a52'; msg.textContent=T('patrimoine.contrib.envoye');
        form.reset(); send.disabled=false;
      }).catch(function(){ msg.style.color=''; msg.textContent=T('patrimoine.contrib.erreur'); send.disabled=false; });
    });
  }
  function closeSheet(){ document.getElementById('modal').classList.remove('on'); _sheetSite = null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  function buildFilters(){
    // gouvernorats présents dans la donnée
    var govs = {}; SITES.forEach(function(s){ if(s.gov) govs[s.gov]=1; });
    govs = Object.keys(govs).sort(function(a,b){ return a.localeCompare(b); });
    var fg = document.getElementById('fGov');
    fg.innerHTML = '<option value="">'+T('patrimoine.filtre.gov.tous')+'</option>' +
      govs.map(function(g){ return '<option value="'+esc(g)+'">'+esc(g)+'</option>'; }).join('');
    var fe = document.getElementById('fEtat');
    fe.innerHTML = [
      ['','patrimoine.filtre.etat.tous'],['peril','patrimoine.filtre.etat.peril'],
      ['moyen','patrimoine.filtre.etat.moyen'],['bon','patrimoine.filtre.etat.bon']
    ].map(function(o){ return '<option value="'+o[0]+'">'+T(o[1])+'</option>'; }).join('');
    fg.addEventListener('change', function(){ GOV=fg.value; render(); });
    fe.addEventListener('change', function(){ ETAT=fe.value; render(); });
    var fc=document.getElementById('fClasse');
    if(fc) fc.addEventListener('change', function(){ CLASSE=fc.checked; render(); });
    var q=document.getElementById('q'); var to;
    q.addEventListener('input', function(){ clearTimeout(to); to=setTimeout(function(){ Q=q.value.trim(); render(); },120); });
  }

  function buildStats(){
    var peril = SITES.filter(function(s){ return etatClass(effEtat(s))==='peril'; }).length;
    // Compté sur le drapeau FIABLE (classe='Oui'), en tenant compte des corrections de la communauté.
    var classes = SITES.filter(function(s){ return effClasse(s)==='Oui'; }).length;
    var st = document.getElementById('stats');
    function item(cls,n,key){ return '<span class="s '+cls+'"><b>'+nf(n)+'</b><span>'+T(key)+'</span></span>'; }
    st.innerHTML = item('', SITES.length, 'patrimoine.stat.sites')
      + item('peril', peril, 'patrimoine.stat.peril')
      + item('', classes, 'patrimoine.stat.classes');
  }

  function buildLangSw(){
    var sw=document.getElementById('langSw'); if(!sw||!window.PATi18n) return;
    (PATi18n.langs||[]).forEach(function(l){
      var b=document.createElement('button'); b.textContent=l.toUpperCase();
      if(l===PATi18n.lang()) b.className='on';
      b.addEventListener('click', function(){ PATi18n.setLang(l); });
      sw.appendChild(b);
    });
  }

  function loadData(){
    var pSites = fetch(CFG.dataSites).then(function(r){ return r.json(); }).then(function(j){
      SITES = (Array.isArray(j)?j:(j.features?j.features.map(function(f){ return f.properties; }):[])) || [];
    });
    var pClasses = fetch(CFG.dataClasses).then(function(r){ return r.json(); }).then(function(j){
      CLASSES_COUNT = Array.isArray(j)?j.length:0;
    }).catch(function(){ CLASSES_COUNT=0; });
    // Photos sourcées (sources libres : Commons/Wikidata…), optionnel — {siteId:{url,credit,source,sourceUrl}}
    var pPhotos = fetch('data/photos.json').then(function(r){ return r.ok?r.json():{}; }).then(function(j){
      STATIC_PHOTOS = (j && typeof j==='object' && !Array.isArray(j)) ? j : {};
    }).catch(function(){ STATIC_PHOTOS={}; });
    return Promise.all([pSites, pClasses, pPhotos]);
  }

  // fermer la modale au clic sur le fond
  document.addEventListener('click', function(e){
    var m=document.getElementById('modal'); if(e.target===m) closeSheet();
  });

  // Photos publiées par le feed (contributions VALIDÉES) → rafraîchit liste + fiche ouverte.
  document.addEventListener('pat:photos', function(e){
    COMMUNITY_PHOTOS = (e && e.detail) || {};
    if(SITES.length) render();
    if(_sheetSite) openSheet(_sheetSite);
  });

  // Contributions VALIDÉES par site (texte + photo) → pièces jointes affichées dans la fiche.
  var SITE_CONTRIBS = {};
  function contribsFor(id){ return (id && SITE_CONTRIBS[id]) || []; }
  document.addEventListener('pat:contribs', function(e){
    SITE_CONTRIBS = (e && e.detail) || {};
    if(_sheetSite) openSheet(_sheetSite);
  });

  // Corrections de fiche (couche par-dessus la base INP figée). Fusionnées à l'affichage.
  var CORR = {};
  function corr(id){ return (id && CORR[id]) || null; }
  function effEtat(s){ var c=corr(s.id); return (c && c.etat) ? c.etat : s.etat; }
  function effLoc(s){ var c=corr(s.id); return (c && c.localite!=null && c.localite!=='') ? c.localite : s.localite; }
  function effClasse(s){ var c=corr(s.id); return (c && c.classe) ? c.classe : s.classe; }
  function corrHas(id, field){ var c=corr(id); return !!(c && c[field]!=null && c[field]!==''); }
  function isPriv(){ try{ var r=window.PatFB&&PatFB.role&&PatFB.role(); return r==='mere'||r==='expert'; }catch(e){ return false; } }
  document.addEventListener('pat:corrections', function(e){
    CORR = (e && e.detail) || {};
    if(SITES.length) render();
    if(_sheetSite) openSheet(_sheetSite);
  });

  // sélection courante (filtrée) + description des filtres, pour l'export
  function filterText(){
    var p=[];
    if(ETAT) p.push(T('patrimoine.filtre.etat.'+ETAT));
    if(GOV)  p.push(GOV);
    if(Q)    p.push('« '+Q+' »');
    return p.join(' · ');
  }
  window.PATData = {
    current: function(){ return SITES.filter(matches); },
    all:     function(){ return SITES; },
    etatClass: etatClass, etatLabel: etatLabel, filterText: filterText
  };

  // ── Carte (Leaflet, construite à la 1re ouverture de l'onglet Carte) ──
  var _map = null;
  function etatColor(ec){ return ec==='peril'?'#a5432f':(ec==='moyen'?'#b58a2f':(ec==='bon'?'#5c7a52':'#8a7c66')); }
  function buildMap(){
    if(_map || !window.L) return;
    var el = document.getElementById('patMap'); if(!el) return;
    var pts = SITES.filter(function(s){ return s.lat!=null && s.lon!=null && s.coord_ok!==false; });
    _map = L.map(el, { scrollWheelZoom:true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom:19, attribution:'© OpenStreetMap © CARTO' }).addTo(_map);
    var renderer = L.canvas({ padding:0.5 }), group = [];
    pts.forEach(function(s){
      var ec = etatClass(s.etat);
      var mk = L.circleMarker([s.lat, s.lon], { renderer:renderer, radius:4, weight:1, color:'#fff', fillColor:etatColor(ec), fillOpacity:.9 });
      mk.bindPopup('<b>'+esc(s.nom||'—')+'</b><br>'+esc([s.localite,s.gov].filter(Boolean).join(' · '))+'<br>'+esc(etatLabel(s.etat))+
        '<br><a href="contribuer.html?site='+encodeURIComponent(s.id||'')+'&nom='+encodeURIComponent(s.nom||'')+'&gov='+encodeURIComponent(s.gov||'')+'&etat='+encodeURIComponent(s.etat||'')+'">'+esc(T('patrimoine.fiche.signaler'))+'</a>');
      group.push(mk); mk.addTo(_map);
    });
    if(pts.length){ try{ _map.fitBounds(L.featureGroup(group).getBounds().pad(0.05)); }catch(e){ _map.setView([pts[0].lat,pts[0].lon],7); } }
    else _map.setView([34,9],6);
  }
  window.PatMap = { show:function(){ buildMap(); if(_map) setTimeout(function(){ _map.invalidateSize(); },60); } };

  // Décoration : frise de motifs discrets depuis la config (générique ; vide = rien).
  function deco(){
    var f = document.getElementById('frieze'); if(!f) return;
    var m = (CFG.motifs || []);
    if(!m.length){ f.style.display='none'; return; }
    f.innerHTML = m.map(function(x){ return '<span>'+esc(x)+'</span>'; }).join('');
  }

  // ── Charte : accès gratuit + participation & conduite.
  //    À la 1re ouverture (acceptation obligatoire), puis rouvrable via le lien de pied.
  var CHARTE_KEY = 'pat_charte_v1';
  function charteSeen(){ try{ return !!localStorage.getItem(CHARTE_KEY); }catch(e){ return true; } }
  function buildCharte(){
    var body=document.querySelector('#charte .charte-body'); if(!body) return;
    function sec(cls,titleKey,keys){ return '<div class="charte-sec '+cls+'"><h3>'+esc(T(titleKey))+'</h3>'+keys.map(function(k){ return '<p>'+esc(T(k))+'</p>'; }).join('')+'</div>'; }
    // Narratif + disclaimer INP : contenu i18n PROPRE (balises <b>) → rendu HTML, pas d'échappement.
    var narr=['patrimoine.intro.n1','patrimoine.intro.n2','patrimoine.intro.n3','patrimoine.intro.n4','patrimoine.intro.n5']
      .map(function(k){ return '<p>'+T(k)+'</p>'; }).join('');
    body.innerHTML =
      '<h2 id="charteTitle">'+esc(T('patrimoine.intro.titre'))+'</h2>'+
      '<div class="charte-narr">'+narr+'</div>'+
      '<div class="charte-inp">'+T('patrimoine.intro.inp')+'</div>'+
      sec('free','patrimoine.charte.gratuit.titre',['patrimoine.charte.gratuit.1','patrimoine.charte.gratuit.2','patrimoine.charte.gratuit.3'])+
      sec('','patrimoine.charte.regles.titre',['patrimoine.charte.regles.1','patrimoine.charte.regles.2','patrimoine.charte.regles.3'])+
      '<a class="charte-more" href="apropos.html">'+esc(T('patrimoine.intro.plus'))+'</a>';
    var ok=document.getElementById('charteOk'); if(ok) ok.textContent=T('patrimoine.charte.accept');
    var link=document.getElementById('charteLink'); if(link) link.textContent=T('patrimoine.charte.lien');
  }
  function showCharte(){ buildCharte(); var c=document.getElementById('charte'); if(c) c.hidden=false; }
  function hideCharte(){ var c=document.getElementById('charte'); if(c) c.hidden=true; }
  function initCharte(){
    buildCharte();
    var ok=document.getElementById('charteOk'), link=document.getElementById('charteLink'), box=document.getElementById('charte');
    if(ok) ok.addEventListener('click', function(){ try{ localStorage.setItem(CHARTE_KEY,'1'); }catch(e){} hideCharte(); if(window.PatTour) PatTour.maybeAutostart(); });
    if(link) link.addEventListener('click', showCharte);
    var tl=document.getElementById('tourLink'); if(tl) tl.addEventListener('click', function(){ if(window.PatTour) PatTour.start(); });
    if(box) box.addEventListener('click', function(e){ if(e.target===box && charteSeen()) hideCharte(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape' && charteSeen()) hideCharte(); });
    if(!charteSeen()) showCharte();
  }

  function start(){
    buildLangSw(); deco(); initCharte();
    loadData().then(function(){
      document.getElementById('loading').style.display='none';
      buildStats(); buildFilters(); render();
      if(window.PATExport) PATExport.wire();
      // Visite guidée : si la charte est déjà vue (ne s'affichera pas) et la visite jamais faite → la lancer.
      if(charteSeen() && window.PatTour) PatTour.maybeAutostart();
    }).catch(function(err){
      document.getElementById('loading').textContent = 'Erreur de chargement.';
    });
  }

  if(window.PATi18n){ PATi18n.boot().then(start); }
  else { document.addEventListener('DOMContentLoaded', start); }
})();
