#!/usr/bin/env bash
SRC=~/Desktop/Threshold/Projets-Threshold/Heritage-Experience/MAJ/THE/THE-git
ok(){ printf "  ✅ %-46s %s\n" "$1" "$2"; }
ko(){ printf "  ❌ %-46s %s\n" "$1" "$2"; }
wn(){ printf "  ⚠️  %-46s %s\n" "$1" "$2"; }
n=0; for f in *.html; do python3 -c "
import re;s=open('$f',encoding='utf-8').read()
open('/tmp/x.js','w').write('\n'.join(re.findall(r'<script>(.*?)</script>',s,re.S)))" 2>/dev/null; node --check /tmp/x.js 2>/dev/null || n=$((n+1)); done
for f in *.js; do node --check "$f" 2>/dev/null || n=$((n+1)); done
[ $n = 0 ] && ok "1. Tout le code compile" "$(ls *.html *.js | wc -l | tr -d ' ') fichiers" || ko "1. Code" "$n en échec"
n=0; for f in *.json i18n/*.json; do python3 -c "import json;json.load(open('$f',encoding='utf-8'))" 2>/dev/null || n=$((n+1)); done
[ $n = 0 ] && ok "2. Tous les JSON valides" "$(ls *.json i18n/*.json | wc -l | tr -d ' ') fichiers" || ko "2. JSON" "$n invalides"
(cd "$SRC" && ./audit.sh) >/tmp/a.txt 2>&1
grep -q "Audit vert" /tmp/a.txt && ok "3. audit.sh (dossier de travail)" "vert" || ko "3. audit.sh" "ROUGE"
grep -q "aucune identité pays en dur" /tmp/a.txt && ok "4. Aucun nom de pays dans le code" "hors pages de récit" || ko "4. Nom de pays dans le code" "présent"
c=$(node -e "global.window={};global.document={readyState:'x',addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},documentElement:{},title:''};require('./heritage.config.js');const C=window.HConf;console.log(C.invites.length+' '+C.themes.length+' '+C.departs.length+' '+(C.androidFingerprints||[]).length+' '+Object.keys(C.pays).length)")
set -- $c
[ "$1" = 230 ] && ok "5. Codes d'invitation" "$1" || ko "5. Codes d'invitation" "$1 (attendu 230)"
[ "$2" = 15 ]  && ok "6. Thèmes déclarés" "$2" || wn "6. Thèmes déclarés" "$2"
[ "$4" = 2 ]   && ok "7. Empreintes Android" "$4" || ko "7. Empreintes Android" "$4 (attendu 2)"
[ "$5" = 5 ]   && ok "8. Nom du pays par langue" "$5 langues" || ko "8. Nom du pays" "$5 langues"
p=$(python3 -c "import json;d=json.load(open('.well-known/assetlinks.json'));print(d[0]['target']['package_name'])")
[ "$p" = "com.thresholdanalytics.heritage.tunisia" ] && ok "9. Paquet Android" "$p" || ko "9. Paquet Android" "$p"
a=$(ls act/*.html 2>/dev/null | wc -l | tr -d ' '); [ "$a" = 12 ] && ok "10. Balises ambassadeurs" "$a pages" || ko "10. Balises ambassadeurs" "$a (attendu 12)"
[ -f .htaccess ] && [ -f .well-known/assetlinks.json ] && ok "11. Fichiers cachés présents" ".htaccess + .well-known" || ko "11. Fichiers cachés" "manquants"
t=$(find . -maxdepth 1 \( -name "*.avant*" -o -name "*.bak*" -o -name "*TODO*" -o -name "*.zip" \) | wc -l | tr -d ' ')
[ "$t" = 0 ] && ok "12. Aucun fichier de travail" "" || wn "12. Fichiers de travail" "$t (à exclure du paquet)"
b=$(ls cgu.html cgv.html mentions-legales.html remboursement.html flux.html exemples-itineraires.html 2>/dev/null | wc -l | tr -d ' ')
[ "$b" = 0 ] && ok "13. Aucun brouillon ni schéma interne" "" || ko "13. Brouillons" "$b présents"
m=$(grep -c 'href="premium.html"' decouvrir.html); d=$(grep -c 'href="medina.html"' decouvrir.html)
[ "$m" -ge 1 ] && [ "$d" -ge 1 ] && ok "14. Menu : Premium + Médina" "" || ko "14. Menu" "premium=$m medina=$d"
w=$(node -e "const s=require('fs').readFileSync('the-pass.js','utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*\$/gm,'');console.log((s.match(/location\.replace\(['\"]premium\.html['\"]\)/g)||[]).length)")
[ "$w" = 0 ] && ok "15. Mur de navigation retiré" "gate() vide, 0 redirection" || ko "15. Mur" "$w redirection(s) active(s)"
z=$(grep -c "passWeek\|passMonth\|passDemoNote\|gastroBlock\|foodOn" itineraire.html)
[ "$z" = 0 ] && ok "16. Boutons morts et gastronomie retirés" "" || ko "16. Code mort" "$z occurrence(s)"
v=$(grep -o "heritage-[0-9a-f]*" sw.js | head -1)
L=$(curl -s -A "Mozilla/5.0" -m 12 https://heritage.threshold-analytics.com/sw.js | grep -o "heritage-[0-9a-f]*" | head -1)
[ "$v" != "$L" ] && ok "17. Version du service worker" "$v (en ligne : $L)" || ko "17. Version sw" "identique à la ligne"
python3 - <<'PY'
import re,json,glob,html
LG=['en','ar','de','it']
UI={lg:json.load(open('i18n/ui.%s.json'%lg,encoding='utf-8')) for lg in LG}
skip={'apps.html','credits-photos.html','googleaee5a2729db003c0.html'}
PR={'Heritage Experience','Threshold-Analytics','Bab Souika','Tourbet El Bey','🌐 Langue / Language','Heritage — Ouverture…'}
NB=chr(160)
def nm(x): return html.unescape(x).replace(NB,' ').strip()
t=c=0
for f in sorted(set(glob.glob('*.html'))-skip):
    s=open(f,encoding='utf-8').read()
    x=re.sub(r'<!--.*?-->','',s,flags=re.S)
    x=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',x,flags=re.S|re.I)
    x=re.sub(r'<([a-z0-9]+)[^>]*\bdata-i18n(?:-html)?="[^"]*"[^>]*>.*?</\1>','',x,flags=re.S|re.I)
    for y in set(nm(z) for z in re.split(r'<[^>]+>',x)):
        if len(re.findall(r"[A-Za-zÀ-ÿ]{3,}",y))>=2 and y not in PR and [l for l in LG if y not in UI[l]]: t+=1
for f in glob.glob('*.html'):
    s=open(f,encoding='utf-8').read()
    for k in set(re.findall(r'data-i18n(?:-html|-placeholder|-title|-aria|-alt)?="([^"]+)"',s))|set(re.findall(r"uiT\('([^']+)'\)",s)):
        if [l for l in LG if k not in UI[l]]: c+=1
f=lambda b:'  ✅ ' if b else '  ❌ '
print(f(t==0)+'%-46s %d'%('18. Texte non traduit (5 langues)',t))
print(f(c==0)+'%-46s %d'%('19. Clés sans traduction',c))
PY
python3 - <<'PY'
import re,glob,os
liens=set()
for f in glob.glob('*.html'):
    for m in re.findall(r'href="([^"#?:]+\.html)',open(f,encoding='utf-8').read()): liens.add(m)
morts=[l for l in sorted(liens) if not os.path.exists(l)]
print(('  ✅ ' if not morts else '  ❌ ')+'%-46s %s'%('20. Liens internes',('aucun mort' if not morts else ', '.join(morts))))
PY
