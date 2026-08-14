/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — walkthrough (visite guidée) STRICTEMENT auto-porté.
   SON moteur, SA donnée (tour.data.json), SON i18n (patrimoine.tour.*).
   • Spotlight sur la cible + carte d'explication + contrôles ⏮ ⏭ ✕.
   • Langue = celle de la garde (the_lang via PATi18n). Rejouable.
   • VISUEL seul : on avance à la main (bouton › / flèches). (Voix débranchée —
     les MP3 restent sur le serveur, on pourra rebrancher plus tard.)
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  function T(k) { return window.PATi18n ? PATi18n.uiT(k) : k; }
  var STEPS = [], i = 0, over = null, hole = null, tip = null, loaded = false;
  var KEY = "pat_tour_v1";

  function load() {
    if (loaded) return Promise.resolve();
    return fetch("tour.data.json").then(function (r) { return r.json(); })
      .then(function (j) { STEPS = (j && j.steps) || []; loaded = true; })
      .catch(function () { STEPS = []; loaded = true; });
  }

  function ensureDom() {
    if (over) return;
    over = document.createElement("div"); over.className = "ptour"; over.hidden = true;
    over.innerHTML =
      '<div class="ptour-hole"></div>' +
      '<div class="ptour-tip" role="dialog" aria-modal="true">' +
        '<div class="ptour-step"></div>' +
        '<h3 class="ptour-t"></h3><p class="ptour-x"></p>' +
        '<div class="ptour-ctl">' +
          '<button class="ptour-b" data-a="prev" aria-label="précédent">‹</button>' +
          '<button class="ptour-b ptour-next" data-a="next" aria-label="suivant">›</button>' +
          '<button class="ptour-b ptour-close" data-a="close" aria-label="fermer">✕</button>' +
        '</div></div>';
    document.body.appendChild(over);
    hole = over.querySelector(".ptour-hole"); tip = over.querySelector(".ptour-tip");
    over.querySelectorAll("[data-a]").forEach(function (b) { b.addEventListener("click", function () { act(b.getAttribute("data-a")); }); });
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    document.addEventListener("keydown", function (e) {
      if (over.hidden) return;
      if (e.key === "Escape") stop();
      else if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
    });
  }

  function act(a) {
    if (a === "prev") go(i - 1);
    else if (a === "next") go(i + 1);
    else if (a === "close") stop();
  }

  function begin() { i = 0; over.hidden = false; document.documentElement.classList.add("ptour-on"); render(); }
  function start() {
    ensureDom();
    if (loaded && STEPS.length) begin();
    else load().then(function () { if (STEPS.length) begin(); });
  }
  function stop() {
    if (over) over.hidden = true;
    document.documentElement.classList.remove("ptour-on");
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  }
  function go(n) { if (n < 0) return; if (n >= STEPS.length) { stop(); return; } i = n; render(); }

  function render() {
    var s = STEPS[i];
    over.querySelector(".ptour-step").textContent = (i + 1) + " / " + STEPS.length;
    over.querySelector(".ptour-t").textContent = T("patrimoine.tour." + s.id + ".t");
    over.querySelector(".ptour-x").textContent = T("patrimoine.tour." + s.id + ".x");
    over.querySelector('[data-a="prev"]').style.visibility = (i === 0) ? "hidden" : "visible";
    over.querySelector(".ptour-next").textContent = (i === STEPS.length - 1) ? "✓" : "›";
    var tgt = s.target ? document.querySelector(s.target) : null;
    if (tgt) { try { tgt.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (e) { tgt.scrollIntoView(); } }
    setTimeout(position, tgt ? 280 : 0);
  }

  function position() {
    if (!over || over.hidden) return;
    var s = STEPS[i], tgt = s.target ? document.querySelector(s.target) : null;
    if (!tgt) {   // étape centrée (pas de cible) → voile plein écran (halo réduit à 0 au centre)
      over.classList.add("center"); hole.style.opacity = 1;
      hole.style.left = "50%"; hole.style.top = "50%"; hole.style.width = "0"; hole.style.height = "0";
      tip.style.left = ""; tip.style.top = "";
      return;
    }
    over.classList.remove("center"); hole.style.opacity = 1;
    var r = tgt.getBoundingClientRect(), pad = 8;
    hole.style.left = (r.left - pad) + "px"; hole.style.top = (r.top - pad) + "px";
    hole.style.width = (r.width + pad * 2) + "px"; hole.style.height = (r.height + pad * 2) + "px";
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var top = r.bottom + 12;
    if (top + th > window.innerHeight - 10) top = Math.max(10, r.top - th - 12);
    var left = Math.min(Math.max(10, r.left), window.innerWidth - tw - 10);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }

  load();   // précharge les étapes au boot → start() synchrone

  window.PatTour = {
    start: start,
    maybeAutostart: function () { var d; try { d = localStorage.getItem(KEY); } catch (e) {} if (!d) start(); }
  };
})();
