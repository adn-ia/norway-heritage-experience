/* ============================================================
   BRIQUE SOCLE — « Comprendre les modes d'itinéraire »   (auto-portée)
   ------------------------------------------------------------
   Explique, en texte et sans voix, ce que fait chaque façon de partir,
   et offre un bouton pour REJOUER le guide de l'application.

   • Auto-portée : embarque toute sa machinerie. Rien à câbler ailleurs.
   • Générique : ne lit AUCUNE donnée de pays. Aucun libellé en dur ici :
     tout vient de brique-modes.data.json.
   • S'INJECTE seule sur tout ancrage <… data-brique="modes">, et à défaut
     juste après le bloc « .modes » de la page d'itinéraire — pour qu'une
     édition qui n'a pas posé d'ancrage en bénéficie quand même.
   • i18n AUTO-PORTÉE : langue = celle décidée par l'hôte (localStorage
     'the_lang') ; si la langue manque dans SA donnée → repli ANGLAIS.
   • Relance du guide : délègue à HTour si la brique du guide est présente
     dans la page, sinon renvoie au menu avec ?guide=1. Elle ne suppose
     jamais que l'autre brique est là.
   • Mise à jour : remplacer CE fichier et SA donnée, sans toucher à l'hôte.

   Ancrage type :  <div data-brique="modes"></div>
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
    LOADING = fetch("brique-modes.data.json", { cache: "no-cache" })
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = j || {}; })
      .catch(function () { I18N = {}; });
    return LOADING;
  }

  function L(k) {
    var d = (I18N && (I18N[langue()] || I18N.en)) || {};
    return d[k] || "";
  }

  function styles() {
    if (document.getElementById("bmodes-css")) return;
    var s = document.createElement("style");
    s.id = "bmodes-css";
    s.textContent =
      ".bmodes{margin-top:14px;border-top:1px solid #efe7d8;padding-top:12px}" +
      ".bmodes>summary{cursor:pointer;font-size:15px;color:#8a7c66;list-style:none}" +
      ".bmodes>summary::-webkit-details-marker{display:none}" +
      ".bmodes .bm-in{font-size:14.5px;line-height:1.75;color:#6b5a39;margin-top:10px}" +
      ".bmodes .bm-in p{margin:6px 0}" +
      ".bmodes .bm-go{display:inline-block;margin-top:12px;color:#a8884f;text-decoration:none;font-weight:600;background:none;border:none;font-family:inherit;font-size:inherit;cursor:pointer;padding:0}";
    document.head.appendChild(s);
  }

  function rejouer() {
    /* Le guide appartient à une AUTRE brique. Si elle est chargée ici, on la
       relance ; sinon on renvoie à la page qui la porte. Aucune dépendance. */
    if (window.HTour && HTour.reset && HTour.start) {
      try { HTour.reset(); } catch (e) {}
      try { HTour.start(); return; } catch (e) {}
    }
    location.href = "decouvrir.html?guide=1";
  }

  function monter(hote) {
    if (!hote || hote.getAttribute("data-bmodes-done")) return;
    hote.setAttribute("data-bmodes-done", "1");
    styles();
    var d = document.createElement("details");
    d.className = "bmodes";
    var som = document.createElement("summary");
    som.textContent = L("titre");
    d.appendChild(som);
    var box = document.createElement("div");
    box.className = "bm-in";
    ["composer", "surprise", "libre", "circuits", "sauves", "commun"].forEach(function (k) {
      var t = L(k); if (!t) return;
      var p = document.createElement("p"); p.innerHTML = t; box.appendChild(p);
    });
    var b = document.createElement("button");
    b.type = "button"; b.className = "bm-go"; b.textContent = L("rejouer");
    b.onclick = rejouer;
    box.appendChild(b);
    d.appendChild(box);
    hote.appendChild(d);
  }

  function poser() {
    var ancres = document.querySelectorAll('[data-brique="modes"]');
    if (ancres.length) { [].forEach.call(ancres, monter); return; }
    /* Aucun ancrage posé par l'édition : on se glisse après les cartes de mode
       si elles existent. Une page sans ces cartes ne reçoit rien. */
    var modes = document.querySelector(".modes");
    if (!modes || !modes.parentNode) return;
    var hote = document.createElement("div");
    modes.parentNode.insertBefore(hote, modes.nextSibling);
    monter(hote);
  }

  function demarrer() { load().then(poser); }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", demarrer);
  else demarrer();

  window.HModes = { rejouer: rejouer };
})();
