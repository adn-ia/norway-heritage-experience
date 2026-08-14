/* ============================================================
   BRIQUE SOCLE — « Notez l'application »   (auto-portée)
   ------------------------------------------------------------
   Invite le visiteur à laisser une VRAIE évaluation sur le store
   (App Store / Google Play), là où ça récompense le travail.

   • Auto-portée : embarque toute sa machinerie. Rien à câbler ailleurs.
   • Générique : lit UNIQUEMENT window.HConf (appStoreId / appStore /
     playStore / androidPackage / marqueCourte). AUCUNE valeur en dur.
   • S'INJECTE seule sur tout ancrage <… data-brique="note-app">.
   • Se MASQUE si aucun lien store n'est configuré (édition sans store).
   • i18n AUTO-PORTÉE : TOUS les libellés (fr, en, nationale…) sont dans SA
     donnée (brique-note.data.json) — RIEN emprunté à l'hôte. Langue = celle
     décidée par l'hôte (localStorage 'the_lang') ; si absente → repli ANGLAIS.
   • Mise à jour : remplacer CE fichier, sans toucher aux autres briques ni à l'hôte.

   Contact hôte = window.HConf (liens store) + l'ancrage. Le changement de
   langue de l'hôte recharge la page (the-i18n.js) → la carte se remonte seule.
   Ancrage type :  <section data-brique="note-app"></section>
   ============================================================ */
(function () {
  "use strict";
  var H = window.HConf || {};

  /* --- i18n À ELLE : chargée depuis SA donnée (par édition : fr + en + nationale).
     RIEN emprunté à l'hôte. Langue décidée par l'hôte (the_lang) → repli anglais. */
  var I18N = null, LOADING = null;
  function load() {
    if (I18N) return Promise.resolve(I18N);
    if (LOADING) return LOADING;
    LOADING = fetch("brique-note.data.json")
      .then(function (r) { return r.json(); })
      .then(function (j) { I18N = (j && j.i18n) || {}; return I18N; })
      .catch(function () { I18N = {}; return I18N; });
    return LOADING;
  }
  function cur() { try { return localStorage.getItem("the_lang") || ""; } catch (e) { return ""; } }
  function T(k) { var d = (I18N && I18N[k]) || {}, l = cur(); return (l && d[l] != null) ? d[l] : (d.en != null ? d.en : ""); }

  /* --- Liens store (deep-links de NOTATION, pas la simple fiche) --------- */
  function appStoreReview() {
    var id = H.appStoreId || "";
    if (id) return "https://apps.apple.com/app/id" + id + "?action=write-review";
    return H.appStore || "";                 // à défaut : la fiche App Store
  }
  function playReview() {
    var url = H.playStore || "";
    if (!url && H.androidPackage) {
      url = "https://play.google.com/store/apps/details?id=" + H.androidPackage;
    }
    if (url && url.indexOf("showAllReviews") < 0) {
      url += (url.indexOf("?") < 0 ? "?" : "&") + "showAllReviews=true";
    }
    return url;
  }
  function links() { return { ios: appStoreReview(), play: playReview() }; }
  function hasAny() { var l = links(); return !!(l.ios || l.play); }

  /* --- appliquer les libellés (de SA donnée) sur un sous-arbre injecté ---- */
  function tr(el) {
    el.querySelectorAll("[data-i18n]").forEach(function (n) {
      var s = T(n.getAttribute("data-i18n")); if (s !== "") n.textContent = s;
    });
  }

  /* --- Gabarit de la carte ---------------------------------------------- */
  function card() {
    var l = links(), h = '<div class="brique-note">'
      + '<h2 data-i18n="note.titre"></h2>'
      + '<p data-i18n="note.texte"></p>'
      + '<div class="brique-note-btns">';
    if (l.ios)  h += '<a class="btn" href="' + l.ios  + '" target="_blank" rel="noopener" data-i18n="note.btn.appstore"></a>';
    if (l.play) h += '<a class="btn' + (l.ios ? ' ghost' : '') + '" href="' + l.play + '" target="_blank" rel="noopener" data-i18n="note.btn.play"></a>';
    h += '</div><div class="fineprint" data-i18n="note.merci"></div></div>';
    return h;
  }

  /* --- Montage sur les ancrages ----------------------------------------- */
  function mount() {
    if (!hasAny()) return;                         // aucune config store → rien
    var els = document.querySelectorAll('[data-brique="note-app"]');
    if (!els.length) return;
    load().then(function () {                       // libellés depuis SA donnée
      [].forEach.call(els, function (a) {
        if (a.getAttribute("data-mounted")) return;
        a.innerHTML = card();
        a.setAttribute("data-mounted", "1");
        tr(a);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else { mount(); }

  /* --- API publique (rappel doux après engagement, optionnel) ------------
     Appeler HNote.maybePrompt() après un moment de plaisir (fin d'itinéraire,
     N fiches ouvertes…). N'affiche qu'une fois, jamais harcelant. L'hôte
     décide OÙ l'appeler ; la brique gère la fréquence.                    */
  var SEEN = "h_note_prompt";
  window.HNote = {
    links: links,
    available: hasAny,
    mount: mount,
    maybePrompt: function () {
      if (!hasAny()) return false;
      try { if (localStorage.getItem(SEEN)) return false; } catch (e) {}
      var host = document.querySelector('[data-brique="note-app-prompt"]');
      if (!host) return false;
      load().then(function () {
        host.innerHTML = card();
        host.setAttribute("data-mounted", "1");
        tr(host); host.style.display = "";
      });
      try { localStorage.setItem(SEEN, "1"); } catch (e) {}
      return true;
    }
  };
})();
