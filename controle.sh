#!/bin/bash
# controle.sh — ce qui doit passer AVANT tout déploiement.
# Posé le 02/09/2026. Chaque contrôle correspond à une casse réelle, datée.
# Usage : ./controle.sh   (0 = on peut déployer, 1 = on ne déploie pas)

cd "$(dirname "$0")" || exit 1
ROUGE=$'\033[31m'; VERT=$'\033[32m'; JAUNE=$'\033[33m'; FIN=$'\033[0m'
ECHECS=0
dire(){ printf "  %s\n" "$1"; }
ko(){ printf "  ${ROUGE}✗ %s${FIN}\n" "$1"; ECHECS=$((ECHECS+1)); }
ok(){ printf "  ${VERT}✓ %s${FIN}\n" "$1"; }

printf "\n${JAUNE}═══ contrôle avant déploiement ═══${FIN}\n\n"

# ── 1. Syntaxe de tous les scripts, en ligne et en fichier ───────────────────
python3 - <<'PY'
import io,re,os,subprocess,sys,tempfile
mauvais=[]
for f in sorted(os.listdir('.')):
    if f.endswith('.js') and '.avant' not in f:
        r=subprocess.run(['node','--check',f],capture_output=True,text=True)
        if r.returncode: mauvais.append(f)
    elif f.endswith('.html') and '.avant' not in f:
        s=io.open(f,encoding='utf-8',errors='ignore').read()
        for i,b in enumerate(re.findall(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', s, re.S)):
            with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False,encoding='utf-8') as t:
                t.write(b); p=t.name
            r=subprocess.run(['node','--check',p],capture_output=True,text=True)
            os.unlink(p)
            if r.returncode: mauvais.append(f'{f} (bloc {i})')
if mauvais:
    print('\n'.join(mauvais))
    sys.exit(1)
sys.exit(0)
PY
if [ $? -eq 0 ]; then ok "syntaxe : tous les scripts compilent"; else ko "syntaxe : un script ne compile pas"; fi

# ── 2. data-i18n posé DANS un gabarit JavaScript ─────────────────────────────
#    Casse du 02/09/2026 : « '+fmtDu » affiché à l'écran en production.
R=$(python3 - <<'PY'
import io,re,os
n=0
for f in sorted(os.listdir('.')):
    if not f.endswith('.html') or '.avant' in f: continue
    s=io.open(f,encoding='utf-8',errors='ignore').read()
    for m in re.finditer(r'<(\w+)([^>]*\bdata-i18n="[^"]*"[^>]*)>([^<]{0,200})</\1>', s):
        if re.search(r"['\"]\s*\+|\+\s*['\"]|uiT\(|fmtDur\(|\$\{|\bT\('", m.group(3)):
            print(f"{f} : {m.group(3)[:52]}"); n+=1
PY
)
if [ -z "$R" ]; then ok "aucun data-i18n dans un gabarit JavaScript"
else ko "data-i18n posé dans du code — s'affichera à l'écran :"; echo "$R" | sed 's/^/      /'; fi

# ── 3. Clé i18n référencée mais absente d'une langue → rendrait du VIDE ──────
R=$(python3 - <<'PY'
import io,re,json,os
ui={}
for l in ['fr','en','de','it','ar']:
    p=f'i18n/ui.{l}.json'
    if os.path.exists(p): ui[l]=json.load(io.open(p,encoding='utf-8'))
trous=set()
for f in sorted(os.listdir('.')):
    if not f.endswith('.html') or '.avant' in f: continue
    s=io.open(f,encoding='utf-8',errors='ignore').read()
    for cle in set(re.findall(r'data-i18n(?:-html)?="([^"]+)"', s)):
        for l,d in ui.items():
            if cle not in d: trous.add(f"{cle} manque en {l}")
for t in sorted(trous)[:12]: print(t)
PY
)
if [ -z "$R" ]; then ok "toutes les clés existent dans les 5 langues"
else ko "clés absentes — rendront du vide :"; echo "$R" | sed 's/^/      /'; fi

# ── 4. Replis en dur T('cle','texte') — règle en granit, zéro repli ──────────
R=$(grep -ohE "T\(\s*'[^']+'\s*,\s*'[^']{3,}'\s*\)" ./*.js ./*.html 2>/dev/null | head -5)
if [ -z "$R" ]; then ok "aucun repli en dur"
else ko "replis en dur — masquent une traduction manquante :"; echo "$R" | sed 's/^/      /'; fi

# ── 5. alert() — fige l'écran en WKWebView, cause de rejet 2.1(a) ────────────
R=$(python3 - <<'PY2'
import io,re,os
# on ignore les commentaires : un `alert()` NOMMÉ dans une explication n'en est pas un.
for f in sorted(os.listdir('.')):
    if not (f.endswith('.js') or f.endswith('.html')) or '.avant' in f: continue
    s=io.open(f,encoding='utf-8',errors='ignore').read()
    s=re.sub(r'/\*.*?\*/', '', s, flags=re.S)          # commentaires de bloc
    s=re.sub(r'(?m)^\s*//.*$', '', s)                   # commentaires de ligne
    if not re.search(r'(?<![.\w$])alert\s*\(', s): continue
    # la page l'a-t-elle neutralisé, directement ou via la page qui la charge ?
    couvert = 'the-message.js' in s
    if not couvert and f.endswith('.js'):
        for h in os.listdir('.'):
            if h.endswith('.html') and f in io.open(h,encoding='utf-8',errors='ignore').read() \
               and 'the-message.js' in io.open(h,encoding='utf-8',errors='ignore').read():
                couvert = True; break
    if not couvert:
        print(f"{f} — alert() non neutralisé")
PY2
)
if [ -z "$R" ]; then ok "aucun alert() bloquant"
else ko "alert() présent — fige l'application iOS :"; echo "$R" | sed 's/^/      /'; fi

# ── 6. Fichiers chargés par une page mais absents du précache ───────────────
R=$(python3 - <<'PY'
import io,re,os
sw=io.open('sw.js',encoding='utf-8').read() if os.path.exists('sw.js') else ''
manque=set()
for f in sorted(os.listdir('.')):
    if not f.endswith('.html') or '.avant' in f: continue
    s=io.open(f,encoding='utf-8',errors='ignore').read()
    for src in re.findall(r'<script[^>]*\bsrc="(?!http)([^"?]+)', s):
        n=src.lstrip('./')
        if os.path.exists(n) and n not in sw: manque.add(n)
for m in sorted(manque): print(m)
PY
)
if [ -z "$R" ]; then ok "tout le nécessaire est précaché"
else ko "chargé par une page mais absent du précache — indisponible hors réseau :"; echo "$R" | sed 's/^/      /'; fi

# ── 7. LA CLÉ DE RANGEMENT NE DOIT PAS POUVOIR BOUGER ───────────────────────
#    Quatre fois la même panne : album, passeport, dépliant et PDF sortaient la
#    carte sans les photos ni les notes. La carte ne dépend d'aucune clé ; tout
#    le reste si. Deux causes, toujours les mêmes, un contrôle pour chacune.
R=$(python3 - <<'PY7'
import io,re,os

def sans_commentaires(t):
    # on REMPLACE par du blanc en gardant les sauts de ligne, sinon les numéros
    # signalés ne correspondent plus au fichier qu'on va ouvrir.
    t=re.sub(r'/\*.*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), t, flags=re.S)
    return re.sub(r'(?m)^(\s*)//.*$', lambda m: m.group(1), t)

mal=[]

# (a) `split('#').pop()` rend « 1 » là où la clé rangée est « #1 » : le repli rate
#     d'un caractère et cherche une clé qui n'a jamais existé. Acceptable
#     UNIQUEMENT si la forme au dièse est essayée juste après.
for f in sorted(os.listdir('.')):
    if not (f.endswith('.js') or f.endswith('.html')) or '.avant' in f: continue
    t=sans_commentaires(io.open(f,encoding='utf-8',errors='ignore').read())
    for m in re.finditer(r"split\('#'\)\.pop\(\)", t):
        # « #'+ » attrape les deux écritures : `lire('#'+court)` et
        # `localStorage.getItem('the-note-#'+court)`.
        suite=t[m.end():m.end()+400]
        if "#'+" not in suite and '#"+' not in suite:
            mal.append(f"{f}:{t[:m.start()].count(chr(10))+1} : repli sans la forme au dièse")

# (b) un identifiant d'itinéraire ne se FABRIQUE qu'en dernier recours : partout
#     il faut d'abord reprendre celui qui existe. En créer un second orpheline
#     toutes les photos déjà rangées sous le premier.
t=sans_commentaires(io.open('itineraire.html',encoding='utf-8',errors='ignore').read())
for m in re.finditer(r"'it'\s*\+\s*Date\.now\(\)", t):
    avant=t[max(0,m.start()-160):m.start()]
    if '_id' not in avant and 'arr[place].id' not in avant:
        mal.append(f"itineraire.html:{t[:m.start()].count(chr(10))+1} : identifiant fabriqué sans reprendre l'existant")

# (c) `render` doit poser l'identifiant AVANT d'écrire les `data-place`.
if not re.search(r"if\(!LASTRES\._id\)\s*LASTRES\._id", t):
    mal.append("itineraire.html : render() ne pose plus l'identifiant — la clé rebougera")

print('\n'.join(mal))
PY7
)
if [ -z "$R" ]; then ok "la clé de rangement des photos ne peut pas bouger"
else ko "la clé peut bouger — album/passeport/PDF perdront photos et notes :"; echo "$R" | sed 's/^/      /'; fi

printf "\n"
if [ "$ECHECS" -eq 0 ]; then
  printf "${VERT}═══ les 7 contrôles passent ═══${FIN}\n"
  printf "${JAUNE}Il reste le seul qui compte : ouvrir l'application et s'en servir.${FIN}\n"
  printf "  Composer un itinéraire · ouvrir une étape · l'album · changer de langue.\n\n"
  exit 0
else
  printf "${ROUGE}═══ %s contrôle(s) en échec — NE PAS DÉPLOYER ═══${FIN}\n\n" "$ECHECS"
  exit 1
fi
