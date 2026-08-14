#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# materialiser.sh — remplit les fichiers STATIQUES par-domaine/par-app depuis
# heritage.config.js (LA config unique). Ces fichiers sont lus BRUTS (crawlers,
# Android) : pas d'interpolation runtime possible → on les stampe une fois.
#   sitemap.xml, robots.txt         <- HConf.domaine
#   .well-known/assetlinks.json     <- HConf.androidPackage (ou dérivé de iso) + androidFingerprints
#   audit.sh (bloc CONFIG-PAYS)     <- HConf.pays/endonyme + iso
# À lancer dans le dossier de l'app APRÈS avoir édité heritage.config.js.
# (Les ui.*.json, elles, sont interpolées à l'exécution — rien à stamper.)
# ─────────────────────────────────────────────────────────────────────────────
set -u
[ -f heritage.config.js ] || { echo "❌ pas de heritage.config.js ici — es-tu dans le dossier de l'app ?"; exit 2; }
node - <<'NODE'
const fs=require('fs');
global.window={}; try{ require('./heritage.config.js'); }catch(e){}   // code DOM en try/catch → HConf posé avant
const H=window.HConf||{};
if(!H.domaine){ console.error('❌ HConf.domaine vide — remplis heritage.config.js d\'abord.'); process.exit(2); }
const pkg=H.androidPackage || ('com.thresholdanalytics.heritage.'+(H.iso||'app'));
const fp=H.androidFingerprints||[];
function stamp(f,pairs){ if(!fs.existsSync(f)) return; let s=fs.readFileSync(f,'utf8'); for(const [a,b] of pairs) if(b) s=s.split(a).join(b); fs.writeFileSync(f,s); }
stamp('sitemap.xml',[['__DOMAINE__',H.domaine]]);
stamp('robots.txt', [['__DOMAINE__',H.domaine]]);
stamp('.well-known/assetlinks.json',[['__PACKAGE_NAME__',pkg],['__SHA256_PWABUILDER__',fp[0]],['__SHA256_PLAY_APP_SIGNING__',fp[1]]]);
const terms=[H.pays&&H.pays.fr, H.pays&&H.pays.en, H.endonyme].filter((v,i,a)=>v&&a.indexOf(v)===i).join('|');
if(fs.existsSync('audit.sh')){ let a=fs.readFileSync('audit.sh','utf8');
  if(terms) a=a.replace(/^COUNTRY_TERMS=.*$/m,'COUNTRY_TERMS="'+terms+'"        # matérialisé depuis heritage.config.js');
  if(H.iso)  a=a.replace(/^ISO=.*$/m,'ISO="'+H.iso+'"                                              # matérialisé');
  fs.writeFileSync('audit.sh',a); }
const left=['sitemap.xml','robots.txt','.well-known/assetlinks.json'].filter(f=>fs.existsSync(f) && /__(DOMAINE|PACKAGE_NAME|SHA256_[A-Z_]+)__/.test(fs.readFileSync(f,'utf8')));
console.log('✓ statiques matérialisés depuis heritage.config.js  (domaine='+H.domaine+', iso='+H.iso+', package='+pkg+')');
if(left.length) console.log('⚠️  reste des placeholders (mets les 2 empreintes SHA dans androidFingerprints) : '+left.join(', '));
else console.log('✓ aucun placeholder restant.');
NODE
