/* ============================================================
   HERITAGE — CONFIG UNIQUE PAR PAYS  (MODÈLE / SOCLE)
   ------------------------------------------------------------
   Pour créer une nouvelle édition : copier le SOCLE, puis
   n'éditer QUE ce fichier (+ déposer les données du pays).
   Tout le reste du code est 100 % générique — RIEN d'autre à toucher.
   Chargé en TOUT PREMIER dans le <head> (avant the-i18n.js et les inline).
   - expose window.HConf (iso, carte, marque, export, checkout…)
   - réécrit canonical / meta app / titre / balise Cloudflare au chargement
   - génère le manifest PWA et <html lang> dynamiquement
   ============================================================ */
(function () {
  var C = {
    iso:          "no",   // code ISO pays, ex. "ee" (Estonie), "pt" (Portugal) — À REMPLIR
    domaine:      "norway-heritage.threshold-analytics.com",   // ex. "pays-heritage.threshold-analytics.com" — À REMPLIR
    marque:       "Norway Heritage Experience",   // ex. "Portugal Heritage Experience" — À REMPLIR
    marqueCourte: "Norway Heritage",   // ex. "Portugal Heritage" — À REMPLIR
    marqueMark:   "Norway&nbsp;Heritage<br>Experience",   // marque du LOGO (HTML, <br> permis), LIBRE — ex. "Estonia&nbsp;Heritage<br>Experience"
                        // ou "Trésors du Québec" (⚠️ 'Heritage' peut être déjà pris sur l'App Store)
    monogram:     "NHE",   // monogramme court du logo (data-brand-mono), ex. "THE", "PHE" — vide = slot non utilisé
    carte: { lat: 64.5, lon: 12.0, zoom: 4 },   // centre + zoom carte du pays — À REMPLIR
    cloudflare:   "",   // token Cloudflare Web Analytics du domaine (vide = désactivé)
    exportNom:    "Norway-Heritage",   // préfixe des fichiers exportés, ex. "Portugal-Heritage" — À REMPLIR
    checkout:     "",   // URL abonnement (Lemon Squeezy…) — vide = pas de mur payant
    tip:          "",   // URL pourboire/soutien — vide = pas de bouton
    appStore:     "",   // lien App Store (badge du pied de page) — vide = masqué
    appStoreId:   "",   // id numérique App Store (deep-link go.html), ex. "6785249427" — vide = pas de redirection store
    playStore:    "",   // lien Google Play (badge du pied de page) — vide = masqué
    support:      "contact@threshold-analytics.com",   // e-mail contact/signalement (briques contact/note) — vide = brique masquée
    description:  "Découvrir le patrimoine de la Norvège : sites historiques, fjords, art rupestre et héritage viking, hors-ligne.",   // phrase PWA/SEO, ex. "Découvrir le patrimoine du Portugal…" — À REMPLIR
    // --- noms interpolés dans l'interface (ui.*.json) — PAR LANGUE ------------
    pays: { fr: "Norvège", en: "Norway", nb: "Norge" },   // nom du pays par langue, ex. {fr:"Portugal", en:"Portugal"} — À REMPLIR
    paysLe:       { fr: "la Norvège", en: "Norway", nb: "Norge" },   // nom AVEC article (token __LE_PAYS__) : "le Portugal" / "la Croatie" / "l'Italie"
    langueNat: { fr: "Norvégien", en: "Norwegian" },   // nom de la langue nationale par langue, ex. {fr:"Portugais", en:"Portuguese"}
    langNatCode:  "nb",   // CODE de la langue nationale (ISO) pour le sélecteur/drapeau — À REMPLIR.
                        // Souvent = iso, MAIS pas toujours : Irlande iso"ie"→"ga", Tchéquie iso"cz"→"cs".
                        // ex. "pt","it","hr","cs","ga". Vide = pas de 3ᵉ langue (FR/EN seulement).
    endonyme:     "Norge",   // nom natif (constant), ex. "Eesti" (Estonie), "Portugal"
    paysDe:       "de Norvège",   // contraction FR correcte (du/de/d') — repli auto « de <pays> »
    // --- Android (assetlinks.json) — package dérivable de l'iso ; empreintes = EXTERNES -------
    androidPackage:      "",   // ex. com.thresholdanalytics.heritage.<iso> (sinon dérivé de iso)
    androidFingerprints: [],   // 2 empreintes SHA-256 de signature (PWABuilder + Play) — SEULES valeurs externes

    // --- THÈMES DU PAYS (filtres de liste.html et itineraire.html) ------------
    // Règle de la gamme : chaque édition DÉRIVE ses thèmes de SON champ rempli.
    // Ici le champ rempli est `type` (référence FR, 255 valeurs) ; `kw` sont des
    // fragments cherchés dans ce champ normalisé (sans accents, minuscules).
    // `id` reprend le slug du tableau `themes` du géojson quand il existe : un site
    // matche s'il porte le slug OU si son `type` contient un mot-clé.
    // `pri` tranche les types composés (le plus petit gagne) — un site = UN thème.
    // Les thèmes TRANSVERSAUX (musée, marché, festival, nature, légende, gastronomie)
    // restent dans le code générique : ils ne dépendent pas du pays.
    // Seuil d'affichage : ≥3 sites (themeViable), appliqué par le code.
    themes: [
      {id:'art-rupestre',   ic:'🪨', label:'theme.art.rupestre',   pri:1, kw:['rupestre','petroglyphe']},
      {id:'vikings',        ic:'🛡️', label:'theme.vikings',        pri:2, kw:[]},
      {id:'eglises',        ic:'⛪', label:'theme.eglises',        pri:3, kw:['religieu','eglise','presbytere','manse','stavkirke','cathedrale','culte','chapelle','monastere','abbaye']},
      {id:'sepultures',     ic:'⚱️', label:'theme.sepultures',     pri:4, kw:['funeraire','tumulus','cimetiere','sepulture','tombe','necropole','fosse commune']},
      {id:'memoire',        ic:'🗿', label:'theme.memoire',        pri:5, kw:['commemorat','memorial','pierre runique','menhir','obelisque','pierres de marquage','stele']},
      {id:'fortifications', ic:'🏰', label:'theme.fortifications', pri:6, kw:['fortification','fort','forteresse','bastion','militaire','caserne','batterie']},
      {id:'cotes-mer',      ic:'⚓', label:'theme.cotes.mer',      pri:7, kw:['phare','balise','navire','quai','maritime','chantier naval']},
      {id:'industrie',      ic:'⚙️', label:'theme.industrie',      pri:8, kw:['carriere','moulin','scierie','barrage','centrale','usine','mine','fonderie','industriel','forge','tuilerie','brasserie']},
      {id:'fermes-alpages', ic:'🏡', label:'theme.fermes.alpages', pri:9, kw:['ferme','alpage','khoutor','metayer','grange','etable']},
      // couche NATURE / PLEIN AIR (sites-nature.geojson) — le « friluftsliv » norvégien
      {id:'espaces-proteges',  ic:'🌿', label:'theme.espaces.proteges',  pri:10, kw:['parc national','reserve naturelle','aire protegee','reserve ornithologique']},
      {id:'cascades-glaciers', ic:'💧', label:'theme.cascades.glaciers', pri:11, kw:['cascade','glacier']},
      {id:'randonnee',         ic:'🥾', label:'theme.randonnee',         pri:12, kw:['refuge','cabane de montagne','itineraire de randonnee','depart de sentier','sommet']},
      {id:'panoramas',         ic:'🔭', label:'theme.panoramas',         pri:13, kw:['point de vue','belvedere']}
    ]
  };
  window.HConf = C;

  try {
    // 1) canonical → https://<domaine>/<page>
    var page = (location.pathname.split("/").pop() || "");
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    if (C.domaine) link.href = "https://" + C.domaine + "/" + page;

    // 2) titre d'app iOS (apple-mobile-web-app-title) → marque courte
    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!at) { at = document.createElement("meta"); at.setAttribute("name", "apple-mobile-web-app-title"); document.head.appendChild(at); }
    at.setAttribute("content", C.marqueCourte);

    // 3) pc-brand (marque interne) → marque courte
    var pb = document.querySelector('meta[name="pc-brand"]');
    if (!pb) { pb = document.createElement("meta"); pb.setAttribute("name", "pc-brand"); document.head.appendChild(pb); }
    pb.setAttribute("content", C.marqueCourte);

    // 4) Cloudflare Web Analytics : géré par analytics.js (lit HConf.cloudflare). Rien ici.

    // 5) <html lang> = langue courante (générique, jamais en dur)
    var _lang = "fr"; try { _lang = localStorage.getItem("the_lang") || "fr"; } catch (e) {}
    document.documentElement.lang = _lang;

    // 6) manifest PWA DYNAMIQUE (depuis HConf) — plus de nom de pays dans manifest.json
    var mf = {
      name: C.marque, short_name: C.marqueCourte, description: C.description || "",
      id: "/?app=heritage", start_url: "bienvenue.html", scope: "./",
      display: "standalone", orientation: "portrait",
      background_color: "#2b2318", theme_color: "#2b2318", lang: _lang,
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "logo-the.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };
    var mfUrl = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: "application/manifest+json" }));
    var mfLink = document.querySelector('link[rel="manifest"]');
    if (!mfLink) { mfLink = document.createElement("link"); mfLink.rel = "manifest"; document.head.appendChild(mfLink); }
    mfLink.href = mfUrl;
  } catch (e) {}

  // 7) Marque affichée sur les pages CONFIG-ONLY (sans the-i18n : ex. go.html, splash).
  //    Les pages i18n normales utilisent les tokens (__MARQUE_MARK__ via the-i18n) ; ceci
  //    est le pont pour les stubs qui n'embarquent pas le moteur i18n. Repli NEUTRE en dur.
  function _fillBrand() {
    try {
      var el, i;
      el = document.querySelectorAll("[data-brand]");       for (i = 0; i < el.length; i++) el[i].textContent = C.marque;
      el = document.querySelectorAll("[data-brand-short]"); for (i = 0; i < el.length; i++) el[i].textContent = C.marqueCourte;
      el = document.querySelectorAll("[data-brand-mark]");  for (i = 0; i < el.length; i++) el[i].innerHTML  = C.marqueMark || C.marque;
      el = document.querySelectorAll("[data-brand-mono]");  for (i = 0; i < el.length; i++) { if (C.monogram) el[i].textContent = C.monogram; }
      var tt = document.querySelector("title[data-brand-title]"); if (tt) document.title = C.marque;
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _fillBrand);
  else _fillBrand();
})();
