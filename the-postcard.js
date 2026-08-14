/* the-postcard.js — MODULE SQUELETTE « Carte postale » (modèle Road Trip, en CANVAS, sans Firebase).
   - Depuis une ÉTAPE : reprend les médias du CARNET de l'étape (IndexedDB the-carnet) + on peut en ajouter/enlever.
   - Depuis une FICHE : on ajoute ses propres photos (input fichier).
   - Bande de médias éditable (sélectionner / supprimer / ajouter) AVANT de partager.
   - 3 modèles canvas + filigrane par édition (<meta name="pc-brand">). Partage natif (Insta/TikTok/WhatsApp) ou téléchargement.
   API : window.THEPostcard.open(nom, ville)  ou  open({nom, ville, placeKey}). */
(function(){
  var PC={nom:'',ville:'',media:[],sel:-1,note:'',tpl:'classic',blob:null};
  function $(id){return document.getElementById(id);}
  function T(fr){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr; }catch(e){ return fr; } }
  function brand(){ try{ var m=document.querySelector('meta[name="pc-brand"]'); return (window.PC_BRAND)||(m&&m.content)||'HERITAGE'; }catch(e){ return 'HERITAGE'; } }
  function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
  function cover(c,img,x,y,w,h){var ir=img.width/img.height,r=w/h,sw,sh,sx,sy;if(ir>r){sh=img.height;sw=sh*r;sx=(img.width-sw)/2;sy=0;}else{sw=img.width;sh=sw/r;sx=0;sy=(img.height-sh)/2;}c.drawImage(img,sx,sy,sw,sh,x,y,w,h);}
  function fit(c,t,max,base,f){var s=base;do{c.font=f(s);if(c.measureText(t).width<=max)break;s-=2;}while(s>16);return s;}
  function wrap(c,t,x,y,max,lh,ml){var ws=(t||'').split(/\s+/),line='',n=0;for(var i=0;i<ws.length;i++){var test=line?line+' '+ws[i]:ws[i];if(c.measureText(test).width>max&&line){c.fillText(line,x,y);y+=lh;line=ws[i];if(++n>=ml){c.fillText(line+'…',x,y);return;}}else line=test;}if(line)c.fillText(line,x,y);}
  function wmark(c,W,H){c.textAlign='right';c.font='600 26px Georgia,serif';c.fillStyle='rgba(20,48,92,.55)';c.fillText('✦ '+brand(),W-54,H-54);}
  function curImg(){ return (PC.sel>=0 && PC.media[PC.sel]) ? PC.media[PC.sel].img : null; }
  function draw(){
    var cv=$('pc-canvas'); if(!cv)return; var c=cv.getContext('2d'),W=cv.width,H=cv.height,img=curImg(),date=new Date().toLocaleDateString();
    c.clearRect(0,0,W,H); c.textAlign='left';
    if(PC.tpl==='classic'){
      c.fillStyle='#f4efe2';c.fillRect(0,0,W,H);
      var px=70,py=80,pw=W-140,ph=Math.round(H*0.52);
      c.save();rr(c,px,py,pw,ph,14);c.clip();if(img)cover(c,img,px,py,pw,ph);else{c.fillStyle='#ddd';c.fillRect(px,py,pw,ph);}c.restore();
      c.strokeStyle='#fff';c.lineWidth=12;rr(c,px,py,pw,ph,14);c.stroke();
      c.save();c.translate(W-180,py+18);c.fillStyle='#fff';c.fillRect(0,0,120,150);c.strokeStyle='#c9b896';c.setLineDash([4,4]);c.lineWidth=3;c.strokeRect(6,6,108,138);c.setLineDash([]);c.fillStyle='#a8884f';c.font='54px Georgia,serif';c.textAlign='center';c.fillText('✦',60,86);c.font='15px Georgia,serif';c.fillText('EUROPA',60,118);c.restore();
      var ty=py+ph+90;c.textAlign='left';
      var fs=fit(c,PC.nom,W-160,62,function(s){return 'bold '+s+'px Georgia,serif';});c.font='bold '+fs+'px Georgia,serif';c.fillStyle='#14305c';c.fillText(PC.nom,70,ty);
      if(PC.ville){ty+=44;c.font='italic 32px Georgia,serif';c.fillStyle='#8a7c66';c.fillText('— '+PC.ville,70,ty);}
      ty+=70;c.fillStyle='#3a3024';c.font='44px "Snell Roundhand","Brush Script MT",cursive';wrap(c,PC.note||' ',70,ty,W-300,58,5);
      c.save();c.translate(W-150,H-150);c.strokeStyle='rgba(168,68,47,.6)';c.lineWidth=4;c.beginPath();c.arc(0,0,72,0,7);c.stroke();c.fillStyle='rgba(168,68,47,.7)';c.textAlign='center';c.font='bold 22px Georgia,serif';c.fillText('✦ '+T('postcard.visite.le').replace(' le','')+' ✦',0,-6);c.font='18px Georgia,serif';c.fillText(date,0,22);c.restore();
      wmark(c,W,H);
    } else if(PC.tpl==='polaroid'){
      c.fillStyle='#eceae5';c.fillRect(0,0,W,H);
      c.save();c.shadowColor='rgba(0,0,0,.3)';c.shadowBlur=30;c.shadowOffsetY=12;c.fillStyle='#fff';var fx=90,fy=80,fw=W-180;c.fillRect(fx,fy,fw,H-180);c.restore();
      var px2=fx+36,py2=fy+36,pw2=fw-72,ph2=pw2;
      c.save();rr(c,px2,py2,pw2,ph2,2);c.clip();if(img)cover(c,img,px2,py2,pw2,ph2);else{c.fillStyle='#ddd';c.fillRect(px2,py2,pw2,ph2);}c.restore();
      var t2=py2+ph2+90;c.textAlign='center';
      var fs2=fit(c,PC.nom,fw-80,56,function(s){return s+'px "Bradley Hand","Segoe Script",cursive';});c.font=fs2+'px "Bradley Hand","Segoe Script",cursive';c.fillStyle='#2a2620';c.fillText(PC.nom,W/2,t2);
      t2+=58;c.font='34px "Bradley Hand","Segoe Script",cursive';c.fillStyle='#555';wrap(c,PC.note||PC.ville,W/2,t2,fw-90,44,3);
      c.textAlign='center';c.font='600 24px Georgia,serif';c.fillStyle='rgba(20,48,92,.5)';c.fillText('✦ '+brand()+' · '+date,W/2,H-70);
    } else {
      if(img)cover(c,img,0,0,W,H);else{c.fillStyle='#1c5e7a';c.fillRect(0,0,W,H);}
      c.fillStyle='rgba(10,30,55,.45)';c.fillRect(0,0,W,H);c.textAlign='center';
      c.fillStyle='#f4d35e';c.font='italic 60px Georgia,serif';c.fillText(T('postcard.bonjour.de'),W/2,260);
      var fs3=fit(c,PC.nom.toUpperCase(),W-100,150,function(s){return '900 '+s+'px "Arial Black",Impact,sans-serif';});
      c.font='900 '+fs3+'px "Arial Black",Impact,sans-serif';c.lineWidth=10;c.strokeStyle='rgba(0,0,0,.35)';c.strokeText(PC.nom.toUpperCase(),W/2,H/2+40);c.fillStyle='#fff';c.fillText(PC.nom.toUpperCase(),W/2,H/2+40);
      if(PC.ville){c.font='italic 40px Georgia,serif';c.fillStyle='#f4d35e';c.fillText(PC.ville,W/2,H/2+130);}
      if(PC.note){c.font='34px Georgia,serif';c.fillStyle='#fff';wrap(c,PC.note,W/2,H-260,W-160,46,2);}
      c.fillStyle='rgba(255,255,255,.85)';c.font='600 26px Georgia,serif';c.fillText('✦ '+brand()+' · '+date,W/2,H-60);
    }
    try{ cv.toBlob(function(b){ if(b) PC.blob=b; },'image/png'); }catch(e){}
  }
  /* ---- carnet de l'étape : lecture de l'IndexedDB de THE (the-carnet / photos, index « place ») ---- */
  function carnetMedia(placeKey){ return new Promise(function(res){
    try{ var r=indexedDB.open('the-carnet',1);
      r.onsuccess=function(){ try{ var os=r.result.transaction('photos','readonly').objectStore('photos'); var out=[];
        var c=os.index('place').openCursor(IDBKeyRange.only(placeKey));
        c.onsuccess=function(e){var x=e.target.result; if(x){out.push(x.value);x.continue();} else res(out);}; c.onerror=function(){res([]);};
      }catch(e){ res([]); } };
      r.onerror=function(){res([]);}; }catch(e){ res([]); }
  }); }
  function addBlob(blob){ if(!blob||!/^image/.test(blob.type||''))return; var im=new Image(); im.onload=function(){ PC.media.push({img:im,url:im.src}); if(PC.sel<0)PC.sel=PC.media.length-1; renderStrip(); draw(); }; im.src=URL.createObjectURL(blob); }
  function renderStrip(){
    var s=$('pc-strip'); if(!s)return;
    s.innerHTML=PC.media.map(function(m,i){return '<div class="pc-thumb'+(i===PC.sel?' on':'')+'" data-i="'+i+'"><img src="'+m.url+'"><button class="pc-rm" data-rm="'+i+'" title="'+T('postcard.retirer')+'">×</button></div>';}).join('')+
      '<label class="pc-thumb pc-add" title="'+T('pc.ajouter.photo')+'">＋<input id="pc-img" type="file" accept="image/*" multiple hidden></label>';
    s.querySelectorAll('[data-i]').forEach(function(t){ t.onclick=function(e){ if(e.target.hasAttribute('data-rm'))return; PC.sel=+t.dataset.i; renderStrip(); draw(); }; });
    s.querySelectorAll('[data-rm]').forEach(function(b){ b.onclick=function(e){ e.stopPropagation(); var i=+b.dataset.rm; PC.media.splice(i,1); if(PC.sel>=PC.media.length)PC.sel=PC.media.length-1; renderStrip(); draw(); }; });
    var inp=$('pc-img'); if(inp)inp.onchange=function(e){ var fs=e.target.files?[].slice.call(e.target.files):[]; fs.forEach(addBlob); this.value=''; };
  }
  function open(a,b){
    var o=(a && typeof a==='object')?a:{nom:a,ville:b};
    PC.nom=o.nom||''; PC.ville=o.ville||''; PC.lat=o.lat; PC.lng=o.lng; PC.note=''; PC.tpl='classic'; PC.blob=null; PC.media=[]; PC.sel=-1;
    var tpls=[['classic',T('carnet.carte.postale')],['polaroid','Polaroid'],['retro',T('postcard.retro')]];
    $('pc-box').innerHTML='<button class="pc-x" onclick="THEPostcard.close()">✕</button>'+
      '<canvas id="pc-canvas" width="1080" height="1350"></canvas>'+
      '<div class="pc-strip" id="pc-strip"></div>'+
      '<div class="pc-row"><input id="pc-nom" placeholder="'+T('postcard.nom.du.lieu')+'" value="'+(PC.nom||'').replace(/"/g,'&quot;')+'"></div>'+
      '<div class="pc-row"><input id="pc-note" placeholder="'+T('postcard.une.note.un.souvenir')+'"></div>'+
      '<div class="pc-tpl">'+tpls.map(function(t){return '<button data-tpl="'+t[0]+'">'+t[1]+'</button>';}).join('')+'</div>'+
      '<div class="pc-act"><button id="pc-share">📤 '+T('postcard.partager')+'</button><button id="pc-dl">⬇️ '+T('postcard.telecharger')+'</button></div>';
    function sync(){ $('pc-box').querySelectorAll('[data-tpl]').forEach(function(b){b.classList.toggle('on',b.dataset.tpl===PC.tpl);}); draw(); }
    $('pc-box').querySelectorAll('[data-tpl]').forEach(function(b){b.onclick=function(){PC.tpl=b.dataset.tpl;sync();};});
    $('pc-nom').oninput=function(){PC.nom=this.value;draw();};
    $('pc-note').oninput=function(){PC.note=this.value;draw();};
    $('pc-share').onclick=share; $('pc-dl').onclick=function(){ $('pc-canvas').toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='carte-'+(PC.nom||'EHE').replace(/\W+/g,'-')+'.png';a.click();}); };
    renderStrip(); $('pc-wrap').classList.add('on'); sync();
    if(o.placeKey){ carnetMedia(o.placeKey).then(function(list){ list.sort(function(x,y){return (x.ts||0)-(y.ts||0);}).forEach(function(m){ addBlob(m.blob); }); }); }
  }
  function close(){ $('pc-wrap').classList.remove('on'); }
  function share(){
    var blob=PC.blob;
    if(!blob){ $('pc-canvas').toBlob(function(b){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='carte-postale.png';a.click();}); return; }
    var loc=(PC.lat&&PC.lng)?(' · 📍 Y aller : https://maps.google.com/?q='+PC.lat+','+PC.lng):'';
    var file=new File([blob],'carte-postale.png',{type:'image/png'}), txt=PC.nom+(PC.ville?' — '+PC.ville:'')+' · '+brand()+loc;
    if(navigator.canShare && navigator.canShare({files:[file]})){ navigator.share({files:[file],text:txt}).catch(function(){}); }
    else { var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='carte-postale.png';a.click(); alert(T('postcard.partage.direct.non.supporte.carte')); }
  }
  function init(){
    if($('pc-wrap')) return;
    var css='#pc-wrap{position:fixed;inset:0;z-index:1500;background:rgba(20,15,10,.78);display:none;align-items:flex-start;justify-content:center;overflow:auto;padding:18px}'
      +'#pc-wrap.on{display:flex}#pc-box{background:#fffdf8;border-radius:14px;padding:14px;max-width:440px;width:100%;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.5)}'
      +'#pc-box .pc-x{position:absolute;top:8px;right:10px;background:none;border:none;font-size:22px;cursor:pointer;color:#666;z-index:2}'
      +'#pc-canvas{width:100%;height:auto;border-radius:8px;display:block;box-shadow:0 4px 16px rgba(0,0,0,.2)}'
      +'.pc-strip{display:flex;gap:7px;overflow-x:auto;margin-top:10px;padding-bottom:2px}'
      +'.pc-strip .pc-thumb{position:relative;flex:0 0 56px;width:56px;height:56px;border-radius:8px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:#eee}'
      +'.pc-strip .pc-thumb.on{border-color:#a8884f}.pc-strip .pc-thumb img{width:100%;height:100%;object-fit:cover;display:block}'
      +'.pc-strip .pc-rm{position:absolute;top:1px;right:1px;width:18px;height:18px;border:none;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;font-size:12px;line-height:1;cursor:pointer;padding:0}'
      +'.pc-strip .pc-add{display:flex;align-items:center;justify-content:center;font-size:24px;color:#a8884f;background:#f1e7d5;border:1px dashed #c9b896}'
      +'#pc-box .pc-row{margin-top:9px}#pc-box .pc-row input{width:100%;padding:9px 11px;border:1px solid #ccc;border-radius:8px;font:inherit;font-size:14px}'
      +'#pc-box .pc-tpl{display:flex;gap:7px;margin-top:10px}#pc-box .pc-tpl button{flex:1;padding:8px;border:1px solid #ccc;border-radius:8px;background:#fff;font:inherit;font-size:13px;cursor:pointer}#pc-box .pc-tpl button.on{background:#a8884f;color:#fff;border-color:#a8884f}'
      +'#pc-box .pc-act{display:flex;gap:8px;margin-top:11px}#pc-box .pc-act button{flex:1;padding:11px;border:none;border-radius:8px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}#pc-share{background:#14305c;color:#fff}#pc-dl{background:#eee;color:#333}';
    var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    var w=document.createElement('div');w.id='pc-wrap';w.innerHTML='<div id="pc-box"></div>';document.body.appendChild(w);
    w.addEventListener('click',function(e){ if(e.target===w) close(); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
  window.THEPostcard={ open:open, close:close };
})();
