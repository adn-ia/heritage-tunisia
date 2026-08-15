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
python3 - <<'PY2'
import json,re,glob,html
# 21) jetons qui ne seront JAMAIS remplacés (DeepL traduit parfois leur nom)
VALIDES={'__MARQUE__','__MARQUE_COURTE__','__MARQUE_MARK__','__PAYS__','__PAYS_MAJ__','__LE_PAYS__','__PAYS_DE__','__LANGUE_NAT__','__ENDONYME__'}
casses=[]
for f in glob.glob('i18n/ui.*.json'):
    d=json.load(open(f,encoding='utf-8'))
    for k,v in d.items():
        if isinstance(v,str):
            for t in set(re.findall(r'__[A-Z_]+__',v)):
                if t not in VALIDES: casses.append((f,k,t))
print(('  \u2705 ' if not casses else '  \u274c ')+'%-46s %s'%('21. Jetons i18n valides',
      'aucun jeton cassé' if not casses else '%d cassé(s) : %s'%(len(casses),', '.join(sorted({t for _,_,t in casses}))[:60])))

# 22) notes internes visibles (texte rendu + valeurs i18n)
MOTS=r"(TODO|FIXME|XXX\b|décision Helmy|Helmy|Helmi|à faire|à revoir|provisoire|brouillon|WIP|prototype|schéma des flux|activation simulée|ne pas livrer|à supprimer|aucune valeur contractuelle)"
NB=chr(160); trouve=[]
for f in glob.glob('*.html')+glob.glob('patrimoine/*.html'):
    s=open(f,encoding='utf-8').read()
    s=re.sub(r'<!--.*?-->','',s,flags=re.S)
    s=re.sub(r'<(script|style)\b[^>]*>.*?</\1>','',s,flags=re.S|re.I)
    t=html.unescape(re.sub(r'<[^>]+>',' ',s)).replace(NB,' ')
    for m in re.finditer(MOTS,t,re.I): trouve.append((f,m.group(0)))
for f in glob.glob('i18n/ui.*.json'):
    d=json.load(open(f,encoding='utf-8'))
    for k,v in d.items():
        # confid.* = mentions légales : le nom de l'éditeur y est OBLIGATOIRE
        if k.startswith('confid.'): continue
        if isinstance(v,str) and re.search(MOTS,v,re.I): trouve.append((f,k[:40]))
print(('  \u2705 ' if not trouve else '  \u274c ')+'%-46s %s'%('22. Aucune note interne visible',
      '' if not trouve else '%d : %s'%(len(trouve),', '.join('%s (%s)'%x for x in trouve[:3]))))
PY2
python3 - <<'PY3'
import re
# 23) CONFORMITÉ STORES (Apple 3.1.1 / Google Play) — matrice de visibilité :
#     web = Lemon Squeezy + App Store + Play Store + café ; app iOS ou Android = AUCUN lien externe.
ok=[]; ko=[]
prem=open('premium.html',encoding='utf-8').read()
sout=open('soutien.html',encoding='utf-8').read()
foot=open('the-footer.js',encoding='utf-8').read()
if re.search(r"isStoreApp\)\s*\{[^}]*ios-hide", prem, re.S): ok.append(1)
else: ko.append('premium: portes externes non masquees en app')
i=prem.find('buyWeb'); j=prem.find('HConf&&HConf.tip')
if i>0 and j>i: ok.append(1)
else: ko.append('premium: cafe hors branche web')
if prem.find('buyLS')>i: ok.append(1)
else: ko.append('premium: Lemon Squeezy hors branche web')
if 'ios-hide' in sout and re.search(r"if\(iOS\|\|andr\)", sout): ok.append(1)
else: ko.append('soutien: cafe non masque en app')
if 'standalone' in foot: ok.append(1)
else: ko.append('footer: badges visibles en app installee')
dur=re.findall(r"https://(?:apps\.apple\.com|play\.google\.com/store)[^\"']*", prem+sout+foot)
if not dur: ok.append(1)
else: ko.append('URL de store en dur: '+dur[0][:44])
print(('  ✅ ' if not ko else '  ❌ ')+'%-46s %s'%('23. Conformite stores (visibilite des liens)',
      '%d/6 controles'%len(ok) if not ko else '; '.join(ko)[:78]))
PY3
node -e 'global.window={};global.document={readyState:"x",addEventListener(){},querySelectorAll(){return[]},querySelector(){return null},documentElement:{},title:""};require("./heritage.config.js");var C=window.HConf;console.log("     portes : appStore="+(C.appStore?"oui":"—")+" playStore="+(C.playStore?"oui":"vide")+" cafe="+(C.tip?"oui":"vide")+" checkout="+(C.checkout?"oui":"vide"))'
