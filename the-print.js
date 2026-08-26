/* the-print.js — impression du carnet AU CHOIX (composition / disposition).
   Remplace le bouton « PDF / Imprimer » de l'album par un choix de mise en page.
   7 dispositions, 100% CSS d'impression (aucune donnée envoyée) :
     📔 Album (actuel) · 🖼️ Une photo par page · 🔲 Planche-contact ·
     📖 Livret 2 par page · 🖼️ Grande photo + légende · 📰 Magazine 2 colonnes · 📝 Carnet écrit (sans photos).
   Modale AUTONOME (ne dépend d'aucun showModal global). À inclure après roadtrip-plus.js. */
(function(){
  /* Un libellé vient de i18n/, toujours. Aucun mot français dans ce fichier :
     une traduction manquante se corrige dans le fichier de langue, pas ici. */
  function T(cle){ try{ var v=(window.THEi18n && THEi18n.ui && THEi18n.ui(cle)); return (v&&v!==cle)?v:''; }catch(e){ return ''; } }
  /* Dispositions : '' album · one · contact · two · big · mag · text · fridge */

  /* ---------- CSS d'impression pour chaque disposition ---------- */
  var CSS='@media print{'
    +'body.pr-mode .topbar,body.pr-mode .toolbar,body.pr-mode .album-bar,body.pr-mode #lbx,body.pr-mode .share-panel,body.pr-mode #projOv,body.pr-mode #pr-modal{display:none!important}'
    /* --- 🖼️ une photo par page --- */
    +'body.pr-one .album-doc .pic{page-break-after:always;break-inside:avoid;display:flex;align-items:center;justify-content:center;height:95vh;margin:0;padding:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-one .album-doc .pic img,body.pr-one .album-doc .pic video{max-width:100%;max-height:95vh;width:auto;height:auto;object-fit:contain}'
    +'body.pr-one .album-doc .album-cover{page-break-after:always}'
    +'body.pr-one .album-doc .pg-nm,body.pr-one .album-doc .pg-sub,body.pr-one .album-doc .album-cap,body.pr-one .album-doc .pic-cap{display:none!important}'
    +'body.pr-one .album-doc .album-page{padding:0;border:none}'
    /* --- 🔲 planche-contact (grille) --- */
    +'body.pr-contact .album-doc .album-page{display:block;padding:0 0 4mm;border:none}'
    +'body.pr-contact .album-doc .album-ph{display:grid!important;grid-template-columns:repeat(3,1fr);gap:3mm}'
    +'body.pr-contact .album-doc .pic{transform:none!important;margin:0;padding:0;box-shadow:none;background:none;border:none}'
    +'body.pr-contact .album-doc .pic img,body.pr-contact .album-doc .pic video{width:100%;height:32mm;object-fit:cover;display:block}'
    +'body.pr-contact .album-doc .pic-cap,body.pr-contact .album-doc .album-cap,body.pr-contact .album-doc .pg-sub{display:none!important}'
    +'body.pr-contact .album-doc .pg-nm{font-size:12pt;margin:6mm 0 2mm}'
    /* --- 📖 livret 2 par page : ~2 étapes par feuille (pagination naturelle par la hauteur) --- */
    +'body.pr-two .album-doc .album-page{break-inside:avoid;page-break-inside:avoid;height:47vh;overflow:hidden;padding:8mm 12mm;box-sizing:border-box}'
    +'body.pr-two .album-doc .album-cover{page-break-after:always}'
    +'body.pr-two .album-doc .album-ph{gap:4mm}'
    +'body.pr-two .album-doc .pic{margin:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-two .album-doc .pic img,body.pr-two .album-doc .pic video{max-height:26vh;width:auto;object-fit:contain}'
    +'body.pr-two .album-doc .pic-cap{display:none!important}'
    +'body.pr-two .album-doc .album-cap{max-height:3.4em;overflow:hidden}'
    /* --- 🖼️ grande photo + légende : 1 étape / page, 1re photo dominante --- */
    +'body.pr-big .album-doc .album-page{page-break-after:always;break-inside:avoid;padding:12mm;text-align:center;border:none}'
    +'body.pr-big .album-doc .album-cover{page-break-after:always}'
    +'body.pr-big .album-doc .album-ph{display:block}'
    +'body.pr-big .album-doc .pic{margin:0;box-shadow:none;transform:none!important;background:none;border:none}'
    +'body.pr-big .album-doc .pic:not(:first-child){display:none!important}'
    +'body.pr-big .album-doc .pic img,body.pr-big .album-doc .pic video{max-width:100%;max-height:68vh;width:auto;object-fit:contain;display:block;margin:0 auto}'
    +'body.pr-big .album-doc .pg-nm{font-size:22pt;margin:8mm 0 1mm}'
    +'body.pr-big .album-doc .pg-sub{margin-bottom:6mm}'
    +'body.pr-big .album-doc .pic-cap{font-size:11pt;margin-top:4mm}'
    +'body.pr-big .album-doc .album-cap{display:block;border:none!important;background:transparent!important;text-align:center;max-width:120mm;margin:6mm auto 0}'
    /* --- 📰 magazine 2 colonnes : texte + photos en colonnes --- */
    +'body.pr-mag .album-doc .album-page{break-inside:avoid;column-count:2;column-gap:9mm;padding:12mm}'
    +'body.pr-mag .album-doc .album-cover{page-break-after:always}'
    +'body.pr-mag .album-doc .pg-nm,body.pr-mag .album-doc .pg-sub{-webkit-column-span:all;column-span:all}'
    +'body.pr-mag .album-doc .album-ph{display:block}'
    +'body.pr-mag .album-doc .pic{break-inside:avoid;margin:0 0 4mm;box-shadow:none;transform:none!important;background:none;border:none;padding:0}'
    +'body.pr-mag .album-doc .pic img,body.pr-mag .album-doc .pic video{width:100%;height:auto;display:block}'
    +'body.pr-mag .album-doc .album-cap{display:block;border:none!important;background:transparent!important;padding:0;margin:0 0 4mm}'
    /* --- 📝 carnet écrit : seulement les notes, sans photos --- */
    +'body.pr-text .album-doc .album-ph,body.pr-text .album-doc .pic,body.pr-text .album-doc .album-empty{display:none!important}'
    +'body.pr-text .album-doc .album-page{break-inside:avoid;padding:6mm 14mm;border:none;border-bottom:1px solid #d8cdb8}'
    +'body.pr-text .album-doc .pg-nm{font-size:16pt;margin:4mm 0 1mm}'
    +'body.pr-text .album-doc .album-cap{display:block;width:100%;min-height:22mm;height:auto;border:none!important;background:transparent!important;padding:0;overflow:visible;white-space:pre-wrap;resize:none;font-size:12pt;line-height:1.5}'
    /* --- 🧲 frigo vintage : polaroïds collés, aimants du pays --- */
    +'body.pr-fridge .album-doc{background:linear-gradient(135deg,#e2e7ea,#c4ccd2 42%,#d9dee2 60%,#bcc5cb);-webkit-print-color-adjust:exact;print-color-adjust:exact;padding:10mm 8mm}'
    +'body.pr-fridge .album-cover{background:transparent!important;border:none!important;page-break-after:always}'
    +'body.pr-fridge .album-page{background:transparent!important;border:none!important;break-inside:avoid;padding:5mm 2mm 8mm}'
    +'body.pr-fridge .pg-nm{font-family:"Cormorant Garamond",Georgia,serif;background:#fff6c9;color:#3a2c18;display:inline-block;padding:1.5mm 5mm;transform:rotate(-2deg);box-shadow:1px 2px 3px rgba(0,0,0,.25);border-radius:2px;font-size:14pt;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body.pr-fridge .pg-sub,body.pr-fridge .album-cap,body.pr-fridge .album-empty{display:none!important}'
    +'body.pr-fridge .album-ph{display:flex;flex-wrap:wrap;gap:9mm 8mm;justify-content:center;align-items:flex-start;padding-top:7mm}'
    +'body.pr-fridge .pic{position:relative;background:#fff;padding:2.5mm 2.5mm 8mm;box-shadow:0 3px 8px rgba(0,0,0,.35);border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body.pr-fridge .pic img,body.pr-fridge .pic video{width:44mm;height:44mm;object-fit:cover;display:block}'
    +'body.pr-fridge .pic-cap{font-size:8.5pt;text-align:center;margin-top:1.5mm;color:#444;max-width:44mm}'
    +'body.pr-fridge .pic:nth-child(4n+1){transform:rotate(-4deg)}'
    +'body.pr-fridge .pic:nth-child(4n+2){transform:rotate(3deg)}'
    +'body.pr-fridge .pic:nth-child(4n+3){transform:rotate(-1.5deg)}'
    +'body.pr-fridge .pic:nth-child(4n){transform:rotate(2.5deg)}'
    +'body.pr-fridge .pic::before{position:absolute;top:-4mm;left:50%;transform:translateX(-50%);font-size:15pt;z-index:2;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'body.pr-fridge .pic:nth-child(4n+1)::before{content:"⚜️"}'
    +'body.pr-fridge .pic:nth-child(4n+2)::before{content:"🍁"}'
    +'body.pr-fridge .pic:nth-child(4n+3)::before{content:"🏒"}'
    +'body.pr-fridge .pic:nth-child(4n)::before{content:"🫎"}'
    +'}';
  var st=document.createElement('style'); st.textContent=CSS; document.head.appendChild(st);

  /* ---------- impression ---------- */
  function doPrint(mode){
    document.body.classList.remove('pr-one','pr-contact','pr-two','pr-big','pr-mag','pr-text','pr-fridge');
    document.body.classList.add('pr-mode');
    if(mode) document.body.classList.add('pr-'+mode);
    setTimeout(function(){
      window.print();
      setTimeout(function(){ document.body.classList.remove('pr-mode','pr-one','pr-contact','pr-two','pr-big','pr-mag','pr-text','pr-fridge'); }, 600);
    }, 180);
  }

  /* ---------- modale autonome (palette album) ---------- */
  var OV=null;
  function ensureModal(){
    if(OV) return OV;
    var mcss='#pr-modal{position:fixed;inset:0;z-index:1500;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:22px}'
      +'#pr-modal.on{display:flex}'
      +'#pr-modal .pr-box{background:#fffdf8;color:#2b2318;border-radius:14px;padding:18px 18px 20px;max-width:420px;width:100%;position:relative;box-shadow:0 12px 44px rgba(0,0,0,.5)}'
      +'#pr-modal .pr-x{position:absolute;top:8px;right:11px;background:none;border:none;font-size:24px;line-height:1;cursor:pointer;color:#8a7c66}'
      +'#pr-modal h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:700;font-size:22px;margin:0 2px 2px}'
      +'#pr-modal .pr-lead{font-size:13px;color:#8a7c66;margin:0 2px 12px}'
      +'#pr-modal .pr-opt{display:block;width:100%;text-align:left;margin:7px 0;padding:11px 13px;border:1px solid #e3d8c4;border-radius:9px;background:#fff;color:#2b2318;font:inherit;font-size:14px;cursor:pointer}'
      +'#pr-modal .pr-opt:hover{border-color:#a8884f;background:#fbf6ea}'
      +'#pr-modal .pr-opt.pr-primary{background:#2b2318;color:#f6f0e4;border-color:#2b2318}'
      +'#pr-modal .pr-opt small{display:block;font-size:11.5px;opacity:.75;font-weight:400;margin-top:2px}';
    var s=document.createElement('style'); s.textContent=mcss; document.head.appendChild(s);
    OV=document.createElement('div'); OV.id='pr-modal';
    OV.innerHTML='<div class="pr-box"></div>';
    document.body.appendChild(OV);
    OV.addEventListener('click',function(e){ if(e.target===OV) closeChooser(); });
    document.addEventListener('keydown',function(e){ if(e.key==='Escape' && OV.classList.contains('on')) closeChooser(); });
    return OV;
  }
  function closeChooser(){ if(OV) OV.classList.remove('on'); }

  function opt(mode,primary,ic,title,sub){
    return '<button class="pr-opt'+(primary?' pr-primary':'')+'" type="button" data-mode="'+mode+'">'+ic+' '+T(title)+'<small>'+T(sub)+'</small></button>';
  }
  function chooser(){
    var ov=ensureModal();
    ov.querySelector('.pr-box').innerHTML=
      '<button class="pr-x" type="button" aria-label="'+T('index.fermer')+'">×</button>'+
      '<h3>🖨️ '+T('print.titre')+'</h3>'+
      '<p class="pr-lead">'+T('print.choisir')+'</p>'+
      opt('',1,'📔','print.album','print.album.sous')+
      opt('one',0,'🖼️','print.une','print.une.sous')+
      opt('contact',0,'🔲','print.contact','print.contact.sous')+
      opt('two',0,'📖','print.livret','print.livret.sous')+
      opt('big',0,'🖼️','print.grande','print.grande.sous')+
      opt('mag',0,'📰','print.magazine','print.magazine.sous')+
      opt('text',0,'📝','print.texte','print.texte.sous')+
      opt('fridge',0,'🧲','print.frigo','print.frigo.sous');
    ov.querySelector('.pr-x').onclick=closeChooser;
    [].forEach.call(ov.querySelectorAll('.pr-opt'),function(b){
      b.onclick=function(){ var m=b.getAttribute('data-mode'); closeChooser(); doPrint(m); };
    });
    ov.classList.add('on');
  }

  /* ---------- branchement sur le bouton PDF/Imprimer de l'album ---------- */
  function hook(){ var b=document.getElementById('albumprint'); if(b && b._prhook!==2){ b._prhook=2; b.onclick=function(e){ if(e)e.preventDefault(); chooser(); }; } }
  if(document.readyState!=='loading') hook(); else document.addEventListener('DOMContentLoaded', hook);
  setTimeout(hook, 1200); setTimeout(hook, 2200);
  try{ new MutationObserver(hook).observe(document.body,{childList:true,subtree:true}); }catch(e){}
})();
