/* ============================================================
   GREFFE « RoadTrip » sur l'itinéraire Heritage
   Ajoute ce qui manquait au moteur :
     1) VRAI routage routier (OSRM) : trajet + km + durée réels
     2) Export Google Maps en TRONÇONS ≤ 10 arrêts
     3) « Mes 9 prochains arrêts » depuis la position GPS (navFromHere)
     4) Export KML → Google My Maps (tous les arrêts sur une carte)
     5) Suivi GPS EN DIRECT : bandeau « prochaine étape à X km » + alerte < 2 km
   Module autonome : lit les globales (LASTRES, navData, mapObj, haversine,
   render). N'altère rien d'existant.
   ============================================================ */
(function () {
  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var realLayer = null, watchId = null, alerted = {}, meMarker = null;
  function T(k,v){ return (typeof uiT === "function") ? uiT(k,v) : k; }
  function fmtD(km){ return km < 1 ? Math.round(km*1000)+" m" : (km<10?km.toFixed(1).replace(".",","):Math.round(km))+" km"; }

  /* --- petit toast --- */
  function toast(msg) {
    var w = document.getElementById("rtq-toast");
    if (!w) { w = document.createElement("div"); w.id = "rtq-toast";
      w.style.cssText = "position:fixed;left:0;right:0;bottom:88px;z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 14px";
      document.body.appendChild(w); }
    var t = document.createElement("div"); t.textContent = msg;
    t.style.cssText = "background:#26201a;color:#fff;border-radius:13px;padding:12px 16px;font-size:14px;font-weight:600;box-shadow:0 8px 26px rgba(0,0,0,.35);max-width:440px;opacity:0;transform:translateY(12px);transition:.35s";
    w.appendChild(t); requestAnimationFrame(function(){ t.style.opacity=1; t.style.transform="none"; });
    setTimeout(function(){ t.style.opacity=0; setTimeout(function(){ t.remove(); }, 400); }, 4500);
  }
  function getPos(){ return new Promise(function(res,rej){
    if(!navigator.geolocation) return rej();
    navigator.geolocation.getCurrentPosition(function(p){res([p.coords.longitude,p.coords.latitude]);},rej,{enableHighAccuracy:true,timeout:15000,maximumAge:5000});
  });}
  function xe(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* popup « à voir tout près » : vibration + Oui/Non (déclenché < 2 km) */
  function proxPopup(nom, dist, c){
    var old = document.getElementById("rtq-prox-popup"); if (old) old.remove();
    var ov = document.createElement("div"); ov.id = "rtq-prox-popup";
    ov.style.cssText = "position:fixed;inset:0;z-index:10000;background:#00000077;display:flex;align-items:center;justify-content:center;padding:20px";
    ov.innerHTML = '<div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.35)">'
      + '<div style="font-size:36px">📍</div>'
      + '<h3 style="margin:6px 0 4px;color:#1f4d3a">'+T('rt.avoir.tout.pres')+'</h3>'
      + '<p style="margin:0 0 4px;font-size:16px;font-weight:800">' + xe(nom) + '</p>'
      + '<p style="margin:0 0 16px;color:#7d6b45;font-size:13px">'+T('rt.a.distance.voir',{d:fmtD(dist)})+'</p>'
      + '<div style="display:flex;gap:10px">'
      + '<button id="rtq-pp-no" style="flex:1;border:2px solid #cbb98f;background:#fff;color:#7d6b45;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.non')+'</button>'
      + '<button id="rtq-pp-yes" style="flex:1;border:none;background:#1f4d3a;color:#fff;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.oui.y.aller')+' 🧭</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector("#rtq-pp-no").onclick = function(){ ov.remove(); };
    ov.querySelector("#rtq-pp-yes").onclick = function(){ ov.remove(); window.open("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + c[1] + "," + c[0], "_blank"); };
    setTimeout(function(){ if (document.body.contains(ov)) ov.remove(); }, 15000); // auto-ferme (conduite)
  }

  /* --- 1) VRAI ROUTAGE OSRM --- */
  function drawRealRoute() {
    if (typeof mapObj === "undefined" || !mapObj || typeof navData !== "function") return;
    var d = navData(); if (!d) return;
    var pts = [d.origin].concat(d.stops); if (d.forme === "boucle") pts.push(d.origin);
    if (pts.length < 2) return;
    var coords = pts.map(function (p) { return p[0] + "," + p[1]; }).join(";");
    fetch(OSRM + coords + "?overview=full&geometries=geojson").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.routes || !j.routes.length || !mapObj) return;
      var rt = j.routes[0];
      try { if (realLayer) mapObj.removeLayer(realLayer); } catch (e) {}
      realLayer = L.polyline(rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }), { color: "#1f4d3a", weight: 4, opacity: .9 }).addTo(mapObj);
      // La vraie route est tracée → on retire la ligne droite pointillée « à vol d'oiseau »
      // (sinon les segments vers une étape ajoutée restent en ligne droite).
      try { mapObj.eachLayer(function (l) { if (l !== realLayer && l instanceof L.Polyline && l.options && l.options.dashArray) mapObj.removeLayer(l); }); } catch (e) {}
      var km = Math.round(rt.distance / 1000), min = Math.round(rt.duration / 60), h = Math.floor(min / 60), m = min % 60;
      var dur = h ? (h + " h" + (m ? " " + m : "")) : (m + " min");
      var b = document.getElementById("rtq-realbadge");
      if (!b) { b = document.createElement("div"); b.id = "rtq-realbadge";
        b.style.cssText = "text-align:center;margin:8px 0 2px;font-size:14px;color:#1f4d3a;font-weight:700";
        var meta = document.querySelector("#rsum .meta"); if (meta && meta.parentNode) meta.parentNode.insertBefore(b, meta.nextSibling); }
      b.innerHTML = T('rt.route.reel')+' <b>' + km + ' km</b> · <b>' + dur + '</b>';
    }).catch(function () {});
  }

  /* --- helpers itinéraire --- */
  function routePoints(){ // [{lat,lng,nom}] origine + étapes (+ retour si boucle)
    if (typeof navData !== "function") return null;
    var d = navData(); if (!d) return null;
    var pts = [{lat:d.origin[1],lng:d.origin[0],nom:T('rt.depart')}];
    (LASTRES.route||[]).forEach(function(s){ pts.push({lat:s.c[1],lng:s.c[0],nom:(s.p&&s.p.nom)||T('rt.etape')}); });
    if (d.forme === "boucle") pts.push({lat:d.origin[1],lng:d.origin[0],nom:T('rt.retour')});
    return pts;
  }
  function gmDir(seg){ // seg = [{lat,lng}]
    var o=seg[0], dd=seg[seg.length-1], wp=seg.slice(1,-1);
    return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin="+o.lat+","+o.lng+
      "&destination="+dd.lat+","+dd.lng+(wp.length?"&waypoints="+wp.map(function(p){return p.lat+","+p.lng;}).join("|"):"");
  }

  /* --- 2) EXPORT GOOGLE MAPS PAR TRONÇONS ≤ 10 + 3) 9 prochains arrêts + 4) KML --- */
  function gmChunks() {
    var pts = routePoints(); if (!pts) return null;
    var parts = [], i = 0, SIZE = 10;
    if (pts.length <= SIZE) parts.push(pts);
    else while (i < pts.length - 1) { parts.push(pts.slice(i, Math.min(i + SIZE, pts.length))); i += SIZE - 1; }
    return parts.map(gmDir);
  }
  // 3) navigation depuis la position : les 9 prochains arrêts (avance au fil du voyage)
  function navFromHere() {
    var box = document.getElementById("rtq-navbox"); if (box) box.textContent = T('rt.localisation.en.cours');
    getPos().then(function (pos) {
      var seq = routePoints(); if (!seq) return;
      var here = {lat:pos[1],lng:pos[0]};
      var k = 0, best = Infinity;
      seq.forEach(function (s, i) { var dd = haversine([s.lng,s.lat], pos); if (dd < best) { best = dd; k = i; } });
      var up = seq.slice(k).slice(0, 9);
      if (!up.length) { if (box) box.textContent = T('rt.fin.parcours'); return; }
      var url = gmDir([here].concat(up));
      var names = up.map(function(s){return s.nom;}).join(" → ");
      if (box) box.innerHTML = '<a href="'+url+'" target="_blank" rel="noopener" style="display:block;background:#eef7f1;border:1.5px solid #2e6a4d;border-radius:12px;padding:12px 14px;text-decoration:none;color:#1f4d3a;font-weight:700">'+T('rt.ouvrir.nav',{n:up.length})+'</a><p style="font-size:12px;color:#7d6b45;margin:6px 0 0">'+xe(names)+'</p>';
    }).catch(function () { if (box) box.textContent = T('rt.gps.refuse'); });
  }
  // 4) export KML pour Google My Maps
  function downloadKML() {
    var pts = routePoints(); if (!pts || pts.length < 2) { toast(T('rt.composez.dabord')); return; }
    var marks = pts.map(function (p, i) {
      return "<Placemark><name>" + xe((i===0?"":i+". ") + p.nom) + "</name><Point><coordinates>" + p.lng + "," + p.lat + ",0</coordinates></Point></Placemark>";
    }).join("\n");
    var line = "<Placemark><name>"+T('rt.itineraire')+"</name><LineString><tessellate>1</tessellate><coordinates>" +
      pts.map(function (p) { return p.lng + "," + p.lat + ",0"; }).join(" ") + "</coordinates></LineString></Placemark>";
    var _en = (window.HConf&&HConf.exportNom)||"Heritage";
    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + _en + '</name>\n' + line + "\n" + marks + "\n</Document></kml>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }));
    a.download = ((window.HConf&&HConf.exportNom)||"Heritage")+".kml"; document.body.appendChild(a); a.click(); a.remove();
    toast(T('rt.kml.telecharge'));
  }
  function exportGmapsChunks() {
    var links = gmChunks();
    if (!links) { toast(T('rt.composez.dabord')); return; }
    var ov = document.getElementById("rtq-modal");
    if (!ov) { ov = document.createElement("div"); ov.id = "rtq-modal";
      ov.style.cssText = "position:fixed;inset:0;z-index:9998;background:#00000088;display:flex;align-items:flex-end;justify-content:center";
      ov.onclick = function (e) { if (e.target === ov) ov.style.display = "none"; };
      document.body.appendChild(ov); }
    var h = '<div style="background:#f6f0e4;width:100%;max-width:520px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px 18px 30px">';
    h += '<div style="border:1px solid #cfe3d6;background:#f4fbf6;border-radius:12px;padding:12px;margin-bottom:14px">'
      + '<b style="color:#1f4d3a">'+T('rt.depuis.ma.position')+'</b>'
      + '<p style="font-size:12.5px;color:#7d6b45;margin:4px 0 9px">'+T('rt.ideal.en.route')+'</p>'
      + '<button id="rtq-navhere" type="button" style="width:100%;border:none;border-radius:11px;padding:12px;background:#2e6a4d;color:#fff;font-weight:800;font-family:inherit">'+T('rt.calculer.arrets')+'</button>'
      + '<div id="rtq-navbox" style="margin-top:9px"></div></div>';
    h += '<h3 style="margin:0 0 4px;color:#1f4d3a">'+T('rt.le.parcours.en')+' ' + links.length + ' '+T('rt.troncons')+'</h3>';
    h += '<p style="color:#7d6b45;font-size:13px;margin:0 0 10px">'+T('rt.chaque.troncon')+'</p>';
    links.forEach(function (u, i) {
      h += '<a href="' + u + '" target="_blank" rel="noopener" style="display:block;background:#fff;border:1.5px solid #cfe3d6;border-radius:12px;padding:12px 14px;margin-bottom:9px;text-decoration:none;color:#26201a;font-size:14px"><b style="color:#1f4d3a">'+T('rt.troncon',{n:i+1,tot:links.length})+'</b> — '+T('rt.ouvrir.google.maps')+' 🧭</a>';
    });
    h += '<button id="rtq-kml" type="button" style="width:100%;margin-top:6px;border:2px solid #1f4d3a;background:#fff;color:#1f4d3a;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.carte.partageable')+'</button>';
    h += '<button id="rtq-close" type="button" style="width:100%;margin-top:8px;border:none;background:#e7ddc8;color:#5a4a2a;border-radius:12px;padding:13px;font-weight:700;font-family:inherit">'+T('rt.fermer')+'</button></div>';
    ov.innerHTML = h; ov.style.display = "flex";
    document.getElementById("rtq-navhere").onclick = navFromHere;
    document.getElementById("rtq-kml").onclick = downloadKML;
    document.getElementById("rtq-close").onclick = function(){ ov.style.display = "none"; };
  }

  /* --- 5) SUIVI GPS EN DIRECT : bandeau « prochaine étape » + alerte < 2 km --- */
  function followBar(){
    var b = document.getElementById("rtq-followbar");
    if (!b) { b = document.createElement("div"); b.id = "rtq-followbar";
      b.style.cssText = "position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9997;background:#1f4d3a;color:#fff;border-radius:14px;padding:11px 14px;box-shadow:0 8px 26px rgba(0,0,0,.3);display:none;align-items:center;gap:10px;font-size:13.5px";
      b.innerHTML = '<span id="rtq-followtxt" style="flex:1">'+T('rt.localisation')+'</span><button id="rtq-followstop" style="border:none;background:#ffffff33;color:#fff;border-radius:9px;padding:8px 11px;font-weight:700;font-family:inherit">'+T('rt.arreter')+'</button>';
      document.body.appendChild(b);
      b.querySelector("#rtq-followstop").onclick = function(){ stopFollow(); };
    }
    return b;
  }
  function stopFollow(){
    if (watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    var b = document.getElementById("rtq-followbar"); if (b) b.style.display = "none";
    var pb = document.getElementById("rtq-prox"); if (pb) pb.textContent = T('rt.suivi.proximite');
    toast(T('rt.suivi.desactive'));
  }
  function toggleProximity(btn) {
    if (watchId != null) { stopFollow(); return; }
    if (!navigator.geolocation) { toast(T('rt.geo.indispo')); return; }
    alerted = {};
    btn.textContent = T('rt.suivi.actif');
    var bar = followBar(); bar.style.display = "flex";
    document.getElementById("rtq-followtxt").textContent = T('rt.localisation.en.cours.2');
    toast(T('rt.suivi.active'));
    watchId = navigator.geolocation.watchPosition(function (p) {
      var me = [p.coords.longitude, p.coords.latitude];
      if (!LASTRES || !LASTRES.route) return;
      if (typeof mapObj !== "undefined" && mapObj) {
        if (!meMarker) meMarker = L.marker([me[1], me[0]], { icon: L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 4px #1a73e855"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 2000 }).addTo(mapObj);
        else meMarker.setLatLng([me[1], me[0]]);
      }
      var near = null, nd = Infinity;
      LASTRES.route.forEach(function (s) { var dd = haversine(me, s.c); if (dd < nd) { nd = dd; near = s; } });
      var txt = document.getElementById("rtq-followtxt");
      if (near && txt) txt.innerHTML = T('rt.prochaine.etape')+' <b>' + xe(near.p.nom) + '</b> · ' + fmtD(nd);
      if (near && nd <= 2 && !alerted[near.p.nom]) {
        alerted[near.p.nom] = 1;
        try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch (e) {}
        try { if ("Notification" in window && Notification.permission === "granted") new Notification("📍 " + near.p.nom, { body: T('rt.avoir.tout.pres') }); } catch (e) {}
        proxPopup(near.p.nom, nd, near.c);   // vibration + popup Oui / Non
      }
    }, function () { toast(T('rt.loc.refusee')); }, { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 });
  }

  /* --- injection des boutons + patch de render --- */
  function injectButtons() {
    if (document.getElementById("rtq-actions")) return;
    var anchor = document.getElementById("gmapshint");
    if (!anchor || !anchor.parentNode) return;
    var g = document.createElement("div");
    g.id = "rtq-actions"; g.className = "exp-group";
    g.innerHTML = '<div class="exp-lbl">🚗 '+T('rt.road.trip')+'</div><div class="exp">' +
      '<button id="rtq-gmaps" type="button">'+T('rt.export.gmaps')+'</button>' +
      '<button id="rtq-prox" type="button">'+T('rt.suivi.proximite')+'</button></div>';
    anchor.parentNode.insertBefore(g, anchor);
    document.getElementById("rtq-gmaps").onclick = exportGmapsChunks;
    var pb = document.getElementById("rtq-prox");
    pb.onclick = function () { toggleProximity(pb); };
  }

  if (typeof render === "function") {
    var _render = render;
    render = function (o, r) {
      _render(o, r);
      setTimeout(function () { injectButtons(); if (r && r.route && r.route.length) drawRealRoute(); }, 300);
    };
  }
  document.addEventListener("DOMContentLoaded", injectButtons);
  setTimeout(injectButtons, 800);
})();
