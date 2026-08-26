/* the-journal.js — le JOURNAL DE BORD du voyage.
   Repris de RoadTrip : openJournalPicker (index.html l. 2410), __jmCounts,
   rtRenderJournalPicker, rtJmToggle, rtJmAll, rtGenJournal l. 2455.
   Fichier LU, jamais modifié.

   Le principe : on RELIT tout ce que le voyageur a écrit et photographié, on lui
   laisse cocher ce qu'il garde, et on engendre un récit — un fichier HTML
   autonome, lisible hors-ligne, qui lui appartient. Rien n'est envoyé.

   Ce que l'album ne fait pas : l'album met en page TOUT le carnet dans un style
   choisi. Le journal, lui, se compose — on écarte les photos ratées, on garde le
   mot qui compte, et le récit se lit d'une traite.

   Brique auto-portée : libellés via i18n, aucun texte en dur. */
(function () {
  var DB = 'the-carnet', STORE = 'photos';

  function T(cle) {
    try { var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle); return (v && v !== cle) ? v : ''; }
    catch (e) { return ''; }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function base(){ return new Promise(function(res,rej){ var r=indexedDB.open(DB,1);
    r.onsuccess=function(){res(r.result);}; r.onerror=function(){rej(r.error);}; }); }
  function medias(cle){ return base().then(function(d){ return new Promise(function(res){
    var out=[], c=d.transaction(STORE,'readonly').objectStore(STORE).index('place').openCursor(IDBKeyRange.only(cle));
    c.onsuccess=function(e){ var x=e.target.result; if(x){ out.push(x.value); x.continue(); }
      else { out.sort(function(a,b){ return (a.ord||a.ts||0)-(b.ord||b.ts||0); }); res(out); } };
    c.onerror=function(){ res([]); }; }); }).catch(function(){ return []; }); }
  function versDataURL(b){ return new Promise(function(res){
    var r=new FileReader(); r.onload=function(){res(r.result);}; r.onerror=function(){res('');}; r.readAsDataURL(b); }); }

  var JM = null;

  function styler(){
    if (document.getElementById('the-jm-css')) return;
    var st=document.createElement('style'); st.id='the-jm-css';
    st.textContent =
      '#the-jm{position:fixed;inset:0;z-index:11000;background:rgba(20,15,10,.8);display:none;' +
        'align-items:flex-start;justify-content:center;overflow:auto;padding:20px}' +
      '#the-jm.on{display:flex}' +
      '#the-jm .jm-b{background:#fffdf8;color:#2b2318;border-radius:14px;padding:18px;max-width:560px;width:100%;' +
        'position:relative;box-shadow:0 12px 44px rgba(0,0,0,.5)}' +
      '#the-jm h3{font-family:"Cormorant Garamond",Georgia,serif;font-size:22px;margin:0 0 2px}' +
      '#the-jm .jm-n{font-size:13px;color:#8a7c66;margin:0 0 11px}' +
      '#the-jm .jm-x{position:absolute;top:8px;right:11px;background:none;border:none;font-size:24px;' +
        'line-height:1;cursor:pointer;color:#8a7c66;min-width:40px;min-height:40px}' +
      '#the-jm .jm-sec{font-weight:700;color:#5a4420;margin:13px 0 5px;padding-top:9px;border-top:1px solid #efe7d8}' +
      '#the-jm .jm-l{display:flex;align-items:flex-start;gap:9px;padding:5px 0}' +
      '#the-jm .jm-l input{width:18px;height:18px;flex:0 0 auto;margin-top:2px;cursor:pointer}' +
      '#the-jm .jm-t{flex:1;font-size:13.5px;color:#3a2f1e;word-break:break-word}' +
      '#the-jm .jm-v{width:56px;height:56px;border-radius:7px;background:#eee center/cover no-repeat;flex:0 0 auto}' +
      '#the-jm .jm-r{display:flex;gap:8px;flex-wrap:wrap;margin:13px 0 3px}' +
      '#the-jm .jm-r button{flex:1;min-width:120px;min-height:42px;border:1px solid #c9b896;border-radius:9px;' +
        'background:#fffdf8;color:#5a4420;font:inherit;font-size:14px;cursor:pointer}' +
      '#the-jm .jm-r button.on{background:#5a4420;color:#f5ecd8}' +
      '#the-jm .jm-vide{font-size:13.5px;color:#8a7c66;font-style:italic;padding:14px 0}';
    document.head.appendChild(st);
  }

  function boite(){
    styler();
    var w=document.getElementById('the-jm');
    if(!w){ w=document.createElement('div'); w.id='the-jm'; w.innerHTML='<div class="jm-b"></div>';
      document.body.appendChild(w);
      w.addEventListener('click', function(e){ if(e.target===w) fermer(); }); }
    return w;
  }
  function fermer(){ var w=document.getElementById('the-jm'); if(w) w.classList.remove('on'); }

  /* ---- 1) relire le carnet : une section par étape, ses notes, ses médias ---- */
  function rassembler(){
    var res=(window.LASTRES&&LASTRES.route)?LASTRES.route:[];
    var suite=Promise.resolve([]), n=0;
    res.forEach(function(s,i){
      suite=suite.then(function(acc){
        var cle=(typeof placeKey==='function')?placeKey(s):null;
        if(!cle) return acc;
        acc.push({ t:'sec', label:(i+1)+'. '+((s.p&&s.p.nom)||'') });
        var note=''; try{ note=(localStorage.getItem('the-note-'+cle)||'').trim(); }catch(e){}
        if(note) acc.push({ t:'note', id:++n, texte:note, garde:true });
        return medias(cle).then(function(arr){
          arr.forEach(function(m){ if(m&&m.blob) acc.push({ t:'media', id:++n, genre:(m.type||'image'),
            blob:m.blob, legende:m.caption||'', garde:true }); });
          return acc;
        });
      });
    });
    return suite;
  }

  /* ---- 2) l'écran de composition : on coche ce qu'on garde ---- */
  function dessiner(){
    var w=boite(), b=w.querySelector('.jm-b');
    var pris=JM.filter(function(e){ return (e.t==='note'||e.t==='media') && e.garde; }).length;
    var tot=JM.filter(function(e){ return e.t==='note'||e.t==='media'; }).length;
    var lignes=JM.map(function(e){
      if(e.t==='sec') return '<div class="jm-sec">'+esc(e.label)+'</div>';
      if(e.t==='note') return '<label class="jm-l"><input type="checkbox" data-j="'+e.id+'"'+(e.garde?' checked':'')+
        '><span class="jm-t">'+esc(e.texte.slice(0,150))+'</span></label>';
      var v = e.genre==='video' ? '<span class="jm-v" style="display:flex;align-items:center;justify-content:center;background:#26201a;color:#f5ecd8">▶</span>'
            : e.genre==='audio' ? '<span class="jm-v" style="display:flex;align-items:center;justify-content:center;background:#26201a;color:#f5ecd8">🎙️</span>'
            : '<span class="jm-v" style="background-image:url(\''+URL.createObjectURL(e.blob)+'\')"></span>';
      return '<label class="jm-l"><input type="checkbox" data-j="'+e.id+'"'+(e.garde?' checked':'')+'>'+v+
        '<span class="jm-t">'+esc(e.legende)+'</span></label>';
    }).join('');
    b.innerHTML='<button class="jm-x" type="button" aria-label="'+esc(T('index.fermer'))+'">×</button>'+
      '<h3>📰 '+esc(T('jm.titre'))+'</h3>'+
      '<p class="jm-n">'+esc(T('jm.note'))+' <b>'+pris+'/'+tot+'</b></p>'+
      (tot ? lignes : '<div class="jm-vide">'+esc(T('jm.vide'))+'</div>')+
      (tot ? ('<div class="jm-r"><button type="button" data-tout>'+esc(T('jm.tout'))+'</button>'+
              '<button type="button" data-rien>'+esc(T('jm.rien'))+'</button></div>'+
              '<div class="jm-r"><button type="button" class="on" data-go>'+esc(T('jm.creer'))+'</button></div>') : '');
    b.querySelector('.jm-x').onclick=fermer;
    [].forEach.call(b.querySelectorAll('[data-j]'), function(c){
      c.onchange=function(){ var id=+c.getAttribute('data-j');
        JM.forEach(function(e){ if(e.id===id) e.garde=c.checked; }); dessiner(); };
    });
    var tt=b.querySelector('[data-tout]'), rr=b.querySelector('[data-rien]'), go=b.querySelector('[data-go]');
    if(tt) tt.onclick=function(){ JM.forEach(function(e){ if(e.t!=='sec') e.garde=true; }); dessiner(); };
    if(rr) rr.onclick=function(){ JM.forEach(function(e){ if(e.t!=='sec') e.garde=false; }); dessiner(); };
    if(go) go.onclick=engendrer;
    w.classList.add('on');
  }

  /* ---- 3) engendrer le récit : un fichier HTML autonome, photos comprises ---- */
  function engendrer(){
    var b=document.getElementById('the-jm').querySelector('.jm-b');
    b.innerHTML='<h3>📰 '+esc(T('jm.creation'))+'</h3><p class="jm-n" id="jm-p">…</p>';
    var corps='', sec=null, buf='', plein=false, fait=0;
    var tot=JM.filter(function(e){ return (e.t==='note'||e.t==='media') && e.garde; }).length;
    function vider(){ if(sec && plein){ corps+='<section><h2>'+sec+'</h2>'+buf+'</section>'; } buf=''; plein=false; }
    var suite=Promise.resolve();
    JM.forEach(function(e){
      suite=suite.then(function(){
        if(e.t==='sec'){ vider(); sec=esc(e.label); return; }
        if(!e.garde) return;
        if(e.t==='note'){ buf+='<p class="n">'+esc(e.texte).split('\n').join('<br>')+'</p>'; plein=true; return; }
        return versDataURL(e.blob).then(function(u){
          if(!u) return;
          buf += e.genre==='video' ? '<video controls playsinline src="'+u+'"></video>'
               : e.genre==='audio' ? '<audio controls src="'+u+'"></audio>'
               : '<figure><img loading="lazy" src="'+u+'">'+(e.legende?'<figcaption>'+esc(e.legende)+'</figcaption>':'')+'</figure>';
          plein=true; fait++;
          var p=document.getElementById('jm-p'); if(p) p.textContent=fait+' / '+tot;
        });
      });
    });
    suite.then(function(){
      vider();
      if(!corps){ b.innerHTML='<h3>'+esc(T('jm.rien.coche'))+'</h3>'; return; }
      var titre=((window.LASTRES&&LASTRES.tour&&LASTRES.tour.titre)||T('itin.mon.itineraire')||'');
      var marque=((window.THEi18n&&THEi18n.pick&&window.HConf&&THEi18n.pick(HConf.marque))||'');
      var css="body{margin:0;background:#f6f1e6;color:#2b2318;font-family:Georgia,'Times New Roman',serif;line-height:1.68}"
        +"header{background:#5a4420;color:#f5ecd8;padding:38px 20px;text-align:center}"
        +"header h1{margin:0;font-size:min(9vw,34px);letter-spacing:.5px;font-weight:700}"
        +"header .m{font-size:13px;letter-spacing:3px;text-transform:uppercase;opacity:.75;margin-bottom:7px}"
        +"main{max-width:740px;margin:0 auto;padding:24px 18px 34px}"
        +"section{margin:0 0 28px;border-bottom:1px solid #e6ddc9;padding-bottom:22px}"
        +"section:last-of-type{border-bottom:none}"
        +"h2{font-size:25px;color:#5a4420;margin:0 0 10px}"
        +"figure{margin:0 0 14px}img,video{width:100%;height:auto;border-radius:6px;display:block}"
        +"figcaption{font-size:13px;color:#8a7c66;font-style:italic;margin-top:5px}"
        +"audio{width:100%;margin-bottom:12px}"
        +".n{font-size:16px;margin:0 0 13px;white-space:pre-wrap}"
        +"footer{text-align:center;font-size:12px;color:#8a7c66;padding:18px}";
      var html='<!doctype html><html lang="'+((window.THEi18n&&THEi18n.lang&&THEi18n.lang())||'fr')+'"><meta charset="utf-8">'
        +'<meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(titre)+'</title>'
        +'<style>'+css+'</style><header>'+(marque?'<div class="m">'+esc(marque)+'</div>':'')
        +'<h1>'+esc(titre)+'</h1></header><main>'+corps+'</main>'
        +'<footer>'+esc(T('jm.pied'))+'</footer></html>';
      var blob=new Blob([html],{type:'text/html'});
      var u=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=u; a.download=(titre.replace(/[^\wÀ-ɏ -]/g,'').trim()||'journal')+'.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(u); }, 5000);
      b.innerHTML='<h3>📰 '+esc(T('jm.pret'))+'</h3><p class="jm-n">'+esc(T('jm.pret.note'))+'</p>'+
        '<div class="jm-r"><button type="button" class="on" data-f>'+esc(T('index.fermer'))+'</button></div>';
      b.querySelector('[data-f]').onclick=fermer;
    });
  }

  function ouvrir(){
    var b=boite().querySelector('.jm-b');
    b.innerHTML='<h3>📰 '+esc(T('jm.titre'))+'</h3><p class="jm-n">'+esc(T('jm.lecture'))+'</p>';
    boite().classList.add('on');
    rassembler().then(function(e){ JM=e; dessiner(); });
  }

  window.THEJournal = { ouvrir: ouvrir };
})();
