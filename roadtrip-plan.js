/* ============================================================
   GREFFE « RoadTrip — planificateur MANUEL » sur l'itinéraire Heritage
   Donne à l'utilisateur la main que le générateur ne donne pas :
     LOT 1  RÉORDONNER (monter/descendre) · INTERCALER à une position
            (lieux sourcés OU adresse OpenStreetMap) · RETIRER
     LOT 2  DATE par étape (calendrier)
     LOT 3  BASE + VISITES : définir une base, y ajouter des visites,
            retirer une visite, transformer base ↔ étape
     LOT 4  RECALAGE GPS d'un arrêt (poser sa vraie position)
   Persistance : l'ORDRE vit dans LASTRES.route (déjà sérialisé par
   l'autosave the_current / les enregistrements the_saved). Les métadonnées
   par étape (date, rôle base/visite, coord recalée) vivent dans UN seul
   objet localStorage « the_plan_meta », indexé par placeKey(lieu) — stable
   au réordonnancement et au rechargement. Aucune dépendance Firebase.
   Lit les globales : LASTRES, LASTORIGIN, render, haversine, norm, SITES,
   placeKey. Tout texte visible passe par uiT() (règle : 0 texte en dur).
   ============================================================ */
(function () {
  function T(k, v) {
    if (typeof window.uiT === "function") return window.uiT(k, v);
    return (window.THEi18n && THEi18n.ui && THEi18n.ui(k)) || k;
  }
  function xe(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function nrm(s){ return (typeof norm==="function")?norm(s):String(s||"").toLowerCase(); }
  function hav(a,b){ return (typeof haversine==="function")?haversine(a,b):0; }
  function haveRoute(){ return (typeof LASTRES!=="undefined") && LASTRES && LASTRES.route && LASTRES.route.length; }
  function pkey(s){ try{ return (typeof placeKey==="function") ? placeKey(s) : (nrm(s.p.nom)+"@"+s.c[0].toFixed(4)+","+s.c[1].toFixed(4)); }catch(e){ return nrm(s&&s.p&&s.p.nom)+"@"+(s&&s.c); } }

  /* --- métadonnées par étape (date, rôle, coord recalée) --- */
  var META_KEY="the_plan_meta";
  function metaAll(){ try{ return JSON.parse(localStorage.getItem(META_KEY)||"{}"); }catch(e){ return {}; } }
  function metaSave(o){ try{ localStorage.setItem(META_KEY, JSON.stringify(o)); }catch(e){} }
  function metaFor(s){ var m=metaAll(); return m[pkey(s)]||{}; }
  function metaPatch(s, patch){ var m=metaAll(), k=pkey(s); m[k]=Object.assign(m[k]||{}, patch); metaSave(m); }
  function metaMove(oldKey, newKey){ var m=metaAll(); if(m[oldKey]){ m[newKey]=Object.assign(m[newKey]||{}, m[oldKey]); delete m[oldKey]; metaSave(m); } }

  /* --- styles (injectés une fois) --- */
  function css(){
    if(document.getElementById("rtp-css")) return;
    var s=document.createElement("style"); s.id="rtp-css";
    s.textContent=
      ".rtp-bar{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;margin:-4px 0 8px;}"+
      ".rtp-bar button{border:1px solid var(--line,#e3d8c4);background:#fff;color:#8a7c66;border-radius:7px;"+
      "  width:32px;height:30px;line-height:1;cursor:pointer;font-size:14px;font-family:inherit;padding:0;transition:.12s;}"+
      ".rtp-bar button:hover{border-color:var(--gold-soft,#c9ad79);color:var(--ink,#2b2318);background:#faf5ea;}"+
      ".rtp-bar button:disabled{opacity:.32;cursor:default;}"+
      ".rtp-bar button.on{background:var(--gold,#a8884f);color:#fff;border-color:var(--gold,#a8884f);}"+
      ".rtp-bar button.rtp-del:hover{background:#fbecec;color:#b3402f;border-color:#e3b6ad;}"+
      ".rtp-daterow{display:flex;align-items:center;gap:8px;margin:0 0 10px;font-size:13px;color:var(--stone,#8a7c66);}"+
      ".rtp-daterow input{font-family:inherit;font-size:14px;border:1px solid var(--line,#e3d8c4);border-radius:6px;padding:5px 8px;background:#fff;color:var(--ink,#2b2318);}"+
      ".rtp-ins{display:flex;justify-content:center;margin:-4px 0 12px;}"+
      ".rtp-ins>button{border:1px dashed var(--gold-soft,#c9ad79);background:#fdf8ee;color:#8a6d3a;border-radius:16px;"+
      "  padding:4px 14px;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.12s;}"+
      ".rtp-ins>button:hover{background:#f7edd6;}"+
      ".rtp-addvisit{margin:2px 0 10px;}"+
      ".rtp-addvisit button{border:1px solid var(--gold,#a8884f);background:#fff;color:#8a6d3a;border-radius:8px;padding:7px 13px;font-family:inherit;font-size:13.5px;cursor:pointer;}"+
      ".rtp-addvisit button:hover{background:#faf5ea;}"+
      ".stop.rtp-base{border-left:4px solid var(--gold,#a8884f);}"+
      ".stop.rtp-visit{margin-left:20px;border-left:3px solid var(--gold-soft,#c9ad79);}"+
      ".rtp-role{display:inline-block;font-size:11px;letter-spacing:.5px;border-radius:4px;padding:1px 8px;margin-left:6px;vertical-align:middle;}"+
      ".rtp-role.base{background:var(--gold,#a8884f);color:#fff;}"+
      ".rtp-role.visit{background:#efe6d2;color:#8a6d3a;border:1px solid var(--gold-soft,#c9ad79);}"+
      ".rtp-panel{background:var(--paper,#fffdf8);border:1px solid var(--line,#e3d8c4);border-radius:10px;"+
      "  padding:12px;margin:0 0 12px;box-shadow:0 6px 20px rgba(0,0,0,.14);}"+
      ".rtp-panel .rtp-row{display:flex;gap:8px;}"+
      ".rtp-panel input{flex:1;padding:10px 12px;font-family:inherit;font-size:15px;border:1px solid var(--line,#e3d8c4);border-radius:6px;background:#fff;color:var(--ink,#2b2318);}"+
      ".rtp-panel .rtp-go{border:none;background:var(--ink,#2b2318);color:var(--ivory,#f6f0e4);border-radius:6px;padding:0 16px;font-family:inherit;font-weight:600;cursor:pointer;}"+
      ".rtp-panel .rtp-x{border:1px solid var(--line,#e3d8c4);background:#fff;color:var(--stone,#8a7c66);border-radius:6px;padding:0 12px;cursor:pointer;font-family:inherit;}"+
      ".rtp-res{margin-top:8px;display:flex;flex-direction:column;gap:5px;max-height:230px;overflow:auto;}"+
      ".rtp-res button{text-align:left;border:1px solid var(--line,#e3d8c4);background:#fff;border-radius:7px;padding:8px 11px;"+
      "  font-family:inherit;font-size:14px;color:var(--ink,#2b2318);cursor:pointer;}"+
      ".rtp-res button:hover{background:#f6f0e4;border-color:var(--gold-soft,#c9ad79);}"+
      ".rtp-res button small{display:block;color:var(--stone,#8a7c66);font-size:12px;margin-top:1px;}"+
      ".rtp-msg{font-size:12.5px;color:var(--stone,#8a7c66);margin-top:7px;}";
    document.head.appendChild(s);
  }

  /* --- mutations de l'ordre (source de vérité = LASTRES.route) --- */
  function recompute(){
    if(!haveRoute()) return;
    var prev=(typeof LASTORIGIN!=="undefined"&&LASTORIGIN)?LASTORIGIN.coord:LASTRES.route[0].c;
    LASTRES.route.forEach(function(s){ s.fromPrev=hav(prev,s.c); prev=s.c; });
  }
  function rerender(){ if(typeof render==="function") render(LASTORIGIN, LASTRES); }

  function moveStep(i, dir){
    if(!haveRoute()) return;
    var r=LASTRES.route, j=i+dir;
    if(j<0||j>=r.length) return;
    var t=r[i]; r[i]=r[j]; r[j]=t;
    LASTRES.manualOrder=true;
    recompute(); rerender();
  }
  function dropStep(i){
    if(!haveRoute()) return;
    if(typeof removeStep==="function"){ removeStep(i); return; }   // garde-fous + i18n du moteur
    if(LASTRES.route.length<=1){ alert(T("plan.gardez.une.etape")); return; }
    LASTRES.route.splice(i,1); recompute(); rerender();
  }
  function insertAt(idx, stop, meta){
    if(!haveRoute() && !(typeof LASTRES!=="undefined"&&LASTRES)) return;
    if(!LASTRES.route) LASTRES.route=[];
    idx=Math.max(0, Math.min(idx, LASTRES.route.length));
    LASTRES.route.splice(idx, 0, stop);
    if(meta) metaPatch(stop, meta);
    LASTRES.manualOrder=true;
    recompute(); rerender();
  }
  window.__planMove=moveStep; window.__planDrop=dropStep; window.__planInsertAt=insertAt;

  /* --- date par étape --- */
  function setDate(i, val){
    if(!haveRoute()) return;
    metaPatch(LASTRES.route[i], {date: val||""});
    rerender();
  }

  /* --- rôle base / visite / normal --- */
  function role(s){ return (metaFor(s).kind)||""; }
  function toggleBase(i){
    if(!haveRoute()) return;
    var s=LASTRES.route[i], cur=role(s);
    metaPatch(s, {kind: cur==="base" ? "" : "base", baseKey:""});
    rerender();
  }
  function detachVisit(i){           // visite -> étape normale
    if(!haveRoute()) return;
    metaPatch(LASTRES.route[i], {kind:"", baseKey:""});
    rerender();
  }

  /* --- recalage GPS d'un arrêt --- */
  function getPos(){ return new Promise(function(res,rej){
    if(!navigator.geolocation) return rej();
    navigator.geolocation.getCurrentPosition(function(p){ res([p.coords.longitude,p.coords.latitude]); }, rej, {enableHighAccuracy:true,timeout:15000,maximumAge:4000});
  }); }
  function recalGPS(i){
    if(!haveRoute()) return;
    var s=LASTRES.route[i], oldKey=pkey(s);
    if(typeof showGuide==="function") showGuide(T("plan.gps.en.cours"), 4000);
    getPos().then(function(c){
      s.c=[c[0],c[1]];
      metaMove(oldKey, pkey(s));            // la métadonnée suit le lieu recalé
      recompute(); rerender();
      if(typeof showGuide==="function") showGuide(T("plan.gps.recale"), 5000);
    }).catch(function(){ alert(T("plan.gps.refuse")); });
  }

  /* --- construction d'une étape « manuelle » --- */
  function stopFromSite(site){ return { p:site.p, c:site.c.slice(), genre:site.genre||"", layer:site.layer||"histoire" }; }
  function stopFromAddress(lon, lat, label){
    return { c:[lon,lat], layer:"perso", genre:"perso",
      p:{ nom:label||T("plan.lieu.ajoute"), type:"", region:"", "région":"", description:"",
          source:"OpenStreetMap", a_voir:"", conseil:"" } };
  }

  /* --- recherche pour intercaler : lieux sourcés puis adresse OSM --- */
  function searchSites(q){
    if(typeof SITES==="undefined"||!SITES) return [];
    var nq=nrm(q); if(!nq) return [];
    var out=[];
    for(var i=0;i<SITES.length && out.length<8;i++){
      var s=SITES[i]; if(!s||!s.p) continue;
      if(nrm(s.p.nom).indexOf(nq)>=0) out.push(s);
    }
    return out;
  }
  function geocode(q){
    var _iso=(window.HConf&&HConf.iso)||"";
    return fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes="+_iso+"&q="+encodeURIComponent(q),
      {headers:{"Accept":"application/json"}}).then(function(r){return r.json();}).catch(function(){return [];});
  }

  /* --- panneau d'insertion (intercaler OU visite depuis une base) --- */
  function openInsert(idx, insBtn, visitMeta){
    var existing=document.getElementById("rtp-panel"); if(existing) existing.remove();
    var panel=document.createElement("div"); panel.id="rtp-panel"; panel.className="rtp-panel";
    panel.innerHTML=
      '<div class="rtp-row">'+
        '<input id="rtp-q" type="text" autocomplete="off" placeholder="'+xe(T("plan.chercher.placeholder"))+'">'+
        '<button class="rtp-go" id="rtp-search" type="button">'+xe(T("plan.chercher"))+'</button>'+
        '<button class="rtp-x" id="rtp-cancel" type="button" aria-label="'+xe(T("rt.fermer"))+'">✕</button>'+
      '</div>'+
      '<div class="rtp-res" id="rtp-res"></div>'+
      '<div class="rtp-msg" id="rtp-msg">'+xe(T("plan.insert.hint"))+'</div>';
    insBtn.parentNode.insertBefore(panel, insBtn.nextSibling);
    var q=panel.querySelector("#rtp-q"), res=panel.querySelector("#rtp-res"), msg=panel.querySelector("#rtp-msg");
    q.focus();

    function pick(stop){ panel.remove(); insertAt(idx, stop, visitMeta||null); if(typeof showGuide==="function") showGuide(T("plan.etape.ajoutee"),6000); }
    function renderSites(){
      var arr=searchSites(q.value); res.innerHTML="";
      arr.forEach(function(s){
        var b=document.createElement("button"); b.type="button";
        var meta=[s.p.region, (window.THEi18n&&!THEi18n.isFr()&&THEi18n.cat)?THEi18n.cat(s.p.type):s.p.type].filter(Boolean).join(" · ");
        b.innerHTML=xe(s.p.nom)+(meta?"<small>"+xe(meta)+"</small>":"");
        b.onclick=function(){ pick(stopFromSite(s)); };
        res.appendChild(b);
      });
      return arr.length;
    }
    function runSearch(){
      var n=renderSites();
      msg.textContent = n ? T("plan.ou.adresse") : T("plan.recherche.adresse");
      geocode(q.value).then(function(list){
        (list||[]).forEach(function(x){
          var b=document.createElement("button"); b.type="button";
          var name=String(x.display_name||"").split(",").slice(0,3).join(", ");
          b.innerHTML="📍 "+xe(name)+"<small>"+xe(T("plan.adresse.osm"))+"</small>";
          b.onclick=function(){ pick(stopFromAddress(Number(x.lon), Number(x.lat), name.split(",")[0])); };
          res.appendChild(b);
        });
        if(!res.children.length) msg.textContent=T("plan.aucun.resultat");
      });
    }
    panel.querySelector("#rtp-search").onclick=runSearch;
    panel.querySelector("#rtp-cancel").onclick=function(){ panel.remove(); };
    q.onkeydown=function(e){ if(e.key==="Enter"){ e.preventDefault(); runSearch(); } };
    q.oninput=function(){ if(q.value.trim().length>=2) renderSites(); };
  }

  /* --- injection des contrôles dans chaque carte étape --- */
  function inject(){
    if(!haveRoute()) return;
    var stopsWrap=document.getElementById("stops"); if(!stopsWrap) return;
    var cards=stopsWrap.querySelectorAll(":scope > .stop");
    if(!cards.length) return;
    css();
    var route=LASTRES.route;

    cards.forEach(function(card, i){
      var s=route[i]; if(!s) return;
      var r=role(s), md=metaFor(s);

      // rôle : classes + badge
      card.classList.toggle("rtp-base", r==="base");
      card.classList.toggle("rtp-visit", r==="visite");
      if(!card.querySelector(".rtp-role")){
        var nm=card.querySelector(".nm");
        if(nm && r){ var badge=document.createElement("span"); badge.className="rtp-role "+(r==="base"?"base":"visit");
          badge.textContent = r==="base" ? T("plan.base.badge") : T("plan.visite.badge"); nm.appendChild(badge); }
      }

      // 1) barre d'actions (une seule fois par carte)
      if(!card.querySelector(".rtp-bar")){
        var bar=document.createElement("div"); bar.className="rtp-bar";
        bar.innerHTML=
          '<button data-mv="-1" title="'+xe(T("plan.monter"))+'" aria-label="'+xe(T("plan.monter"))+'"'+(i===0?" disabled":"")+'>▲</button>'+
          '<button data-mv="1" title="'+xe(T("plan.descendre"))+'" aria-label="'+xe(T("plan.descendre"))+'"'+(i===cards.length-1?" disabled":"")+'>▼</button>'+
          '<button data-base title="'+xe(T(r==="base"?"plan.retirer.base":"plan.definir.base"))+'" aria-label="'+xe(T("plan.definir.base"))+'" class="'+(r==="base"?"on":"")+'">⚓</button>'+
          (r==="visite" ? '<button data-detach title="'+xe(T("plan.detacher.visite"))+'" aria-label="'+xe(T("plan.detacher.visite"))+'">⤴</button>' : '')+
          '<button data-gps title="'+xe(T("plan.recaler.gps"))+'" aria-label="'+xe(T("plan.recaler.gps"))+'">📍</button>'+
          '<button class="rtp-del" data-del title="'+xe(T("plan.retirer"))+'" aria-label="'+xe(T("plan.retirer"))+'">🗑</button>';
        card.insertBefore(bar, card.firstChild);
        bar.querySelector('[data-mv="-1"]').onclick=function(){ moveStep(i,-1); };
        bar.querySelector('[data-mv="1"]').onclick=function(){ moveStep(i,1); };
        bar.querySelector("[data-base]").onclick=function(){ toggleBase(i); };
        var dt=bar.querySelector("[data-detach]"); if(dt) dt.onclick=function(){ detachVisit(i); };
        bar.querySelector("[data-gps]").onclick=function(){ recalGPS(i); };
        bar.querySelector("[data-del]").onclick=function(){ dropStep(i); };
      }

      // 2) date par étape (une seule fois)
      if(!card.querySelector(".rtp-daterow")){
        var drow=document.createElement("div"); drow.className="rtp-daterow";
        drow.innerHTML='<span>📅 '+xe(T("plan.quand"))+'</span><input type="date" value="'+xe(md.date||"")+'">';
        var bar2=card.querySelector(".rtp-bar");
        if(bar2 && bar2.nextSibling) card.insertBefore(drow, bar2.nextSibling); else card.insertBefore(drow, card.firstChild);
        drow.querySelector("input").onchange=function(e){ setDate(i, e.target.value); };
      }

      // 3) sur une BASE : bouton « ajouter une visite depuis cette base »
      if(r==="base" && !(card.nextElementSibling && card.nextElementSibling.classList && card.nextElementSibling.classList.contains("rtp-addvisit"))){
        var av=document.createElement("div"); av.className="rtp-addvisit";
        var avb=document.createElement("button"); avb.type="button"; avb.textContent="➕ "+T("plan.ajouter.visite");
        (function(baseStop, pos){ avb.onclick=function(){ openInsert(pos+1, av, {kind:"visite", baseKey:pkey(baseStop)}); }; })(s, i);
        av.appendChild(avb);
        card.parentNode.insertBefore(av, card.nextSibling);
      }

      // 4) barre « intercaler ici » après chaque carte
      var after=card.nextElementSibling;
      // si une barre d'ajout-visite suit, on place l'intercalage après elle
      if(after && after.classList && after.classList.contains("rtp-addvisit")) after=after.nextElementSibling;
      if(!(after && after.classList && after.classList.contains("rtp-ins"))){
        var ins=document.createElement("div"); ins.className="rtp-ins";
        var b=document.createElement("button"); b.type="button"; b.textContent="＋ "+T("plan.inserer.ici");
        (function(pos, node){ b.onclick=function(){ openInsert(pos+1, node); }; })(i, ins);
        ins.appendChild(b);
        var refNode=card.nextElementSibling;
        if(refNode && refNode.classList && refNode.classList.contains("rtp-addvisit")) refNode=refNode.nextSibling;
        card.parentNode.insertBefore(ins, refNode);
      }
    });

    // barre « intercaler » tout en HAUT (position 0)
    if(cards.length && !(cards[0].previousElementSibling && cards[0].previousElementSibling.classList && cards[0].previousElementSibling.classList.contains("rtp-ins"))){
      var ins0=document.createElement("div"); ins0.className="rtp-ins";
      var b0=document.createElement("button"); b0.type="button"; b0.textContent="＋ "+T("plan.inserer.ici");
      b0.onclick=function(){ openInsert(0, ins0); };
      cards[0].parentNode.insertBefore(ins0, cards[0]);
    }
  }

  /* --- patch de render : ré-injecte après chaque rendu --- */
  if(typeof render==="function"){
    var _render=render;
    render=function(o, r){
      _render(o, r);
      setTimeout(inject, 340);   // après roadtrip-plus (300ms)
    };
  }
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(inject, 900); });
})();
