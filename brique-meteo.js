/* ============================================================
   BRIQUE SOCLE — « Météo d'une étape »                  (auto-portée)
   ------------------------------------------------------------
   Le temps qu'il fera là où l'on va, étape par étape : maintenant, puis
   sept jours. Calquée sur l'écran météo du RoadTrip — mêmes données
   (Open-Meteo), même lecture : une ligne « maintenant », une grille de
   jours avec min/max et probabilité de pluie.

   • Auto-portée : embarque ses libellés, ses styles et sa fenêtre. Aucune
     dépendance à l'hôte hormis la position de l'étape, qu'on lui passe.
   • Générique : ne lit AUCUNE donnée de pays, n'en nomme aucun.
   • i18n auto-portée : langue décidée par l'hôte (localStorage 'the_lang'),
     repli anglais si la langue manque dans SA donnée.
   • HORS-LIGNE : la météo est la SEULE chose ici qui exige le réseau — une
     prévision ne peut pas être embarquée. Sans connexion elle le dit, elle
     ne reste pas sur « chargement » indéfiniment.
   • VIE PRIVÉE : la coordonnée de l'étape part chez Open-Meteo, et rien
     d'autre — pas d'identifiant, pas de position de l'utilisateur, pas de
     compte. C'est déclaré dans la politique de confidentialité de l'hôte.

   Usage :  HMeteo.ouvrir({ lat:36.85, lon:10.32, nom:"Fort de Kelibia" })
   ============================================================ */
(function () {
  "use strict";

  var I18N = null, LOADING = null;

  /* LA LANGUE DE L'HÔTE, PAS L'ANGLAIS PAR DÉFAUT
     Tant que le voyageur n'a rien choisi, rien n'est encore rangé : la brique
     tombait sur l'anglais, et un premier visiteur français découvrait cet écran
     en anglais. On lit d'abord son choix, sinon la langue DE LA PAGE — un attribut
     HTML standard, donc aucune dépendance nouvelle — et l'anglais en dernier. */
  function langue() {
    var l = "";
    try { l = (localStorage.getItem("the_lang") || "").slice(0, 2); } catch (e) {}
    if (!l) { try { l = (document.documentElement.lang || "").slice(0, 2); } catch (e) {} }
    return l || "en";
  }
  function load() {
    if (LOADING) return LOADING;
    LOADING = fetch("brique-meteo.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }
  function L(k) { var d = (I18N && (I18N[langue()] || I18N.en)) || {}; return d[k] || ""; }

  /* Codes de temps de l'OMM. L'icône est universelle, le mot est traduit :
     le libellé vient de la donnée, jamais d'ici. */
  var ICONE = {
    0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️", 45:"🌫️", 48:"🌫️",
    51:"🌦️", 53:"🌦️", 55:"🌧️", 56:"🌧️", 57:"🌧️",
    61:"🌦️", 63:"🌧️", 65:"🌧️", 66:"🌧️", 67:"🌧️",
    71:"🌨️", 73:"🌨️", 75:"❄️", 77:"🌨️",
    80:"🌦️", 81:"🌧️", 82:"⛈️", 85:"🌨️", 86:"❄️",
    95:"⛈️", 96:"⛈️", 99:"⛈️"
  };
  /* Familles de temps : un seul mot à traduire par famille, au lieu de 27. */
  function famille(c) {
    if (c === 0) return "clair";
    if (c === 1 || c === 2) return "eclaircies";
    if (c === 3) return "couvert";
    if (c === 45 || c === 48) return "brouillard";
    if (c >= 51 && c <= 57) return "bruine";
    if ((c >= 61 && c <= 67) || (c >= 80 && c <= 82)) return "pluie";
    if ((c >= 71 && c <= 77) || c === 85 || c === 86) return "neige";
    if (c >= 95) return "orage";
    return "";
  }
  function icone(c) { return ICONE[c] || "🌡️"; }

  function styles() {
    if (document.getElementById("hmeteo-css")) return;
    var s = document.createElement("style"); s.id = "hmeteo-css";
    s.textContent =
      ".hwx-fond{position:fixed;inset:0;background:rgba(28,24,18,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}" +
      ".hwx-boite{background:#fffdf8;border-radius:14px;max-width:460px;width:100%;max-height:92vh;overflow:auto;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}" +
      ".hwx-tete{display:flex;align-items:flex-start;gap:10px}" +
      ".hwx-tete h3{margin:0;font-size:18px;color:#4b3f2a;flex:1;font-weight:600}" +
      ".hwx-x{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#8a7c66;padding:0 4px}" +
      ".hwx-now{font-size:26px;color:#4b3f2a;margin:12px 0 4px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}" +
      ".hwx-now small{font-size:14px;color:#8a7c66}" +
      ".hwx-now .lib{font-size:16px;color:#6b5a39}" +
      ".hwx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(64px,1fr));gap:6px;margin-top:14px}" +
      ".hwx-day{text-align:center;border:1px solid #efe7d8;border-radius:8px;padding:8px 4px;background:#fff}" +
      ".hwx-d{font-size:12px;color:#8a7c66;text-transform:capitalize}" +
      ".hwx-i{font-size:20px;margin:3px 0}" +
      ".hwx-t{font-size:13px;color:#4b3f2a}" +
      ".hwx-p{font-size:12px;color:#5b7fa8;margin-top:2px}" +
      ".hwx-note{font-size:13px;line-height:1.6;color:#8a7c66;margin-top:14px}" +
      ".hwx-ko{font-size:14px;line-height:1.6;color:#7a4a2a;background:#fbf2ec;border:1px dashed #e0cdb8;border-radius:8px;padding:10px 12px;margin-top:12px}";
    document.head.appendChild(s);
  }

  function fermer() {
    var f = document.querySelector(".hwx-fond");
    if (f && f.parentNode) f.parentNode.removeChild(f);
  }

  function cadre(nom) {
    styles(); fermer();
    var fond = document.createElement("div"); fond.className = "hwx-fond";
    var boite = document.createElement("div"); boite.className = "hwx-boite";
    var tete = document.createElement("div"); tete.className = "hwx-tete";
    var h = document.createElement("h3");
    h.textContent = "🌤️ " + (nom || L("titre"));
    var x = document.createElement("button");
    x.type = "button"; x.className = "hwx-x"; x.textContent = "×";
    x.setAttribute("aria-label", L("fermer")); x.onclick = fermer;
    tete.appendChild(h); tete.appendChild(x); boite.appendChild(tete);
    var corps = document.createElement("div"); boite.appendChild(corps);
    fond.appendChild(boite);
    fond.addEventListener("click", function (e) { if (e.target === fond) fermer(); });
    document.body.appendChild(fond);
    return corps;
  }

  function jourCourt(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    try { return d.toLocaleDateString(langue(), { weekday: "short", day: "numeric" }); }
    catch (e) { return iso.slice(5); }
  }

  function ouvrir(opts) {
    opts = opts || {};
    var lat = Number(opts.lat), lon = Number(opts.lon);
    if (!isFinite(lat) || !isFinite(lon)) return;
    load().then(function () {
      var corps = cadre(opts.nom);
      corps.innerHTML = '<p class="hwx-note">' + L("chargement") + "</p>";
      var u = "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(4) +
              "&longitude=" + lon.toFixed(4) +
              "&current=temperature_2m,weather_code" +
              "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
              "&timezone=auto&forecast_days=7";
      /* Un appel qui n'aboutit pas doit RENDRE LA MAIN : sans délai maximum,
         hors réseau, la fenêtre restait sur « chargement » sans fin. */
      var coupe = setTimeout(function () { echec(corps); }, 12000);
      fetch(u, { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { clearTimeout(coupe); rendre(corps, j); })
        .catch(function () { clearTimeout(coupe); echec(corps); });
    });
  }

  function echec(corps) {
    if (!corps || !corps.parentNode) return;
    corps.innerHTML = '<div class="hwx-ko">' + L("indispo") + "</div>";
  }

  function rendre(corps, j) {
    if (!corps || !corps.parentNode) return;
    if (!j || !j.current || !j.daily) { echec(corps); return; }
    var c = j.current, d = j.daily;
    var fam = famille(c.weather_code), lib = fam ? L("temps." + fam) : "";
    var html = '<div class="hwx-now">' + icone(c.weather_code) +
      " <b>" + Math.round(c.temperature_2m) + "°</b>" +
      (lib ? ' <span class="lib">' + lib + "</span>" : "") +
      " <small>" + L("maintenant") + "</small></div>";
    var jours = "";
    for (var i = 0; i < (d.time || []).length; i++) {
      var p = d.precipitation_probability_max ? d.precipitation_probability_max[i] : null;
      jours += '<div class="hwx-day">' +
        '<div class="hwx-d">' + jourCourt(d.time[i]) + "</div>" +
        '<div class="hwx-i">' + icone(d.weather_code[i]) + "</div>" +
        '<div class="hwx-t">' + Math.round(d.temperature_2m_min[i]) + "° / <b>" +
          Math.round(d.temperature_2m_max[i]) + "°</b></div>" +
        '<div class="hwx-p">💧 ' + (p == null ? "–" : p + "%") + "</div></div>";
    }
    html += '<div class="hwx-grid">' + jours + "</div>";
    html += '<p class="hwx-note">' + L("source") + "</p>";
    corps.innerHTML = html;
  }

  window.HMeteo = { ouvrir: ouvrir, fermer: fermer };
})();
