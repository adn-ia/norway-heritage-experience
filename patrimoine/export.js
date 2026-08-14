/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — export du dossier (sous-app autonome).
   Produit un document AUTONOME, sobre & éditorial :
     • Télécharger (HTML) : fichier .html autoportant (styles inline).
     • Imprimer / PDF     : ouvre le document et lance l'impression (→ PDF).
     • Envoyer à l'INP    : email pré-rempli vers l'adresse INP (config) ;
                            mailto ne peut pas joindre → on invite à joindre
                            le fichier téléchargé.
   Aucune dépendance externe. Met en valeur la photo si la donnée en porte une.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  var CFG = window.PAT || {};
  function T(k,v){ return window.PATi18n ? PATi18n.uiT(k,v) : k; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function today(){ try{ return new Date().toLocaleDateString(PATi18n?PATi18n.lang():'fr',{year:'numeric',month:'long',day:'numeric'}); }catch(e){ return ''; } }
  function nf(n){ try{ return Number(n).toLocaleString(PATi18n?PATi18n.lang():'fr'); }catch(e){ return ''+n; } }

  function entryHTML(s){
    var ec = window.PATData ? PATData.etatClass(s.etat) : 'na';
    var lab = window.PATData ? PATData.etatLabel(s.etat) : (s.etat||'');
    var meta = [s.localite, s.gov].filter(Boolean).map(esc).join(' · ');
    var coords = (s.lat!=null && s.lon!=null) ? (Number(s.lat).toFixed(5)+', '+Number(s.lon).toFixed(5)) : '';
    var photo = s.photo ? '<div class="ph"><img src="'+esc(s.photo)+'" alt="">'+(s.photo_credit?'<span class="cr">'+esc(s.photo_credit)+'</span>':'')+'</div>' : '';
    var classe = s.classe==='Oui' ? '<span class="cls">'+esc(T('patrimoine.badge.classe'))+'</span>' : '';
    return '<article class="entry '+ec+'">'+photo+
      '<div class="body"><h3>'+esc(s.nom||'—')+' '+classe+'</h3>'+
      (meta?'<p class="meta">'+meta+'</p>':'')+
      '<p class="line"><span class="dot '+ec+'"></span>'+esc(lab)+
      (coords?' <span class="co">· '+esc(coords)+'</span>':'')+'</p></div></article>';
  }

  function buildHTML(sites, filt){
    var peril = sites.filter(function(s){ return (window.PATData?PATData.etatClass(s.etat):'')==='peril'; }).length;
    var css =
      '@page{margin:18mm 16mm;}'+
      "*{box-sizing:border-box;}"+
      "body{margin:0;font-family:'EB Garamond',Georgia,serif;color:#2b2318;background:#fffdf8;line-height:1.55;}"+
      ".wrap{max-width:780px;margin:0 auto;padding:34px 30px 60px;}"+
      ".cover{text-align:center;padding:40px 0 30px;border-bottom:1px solid #e3d8c4;margin-bottom:30px;}"+
      ".cover .kick{font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#a8884f;margin:0 0 12px;}"+
      ".cover h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:40px;margin:0 0 6px;}"+
      ".cover .date{color:#8a7c66;font-style:italic;margin:0 0 18px;}"+
      ".cover .stats{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;}"+
      ".cover .stats b{font-family:'Cormorant Garamond',serif;font-size:24px;}"+
      ".cover .stats .peril b{color:#a5432f;}"+
      ".cover .stats span{display:block;font-size:12px;color:#8a7c66;letter-spacing:.4px;}"+
      ".cover .sel{margin-top:16px;font-size:13px;color:#8a7c66;}"+
      ".entry{display:flex;gap:16px;padding:15px 0;border-bottom:1px solid #efe6d5;page-break-inside:avoid;}"+
      ".entry .ph{flex:0 0 130px;}"+
      ".entry .ph img{width:130px;height:96px;object-fit:cover;border-radius:6px;}"+
      ".entry .ph .cr{display:block;font-size:9px;color:#8a7c66;margin-top:3px;}"+
      ".entry .body{flex:1;}"+
      ".entry h3{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:21px;margin:0 0 2px;}"+
      ".entry .cls{font-size:11px;letter-spacing:.5px;color:#a8884f;border:1px solid #c9ad79;border-radius:12px;padding:1px 8px;vertical-align:middle;}"+
      ".entry .meta{color:#8a7c66;font-size:13.5px;margin:0 0 5px;}"+
      ".entry .line{margin:0;font-size:14.5px;}"+
      ".entry .co{color:#8a7c66;}"+
      ".dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:#8a7c66;margin-right:5px;vertical-align:middle;}"+
      ".dot.peril{background:#a5432f;}.dot.moyen{background:#b9862f;}.dot.bon{background:#5c7a52;}"+
      ".foot{margin-top:34px;padding-top:16px;border-top:1px solid #e3d8c4;text-align:center;color:#8a7c66;font-size:12px;}";
    var head = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
      '<title>'+esc(T('patrimoine.doc.titre'))+'</title>'+
      '<link rel="preconnect" href="https://fonts.googleapis.com">'+
      '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=EB+Garamond:ital@0;1&display=swap" rel="stylesheet">'+
      '<style>'+css+'</style></head><body><div class="wrap">';
    var cover = '<div class="cover"><p class="kick">'+esc(T('patrimoine.kicker'))+'</p>'+
      '<h1>'+esc(T('patrimoine.doc.titre'))+'</h1>'+
      '<p class="date">'+esc(T('patrimoine.doc.date',{d:today()}))+'</p>'+
      '<div class="stats"><span><b>'+nf(sites.length)+'</b>'+esc(T('patrimoine.stat.sites'))+'</span>'+
      '<span class="peril"><b>'+nf(peril)+'</b>'+esc(T('patrimoine.stat.peril'))+'</span></div>'+
      (filt?'<p class="sel">'+esc(T('patrimoine.doc.filtre',{f:filt}))+'</p>':'')+'</div>';
    var body = sites.map(entryHTML).join('');
    var foot = '<div class="foot">'+esc(T('patrimoine.fiche.source'))+' — '+esc(today())+'</div>';
    return head + cover + body + foot + '</div></body></html>';
  }

  function fileName(ext){
    var base = (CFG.marque||'patrimoine').toString().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'patrimoine';
    return base + '-dossier.' + ext;
  }
  function download(html, name){
    var blob = new Blob([html], {type:'text/html;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click();
    setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }

  function currentSel(){
    var sites = window.PATData ? PATData.current() : [];
    var filt  = window.PATData ? PATData.filterText() : '';
    return { sites:sites, filt:filt };
  }

  function doHTML(){ var s=currentSel(); download(buildHTML(s.sites, s.filt), fileName('html')); }
  function doPDF(){
    var s=currentSel(); var w=window.open('', '_blank');
    if(!w){ return; }
    w.document.open(); w.document.write(buildHTML(s.sites, s.filt)); w.document.close();
    setTimeout(function(){ try{ w.focus(); w.print(); }catch(e){} }, 700);
  }
  function doINP(){
    var s=currentSel(); var to=(CFG.inpEmail||'').trim();
    if(!to){ alert(T('patrimoine.export.inp.vide')); return; }
    var subj = T('patrimoine.mail.sujet');
    var body = T('patrimoine.mail.corps', { n: nf(s.sites.length), f: s.filt || '—' });
    location.href = 'mailto:'+encodeURIComponent(to)+'?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
  }

  function wire(){
    var h=document.getElementById('exHTML'), p=document.getElementById('exPDF'), i=document.getElementById('exINP');
    if(h) h.addEventListener('click', doHTML);
    if(p) p.addEventListener('click', doPDF);
    if(i){ if(!(CFG.inpEmail||'').trim()){ i.classList.add('off'); i.title=T('patrimoine.export.inp.vide'); } i.addEventListener('click', doINP); }
  }

  window.PATExport = { buildHTML:buildHTML, wire:wire };
})();
