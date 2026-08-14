/* ============================================================
   BRIQUE SOCLE — « Visite guidée » (onboarding)   (auto-portée STRICTE)
   ------------------------------------------------------------
   Au 1er lancement, présente les fonctions clés de l'app en quelques
   étapes guidées, avec projecteur sur l'élément concerné, indicateur
   de progression, et un bouton « Y aller » qui saute à la fonction.

   • AUTO-PORTÉE STRICTE (règle 4.11) : embarque TOUTE sa machinerie et
     ses styles. TOUT le texte — libellés d'UI (`labels`) ET contenu des
     étapes (`steps`) — vit dans SA donnée `brique-tour.data.json`, par
     édition (fr + en + nationale). Le CODE est GÉNÉRIQUE et IDENTIQUE
     partout : ajouter une langue = éditer SA donnée, jamais le .js.
   • N'emprunte RIEN à l'hôte : ni the-i18n.js, ni i18n/<lang>.json, ni
     HConf. Ne lit de l'hôte QUE la préférence de langue (localStorage
     'the_lang') → repli ANGLAIS (pivot).
   • DYNAMIQUE : une étape à cible n'apparaît que si l'hôte a opté-in en
     posant <… data-tour-step="<id>"> ; sinon elle est sautée. Les étapes
     `always` (accueil/fin) sont toujours affichées.
   • Contact hôte = ANCRAGES SEULS :
       - entrée / relance : <… data-brique="tour"> (la brique remplit son
         libellé dans [data-bt-label]/[data-bt-sub] et câble le clic) ;
       - cibles : <… data-tour-step="<id>"> (la brique ne connaît AUCUN
         sélecteur de l'hôte) ;
       - sortie « Y aller › » = .click() sur la cible → lien de l'hôte.
         Dégradation propre si une cible manque.
   • Ne se lance qu'une fois (localStorage h_tour_done). Respecte
     prefers-reduced-motion. Mise à jour = remplacer SES fichiers.
   ============================================================ */
(function () {
  "use strict";

  // Auto-lancement PAR LANGUE : la 1re fois dans CHAQUE langue (fr, en, nationale),
  // pas une seule fois pour toujours. Clé suffixée par la langue courante.
  function doneKey() { return "h_tour_done_" + (cur() || "fr"); }
  var reduce = false;
  try { reduce = window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches; } catch (e) {}

  function cur() { try { return localStorage.getItem("the_lang") || ""; } catch (e) { return ""; } }
  var RTL = { ar:1, he:1, fa:1, ur:1, arc:1, syr:1 };   // écriture droite-à-gauche
  function pick(o) {
    if (!o) return "";
    var l = cur();
    if (l && o[l] != null) return o[l];
    if (o.en != null) return o.en;
    if (o.fr != null) return o.fr;
    for (var k in o) if (o[k] != null) return o[k];
    return "";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* --- données À ELLE : libellés + étapes (chargées une fois) --------- */
  var STEPS = null, LABELS = {}, LOADING = null, CONFIG = {};
  function load() {
    if (STEPS) return Promise.resolve(STEPS);
    if (LOADING) return LOADING;
    LOADING = fetch("brique-tour.data.json")
      .then(function (r) { return r.json(); })
      .then(function (j) { STEPS = (j && j.steps) || []; LABELS = (j && j.labels) || {}; CONFIG = (j && j._config) || {}; return STEPS; })
      .catch(function () { STEPS = []; return STEPS; });
    return LOADING;
  }
  function L(k, vars) {                                  // libellé d'UI depuis SA donnée
    var s = pick(LABELS[k]);
    if (vars) for (var p in vars) s = s.split("{" + p + "}").join(vars[p]);
    return s;
  }

  /* --- Styles À ELLE (injectés une fois) ------------------------------ */
  function injectCSS() {
    if (document.getElementById("htour-css")) return;
    var css =
      ".htour-catch{position:fixed;inset:0;z-index:99990;background:rgba(20,15,10,.82);" +
      (reduce ? "" : "animation:htour-fade .2s ease both;") + "}" +
      // Spot : le halo (box-shadow 9999px) est le SEUL assombrisseur quand une cible existe
      // (le catch passe en transparent) → la cible est pleinement éclairée, pas grisée.
      ".htour-spot{position:fixed;z-index:99991;border-radius:12px;pointer-events:none;" +
      "box-shadow:0 0 0 9999px rgba(18,13,8,.82),0 0 0 3px rgba(255,250,235,.95),0 0 0 6px #c9ad79,0 0 34px 9px rgba(240,200,120,.6);" +
      (reduce ? "" : "transition:top .25s ease,left .25s ease,width .25s ease,height .25s ease;") + "}" +
      ".htour-spot::after{content:'';position:absolute;inset:-5px;border-radius:16px;border:2px solid rgba(240,205,125,.9);" +
      (reduce ? "" : "animation:htour-pulse 1.6s ease-out infinite;") + "}" +
      ".htour-card{position:fixed;z-index:99993;left:50%;transform:translateX(-50%);" +
      "width:min(420px,calc(100vw - 28px));background:#fffdf8;color:#2b2318;border-radius:14px;" +
      "box-shadow:0 18px 50px rgba(20,15,10,.5);padding:18px 18px 15px;" +
      "font-family:'EB Garamond',Georgia,serif;" + (reduce ? "" : "animation:htour-pop .22s ease both;") + "}" +
      ".htour-card.bottom{bottom:calc(18px + env(safe-area-inset-bottom));}" +
      ".htour-card.top{top:calc(18px + env(safe-area-inset-top));}" +
      ".htour-hd{display:flex;align-items:center;gap:10px;margin-bottom:8px;}" +
      ".htour-ic{font-size:26px;line-height:1;flex:0 0 auto;}" +
      ".htour-tt{font-family:'Cormorant Garamond',serif;font-weight:700;font-size:22px;line-height:1.08;margin:0;}" +
      ".htour-bd{font-size:15.5px;line-height:1.5;color:#3a3023;margin:0 0 14px;}" +
      ".htour-dots{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px;}" +
      ".htour-dots i{width:8px;height:8px;border-radius:50%;background:#e3d8c4;cursor:pointer;transition:background .15s,transform .15s;}" +
      ".htour-dots i.on{background:#a8884f;transform:scale(1.25);}" +
      ".htour-dots i.seen{background:#c9ad79;}" +
      ".htour-ft{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}" +
      ".htour-count{font-size:12.5px;color:#8a7c66;font-style:italic;flex:1;min-width:70px;}" +
      ".htour-btn{appearance:none;-webkit-appearance:none;font-family:inherit;cursor:pointer;" +
      "border-radius:8px;padding:9px 15px;font-size:14.5px;letter-spacing:.4px;border:1px solid #e3d8c4;" +
      "background:#f6f0e4;color:#2b2318;transition:filter .15s,background .15s;}" +
      ".htour-btn:hover{background:#efe6d4;}" +
      ".htour-btn.prim{background:#a8884f;color:#2b2318;border-color:#a8884f;font-weight:700;}" +
      ".htour-btn.prim:hover{filter:brightness(1.05);}" +
      ".htour-btn.go{background:#26201a;color:#f6f0e4;border-color:#26201a;}" +
      ".htour-btn.go:hover{filter:brightness(1.15);}" +
      ".htour-btn.ic{padding:9px 11px;font-size:15px;line-height:1;}" +
      ".htour-skip{background:none;border:none;color:#8a7c66;font-family:inherit;font-size:13px;" +
      "cursor:pointer;text-decoration:underline;padding:4px 2px;}" +
      ".htour-skip:hover{color:#2b2318;}" +
      ".htour-skwrap{text-align:center;margin-top:9px;}" +
      "@keyframes htour-fade{from{opacity:0;}to{opacity:1;}}" +
      "@keyframes htour-pop{from{opacity:0;}to{opacity:1;}}" +
      "@keyframes htour-pulse{0%{transform:scale(1);opacity:.9;}70%{transform:scale(1.06);opacity:0;}100%{opacity:0;}}";
    var st = document.createElement("style");
    st.id = "htour-css"; st.textContent = css;
    document.head.appendChild(st);
  }

  /* --- État du parcours ---------------------------------------------- */
  var steps = [], cur2 = 0, catchEl = null, spotEl = null, cardEl = null, onResize = null;

  function targetOf(s) { return s && !s.always ? document.querySelector('[data-tour-step="' + s.id + '"]') : null; }
  function buildSteps() {
    steps = (STEPS || []).filter(function (s) { return s.always || document.querySelector('[data-tour-step="' + s.id + '"]'); });
  }

  function teardown() {
    if (onResize) {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      onResize = null;
    }
    [catchEl, spotEl, cardEl].forEach(function (el) { if (el && el.parentNode) el.parentNode.removeChild(el); });
    catchEl = spotEl = cardEl = null;
  }
  function finish() {
    teardown();
    try { localStorage.setItem(doneKey(), "1"); } catch (e) {}
  }

  function positionSpot(el) {
    var r = el.getBoundingClientRect(), pad = 9;
    spotEl.style.top = (r.top - pad) + "px";
    spotEl.style.left = (r.left - pad) + "px";
    spotEl.style.width = (r.width + pad * 2) + "px";
    spotEl.style.height = (r.height + pad * 2) + "px";
    spotEl.style.display = "";
    var lowerHalf = (r.top + r.height / 2) > (window.innerHeight / 2);
    cardEl.classList.toggle("top", lowerHalf);
    cardEl.classList.toggle("bottom", !lowerHalf);
  }

  function render() {
    var s = steps[cur2];
    var target = targetOf(s);

    if (target) {
      try { target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); } catch (e) { try { target.scrollIntoView(); } catch (e2) {} }
      if (catchEl) catchEl.style.background = "transparent"; // le halo du spot fait seul l'assombrissement → cible pleinement éclairée
      cardEl.style.top = ""; cardEl.style.bottom = ""; cardEl.style.transform = "";
      positionSpot(target);
    } else {
      if (catchEl) catchEl.style.background = "rgba(18,13,8,.82)"; // pas de cible → voile plein écran pour la carte centrée
      spotEl.style.display = "none";
      cardEl.classList.remove("top", "bottom");
      cardEl.style.top = "50%"; cardEl.style.bottom = "auto"; cardEl.style.transform = "translate(-50%,-50%)";
    }

    var last = (cur2 === steps.length - 1);
    var dots = steps.map(function (_, i) {
      return '<i class="' + (i === cur2 ? "on" : (i < cur2 ? "seen" : "")) + '" data-i="' + i + '"></i>';
    }).join("");

    cardEl.innerHTML =
      '<div class="htour-hd"><span class="htour-ic">' + (s.icon || "•") + '</span>' +
      '<h3 class="htour-tt">' + esc(pick(s.title)) + '</h3></div>' +
      '<p class="htour-bd">' + esc(pick(s.body)) + '</p>' +
      '<div class="htour-dots">' + dots + '</div>' +
      '<div class="htour-ft">' +
        '<span class="htour-count">' + esc(L("stepOf", { n: cur2 + 1, total: steps.length })) + '</span>' +
        (target ? '<button class="htour-btn go" data-act="goto">' + esc(L("goto")) + '</button>' : '') +
        (cur2 > 0 ? '<button class="htour-btn" data-act="prev">' + esc(L("prev")) + '</button>' : '') +
        '<button class="htour-btn prim" data-act="next">' + esc(last ? L("done") : L("next")) + '</button>' +
      '</div>' +
      (last ? '' : '<div class="htour-skwrap"><button class="htour-skip" data-act="skip">' + esc(L("skip")) + '</button></div>');

    cardEl.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.getAttribute("data-act");
        if (a === "prev") go(cur2 - 1);
        else if (a === "skip") finish();
        else if (a === "goto") { finish(); try { target.click(); } catch (e) {} }
        else { if (last) finish(); else go(cur2 + 1); }
      });
    });
    cardEl.querySelectorAll(".htour-dots i").forEach(function (d) {
      d.addEventListener("click", function () { go(parseInt(d.getAttribute("data-i"), 10)); });
    });
  }

  function go(i) { if (i < 0 || i >= steps.length) return; cur2 = i; render(); }

  /* Voix débranchée (visuel seul) — avance à la main (boutons/pastilles).
     Les MP3 restent sur le serveur ; on pourra rebrancher plus tard. */

  function _start() {
    injectCSS();
    buildSteps();
    if (!steps.length) return;
    teardown();
    cur2 = 0;
    catchEl = document.createElement("div"); catchEl.className = "htour-catch";
    spotEl  = document.createElement("div"); spotEl.className  = "htour-spot"; spotEl.style.display = "none";
    cardEl  = document.createElement("div"); cardEl.className  = "htour-card bottom"; cardEl.dir = RTL[cur()] ? "rtl" : "ltr";
    document.body.appendChild(catchEl);
    document.body.appendChild(spotEl);
    document.body.appendChild(cardEl);
    catchEl.addEventListener("click", function (e) { e.stopPropagation(); });
    onResize = function () { var t = targetOf(steps[cur2]); if (t) positionSpot(t); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    render();
  }
  function start() { return load().then(_start); }

  /* --- Point d'entrée / relance : <… data-brique="tour"> -------------- */
  function fillEntry() {
    var els = document.querySelectorAll('[data-brique="tour"]');
    if (!els.length) return;
    load().then(function () {
      [].forEach.call(els, function (a) {
        if (a.getAttribute("data-bt-done")) return;
        a.setAttribute("data-bt-done", "1");
        var lab = a.querySelector("[data-bt-label]"), sub = a.querySelector("[data-bt-sub]");
        if (lab) lab.textContent = L("menuLabel"); else if (!a.textContent.replace(/\s/g, "")) a.textContent = L("menuLabel");
        if (sub) sub.textContent = L("menuSub");
        a.addEventListener("click", function (e) { e.preventDefault(); start(); });
      });
    });
  }

  /* --- Auto-lancement au 1er passage ---------------------------------- */
  function autoStart() {
    var done = false;
    try { done = !!localStorage.getItem(doneKey()); } catch (e) {}
    if (done) return;
    load().then(function () { buildSteps(); if (steps.length) setTimeout(_start, 350); });
  }

  function init() { fillEntry(); autoStart(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  /* --- API publique --------------------------------------------------- */
  window.HTour = {
    start: start,
    available: function () { return load().then(function () { buildSteps(); return steps.length > 0; }); },
    reset: function () { try { ["fr","en","de","it","ar","pt","hr","cs","ga","et"].forEach(function (l) { localStorage.removeItem("h_tour_done_" + l); }); localStorage.removeItem("h_tour_done"); } catch (e) {} },
    seen: function () { try { return !!localStorage.getItem(doneKey()); } catch (e) { return false; } }
  };
})();
