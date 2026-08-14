/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — pont Firebase (sous-app autonome, PROPRE à patrimoine).
   Firebase ne sert QU'ICI (jamais l'app hôte). Firestore = feed partagé des
   contributions (soumission → stockée → affichée sur les 3 entités) + commentaires.
   Auth Google = INP + Mère (pouvoirs privilégiés) ; le public soumet sans compte
   (formulaire nominatif). Photos = URL collée en F1 (upload en F3).

   INERTE tant que PAT.firebase.projectId est vide → l'app marche (parcours/filtres/
   export), seul le feed affiche « à venir ». Utilise le SDK compat chargé par la page
   (firebase-app/firestore/auth-compat). Aucune dépendance à l'app hôte.
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var CFG = (window.PAT && window.PAT.firebase) || {};
  var ADMIN = (window.PAT && window.PAT.adminEmail || "").toLowerCase();
  // Référents (chercheurs / historiens reconnus) — plusieurs possibles. Compat ancien nom inpEmails.
  var EXPERTS = ((window.PAT && (window.PAT.expertEmails || window.PAT.inpEmails)) || []).map(function (e) { return String(e).toLowerCase(); });

  var ready = !!(CFG && CFG.projectId && CFG.apiKey && window.firebase);
  var db = null, auth = null, user = null, authCbs = [], isMod = false;

  function fireAuth() { authCbs.forEach(function (cb) { try { cb(user, role()); } catch (e) {} }); }
  if (ready) {
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
      db = firebase.firestore();
      if (firebase.auth) {
        auth = firebase.auth();
        auth.onAuthStateChanged(function (u) {
          user = u; isMod = false; fireAuth();   // notif immédiate (rôle sans statut modérateur encore connu)
          if (u && u.email) {
            db.collection("moderators").doc(u.email.toLowerCase()).get()
              .then(function (d) { isMod = d.exists; fireAuth(); }).catch(function () {});
          }
        });
      }
    } catch (e) { ready = false; }
  }

  // Domaines de référents admissibles (config). Vide → aucun rôle référent n'existe. Compat inpDomains.
  var EXPERTDOMS = ((window.PAT && (window.PAT.expertDomains || window.PAT.inpDomains)) || []).map(function (d) { return String(d).toLowerCase().replace(/^@/, ""); });
  function emailDom(m) { var i = String(m || "").toLowerCase().lastIndexOf("@"); return i >= 0 ? m.toLowerCase().slice(i + 1) : ""; }
  // Un e-mail est « crédité » (→ on demande le mot de passe) s'il est le tien ou d'un référent (e-mail/domaine).
  function isCredited(m) { m = String(m || "").toLowerCase(); return m === ADMIN || EXPERTS.indexOf(m) >= 0 || (EXPERTDOMS.length > 0 && EXPERTDOMS.indexOf(emailDom(m)) >= 0); }
  // Rôle réel (pouvoirs gardés par la vérif e-mail + les règles Firestore).
  function role() {
    if (!user || !user.email) return null;
    var m = user.email.toLowerCase();
    if (m === ADMIN) return "mere";
    // Modérateur = présent dans la liste dynamique (Firestore) OU dans la config (compat référents).
    if (isMod || EXPERTS.indexOf(m) >= 0 || (EXPERTDOMS.length > 0 && EXPERTDOMS.indexOf(emailDom(m)) >= 0)) return "expert";
    return "connecte"; // authentifié mais hors périmètre = pas de pouvoir
  }
  function isModerator() { return isMod; }
  function emailVerified() { return !!(user && user.emailVerified); }

  // ─── Gestion des modérateurs (Mère seulement — imposé par les règles Firestore) ───
  function watchModerators(cb) {
    if (!ready) { cb([]); return function () {}; }
    return db.collection("moderators").onSnapshot(function (snap) {
      var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); });
      out.sort(function (a, b) { return (a.name || a.email || "").localeCompare(b.name || b.email || ""); });
      cb(out);
    }, function () { cb(null); });
  }
  function addModerator(email, name, profile) {
    if (!ready) return Promise.reject(new Error("offline"));
    var e = String(email || "").trim().toLowerCase();
    return db.collection("moderators").doc(e).set({ email: e, name: (name || "").trim(), profile: (profile || "").trim(), addedAt: ts(), addedBy: (user && user.email) || "" });
  }
  function removeModerator(email) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("moderators").doc(String(email || "").trim().toLowerCase()).delete();
  }

  // ─── Corrections de fiche (couche par-dessus la base INP figée). Lecture publique,
  //     écriture réservée aux privilégiés (règles Firestore). doc ID = siteId. ───
  function watchCorrections(cb) {
    if (!ready) { cb({}); return function () {}; }
    return db.collection("corrections").onSnapshot(function (snap) {
      var m = {}; snap.forEach(function (d) { m[d.id] = d.data(); }); cb(m);
    }, function () { cb(null); });
  }
  function setCorrection(siteId, fields) {
    if (!ready) return Promise.reject(new Error("offline"));
    var u = {}; for (var k in fields) { if (fields[k] !== undefined) u[k] = fields[k]; }
    u.updatedBy = (user && user.email) || ""; u.updatedAt = ts();
    return db.collection("corrections").doc(String(siteId)).set(u, { merge: true });
  }

  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function curLang() { try { return (window.PATi18n && PATi18n.lang && PATi18n.lang()) || "fr"; } catch (e) { return "fr"; } }
  // Notif e-mail via Worker Cloudflare (inerte si PAT.notifyWorker vide). Le Worker lit la
  // contribution dans Firestore → le client n'envoie QUE { type, id } (jamais e-mail/contenu).
  function notify(type, id) {
    try {
      var url = ((window.PAT && window.PAT.notifyWorker) || "").trim();
      if (!url || !id) return;
      fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: type, id: id }) }).catch(function () {});
    } catch (e) {}
  }

  // ─── Contributions (soumissions) ───
  // data = { site, gov, etat, obs, photoUrl, photoCredit, rightsOk, nom, email }
  function addSubmission(data) {
    if (!ready) return Promise.reject(new Error("offline"));
    var doc = {
      site: data.site || "", siteId: data.siteId || "", gov: data.gov || "", etat: data.etat || "",
      obs: data.obs || "", photoUrl: data.photoUrl || "", photoCredit: data.photoCredit || "",
      rightsOk: !!data.rightsOk, prenom: data.prenom || "", nom: data.nom || "", email: data.email || "",
      lang: curLang(), status: "pending", createdAt: ts()
    };
    return db.collection("submissions").add(doc).then(function (ref) { notify("submission", ref.id); return ref; });
  }
  // écoute temps réel de TOUTES les soumissions (les vues filtrent par statut), plus récentes d'abord
  function watchSubmissions(cb, max) {
    if (!ready) { cb(null); return function () {}; }
    return db.collection("submissions").orderBy("createdAt", "desc").limit(max || 300)
      .onSnapshot(function (snap) {
        var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); });
        cb(out);
      }, function () { cb(null); });
  }

  // ─── Modération (INP / Mère seulement — imposé par les règles Firestore) ───
  function setStatus(id, status, reason) {   // status: 'pending'|'validated'|'rejected'
    if (!ready) return Promise.reject(new Error("offline"));
    var u = { status: status, reviewedBy: (user && user.email) || "", reviewedAt: ts() };
    if (reason != null) u.reason = reason;
    return db.collection("submissions").doc(id).update(u).then(function (r) { notify("status", id); return r; });
  }
  function updateSubmission(id, fields) {   // éditer le contenu (site/etat/obs/photoUrl/photoCredit)
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(id).update(fields || {});
  }
  function deleteSubmission(id) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(id).delete();
  }

  // ─── Commentaires (sous une soumission) ───
  function addComment(subId, data) {
    if (!ready) return Promise.reject(new Error("offline"));
    return db.collection("submissions").doc(subId).collection("comments")
      .add({ nom: data.nom || "", email: data.email || "", text: data.text || "", replyTo: data.replyTo || null, role: role() || "public", createdAt: ts() });
  }
  function watchComments(subId, cb) {
    if (!ready) { cb([]); return function () {}; }
    return db.collection("submissions").doc(subId).collection("comments").orderBy("createdAt", "asc")
      .onSnapshot(function (snap) { var out = []; snap.forEach(function (d) { var v = d.data(); v.id = d.id; out.push(v); }); cb(out); });
  }

  // ─── Auth email + mot de passe (Mère / INP) ───
  // Connexion ; si le compte n'existe pas encore → création + e-mail de vérification.
  // Les pouvoirs ne s'activent que si l'e-mail est VÉRIFIÉ (imposé par les règles).
  function signInEmail(email, pw, pw2) {
    if (!ready || !auth) return Promise.reject(new Error("no-auth"));
    // Codes « connexion impossible » qui, avec la protection anti-énumération de Firebase,
    // recouvrent aussi « compte inexistant » → on tente alors de CRÉER le compte.
    var CREATE = { "auth/user-not-found": 1, "auth/invalid-login-credentials": 1, "auth/invalid-credential": 1 };
    function verif(cred) { try { if (cred && cred.user && !cred.user.emailVerified) cred.user.sendEmailVerification(); } catch (x) {} return cred; }
    return auth.signInWithEmailAndPassword(email, pw).then(verif).catch(function (e) {
      if (e && CREATE[e.code]) {
        // On va CRÉER le compte → le mot de passe doit être confirmé (évite une faute de frappe verrouillante).
        if (pw2 != null && pw !== pw2) return Promise.reject({ code: "pat/password-mismatch" });
        // Si l'e-mail existe déjà (auth/email-already-in-use) → c'était un VRAI mauvais mot de passe (rejet propagé).
        return auth.createUserWithEmailAndPassword(email, pw).then(verif);
      }
      throw e;
    });
  }
  function resendVerification() { try { return user ? user.sendEmailVerification() : Promise.reject(); } catch (e) { return Promise.reject(e); } }
  function signOut() { return auth ? auth.signOut() : Promise.resolve(); }
  function onAuth(cb) { authCbs.push(cb); cb(user, role()); }

  window.PatFB = {
    ready: ready,
    addSubmission: addSubmission, watchSubmissions: watchSubmissions,
    addComment: addComment, watchComments: watchComments,
    setStatus: setStatus, updateSubmission: updateSubmission, deleteSubmission: deleteSubmission,
    signInEmail: signInEmail, resendVerification: resendVerification, signOut: signOut, onAuth: onAuth,
    isCredited: isCredited, emailVerified: emailVerified,
    watchModerators: watchModerators, addModerator: addModerator, removeModerator: removeModerator, isModerator: isModerator,
    watchCorrections: watchCorrections, setCorrection: setCorrection,
    role: role, user: function () { return user; }
  };
})();
