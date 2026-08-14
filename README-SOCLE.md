# HERITAGE-SOCLE — base de clonage de la gamme

> **Ce dossier est LE socle générique.** Il contient **le code 100 % générique** de la gamme
> Heritage (THE / MHE / EHE / QHE / Estonia…) **sans aucune donnée de pays**.
> On ne développe PAS dedans : on le **copie** pour créer une nouvelle édition.
>
> Extrait le **2026-07-23** de l'app la plus à jour (`Estonie-Heritage-Experience`), après la
> neutralisation « un fichier, un pays » (tout passe par `HConf`). Poids ~21 Mo (aucune voix,
> aucune image de pays).

## Créer une nouvelle édition (pays) en 4 gestes

1. **Copier** ce dossier → `NouveauPays-Heritage-Experience/`.
2. **Éditer `heritage.config.js` SEUL** : remplir `iso`, `domaine`, `marque`, `marqueCourte`,
   `carte{lat,lon,zoom}`, `exportNom`, `checkout`, `tip`, `description`, `cloudflare`,
   **`pays{fr,en}`**, **`langueNat{fr,en}`**, **`endonyme`**, **`androidPackage`**,
   **`androidFingerprints`** (les 2 empreintes SHA — SEULES valeurs externes).
   → **Rien d'autre dans le code à toucher.** Les libellés `ui.*.json` s'**interpolent à
   l'exécution** depuis ces champs (`__MARQUE__`, `__PAYS__`… remplis par `the-i18n.js`).
3. **`./materialiser.sh`** : remplit les fichiers **statiques** (sitemap/robots/assetlinks/
   bloc CONFIG d'`audit.sh`) depuis `heritage.config.js` — les crawlers/Android les lisent bruts.
4. **Déposer les données** du pays (voir « Ce qui est vide » ci-dessous).
5. **Prouver** : `./audit.sh` doit sortir **vert**. Avant chaque upload : **`./tamponner-sw.sh`**
   (VERSION dynamique). **UN FICHIER, UN PAYS** = `heritage.config.js` + ces scripts qui en dérivent tout.

## Ce qui est GÉNÉRIQUE (ne pas toucher — vaut pour tous les pays)

- Toutes les pages `*.html` et scripts `*.js` (moteur, i18n, carte, itinéraire, carnet, voix…).
- `ui.fr.json` / `ui.en.json` (interface) — traductions d'interface, communes.
- Icônes/logos de marque (`icon-*`, `logo-the.png`, `logo-threshold.png`, `apple-touch-icon.png`).
- `manifest.json` (neutre ; le vrai manifest est **généré** par `heritage.config.js`).
- `audit.sh`, `CLAUDE.md` (contrat d'exécution).

## Ce qui est VIDE / gabarit (à remplir par pays — données)

| Fichier / dossier | Rôle | État socle |
|---|---|---|
| `sites.geojson`, `sites-nature.geojson` | fiches du pays (clé `vkey` **unique**) | `FeatureCollection` vide |
| `i18n/fr.json`, `i18n/en.json` | descriptions par `vkey` + traduction des `type` (`cat`) | `{cat:{}, sites:{}}` |
| `en.json` (racine) | dictionnaire des `type` → EN | `{cat:{}}` |
| `tours.json`, `tours.en.json`, `i18n/tours.en.json` | circuits | `{}` |
| `recit.fr.json`, `recit.en.json` | narration « Découvrir » | gabarit à trous |
| `chefs-lieux.json` | chefs-lieux/coords (sourcés) | `{chefs_lieux:{}}` |
| `gastronomie.json`, `photos.json` | gastronomie / galerie | vides |
| `voix/` | MP3 par `vkey` (edge-tts) | vide + `README-VOIX.txt` |
| `img/hero.jpg` | photo d'accueil du pays | **à déposer** (`README-IMG.txt`) |
| `langs.json`, `i18n/langs.json` | langues offertes | **FR + EN** (ajouter la langue nationale) |
| `robots.txt`, `sitemap.xml` | SEO par-domaine | `__DOMAINE__` à remplacer |
| `heritage.config.js` | **LA config du pays** | modèle à trous |

## Règles dures (rappel — détail dans `CLAUDE.md`)

- **Un fichier, un pays** ; **prouver, pas affirmer** (`./audit.sh` vert avant de livrer).
- **`vkey` unique** pour descriptions ET voix (jamais le nom : les noms collisionnent).
- **Zéro texte/valeur en dur** : libellés via i18n à clés ; valeurs pays via `HConf.*` avec
  **repli neutre** (`|| 'Heritage Experience'`, jamais `|| 'Estonia Heritage'`).
- **Non-hallucination** : jamais inventer villes/coords/faits — sourcer, sinon placeholder + demander.

## Ce qui a été retiré à l'extraction (spécifique Estonie)

Langue nationale `et` (fichiers `*.et.json`), `Estonie-images/`, `voix/` (contenu),
`img/hero.jpg`, `googleaee…​.html` (vérif Google du domaine), sauvegardes `*.bak*`,
et toutes les valeurs Estonie (config, SEO, audit) → remises à un état neutre.
