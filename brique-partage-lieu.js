/* ============================================================
   BRIQUE SOCLE — « Un lieu partagé devient une étape »   (auto-portée)
   ------------------------------------------------------------
   Le voyageur trouve son hôtel dans Google Maps, son restaurant dans Waze,
   un point de rendez-vous dans Plans. Jusqu'ici il devait retaper le nom à
   la main dans l'application, et souvent renoncer. Cette brique lit le lien
   et en tire un point sur la carte.

   DEUX PORTES, parce qu'une seule ne suffit pas :

   1. LE PARTAGE SYSTÈME (Android, application installée). Le manifeste
      déclare un « share_target » : l'application apparaît dans la feuille
      de partage. Le lien arrive ici en paramètres d'adresse.
      ⚠️ iOS ne connaît PAS le partage vers une application web. Sur iPhone
      cette porte n'existe pas — d'où la seconde.

   2. LE COLLAGE. On colle le lien dans une fenêtre. Cela marche PARTOUT,
      iPhone compris, et ne dépend d'aucune installation.

   CE QU'ON SAIT LIRE, et ce qu'on ne sait pas :
     · Google Maps complet   …/@36.8065,10.1815,17z  ·  ?q=36.8,10.1  ·  !3d…!4d…
     · Waze                  waze.com/ul?ll=36.8,10.1
     · Plans (Apple)         maps.apple.com/?ll=…  ·  &coordinate=…
     · OpenStreetMap         #map=17/36.8/10.1  ·  ?mlat=&mlon=
     · geo:36.8,10.1  ·  coordonnées nues  ·  degrés-minutes-secondes
     · ✗ LIENS COURTS (maps.app.goo.gl, goo.gl/maps) : le navigateur ne peut
       PAS suivre la redirection d'un autre domaine — la politique de sécurité
       l'interdit. On ne devine donc rien. On se rabat sur le NOM partagé, on
       le cherche dans le fond de carte public, et on montre ce qu'on a trouvé
       pour que le voyageur confirme. On n'invente jamais de coordonnées.

   La confirmation ne se fait pas ici : on rend la main à l'écran d'étape
   habituel, pré-rempli. Un seul écran d'étape dans toute l'application.

   Usage :  HPartage.auDemarrage()   ← lit l'adresse au chargement
            HPartage.ouvrir()        ← ouvre la fenêtre de collage
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
    LOADING = fetch("brique-partage-lieu.data.json", { cache: "no-cache" })
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

  /* ---------------------------------------------------------- la lecture
     Chaque motif est essayé dans l'ordre du plus sûr au plus permissif.
     Une coordonnée hors du monde (|lat|>90, |lon|>180) est rejetée : mieux
     vaut ne rien trouver que poser un point au mauvais endroit. */

  function bonPoint(lat, lon) {
    return isFinite(lat) && isFinite(lon)
        && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
        && !(lat === 0 && lon === 0);          // 0,0 = golfe de Guinée : c'est un champ vide
  }

  function dms(txt) {
    // 36°52'23"N 10°10'53"E
    var m = String(txt).match(
      /(\d{1,3})[°\s]+(\d{1,2})['′\s]+([\d.]+)["″\s]*([NSns])[,\s]+(\d{1,3})[°\s]+(\d{1,2})['′\s]+([\d.]+)["″\s]*([EWOew])/);
    if (!m) return null;
    var lat = (+m[1]) + (+m[2]) / 60 + (+m[3]) / 3600;
    var lon = (+m[5]) + (+m[6]) / 60 + (+m[7]) / 3600;
    if (/[Ss]/.test(m[4])) lat = -lat;
    if (/[WOwo]/.test(m[8])) lon = -lon;
    return bonPoint(lat, lon) ? [lon, lat] : null;
  }

  function lirePoint(txt) {
    txt = String(txt || "");
    var m, lat, lon;

    // geo:36.8,10.1
    if ((m = txt.match(/geo:(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/i))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // Google Maps — le point VISÉ (!3d lat !4d lon) prime sur le centre de l'écran
    if ((m = txt.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // Google Maps — centre de la vue @lat,lon,zoom
    if ((m = txt.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // Waze ll= · Plans ll= / coordinate= · Google ?q= / query=
    if ((m = txt.match(/[?&#](?:ll|q|query|coordinate|daddr|destination)=(-?\d+\.?\d*)(?:,|%2C)\s*(-?\d+\.?\d*)/i))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // Waze carte vivante : to=ll.36.8,10.1
    if ((m = txt.match(/ll\.(-?\d+\.?\d*)(?:,|%2C)(-?\d+\.?\d*)/i))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // OpenStreetMap — épingle, puis vue
    if ((m = txt.match(/[?&]mlat=(-?\d+\.?\d*)[^]*?[?&]mlon=(-?\d+\.?\d*)/i))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    if ((m = txt.match(/#map=\d+\/(-?\d+\.?\d*)\/(-?\d+\.?\d*)/i))) {
      lat = +m[1]; lon = +m[2]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    // degrés-minutes-secondes
    var d = dms(txt); if (d) return d;
    // coordonnées nues « 36.8065, 10.1815 » — en dernier, c'est le plus permissif
    if ((m = txt.match(/(^|[\s(])(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/))) {
      lat = +m[2]; lon = +m[3]; if (bonPoint(lat, lon)) return [lon, lat];
    }
    return null;
  }

  /* Retire les liens D'OÙ QU'ILS SOIENT dans le texte. Le partage ne met pas
     toujours le lien sur sa propre ligne : depuis une messagerie il arrive
     collé au nom, « Dougga https://… ». En ne filtrant que les lignes qui
     COMMENCENT par http, on gardait le lien dans le nom et on cherchait une
     adresse impossible. */
  function sansLiens(txt) {
    return String(txt || "")
      .replace(/\\n/g, " ")                              // « \n » écrit en toutes lettres
      .replace(/\b(?:https?:\/\/|www\.|geo:)\S+/gi, " ")
      .replace(/\s+/g, " ").trim();
  }

  /* Le nom : ce que le partage met AVANT le lien, ou le segment /place/ de
     l'adresse. Sans nom, l'étape s'appellera par son adresse. */
  function lireNom(titre, texte, lien) {
    var n = sansLiens(titre);
    if (!n) {
      var lignes = String(texte || "").split(/[\r\n]+/)
        .map(sansLiens)
        .filter(function (x) { return x && !/^\d[\d.,\s°'"NSEWnsew-]*$/.test(x); });   // pas juste des coordonnées
      if (lignes.length) n = lignes[0];
    }
    if (!n) {
      var m = String(lien || texte || "").match(/\/place\/([^\/@?#]+)/);
      if (m) { try { n = decodeURIComponent(m[1].replace(/\+/g, " ")); } catch (e) { n = m[1]; } }
    }
    if (!n) {
      var q = String(lien || texte || "").match(/[?&](?:q|query|address)=([^&#]+)/i);
      if (q && !/^-?\d+\.?\d*(,|%2C)/.test(q[1])) {
        try { n = decodeURIComponent(q[1].replace(/\+/g, " ")); } catch (e) {}
      }
    }
    return n.replace(/\s+/g, " ").slice(0, 90);
  }

  function estLienCourt(txt) {
    return /(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|w\.waze\.com)/i.test(String(txt || ""));
  }

  /* Chercher un nom dans le fond de carte public — le même service que
     l'écran d'étape, pour ne pas avoir deux comportements différents. */
  function chercherParNom(nom) {
    if (!nom) return Promise.resolve(null);
    return fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(nom),
                 { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.length) return null;
        var lat = parseFloat(j[0].lat), lon = parseFloat(j[0].lon);
        return bonPoint(lat, lon) ? { coord: [lon, lat], adresse: j[0].display_name || "" } : null;
      })
      .catch(function () { return null; });
  }

  /* ------------------------------------------------------------ l'écran */
  function styles() {
    if (document.getElementById("hpar-css")) return;
    var s = document.createElement("style"); s.id = "hpar-css";
    s.textContent =
      ".hpar-fond{position:fixed;inset:0;background:rgba(28,24,18,.62);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}" +
      ".hpar-boite{background:#fffdf8;border-radius:14px;max-width:520px;width:100%;max-height:88vh;overflow:auto;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.3)}" +
      ".hpar-tete{display:flex;align-items:flex-start;gap:10px}" +
      ".hpar-tete h3{margin:0;font-size:19px;color:#4b3f2a;flex:1;font-weight:600}" +
      ".hpar-x{background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#8a7c66;padding:0 4px}" +
      ".hpar-p{font-size:14.5px;line-height:1.65;color:#6b5a39;margin:10px 0 0}" +
      ".hpar-in{width:100%;margin-top:12px;padding:10px 12px;border:1px solid #e3d8c4;border-radius:8px;font:inherit;font-size:15px}" +
      ".hpar-trouve{margin-top:14px;background:#f4f7f0;border:1px solid #d6e3c8;border-radius:8px;padding:11px 13px;font-size:14.5px;line-height:1.6;color:#3c4a2e}" +
      ".hpar-rien{margin-top:14px;background:#fbf2ec;border:1px dashed #e0cdb8;border-radius:8px;padding:11px 13px;font-size:14.5px;line-height:1.6;color:#7a4a2a}" +
      ".hpar-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}" +
      ".hpar-b{border:1px solid #e3d8c4;background:#fff;border-radius:8px;padding:10px 14px;font:inherit;font-size:14.5px;cursor:pointer;color:#6b5a39}" +
      ".hpar-b.go{background:#a8884f;color:#fff;border-color:#a8884f;flex:1}" +
      ".hpar-b[disabled]{opacity:.5;cursor:default}";
    document.head.appendChild(s);
  }
  function fermer() {
    var f = document.querySelector(".hpar-fond");
    if (f && f.parentNode) f.parentNode.removeChild(f);
  }
  function cadre(titre) {
    styles(); fermer();
    var fond = document.createElement("div"); fond.className = "hpar-fond";
    var boite = document.createElement("div"); boite.className = "hpar-boite";
    var tete = document.createElement("div"); tete.className = "hpar-tete";
    var h = document.createElement("h3"); h.textContent = "📍 " + (titre || "");
    var x = document.createElement("button");
    x.type = "button"; x.className = "hpar-x"; x.textContent = "×";
    x.setAttribute("aria-label", L("fermer")); x.onclick = fermer;
    tete.appendChild(h); tete.appendChild(x); boite.appendChild(tete);
    var corps = document.createElement("div"); boite.appendChild(corps);
    fond.appendChild(boite);
    fond.addEventListener("click", function (e) { if (e.target === fond) fermer(); });
    document.body.appendChild(fond);
    return corps;
  }

  /* Rendre la main à l'écran d'étape habituel, pré-rempli. */
  function versEtape(nom, coord, adresse) {
    fermer();
    if (!window.THEetape) return;
    THEetape.ouvrir({ premiere: false, valeurs: { nom: nom || "", coord: coord || null, adresse: adresse || "" } });
  }

  /* Traite un texte partagé ou collé. Rend une promesse pour pouvoir
     enchaîner la recherche par nom sans bloquer l'écran. */
  function traiter(titre, texte, lien, corps, boutonPret) {
    var brut = [titre, texte, lien].filter(Boolean).join("\n");
    var nom = lireNom(titre, texte, lien);
    var pt = lirePoint(brut);

    function montrerTrouve(coord, adresse, approx) {
      corps.querySelectorAll(".hpar-trouve,.hpar-rien").forEach(function (e) { e.remove(); });
      var d = document.createElement("div"); d.className = "hpar-trouve";
      d.innerHTML = "<b>" + ech(nom || L("sans.nom")) + "</b><br>"
        + ech(adresse || (coord[1].toFixed(5) + ", " + coord[0].toFixed(5)))
        + (approx ? "<br><i>" + ech(L("approx")) + "</i>" : "");
      corps.appendChild(d);
      if (boutonPret) boutonPret(function () { versEtape(nom, coord, adresse); });
    }
    function montrerRien(msg) {
      corps.querySelectorAll(".hpar-trouve,.hpar-rien").forEach(function (e) { e.remove(); });
      var d = document.createElement("div"); d.className = "hpar-rien";
      d.textContent = msg;
      corps.appendChild(d);
      if (boutonPret) boutonPret(null);
    }

    if (pt) { montrerTrouve(pt, "", false); return Promise.resolve(true); }

    if (!nom) { montrerRien(L("rien.compris")); return Promise.resolve(false); }

    /* Pas de point dans le lien : soit c'est un lien court (illisible depuis
       le navigateur), soit le partage n'a donné qu'un nom. On cherche. */
    montrerRien(L("recherche"));
    return chercherParNom(nom).then(function (t) {
      if (t) { montrerTrouve(t.coord, t.adresse, true); return true; }
      montrerRien(estLienCourt(brut) ? L("lien.court") : L("nom.introuvable"));
      return false;
    });
  }

  function ecran(titre, texte, lien) {
    load().then(function () {
      var corps = cadre(L("titre"));
      var p = document.createElement("p"); p.className = "hpar-p";
      p.textContent = L("intro");
      corps.appendChild(p);

      var champ = document.createElement("input");
      champ.className = "hpar-in"; champ.type = "text";
      champ.placeholder = L("collez.ici");
      champ.value = [texte, lien].filter(Boolean).join(" ").trim();
      corps.appendChild(champ);

      var act = document.createElement("div"); act.className = "hpar-actions";
      var ok = document.createElement("button");
      ok.type = "button"; ok.className = "hpar-b go"; ok.textContent = L("ajouter"); ok.disabled = true;
      var non = document.createElement("button");
      non.type = "button"; non.className = "hpar-b"; non.textContent = L("fermer"); non.onclick = fermer;
      act.appendChild(ok); act.appendChild(non); corps.appendChild(act);

      function pret(action) {
        ok.disabled = !action;
        ok.onclick = action || null;
      }
      var t = null;
      function relire() {
        clearTimeout(t);
        t = setTimeout(function () { traiter(titre, champ.value, "", corps, pret); }, 350);
      }
      champ.addEventListener("input", relire);
      if (champ.value) traiter(titre, champ.value, lien, corps, pret);
    });
  }

  /* Arrivée par la feuille de partage du système : les paramètres sont posés
     par le manifeste (share_target). On nettoie l'adresse derrière nous pour
     qu'un rechargement ne rejoue pas l'ajout. */
  function auDemarrage() {
    var p;
    try { p = new URLSearchParams(location.search); } catch (e) { return false; }
    var titre = p.get("titre") || p.get("title") || "";
    var texte = p.get("texte") || p.get("text") || "";
    var lien = p.get("lien") || p.get("url") || "";
    if (!titre && !texte && !lien) return false;
    try {
      ["titre", "title", "texte", "text", "lien", "url"].forEach(function (k) { p.delete(k); });
      var reste = p.toString();
      history.replaceState(null, "", location.pathname + (reste ? "?" + reste : "") + location.hash);
    } catch (e) {}
    ecran(titre, texte, lien);
    return true;
  }

  window.HPartage = {
    ouvrir: function () { ecran("", "", ""); },
    auDemarrage: auDemarrage,
    fermer: fermer,
    lirePoint: lirePoint,     // exposés pour la vérification automatique
    lireNom: lireNom,
    chercherParNom: chercherParNom
  };
})();
