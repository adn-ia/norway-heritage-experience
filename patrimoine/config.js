/* ═══════════════════════════════════════════════════════════════════════
   PATRIMOINE — sous-application AUTONOME (infrastructure PROPRE).
   Aucun lien avec l'app principale : ni the-pass.js, ni the-i18n.js, ni
   heritage.config.js, ni aucune fonction payante. Elle a SA config, SON i18n,
   SES scripts, SES styles, SA donnée (l'import INP, exclusive).
   ─────────────────────────────────────────────────────────────────────────
   SEUL bloc à adapter par édition (marque / email INP / langues / carte).
   Repli neutre partout : jamais de nom de pays en dur dans le code.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
  window.PAT = {
    marque:      "",                 // marque courte de l'édition (repli neutre → 'Patrimoine')
    langs:       ["fr","en"],        // langues de la sous-app (au départ = celles de l'édition)
    defaultLang: "fr",
    dataSites:   "data/inp_sites.json",     // donnée EXCLUSIVE : tous les sites (import INP)
    dataClasses: "data/inp_classes.json",   // donnée EXCLUSIVE : monuments classés (import INP)

    // ─── Contribution / feed partagé (Firebase PROPRE à la sous-app) ───
    notifyEmail:   "",   // adresse de notification (institution/référent) — À REMPLIR le moment venu
    notifyWorker:  "",   // URL du Worker Cloudflare d'e-mails (vide = aucun e-mail tenté) — voir patrimoine-notify-worker/
    uploadWorker:  "",   // URL du Worker d'upload photo R2 (vide = champ lien seulement) — voir patrimoine-upload-worker/
    scanWorker:   "",   // URL du Worker scan anti-copie (vide = pas de scan) — voir patrimoine-scan-worker/
    contactEmail:  "",   // adresse de contact affichée dans les mentions (page À propos) — vide = « — »
    adminEmail:    "helmymekaoui@gmail.com",   // Mère : copie des notifications + rôle admin
    expertEmails:  [],   // référents (chercheurs/historiens reconnus) — plusieurs possibles, rôle valideur
    expertDomains: [],   // domaines de référents admissibles — vide = aucun référent
    firebase: {       // config web du projet Firebase DÉDIÉ (publique) — À REMPLIR après création
      apiKey: "", authDomain: "", projectId: "", storageBucket: "", messagingSenderId: "", appId: ""
    },
    // Décoration : petits motifs évocateurs de l'édition (discrets, pilotés par config → générique).
    motifs: [],   // ex. THE : ["🏛️","🕌","🫒","🏖️","⛰️"] — vide = pas de décor
    // Valeurs du champ `etat` (donnée INP) considérées « en péril ». Servent au FILTRE,
    // pas à l'affichage (l'affichage passe par i18n). Ce sont des clés de donnée, pas du texte UI.
    perilStates: ["Mauvais","Détruit","Disparu","Non retrouvé","Non trouvé","Mauvais/Réemploi","Immergé","Site immergé"]
  };
})();
