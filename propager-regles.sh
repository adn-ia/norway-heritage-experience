#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# propager-regles.sh — LE SEUL CHEMIN AUTORISÉ POUR CHANGER UNE RÈGLE.
#
#   1. On édite le CANONIQUE = les 2 MD "master" à la RACINE du Bureau
#      (HERITAGE-ARCHITECTURE-ET-REGLES_*.md  +  HERITAGE-DEVIATIONS-ET-CORRECTIONS_*.md).
#   2. On lance CE script depuis le socle :  ./propager-regles.sh
#
# Il recalcule les empreintes, met à jour l'audit CANONIQUE, puis propage le corps
# d'audit à jour + les 2 docs à TOUS les clones (chacun garde SON bloc CONFIG-PAYS),
# relance l'audit dans chacun et PROUVE la complétude (rouge = exit ≠0).
#
# NE JAMAIS éditer une copie embarquée à la main : la dérive serait silencieuse.
#
# LIMITE ASSUMÉE : ne balaie que les clones sous ~/Desktop/*/  (heritage.config.js,
# profondeur 2). Un clone archivé AILLEURS n'est pas touché — acceptable (hors usage
# actif). Couvrir ça = un registre central = sur-ingénierie à 5 clones, on ne le fait pas.
# ─────────────────────────────────────────────────────────────────────────────
set -u

DESK="$HOME/Desktop"
SOCLE="$DESK/HERITAGE-SOCLE"
CANON_AUDIT="$SOCLE/audit.sh"          # l'audit de RÉFÉRENCE (corps canonique)

die(){ echo "❌ $1 — abandon."; [ -n "${TMP:-}" ] && rm -rf "$TMP"; exit 2; }

[ -f "$CANON_AUDIT" ] || die "audit canonique introuvable ($CANON_AUDIT)"

# noms des 2 docs = lus DANS l'audit canonique (source unique de vérité)
DOC_ARCHI=$(grep -E '^DOC_ARCHI='  "$CANON_AUDIT" | head -1 | sed -E 's/^DOC_ARCHI="([^"]*)".*/\1/')
DOC_DEVIAT=$(grep -E '^DOC_DEVIAT=' "$CANON_AUDIT" | head -1 | sed -E 's/^DOC_DEVIAT="([^"]*)".*/\1/')
CANON_ARCHI="$DESK/$DOC_ARCHI"
CANON_DEVIAT="$DESK/$DOC_DEVIAT"
[ -f "$CANON_ARCHI" ]  || die "doc canonique introuvable ($CANON_ARCHI)"
[ -f "$CANON_DEVIAT" ] || die "doc canonique introuvable ($CANON_DEVIAT)"

# 1) recalculer les empreintes des 2 docs canoniques (racine Bureau)
SHA_ARCHI=$(shasum -a 256 "$CANON_ARCHI"  | awk '{print $1}')
SHA_DEVIAT=$(shasum -a 256 "$CANON_DEVIAT" | awk '{print $1}')
echo "▶ Empreintes canoniques recalculées :"
echo "    $DOC_ARCHI  = $SHA_ARCHI"
echo "    $DOC_DEVIAT = $SHA_DEVIAT"

# 2) mettre à jour les hash dans l'audit CANONIQUE (sed ciblé, jamais large)
sed -i '' -E "s|^DOC_ARCHI_SHA=.*|DOC_ARCHI_SHA=\"$SHA_ARCHI\"|"   "$CANON_AUDIT"
sed -i '' -E "s|^DOC_DEVIAT_SHA=.*|DOC_DEVIAT_SHA=\"$SHA_DEVIAT\"|" "$CANON_AUDIT"
bash -n "$CANON_AUDIT" || die "audit canonique cassé après MAJ des hash"

# corps canonique = HEAD (jusqu'à la sentinelle CONFIG-PAYS incluse) + TAIL (de /CONFIG-PAYS incluse à EOF)
TMP=$(mktemp -d)
awk '{print} /# ===== CONFIG-PAYS/{exit}'    "$CANON_AUDIT" > "$TMP/head"
awk '/# ===== \/CONFIG-PAYS/{f=1} f{print}'  "$CANON_AUDIT" > "$TMP/tail"
{ [ -s "$TMP/head" ] && [ -s "$TMP/tail" ]; } || die "sentinelles CONFIG-PAYS introuvables dans l'audit canonique"

# 3) découvrir tous les clones (heritage.config.js, profondeur 2)
CLONES=$(find "$DESK" -maxdepth 2 -name heritage.config.js -exec dirname {} \; | sort -u)

# 3bis) GARDE-FOU ABSOLU (Helmy 27/07) : le SOCLE et l'ESTONIE sont la SOURCE, JAMAIS des
# cibles. On les RETIRE de la liste quoi qu'il arrive — aucune propagation ne peut les toucher.
ESTONIE="$DESK/Estonie-Heritage-Experience"
CLONES=$(printf '%s\n' "$CLONES" | grep -vxF -e "$SOCLE" -e "$ESTONIE" | grep -vE '^$')
echo "▶ Garde-fou : SOCLE + ESTONIE exclus des cibles (source intouchable, jamais propagée)."

[ -n "$CLONES" ] || die "aucun clone CIBLE (hors socle/Estonie) trouvé — rien à propager"
echo; echo "▶ Clones découverts :"; echo "$CLONES" | sed 's|^|    • |'

# 4) propager à chaque clone
echo; echo "▶ Propagation…"
PROP=()
while IFS= read -r d; do
  [ -n "$d" ] || continue
  a="$d/audit.sh"
  # 4a. bloc CONFIG-PAYS du clone (3 lignes verbatim). Fallback = canonique si illisible.
  if [ -f "$a" ] && grep -q '^COUNTRY_TERMS=' "$a"; then
    src="$a"
  else
    src="$CANON_AUDIT"
    echo "    ⚠️  $(basename "$d") : pas de CONFIG-PAYS lisible → placeholders réinjectés (à régler)"
  fi
  {
    grep -E '^COUNTRY_TERMS=' "$src" | head -1
    grep -E '^ISO='          "$src" | head -1
    grep -E '^CHECKOUT_HINT=' "$src" | head -1
  } > "$TMP/cfg"
  # 4b. réécrire audit.sh = corps canonique + CONFIG-PAYS du clone
  cat "$TMP/head" "$TMP/cfg" "$TMP/tail" > "$a"
  chmod +x "$a" 2>/dev/null
  # 4c. copier les 2 docs canoniques + le contrat CLAUDE.md (identique partout ; socle = source)
  cp "$CANON_ARCHI"  "$d/$DOC_ARCHI"
  cp "$CANON_DEVIAT" "$d/$DOC_DEVIAT"
  if [ "$d" != "$SOCLE" ]; then
    cp "$SOCLE/CLAUDE.md"        "$d/CLAUDE.md"
    cp "$SOCLE/tamponner-sw.sh"  "$d/tamponner-sw.sh"; chmod +x "$d/tamponner-sw.sh" 2>/dev/null
    cp "$SOCLE/materialiser.sh"  "$d/materialiser.sh"; chmod +x "$d/materialiser.sh" 2>/dev/null
    cp "$SOCLE/the-i18n.js"      "$d/the-i18n.js"
    cp "$SOCLE/the-footer.js"    "$d/the-footer.js"
  fi
  PROP+=("$d")
done <<< "$CLONES"

# 5) auditer chaque clone
echo; echo "▶ Audit de chaque clone (preuve de complétude) :"
REDS=()
for d in "${PROP[@]}"; do
  if ( cd "$d" && bash audit.sh >/dev/null 2>&1 ); then
    echo "    ✅ $(basename "$d")"
  else
    echo "    ❌ $(basename "$d")  (audit ROUGE)"
    REDS+=("$d")
  fi
done

# 6) rapport + exit
rm -rf "$TMP"
N=${#PROP[@]}
echo
if [ ${#REDS[@]} -eq 0 ]; then
  echo "✅ Règles propagées à $N clone(s), tous VERTS :"
  for d in "${PROP[@]}"; do echo "    • $d"; done
  echo "Prouvé, pas affirmé."
  exit 0
else
  echo "💥 Propagé à $N clone(s) mais ROUGE sur ${#REDS[@]} :"
  for d in "${REDS[@]}"; do echo "    • $d"; done
  echo "NE PAS considérer la gamme à jour tant que ce n'est pas vert partout."
  exit 1
fi
