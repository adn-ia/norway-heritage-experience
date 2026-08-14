# HERITAGE — ARCHITECTURE & RÈGLES ABSOLUES
> Document maître, daté **2026-07-23**. À **relire au début de CHAQUE session** avant de toucher à une édition Heritage (Estonia, THE/Tunisie, MHE/Maroc, EHE, QHE…).
> Objectif : **tout est dynamique**, **zéro fuite pays-spécifique dans le code**, **un seul fichier à éditer par pays**.
> Complète (ne remplace pas) les mémoires : `feedback-un-fichier-un-pays`, `versions-heritage-reference` (RÈGLE D'OR), `feedback-jamais-inventer-donnees`, `feedback-jamais-texte-en-dur-i18n`, `heritage-themes-transversaux-vs-pays`.

---

## 0. LA RÈGLE FONDATRICE — « UN FICHIER, UN PAYS »
Pour **cloner / changer de pays**, on n'édite QU'UN SEUL fichier de code : **`heritage.config.js`** (exposé en `window.HConf`).
Tout le reste du **code** (`*.html`, tous les `*.js`, `manifest.json`) doit être **100% générique**.
Seul le **CONTENU (données)** change : `sites.geojson`, `sites-nature.geojson`, `i18n/*.json`, `tours.json`, `voix/`, images.

> ⚠️ **NE JAMAIS répondre « oui, c'est générique » sans AVOIR LANCÉ L'AUDIT.** Un oui non prouvé ne sert à rien (Helmy, 23/07).

### Ce qui reste FORCÉMENT par-déploiement (ce n'est PAS du code)
- `sitemap.xml` et `robots.txt` : lus par les **crawlers SEO qui n'exécutent PAS le JS** → le domaine doit y être en dur. Inévitable. (Régénérables au build depuis la config.)
- Les **données** (géojson, i18n, tours, voix, images) : c'est le contenu, il change par nature.
- `heritage.config.js` lui-même : c'est LE fichier de config par pays.

---

## 1. `heritage.config.js` = LA CONFIG UNIQUE (window.HConf)
Champs actuels et ce qu'ils pilotent :
| Champ | Rôle |
|---|---|
| `iso` | code pays (ex. "ee") → géocodage countrycodes, préfixe IAP App Store |
| `domaine` | domaine du site → canonical réécrit par le loader |
| `marque` | nom complet → titre album, GPX creator, manifest name, pc-brand |
| `marqueCourte` | nom court → apple-title, mailto, partage, manifest short_name |
| `carte` `{lat,lon,zoom}` | centre/zoom de la carte |
| `cloudflare` | token Web Analytics (vide = désactivé) ; lu par `analytics.js` |
| `exportNom` | préfixe des fichiers exportés (GPX/KML) |
| `checkout` | URL Lemon Squeezy abonnement (mur premium web) |
| `tip` | URL Lemon Squeezy pourboire |
| `description` | description PWA (manifest) |

### Le LOADER (dans heritage.config.js) — injecté EN PREMIER dans le `<head>`
Il réécrit dynamiquement au chargement :
1. `<link rel="canonical">` = `https://{domaine}/{page}`
2. `<meta apple-mobile-web-app-title>` = `marqueCourte`
3. `<meta pc-brand>` = `marqueCourte`
4. (Cloudflare géré par `analytics.js` qui lit `HConf.cloudflare`)
5. `document.documentElement.lang` = langue courante (`the_lang`) → plus de `<html lang="fr">` en dur
6. **manifest PWA DYNAMIQUE** : construit un Blob manifest depuis HConf (name/short_name/description/lang) et remplace `<link rel="manifest">`. → `manifest.json` statique est GÉNÉRIQUE (fallback neutre « Heritage »).

---

## 2. COMMENT RENDRE DYNAMIQUE (patterns à appliquer)
- **Toujours** lire une valeur pays via `HConf`, avec repli **NEUTRE** (jamais un nom de pays) :
  ```js
  (window.HConf && HConf.marque) || 'Heritage Experience'   // ✅ repli générique
  ```
  ❌ JAMAIS : `... || 'Estonia Heritage'` (le repli nomme un pays = fuite).
- **Échelle « nationale »** des circuits : clé **NEUTRE `pays`** (jamais `Estonie`). Le code trouve la clé pays via `CPKEY = Object.keys(PERIM).find(k=>k!=='ville'&&k!=='region')`. `tours.json` : `echelle` ∈ {`ville`,`region`,`pays`}.
- **IAP / checkout / tip** : `HConf.iso` / `HConf.checkout` / `HConf.tip`, jamais l'ID en dur.
- **Commentaires** : neutres (« /* Heritage — … */ », pas « /* Estonie Heritage */ »).
- **Textes visibles** : JAMAIS en dur → toujours i18n (voir §4).

---

## 3. MÉTHODE D'AUDIT ANTI-FUITE (à lancer AVANT de confirmer « générique »)
Depuis le dossier de l'app :
```bash
# (a) identité pays en dur dans le CODE (nom/coord/iso/marque/checkout) — doit être VIDE :
grep -rn "Estonie\|Estonia\|Tallinn\|Eesti\|58\.6\|25\.5\|e21c2545\|c79c3a3e" *.html *.js \
  | grep -viE "heritage.config.js|\.json:|HConf|//|/\*"
# (a bis) repli iso non-neutre — COUVRIR LES DEUX GUILLEMETS (' ET ") :
grep -rnE "HConf\.(iso|checkout|tip)[^|]*\|\|[[:space:]]*['\"][^'\"]" *.html *.js
# (b) le code ne lit QUE HConf.* :
grep -rhoE "HConf\.[a-zA-Z]+" *.html *.js | sort -u
# (c) manifest générique ? (doit ne PAS contenir le pays) :
grep -i "Estonia\|Estonie" manifest.json
# (d) node --check sur tous les .js
```
Adapter les mots-clés au pays audité (Estonie→Tunisie, etc.).

> **⚠️ Règle de robustesse des greps (leçon 10d, 23/07).** Tout motif anti-fuite doit couvrir
> **les deux types de guillemets** `'` **et** `"` — une classe `['\"][^'\"]`, jamais `'…'` seul.
> Un `|| "ee"` en guillemets doubles a échappé à la regex qui ne testait que `|| 'ee'`.
> Et **tester le vérificateur lui-même** : lancer le check contre un cas qui **doit** échouer,
> confirmer qu'il échoue, avant de lui faire confiance. Le contrôleur n'est pas exempté de contrôle.
> `audit.sh` (section 3) applique déjà cette classe durcie.

---

## 4. LES AUTRES RÈGLES ABSOLUES (toutes obligatoires)

### 4.1 NON-HALLUCINATION (règle #1)
Jamais inventer une donnée (ville, coord, date, chiffre, liste, description). Si on ne sait pas : placeholder + demander, ou ne rien affirmer. Sourcer TOUT (Wikipédia, Wikidata, OSM, registres officiels, Visit-X, DATAtourisme, Europeana…). **Varier les sources** (pas que Wikipedia).

### 4.2 ZÉRO TEXTE EN DUR → i18n  *(rien n'est en dur, JAMAIS)*
Tout libellé passe par le moteur i18n : `data-i18n="clé"` (+ `-html`/`-placeholder`/`-title`/`-aria`) + `ui.<lang>.json` ; le code appelle `uiT('clé')`. Même en une seule langue. Une chaîne visible en dur = ligne rouge.
- **Ça couvre TOUT ce qui est visible OU envoyé** : libellés, placeholders, `alt`/`aria`/`title`, ET le **corps des e-mails** qu'un formulaire génère (sujet + libellés de champ + pied) → clés dédiées (ex. `patrimoine.mail.*`). Piège vécu 26/07 : le mailto de `contribuer.html` était en français en dur.
- **Les VALEURS d'édition** (email de contact, URLs, marque, iso…) ne sont JAMAIS en dur dans le code générique : elles passent par **`HConf.*`** avec repli **vide/neutre**. Ex. `var CONTACT_EMAIL = (window.HConf && HConf.patrimoineEmail) || '';`. La valeur pays vit **uniquement** dans `heritage.config.js`. (Un plugin générique lit HConf — il ne code jamais l'adresse/le pays en dur.)
- **Test machine anti-dérive** : rendre la page **en EN** et traquer tout résidu français → tout ce qui reste français est du texte en dur (0 résidu attendu). Ne dire « c'est propre » qu'après ce test (voir 4.9).
- **Attention DeepL** : `tag_handling=html` préserve les balises mais peut déplacer `<small>`/`<b>` et traduire « site » en « website » — désambiguïser la source (« site patrimonial ») et vérifier après coup.

### 4.3 GARDE-FOU i18n des TYPES (anti-fuite FR)
Chaque valeur de `type` (géojson) doit avoir sa traduction dans le dico `cat` de chaque langue non-FR. Script : `.enrichissement/audit_types_i18n.py` → doit être VERT avant toute livraison. Lit `sites.geojson` + `sites-nature.geojson`.

### 4.4 CLÉ UNIQUE = `vkey`, JAMAIS le nom
Les noms génériques estoniens collisionnent (kivikalme, kaabas, kalmistu… → 47% des fiches partageaient une desc !). **Descriptions ET voix clés par `vkey`** (unique). L'app lit `THEi18n.site(p.vkey)`. `vkey` = slug(nom)+regnum (à-voir) ou slug(nom)+hash(nom+coord) (transversaux). Voir `.enrichissement/rebuild_i18n_by_vkey.py`.

### 4.5 THÈMES
- **Dérivés du contenu** de CHAQUE pays (jamais une liste plaquée), filtre ≥3 sites (`themeViable`).
- **4 thèmes TRANSVERSAUX communs** à toutes les éditions, **dynamiques** (apparaissent SEULEMENT si data) : **Nature · Musée · Festival · Marché/Brocante**. Les catégories dérivées (les 6 de l'Estonie) restent propres à chaque pays.
- **Menu « Thème » UNIQUE** (même déroulant sur liste ET carte) : Tout · [transversaux avec data] · [catégories patrimoine avec data]. Générique : chaque option n'apparaît que si data.

### 4.6 STRUCTURE PARTAGÉE
Structure/code identique pour toutes les éditions. MAJ structure → propagée à toutes. MAJ contenu → contenu seul. (RÈGLE D'OR, mémoire `versions-heritage-reference`.)

### 4.7 DÉPLOIEMENT
- **Bump `sw.js`** (VERSION) à chaque MAJ de page précachée (sinon les correctifs n'atteignent pas les visiteurs récurrents). NE JAMAIS parler de cache à Helmy — régler en silence.
- JSON (i18n, geojson, tours) servis **network-first** → frais en ligne sans bump.
- Livraison : dossier daté `~/Desktop/A-UPLOADER/<App>-<desc>_EST-NNN_date_heure/` + `A-UPLOADER.txt` (cible + ordre) + marqueur `_ref` vérifiable (`curl .../i18n/fr.json | grep EST-NNN`). Seulement les fichiers modifiés, **en MIROIR de la structure serveur** (les `i18n/*.json` vont dans un sous-dossier `i18n/`, jamais à plat). Index `A-UPLOADER/_OU-EST-QUOI.txt` à tenir à jour.
- **MAJ qui touche plusieurs apps** : UN seul dossier daté avec **un sous-dossier par appli** (ex. `Estonia/`, `THE/`… ; `SOCLE-canonique-NE-PAS-UPLOADER/` pour la traçabilité). Toujours MESURER avant : ne mettre que les apps réellement modifiées.
- **Cycle de rangement anti-dérive** : (1) delta daté → racine `A-UPLOADER/` ; (2) une fois **uploadé par Helmy**, le glisser dans `A-UPLOADER/_FAIT/` (supersédé → `_FAIT/_superseded/`) et marquer l'index ; (3) **régénérer le zip complet daté** de l'app dans `~/Desktop/DERNIERES-VERSIONS/` (`<App>_TOTAL_..._date.zip`) — sinon ce dossier ment (piège vécu 27/07 : zips 3-4 jours de retard). Le zip complet = code+img, **jamais** confondu avec les deltas partiels.
- **Voix** : `voix/fiches/<vkey>-<lang>.mp3`, edge-tts (fr-Denise/en-Sonia/et-Anu), voix = nom + description. Générer par lots, **manifeste de hash** (`voix/manifest.json`) pour l'incrémental. **Uploader en ZIPS PETITS** (~180 Mo, jamais 1,4 Go → extraction serveur échoue = 0 octet). Garder `voix/decouvrir-*.mp3`.

### 4.8 NE PAS JONCHER LE BUREAU
Ne pas déplacer les fichiers perso de Helmy. Gérer seulement mes dossiers `A-UPLOADER/`. Ne jamais lancer de serveur local depuis le Bureau (révoque l'accès disque macOS) — tester via injection Chrome ou vérif en ligne (`curl`).

### 4.9 AVANT DE CONFIRMER : PROUVER
Vérifier la date/heure réelles à chaque session. Regarder le VRAI visuel (ne jamais généraliser d'un cas). Débugger l'évident d'abord (exécuter le vrai code). **Ne jamais dire « oui » sans preuve.**

### 4.10 PLUGINS — rangement & différenciation
Les modules réutilisables (ex. la veille citoyenne « patrimoine ») vivent dans **`~/Desktop/Plugins/`**, hiérarchie **Gamme / Pays / Thème / FONCTION** :
```
Plugins/ Heritage/ Tunisie/ patrimoine/ veille-citoyenne/
                                          ├── Fichiers/   (contribuer.html, i18n/patrimoine.*.json, INSTALL.md)
                                          └── <Nom-évocateur>_v<n>_<date>.zip
```
- **Différenciation par la FONCTION, jamais le thème seul** : `patrimoine` = famille (plusieurs plugins possibles) ; `veille-citoyenne` = LE plugin (unique). Futurs : `patrimoine/realite-augmentee/`, `…/reconstitution-3d/` — zéro collision. Même plugin, autre pays → sous son pays (`Maroc/patrimoine/veille-citoyenne/`).
- Chaque plugin porte **ses propres clés i18n** (namespace, ex. `patrimoine.*`) + un **`INSTALL.md`** (gestes d'intégration : fusionner l'i18n, ajouter la valeur pays dans `HConf`, câbler menu/CTA, précacher). Code du plugin = **générique** (lit `HConf`, 0 valeur en dur — cf 4.2).
- Convention figée dans `Plugins/_CONVENTION.md`. Zip = nom évocateur + `_v<n>_` + date (la version différencie les révisions).

### 4.11 RÈGLE SOCLE — TOUT AJOUT = UNE BRIQUE AUTO-PORTÉE (STRICT)
Toute nouvelle fonctionnalité ajoutée au socle **DOIT** être une **brique auto-portée au
sens STRICT** : un module (`brique-<fonction>.js`) **générique et IDENTIQUE partout** qui
**embarque TOUTE sa machinerie + SON i18n + SA donnée**. Il **n'emprunte RIEN à l'hôte pour
son contenu** : ni `the-i18n.js`, ni `i18n/<lang>.json` (`ui.*`), ni `sites.geojson`. Toutes
ses traductions (fr, en et la/les **nationale·s**) vivent dans **`brique-<fonction>.data.json`**
(par édition), jamais dans l'hôte.
- **Ce qu'il lit de l'hôte, au plus** : `HConf` (config pays, 0 valeur en dur — cf 4.2) et la
  **préférence de langue** `localStorage 'the_lang'`. **Langue = celle décidée par l'hôte** ;
  si absente de SA donnée → **repli ANGLAIS** (pivot obligatoire → tout contenu existe au moins
  en `en`). Jeu de langues de la gamme = **FR + EN + nationale** ; **THE = exception à 5**.
- **Seul contact hôte incontournable** : la balise `<script src="brique-<fonction>.js">` + les
  **ancres/éléments** qu'elle vise (`data-brique="<fonction>"`, ou p. ex. des éléments de menu
  pour un *tour*). **Dégradation propre** si une cible manque : la brique **se masque / saute
  l'étape**, jamais d'erreur.
- **Opt-in par édition** : une brique peut être **absente** d'une édition (elle en a d'autres).
  La **règle** est universelle ; le **plugin** ne l'est pas. Options via SA donnée (ex.
  `_config.premium`). MAJ = **remplacer SON/SES fichier(s)**, jamais toucher l'hôte ni une autre brique.
- **But** : bosser chaque fonction (réalité augmentée, reconstitution 3D, légende, note, contact…)
  **séparément, sans patauger** dans le reste. **Interdit** d'entrelacer une fonction dans le
  code partagé — on crée une brique.
- **Rangement** : code générique DANS `HERITAGE-SOCLE/` (self-hide si pas de donnée) **ET**
  source versionnée au registre **`Plugins/Heritage/_socle/<fonction>/`** (`Fichiers/{brique-*.js,
  brique-*.data.json, INSTALL.md}` + zip). La **donnée** est par édition, jamais dans le code.
- Briques socle en place : **`legende`** (`brique-legende.js` — légende/mythe/événement d'un
  site, opt-in premium), **`note-app`** (`brique-note.js` — notation App Store/Play),
  **`contact`** (`brique-contact.js` — signalement / écrire à l'éditeur). *(note/contact = v2
  STRICT depuis le 30/07 : i18n déportée de l'hôte vers leur donnée.)*

### 4.12 ESTONIA = MIROIR DU SOCLE (mise à jour OBLIGATOIRE, en lockstep)
Estonia (`~/Desktop/Estonie-Heritage-Experience/`) est la **SEULE édition 100 % compatible socle**
(le socle en a été extrait). **RÈGLE : toute modification du socle DOIT être répercutée sur Estonia
dans le même mouvement — c'est OBLIGATOIRE.** Socle et Estonia bougent en **lockstep** : même
code/machinerie ; seuls le bloc CONFIG-PAYS, le contenu et la langue `et` diffèrent.
- Ne jamais livrer une évolution du socle sans avoir **mis Estonia à jour** ET relancé son
  `./audit.sh` (**VERT**).
- Les autres éditions (**THE / MHE / EHE / QHE** = Family A, en dur) **ne suivent PAS**
  automatiquement : leur migration vers le socle reste différée (§7) ; on ne leur ajoute une
  brique **qu'au cas par cas**, en connaissance de leur divergence.

---

## 5. ARCHITECTURE DES DONNÉES (contenu par pays)
- `sites.geojson` : lieux patrimoine + transversaux (categorie ∈ patrimoine/musee/marche/festival). Chaque feature : `nom, type, categorie, region, photo, source, vkey, keep, qid, regnum…`.
- `sites-nature.geojson` : lieux nature (categorie=nature).
- `i18n/fr.json|en.json|et.json` : `{_ref, cat:{type→trad}, sites:{ vkey:{d:description} }}`.
- `i18n/ui.<lang>.json` : libellés d'interface (clés `data-i18n`), + `theme.*`.
- `tours.json` (FR) + `i18n/tours.<lang>.json` : circuits `{titre,soustitre,duree,echelle,depart,forme,note,etapes:[{nom,note}]}`.
- `voix/fiches/<vkey>-<lang>.mp3` + `voix/decouvrir-<lang>.mp3` + `voix/manifest.json`.
- `niveau(p)` : keep=0→registre (masqué) ; sinon photo?1(à voir):2(notable). Occulté = sans photo ET sans texte.

### 5.1 FICHIERS PAR-DOMAINE / LÉGAL (génériques, valeurs par pays)
- **`confidentialite.html`** : politique de confidentialité RGPD (URL exigée par Apple/Google au dépôt).
  Générique : éditeur (Helmi Mekaoui / Threshold-Analytics), prestataires (Lemon Squeezy/Apple/Google),
  APD Belgique = **constants de la gamme** ; le **nom d'app** est injecté depuis **`HConf.marque`**
  (jamais en dur — sinon l'audit §1 sort rouge). `noindex`. ⚠️ **Dette : page FR-only, non i18n**
  (à traduire EN/langue nationale un jour). N'est pour l'instant **liée nulle part ni précachée** (sw.js).
- **`.well-known/assetlinks.json`** : Digital Asset Links Android (TWA). **PAR-APP** → gabarit dans le
  socle (`__PACKAGE_NAME__`, `__SHA256_PWABUILDER__`, `__SHA256_PLAY_APP_SIGNING__`). Déployé à
  `https://<domaine>/.well-known/assetlinks.json`. **Garder les DEUX empreintes** (PWABuilder + Play App
  Signing), sinon la TWA affiche la barre Chrome en prod. (iOS universal links : `apple-app-site-association` ici si besoin.)

---

## 6. ÉTAT ESTONIA au 2026-07-23 (référence)
EN LIGNE : EST-003→EST-011 (musées, 341 desc À-voir, 21 circuits, 4 transversaux Nature804/Musée386/Marché39/Festival15, menu Thème unifié, **fix collision vkey**).
Prêts à uploader : **EST-012** (5 736 voix corrigées, 6 zips), **EST-014** (généricité « un fichier »).
Reste : uploader EST-012/014 · Cloudflare (geste Helmy) · vérifs.
Détail vivant dans `A-LIRE_SUITE-ESTONIE.md`.

---

## 7. RESTE À FAIRE — mise à niveau des autres éditions (DIFFÉRÉ)
> Décidé le **2026-07-23** : le **socle `~/Desktop/HERITAGE-SOCLE/`** (architecture HConf, extrait
> d'Estonie) est **la base canonique sanctionnée** de la gamme. Les prochains clones en partent.
> La remise à niveau des éditions existantes est **différée** — à reprendre plus tard, dans l'ordre :

1. **Refactorer chaque édition vers HConf** (« un fichier, un pays »), comme l'Estonie :
   - `Threshold/Projets-Threshold/Heritage-Squelette` — **ancien** squelette `{{PAYS}}` (6 juillet),
     **remplacé de fait par HERITAGE-SOCLE** → à **archiver** pour lever l'ambiguïté (deux squelettes).
   - `Threshold/Projets-Threshold/Quebec-Heritage` (QHE) — pays « Trésors du Québec » **en dur**.
   - `_MHE-analyse/MHE-git` (MHE / Maroc) — pré-HConf.
   - **THE** (Tunisia) et **EHE** (Europe, 5 pays) — pas de dossier de travail complet à jour repéré
     sur le Bureau au 23/07 (seulement deltas dans `A-UPLOADER/` + wrappers iOS dans `Threshold/`).
     **Localiser le dossier de travail canonique de chacune** avant toute action.
2. **Installer l'`audit.sh` durci + `CLAUDE.md`** comme **référence commune** dans chaque édition,
   en adaptant le bloc CONFIG par pays (`COUNTRY_TERMS`, `ISO`). Lancer `./audit.sh` dans chacune et
   **coller la sortie** (prouver, pas affirmer). ⚠️ Aujourd'hui elles sortiraient **rouge** (jamais
   mises à niveau) — c'est attendu : l'audit sert alors d'**état des lieux chiffré** du travail restant.
3. **Ne rien déclarer « générique »** sur une édition sans **audit vert** prouvé.
4. **Par édition, ajouter/rendre génériques** (comme fait sur Estonie/socle le 23/07) :
   - **`confidentialite.html`** : nom d'app via `HConf.marque` (jamais en dur). Vérifié 23/07 :
     **MHE** (`MHE-git`, title « MHE — Confidentialité ») et le vieux **`Estonia-Heritage-v2`**
     (traîne carrément la page **de MHE**) sont hardcodés ; **QHE** n'en a **aucune**.
   - **`.well-known/assetlinks.json`** (TWA) : **manquant sur QHE et MHE** — à créer par-app
     (package + 2 empreintes SHA). `.htaccess` : présent partout ✓.
   - Rappel : ces pages/fichiers en ligne côté éditions ne seront corrigés qu'au moment de leur
     mise à niveau (ex. Estonie en ligne a encore la `confidentialite.html` hardcodée au 23/07 →
     delta prêt dans `A-UPLOADER/Estonia-confidentialite-generique_*`).

*(Point ouvert, non commencé. Ne pas confondre avec l'Estonie/socle, déjà HConf + audit vert.)*

---
*Ce document est la source de vérité des règles Heritage. Le mettre à jour si une règle évolue.*
