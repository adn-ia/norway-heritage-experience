/* the-detours.js — MODULE SQUELETTE « Détours du moment ».
   Autonome : charge sites.geojson + sites-nature.geojson, lit l'itinéraire (the_picks),
   surveille le GPS, et à <2 km d'un site PAS sur l'itinéraire → vibration + « l'ajouter ? Oui/Non ».
   À inclure sur la page carte : <script src="the-detours.js" defer></script> */
(function(){
  var DISMISS='ehe_detour_dismiss', PICKS='the_picks';
  var watch=null, alerted={}, sites=[], meDot=null;
  function $(id){return document.getElementById(id);}
  function T(fr){ try{ return (window.THEi18n && THEi18n.ui && THEi18n.ui(fr)) || fr; }catch(e){ return fr; } }
  function getPicks(){ try{return JSON.parse(localStorage.getItem(PICKS)||'[]');}catch(e){return [];} }
  function setPicks(a){ try{localStorage.setItem(PICKS,JSON.stringify(a));}catch(e){} }
  function getDis(){ try{return JSON.parse(localStorage.getItem(DISMISS)||'[]');}catch(e){return [];} }
  function setDis(a){ try{localStorage.setItem(DISMISS,JSON.stringify(a));}catch(e){} }
  function norm(s){return (s||'').toLowerCase().trim();}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function hav(la1,lo1,la2,lo2){var R=6371,r=Math.PI/180,a=Math.sin((la2-la1)*r/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;return 2*R*Math.asin(Math.sqrt(a));}
  function load(){ return Promise.all([
      fetch('sites.geojson').then(function(r){return r.json();}).catch(function(){return {features:[]};}),
      fetch('sites-nature.geojson').then(function(r){return r.json();}).catch(function(){return {features:[]};})
    ]).then(function(a){ sites=(a[0].features||[]).concat(a[1].features||[]); }); }
  function toast(m){ var w=$('det-toast'); if(!w)return; var t=document.createElement('div'); t.className='dt'; t.textContent=m; w.appendChild(t);
    requestAnimationFrame(function(){t.classList.add('show');}); setTimeout(function(){t.classList.remove('show');setTimeout(function(){t.remove();},350);},4000); }
  function onPos(pos){
    var la=pos.coords.latitude, lo=pos.coords.longitude;
    if(window.map && window.L){ if(!meDot){ meDot=L.marker([la,lo],{icon:L.divIcon({className:'',html:'<div class="det-me"></div>',iconSize:[16,16],iconAnchor:[8,8]}),zIndexOffset:1000}).addTo(window.map); } else meDot.setLatLng([la,lo]); }
    var pk=getPicks().map(norm), dis=getDis(); var best=null,bd=1e9;
    sites.forEach(function(f){ var p=f.properties, nm=p.nom; if(!nm) return;
      if(pk.indexOf(norm(nm))>=0 || dis.indexOf(nm)>=0 || alerted[nm]) return;
      var c=f.geometry.coordinates, d=hav(la,lo,c[1],c[0]); if(d<bd){bd=d;best={p:p,d:d};} });
    if(best && best.d<=2){ alerted[best.p.nom]=1; ask(best.p,best.d); }
  }
  function ask(p,d){
    try{ if(navigator.vibrate) navigator.vibrate([200,90,200]); }catch(e){}
    var dist=d<1?Math.round(d*1000)+' m':d.toFixed(1).replace('.',',')+' km';
    var box=$('det-prompt');
    box.innerHTML='<div class="dtxt">🧭 '+T('detours.a')+' ~'+dist+' : <b>'+esc(p.nom)+'</b><br><span>'+T('detours.pas.sur.votre.itineraire.lajouter')+'</span></div>'+
      '<div class="dact"><button id="det-yes">✓ '+T('detours.oui')+'</button><button id="det-no">✕ '+T('detours.non')+'</button></div>';
    box.classList.add('on');
    $('det-yes').onclick=function(){ var a=getPicks(); if(a.map(norm).indexOf(norm(p.nom))<0){a.push(p.nom);setPicks(a);} box.classList.remove('on'); toast('✓ '+p.nom); };
    $('det-no').onclick=function(){ var s=getDis(); if(s.indexOf(p.nom)<0)s.push(p.nom); setDis(s); box.classList.remove('on'); };
  }
  function toggle(){
    var b=$('det-btn');
    if(watch!=null){ navigator.geolocation.clearWatch(watch); watch=null; if(meDot&&window.map){window.map.removeLayer(meDot);meDot=null;} b.classList.remove('on'); b.textContent='🧭 '+T('detours.detours'); $('det-prompt').classList.remove('on'); return; }
    if(!navigator.geolocation){ alert(T('detours.geolocalisation.indisponible')); return; }
    alerted={};
    load().then(function(){ b.classList.add('on'); b.textContent='■ '+T('detours.detours'); toast(T('detours.detours.actives.vous.serez.prevenu'));
      watch=navigator.geolocation.watchPosition(onPos,function(){toast(T('detours.localisation.refusee.ou.indisponible'));},{enableHighAccuracy:true,maximumAge:5000,timeout:20000}); });
  }
  function init(){
    if($('det-btn')) return;
    var css='#det-btn{position:fixed;right:12px;bottom:16px;z-index:1200;background:rgba(38,32,26,.94);color:#f6ecd8;border:1px solid rgba(201,173,121,.5);border-radius:22px;padding:9px 15px;font:inherit;font-size:14px;cursor:pointer;box-shadow:0 3px 12px rgba(0,0,0,.3)}'
      +'#det-btn.on{background:#a8884f;color:#2b2318}'
      +'#det-prompt{position:fixed;left:50%;bottom:70px;transform:translateX(-50%);z-index:1300;background:#fffdf8;color:#2b2318;border-radius:14px;box-shadow:0 6px 26px rgba(0,0,0,.35);padding:14px 16px;max-width:92vw;display:none}'
      +'#det-prompt.on{display:block}#det-prompt .dtxt{font-size:15px;line-height:1.5;margin-bottom:10px}#det-prompt .dact{display:flex;gap:10px;justify-content:flex-end}'
      +'#det-prompt button{border:none;border-radius:20px;padding:9px 18px;font:inherit;font-weight:700;cursor:pointer}#det-yes{background:#5c7a52;color:#fff}#det-no{background:#eee;color:#333}'
      +'.det-me{width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 3px rgba(26,115,232,.35)}'
      +'#det-toast{position:fixed;left:50%;bottom:130px;transform:translateX(-50%);z-index:1400;display:flex;flex-direction:column;gap:6px;align-items:center;pointer-events:none}'
      +'#det-toast .dt{background:rgba(38,32,26,.94);color:#f5ecd8;padding:9px 16px;border-radius:20px;font-size:14px;opacity:0;transition:opacity .3s}#det-toast .dt.show{opacity:1}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    var b=document.createElement('button'); b.id='det-btn'; b.textContent='🧭 '+T('detours.detours'); b.title=T('detours.detours.du.moment.gps'); b.onclick=toggle; document.body.appendChild(b);
    var p=document.createElement('div'); p.id='det-prompt'; document.body.appendChild(p);
    var t=document.createElement('div'); t.id='det-toast'; document.body.appendChild(t);
  }
  function _detGo(){ if(window.THEi18n&&THEi18n.ready&&THEi18n.ready.then) THEi18n.ready.then(init); else init(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',_detGo); else _detGo();
})();
