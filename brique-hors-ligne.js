/* ============================================================
   BRIQUE SOCLE — « Disponible hors-ligne »   (auto-portée STRICTE)
   ------------------------------------------------------------
   Laisse l'utilisateur CHOISIR ce qu'il télécharge pour l'usage
   sans réseau (voix, photos…), avec le POIDS de chaque bloc, un
   bouton « Télécharger » (progression) et « Libérer l'espace ».

   • AUTO-PORTÉE STRICTE : embarque sa machinerie + son i18n + SA
     donnée. `brique-hors-ligne.data.json` (par édition) = { labels,
     blocks:[{id,bytes,n,files:[...]}] }. RIEN de l'hôte hormis la
     préférence de langue (the_lang → repli anglais).
   • Télécharge les fichiers cochés dans le cache SW dédié
     OFFLINE_CACHE. Le sw.js sert ensuite ces fichiers hors-ligne.
   • S'injecte sur l'ancrage <… data-brique="hors-ligne">. Se masque
     si aucun bloc. MAJ = remplacer SES fichiers.
   ============================================================ */
(function () {
  "use strict";
  var OFFLINE_CACHE = "heritage-offline";

  function cur() { try { return localStorage.getItem("the_lang") || ""; } catch (e) { return ""; } }
  function pick(o) { if (!o) return ""; var l = cur(); if (l && o[l] != null) return o[l]; if (o.en != null) return o.en; if (o.fr != null) return o.fr; for (var k in o) if (o[k] != null) return o[k]; return ""; }

  var DATA = null, LOADING = null, LABELS = {}, BLOCKS = [], CONFIG = {};
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (LOADING) return LOADING;
    LOADING = fetch("brique-hors-ligne.data.json").then(function (r) { return r.json(); })
      .then(function (j) { DATA = j || {}; LABELS = j.labels || {}; BLOCKS = j.blocks || []; CONFIG = j._config || {}; return DATA; })
      .catch(function () { DATA = {}; BLOCKS = []; return DATA; });
    return LOADING;
  }
  function L(k) { return pick(LABELS[k]); }
  function fmt(b) { if (b >= 1073741824) return (b / 1073741824).toFixed(1).replace(".", ",") + " Go"; return Math.round(b / 1048576) + " Mo"; }

  var CSS =
    ".bho{background:#fffdf8;border:1px solid #e5dcc8;border-radius:12px;padding:16px 16px 14px;margin:12px 0;font-family:inherit;color:#2b2318;}" +
    ".bho h3{font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;font-size:21px;margin:0 0 3px;}" +
    ".bho .bho-sub{font-size:13.5px;color:#8a7c66;margin:0 0 12px;}" +
    ".bho-row{display:flex;align-items:center;gap:11px;padding:10px 4px;border-top:1px solid #efe6d4;}" +
    ".bho-row label{flex:1;font-size:15px;cursor:pointer;}" +
    ".bho-row .sz{font-size:13px;color:#8a7c66;font-variant-numeric:tabular-nums;white-space:nowrap;}" +
    ".bho-row input{width:20px;height:20px;accent-color:#a8884f;cursor:pointer;}" +
    ".bho-tot{display:flex;justify-content:space-between;font-size:14px;font-weight:700;padding:11px 4px 4px;border-top:1px solid #e5dcc8;margin-top:4px;}" +
    ".bho-act{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px;}" +
    ".bho-btn{appearance:none;border:1px solid #a8884f;border-radius:9px;padding:11px 16px;font-family:inherit;font-size:14.5px;font-weight:700;cursor:pointer;background:#a8884f;color:#241c12;}" +
    ".bho-btn.ghost{background:#fff;color:#7a6a4a;border-color:#e5dcc8;font-weight:600;}" +
    ".bho-btn[disabled]{opacity:.5;cursor:default;}" +
    ".bho-bar{height:8px;background:#efe6d4;border-radius:6px;overflow:hidden;margin-top:12px;display:none;}" +
    ".bho-bar > i{display:block;height:100%;width:0;background:#a8884f;transition:width .2s;}" +
    ".bho-msg{font-size:12.5px;color:#8a7c66;margin-top:9px;min-height:16px;}" +
    ".bho-shell{font-size:12.5px;color:#6f9c7a;margin:2px 0 10px;}";
  var styled = false;
  function ensureCSS() { if (styled) return; styled = true; var s = document.createElement("style"); s.textContent = CSS; document.head.appendChild(s); }

  function humanUsed(cb) {
    if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { cb(e && e.usage ? fmt(e.usage) : ""); }, function () { cb(""); });
    else cb("");
  }
  function cachedCount(cb) {
    if (!window.caches) return cb(0);
    caches.open(OFFLINE_CACHE).then(function (c) { c.keys().then(function (k) { cb(k.length); }); }, function () { cb(0); });
  }

  function render(el) {
    ensureCSS();
    var blocks = BLOCKS.filter(function (b) { return b.files && b.files.length; });
    if (!blocks.length) { el.innerHTML = '<div class="bho"><div class="bho-shell">' + esc(L("shell")) + "</div></div>"; return; }
    var rows = blocks.map(function (b, i) {
      return '<div class="bho-row"><input type="checkbox" id="bho-' + i + '" data-i="' + i + '">' +
             '<label for="bho-' + i + '">' + esc(pick(LABELS[b.id]) || b.id) + '</label>' +
             '<span class="sz">' + fmt(b.bytes) + "</span></div>";
    }).join("");
    el.innerHTML =
      '<div class="bho"><h3>' + esc(L("titre")) + "</h3>" +
      '<p class="bho-sub">' + esc(L("sous")) + "</p>" +
      '<div class="bho-shell">' + esc(L("shell")) + "</div>" +
      rows +
      '<div class="bho-tot"><span>' + esc(L("total")) + '</span><span class="bho-totv">0 Mo</span></div>' +
      '<div class="bho-bar"><i></i></div>' +
      '<div class="bho-act"><button class="bho-btn" data-act="dl">' + esc(L("dl")) + '</button>' +
      '<button class="bho-btn ghost" data-act="free">' + esc(L("free")) + "</button></div>" +
      '<div class="bho-msg"></div></div>';

    var totv = el.querySelector(".bho-totv"), bar = el.querySelector(".bho-bar"), barI = el.querySelector(".bho-bar > i"), msg = el.querySelector(".bho-msg");
    function selBlocks() { var out = []; el.querySelectorAll(".bho-row input:checked").forEach(function (c) { out.push(blocks[+c.getAttribute("data-i")]); }); return out; }
    function refreshTotal() { var t = 0; selBlocks().forEach(function (b) { t += b.bytes; }); totv.textContent = fmt(t); }
    el.querySelectorAll(".bho-row input").forEach(function (c) { c.addEventListener("change", refreshTotal); });
    humanUsed(function (u) { if (u) msg.textContent = L("used") + " : " + u; });
    cachedCount(function (n) { if (n) msg.textContent = L("done") + (msg.textContent ? " · " + msg.textContent : ""); });

    el.querySelector('[data-act="free"]').addEventListener("click", function () {
      if (!window.caches) return;
      caches.delete(OFFLINE_CACHE).then(function () { bar.style.display = "none"; barI.style.width = "0"; humanUsed(function (u) { msg.textContent = u ? (L("used") + " : " + u) : ""; }); });
    });
    el.querySelector('[data-act="dl"]').addEventListener("click", function () {
      if (!window.caches) { msg.textContent = "—"; return; }
      var sel = selBlocks(); if (!sel.length) return;
      var files = []; sel.forEach(function (b) { files = files.concat(b.files); });
      var btn = el.querySelector('[data-act="dl"]'); btn.disabled = true;
      bar.style.display = "block"; barI.style.width = "0"; msg.textContent = L("downloading");
      caches.open(OFFLINE_CACHE).then(function (cache) {
        var done = 0, total = files.length, idx = 0, CONC = 6, active = 0, failed = 0;
        function next() {
          while (active < CONC && idx < total) {
            var url = files[idx++]; active++;
            cache.match(url).then(function (hit) {
              if (hit) return Promise.resolve();
              return fetch(url, { cache: "reload" }).then(function (r) { if (r && r.ok) return cache.put(url, r.clone()); failed++; }).catch(function () { failed++; });
            }).then(function () {
              active--; done++;
              barI.style.width = Math.round(done / total * 100) + "%";
              if (done === total) { btn.disabled = false; msg.textContent = L("done") + (failed ? " (" + failed + " ⚠️)" : ""); humanUsed(function (u) { if (u) msg.textContent += " · " + L("used") + " : " + u; }); }
              else next();
            });
          }
        }
        next();
      });
    });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function boot() {
    var els = document.querySelectorAll('[data-brique="hors-ligne"]');
    if (!els.length) return;
    load().then(function () { els.forEach(function (el) { if (el.getAttribute("data-bho")) return; el.setAttribute("data-bho", "1"); render(el); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
  window.BriqueHorsLigne = { render: boot };
})();
