/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — Contributions & modération (F2). Fille publique + console.
   • Onglet Contributions : liste linéaire (titre + réf. site) → MODALE (grande,
     pas plein écran) : détail + commentaires + photo. Tous lisent/commentent.
   • INP/Mère connectés (Google) : valider · rejeter (motif) · éditer · supprimer
     · télécharger (PDF/HTML). Pouvoirs imposés par les règles Firestore.
   • Onglet Statuts : contributions validées / rejetées + motif.
   Rôle = login Google (allowlist config). Public = sans compte (form nominatif).
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  function T(k, v) { return window.PATi18n ? PATi18n.uiT(k, v) : k; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function okMail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e); }
  function fmt(ts) { try { var d = ts && ts.toDate ? ts.toDate() : null; return d ? d.toLocaleDateString(PATi18n ? PATi18n.lang() : "fr") : ""; } catch (e) { return ""; } }
  function who(s) { return ((s.prenom ? s.prenom + " " : "") + (s.nom || "")).trim() || (s.nom || ""); }
  function isAdmin() { var r = window.PatFB && PatFB.ready && PatFB.role && PatFB.role(); return r === "mere" || r === "expert"; }
  function roleLabel(r) { return r === "mere" ? T("patrimoine.role.mere") : (r === "expert" ? T("patrimoine.role.expert") : ""); }
  function statusKey(st) { return { pending: "attente", validated: "valide", rejected: "rejete" }[st] || "attente"; }
  function badge(st) { var k = statusKey(st); return '<span class="fb-badge ' + k + '">' + esc(T("patrimoine.feed.statut." + k)) + "</span>"; }

  var SUBS = [], curId = null, unsubComments = null;

  /* ── liste linéaire (une ligne = titre + réf. + statut) ── */
  function rowEl(s) {
    var el = document.createElement("button"); el.type = "button"; el.className = "fb-row";
    el.innerHTML =
      '<span class="fb-row-main"><b>' + esc(s.site || T("patrimoine.feed.site.inconnu")) + "</b>" +
      (s.siteId ? '<span class="fb-ref">' + esc(T("patrimoine.feed.ref")) + " " + esc(s.siteId) + "</span>" : "") +
      "</span>" +
      '<span class="fb-row-meta">' + badge(s.status) + '<span class="fb-row-date">' + fmt(s.createdAt) + "</span></span>";
    el.addEventListener("click", function () { openModal(s.id); });
    return el;
  }

  /* ── modale (grande, pas plein écran) ── */
  function ensureModal() {
    var m = document.getElementById("cmodal");
    if (m) return m;
    m = document.createElement("div"); m.className = "cmodal"; m.id = "cmodal"; m.hidden = true;
    m.innerHTML = '<div class="cmodal-box"><button class="cmodal-x" type="button" aria-label="fermer">×</button><div class="cmodal-body"></div></div>';
    document.body.appendChild(m);
    m.addEventListener("click", function (e) { if (e.target === m) closeModal(); });
    m.querySelector(".cmodal-x").addEventListener("click", closeModal);
    return m;
  }
  function closeModal() { var m = document.getElementById("cmodal"); if (m) m.hidden = true; curId = null; if (unsubComments) { unsubComments(); unsubComments = null; } }

  function find(id) { for (var i = 0; i < SUBS.length; i++) if (SUBS[i].id === id) return SUBS[i]; return null; }

  function openModal(id) {
    var s = find(id); if (!s) return;
    if (!isAdmin() && s.status !== "validated") return;   // le public n'ouvre que des contributions validées
    curId = id;
    var m = ensureModal(), body = m.querySelector(".cmodal-body");
    var photo = s.photoUrl ? '<a class="fb-photo" href="' + esc(s.photoUrl) + '" target="_blank" rel="noopener">' + esc(T("patrimoine.feed.photo")) + (s.photoCredit ? " — " + esc(s.photoCredit) : "") + "</a>" : "";
    var admin = isAdmin();
    body.innerHTML =
      '<div class="cm-head"><h2>' + esc(s.site || T("patrimoine.feed.site.inconnu")) + "</h2>" + badge(s.status) + "</div>" +
      (s.siteId ? '<div class="cm-ref">' + esc(T("patrimoine.feed.ref")) + " " + esc(s.siteId) + (s.gov ? " · " + esc(s.gov) : "") + "</div>" : (s.gov ? '<div class="cm-ref">' + esc(s.gov) + "</div>" : "")) +
      (s.etat ? '<div class="cm-etat">' + esc(T("patrimoine.fiche.etat")) + " : " + esc(s.etat) + "</div>" : "") +
      '<p class="cm-obs">' + esc(s.obs) + "</p>" + photo +
      (admin && s.photoUrl && scanOn() ? '<div class="cm-scan"></div>' : "") +
      '<div class="cm-meta">' + esc(T("patrimoine.feed.par")) + " " + esc(who(s)) + " · " + fmt(s.createdAt) + "</div>" +
      (s.status === "rejected" && s.reason ? '<div class="cm-reason">' + esc(T("patrimoine.statuts.motif")) + " " + esc(s.reason) + "</div>" : "") +
      (admin ? adminBar(s) : "") +
      '<div class="cm-comments"><h3>' + esc(T("patrimoine.feed.commentaires")) + '</h3><div class="cm-clist">…</div>' +
        '<div class="cm-cform"><input class="cm-cnom" placeholder="' + esc(T("patrimoine.contrib.nom")) + '"><input class="cm-cmail" placeholder="' + esc(T("patrimoine.contrib.email")) + '">' +
        '<textarea class="cm-ctext" placeholder="' + esc(T("patrimoine.feed.votre.commentaire")) + '"></textarea>' +
        '<button class="cm-csend" type="button">' + esc(T("patrimoine.feed.publier")) + '</button><span class="cm-cmsg"></span></div></div>';
    wireComments(id, body);
    if (admin) wireAdmin(id, body);
    if (admin && s.photoUrl && scanOn()) runScan(s, body.querySelector(".cm-scan"));
    m.hidden = false;
  }

  /* ── Scan anti-copie (recherche d'image inversée via Worker, à la demande, modérateur seul).
     « présente en ligne » ≠ « copyrightée » → SIGNAL, jamais d'auto-rejet. Résultat mis en cache session. ── */
  var SCAN_CACHE = {};
  function scanOn() { return !!(((window.PAT && window.PAT.scanWorker) || "").trim()); }
  function runScan(s, el) {
    if (!el) return;
    el.className = "cm-scan"; el.innerHTML = '<span class="cm-scan-l">🔍 ' + esc(T("patrimoine.scan.encours")) + "</span>";
    var cached = SCAN_CACHE[s.id];
    var p = cached ? Promise.resolve(cached)
      : fetch(((window.PAT && window.PAT.scanWorker) || "").trim(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: s.photoUrl }) })
          .then(function (r) { return r.json(); }).then(function (jj) { SCAN_CACHE[s.id] = jj; return jj; });
    p.then(function (jj) { renderScan(el, jj); }).catch(function () { el.className = "cm-scan"; el.innerHTML = '<span class="cm-scan-l">' + esc(T("patrimoine.scan.err")) + "</span>"; });
  }
  function renderScan(el, jj) {
    if (!jj || jj.error) { el.className = "cm-scan"; el.innerHTML = '<span class="cm-scan-l">' + esc(T("patrimoine.scan.err")) + "</span>"; return; }
    if (jj.found) {
      var n = (jj.full || 0) + (jj.pages ? jj.pages.length : 0);
      var links = (jj.pages || []).map(function (p) { return '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title || p.url) + "</a>"; }).join("");
      el.className = "cm-scan warn";
      el.innerHTML = '<span class="cm-scan-l">⚠️ ' + esc(T("patrimoine.scan.trouve", { n: n })) + "</span>" + (links ? '<div class="cm-scan-src">' + links + "</div>" : "");
    } else {
      el.className = "cm-scan ok";
      el.innerHTML = '<span class="cm-scan-l">✓ ' + esc(T("patrimoine.scan.rien")) + "</span>";
    }
  }

  function adminBar(s) {
    return '<div class="cm-admin"><span class="cm-admin-lbl">' + esc(T("patrimoine.mod.moderation")) + "</span>" +
      (s.status !== "validated" ? '<button class="cm-btn ok" data-act="validate">' + esc(T("patrimoine.mod.valider")) + "</button>" : "") +
      (s.status !== "rejected" ? '<button class="cm-btn no" data-act="reject">' + esc(T("patrimoine.mod.rejeter")) + "</button>" : "") +
      '<button class="cm-btn" data-act="edit">' + esc(T("patrimoine.mod.editer")) + "</button>" +
      '<button class="cm-btn" data-act="download">' + esc(T("patrimoine.mod.telecharger")) + "</button>" +
      '<button class="cm-btn danger" data-act="delete">' + esc(T("patrimoine.mod.supprimer")) + "</button></div>";
  }

  function wireAdmin(id, body) {
    var s = find(id);
    body.querySelectorAll(".cm-admin [data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        if (act === "validate") { PatFB.setStatus(id, "validated").catch(err); }
        else if (act === "reject") { var r = prompt(T("patrimoine.mod.motif")); if (r != null) PatFB.setStatus(id, "rejected", r).catch(err); }
        else if (act === "delete") { if (confirm(T("patrimoine.mod.confirm.suppr"))) { PatFB.deleteSubmission(id).then(closeModal, err); } }
        else if (act === "edit") { editForm(id, body); }
        else if (act === "download") { downloadOne(s); }
      });
    });
  }
  function err(e) { alert(T("patrimoine.contrib.erreur")); }

  /* ── édition admin en place ── */
  function editForm(id, body) {
    var s = find(id); if (!s) return;
    var wrap = document.createElement("div"); wrap.className = "cm-edit";
    wrap.innerHTML =
      '<label>' + esc(T("patrimoine.contrib.site")) + '</label><input class="e-site" value="' + esc(s.site) + '">' +
      '<label>' + esc(T("patrimoine.contrib.obs")) + '</label><textarea class="e-obs">' + esc(s.obs) + "</textarea>" +
      '<label>' + esc(T("patrimoine.contrib.photo")) + '</label><input class="e-photo" value="' + esc(s.photoUrl || "") + '">' +
      '<div class="cm-edit-act"><button class="cm-btn ok" data-e="save">' + esc(T("patrimoine.mod.enregistrer")) + '</button><button class="cm-btn" data-e="cancel">' + esc(T("patrimoine.mod.annuler")) + "</button></div>";
    body.querySelector(".cm-admin").after(wrap);
    wrap.querySelector('[data-e="cancel"]').addEventListener("click", function () { wrap.remove(); });
    wrap.querySelector('[data-e="save"]').addEventListener("click", function () {
      PatFB.updateSubmission(id, { site: wrap.querySelector(".e-site").value.trim(), obs: wrap.querySelector(".e-obs").value.trim(), photoUrl: wrap.querySelector(".e-photo").value.trim() })
        .then(function () { wrap.remove(); }, err);
    });
  }

  /* ── commentaires ── */
  function commentTree(cs) {
    var byId = {}, roots = [];
    cs.forEach(function (c) { c._children = []; byId[c.id] = c; });
    cs.forEach(function (c) { if (c.replyTo && byId[c.replyTo]) byId[c.replyTo]._children.push(c); else roots.push(c); });
    return roots;
  }
  function commentHTML(c, depth) {
    var rl = (c.role && c.role !== "public") ? ' <em class="fb-crole">' + esc(c.role) + "</em>" : "";
    var kids = (c._children || []).map(function (k) { return commentHTML(k, depth + 1); }).join("");
    return '<div class="fb-c"' + (depth ? ' style="margin-left:' + (depth * 16) + 'px;border-left:2px solid var(--line);padding-left:9px"' : "") +
      '><span class="fb-cauthor">' + esc(c.nom) + rl + '</span><span class="fb-cdate">' + fmt(c.createdAt) + "</span><p>" + esc(c.text) + "</p>" +
      '<button class="fb-reply" type="button" data-rep="' + esc(c.id) + '">' + esc(T("patrimoine.feed.repondre")) + "</button></div>" + kids;
  }
  function submitComment(id, nom, mail, text, replyTo, msg, btn, textEl, formToRemove) {
    nom = (nom || "").trim(); mail = (mail || "").trim(); text = (text || "").trim();
    if (!nom || !text || !okMail(mail)) { msg.textContent = T("patrimoine.contrib.requis"); return; }
    btn.disabled = true; msg.textContent = T("patrimoine.contrib.envoi");
    PatFB.addComment(id, { nom: nom, email: mail, text: text, replyTo: replyTo || null }).then(function () {
      if (textEl) textEl.value = ""; msg.textContent = ""; btn.disabled = false; if (formToRemove) formToRemove.remove();
    }, function () { msg.textContent = T("patrimoine.contrib.erreur"); btn.disabled = false; });
  }
  function openReply(subId, parentId, btn) {
    var nx = btn.nextElementSibling;
    if (nx && nx.classList && nx.classList.contains("fb-replyform")) { nx.parentNode.removeChild(nx); return; }
    var f = document.createElement("div"); f.className = "fb-replyform";
    f.innerHTML = '<input class="r-nom" placeholder="' + esc(T("patrimoine.contrib.nom")) + '"><input class="r-mail" placeholder="' + esc(T("patrimoine.contrib.email")) + '"><textarea class="r-text" placeholder="' + esc(T("patrimoine.feed.votre.commentaire")) + '"></textarea><button class="cm-csend r-send" type="button">' + esc(T("patrimoine.feed.publier")) + '</button><span class="r-msg"></span>';
    btn.parentNode.insertBefore(f, btn.nextSibling);
    f.querySelector(".r-send").addEventListener("click", function () { submitComment(subId, f.querySelector(".r-nom").value, f.querySelector(".r-mail").value, f.querySelector(".r-text").value, parentId, f.querySelector(".r-msg"), f.querySelector(".r-send"), f.querySelector(".r-text"), f); });
  }
  function wireComments(id, body) {
    var list = body.querySelector(".cm-clist");
    if (unsubComments) { unsubComments(); unsubComments = null; }
    unsubComments = PatFB.watchComments(id, function (cs) {
      if (!cs.length) { list.innerHTML = '<div class="fb-cempty">' + esc(T("patrimoine.feed.aucun.commentaire")) + "</div>"; }
      else { list.innerHTML = commentTree(cs).map(function (c) { return commentHTML(c, 0); }).join(""); }
      list.querySelectorAll(".fb-reply").forEach(function (b) { b.addEventListener("click", function () { openReply(id, b.getAttribute("data-rep"), b); }); });
    });
    var send = body.querySelector(".cm-csend"), msg = body.querySelector(".cm-cmsg");
    send.addEventListener("click", function () { submitComment(id, body.querySelector(".cm-cnom").value, body.querySelector(".cm-cmail").value, body.querySelector(".cm-ctext").value, null, msg, send, body.querySelector(".cm-ctext")); });
  }

  /* ── téléchargement d'une contribution (PDF via impression + HTML autonome) ── */
  function contribHTML(s) {
    return '<!doctype html><meta charset="utf-8"><title>' + esc(s.site || "Contribution") + '</title>' +
      '<style>body{font-family:Georgia,serif;max-width:640px;margin:40px auto;color:#2b2318;line-height:1.6;padding:0 20px}h1{font-size:26px}.k{color:#8a7c66;font-size:13px}.r{margin:6px 0}a{color:#a8884f}</style>' +
      "<h1>" + esc(s.site || "—") + "</h1>" +
      (s.siteId ? '<div class="r"><span class="k">Réf.</span> ' + esc(s.siteId) + "</div>" : "") +
      (s.gov ? '<div class="r"><span class="k">Gouvernorat</span> ' + esc(s.gov) + "</div>" : "") +
      (s.etat ? '<div class="r"><span class="k">État</span> ' + esc(s.etat) + "</div>" : "") +
      '<div class="r"><span class="k">Observation</span><br>' + esc(s.obs) + "</div>" +
      (s.photoUrl ? '<div class="r"><span class="k">Photo</span> <a href="' + esc(s.photoUrl) + '">' + esc(s.photoUrl) + "</a>" + (s.photoCredit ? " (" + esc(s.photoCredit) + ")" : "") + "</div>" : "") +
      '<div class="r"><span class="k">Proposé par</span> ' + esc(who(s)) + " · " + esc(s.email) + " · " + fmt(s.createdAt) + "</div>" +
      '<div class="r"><span class="k">Statut</span> ' + esc(T("patrimoine.feed.statut." + statusKey(s.status))) + (s.reason ? " — " + esc(s.reason) : "") + "</div>";
  }
  function downloadOne(s) {
    // HTML autonome
    try {
      var blob = new Blob([contribHTML(s)], { type: "text/html" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "contribution-" + (s.siteId || s.id) + ".html"; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    } catch (e) {}
    // PDF via fenêtre d'impression
    try {
      var w = window.open("", "_blank");
      if (w) { w.document.write(contribHTML(s)); w.document.close(); setTimeout(function () { w.print(); }, 300); }
    } catch (e) {}
  }

  /* ── rendus des 2 onglets ── */
  function note(el, key) { el.innerHTML = '<p class="fb-note">' + esc(T(key)) + "</p>"; }
  function zoneOf(el) { return el && el.closest ? el.closest(".dash-zone") : null; }
  function renderAll() {
    var fl = document.getElementById("feedList"), sl = document.getElementById("statutsList");
    if (SUBS === null) { if (fl) note(fl, "patrimoine.feed.avenir"); if (sl) note(sl, "patrimoine.feed.avenir"); return; }
    var pending   = SUBS.filter(function (s) { return s.status !== "validated" && s.status !== "rejected"; });
    var validated = SUBS.filter(function (s) { return s.status === "validated"; });
    var done      = SUBS.filter(function (s) { return s.status === "validated" || s.status === "rejected"; });
    var admin = isAdmin();
    var badge = document.getElementById("badgeCours");
    var statZone = zoneOf(sl);
    // ── Public : voit UNIQUEMENT les contributions VALIDÉES. Rien en attente/rejeté n'est affiché. ──
    // ── Modérateur (Mère/référent) : file d'attente à modérer + statuts (validées/rejetées). ──
    if (admin) {
      if (badge) { if (pending.length) { badge.textContent = pending.length; badge.hidden = false; } else badge.hidden = true; }
      if (fl) { if (!pending.length) note(fl, "patrimoine.feed.vide"); else { fl.innerHTML = ""; pending.forEach(function (s) { fl.appendChild(rowEl(s)); }); } }
      if (statZone) statZone.hidden = false;
      if (sl) { if (!done.length) note(sl, "patrimoine.statuts.vide"); else { sl.innerHTML = ""; done.forEach(function (s) { sl.appendChild(rowEl(s)); }); } }
    } else {
      if (badge) badge.hidden = true;
      if (fl) { if (!validated.length) note(fl, "patrimoine.feed.public.vide"); else { fl.innerHTML = ""; validated.forEach(function (s) { fl.appendChild(rowEl(s)); }); } }
      if (statZone) statZone.hidden = true;   // la zone « statuts » est un outil de modération → masquée au public
    }
    if (curId && document.getElementById("cmodal") && !document.getElementById("cmodal").hidden) openModal(curId); // rafraîchit la modale ouverte
    publishPhotos();
    publishContribs();
  }

  /* ── Photos disponibles par site = contributions VALIDÉES avec photo (la plus récente).
     Publiées à app.js (liste/fiche) via un événement — la modération contrôle donc ce qui s'affiche. ── */
  var lastPhotoKey = "";
  function photoMap() {   // siteId → [photos] (toutes les contributions validées avec photo, + récentes d'abord)
    var m = {};
    (SUBS || []).forEach(function (s) {
      if (s.status === "validated" && s.photoUrl && s.siteId) (m[s.siteId] = m[s.siteId] || []).push({ url: s.photoUrl, credit: s.photoCredit || "", par: who(s) });
    });
    return m;
  }
  function publishPhotos() {
    var m = photoMap(), k = JSON.stringify(m);
    if (k === lastPhotoKey) return;   // ne notifie app.js que si ça change
    lastPhotoKey = k;
    try { document.dispatchEvent(new CustomEvent("pat:photos", { detail: m })); } catch (e) {}
  }

  /* ── Contributions VALIDÉES par site (texte + photo + auteur) = pièces jointes de la fiche.
     Publiées à app.js → la fiche du site affiche les enrichissements validés (consolidation). ── */
  var lastContribKey = "";
  function contribMap() {   // siteId → [{obs, photoUrl, photoCredit, etat, who, t}] (+ récentes d'abord)
    var m = {};
    (SUBS || []).forEach(function (s) {
      if (s.status === "validated" && s.siteId) (m[s.siteId] = m[s.siteId] || []).push({
        obs: s.obs || "", photoUrl: s.photoUrl || "", photoCredit: s.photoCredit || "",
        etat: s.etat || "", who: who(s), t: tms(s.createdAt)
      });
    });
    return m;
  }
  function publishContribs() {
    var m = contribMap(), k = JSON.stringify(m);
    if (k === lastContribKey) return;
    lastContribKey = k;
    try { document.dispatchEvent(new CustomEvent("pat:contribs", { detail: m })); } catch (e) {}
  }

  /* ── bouton connexion admin ── */
  /* ── Coin discret de connexion (pas d'écran, pas de mot « admin ») :
     petite clé 🔑 → e-mail + mot de passe inline. Par défaut le dashboard est PUBLIC.
     Si l'e-mail est reconnu (le tien / domaine INP) + mot de passe + e-mail vérifié → crédité. ── */
  function renderAuth() {
    var el = document.getElementById("authBtn"); if (!el || !window.PatFB || !PatFB.ready) return;
    var u = PatFB.user && PatFB.user();
    el.hidden = false;
    if (u) {
      var warn = !PatFB.emailVerified() ? ' <button class="auth-b" data-a="verify">' + esc(T("patrimoine.gate.verifier.court")) + "</button>" : "";
      el.innerHTML = '<span class="auth-who">' + esc(u.email) + (isAdmin() && PatFB.emailVerified() ? ' · <b>' + esc(roleLabel(PatFB.role())) + "</b>" : "") + "</span>" + warn +
        ' <button class="auth-b" data-a="out">' + esc(T("patrimoine.auth.deconnexion")) + "</button>";
      el.querySelectorAll("[data-a]").forEach(function (b) {
        b.addEventListener("click", function () {
          var a = b.getAttribute("data-a");
          if (a === "out") PatFB.signOut();
          else if (a === "verify") PatFB.resendVerification().then(function () { alert(T("patrimoine.gate.verifier")); }, function () {});
        });
      });
      return;
    }
    // non connecté : clé discrète qui déplie un mini-formulaire e-mail + mot de passe
    el.innerHTML = '<button class="auth-key" data-a="open" aria-label="' + esc(T("patrimoine.gate.acces")) + '" title="' + esc(T("patrimoine.gate.acces")) + '">🔑</button>' +
      '<span class="auth-form" hidden><input type="email" class="af-email" placeholder="' + esc(T("patrimoine.contrib.email")) + '" autocomplete="email">' +
      '<input type="password" class="af-pw" placeholder="' + esc(T("patrimoine.gate.pw")) + '" autocomplete="current-password">' +
      '<input type="password" class="af-pw2" placeholder="' + esc(T("patrimoine.gate.pw2")) + '" autocomplete="new-password">' +
      '<button class="auth-b" data-a="go">→</button><span class="af-msg"></span></span>';
    var form = el.querySelector(".auth-form"), msg = el.querySelector(".af-msg");
    el.querySelector('[data-a="open"]').addEventListener("click", function () { form.hidden = !form.hidden; if (!form.hidden) el.querySelector(".af-email").focus(); });
    el.querySelector('[data-a="go"]').addEventListener("click", function () {
      var email = (el.querySelector(".af-email").value || "").trim(), pw = el.querySelector(".af-pw").value, pw2 = el.querySelector(".af-pw2").value;
      if (!email || !pw) return;
      // Connexion ouverte : Mère + modérateurs (liste dynamique) peuvent entrer. Le RÔLE (après
      // connexion) décide des pouvoirs. Le champ « confirmer » n'est vérifié qu'à la CRÉATION du compte.
      msg.textContent = "…";
      PatFB.signInEmail(email, pw, pw2).then(function () { if (!PatFB.emailVerified()) msg.textContent = T("patrimoine.gate.verifier"); })
        .catch(function (err) { msg.textContent = (err && err.code === "pat/password-mismatch") ? T("patrimoine.gate.pwdiff") : T("patrimoine.gate.echec"); });
    });
  }

  /* ── panneau « Partager » (Mère seulement) : lien public + lien INP ── */
  function baseUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); } // .../patrimoine/
  function renderShare() {
    var el = document.getElementById("sharePanel"); if (!el) return;
    var isMere = window.PatFB && PatFB.ready && PatFB.role && PatFB.role() === "mere";
    if (!isMere) { el.hidden = true; el.innerHTML = ""; return; }
    var pub = baseUrl(), inp = pub + "#contrib";
    el.hidden = false;
    function line(lbl, u) { return '<div class="share-row"><span class="share-lbl">' + esc(lbl) + '</span><code>' + esc(u) + '</code><button class="share-b" type="button" data-u="' + esc(u) + '">' + esc(T("patrimoine.share.copier")) + "</button></div>"; }
    el.innerHTML = '<div class="share-h">' + esc(T("patrimoine.share.titre")) + "</div>" +
      line(T("patrimoine.share.public"), pub) + line(T("patrimoine.share.expert"), inp) +
      '<div class="share-note">' + esc(T("patrimoine.share.expert.note")) + "</div>";
    el.querySelectorAll(".share-b").forEach(function (b) {
      b.addEventListener("click", function () {
        var u = b.getAttribute("data-u");
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { b.textContent = T("patrimoine.share.copie"); setTimeout(function () { b.textContent = T("patrimoine.share.copier"); }, 1500); });
      });
    });
  }

  /* ── Panneau MODÉRATEURS (Mère seulement) : ajouter (nom + e-mail + profil) / révoquer.
     Liste dynamique Firestore → rôle « modérateur » sans toucher la config. Ces personnes,
     connues et reconnues, reçoivent les soumissions à modérer avant affichage. ── */
  var unsubMods = null;
  function renderMods() {
    var el = document.getElementById("modPanel"); if (!el) return;
    var isMere = window.PatFB && PatFB.ready && PatFB.role && PatFB.role() === "mere";
    if (!isMere) { el.hidden = true; el.innerHTML = ""; if (unsubMods) { unsubMods(); unsubMods = null; } return; }
    el.hidden = false;
    el.innerHTML = '<div class="mod-h">' + esc(T("patrimoine.mod.panel.titre")) + "</div>" +
      '<div class="mod-list" id="modList"></div>' +
      '<form class="mod-form"><input class="mod-name" placeholder="' + esc(T("patrimoine.mod.panel.nom")) + '">' +
      '<input class="mod-mail" type="email" placeholder="' + esc(T("patrimoine.contrib.email")) + '" autocomplete="off">' +
      '<input class="mod-prof" placeholder="' + esc(T("patrimoine.mod.panel.profil")) + '">' +
      '<button class="mod-add" type="submit">' + esc(T("patrimoine.mod.panel.ajouter")) + '</button><span class="mod-msg"></span></form>' +
      '<div class="mod-note">' + esc(T("patrimoine.mod.panel.note")) + "</div>";
    var list = el.querySelector("#modList"), form = el.querySelector(".mod-form"), mmsg = el.querySelector(".mod-msg");
    if (unsubMods) { unsubMods(); unsubMods = null; }
    unsubMods = PatFB.watchModerators(function (mods) {
      if (!mods || !mods.length) { note(list, "patrimoine.mod.panel.vide"); return; }
      list.innerHTML = mods.map(function (m) {
        return '<div class="mod-row"><span class="mod-who"><b>' + esc(m.name || m.email) + "</b>" + (m.profile ? ' <em>' + esc(m.profile) + "</em>" : "") +
          '<span class="mod-mail-l">' + esc(m.email) + "</span></span>" +
          '<button class="mod-rm" type="button" data-e="' + esc(m.id) + '" aria-label="' + esc(T("patrimoine.mod.panel.revoquer")) + '">✕</button></div>';
      }).join("");
      list.querySelectorAll(".mod-rm").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm(T("patrimoine.mod.panel.confirm"))) return;
          PatFB.removeModerator(b.getAttribute("data-e")).catch(function () { alert(T("patrimoine.contrib.erreur")); });
        });
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = form.querySelector(".mod-name").value.trim(), mail = form.querySelector(".mod-mail").value.trim(), prof = form.querySelector(".mod-prof").value.trim();
      if (!name || !okMail(mail)) { mmsg.textContent = T("patrimoine.contrib.requis"); return; }
      mmsg.textContent = T("patrimoine.contrib.envoi");
      PatFB.addModerator(mail, name, prof).then(function () { form.reset(); mmsg.textContent = ""; }, function () { mmsg.textContent = T("patrimoine.contrib.erreur"); });
    });
  }

  /* ── Cloche de notifications : activité récente (nouvelles contributions + commentaires).
     Auto-porté : état « vu » en localStorage (clé propre). Les commentaires sont suivis
     par soumission (listeners existants), bornés aux plus récentes → pas d'infra en plus. ── */
  var SEEN_KEY = "pat_notif_seen";
  var commentWatchers = {};   // subId -> unsub
  var COMMENT_ACT = {};       // subId -> [{id,time,who,text}]
  var NOTIF_MAX_SUBS = 60;    // borne le nb de listeners commentaires (soumissions les + récentes)
  function seenTs() { try { return +localStorage.getItem(SEEN_KEY) || 0; } catch (e) { return 0; } }
  function setSeen(t) { try { localStorage.setItem(SEEN_KEY, String(t)); } catch (e) {} }
  function tms(ts) { try { return ts && ts.toDate ? ts.toDate().getTime() : 0; } catch (e) { return 0; } }
  function relTime(ms) {
    if (!ms) return "";
    var m = Math.round((Date.now() - ms) / 60000);
    if (m < 1) return T("patrimoine.notif.maintenant");
    if (m < 60) return T("patrimoine.notif.min", { n: m });
    var h = Math.round(m / 60); if (h < 24) return T("patrimoine.notif.h", { n: h });
    return T("patrimoine.notif.j", { n: Math.round(h / 24) });
  }
  function reconcileCommentWatchers() {
    if (!SUBS || !PatFB.watchComments) return;
    var keep = {};
    SUBS.slice(0, NOTIF_MAX_SUBS).forEach(function (s) {
      keep[s.id] = 1;
      if (!commentWatchers[s.id]) {
        commentWatchers[s.id] = PatFB.watchComments(s.id, function (cs) {
          COMMENT_ACT[s.id] = cs.map(function (c) { return { id: c.id, time: tms(c.createdAt), who: c.nom || "", text: c.text || "" }; });
          renderNotif();
        });
      }
    });
    Object.keys(commentWatchers).forEach(function (id) {
      if (!keep[id]) { try { commentWatchers[id](); } catch (e) {} delete commentWatchers[id]; delete COMMENT_ACT[id]; }
    });
  }
  function buildActivity() {
    var items = [], siteOf = {};
    (SUBS || []).forEach(function (s) {
      siteOf[s.id] = s.site || T("patrimoine.feed.site.inconnu");
      items.push({ kind: "sub", subId: s.id, site: siteOf[s.id], who: who(s), time: tms(s.createdAt) });
    });
    Object.keys(COMMENT_ACT).forEach(function (id) {
      (COMMENT_ACT[id] || []).forEach(function (c) {
        items.push({ kind: "comment", subId: id, site: siteOf[id] || T("patrimoine.feed.site.inconnu"), who: c.who, text: c.text, time: c.time });
      });
    });
    items.sort(function (a, b) { return b.time - a.time; });
    return items.slice(0, 40);
  }
  function fillNotifPanel(panel, items, seen) {
    var list = panel.querySelector(".notif-list");
    if (!items.length) { list.innerHTML = '<div class="notif-empty">' + esc(T("patrimoine.notif.vide")) + "</div>"; return; }
    list.innerHTML = items.map(function (i) {
      var isNew = i.time > seen;
      var label = T(i.kind === "sub" ? "patrimoine.notif.contribution" : "patrimoine.notif.commentaire", { site: i.site, qui: i.who || T("patrimoine.feed.site.inconnu") });
      return '<button type="button" class="notif-item' + (isNew ? " is-new" : "") + '" data-sub="' + esc(i.subId) + '">' +
        (isNew ? '<span class="notif-dot"></span>' : "") +
        '<span class="notif-txt">' + esc(label) + (i.kind === "comment" && i.text ? '<span class="notif-snip">« ' + esc(i.text.slice(0, 70)) + (i.text.length > 70 ? "…" : "") + ' »</span>' : "") + "</span>" +
        '<span class="notif-when">' + esc(relTime(i.time)) + "</span></button>";
    }).join("");
    list.querySelectorAll(".notif-item").forEach(function (b) {
      b.addEventListener("click", function () { closeNotif(); openModal(b.getAttribute("data-sub")); });
    });
  }
  function renderNotif() {
    var bell = document.getElementById("notifBell"); if (!bell) return;
    if (!PatFB.ready || !isAdmin()) { bell.hidden = true; return; }   // cloche = outil de modération (activité, dont soumissions en attente)
    bell.hidden = false;
    var h = bell.querySelector(".notif-h"); if (h && !h.textContent) h.textContent = T("patrimoine.notif.titre");
    var btn = bell.querySelector(".notif-btn"); if (btn && !btn.getAttribute("aria-label")) btn.setAttribute("aria-label", T("patrimoine.notif.titre"));
    var items = buildActivity(), seen = seenTs();
    var unseen = items.filter(function (i) { return i.time > seen; }).length;
    var cnt = bell.querySelector(".notif-count");
    if (cnt) { if (unseen) { cnt.textContent = unseen > 99 ? "99+" : unseen; cnt.hidden = false; } else cnt.hidden = true; }
    var panel = bell.querySelector(".notif-panel");
    if (panel && !panel.hidden) fillNotifPanel(panel, items, seen);
  }
  function closeNotif() {
    var bell = document.getElementById("notifBell"); if (!bell) return;
    var panel = bell.querySelector(".notif-panel"); if (panel) panel.hidden = true;
    var btn = bell.querySelector(".notif-btn"); if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function toggleNotif() {
    var bell = document.getElementById("notifBell"); var panel = bell.querySelector(".notif-panel");
    if (panel.hidden) {
      var old = seenTs();
      panel.hidden = false;
      bell.querySelector(".notif-btn").setAttribute("aria-expanded", "true");
      fillNotifPanel(panel, buildActivity(), old);   // surligne ce qui était neuf
      setSeen(Date.now());                            // ouvrir = tout marquer vu
      var cnt = bell.querySelector(".notif-count"); if (cnt) cnt.hidden = true;
    } else closeNotif();
  }
  function wireBell() {
    var bell = document.getElementById("notifBell"); if (!bell) return;
    var btn = bell.querySelector(".notif-btn");
    if (btn) btn.addEventListener("click", function (e) { e.stopPropagation(); toggleNotif(); });
    document.addEventListener("click", function (e) { if (!bell.contains(e.target)) closeNotif(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeNotif(); });
    renderNotif();
  }

  function boot() {
    if (!document.getElementById("feed") && !document.getElementById("statutsList")) return;
    if (!window.PatFB || !PatFB.ready) { SUBS = null; renderAll(); return; }
    PatFB.onAuth(function () { renderAuth(); renderShare(); renderMods(); renderAll(); renderNotif(); });
    renderAuth(); renderShare(); renderMods(); wireBell();
    // Corrections de fiche (lecture publique) → publiées à app.js (fusion base INP + corrections).
    PatFB.watchCorrections(function (m) { try { document.dispatchEvent(new CustomEvent("pat:corrections", { detail: m || {} })); } catch (e) {} });
    PatFB.watchSubmissions(function (subs) { SUBS = subs; renderAll(); reconcileCommentWatchers(); renderNotif(); }, 300);
  }
  if (window.PATi18n && PATi18n.boot) PATi18n.boot().then(boot); else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
