/* ============================================================
   BRIQUE SOCLE — « Découvrir ce lieu »                  (auto-portée)
   ------------------------------------------------------------
   Reprise du geste « 📖 Découvrir ce lieu » du RoadTrip, sans Firebase.
   Une étape ajoutée par le voyageur — un hôtel, une adresse, un café —
   n'a aucune description : on va en chercher une SOURCÉE (Wikipédia), et
   on propose de la coller dans la note de l'étape. On n'invente rien :
   si rien n'est trouvé, on le dit.

   • Auto-portée : embarque ses libellés et ses styles, aucune dépendance
     à l'hôte hormis le lieu qu'on lui passe.
   • Générique : ne nomme aucun pays, n'en lit aucune donnée.
   • i18n : langue décidée par l'hôte (localStorage 'the_lang'), sinon la
     langue de la PAGE, sinon l'anglais.
   • DÉSAMBIGUÏSATION comme dans le RoadTrip : on vérifie que l'article
     tombe bien près du point (60 km), sinon on l'écarte — sans quoi on
     colle l'histoire d'un homonyme à l'autre bout du monde.
   • RÉSEAU : c'est le seul geste d'une étape qui l'exige. Sans connexion
     il le dit, il ne laisse pas tourner.

   Usage :  HDecouvrir.ouvrir({ nom:"Café des Nattes", lat:36.87, lon:10.34,
                                surPlace:function(txt){ … } })
   ============================================================ */
(function () {
  "use strict";

  var I18N = null, LOADING = null;

  function langue() {
    var l = "";
    try { l = (localStorage.getItem("the_lang") || "").slice(0, 2); } catch (e) {}
    if (!l) { try { l = (document.documentElement.lang || "").slice(0, 2); } catch (e) {} }
    return l || "en";
  }
  function load() {
    if (LOADING) return LOADING;
    LOADING = fetch("brique-decouvrir-lieu.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }
  function L(k) { var d = (I18N && (I18N[langue()] || I18N.en)) || {}; return d[k] || ""; }
  function ech(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function km(a, b) {
    var R = 6371, t = Math.PI / 180;
    var dLat = (b[1] - a[1]) * t, dLon = (b[0] - a[0]) * t;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(a[1] * t) * Math.cos(b[1] * t) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  function styles() {
    if (document.getElementById("hdec-css")) return;
    var s = document.createElement("style"); s.id = "hdec-css";
    s.textContent =
      ".hdec-fond{position:fixed;inset:0;background:rgba(28,24,18,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}" +
      ".hdec-boite{background:#fffdf8;border-radius:14px;max-width:520px;width:100%;max-height:88vh;overflow:auto;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}" +
      ".hdec-tete{display:flex;align-items:flex-start;gap:10px}" +
      ".hdec-tete h3{margin:0;font-size:19px;color:#4b3f2a;flex:1;font-weight:600}" +
      ".hdec-x{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#8a7c66;padding:0 4px}" +
      ".hdec-h{font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#a8884f;margin:16px 0 6px}" +
      ".hdec-p{font-size:15px;line-height:1.7;color:#4b3f2a;margin:0}" +
      ".hdec-src{display:inline-block;margin-top:8px;font-size:13px;color:#8a7c66}" +
      ".hdec-liste{margin:0;padding-left:20px;font-size:14.5px;line-height:1.8;color:#4b3f2a}" +
      ".hdec-rien{font-size:14.5px;line-height:1.7;color:#7a4a2a;background:#fbf2ec;border:1px dashed #e0cdb8;border-radius:8px;padding:11px 13px}" +
      ".hdec-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}" +
      ".hdec-b{border:1px solid #e3d8c4;background:#fff;border-radius:8px;padding:10px 14px;font:inherit;font-size:14.5px;cursor:pointer;color:#6b5a39}" +
      ".hdec-b.go{background:#a8884f;color:#fff;border-color:#a8884f;flex:1}";
    document.head.appendChild(s);
  }
  function fermer() {
    var f = document.querySelector(".hdec-fond");
    if (f && f.parentNode) f.parentNode.removeChild(f);
  }
  function cadre(titre) {
    styles(); fermer();
    var fond = document.createElement("div"); fond.className = "hdec-fond";
    var boite = document.createElement("div"); boite.className = "hdec-boite";
    var tete = document.createElement("div"); tete.className = "hdec-tete";
    var h = document.createElement("h3"); h.textContent = "📖 " + (titre || "");
    var x = document.createElement("button");
    x.type = "button"; x.className = "hdec-x"; x.textContent = "×";
    x.setAttribute("aria-label", L("fermer")); x.onclick = fermer;
    tete.appendChild(h); tete.appendChild(x); boite.appendChild(tete);
    var corps = document.createElement("div"); boite.appendChild(corps);
    fond.appendChild(boite);
    fond.addEventListener("click", function (e) { if (e.target === fond) fermer(); });
    document.body.appendChild(fond);
    return corps;
  }

  /* ---- la recherche, calquée sur celle du RoadTrip -------------------- */
  function chercherInfo(nom, lat, lon) {
    var lg = langue(), out = {};
    /* On tente le nom tel quel, puis sans la parenthèse et sans le préfixe
       administratif : « Sbeitla (Sufetula) » trouve rarement, « Sbeitla » oui. */
    var noms = [];
    function ajoute(n) { n = String(n || "").trim(); if (n && noms.indexOf(n) < 0) noms.push(n); }
    ajoute(nom);
    ajoute(String(nom || "").replace(/\s*\(.*\)\s*$/, ""));
    ajoute(String(nom || "").replace(/^(ville|commune|city|town)\s+(de|of)\s+/i, ""));

    function resume(i) {
      if (i >= noms.length) return Promise.resolve(null);
      return fetch("https://" + lg + ".wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(noms[i]))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.extract || j.type === "disambiguation") return resume(i + 1);
          /* même garde-fou que le RoadTrip : l'article doit tomber PRÈS du
             point, sinon c'est un homonyme — on ne colle pas n'importe quoi. */
          if (j.coordinates && lat != null && lon != null) {
            if (km([lon, lat], [j.coordinates.lon, j.coordinates.lat]) > 60) return resume(i + 1);
          }
          out.titre = j.title;
          out.intro = j.extract;
          out.url = (j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page)
                    || ("https://" + lg + ".wikipedia.org/wiki/" + encodeURIComponent(j.title));
          return out;
        })
        .catch(function () { return resume(i + 1); });
    }
    return resume(0).then(function () { return out; });
  }

  function ouvrir(opts) {
    opts = opts || {};
    var nom = opts.nom || "";
    load().then(function () {
      var corps = cadre(nom);
      corps.innerHTML = '<p class="hdec-p">' + ech(L("recherche")) + "</p>";
      var coupe = setTimeout(function () { rien(corps, opts); }, 15000);
      chercherInfo(nom, opts.lat, opts.lon).then(function (info) {
        clearTimeout(coupe);
        if (!info || !info.intro) { rien(corps, opts); return; }
        var html = '<div class="hdec-h">' + ech(L("intro")) + "</div>"
                 + '<p class="hdec-p">' + ech(info.intro) + "</p>"
                 + '<a class="hdec-src" href="' + ech(info.url) + '" target="_blank" rel="noopener">'
                 + ech(L("source")) + " · " + ech(info.titre || nom) + "</a>";
        corps.innerHTML = html;
        var act = document.createElement("div"); act.className = "hdec-actions";
        if (typeof opts.surPlace === "function") {
          var b = document.createElement("button");
          b.type = "button"; b.className = "hdec-b go";
          b.textContent = L("utiliser");
          b.onclick = function () { opts.surPlace(info.intro); fermer(); };
          act.appendChild(b);
        }
        var f = document.createElement("button");
        f.type = "button"; f.className = "hdec-b";
        f.textContent = L("fermer");
        f.onclick = fermer;
        act.appendChild(f);
        corps.appendChild(act);
      }).catch(function () { clearTimeout(coupe); rien(corps, opts); });
    });
  }
  function rien(corps, opts) {
    if (!corps || !corps.parentNode) return;
    corps.innerHTML = '<div class="hdec-rien">' + ech(L("rien")) + "</div>";
    var act = document.createElement("div"); act.className = "hdec-actions";
    var f = document.createElement("button");
    f.type = "button"; f.className = "hdec-b go"; f.textContent = L("fermer"); f.onclick = fermer;
    act.appendChild(f); corps.appendChild(act);
  }

  window.HDecouvrir = { ouvrir: ouvrir, fermer: fermer };
})();
