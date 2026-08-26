/* the-postcard.js — CARTE POSTALE
   ============================================================================
   PORT FIDÈLE de la carte postale du « Road Trip de Foss » (version en ligne du
   09/08/2026), sans Firebase. Géométrie, garde-fous et gestes repris tels quels :

     • trois styles — 🗂️ Collage (planche de photos) · 🌙 Immersif (photo pleine,
       texte en surimpression) · ☀️ Photo nette (photo entière, jamais recadrée) ;
     • PLUSIEURS photos sur une même carte (jusqu'à 6), pas une seule ;
     • ★ choisit la photo de FOND pour Immersif et Photo nette ;
     • une LÉGENDE par photo, pré-remplie depuis le carnet et éditable ici ;
     • le mot manuscrit est GRAVÉ dans l'image et CONSERVÉ d'une fois sur l'autre
       (clé « the_pc_<lieu> ») — on ne le retape pas à chaque ouverture ;
     • correctif du 09/08 nº1 : la date se place SOUS le titre réel, même quand
       le titre tient sur deux lignes — elle ne le chevauche plus ;
     • correctif du 09/08 nº2 : le pied de carte porte le domaine NU, sans ancre.

   Deux écarts assumés, et deux seulement : le tampon porte la marque de
   l'édition (une carte de patrimoine ne peut pas signer « FOSS »), et les
   couleurs sont celles de Heritage. Tout le reste est le modèle.

   API inchangée : THEPostcard.open(nom, ville)  |  open({nom, ville, placeKey,
                   lat, lng, msgKey})
   ============================================================================ */
(function(){
  "use strict";

  /* palette Heritage (l'équivalent des variables du modèle) */
  var INK='#2b2318', PAPER='#fbf6ea', LINE='#d8cdb3', GOLD='#a8884f', GOLD_D='#96773f',
      STONE='#8a7c66', DEEP='#4b3f2a';
  var CURSIVE='"Caveat","Snell Roundhand","Segoe Script","Brush Script MT",cursive';
  var SERIF='"Cormorant Garamond",Georgia,serif';
  var BODY='"EB Garamond",Georgia,serif';

  var PC={ photos:[], sel:[], caps:[], bgIdx:0, style:'collage', nom:'', ville:'',
           lat:null, lng:null, msgKey:'', msg:'' };

  function $(id){ return document.getElementById(id); }
  function T(k,d){ try{ var v=(window.THEi18n&&THEi18n.ui&&THEi18n.ui(k)); return (v&&v!==k)?v:(d||k); }catch(e){ return d||k; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function brand(){ try{ var m=document.querySelector('meta[name="pc-brand"]');
    return (window.PC_BRAND)||(m&&m.content)||'HERITAGE'; }catch(e){ return 'HERITAGE'; } }
  /* règle des briques auto-portées : la langue vient de l'hôte, puis de la
     PAGE, puis de l'anglais — jamais d'une langue de pays en dur. */
  function lang(){ try{ return (localStorage.getItem('the_lang')||document.documentElement.lang||'en').slice(0,2); }catch(e){ return 'en'; } }
  function domaine(){ try{ return String(location.host||'').replace(/^www\./,''); }catch(e){ return ''; } }

  /* ------------------------------------------------------------------ dessin
     Les quatre primitives du modèle, à l'identique. */

  // remplit un rectangle en gardant le cadrage (recadre au besoin)
  function drawCover(ctx,img,x,y,w,h){
    if(!img){ ctx.fillStyle='#eee7d8'; ctx.fillRect(x,y,w,h); return; }
    var ir=img.width/img.height, rr=w/h, sw,sh,sx,sy;
    if(ir>rr){ sh=img.height; sw=sh*rr; sx=(img.width-sw)/2; sy=0; }
    else      { sw=img.width;  sh=sw/rr; sx=0; sy=(img.height-sh)/2; }
    ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);
  }

  /* le retour est la BASELINE DE LA DERNIÈRE LIGNE : c'est lui qui permet de
     poser la date sous un titre de deux lignes sans la lui superposer. */
  function wrap(ctx,text,x,y,maxW,lh,maxLines){
    var words=(text||'').split(/\s+/), lines=[], line='';
    for(var i=0;i<words.length;i++){
      var t=line?line+' '+words[i]:words[i];
      if(ctx.measureText(t).width>maxW && line){ lines.push(line); line=words[i]; } else line=t;
    }
    if(line) lines.push(line);
    if(maxLines && lines.length>maxLines){
      lines=lines.slice(0,maxLines); var last=lines[maxLines-1];
      while(last.indexOf(' ')>=0 && ctx.measureText(last+' …').width>maxW){ last=last.replace(/\s+\S+$/,''); }
      lines[maxLines-1]=last+' …';
    }
    for(var j=0;j<lines.length;j++){ ctx.fillText(lines[j], x, y+j*lh); }
    return y + (lines.length ? (lines.length-1)*lh : 0);
  }

  /* miniatures ADAPTATIVES : 2 colonnes, chaque photo à SON format, non déformée */
  function thumbGrid(ctx,items,x,y,w,h){
    var n=items.length;
    if(!n){ ctx.fillStyle='#f2ece0'; ctx.fillRect(x,y,w,h); ctx.fillStyle=STONE;
      ctx.font='22px '+BODY; ctx.textAlign='center';
      ctx.fillText(T('pc.choisis.photos'), x+w/2, y+h/2);
      ctx.textAlign='left'; return; }
    var cols=(n===1?1:2), g=12, colW=(w-g*(cols-1))/cols;
    var colH=[], colItems=[]; for(var c=0;c<cols;c++){ colH[c]=0; colItems[c]=[]; }
    for(var i=0;i<n;i++){
      var im=items[i].img, cap=(items[i].cap||'').trim(),
          ar=(im&&im.width)?(im.width/im.height):1.4, capH=cap?32:0, sc=0;
      for(var q=1;q<cols;q++){ if(colH[q]<colH[sc]) sc=q; }
      colItems[sc].push({im:im,ar:ar,cap:cap,capH:capH}); colH[sc]+=colW/ar+capH+g;
    }
    var maxH=0; for(var c2=0;c2<cols;c2++){ colH[c2]-=g; if(colH[c2]>maxH) maxH=colH[c2]; }
    var scale=(maxH>h)?h/maxH:1, tW=cols*colW*scale+(cols-1)*g, ox=x+(w-tW)/2;
    for(var c3=0;c3<cols;c3++){
      var cx=ox+c3*(colW*scale+g), cy=y;
      for(var k=0;k<colItems[c3].length;k++){
        var it=colItems[c3][k], iw=colW*scale, ph=(colW/it.ar)*scale, capH2=it.capH*scale, fh=ph+capH2;
        ctx.save(); ctx.shadowColor='rgba(43,35,24,.22)'; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
        ctx.fillStyle='#fff'; ctx.fillRect(cx,cy,iw,fh); ctx.restore();
        drawCover(ctx, it.im, cx+6, cy+6, iw-12, ph-12);
        if(it.cap){ ctx.fillStyle=DEEP; ctx.font='600 '+Math.round(24*scale)+'px '+CURSIVE;
          ctx.textAlign='center'; ctx.fillText(it.cap, cx+iw/2, cy+ph+capH2*0.66, iw-12); ctx.textAlign='left'; }
        cy += fh+g;
      }
    }
  }

  /* miniature « collée » façon polaroid (cadre blanc + légère rotation) */
  function polaroid(ctx,img,cx,cy,w,rot,cap){
    cap=(cap||'').trim();
    var ar=(img&&img.width)?(img.width/img.height):1.4, ih=w/ar, capH=cap?26:0,
        fw=w+16, fh=ih+16+16+capH;
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(rot||0);
    ctx.shadowColor='rgba(0,0,0,.45)'; ctx.shadowBlur=14; ctx.shadowOffsetY=6;
    ctx.fillStyle='#fff'; ctx.fillRect(-fw/2,-fh/2,fw,fh);
    ctx.shadowColor='transparent'; ctx.shadowBlur=0;
    drawCover(ctx,img,-w/2,-fh/2+8,w,ih);
    if(cap){ ctx.fillStyle=DEEP; ctx.font='600 24px '+CURSIVE; ctx.textAlign='center';
      ctx.fillText(cap, 0, -fh/2+8+ih+capH*0.82, w); ctx.textAlign='left'; }
    ctx.restore();
  }

  /* le tampon : cadre pointillé, emblème, marque de l'édition et l'année.
     Le modèle signait quatre lettres. Une édition Heritage signe le nom
     complet de sa marque : la mention débordait du cadre. On réduit donc
     le corps jusqu'à ce qu'elle tienne, et on la coupe en deux lignes si le
     nom de l'édition est long — le tampon reste un tampon. */
  function tampon(ctx,W,clair){
    var x=W-178, y=52, s=120, cx=W-118, larg=s-12;
    ctx.save(); ctx.setLineDash([6,5]);
    ctx.strokeStyle = clair ? 'rgba(255,255,255,.85)' : GOLD;
    ctx.lineWidth   = clair ? 2 : 3;
    ctx.strokeRect(x,y,s,clair?s:140); ctx.setLineDash([]);
    ctx.fillStyle = clair ? '#fff' : GOLD_D; ctx.textAlign='center';
    ctx.font='46px serif'; ctx.fillText('✦', cx, clair?110:114);
    var mots=(brand()+' · '+new Date().getFullYear()).split(/\s+/), lignes=[], l='';
    for(var i=0;i<mots.length;i++){
      ctx.font='italic 13px '+BODY;
      var t=l?l+' '+mots[i]:mots[i];
      if(ctx.measureText(t).width>larg && l){ lignes.push(l); l=mots[i]; } else l=t;
    }
    if(l) lignes.push(l);
    if(lignes.length>2) lignes=lignes.slice(0,2);
    var corps=13;
    while(corps>8){                                    // le corps se réduit jusqu'à tenir
      ctx.font='italic '+corps+'px '+BODY;
      var trop=lignes.some(function(x2){ return ctx.measureText(x2).width>larg; });
      if(!trop) break; corps-=1;
    }
    ctx.font='italic '+corps+'px '+BODY;
    var base=(clair?140:150)-(lignes.length-1)*(corps+2);
    lignes.forEach(function(x2,k){ ctx.fillText(x2, cx, base+k*(corps+2)); });
    ctx.textAlign='left'; ctx.restore();
  }

  /* Le modèle affichait une adresse courte. Les noms de sites patrimoniaux sont
     longs (« Site archéologique de Dougga — Téboursouk ») : à corps fixe, le
     titre se coupait dès le deuxième mot. On réduit le corps jusqu'à ce que le
     nom tienne en deux lignes plutôt que de l'amputer. */
  function corpsTitre(ctx,texte,maxW,base,mini,police){
    var c=base;
    while(c>mini){
      ctx.font=police(c);
      var mots=(texte||'').split(/\s+/), n=1, l='';
      for(var i=0;i<mots.length;i++){
        var t=l?l+' '+mots[i]:mots[i];
        if(ctx.measureText(t).width>maxW && l){ n++; l=mots[i]; } else l=t;
      }
      if(n<=2) break;
      c-=2;
    }
    return c;
  }

  /* le mot manuscrit, gravé dans l'image */
  function manuscrit(ctx,texte,x,y,maxW,lh,lignes){
    var mw=(texte||'').split(/\s+/), ml='', yy=y, dn=0;
    for(var w=0;w<mw.length;w++){
      var tt=ml?ml+' '+mw[w]:mw[w];
      if(ctx.measureText(tt).width>maxW && ml){ ctx.fillText(ml,x,yy); ml=mw[w]; yy+=lh; if(++dn>=lignes-1) break; }
      else ml=tt;
    }
    if(ml && dn<lignes) ctx.fillText(ml,x,yy);
  }

  function drawPostcard(canvas, data){
    if(data && data.style==='full')       renderPostcardFull(canvas, data);
    else if(data && data.style==='clean') renderPostcardClean(canvas, data);
    else                                  renderPostcard(canvas, data);
  }

  /* ☀️ PHOTO NETTE : photo entière sur fond flou, juste l'écriture cursive */
  function renderPostcardClean(canvas, data){
    var W=1200,H=800, ctx=canvas.getContext('2d'); canvas.width=W; canvas.height=H;
    var bg=((data.imgs||[])[0]||{}).img;
    if(bg){
      ctx.save(); ctx.filter='blur(24px)'; drawCover(ctx,bg,-50,-50,W+100,H+100); ctx.restore();
      var ar0=bg.width/bg.height, iw0=W-56, ih0=H-56, dw0,dh0;
      if(ar0>iw0/ih0){ dw0=iw0; dh0=dw0/ar0; } else { dh0=ih0; dw0=dh0*ar0; }
      ctx.drawImage(bg,(W-dw0)/2,(H-dh0)/2,dw0,dh0);          // photo ENTIÈRE, non coupée
    } else {
      ctx.fillStyle=DEEP; ctx.fillRect(0,0,W,H); ctx.fillStyle='rgba(255,255,255,.7)';
      ctx.font='24px '+BODY; ctx.textAlign='center';
      ctx.fillText(T('pc.choisis.fond'),W/2,H/2); ctx.textAlign='left';
    }
    var gt=ctx.createLinearGradient(0,0,0,H*0.24); gt.addColorStop(0,'rgba(0,0,0,.42)'); gt.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gt; ctx.fillRect(0,0,W,H*0.28);
    var gb=ctx.createLinearGradient(0,H*0.6,0,H); gb.addColorStop(0,'rgba(0,0,0,0)'); gb.addColorStop(1,'rgba(0,0,0,.55)');
    ctx.fillStyle=gb; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='rgba(255,255,255,.7)'; ctx.lineWidth=4; ctx.strokeRect(26,26,W-52,H-52);
    tampon(ctx,W,true);
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.88)'; ctx.shadowBlur=13; ctx.shadowOffsetY=2;
    var _cT=corpsTitre(ctx, data.place||'', W-320, 56, 30, function(c){ return 'bold '+c+'px '+SERIF; });
    ctx.fillStyle='#fff'; ctx.font='bold '+_cT+'px '+SERIF;
    var _ty=wrap(ctx, data.place||'', 66, 116, W-320, _cT, 2);          // ← baseline réelle
    ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font='italic 30px '+BODY;
    ctx.fillText(data.dates||'', 66, _ty+42);                           // ← la date SOUS le titre
    ctx.fillStyle='#fff'; ctx.font='600 54px '+CURSIVE;
    manuscrit(ctx, data.message, 66, H-236, W-132, 56, 3);
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font='italic 20px '+BODY;
    ctx.fillText('📍 '+(data.url||''), 66, H-56);
  }

  /* 🌙 IMMERSIF : photo en fond assombri, polaroïds éparpillés, texte blanc */
  function renderPostcardFull(canvas, data){
    var W=1200,H=800, ctx=canvas.getContext('2d'); canvas.width=W; canvas.height=H;
    var bg=((data.imgs||[])[0]||{}).img;
    if(bg){
      ctx.save(); ctx.filter='blur(26px)'; drawCover(ctx,bg,-50,-50,W+100,H+100); ctx.restore();
      ctx.fillStyle='rgba(20,16,10,.30)'; ctx.fillRect(0,0,W,H);
      var ar=bg.width/bg.height, iw=W-56, ihm=H-56, dw,dh;
      if(ar>iw/ihm){ dw=iw; dh=dw/ar; } else { dh=ihm; dw=dh*ar; }
      ctx.drawImage(bg,(W-dw)/2,(H-dh)/2,dw,dh);
    } else {
      ctx.fillStyle=DEEP; ctx.fillRect(0,0,W,H); ctx.fillStyle='rgba(255,255,255,.6)';
      ctx.font='24px '+BODY; ctx.textAlign='center';
      ctx.fillText(T('pc.choisis.fond.bas'), W/2, H/2); ctx.textAlign='left';
    }
    var gb=ctx.createLinearGradient(0,H*0.24,0,H);
    gb.addColorStop(0,'rgba(0,0,0,0)'); gb.addColorStop(.6,'rgba(0,0,0,.42)'); gb.addColorStop(1,'rgba(0,0,0,.84)');
    ctx.fillStyle=gb; ctx.fillRect(0,0,W,H);
    var gt=ctx.createLinearGradient(0,0,0,H*0.34); gt.addColorStop(0,'rgba(0,0,0,.5)'); gt.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gt; ctx.fillRect(0,0,W,H*0.4);
    ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=4; ctx.strokeRect(26,26,W-52,H-52);
    tampon(ctx,W,true);
    var extra=(data.imgs||[]).slice(1,6);        // polaroïds éparpillés (scrapbook)
    if(extra.length){
      var slots=[{x:.80,y:.40,r:-.06},{x:.84,y:.68,r:.07},{x:.61,y:.75,r:-.05},{x:.70,y:.31,r:.05},{x:.47,y:.69,r:-.07}];
      extra.forEach(function(it,i){ var sl=slots[i%slots.length]; polaroid(ctx, it.img, sl.x*W, sl.y*H, 156, sl.r, it.cap); });
    }
    ctx.save(); ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=8;
    var _cT=corpsTitre(ctx, data.place||'', W-320, 56, 30, function(c){ return 'bold '+c+'px '+SERIF; });
    ctx.fillStyle='#fff'; ctx.font='bold '+_cT+'px '+SERIF;
    var _ty=wrap(ctx, data.place||'', 66, 118, W-320, _cT, 2);
    ctx.fillStyle='rgba(255,255,255,.9)'; ctx.font='italic 30px '+BODY;
    ctx.fillText(data.dates||'', 66, _ty+42);
    ctx.shadowColor='rgba(0,0,0,.92)'; ctx.shadowBlur=13; ctx.shadowOffsetY=2;
    ctx.fillStyle='#fff'; ctx.font='600 54px '+CURSIVE;
    manuscrit(ctx, data.message, 66, H-284, W-380, 56, 4);
    ctx.restore();
    ctx.fillStyle='rgba(255,255,255,.92)'; ctx.font='italic 20px '+BODY;
    ctx.fillText('📍 '+(data.url||''), 66, H-56);
  }

  /* 🗂️ COLLAGE : planche de photos à gauche, mot manuscrit ligné à droite */
  function renderPostcard(canvas, data){
    var W=1200,H=800, ctx=canvas.getContext('2d'); canvas.width=W; canvas.height=H;
    ctx.fillStyle=PAPER; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle=LINE; ctx.lineWidth=6; ctx.strokeRect(20,20,W-40,H-40);
    thumbGrid(ctx, (data.imgs||[]).slice(0,6), 52,52,548,H-104);
    var rx=648, rw=W-52-rx;
    tampon(ctx,W,false);
    var _cT=corpsTitre(ctx, data.place||'', rw-140, 46, 26, function(c){ return 'bold '+c+'px '+SERIF; });
    ctx.fillStyle=INK; ctx.font='bold '+_cT+'px '+SERIF;
    var _ty=wrap(ctx, data.place||'', rx, 96, rw-140, _cT+2, 2);
    ctx.fillStyle=GOLD; ctx.font='italic 26px '+BODY;
    ctx.fillText(data.dates||'', rx, _ty+48);
    ctx.strokeStyle='#e6dcc4'; ctx.lineWidth=2;
    /* même esprit que le correctif du 09/08 : quand le titre prend deux lignes,
       la date descend — et c'est le message qui viendrait la toucher. Le bloc
       ligné démarre donc SOUS la date, jamais dessus. */
    var my0=Math.max(210, _ty+48+62), lh=52, lignes=7;
    lignes=Math.max(3, Math.min(7, Math.floor((H-120-my0)/lh)));
    for(var L=0;L<lignes;L++){ var yy=my0+L*lh+8; ctx.beginPath(); ctx.moveTo(rx,yy); ctx.lineTo(W-56,yy); ctx.stroke(); }
    ctx.fillStyle='#3a3226'; ctx.font='600 46px '+CURSIVE;
    manuscrit(ctx, data.message, rx, my0, W-56-rx, lh, lignes);
    ctx.fillStyle='#6b6250'; ctx.font='italic 20px '+BODY;
    ctx.fillText('📍 '+(data.url||domaine()), rx, H-76);
    ctx.fillStyle=STONE; ctx.font='16px '+BODY; ctx.fillText('✦ '+brand(), rx, H-50);
  }

  /* ------------------------------------------------------- carnet de l'étape
     Les photos du carnet, avec leur légende déjà écrite là-bas. */
  function carnetMedia(placeKey){ return new Promise(function(res){
    try{ var r=indexedDB.open('the-carnet',1);
      r.onsuccess=function(){ try{
        var os=r.result.transaction('photos','readonly').objectStore('photos'), out=[];
        var c=os.index('place').openCursor(IDBKeyRange.only(placeKey));
        c.onsuccess=function(e){ var x=e.target.result; if(x){ out.push(x.value); x.continue(); } else res(out); };
        c.onerror=function(){ res([]); };
      }catch(e){ res([]); } };
      r.onerror=function(){ res([]); };
    }catch(e){ res([]); }
  }); }

  function chargerImage(url){ return new Promise(function(res){
    var im=new Image(); im.onload=function(){ res(im); }; im.onerror=function(){ res(null); }; im.src=url;
  }); }

  /* ------------------------------------------------------------------- écran */
  function pickCell(p,i){
    return '<div class="pc-pk '+(PC.sel[i]?'on':'off')+(i===PC.bgIdx?' bg':'')+'"'
      + ' style="background-image:url(\''+p.url+'\')" data-pk="'+i+'"><span class="chk">✓</span>'
      + (p.label?'<span class="pc-src">📍 '+esc(String(p.label).slice(0,18))+'</span>':'')
      + '<button class="pc-star" data-bg="'+i+'" title="'+esc(T('pc.photo.de.fond'))+'">★</button></div>';
  }
  function pickInner(){ return PC.photos.map(pickCell).join(''); }

  function selImgs(){
    var chosen=[], i;
    for(i=0;i<PC.photos.length;i++){ if(PC.sel[i]) chosen.push(i); }
    var order;
    if(PC.style==='full' || PC.style==='clean'){        // le fond d'abord, puis les miniatures
      var bg=(PC.sel[PC.bgIdx]?PC.bgIdx:(chosen.length?chosen[0]:-1));
      order=(bg>=0?[bg]:[]).concat(chosen.filter(function(x){ return x!==bg; }));
    } else order=chosen;
    return order.map(function(x){ return {img:PC.photos[x].img, cap:PC.caps[x]}; });
  }

  var DATA=null;
  function redraw(){
    var cv=$('pc-canvas'); if(!cv||!DATA) return;
    DATA.place  = ($('pc-place')||{}).value||'';
    DATA.message= ($('pc-msg')||{}).value||'';
    DATA.imgs   = selImgs();
    DATA.style  = PC.style;
    drawPostcard(cv, DATA);
  }
  function majLibelle(){
    var lab=$('pc-picklab'); if(!lab) return;
    lab.innerHTML = PC.photos.length
      ? esc(T('pc.photos.sur.la.carte'))
        +' <span class="pc-mut">('+esc(T('pc.appuie.pour.choisir'))+')</span>'
      : esc(T('pc.aucune.photo'));
  }
  function refreshPicks(){
    majLibelle();
    var box=$('pc-pick');
    if(box){ box.className='pc-pick'+((PC.style==='full'||PC.style==='clean')?' choosebg':'');
      box.innerHTML=pickInner(); brancherPicks(); }
    renderCaps();
  }
  function renderCaps(){
    var box=$('pc-caps'); if(!box) return; var rows='';
    for(var i=0;i<PC.photos.length;i++){
      if(!PC.sel[i]) continue;
      rows+='<div class="pc-caprow"><span class="pc-capthumb" style="background-image:url(\''+PC.photos[i].url+'\')"></span>'
        + '<input class="pc-capinput" type="text" value="'+esc(PC.caps[i])+'" data-cap="'+i+'" placeholder="'
        + esc(T('pc.legende.photo'))+'"></div>';
    }
    box.innerHTML = rows
      ? ('<div class="pc-s">'+esc(T('pc.legende.sous.chaque'))
         +' <span class="pc-mut">('+esc(T('pc.optionnel'))+')</span></div>'+rows)
      : '';
    box.querySelectorAll('[data-cap]').forEach(function(inp){
      inp.oninput=function(){ PC.caps[+inp.getAttribute('data-cap')]=this.value; redraw(); };
    });
  }
  function brancherPicks(){
    var box=$('pc-pick'); if(!box) return;
    box.querySelectorAll('[data-pk]').forEach(function(el){
      el.onclick=function(e){
        if(e.target.hasAttribute('data-bg')) return;
        var i=+el.getAttribute('data-pk'); PC.sel[i]=!PC.sel[i];
        if(!PC.sel[i] && i===PC.bgIdx){ var f=-1;
          for(var k=0;k<PC.photos.length;k++){ if(PC.sel[k]){ f=k; break; } }
          PC.bgIdx=(f>=0?f:0); }
        refreshPicks(); redraw();
      };
    });
    box.querySelectorAll('[data-bg]').forEach(function(b){
      b.onclick=function(e){ e.stopPropagation(); var i=+b.getAttribute('data-bg');
        PC.sel[i]=true; PC.bgIdx=i; refreshPicks(); redraw(); };
    });
  }

  function ajouterFichier(blob){
    if(!blob || !/^image/.test(blob.type||'')) return;
    var url=URL.createObjectURL(blob);
    chargerImage(url).then(function(im){
      if(!im) return;
      PC.photos.push({url:url, img:im, label:'', cap:''});
      PC.sel.push(PC.sel.filter(Boolean).length<6); PC.caps.push('');
      refreshPicks(); redraw();
    });
  }

  function open(a,b){
    var o=(a && typeof a==='object')?a:{nom:a, ville:b};
    PC.nom=o.nom||''; PC.ville=o.ville||''; PC.lat=o.lat; PC.lng=o.lng;
    PC.photos=[]; PC.sel=[]; PC.caps=[]; PC.bgIdx=0;
    PC.msgKey = o.msgKey || ('the_pc_'+(o.placeKey||PC.nom||'lieu'));
    try{ PC.msg = localStorage.getItem(PC.msgKey) || ''; }catch(e){ PC.msg=''; }
    try{ var st=localStorage.getItem('the_pc_style'); PC.style=(st==='full'||st==='clean')?st:'collage'; }
    catch(e){ PC.style='collage'; }

    var d=new Date(), dates=d.toLocaleDateString(lang(),{day:'numeric',month:'long',year:'numeric'});
    var lieu = PC.nom + (PC.ville ? ' — '+PC.ville : '');

    $('pc-box').innerHTML =
        '<button class="pc-x" data-close="1">✕</button>'
      + '<h3 class="pc-h3">✉️ '+esc(T('carnet.carte.postale'))+' — '+esc(PC.nom)+'</h3>'
      + '<div class="pc-tpl">'
        + '<button class="pc-stybtn" data-tpl="collage">🗂️ '+esc(T('pc.style.collage'))+'</button>'
        + '<button class="pc-stybtn" data-tpl="full">🌙 '+esc(T('pc.style.immersif'))+'</button>'
        + '<button class="pc-stybtn" data-tpl="clean">☀️ '+esc(T('pc.style.nette'))+'</button>'
      + '</div>'
      + '<canvas id="pc-canvas"></canvas>'
      + '<div class="pc-s" id="pc-picklab"></div>'
      + '<div class="pc-pick" id="pc-pick"></div>'
      + '<div class="pc-addrow"><label class="pc-addbtn">＋ '+esc(T('pc.ajouter.photo'))
        + '<input id="pc-img" type="file" accept="image/*" multiple hidden></label></div>'
      + '<div id="pc-caps"></div>'
      + '<div class="pc-row"><input id="pc-place" type="text" value="'+esc(lieu)+'" placeholder="'
        + esc(T('postcard.nom.du.lieu'))+'"></div>'
      + '<div class="pc-row"><textarea id="pc-msg" placeholder="'
        + esc(T('pc.ecris.un.mot'))+'">'+esc(PC.msg)+'</textarea></div>'
      + '<div class="pc-act"><button id="pc-share">📤 '+esc(T('postcard.partager'))+'</button>'
        + '<button id="pc-dl">⬇️ '+esc(T('postcard.telecharger'))+'</button></div>';

    DATA={ place:lieu, dates:dates, message:PC.msg, imgs:[], url:domaine(), style:PC.style };

    function syncStyle(){
      $('pc-box').querySelectorAll('[data-tpl]').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-tpl')===PC.style); });
    }
    $('pc-box').querySelectorAll('[data-tpl]').forEach(function(b){
      b.onclick=function(){ PC.style=b.getAttribute('data-tpl');
        try{ localStorage.setItem('the_pc_style', PC.style); }catch(e){}
        syncStyle(); refreshPicks(); redraw(); };
    });
    $('pc-box').querySelector('[data-close]').onclick=close;
    $('pc-place').oninput=redraw;
    $('pc-msg').oninput=function(){ try{ localStorage.setItem(PC.msgKey, this.value); }catch(e){} redraw(); };
    $('pc-img').onchange=function(e){
      var fs=e.target.files?[].slice.call(e.target.files):[]; fs.forEach(ajouterFichier); this.value=''; };
    $('pc-share').onclick=function(){ redraw(); setTimeout(partager,60); };
    $('pc-dl').onclick=function(){ redraw(); setTimeout(function(){ telecharger(); },60); };

    syncStyle(); refreshPicks(); redraw();
    $('pc-wrap').classList.add('on');

    /* les photos du carnet arrivent ensuite, avec leur légende déjà écrite */
    if(o.placeKey){
      carnetMedia(o.placeKey).then(function(list){
        var photos=(list||[])
          .filter(function(m){ return m && m.blob && /^image/.test(m.type||m.blob.type||''); })
          .sort(function(x,y){ return (x.ord||x.ts||0)-(y.ord||y.ts||0); });
        var chaine=Promise.resolve();
        photos.forEach(function(m){
          chaine=chaine.then(function(){
            var url=URL.createObjectURL(m.blob);
            return chargerImage(url).then(function(im){
              if(!im) return;
              PC.photos.push({url:url, img:im, label:'', cap:(m.caption||'')});
              PC.sel.push(PC.photos.length<=6);
              PC.caps.push(m.caption||'');
            });
          });
        });
        chaine.then(function(){ refreshPicks(); redraw(); });
      });
    }
  }

  function close(){ $('pc-wrap').classList.remove('on'); }

  function nomFichier(){
    var s=String(PC.nom||'carte').toLowerCase()
      .replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,40)||'carte';
    return 'carte-'+s+'.jpg';
  }
  function telecharger(){
    var cv=$('pc-canvas'); if(!cv) return;
    cv.toBlob(function(b){ if(!b) return;
      var u=URL.createObjectURL(b), a=document.createElement('a');
      a.href=u; a.download=nomFichier(); a.click();
      setTimeout(function(){ URL.revokeObjectURL(u); },4000);
    },'image/jpeg',0.92);
  }
  function partager(){
    var cv=$('pc-canvas'); if(!cv) return;
    cv.toBlob(function(blob){
      if(!blob) return;
      var file=new File([blob], nomFichier(), {type:'image/jpeg'});
      var txt=PC.nom+(PC.ville?' — '+PC.ville:'')+' · '+brand();
      if(navigator.canShare && navigator.canShare({files:[file]})){
        navigator.share({files:[file], title:PC.nom, text:txt}).catch(function(){});
        return;
      }
      telecharger();
    },'image/jpeg',0.92);
  }

  function init(){
    if($('pc-wrap')) return;
    var css=
       '#pc-wrap{position:fixed;inset:0;z-index:1500;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px}'
      +'#pc-wrap.on{display:flex}'
      +'#pc-box{background:#fffdf8;border-radius:14px;padding:14px;max-width:520px;width:100%;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
      +'#pc-box .pc-x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:22px;cursor:pointer;color:#666;z-index:2}'
      +'#pc-box .pc-h3{margin:0 0 9px;font-family:"Cormorant Garamond",Georgia,serif;font-size:19px;color:'+INK+';padding-right:26px}'
      +'#pc-canvas{width:100%;height:auto;border-radius:10px;display:block;border:1px solid '+LINE+';background:'+PAPER+'}'
      +'#pc-box .pc-tpl{display:flex;gap:6px;margin:2px 0 8px}'
      +'.pc-stybtn{flex:1;padding:8px 4px;border:1px solid '+LINE+';border-radius:9px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:'+INK+'}'
      +'.pc-stybtn.on{background:'+GOLD+';color:#fff;border-color:'+GOLD+'}'
      +'#pc-box .pc-s{font-size:13px;color:'+DEEP+';margin:10px 0 5px}'
      +'#pc-box .pc-mut{color:'+STONE+'}'
      +'.pc-pick{display:flex;gap:8px;flex-wrap:wrap}'
      +'.pc-pk{position:relative;width:62px;height:62px;border-radius:9px;border:2px solid '+LINE+';cursor:pointer;background:#eee center/cover no-repeat;flex:0 0 auto;transition:border-color .12s}'
      +'.pc-pk.on{border-color:#1f7a4d}.pc-pk.off{opacity:.5}'
      +'.pc-pk .chk{position:absolute;top:3px;right:3px;width:19px;height:19px;border-radius:50%;background:#1f7a4d;color:#fff;font-size:12px;line-height:19px;text-align:center;display:none}'
      +'.pc-pk.on .chk{display:block}'
      +'.pc-pk .pc-star{position:absolute;bottom:3px;left:3px;min-width:20px;height:19px;padding:0 5px;border-radius:10px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;line-height:19px;text-align:center;border:none;cursor:pointer;display:none}'
      +'.pc-pick.choosebg .pc-pk.on .pc-star{display:block}'
      +'.pc-pk .pc-src{position:absolute;bottom:3px;right:3px;max-width:calc(100% - 8px);padding:0 5px;border-radius:9px;background:rgba(168,136,79,.92);color:#fff;font-size:9.5px;line-height:15px;height:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
      +'.pc-pk.bg{border-color:'+GOLD+';box-shadow:0 0 0 2px '+GOLD+'}'
      +'.pc-pick.choosebg .pc-pk.bg .pc-star{background:'+GOLD+';color:#3a2e0a}'
      +'.pc-addrow{margin-top:8px}'
      +'.pc-addbtn{display:inline-block;padding:7px 12px;border:1px dashed #c9b896;border-radius:8px;background:#f6efe2;color:'+GOLD_D+';font-size:13.5px;cursor:pointer}'
      +'.pc-caprow{display:flex;align-items:center;gap:8px;margin:5px 0}'
      +'.pc-capthumb{width:40px;height:40px;border-radius:7px;background:#eee center/cover no-repeat;border:1px solid '+LINE+';flex:0 0 auto}'
      +'.pc-capinput{flex:1;padding:7px 9px;border:1px solid '+LINE+';border-radius:8px;font:inherit;font-size:15px}'
      +'#pc-box .pc-row{margin-top:9px}'
      +'#pc-box .pc-row input,#pc-box .pc-row textarea{width:100%;padding:9px 11px;border:1px solid '+LINE+';border-radius:8px;font:inherit;font-size:15px}'
      +'#pc-box .pc-row textarea{min-height:66px;font-family:inherit}'
      +'#pc-box .pc-act{display:flex;gap:8px;margin-top:11px}'
      +'#pc-box .pc-act button{flex:1;padding:11px;border:none;border-radius:8px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}'
      +'#pc-share{background:'+GOLD+';color:#fff}#pc-dl{background:#eee;color:#333}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    var w=document.createElement('div'); w.id='pc-wrap'; w.innerHTML='<div id="pc-box"></div>';
    document.body.appendChild(w);
    w.addEventListener('click',function(e){ if(e.target===w) close(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();

  window.THEPostcard={ open:open, close:close };
})();
