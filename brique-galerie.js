/* ============================================================
   BRIQUE « Galerie »  (auto-portée STRICTE, générique, réutilisable)
   ------------------------------------------------------------
   Moteur GÉNÉRIQUE d'une galerie illustrée sourcée : une suite de
   cartes { image + crédit, titre, rôle, texte, source }, précédée
   d'un en-tête (titre / sous-titre / intro / avertissement) et d'un
   ORNEMENT optionnel. Sert n'importe quel THÈME sans changer le code —
   seule la DONNÉE change (cosmologie, joaillerie, …).

   • AUTO-PORTÉE au sens STRICT : le .js ne contient AUCUN contenu, AUCUNE
     langue, AUCUN ornement, AUCUN nom de pays. Tout vient de la donnée
     pointée par l'ancrage. AUCUNE dépendance à l'hôte : ni the-i18n.js,
     ni i18n/<lang>.json, ni sites.geojson, ni HConf.
   • Ne lit de l'hôte QUE la préférence de langue (localStorage
     'the_lang') ; puis pioche dans la donnée. Langue absente → repli
     ANGLAIS (pivot).
   • ORNEMENT 100 % piloté par la donnée (_config.frise = {texte, font,
     family}). Frise absente → aucun ornement. Chaque thème/édition met
     la sienne — ou rien (ex. pas de runes sur une édition non-nordique).

   Ancrage (la donnée est choisie par data-src) :
     <section data-brique="galerie" data-src="brique-<theme>.data.json"></section>
   ============================================================ */
(function () {
  "use strict";

  function cur() { try { return localStorage.getItem("the_lang") || ""; } catch (e) { return ""; } }
  function pick(o) {
    if (o == null) return "";
    if (typeof o === "string") return o;
    var l = cur();
    if (l && o[l] != null) return o[l];
    if (o.en != null) return o.en;
    for (var k in o) if (o[k] != null) return o[k];
    return "";
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  var CSS =
    ".gal-wrap{max-width:760px;margin:0 auto;}" +
    ".gal-head{margin:4px 0 6px;}" +
    ".gal-head h2{margin:0;font-size:24px;line-height:1.2;}" +
    ".gal-head .gal-sub{display:block;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a6fb0;font-weight:600;margin-bottom:8px;}" +
    ".gal-intro{font-size:16px;line-height:1.6;color:#33271c;margin:0 0 12px;}" +
    ".gal-avert{background:#f3eefb;border-left:3px solid #8a6fb0;padding:10px 13px;border-radius:8px;" +
      "font-size:13px;line-height:1.55;color:#4a3d5a;font-style:italic;margin:0 0 12px;}" +
    ".gal-frame{border:1px solid #d8c8a6;border-radius:14px;padding:16px 18px 10px;" +
      "background:linear-gradient(#fffdf8,#f8f1e2);margin:0 0 20px;}" +
    ".gal-frise{text-align:center;color:#a8884f;opacity:.6;font-size:15px;letter-spacing:.3em;" +
      "line-height:1;white-space:nowrap;overflow:hidden;}" +
    ".gal-frame .gal-frise.top{margin-bottom:12px;}.gal-frame .gal-frise.bot{margin-top:12px;}" +
    ".gal-card{background:#fff;border:1px solid #e7ddc9;border-radius:12px;overflow:hidden;margin:0 0 18px;" +
      "box-shadow:0 1px 4px rgba(43,35,24,.06);}" +
    ".gal-card figure{margin:0;}" +
    ".gal-card img{display:block;width:100%;height:auto;background:#2b2318;}" +
    ".gal-card figcaption{font-size:11px;color:#8a7c9a;padding:4px 13px 0;font-style:italic;}" +
    ".gal-card figcaption a{color:#8a7c9a;}" +
    ".gal-body{padding:11px 15px 15px;}" +
    ".gal-body h3{margin:0;font-size:20px;line-height:1.15;}" +
    ".gal-body .gal-role{display:block;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#b08a3a;font-weight:600;margin:2px 0 8px;}" +
    ".gal-body p{margin:0;font-size:15.5px;line-height:1.6;color:#33271c;}" +
    ".gal-body .gal-src{display:block;margin-top:8px;font-size:11.5px;color:#9a8f7a;font-style:italic;}";
  var styled = false;
  function ensureStyle() {
    if (styled) return; styled = true;
    var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s);
  }
  // Police d'ornement fournie PAR LA DONNÉE (aucune police codée en dur ici).
  var fontsDone = {};
  function ensureFriseFont(frise) {
    if (!frise || !frise.font || !frise.family || fontsDone[frise.family]) return;
    fontsDone[frise.family] = 1;
    var fmt = /\.woff2(\?|$)/i.test(frise.font) ? "woff2" : /\.woff(\?|$)/i.test(frise.font) ? "woff" : "truetype";
    var s = document.createElement("style");
    s.textContent = '@font-face{font-family:"' + frise.family + '";font-display:swap;' +
      'src:url("' + frise.font + '") format("' + fmt + '");}';
    document.head.appendChild(s);
  }

  // Donnée chargée par SOURCE (data-src), en cache.
  var CACHE = {};
  function load(src) {
    if (CACHE[src] && CACHE[src].then) return CACHE[src];
    if (CACHE[src]) return Promise.resolve(CACHE[src]);
    var p = fetch(src).then(function (r) { return r.json(); })
      .then(function (j) { CACHE[src] = j || {}; return CACHE[src]; })
      .catch(function () { CACHE[src] = {}; return CACHE[src]; });
    CACHE[src] = p; return p;
  }

  function cardHTML(m, L) {
    var nom = esc(pick(m.nom)), role = esc(pick(m.sous)), txt = esc(pick(m.texte));
    var src = pick(m.source);
    var cap = "";
    if (m.image) {
      var who = esc(m.credit || ""), lic = esc(m.license || pick(L.domaine) || "");
      var line = esc(pick(L.image)) + " : " + who + (lic ? " — " + lic : "");
      cap = m.credit_url
        ? '<a href="' + esc(m.credit_url) + '" target="_blank" rel="noopener">' + line + "</a>"
        : line;
    }
    return '<div class="gal-card">' +
      (m.image
        ? '<figure><img loading="lazy" src="' + esc(m.image) + '" alt="' + nom + '">' +
          (cap ? '<figcaption>' + cap + "</figcaption>" : "") + "</figure>"
        : "") +
      '<div class="gal-body">' +
        "<h3>" + nom + "</h3>" +
        (role ? '<span class="gal-role">' + role + "</span>" : "") +
        "<p>" + txt + "</p>" +
        (src ? '<span class="gal-src">' + esc(pick(L.sources)) + " : " + esc(src) + "</span>" : "") +
      "</div></div>";
  }

  function render(anchor) {
    if (anchor.getAttribute("data-gal-done") === "1") return;
    var src = anchor.getAttribute("data-src");
    if (!src) return;                                   // sans donnée → ne fait rien
    anchor.setAttribute("data-gal-done", "1");
    load(src).then(function (d) {
      var L = d.labels || {}, items = d.items || d.mondes || [];
      if (!items.length) return;                        // rien → reste vide (self-hide)
      ensureStyle();

      var frise = (d._config && d._config.frise) || null;
      var hasFrise = !!(frise && frise.texte);
      if (hasFrise) ensureFriseFont(frise);
      var famStyle = (hasFrise && frise.family) ? ' style="font-family:\'' + frise.family + "',serif\"" : "";
      function band(pos) {
        return hasFrise
          ? '<div class="gal-frise ' + pos + '" aria-hidden="true"' + famStyle + ">" + esc(frise.texte) + "</div>"
          : "";
      }

      var headInner =
        '<div class="gal-head">' +
          (pick(L.sous) ? '<span class="gal-sub">' + esc(pick(L.sous)) + "</span>" : "") +
          "<h2>" + esc(pick(L.titre)) + "</h2></div>" +
        (pick(L.intro) ? '<p class="gal-intro">' + esc(pick(L.intro)) + "</p>" : "") +
        (pick(L.avert) ? '<p class="gal-avert">' + esc(pick(L.avert)) + "</p>" : "");
      var head = hasFrise
        ? '<div class="gal-frame">' + band("top") + headInner + band("bot") + "</div>"
        : headInner;

      var html = '<div class="gal-wrap">' + head;
      for (var i = 0; i < items.length; i++) html += cardHTML(items[i], L);
      html += "</div>";
      anchor.innerHTML = html;
    });
  }

  function scan(root) {
    (root || document).querySelectorAll &&
      (root || document).querySelectorAll('[data-brique="galerie"]').forEach(render);
  }
  function boot() { scan(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.BriqueGalerie = { render: function () { scan(document); } };
})();
