/* Heritage — sauvegarde / restauration locale des données utilisateur.
   Exporte itinéraires (localStorage) + carnet (IndexedDB the-carnet/photos, blobs en base64)
   dans UN fichier .json, et le réimporte (transfert vers un autre appareil, sauvegarde de secours).
   Aucun serveur : le fichier reste chez l'utilisateur. */
(function(){
  function T(k){ return (window.THEi18n && THEi18n.ui(k)) || k; }
  var DB='the-carnet', STORE='photos';
  var LS_KEYS=['the_saved','the_current','the_vu','the_picks','the_rating'];   // + toutes les clés 'the-cap:*'

  function openDB(){ return new Promise(function(res,rej){
    var r=indexedDB.open(DB,1);
    r.onupgradeneeded=function(){ try{ var os=r.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true}); os.createIndex('place','place',{unique:false}); }catch(e){} };
    r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); };
  }); }
  function blobToB64(b){ return new Promise(function(res){ if(!b){ res(null); return; } var fr=new FileReader(); fr.onload=function(){ res(fr.result); }; fr.onerror=function(){ res(null); }; fr.readAsDataURL(b); }); }
  function b64ToBlob(d){ if(!d) return null; try{ var a=d.split(','),m=(a[0].match(/:(.*?);/)||[])[1]||'application/octet-stream',bin=atob(a[1]),n=bin.length,u=new Uint8Array(n); while(n--) u[n]=bin.charCodeAt(n); return new Blob([u],{type:m}); }catch(e){ return null; } }
  function pad(n){ return (n<10?'0':'')+n; }

  async function exportAll(){
    var data={ app:'THE', version:1, date:new Date().toISOString(), local:{}, photos:[] };
    for(var i=0;i<localStorage.length;i++){ var k=localStorage.key(i);
      if(LS_KEYS.indexOf(k)>=0 || k.indexOf('the-cap:')===0) data.local[k]=localStorage.getItem(k); }
    var db=await openDB();
    var recs=await new Promise(function(res,rej){ var out=[]; var req=db.transaction(STORE).objectStore(STORE).openCursor();
      req.onsuccess=function(e){ var c=e.target.result; if(c){ out.push(c.value); c.continue(); } else res(out); }; req.onerror=function(){ rej(req.error); }; });
    for(var j=0;j<recs.length;j++){ var r=recs[j];
      data.photos.push({ place:r.place, name:r.name, caption:r.caption||'', ts:r.ts||0,
        blob:await blobToB64(r.blob), audio:await blobToB64(r.audio) }); }
    return data;
  }

  async function download(){
    var data=await exportAll();
    var blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a'), d=new Date();
    a.href=url; a.download='THE-sauvegarde-'+d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); },1500);
    return { photos:data.photos.length, itineraires:(data.local.the_saved? (JSON.parse(data.local.the_saved||'[]').length||0):0) };
  }

  async function importFile(file){
    var txt=await file.text(), data=JSON.parse(txt);
    if(!data || data.app!=='THE') throw new Error(T('backup.fichier.non.reconnu'));
    for(var k in data.local){ if(data.local.hasOwnProperty(k)){ try{ localStorage.setItem(k,data.local[k]); }catch(e){} } }
    var db=await openDB();
    await new Promise(function(res,rej){ var tx=db.transaction(STORE,'readwrite'), os=tx.objectStore(STORE);
      (data.photos||[]).forEach(function(p){ try{ os.add({ place:p.place, name:p.name, caption:p.caption||'', ts:p.ts||0, blob:b64ToBlob(p.blob), audio:b64ToBlob(p.audio) }); }catch(e){} });
      tx.oncomplete=function(){ res(); }; tx.onerror=function(){ rej(tx.error); }; });
    return { photos:(data.photos||[]).length };
  }

  // ---- Proposition de sauvegarde au bon moment (le tap utilisateur débloque l'export) ----
  function stamp(){ try{ localStorage.setItem('the_last_backup', String(Date.now())); }catch(e){} }
  var offeredThisSession=false;
  function showPrompt(msg, onYes){
    if(document.getElementById('bk-offer')) return;
    var b=document.createElement('div'); b.id='bk-offer';
    b.setAttribute('style','position:fixed;left:12px;right:12px;bottom:14px;z-index:99999;max-width:520px;margin:0 auto;'+
      'background:#1f4d3a;color:#f6f1e6;border-radius:14px;padding:13px 15px;box-shadow:0 6px 24px rgba(0,0,0,.28);'+
      'font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;font-size:14px;line-height:1.4;'+
      'display:flex;align-items:center;gap:10px;flex-wrap:wrap');
    var t=document.createElement('span'); t.style.flex='1 1 200px'; t.textContent=msg;
    var yes=document.createElement('button'); yes.textContent=T('backup.oui.sauvegarder');
    yes.setAttribute('style','background:#c9a24a;color:#2b2a26;border:0;border-radius:9px;padding:9px 13px;font-weight:700;cursor:pointer');
    var no=document.createElement('button'); no.textContent=T('backup.plus.tard');
    no.setAttribute('style','background:transparent;color:#f6f1e6;border:1px solid rgba(246,241,230,.5);border-radius:9px;padding:9px 12px;cursor:pointer');
    yes.onclick=function(){ b.remove(); download().then(stamp).catch(function(){}); };
    no.onclick=function(){ b.remove(); };
    b.appendChild(t); b.appendChild(yes); b.appendChild(no); document.body.appendChild(b);
  }
  function offer(){
    try{
      if(offeredThisSession) return; offeredThisSession=true;
      var last=+(localStorage.getItem('the_last_backup')||0);
      if(last && (Date.now()-last) < 3*24*3600*1000) return;
      showPrompt(T('backup.garder.copie'));
    }catch(e){}
  }
  var _dl=download;
  download=function(){ return _dl().then(function(r){ stamp(); return r; }); };
  window.THEBackup={ exportAll:exportAll, download:download, importFile:importFile, offer:offer };
})();
