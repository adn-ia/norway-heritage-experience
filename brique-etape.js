/* ============================================================
   BRIQUE SOCLE — « Saisir une étape »   (auto-portée)
   ------------------------------------------------------------
   Calquée sur l'écran d'ajout d'étape du RoadTrip générique : un nom,
   une position prise PAR ADRESSE ou PAR GPS, un mot, des dates.

   • Auto-portée : embarque son écran, ses styles et ses libellés.
     Aucun texte en dur ici — tout vient de brique-etape.data.json.
   • Générique : ne nomme aucun pays. Le géocodage se restreint au pays
     de l'édition SI HConf.iso existe, sinon il cherche partout.
   • Ne touche à RIEN chez l'hôte : quand l'étape est validée, elle émet
     un évènement « the:etape » et se tait. L'hôte décide quoi en faire.
     La brique fonctionne donc même seule, dans une page d'essai.
   • Sans Firebase, comme tout Heritage. (Une synchronisation viendrait
     un jour en plugin séparé, jamais ici.)
   • i18n : langue décidée par l'hôte (localStorage 'the_lang'), repli anglais.

   Appel :  THEetape.ouvrir({ premiere:true })   → écran de première étape
            document.addEventListener('the:etape', e => …e.detail…)
   detail : { nom, note, coord:[lon,lat], adresse, arrivee, depart, heure }
   ============================================================ */
(function () {
  "use strict";

  var I18N = null, LOADING = null, POS = null, ADRESSE = "";

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
    LOADING = fetch("brique-etape.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }
  function L(k) {
    var d = (I18N && (I18N[langue()] || I18N.en)) || {};
    return d[k] || "";
  }
  function ech(x) { return String(x == null ? "" : x).replace(/[<>&"]/g, function (c) {
    return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); }

  function styles() {
    if (document.getElementById("bet-css")) return;
    var s = document.createElement("style");
    s.id = "bet-css";
    s.textContent =
      "#betModal{position:fixed;inset:0;z-index:10001;background:rgba(20,15,10,.55);display:none;" +
      "align-items:center;justify-content:center;padding:16px}" +
      "#betModal .bet-box{background:#fffdf8;border-radius:12px;max-width:440px;width:100%;padding:20px;" +
      "position:relative;max-height:88vh;overflow:auto}" +
      "#betModal h3{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:21px;margin:0 0 12px;color:#2b2318}" +
      "#betModal input,#betModal textarea{width:100%;box-sizing:border-box;font:inherit;font-size:15px;" +
      "border:1px solid #e3d8c4;border-radius:8px;padding:10px;background:#fff;color:#2b2318}" +
      "#betModal textarea{min-height:54px}" +
      "#betModal .bet-l{font-size:13.5px;color:#8a7c66;margin:12px 0 4px}" +
      "#betModal .bet-row{display:flex;gap:8px}" +
      "#betModal button.bet-s{background:none;border:1px solid #e3d8c4;border-radius:8px;padding:10px 12px;" +
      "font:inherit;font-size:14.5px;cursor:pointer;color:#6b5a39;white-space:nowrap}" +
      "#betModal .bet-go{display:block;width:100%;background:#a8884f;color:#2b2318;border:none;border-radius:8px;" +
      "padding:13px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;margin-top:16px}" +
      "#betModal .bet-no{display:block;width:100%;background:none;border:1px solid #e3d8c4;color:#8a7c66;" +
      "border-radius:8px;padding:11px;font:inherit;cursor:pointer;margin-top:8px}" +
      "#betModal .bet-res button{display:block;width:100%;text-align:left;background:none;border:none;.bet-tag{display:inline-block;font-size:11px;letter-spacing:.5px;text-transform:uppercase;color:#a8884f;margin-right:6px}" +
      "border-bottom:1px solid #efe7d8;padding:9px 2px;font:inherit;font-size:14.5px;cursor:pointer;color:#2b2318}" +
      "#betModal .bet-pos{font-size:13.5px;color:#a8884f;margin:8px 0 0}" +
      "#betModal .bet-err{color:#b3402f;font-weight:600;border:1px solid #e3b6ad;background:#fbecec;border-radius:7px;padding:8px 10px}" +
      "#betModal input.bet-err,#betModal textarea.bet-err{border-color:#b3402f}";
    document.head.appendChild(s);
  }

  function jour(d) {
    var p = function (x) { return String(x).padStart(2, "0"); };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }

  function construire(premiere) {
    styles();
    var m = document.getElementById("betModal");
    if (m) m.remove();
    m = document.createElement("div");
    m.id = "betModal";
    var n = new Date();
    m.innerHTML =
      '<div class="bet-box">' +
        '<h3>' + ech(L(premiere ? "titre.premiere" : "titre")) + '</h3>' +
        '<input id="bet-nom" type="text" placeholder="' + ech(L("nom.exemple")) + '" aria-label="' + ech(L("nom")) + '">' +
        '<div class="bet-l">' + ech(L("chercher")) + '</div>' +
        '<div class="bet-row">' +
          '<input id="bet-q" type="text" style="flex:1">' +
          '<button type="button" class="bet-s" id="bet-go-q">' + ech(L("bouton.chercher")) + '</button>' +
        '</div>' +
        '<div class="bet-res" id="bet-res"></div>' +
        '<div class="bet-row" style="margin-top:8px"><button type="button" class="bet-s" id="bet-gps" style="flex:1">' + ech(L("gps")) + '</button></div>' +
        '<div class="bet-pos" id="bet-pos">' + ech(L("position.aucune")) + '</div>' +
        '<div class="bet-l">' + ech(L("note")) + '</div>' +
        '<textarea id="bet-note"></textarea>' +
        '<div class="bet-l">' + ech(L("quand")) + '</div>' +
        '<div class="bet-row">' +
          '<input id="bet-arr" type="date" value="' + jour(n) + '" aria-label="' + ech(L("arrivee")) + '">' +
          '<input id="bet-h" type="time" value="' + String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0") + '" aria-label="' + ech(L("heure")) + '">' +
        '</div>' +
        '<div class="bet-row" style="margin-top:6px">' +
          '<button type="button" class="bet-s" data-j="0">' + ech(L("aujourdhui")) + '</button>' +
          '<button type="button" class="bet-s" data-j="1">' + ech(L("hier")) + '</button>' +
          '<button type="button" class="bet-s" data-j="2">' + ech(L("avant.hier")) + '</button>' +
        '</div>' +
        '<div class="bet-l">' + ech(L("depart")) + '</div>' +
        '<input id="bet-dep" type="date">' +
        '<div class="bet-l">' + ech(L("inserer")) + '</div>' +
        '<select id="bet-ou"></select>' +
        '<button type="button" class="bet-go" id="bet-ok">' + ech(L("valider")) + '</button>' +
        '<button type="button" class="bet-no" id="bet-non">' + ech(L("annuler")) + '</button>' +
        '<div class="bet-pos" style="text-align:center;margin-top:10px">' + ech(L("auto")) + '</div>' +
      '</div>';
    document.body.appendChild(m);
    return m;
  }

  /* Une seule recherche pour deux besoins. Il y avait deux façons d'ajouter :
     un encart qui fouillait les lieux du guide sans rien demander d'autre, et
     cet écran qui ne connaissait que les adresses. On cherche désormais les
     DEUX ici — les lieux du guide d'abord, les adresses ensuite — et l'encart
     disparaît. La brique reste autonome : si l'hôte n'offre pas ses lieux,
     elle se contente des adresses, sans rien casser. */
  function proposer(res, pos, etiquette, libelle, coord, estAdresse) {
    var b = document.createElement("button");
    b.type = "button";
    b.innerHTML = '<span class="bet-tag">' + ech(etiquette) + "</span> " + ech(libelle);
    b.onclick = function () {
      POS = coord; ADRESSE = estAdresse ? libelle : "";
      pos.textContent = "📍 " + libelle;
      res.innerHTML = "";
      var nom = document.getElementById("bet-nom");
      if (nom && !nom.value.trim()) nom.value = String(libelle).split(",")[0];
    };
    res.appendChild(b);
  }

  function chercher() {
    var q = (document.getElementById("bet-q").value || "").trim();
    var pos = document.getElementById("bet-pos"), res = document.getElementById("bet-res");
    if (!q) return;
    pos.textContent = L("position.recherche"); res.innerHTML = "";

    var locaux = [];
    try {
      if (typeof window.THEsitesRecherche === "function") locaux = window.THEsitesRecherche(q) || [];
    } catch (e) { locaux = []; }
    locaux.slice(0, 5).forEach(function (s) {
      if (s && s.nom && s.coord) proposer(res, pos, L("source.guide"), s.nom, s.coord, false);
    });

    var iso = (window.HConf && HConf.iso) || "";
    fetch("https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=" + langue() +
          (iso ? "&countrycodes=" + iso : "") + "&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if ((!j || !j.length) && !locaux.length) { pos.textContent = L("position.introuvable"); return; }
        if (pos.textContent === L("position.recherche")) pos.textContent = "";
        (j || []).forEach(function (x) {
          proposer(res, pos, L("source.adresse"), x.display_name,
                   [parseFloat(x.lon), parseFloat(x.lat)], true);
        });
      })
      .catch(function () { if (!locaux.length) pos.textContent = L("position.introuvable"); });
  }

  /* Un manque doit SE VOIR : le message existait, en gris, noyé dans le reste. */
  function erreur(el, on) {
    if (!el) return;
    el.classList.toggle("bet-err", !!on);
    if (on) try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
  }

  /* LOCALISATION — dire CE QUI s'est passé, et ne pas exiger une puce GPS.
     Toute erreur était annoncée « refusée ». Sur un ordinateur portable il n'y a
     pas de GPS : la haute précision expire, et on lisait « refusé » sans avoir
     rien refusé. On tente donc d'abord SANS haute précision (le wifi suffit à
     quelques centaines de mètres), on réessaie une fois en précis, et chaque
     cause a son propre message. */
  function gps() {
    var pos = document.getElementById("bet-pos");
    if (!navigator.geolocation) { pos.textContent = L("position.indisponible"); erreur(pos, true); return; }
    pos.textContent = L("position.recherche"); erreur(pos, false);

    function reussi(p) {
      POS = [p.coords.longitude, p.coords.latitude]; ADRESSE = "";
      pos.textContent = "📍 " + POS[1].toFixed(4) + ", " + POS[0].toFixed(4);
      erreur(pos, false);
    }
    function rate(e, second) {
      var code = e && e.code;
      if (code === 1) { pos.textContent = L("position.refusee"); erreur(pos, true); return; }
      if (!second) {                                   // une seconde chance, en précis
        navigator.geolocation.getCurrentPosition(reussi,
          function (e2) { rate(e2, true); },
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
        return;
      }
      pos.textContent = (code === 3) ? L("position.lente") : L("position.indisponible");
      erreur(pos, true);
    }
    navigator.geolocation.getCurrentPosition(reussi,
      function (e) { rate(e, false); },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 });
  }

  function ouvrir(opts) {
    opts = opts || {};
    /* opts.valeurs : on rouvre le MÊME écran pour corriger une étape déjà posée —
       un nom mal tapé, une position approximative, une date oubliée. Sans cela il
       fallait supprimer l'étape et tout ressaisir, en perdant son carnet. */
    var v = opts.valeurs || null;
    return load().then(function () {
      POS = v && v.coord ? v.coord : null;
      ADRESSE = (v && v.adresse) || "";
      var m = construire(!!opts.premiere);
      /* MODIFIER N'EST PAS AJOUTER.
         L'écran de correction réutilise le formulaire d'ajout — c'est voulu, il
         porte les mêmes champs. Mais il en gardait le titre (« ➕ Ajouter une
         étape »), le bouton (« Ajouter cette étape ») et le sélecteur « insérer
         dans l'itinéraire », qui n'a aucun sens sur une étape déjà placée.
         RoadTrip affiche « ✏️ Modifier l'étape » et « Enregistrer »
         (index.html:1316, editStageFlow). On s'aligne.
         ⚠️ NE PAS MASQUER LE PARENT du <select> : il est un frère direct dans la
         carte, et masquer son parentNode masque TOUTE LA FENÊTRE — elle s'ouvre
         alors vide, l'écran s'assombrit et rien n'apparaît. */
      if (v && v.index != null) {
        var _t = m.querySelector("h3");
        if (_t) _t.textContent = L("titre.modifier");
        var _ok = document.getElementById("bet-ok");
        if (_ok) _ok.textContent = L("valider.modifier");
        var _ou = document.getElementById("bet-ou");
        if (_ou) {
          _ou.style.display = "none";
          var _lbl = _ou.previousElementSibling;
          if (_lbl && _lbl.className === "bet-l") _lbl.style.display = "none";
        }
      }
      if (v) {
        var q = function (id) { return document.getElementById(id); };
        if (v.nom) q("bet-nom").value = v.nom;
        if (v.note) q("bet-note").value = v.note;
        if (v.arrivee) q("bet-arr").value = v.arrivee;
        if (v.depart) q("bet-dep").value = v.depart;
        if (v.heure) q("bet-h").value = v.heure;
        if (POS) q("bet-pos").textContent = "📍 " + (ADRESSE || (POS[1].toFixed(4) + ", " + POS[0].toFixed(4)));
      }
      m.style.display = "flex";
      function fermer(annule) {
        m.style.display = "none"; m.remove();
        /* On PRÉVIENT l'hôte d'un renoncement. Renoncer à la toute première
           étape d'un voyage qu'on vient de nommer, c'est renoncer au voyage :
           sans ce signal, l'hôte gardait une fiche vide dans la liste. */
        if (annule === true) try {
          document.dispatchEvent(new CustomEvent("the:etape:annule",
            { detail: { premiere: !!opts.premiere } }));
        } catch (e) {}
      }
      m.addEventListener("click", function (e) { if (e.target === m) fermer(true); });
      document.getElementById("bet-non").onclick = function () { fermer(true); };
      document.getElementById("bet-go-q").onclick = chercher;
      document.getElementById("bet-q").addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); chercher(); }
      });
      document.getElementById("bet-gps").onclick = gps;
      /* Raccourcis de date : on note souvent une étape le soir, ou le lendemain. */
      [].forEach.call(m.querySelectorAll("[data-j]"), function (b) {
        b.onclick = function () {
          var d = new Date(); d.setDate(d.getDate() - parseInt(b.getAttribute("data-j"), 10));
          document.getElementById("bet-arr").value = jour(d);
        };
      });
      /* Où placer l'étape. L'hôte nous passe la liste ; la brique n'en sait rien
         d'autre et ne décide pas à sa place. Par défaut : à la fin. */
      var sel = document.getElementById("bet-ou");
      var etapes = opts.etapes || [];
      function opt(v, t) { var o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); }
      opt("-1", L("inserer.debut"));
      etapes.forEach(function (e, i) {
        opt(String(i), (L("inserer.apres") || "").split("{n}").join(e && e.nom ? e.nom : "?"));
      });
      if (!etapes.length) { sel.innerHTML = ""; opt("-1", L("inserer.fin")); }
      /* Une position peut être IMPOSÉE par l'appelant : « ajouter ici », entre
         deux étapes, ou « une visite depuis celle-ci ». Sans cela l'écran
         proposait toujours la fin, et le geste précis était perdu. */
      sel.value = (opts.apres != null && !isNaN(opts.apres))
        ? String(opts.apres)
        : (etapes.length ? String(etapes.length - 1) : "-1");
      document.getElementById("bet-ok").onclick = function () {
        /* CE QUI MANQUE DOIT SE VOIR. Le refus s'écrivait en gris, au milieu du
           reste : on croyait à un bouton mort. Le champ fautif passe en rouge et
           l'écran s'y déplace. La DATE, elle, n'a jamais été obligatoire — seule
           la position l'est, sans elle il n'y a rien à poser sur la carte. */
        var _pos = document.getElementById("bet-pos");
        if (!POS) { _pos.textContent = L("manque.position"); erreur(_pos, true); return; }
        erreur(_pos, false);
        var nom = (document.getElementById("bet-nom").value || "").trim() || ADRESSE.split(",")[0] || L("nom");
        var detail = {
          nom: nom.slice(0, 90),
          note: (document.getElementById("bet-note").value || "").trim(),
          coord: POS,
          adresse: ADRESSE,
          arrivee: document.getElementById("bet-arr").value || "",
          depart: document.getElementById("bet-dep").value || "",
          heure: document.getElementById("bet-h").value || ""
        };
        detail.apres = parseInt((document.getElementById("bet-ou") || {}).value, 10);
        if (isNaN(detail.apres)) detail.apres = -1;
        if (v && v.index != null) detail.index = v.index;   // correction d'une étape existante
        fermer();
        document.dispatchEvent(new CustomEvent("the:etape", { detail: detail }));
      };
    });
  }

  window.THEetape = { ouvrir: ouvrir };
})();
