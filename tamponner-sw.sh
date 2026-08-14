#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tamponner-sw.sh — VERSION de sw.js DYNAMIQUE (empreinte du contenu).
# Fini le « bump à la main » daté : on lance CE script dans le dossier de l'app
# AVANT d'uploader. VERSION = 'heritage-<hash8>' où hash8 = empreinte de :
#   le corps de sw.js (hors sa ligne VERSION) + le contenu de TOUS les assets
#   locaux réellement précachés (CORE_ASSETS).
# → Même contenu = même version (aucun re-cache inutile) ; un fichier précaché
#   change = version change automatiquement. La machine s'en occupe, pas la mémoire.
# ─────────────────────────────────────────────────────────────────────────────
set -u
SW="sw.js"
[ -f "$SW" ] || { echo "❌ pas de sw.js ici — es-tu dans le dossier de l'app ?"; exit 2; }

# 1) assets LOCAUX précachés (dans le tableau CORE_ASSETS ; on retire les URL http(s))
locals=$(awk '/CORE_ASSETS/{f=1} f{print} f&&/\];/{exit}' "$SW" \
  | grep -oE "'[^']+'" | tr -d "'" | grep -vE '^https?://')

# 2) empreinte = sw.js SANS sa ligne VERSION  +  contenu de chaque asset local existant
H=$( { grep -vE "^const VERSION" "$SW"
       for f in $locals; do [ -f "$f" ] && cat "$f"; done
     } | shasum -a 256 | cut -c1-8 )

NEWVER="heritage-$H"
OLD=$(grep -oE "^const VERSION = '[^']*'" "$SW" | sed -E "s/.*'([^']*)'/\1/")

if [ "$OLD" = "$NEWVER" ]; then
  echo "✓ sw.js déjà à jour (VERSION=$NEWVER) — contenu inchangé, rien à faire."
  exit 0
fi
sed -i '' -E "s|^const VERSION = '[^']*';|const VERSION = '$NEWVER';|" "$SW"
node --check "$SW" 2>/dev/null || { echo "❌ sw.js cassé après tampon — abandon."; exit 2; }
echo "✓ VERSION : ${OLD:-<absente>}  →  $NEWVER   (empreinte du contenu, $(echo "$locals" | grep -c . ) assets locaux)"
