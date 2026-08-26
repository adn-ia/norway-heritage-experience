/* the-carnet.js — MODULE SQUELETTE « Carnet d'étape » (reproduit Road Trip, sans Firebase).
   Section par étape : note + grille des médias + « Gérer / ajouter médias » (modale gestionnaire
   Photo/Vidéo/Son, réordonner ↑↓, supprimer 🗑️) + « Carte postale » + lien Maps + rappel confidentialité.
   Stockage : IndexedDB « the-carnet » / store « photos » (index « place ») — partagé avec the-postcard.js.
   Usage : placer <div class="the-carnet" data-place="<clé>" data-nom="<nom>" data-lat=".." data-lng=".."></div> ;
   le module rend tout seul. À inclure : <script src="the-carnet.js" defer></script> (après the-postcard.js). */
(function(){
  /* JAMAIS alert() : en WKWebView le dialogue natif peut ne pas rendre la main et
     figer la page — la famille du rejet 2.1(a). On passe par le toast partagé,
     exposé par the-pass.js, chargé partout où ce module vit. */
  function _dire(m){ try{ if(window.THEtoast) THEtoast(m); }catch(e){} }

  /* UNE CLÉ NON TRADUITE NE S'AFFICHE PAS EN CLAIR.
     T() reçoit ici des clés (« carnet.photo.en.tete »), pas du français. Quand la
     traduction manque, le moteur rend la clé telle quelle et l'utilisateur lit
     « carnet.ajouter.photo.entete » dans un bouton. On rend alors une chaîne vide :
     l'icône du bouton suffit, et rien d'illisible ne passe à l'écran. */
  function T(fr){ try{
      var v=(window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr;
      if(v===fr && /^[a-z][a-z0-9]*(\.[a-z0-9]+){2,}$/.test(fr)) return '';
      return v;
    }catch(e){ return fr; } }
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  /* ---- IndexedDB (même base que THE/le module carte postale) ---- */
  function db(){ return new Promise(function(res,rej){ var r=indexedDB.open('the-carnet',1);
    r.onupgradeneeded=function(e){ var d=e.target.result; if(!d.objectStoreNames.contains('photos')){ var os=d.createObjectStore('photos',{keyPath:'id',autoIncrement:true}); os.createIndex('place','place',{unique:false}); } };
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }
  function getMedia(place){ return db().then(function(d){ return new Promise(function(res){
    var out=[], c=d.transaction('photos','readonly').objectStore('photos').index('place').openCursor(IDBKeyRange.only(place));
    c.onsuccess=function(e){var x=e.target.result; if(x){out.push(x.value);x.continue();} else { out.sort(function(a,b){return (a.ord||a.ts||0)-(b.ord||b.ts||0);}); res(out); }}; c.onerror=function(){res([]);}; }); }); }

  /* COMPRESSER À L'ENTRÉE — vos originaux ne bougent pas.
     Un navigateur n'a pas accès au chemin d'une photo : il reçoit son contenu, et
     cette référence meurt avec la page. Garder « la photo n° 4237 » et la rechercher
     au lancement suivant est impossible sur iOS. Pour qu'une photo survive au
     redémarrage, l'application doit donc en garder une copie.
     On la garde LÉGÈRE : 1920 px au plus grand côté, qualité 0,82. L'original reste
     intact dans la photothèque, et l'appareil ne se remplit pas.
     ⏳ À VENIR (idée de Helmy, 23/08) : un dossier de classification propre à
     l'itinéraire, où les photos seraient gardées en résolution d'origine. */
  function compresser(file){
    var MAX = 1920, Q = 0.82;
    return new Promise(function(res){
      if(!file || !/^image\//.test(file.type||'') || /gif|svg/i.test(file.type||'')) { res(file); return; }
      var u = URL.createObjectURL(file), img = new Image(), fini = false;
      var abandon = setTimeout(function(){ if(!fini){ fini=true; try{URL.revokeObjectURL(u);}catch(e){} res(file); } }, 12000);
      img.onload = function(){
        if(fini) return; fini = true; clearTimeout(abandon);
        try{
          var w = img.naturalWidth, h = img.naturalHeight;
          if(Math.max(w,h) <= MAX){ URL.revokeObjectURL(u); res(file); return; }
          var k = MAX / Math.max(w,h);
          var c = document.createElement('canvas');
          c.width = Math.round(w*k); c.height = Math.round(h*k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(function(b){
            URL.revokeObjectURL(u);
            res(b && b.size < file.size ? new File([b], file.name, {type:'image/jpeg'}) : file);
          }, 'image/jpeg', Q);
        }catch(e){ try{URL.revokeObjectURL(u);}catch(_){} res(file); }
      };
      img.onerror = function(){ if(fini) return; fini=true; clearTimeout(abandon); try{URL.revokeObjectURL(u);}catch(e){} res(file); };
      img.src = u;
    });
  }
  function addMedia(place,name,blob,type){ return db().then(function(d){ return new Promise(function(res,rej){
    var rq=d.transaction('photos','readwrite').objectStore('photos').add({place:place,name:name,blob:blob,type:type||(blob.type||'image'),ts:Date.now(),ord:Date.now()});
    /* on rend l'IDENTIFIANT créé : sans lui, impossible de désigner ensuite
       cette photo comme en-tête de l'étape. Il manquait. */
    rq.onsuccess=function(){res(rq.result);}; rq.onerror=function(){rej(rq.error);}; }); }); }
  function delMedia(id){ return db().then(function(d){ return new Promise(function(res){ var rq=d.transaction('photos','readwrite').objectStore('photos').delete(id); rq.onsuccess=function(){res();}; rq.onerror=function(){res();}; }); }); }
    /* modifier un média sans le recréer (légende, ordre…) */
    function majMedia(id,patch){ return db().then(function(d){ return new Promise(function(res){
      var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id);
      g.onsuccess=function(){ var v=g.result; if(!v){ res(); return; }
        for(var k in patch) v[k]=patch[k];
        var u=os.put(v); u.onsuccess=function(){res();}; u.onerror=function(){res();}; };
      g.onerror=function(){res();}; }); }); }
  function setOrd(id,ord){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){v.ord=ord; os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
  // met à jour un média (légende, drapeau héro…)
  function updateMedia(id,patch){ return db().then(function(d){ return new Promise(function(res){ var os=d.transaction('photos','readwrite').objectStore('photos'); var g=os.get(id); g.onsuccess=function(){ var v=g.result; if(v){ Object.assign(v,patch); os.put(v);} res(); }; g.onerror=function(){res();}; }); }); }
  // héro = LA photo d'en-tête de l'étape : on la marque, on démarque les autres
  function setHero(place,id){ return getMedia(place).then(function(arr){ return Promise.all(arr.map(function(m){ return updateMedia(m.id,{hero:(m.id===id)}); })); }); }
  /* LA NOTE NE DOIT PAS SE PERDRE QUAND L'ÉTAPE CHANGE DE CLÉ
     La clé d'une étape porte l'identifiant de son itinéraire (« it123#lieu@… »).
     Une note écrite AVANT que l'itinéraire ait son identifiant est rangée sous la
     clé nue (« lieu@… ») ; à la réouverture on cherchait sous la clé longue et la
     note semblait effacée. On relit donc aussi la clé nue, et on la recopie sous
     la clé du jour pour ne plus repasser par là. Même repli que la légende
     d'album, qui l'avait déjà. */
  function cleNue(place){ var i=String(place||'').indexOf('#'); return i>=0 ? place.slice(i+1) : place; }
  function note(place,val){
    try{
      if(val==null){
        var v=localStorage.getItem('the-note-'+place);
        if(v) return v;
        var nue=cleNue(place);
        if(nue!==place){
          var a=localStorage.getItem('the-note-'+nue);
          if(a){ localStorage.setItem('the-note-'+place, a); return a; }
        }
        return '';
      }
      localStorage.setItem('the-note-'+place,val);
    }catch(e){ return ''; }
  }
  function kind(m){ var t=m.type||(m.blob&&m.blob.type)||''; if(/^video/.test(t))return'video'; if(/^audio/.test(t))return'audio'; return'image'; }
  // une IMAGE est-elle décodable par le navigateur ? (les vidéos/sons passent sans test)
  // évite de stocker un fichier illisible (ex. HEIC/HEIF importé via « Fichiers ») qui s'afficherait en carré gris.
  function decodable(file){ var t=(file.type||'').toLowerCase(); if(t.indexOf('video')===0||t.indexOf('audio')===0) return Promise.resolve(true);
    return new Promise(function(res){ var img=new Image(), u=URL.createObjectURL(file), done=false;
      // anti-blocage : certains HEIC/HEIF Android ne déclenchent NI onload NI onerror -> timeout 10 s = non décodable
      var to=setTimeout(function(){ if(done)return; done=true; try{URL.revokeObjectURL(u);}catch(e){} res(false); }, 10000);
      img.onload=function(){ if(done)return; done=true; clearTimeout(to); URL.revokeObjectURL(u); res(true); };
      img.onerror=function(){ if(done)return; done=true; clearTimeout(to); URL.revokeObjectURL(u); res(false); }; img.src=u; }); }

  /* ---- rendu de la section d'une étape ---- */
  function renderSection(el){
    var place=el.dataset.place, nom=el.dataset.nom||'', lat=el.dataset.lat, lng=el.dataset.lng;
    el.innerHTML=
      '<div class="cn-hero" style="display:none"></div>'+
      '<div class="cn-head">✏️ '+T('carnet.carnet.de.letape')+' <span class="cn-priv">— '+T('carnet.prive.tant.que.vous.ne')+'</span></div>'+
      '<textarea class="cn-note" placeholder="'+T('carnet.un.mot.sur.cette.etape')+'"></textarea>'+
      '<div class="cn-grid"></div>'+
      '<div class="cn-row"><button class="cn-btn cn-manage">🖼️ '+T('carnet.gerer.ajouter.medias')+'</button>'+
        '<button class="cn-btn cn-pc">🖼️ '+T('carnet.carte.postale')+'</button></div>'+
      (lat&&lng?'<a class="cn-maps" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query='+lat+','+lng+'">🧭 '+T('carnet.cette.etape.dans.maps')+'</a>':'')+
      '<div class="cn-note-priv">🔒 '+T('carnet.vos.medias.restent.sur.votre')+'</div>';
    var ta=el.querySelector('.cn-note'); ta.value=note(place); ta.onchange=function(){ note(place,ta.value); };
    el.querySelector('.cn-manage').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-grid').onclick=function(){ openManager(place,nom); };
    el.querySelector('.cn-pc').onclick=function(){ if(window.THEPostcard) THEPostcard.open({nom:nom,ville:el.dataset.ville||'',placeKey:place}); };
    grid(el.querySelector('.cn-grid'), place);
    heroFill(el, place);
  }
  // bandeau photo d'en-tête (héro) de l'étape
  function heroFill(el, place){ getMedia(place).then(function(arr){
    var h=arr.filter(function(m){return m.hero && kind(m)==='image';})[0];
    var box=el.querySelector('.cn-hero'); if(!box) return;
    if(h){ box.style.display='block'; box.style.backgroundImage="url('"+URL.createObjectURL(h.blob)+"')"; box.innerHTML=(h.caption?'<span class="cn-hero-cap">'+esc(h.caption)+'</span>':'');
           box.style.cursor='pointer';
           box.onclick=function(ev){ ev.stopPropagation(); panneauEnTete(place, (el.dataset&&el.dataset.nom)||''); }; }
    else { /* Pas encore de photo d'en-tête : on le PROPOSE au lieu de ne rien montrer.
              Le bandeau existait mais restait caché — on ne pouvait pas deviner qu'il
              suffisait de marquer une photo d'une étoile pour l'obtenir. */
      box.style.display='block'; box.style.backgroundImage=''; box.classList.add('vide');
      box.innerHTML='<button type="button" class="cn-hero-add">📷 '+T('carnet.photo.en.tete')+'</button>';
      var b=box.querySelector('.cn-hero-add');
      if(b) b.onclick=function(ev){ ev.stopPropagation(); panneauEnTete(place, (el.dataset&&el.dataset.nom)||''); };
    }
  }); }
  function grid(g,place){ getMedia(place).then(function(arr){
    g.innerHTML=arr.map(function(m){ var k=kind(m);
      if(k==='video') return '<div class="cn-th cn-vid">▶</div>';
      if(k==='audio') return '<div class="cn-th cn-aud">🎙️</div>';
      return '<div class="cn-th" style="background-image:url(\''+URL.createObjectURL(m.blob)+'\')"></div>'; }).join('')
      +'<div class="cn-th cn-addt">＋</div>';
  }); }

  /* ---- modale gestionnaire ---- */
  function modal(html){ var w=document.getElementById('cn-modal'); w.querySelector('.cn-box').innerHTML=html; w.classList.add('on'); }
  function closeModal(){ var w=document.getElementById('cn-modal'); if(w)w.classList.remove('on'); CUR=null; }
  var CUR=null, CNSEL=[];
  function openManager(place,nom){
    CUR={place:place,nom:nom}; CNSEL=[];
    getMedia(place).then(function(arr){
      var list = arr.length ? arr.map(function(m,i){ var k=kind(m), url=URL.createObjectURL(m.blob);
        var media = k==='video'?'<video src="'+url+'" controls playsinline style="width:100%;border-radius:8px"></video>'
          : k==='audio'?'<audio src="'+url+'" controls style="width:100%"></audio>'
          : '<img src="'+url+'" style="width:100%;border-radius:8px">';
        return '<div class="cn-item">'+media+
          (k==='image'?'<input class="cn-cap" data-cap="'+m.id+'" maxlength="90" placeholder="'+T('carnet.legende.photo')+'" value="'+esc(m.caption||'')+'">':'')+
          '<div class="cn-ctr">'+
          '<input type="checkbox" class="cn-selk" data-sel="'+m.id+'" style="width:18px;height:18px;margin-right:auto">'+
          (k==='image'?'<button class="cn-hero-b'+(m.hero?' on':'')+'" data-hero="'+m.id+'" title="'+T('carnet.photo.en.tete')+'">⭐</button>':'')+
          '<button '+(i===0?'disabled':'')+' data-mv="'+m.id+'" data-dir="-1" title="'+T('plan.monter')+'">↑</button>'+
          '<button '+(i===arr.length-1?'disabled':'')+' data-mv="'+m.id+'" data-dir="1" title="'+T('plan.descendre')+'">↓</button>'+
          '<button data-dl="'+m.id+'" title="'+esc(T('Enregistrer dans mes photos'))+'">⬇️ '+T('Enregistrer')+'</button>'+
          '<button class="cn-rm" data-del="'+m.id+'">🗑️ '+T('carnet.supprimer')+'</button></div></div>'; }).join('')
        : '<div class="cn-empty">'+T('carnet.aucun.media.pour.linstant.ajoutez')+'</div>';
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>🖼️ '+T('carnet.carnet')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-list">'+list+'</div>'+
        (arr.length>1?'<div style="text-align:center;margin:6px 0 0"><button class="cn-btn cn-delsel" disabled>🗑️ '+T('carnet.supprimer')+' (0)</button></div>':'')+
        '<div class="cn-row" style="margin-top:12px">'+
          '<label class="cn-btn">📷 '+T('carnet.photo')+'<input type="file" accept="image/*" capture="environment" multiple hidden data-add="image"></label>'+
          '<label class="cn-btn">🖼️ '+T('carnet.galerie')+'<input type="file" accept="image/*" multiple hidden data-add="image"></label>'+
          '<label class="cn-btn">🎥 '+T('carnet.video')+'<input type="file" accept="video/*,.mov,.mp4,.m4v,.avi,.3gp,.mkv" capture="environment" hidden data-add="video"></label>'+
          '<label class="cn-btn">📁 '+T('carnet.fichiers')+'<input type="file" accept="image/*,video/*,audio/*,.mov,.mp4,.m4v,.m4a,.mp3,.wav,.aac,.ogg" multiple hidden data-add=""></label>'+
          '<button class="cn-btn cn-rec">🎙️ '+T('carnet.son')+'</button></div>'+
        '<p class="cn-tip">🔒 '+T('carnet.vos.medias.restent.sur.votre')+'</p>'+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('index.fermer')+'</button>');
      var w=document.getElementById('cn-modal');
      arr.forEach(function(){});
      /* Le bouton unique accepte tout : le type vient donc du FICHIER, pas du
         bouton. Sans cela une vidéo déposée là s'affichait comme une image. */
      function typeDu(f, indice){
        var t=(f && f.type) || '';
        if(/^video/.test(t)) return 'video';
        if(/^audio/.test(t)) return 'audio';
        if(/^image/.test(t)) return 'image';
        return (indice && indice!=='media') ? indice : 'image';
      }
      w.querySelectorAll('[data-add]').forEach(function(inp){ inp.onchange=function(e){ var fs=e.target.files?[].slice.call(e.target.files):[];
        // écarter les images non décodables (ex. HEIC/HEIF via « Fichiers ») AVANT stockage -> pas de carré gris
        Promise.all(fs.map(function(f){ return decodable(f); })).then(function(oks){
          var keep=fs.filter(function(f,i){ return oks[i]; }), skipped=fs.length-keep.length;
          Promise.all(keep.map(function(f){ var t=typeDu(f, e.target.getAttribute('data-add'));
            return (t==='image'?compresser(f):Promise.resolve(f)).then(function(ff){ return addMedia(place, f.name, ff, t); }); })).then(function(){ openManager(place,nom); refreshSections(place); if(window.THEBackup&&THEBackup.offer) THEBackup.offer(); if(skipped) _dire(T('carnet.non.lisible')); });
        }); }; });
        /* ⬇️ ENREGISTRER — un média pris dans le carnet ne va PAS dans la
           pellicule du téléphone. Sans ce bouton il reste prisonnier de
           l'application. Repris tel quel du RoadTrip. */
        w.querySelectorAll('[data-dl]').forEach(function(b){ b.onclick=function(){
          getMedia(place).then(function(arr){
            var m=arr.filter(function(x){ return x.id===+b.getAttribute('data-dl'); })[0];
            if(!m||!m.blob) return;
            var k=kind(m);
            var ext = k==='video' ? ((m.blob.type&&m.blob.type.split('/')[1])||'mp4')
                    : (k==='audio' ? ((m.blob.type&&m.blob.type.split('/')[1])||'webm') : 'jpg');
            var u=URL.createObjectURL(m.blob), a=document.createElement('a');
            a.href=u; a.download=(m.name||('souvenir.'+ext));
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function(){ URL.revokeObjectURL(u); }, 4000);
          });
        }; });
        /* la légende s'enregistre en quittant le champ */
        w.querySelectorAll('[data-cap]').forEach(function(ta){
          ta.onchange=function(){ majMedia(+ta.getAttribute('data-cap'), {caption: ta.value}); };
        });
      w.querySelectorAll('[data-del]').forEach(function(b){ b.onclick=function(){ delMedia(+b.getAttribute('data-del')).then(function(){ openManager(place,nom); refreshSections(place); }); }; });
      // suppression MULTIPLE (point 6) : cases à cocher + bouton « Supprimer (N) »
      var delselb=w.querySelector('.cn-delsel');
      w.querySelectorAll('[data-sel]').forEach(function(cb){ cb.onchange=function(){ var id=+cb.getAttribute('data-sel'); if(cb.checked){ if(CNSEL.indexOf(id)<0)CNSEL.push(id); } else { CNSEL=CNSEL.filter(function(x){return x!==id;}); } if(delselb){ delselb.disabled=CNSEL.length===0; delselb.textContent='🗑️ '+T('carnet.supprimer')+' ('+CNSEL.length+')'; } }; });
      if(delselb) delselb.onclick=function(){ if(!CNSEL.length)return; if(!confirm(T('carnet.supprimer')+' '+CNSEL.length+' ?'))return; Promise.all(CNSEL.map(function(id){return delMedia(id);})).then(function(){ CNSEL=[]; openManager(place,nom); refreshSections(place); }); };
      w.querySelectorAll('[data-mv]').forEach(function(b){ b.onclick=function(){ moveItem(place,nom,+b.getAttribute('data-mv'),+b.getAttribute('data-dir')); }; });
      w.querySelectorAll('[data-cap]').forEach(function(inp){ inp.onchange=function(){ updateMedia(+inp.getAttribute('data-cap'),{caption:inp.value}).then(function(){ refreshSections(place); }); }; });
      w.querySelectorAll('[data-hero]').forEach(function(b){ b.onclick=function(){ setHero(place,+b.getAttribute('data-hero')).then(function(){ openManager(place,nom); refreshSections(place); }); }; });
      var rec=w.querySelector('.cn-rec'); if(rec)rec.onclick=function(){ recordAudio(place,nom); };
    });
  }
  function moveItem(place,nom,id,dir){ getMedia(place).then(function(arr){ var i=arr.findIndex(function(m){return m.id===id;}); var j=i+dir; if(i<0||j<0||j>=arr.length)return;
    var a=arr[i],b=arr[j], oa=a.ord||a.ts||0, ob=b.ord||b.ts||0; Promise.all([setOrd(a.id,ob),setOrd(b.id,oa)]).then(function(){ openManager(place,nom); refreshSections(place); }); }); }
  function recordAudio(place,nom){
    if(!navigator.mediaDevices||!window.MediaRecorder){ _dire(T('carnet.enregistrement.audio.non.supporte.sur')); return; }
    navigator.mediaDevices.getUserMedia({audio:true}).then(function(stream){
      var mr=new MediaRecorder(stream), chunks=[]; mr.ondataavailable=function(e){ if(e.data&&e.data.size)chunks.push(e.data); };
      mr.onstop=function(){ stream.getTracks().forEach(function(t){t.stop();}); var blob=new Blob(chunks,{type:'audio/webm'}); addMedia(place,'son.webm',blob,'audio').then(function(){ openManager(place,nom); refreshSections(place); }); };
      modal('<h3>🎙️ '+T('carnet.enregistrement')+'</h3><p class="cn-tip">'+T('carnet.parlez.puis.arretez')+'</p><button class="cn-close-b" id="cn-stop">⏹ '+T('carnet.arreter')+'</button>');
      document.getElementById('cn-stop').onclick=function(){ try{mr.stop();}catch(e){} };
      mr.start();
    }).catch(function(){ _dire(T('carnet.micro.refuse.ou.indisponible')); });
  }
  function refreshSections(place){ document.querySelectorAll('.the-carnet').forEach(function(el){ if(el.dataset.place===place){ grid(el.querySelector('.cn-grid'), place); heroFill(el, place); } }); }

  function init(){
    var css='.the-carnet{margin-top:12px;background:#fffdf8;border:1px solid #e3d8c4;border-radius:10px;padding:12px}'
      +'.the-carnet .cn-hero{position:relative;height:150px;border-radius:9px;background:#eee center/cover no-repeat;margin-bottom:10px;box-shadow:0 3px 12px rgba(0,0,0,.16)}'
      +'.the-carnet .cn-hero.vide{background:#f6efe2;border:1px dashed #d9c9ab;display:flex;align-items:center;justify-content:center;height:96px}'
      +'.the-carnet .cn-hero-add{background:#fff;border:1px solid #e3d8c4;color:#6b5c45;border-radius:20px;padding:9px 16px;font:inherit;font-size:14px;cursor:pointer}'
      +'.the-carnet .cn-hero-add:hover{background:#f3eee3;color:#3a2c20}'
      +'.the-carnet .cn-hero .cn-hero-cap{position:absolute;left:0;right:0;bottom:0;padding:14px 12px 8px;color:#fff;font-family:Georgia,serif;font-style:italic;font-size:14px;background:linear-gradient(transparent,rgba(0,0,0,.7))}'
      +'.cn-cap{width:100%;margin-top:6px;border:1px solid #ddd;border-radius:6px;padding:6px 8px;font:inherit;font-size:13px}'
      +'.cn-hero-b{border:1px solid #ccc;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer;font:inherit;filter:grayscale(1);opacity:.6}.cn-hero-b.on{filter:none;opacity:1;border-color:#c9a24a;background:#fdf6e6}'
      +'.the-carnet .cn-head{font-family:Georgia,serif;font-weight:700;font-size:15px}.the-carnet .cn-priv{font-weight:400;color:#8a7c66;font-size:12px}'
      +'.the-carnet .cn-note{width:100%;min-height:54px;margin:8px 0;border:1px solid #ddd;border-radius:8px;padding:8px;font:inherit;font-size:14px}'
      +'.the-carnet .cn-grid{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}'
      +'.cn-th{width:54px;height:54px;border-radius:7px;background:#eee center/cover no-repeat;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:20px;color:#a8884f}'
      +'.cn-th.cn-vid,.cn-th.cn-aud{background:#26201a;color:#f5ecd8}.cn-th.cn-addt{background:#f1e7d5;border:1px dashed #c9b896}'
      +'.the-carnet .cn-row{display:flex;gap:8px;flex-wrap:wrap}.cn-btn{flex:1;min-width:130px;min-height:44px;padding:12px 10px;border:1px solid #c9b896;border-radius:8px;background:#26201a;color:#f5ecd8;font:inherit;font-weight:600;font-size:13px;cursor:pointer;text-align:center}'
      +'.the-carnet .cn-pc{background:#14305c}.the-carnet .cn-maps{display:inline-block;margin-top:8px;color:#9a6a2e;text-decoration:underline;font-size:13px}'
+'.cn-hprev{height:150px;border-radius:10px;background:#eef2f6 center/cover no-repeat;border:1px solid #ddd}'
      +'.cn-hpgrid{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}'
      +'.cn-hp{width:66px;height:66px;border-radius:8px;background:#eee center/cover no-repeat;border:2px solid transparent;cursor:pointer}'
      +'.cn-hp.on{border-color:#b8860b}'
      +'.the-carnet .cn-note-priv{font-size:12px;color:#8a7c66;font-style:italic;margin-top:8px}'
      +'#cn-modal{position:fixed;inset:0;z-index:1450;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px}'
      +'#cn-modal.on{display:flex}#cn-modal .cn-box{background:#fffdf8;border-radius:14px;padding:16px;max-width:440px;width:100%;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
      +'#cn-modal .cn-x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:22px;cursor:pointer;color:#666}'
      +'#cn-modal h3{font-family:Georgia,serif;margin:0 0 10px}.cn-list{display:flex;flex-direction:column;gap:12px;max-height:50vh;overflow:auto}'
      +'.cn-item{border:1px solid #eee;border-radius:8px;padding:8px}.cn-ctr{display:flex;gap:6px;margin-top:6px}.cn-ctr button{border:1px solid #ccc;border-radius:6px;background:#fff;padding:6px 9px;cursor:pointer;font:inherit}.cn-ctr .cn-rm{margin-left:auto;color:#a3402a;border-color:#e0b8ac}'
      +'.cn-empty{color:#8a7c66;font-style:italic;padding:14px;text-align:center}.cn-tip{font-size:12px;color:#8a7c66;font-style:italic;margin:9px 0 0}'
      +'.cn-close-b{width:100%;margin-top:12px;padding:11px;border:none;border-radius:8px;background:#a8884f;color:#fff;font:inherit;font-weight:700;cursor:pointer}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    if(!document.getElementById('cn-modal')){ var w=document.createElement('div'); w.id='cn-modal'; w.innerHTML='<div class="cn-box"></div>'; document.body.appendChild(w);
      w.addEventListener('click',function(e){ if(e.target===w) closeModal(); }); }
    document.querySelectorAll('.the-carnet').forEach(renderSection);
  }
  // re-rendu quand l'itinéraire (re)génère ses étapes
  var mo=new MutationObserver(function(muts){ muts.forEach(function(m){ [].forEach.call(m.addedNodes,function(n){ if(n.nodeType===1){ if(n.classList&&n.classList.contains('the-carnet')) renderSection(n); else if(n.querySelectorAll) n.querySelectorAll('.the-carnet').forEach(renderSection); } }); }); });
  function start(){ init(); try{ mo.observe(document.body,{childList:true,subtree:true}); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();

  /* Poser directement une photo d'en-tête : on ouvre la GALERIE du téléphone,
     pas la liste de ce qui est déjà importé. La première image choisie devient
     le bandeau de l'étape. Demandé par Helmy le 23/08 — « ça peut être une
     option, mais vers la galerie c'est mieux ». */
  /* SÉLECTEUR DE PHOTO D'EN-TÊTE — repris de RoadTrip (openHeaderChooser,
     index.html:1483 + edHeaderGallery:1419 + onHdrPick:1420).
     Chez RoadTrip « Depuis la galerie » ouvre le sélecteur natif du téléphone :
     l'en-tête ne se choisit PAS dans les photos déjà rangées sous l'étape.
     C'est ce qui manquait ici — le bandeau vide rouvrait le gestionnaire, donc
     sur une étape sans photo il n'y avait rien à choisir. */
  function panneauEnTete(place, nom){
    getMedia(place).then(function(arr){
      var imgs = arr.filter(function(m){ return kind(m)==='image'; });
      var h = imgs.filter(function(m){ return m.hero; })[0];
      var vign = imgs.map(function(m){
        return '<div class="cn-hp'+(m.hero?' on':'')+'" data-hp="'+m.id+'" style="background-image:url(\''+URL.createObjectURL(m.blob)+'\')"></div>'; }).join('');
      modal('<button class="cn-x" onclick="THECarnet.close()">×</button>'+
        '<h3>📷 '+T('carnet.photo.en.tete')+' — '+esc(nom)+'</h3>'+
        '<div class="cn-hprev"'+(h?' style="background-image:url(\''+URL.createObjectURL(h.blob)+'\')"':'')+'></div>'+
        '<div class="cn-row" style="margin-top:10px">'+
          '<label class="cn-btn">🖼️ '+T('carnet.galerie')+'<input type="file" accept="image/*" hidden class="cn-hpick"></label>'+
          '<label class="cn-btn">📷 '+T('carnet.photo')+'<input type="file" accept="image/*" capture="environment" hidden class="cn-hpick"></label>'+
          (h?'<button class="cn-btn cn-hclr">✕ '+T('carnet.supprimer')+'</button>':'')+'</div>'+
        (vign?'<div class="cn-hpgrid">'+vign+'</div>':'')+
        '<button class="cn-close-b" onclick="THECarnet.close()">'+T('index.fermer')+'</button>');
      var w=document.getElementById('cn-modal');
      w.querySelectorAll('.cn-hpick').forEach(function(inp){ inp.onchange=function(){
        var f=inp.files&&inp.files[0]; if(!f) return;
        compresser(f).then(function(ff){ return addMedia(place, f.name, ff, 'image'); })
          .then(function(id){ return setHero(place, id); })
          .then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      }; });
      w.querySelectorAll('[data-hp]').forEach(function(b){ b.onclick=function(){
        setHero(place, +b.getAttribute('data-hp')).then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      }; });
      var c=w.querySelector('.cn-hclr'); if(c) c.onclick=function(){
        setHero(place, null).then(function(){ refreshSections(place); panneauEnTete(place, nom); });
      };
    });
  }

  function choisirEnTete(place, nom, apres){
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = false;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f){ inp.remove(); return; }
      compresser(f).then(function(ff){ return addMedia(place, f.name, ff, 'image'); }).then(function(id){
        return setHero(place, id);
      }).then(function(){
        refreshSections(place);
        if(typeof apres === 'function') apres();
      }).catch(function(){}).then(function(){ inp.remove(); });
    };
    inp.click();
  }

  window.THECarnet={ open:openManager, close:closeModal, render:renderSection, enTete:choisirEnTete, panneauEnTete:panneauEnTete };
})();
