# CORRECTIONS PORTÉES PAR LE SOCLE

Journal des corrections **déjà intégrées au socle**. Un clone fait à partir d'ici les a toutes.
Ne pas les refaire, ne pas les défaire. Ajouter en tête à chaque nouvelle correction.

---

## 15 août 2026 — Le mur de navigation retiré

**Règle posée par Helmy :** un essai actif ne doit JAMAIS masquer le paywall ; un essai fini ne
doit JAMAIS masquer la navigation.

**Ce qui n'allait pas.** `the-pass.js` → `gate()` faisait `location.replace('premium.html')` dès
l'essai terminé. `gateAllow` ne laissait passer que bienvenue, decouvrir, premium, soutien et
les pages légales : **10 pages sur 18 étaient coupées**, dont la CARTE, la LISTE et
l'ITINÉRAIRE. Le paywall n'offrait aucun retour. L'application ne paraissait pas payante, elle
paraissait cassée.

Symétriquement, `decouvrir.html` — le menu principal — **ne contenait aucun lien vers
`premium.html`**. Le paywall n'était atteignable que depuis la carte, la liste, l'itinéraire et
bienvenue : c'est-à-dire, après l'essai, depuis des pages devenues inaccessibles.

**Ce que ça a coûté.** Les trois motifs de rejet Apple d'août 2026 viennent de là :
- Irlande, *2.1(b)* ×2 : « we cannot locate the In-App Purchases » — pendant l'essai tout est
  débloqué et le menu ne mène pas au paywall, le testeur ne le voit jamais.
- Portugal, *2.1(a)* : « when tapped on the List… could not proceed further and could not
  return to the previous menu. Upon further launch, the app contents did not load. » — après
  l'essai, le mur renvoie au paywall et coupe tout.

**Correction.**
1. `the-pass.js` : `gate()` ne redirige plus, elle est vide. Conservée pour ne pas casser
   l'ordre d'appel et pour rester le point d'accroche d'un futur bandeau non bloquant.
2. `decouvrir.html` : entrée « 💛 Le Premium » ajoutée au menu, toujours visible, avant
   l'entrée hors-ligne. Clés `menu.premium` et `menu.premium.sub`.

**Pourquoi c'est sans risque.** Le mur faisait DOUBLON. Le verrouillage par fonction existait
déjà et couvre le modèle freemium :
- `itineraire.html` — `requirePass()`, 2 itinéraires sauvegardés maximum, circuits limités par
  `FREE_TOURS`, thèmes premium, détail et légendes en aperçu ;
- `liste.html` — détail et légendes verrouillés ;
- `index.html` — itinéraires sur mesure verrouillés ;
- `the-pass.js` — `hasFeature()`.

Ces verrous sont conservés. Seul le mur global disparaît.

**Vérifié :** `node --check` sur les 10 `the-pass.js`, `./audit.sh` vert sur le socle et les
6 éditions européennes, plus aucun `location.replace('premium.html')` nulle part.

---

## 15 août 2026 — Crédits photo : plus de « [object Object] »

`photo_credit` vaut soit une CHAÎNE (anciennes éditions) soit un OBJET
`{auteur, licence, url}` (Estonie, Norvège). Le concaténer donnait littéralement
« [object Object] », et un objet même vide étant toujours vrai, la légende s'affichait sur
toutes les fiches illustrées — 1 184 en Estonie. L'auteur et la licence des photos Wikimedia
n'apparaissaient nulle part, alors que ~207 sont en CC BY / CC BY-SA, qui imposent
l'attribution.

**Correction.** Helper `THEcredit` dans `the-i18n.js` — `text()` et `html()` — qui accepte les
deux formes et pose un lien vers la page Commons quand `url` existe. Utilisé aux trois endroits
qui affichaient le crédit brut : `index.html` (×2) et `liste.html` (×1).

---

## 15 août 2026 — Mentions légales : ne jamais faire traduire du HTML

Une valeur i18n contenant des balises se fait **tronquer à la première balise** par la chaîne
de traduction. La mention légale d'abonnement était passée de 431 caractères à 33 dans quatre
langues : **le lien EULA et la politique de confidentialité disparaissaient**. C'est le motif
du rejet Apple 3.1.2.

**Correction.** Mention en texte SANS balise (`premium.abo.legal.disclosure`) + liens EULA et
Confidentialité dans un paragraphe séparé, avec leurs propres clés, et placés **hors de
`#buyIos` et `#buyWeb`** dont le JS réécrit l'innerHTML.

⚠️ Le gabarit du socle rend ces mentions dans des **balises vides** : une clé absente n'affiche
RIEN, pas même un repli français. Après tout ajout de clé, contrôler la présence clé par clé et
langue par langue — la langue nationale est celle qu'on oublie.

---

## 15 août 2026 — Prix mis en forme selon la langue

Le prix annuel était la chaîne littérale `'14,99 €'` : un lecteur anglais voyait une virgule
décimale française. Remplacé par un montant et une devise (`HConf.prixAn`, `HConf.devise`,
replis 14.99 / EUR) mis en forme par `Intl.NumberFormat` dans la langue affichée.
`PRICE.an` est un **getter** — la langue n'est connue qu'après le chargement du dictionnaire.

---

## 15 août 2026 — Filtres de carte dérivés de l'édition

Les filtres classaient les lieux par mots-clés cherchés dans `type` : `archeolog`,
`architectural`, `historique`, `naturel sacre`. C'est le vocabulaire d'une seule édition, cloné
partout. Couverture mesurée : 2 à 24 % des lieux ailleurs, contre 100 % là où ce vocabulaire
avait été écrit.

**Correction.** `index.html` lit, dans l'ordre : ① `HConf.themes` s'il est déclaré ;
② le champ `themes` du lieu ; ③ une règle type→thème apprise sur l'édition — avec garde
d'échantillon représentatif (≥25 % du type, ≥5 cas, majorité ≥60 %), sans quoi un type
fourre-tout entraîne son thème sur des milliers de lieux ; ④ les anciens mots-clés en dernier
repli. `unesco` n'est jamais appris : c'est un attribut du lieu, pas une catégorie.

⚠️ **Reste à faire** : `itineraire.html` et `liste.html` ont chacun leur propre `CAT_DEFS` en
dur et n'ont PAS été corrigés. Carte et liste ne proposent donc pas les mêmes thèmes.
