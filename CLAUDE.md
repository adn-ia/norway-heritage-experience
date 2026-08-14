# Règles de travail — HERITAGE (à lire au début de CHAQUE session)

Source de vérité : `HERITAGE-ARCHITECTURE-ET-REGLES_2026-07-23.md` (règles) et
`HERITAGE-DEVIATIONS-ET-CORRECTIONS_2026-07-23.md` (ce qu'il ne faut plus refaire).
Ce fichier est le **contrat d'exécution** : il transforme ces règles en gestes obligatoires.

## Règle d'or — PROUVER, PAS AFFIRMER

Avant de dire « c'est générique » / « c'est prêt à livrer » / « les règles sont suivies »,
je DOIS lancer **`./audit.sh`** et **coller sa sortie**. Un « oui » sans audit vert ne vaut
rien et doit être ignoré (Helmy, 23/07). Le vérificateur n'est pas le vérifié.
Idem pour tout constat : **exécuter / rendre / curl / grep** — jamais généraliser d'un cas.

## Les 4 familles de fautes à ne PLUS commettre

1. **Affirmer sans vérifier** (généraliser, dire « oui » sans audit, blâmer le cache/l'appareil).
   ➜ lancer `./audit.sh`, rendre chaque cas réel un par un, faire confiance au rapport de Helmy.
2. **Inventer / sur-interpréter la donnée** (villes, coords, dates, descriptions).
   ➜ NON-HALLUCINATION : sourcer tout (varier les sources) ; sinon placeholder + demander.
3. **Texte / valeurs en dur** au lieu de dynamique.
   ➜ tout libellé via i18n à clés (`data-i18n` + `uiT`) ; toute valeur pays via `HConf.*` avec
      repli NEUTRE (`|| 'Heritage Experience'`, jamais `|| 'Estonia Heritage'`).
4. **Improviser au lieu de cloner** le modèle (THE/MHE/RoadTrip).
   ➜ lire le fichier source de référence et cloner ; l'UI ne s'invente pas.

## Règles dures

- **UN FICHIER, UN PAYS** : pour cloner/changer de pays on n'édite que `heritage.config.js`
  (`window.HConf`). Tout le reste du code est 100 % générique. Seul le CONTENU change.
- **SOURCE DE VÉRITÉ = le dossier de travail complet** (ex. `Estonie-Heritage-Experience`),
  JAMAIS les dossiers `A-UPLOADER/` : ceux-ci sont des **deltas partiels** (uniquement les
  fichiers modifiés, pour l'upload). Auditer/éditer TOUJOURS le dossier de travail ;
  `A-UPLOADER` est la file de sortie, pas le code.
- **`vkey` UNIQUE** pour descriptions ET voix — JAMAIS le nom (les noms collisionnent :
  47 % des fiches partageaient une fausse description).
- **i18n dès la 1ʳᵉ ligne**, même en une langue ; chaque `type` du géojson traduit (garde-fou).
- **Déploiement** : la **VERSION de `sw.js` est DYNAMIQUE** — lancer **`./tamponner-sw.sh`** dans le
  dossier de l'app avant chaque upload (empreinte du contenu ; **jamais** de VERSION datée à la main).
  En silence, ne JAMAIS parler de « cache » à Helmy. Voix en ZIPS petits (~180 Mo). Ne pas joncher le
  Bureau ; pas de serveur local depuis le Bureau (révoque l'accès disque) — tester via injection/curl.
- **Éditer par `sed` large sur `heritage.config.js` = interdit** (a déjà corrompu la config).
- Vérifier la **date/heure réelles** à chaque session.
- **Docs de règles = source UNIQUE, dérive refusée par la machine.** Les 2 grands MD
  (`HERITAGE-ARCHITECTURE-ET-REGLES_*.md` = règles, `HERITAGE-DEVIATIONS-ET-CORRECTIONS_*.md`
  = journal cumulatif de la gamme) voyagent embarqués dans chaque clone POUR l'autonomie, mais
  `audit.sh` (section 9) compare l'empreinte locale au **hash canonique** → **rouge** si divergence.
  Il n'y a donc **qu'une vérité** (le canonique) ; les copies sont des miroirs *vérifiés*, jamais
  une 2ᵉ version silencieuse.
- **Changer une règle = UN SEUL chemin autorisé** : ① éditer le **canonique** (les 2 MD master à la
  **racine du Bureau** ; le journal : on **APPEND** au canonique, jamais à une copie) ; ② lancer
  **`./propager-regles.sh`** depuis le socle. Il recalcule les hash, met à jour l'audit canonique,
  puis **propage le corps d'audit + les 2 docs à TOUS les clones** (chacun garde son bloc CONFIG-PAYS),
  relance l'audit partout et **prouve la complétude** (rouge = exit ≠0). **Ne JAMAIS éditer une copie
  embarquée à la main**, ni coller un hash à la main — la dérive serait silencieuse.
  *(Limite assumée : ne balaie que les clones sous `~/Desktop/*/` ; un clone archivé ailleurs n'est pas
  touché — hors usage actif, on ne fait pas de registre central = sur-ingénierie.)*

## Ce que la machine refuse

```bash
./audit.sh      # anti-fuite pays, checkout/iso en dur, manifest, node --check, vkey unique,
                # + §9 anti-dérive des docs de règles (hash canonique)
```

`audit.sh` sort en non-zéro s'il détecte une fuite OU une dérive de doc → signal clair de NE PAS livrer.
Adapte le bloc CONFIG en haut d'`audit.sh` au pays audité (termes, iso, checkout). Après toute MAJ
d'un doc de règles : régénérer `DOC_*_SHA` (`shasum -a 256 …`) et re-propager.

## Étendre

Chaque fois qu'une règle peut être vérifiée par une machine, en faire un test dans
`audit.sh` (ou un script `.enrichissement/`) plutôt qu'une consigne qui dépend de ma bonne foi.
