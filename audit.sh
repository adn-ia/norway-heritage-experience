#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# HERITAGE — AUDIT ANTI-DÉVIATION.  « La machine dit non, pas l'assistant. »
# À lancer depuis le dossier d'une app Heritage, AVANT de confirmer
# « générique / livrable ». Colle la sortie : un « oui » non prouvé ne vaut rien.
#
#   ./audit.sh
#
# Adapte le bloc CONFIG au pays audité. Sortie non-zéro = NE PAS livrer.
# ─────────────────────────────────────────────────────────────────────────────
set -u

# ===== CONFIG-PAYS (à adapter par pays — SEULE partie propre au clone) =======
COUNTRY_TERMS="Norvège|Norway|Norge"        # matérialisé depuis heritage.config.js
ISO="no"                                              # matérialisé
CHECKOUT_HINT="lemonsqueezy|checkout\.|buy\.stripe|gumroad"  # indices de mur payant
# ===== /CONFIG-PAYS =========================================================

# ===== CANONIQUE — géré par ./propager-regles.sh (NE PAS éditer à la main) ===
# Empreintes des 2 docs de règles (anti-dérive §9). Pour changer une règle :
# éditer le CANONIQUE (les 2 MD racine du Bureau) PUIS lancer ./propager-regles.sh
# (il régénère ces hash + re-propage à tous les clones). Ne jamais coller à la main.
DOC_ARCHI="HERITAGE-ARCHITECTURE-ET-REGLES_2026-07-23.md"
DOC_ARCHI_SHA="0a88b8c0ec543af60f486a15dd19da9968f479c37232b6cf0bf2d4c84f6ed8ae"
DOC_DEVIAT="HERITAGE-DEVIATIONS-ET-CORRECTIONS_2026-07-23.md"
DOC_DEVIAT_SHA="1e77e4fe54a2df0bd74c7d366c9ce438172be01534c87db109c4f04a174ea2ff"
# ============================================================================

fail=0; warn=0
title(){ printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
ok(){ printf '  ✅ %s\n' "$1"; }
ko(){ printf '  ❌ %s\n' "$1"; fail=$((fail+1)); }
wn(){ printf '  ⚠️  %s\n' "$1"; warn=$((warn+1)); }

# fichiers de CODE (hors config unique et hors données .json)
CODE=$(ls ./*.html ./*.js 2>/dev/null | grep -v '/heritage.config.js$')
[ -z "$CODE" ] && { echo "Aucun .html/.js ici — es-tu dans le dossier de l'app ?"; exit 2; }

title "1) Identité pays en dur dans le CODE (hors clés i18n)"
# On exclut les valeurs data-i18n (ce sont des CLÉS de traduction, pas du texte en dur).
hits=$(grep -rniE "$COUNTRY_TERMS" $CODE 2>/dev/null | grep -viE 'data-i18n')
if [ -n "$hits" ]; then ko "fuite pays dans le code :"; echo "$hits" | sed 's/^/       /'; else ok "aucune identité pays en dur"; fi

title "2) Repli qui NOMME un pays ( || 'X Heritage' )"
hits=$(grep -rniE "\|\|[[:space:]]*'[^']*($COUNTRY_TERMS)[^']*'" $CODE 2>/dev/null)
if [ -n "$hits" ]; then ko "repli non neutre (doit être 'Heritage Experience') :"; echo "$hits" | sed 's/^/       /'; else ok "replis neutres"; fi

title "3) Repli iso non-neutre + checkout/tip codés en dur (doivent passer par HConf)"
# Repli qui nomme une valeur pays au lieu d'un défaut neutre : HConf.iso)||'ee'  (le repli '' est OK)
fb=$(grep -rniE "HConf\.(iso|checkout|tip)[^|]*\|\|[[:space:]]*['\"][^'\"]" $CODE 2>/dev/null)
# URL de checkout/tip codée EN DUR (hors API générique, hors HConf, hors commentaire d'exemple)
urls=$(grep -rniE "https?://[a-z0-9._-]*(lemonsqueezy\.com/checkout|gumroad\.com|buy\.stripe\.com)" $CODE 2>/dev/null | grep -viE "HConf|//[[:space:]]*ex")
hits=$(printf '%s\n%s\n' "$fb" "$urls" | grep -vE '^$')
if [ -n "$hits" ]; then ko "repli non-neutre / checkout en dur :"; echo "$hits" | sed 's/^/       /'; else ok "iso/checkout/tip via HConf (replis neutres)"; fi

title "4) <html lang=\"…\"> en dur (le loader doit poser la langue)"
hits=$(grep -rniE '<html[^>]*lang="[a-z]' ./*.html 2>/dev/null)
if [ -n "$hits" ]; then wn "lang en dur (ok si repli neutre, à vérifier) :"; echo "$hits" | sed 's/^/       /'; else ok "pas de lang en dur"; fi

title "5) manifest.json générique (sans nom de pays)"
if [ -f manifest.json ]; then
  if grep -qiE "$COUNTRY_TERMS" manifest.json; then ko "manifest nomme le pays (doit être neutre)"; else ok "manifest neutre"; fi
else wn "manifest.json absent"; fi

title "6) node --check sur tous les .js"
jsbad=0
for f in ./*.js; do [ -e "$f" ] || continue; node --check "$f" 2>/dev/null || { ko "syntaxe cassée : $f"; jsbad=1; }; done
[ $jsbad -eq 0 ] && ok "tous les .js compilent"

title "7) vkey UNIQUE dans les geojson (anti-collision par nom → règle #4.4)"
node - <<'NODE'
const fs=require('fs');
let good=true;
for(const f of ['sites.geojson','sites-nature.geojson']){
  if(!fs.existsSync(f)) continue;
  let g; try{ g=JSON.parse(fs.readFileSync(f,'utf8')); }catch(e){ console.log('       ❌ JSON invalide: '+f); good=false; continue; }
  const seen=new Map(); let noKey=0;
  for(const ft of (g.features||[])){
    const k=ft.properties&&ft.properties.vkey;
    if(!k){ noKey++; continue; }
    seen.set(k,(seen.get(k)||0)+1);
  }
  const dup=[...seen].filter(([,n])=>n>1);
  if(noKey) console.log('       ⚠️  '+noKey+' feature(s) sans vkey dans '+f);
  if(dup.length){ good=false; console.log('       ❌ '+f+' : '+dup.length+' vkey en double (ex: '+dup.slice(0,3).map(d=>d[0]+' ×'+d[1]).join(', ')+')'); }
  else console.log('       ✅ '+f+' : '+seen.size+' vkey uniques');
}
process.exit(good?0:1);
NODE
[ $? -ne 0 ] && fail=$((fail+1))

title "8) HConf.* réellement lus par le code (info)"
grep -rhoE "HConf\.[a-zA-Z]+" $CODE 2>/dev/null | sort -u | sed 's/^/       /'

title "9) Docs de règles embarqués = CONFORMES au canonique (anti-dérive)"
# La machine refuse la divergence : plus besoin de « penser à resynchroniser ».
check_doc(){
  f="$1"; want="$2"
  if [ ! -f "$f" ]; then ko "doc de règles ABSENT : $f (doit voyager avec le clone)"; return; fi
  got=$(shasum -a 256 "$f" 2>/dev/null | awk '{print $1}')
  if [ "$got" = "$want" ]; then ok "$f conforme au canonique"
  else ko "$f a DÉRIVÉ du canonique (embarqué ≠ référence) → re-propager la version canonique, ou régénérer les hash si le canonique a bougé"; fi
}
check_doc "$DOC_ARCHI"  "$DOC_ARCHI_SHA"
check_doc "$DOC_DEVIAT" "$DOC_DEVIAT_SHA"

echo
if [ $fail -gt 0 ]; then
  printf '\033[1m💥 %d bloquant(s), %d avertissement(s) — NE PAS livrer, corrige d’abord.\033[0m\n' "$fail" "$warn"
  exit 1
fi
printf '\033[1m✅ Audit vert (%d avertissement(s)). Prouvé, pas affirmé.\033[0m\n' "$warn"
