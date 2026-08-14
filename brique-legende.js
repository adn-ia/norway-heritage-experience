/* ============================================================
   BRIQUE SOCLE — « Légende »   (auto-portée, i18n + données À ELLE)
   ------------------------------------------------------------
   Affiche, sous une fiche de lieu, une légende / un mythe / un
   événement historique attaché au site.

   • AUTO-PORTÉE au sens STRICT : embarque TOUT — son code, SA donnée
     (brique-legende.data.json), SES traductions, son mini-i18n de
     libellés. AUCUNE dépendance à l'hôte : ni the-i18n.js, ni
     i18n/<lang>.json, ni sites.geojson, ni HConf, ni le premium.
   • Ne lit de l'hôte QUE la préférence de langue (localStorage
     'the_lang') pour choisir, puis pioche dans SES dictionnaires.
   • S'INJECTE seule sur tout ancrage <… data-brique="legende"
     data-site="<nom du site>">. Se MASQUE (reste vide) si le site
     n'a pas de légende.
   • Contenu = données ; balises <b> autorisées. Langue = celle décidée
     par l'hôte (the_lang) ; si absente de la donnée → repli ANGLAIS (pivot).
   • Mise à jour : remplacer CE fichier (+ sa data), sans toucher
     aux autres briques ni à l'hôte.

   Point de contact hôte = UNIQUEMENT l'ancrage :
     <div data-brique="legende" data-site="Carthage"></div>
   ============================================================ */
(function () {
  "use strict";

  /* --- mini-i18n À ELLE (libellés seulement ; le texte = données) ---
     Générique : aucune langue « par défaut » codée en dur. On lit la
     préférence de langue de l'hôte (the_lang) puis on retombe en cascade
     (courante → en → fr → 1re dispo). Une édition peut étendre LBL avec
     ses propres langues sans toucher au reste. RTL listées à part. */
  var RTL = { ar:1, he:1, fa:1, ur:1, arc:1, syr:1, dv:1, ps:1 };
  var LBL = {
    titre:  { fr:"Légende", en:"Legend", de:"Legende", it:"Leggenda", ar:"حكاية" },
    sub:    { fr:"folklore · tradition", en:"folklore · tradition", de:"Folklore · Überlieferung", it:"folklore · tradizione", ar:"فولكلور · تقليد" },
    lock:   { fr:"Premium", en:"Premium", de:"Premium", it:"Premium", ar:"Premium" },
    source: { fr:"Source",  en:"Source", de:"Quelle",  it:"Fonte",    ar:"المصدر" }
  };
  /* OPTION À COCHER (dans la config de SA donnée, _config.premium) :
     - premium: false → légende GRATUITE (aucun contact hôte).
     - premium: true  → gating premium (SEUL point de contact optionnel avec
       l'hôte : THEPass.isActive). Repli neutre : pas de THEPass → visible. */
  var CONFIG = {};
  function full() {
    if (!CONFIG.premium) return true;                 // option décochée → gratuit
    try { return window.THEPass ? !!(THEPass.isActive && THEPass.isActive()) : true; }
    catch (e) { return true; }
  }
  function cur() {                                    // langue courante = préférence hôte (peut être vide)
    try { return localStorage.getItem("the_lang") || ""; } catch (e) { return ""; }
  }
  // Langue d'affichage = celle DÉCIDÉE PAR L'HÔTE (the_lang) si elle existe dans la donnée,
  // sinon repli sur l'ANGLAIS (pivot obligatoire). Résolue UNE fois → libellés ET texte
  // dans la MÊME langue (cohérence). Toute légende doit donc au moins exister en anglais.
  function langOf(rec) {
    if (!rec) return "";
    var l = cur();
    return (l && rec[l] != null) ? l : "en";
  }
  function T(k, dl) {                                  // libellé dans la langue d'affichage, repli anglais
    var d = LBL[k] || {};
    return (dl && d[dl] != null) ? d[dl] : (d.en != null ? d.en : "");
  }

  /* --- clé site = même normalisation que la gamme --- */
  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
  }

  /* --- styles À ELLE, injectés une fois --- */
  var CSS =
    ".bl-leg{background:#f3eefb;border-left:3px solid #8a6fb0;padding:10px 13px;border-radius:8px;margin:12px 0 4px;" +
      "font-family:inherit;font-size:15px;line-height:1.55;color:#33271c;}" +
    ".bl-leg .bl-lbl{display:block;font-size:11.5px;letter-spacing:2px;text-transform:uppercase;color:#8a6fb0;font-weight:600;margin:0 0 5px;}" +
    ".bl-leg p{margin:0;}" +
    ".bl-leg .bl-src{display:block;margin-top:7px;font-size:11.5px;color:#8a7c9a;font-style:italic;}" +
    ".bl-leg .bl-sub{font-size:11.5px;color:#8a7c9a;font-style:italic;}" +
    ".bl-leg.bl-lock{cursor:pointer;}" +
    ".bl-leg .bl-prem{color:#8a6fb0;font-weight:700;white-space:nowrap;}" +
    ".bl-leg[dir=rtl]{border-left:none;border-right:3px solid #8a6fb0;text-align:right;}";
  var styled = false;
  function ensureStyle() {
    if (styled) return; styled = true;
    var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
  }

  /* --- données À ELLE (chargées une fois) --- */
  var DATA = null, LOADING = null;
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (LOADING) return LOADING;
    LOADING = fetch("brique-legende.data.json")
      .then(function (r) { return r.json(); })
      .then(function (j) { DATA = (j && j.legendes) || {}; CONFIG = (j && j._config) || {}; return DATA; })
      .catch(function () { DATA = {}; return DATA; });
    return LOADING;
  }

  function esc(s) { return String(s == null ? "" : s); } // texte = données de confiance (balises <b> voulues)

  function blockHTML(rec) {
    if (!rec) return "";
    var dl = langOf(rec);
    var txt = rec[dl]; if (!txt) return "";
    var rtl = !!RTL[dl];
    if (full()) {
      var src = rec.src ? '<span class="bl-src">' + T("source", dl) + " : " + esc(rec.src) + "</span>" : "";
      return '<div class="bl-leg"' + (rtl ? ' dir="rtl"' : "") + '>' +
               '<span class="bl-lbl">🐉 ' + T("titre", dl) + "</span>" +
               "<p>" + esc(txt) + ' <span class="bl-sub">(' + T("sub", dl) + ")</span></p>" + src +
             "</div>";
    }
    // option premium cochée + non-abonné → teaser tronqué + verrou → premium.html (comme avant)
    var teaser = String(txt).replace(/<[^>]*>/g, "").slice(0, 55).trim();
    return '<div class="bl-leg bl-lock"' + (rtl ? ' dir="rtl"' : "") + " onclick=\"location.href='premium.html'\">" +
             '<span class="bl-lbl">🐉 ' + T("titre", dl) + "</span>" +
             "<p>" + esc(teaser) + '… <span class="bl-prem">🔒 ' + T("lock", dl) + "</span></p>" +
           "</div>";
  }

  function fill(anchor) {
    if (anchor.getAttribute("data-bl-done") === "1") return;
    anchor.setAttribute("data-bl-done", "1");
    var nom = anchor.getAttribute("data-site") || "";
    load().then(function (d) {
      var rec = d[norm(nom)];
      var html = blockHTML(rec);
      if (html) { ensureStyle(); anchor.innerHTML = html; }
      // sinon : reste vide (self-hide)
    });
  }

  function scan(root) {
    (root || document).querySelectorAll &&
      (root || document).querySelectorAll('[data-brique="legende"]').forEach(fill);
  }

  /* --- auto-injection : scan initial + observation des fiches ajoutées dynamiquement --- */
  function boot() {
    scan(document);
    try {
      var mo = new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          m.addedNodes && Array.prototype.forEach.call(m.addedNodes, function (n) {
            if (n.nodeType !== 1) return;
            if (n.matches && n.matches('[data-brique="legende"]')) fill(n);
            else scan(n);
          });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /* API optionnelle (si une page préfère appeler au lieu d'ancrer) */
  window.BriqueLegende = {
    html:    function (nom) { return load().then(function (d) { return blockHTML(d[norm(nom)]); }); },
    has:     function (nom) { return load().then(function (d) { return !!d[norm(nom)]; }); },
    hasSync: function (nom) { return !!(DATA && DATA[norm(nom)]); },   // sync : n'est vrai qu'après ready()
    ready:   function () { return load(); }                            // promesse résolue quand SA donnée est chargée
  };
})();
