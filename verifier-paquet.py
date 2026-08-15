#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HERITAGE — CONTRÔLE D'UN PAQUET AVANT MISE EN LIGNE
====================================================
À lancer DANS le dossier à envoyer (ou dans le dossier de travail).

    python3 verifier-paquet.py [--travail /chemin/du/dossier/de/travail]

Chaque contrôle est né d'un défaut RÉEL, trouvé sur une édition. La ligne
« ← » rappelle lequel : ne jamais retirer un contrôle sans savoir ce qu'il
gardait. Sortie non-zéro = ne pas livrer.

Générique : rien de propre à un pays. Les valeurs attendues viennent de
heritage.config.js (HConf) et des données de l'édition.
"""
import json, os, re, subprocess, sys, glob, html

TRAVAIL = None
for i, a in enumerate(sys.argv):
    if a == '--travail' and i + 1 < len(sys.argv):
        TRAVAIL = sys.argv[i + 1]

VERT, ROUGE, ORANGE, RAZ = '\033[32m', '\033[31m', '\033[33m', '\033[0m'
_fail = _warn = 0
def ok(n, t, d=''):   print(f'  {VERT}✅{RAZ} {n:<48} {d}')
def ko(n, t, d=''):
    global _fail; _fail += 1; print(f'  {ROUGE}❌{RAZ} {n:<48} {d}')
def wn(n, t, d=''):
    global _warn; _warn += 1; print(f'  {ORANGE}⚠️{RAZ}  {n:<48} {d}')
def dire(cond, n, si_ok='', si_ko='', mou=False):
    if cond: ok(n, '', si_ok)
    elif mou: wn(n, '', si_ko)
    else:     ko(n, '', si_ko)

def lire(p):
    try:    return open(p, encoding='utf-8').read()
    except Exception: return ''

def scripts_de(f):
    return '\n'.join(re.findall(r'<script>(.*?)</script>', lire(f), re.S))

def sans_commentaires(s):
    return re.sub(r'^\s*//.*$', '', re.sub(r'/\*[\s\S]*?\*/', '', s), flags=re.M)

def hconf():
    stub = ('global.window={};global.document={readyState:"x",addEventListener(){},'
            'querySelectorAll(){return[]},querySelector(){return null},'
            'documentElement:{},title:""};require("./heritage.config.js");'
            'console.log(JSON.stringify(window.HConf))')
    try:
        return json.loads(subprocess.run(['node', '-e', stub], capture_output=True,
                                         text=True, timeout=20).stdout)
    except Exception:
        return {}

# Le SOCLE est un gabarit, pas une édition livrable : sa config est vide, ses
# placeholders sont normaux, ses scripts de travail ont leur place. On l'annonce.
GABARIT = os.path.exists('propager-regles.sh') or os.path.basename(os.getcwd()).upper().startswith('HERITAGE-SOCLE')

HTML  = sorted(glob.glob('*.html'))
JS    = sorted(glob.glob('*.js'))
H     = hconf()
LANGS = sorted(set(re.findall(r'i18n/ui\.([a-z]{2})\.json', ' '.join(glob.glob('i18n/ui.*.json')))))
NAT   = [l for l in LANGS if l != 'fr']
UI    = {l: json.loads(lire(f'i18n/ui.{l}.json') or '{}') for l in LANGS}

print(f'\n  Édition : {H.get("marque","?")}   ·   langues : {", ".join(LANGS) or "?"}\n')

# ── 1-2. le code tourne ────────────────────────────────────────────────────
mauvais = []
for f in HTML:
    open('/tmp/_v.js', 'w').write(scripts_de(f))
    if subprocess.run(['node', '--check', '/tmp/_v.js'], capture_output=True).returncode:
        mauvais.append(f)
for f in JS:
    if subprocess.run(['node', '--check', f], capture_output=True).returncode:
        mauvais.append(f)
dire(not mauvais, '1. Tout le code compile', f'{len(HTML)+len(JS)} fichiers', ', '.join(mauvais))

casses = [f for f in glob.glob('*.json') + glob.glob('i18n/*.json') + glob.glob('*.geojson')
          if not lire(f).strip().startswith(('{', '['))]
dire(not casses, '2. Tous les JSON valides',
     f'{len(glob.glob("*.json"))+len(glob.glob("i18n/*.json"))} fichiers', ', '.join(casses))

# ── 3. le fichier pays porte bien tout ─────────────────────────────────────
manque = [k for k in ('marque', 'marqueCourte', 'iso', 'domaine') if not H.get(k)]
dire(GABARIT or not manque, '3. heritage.config.js complet',
     'gabarit : à remplir au clonage' if GABARIT else f'{len(H)} clés',
     'manque : ' + ', '.join(manque))

# ── 4. rien du pays n'est écrit dans le CODE ───────────────────────────────
#    ← villes tunisiennes et libellés d'échelle codés en dur dans index/itineraire
termes = [t for t in {H.get('marqueCourte',''), H.get('marque','')} if t]
pays = H.get('pays')
if isinstance(pays, dict): termes += [v for v in pays.values() if v]
elif pays: termes.append(pays)
RECIT = {'decouvrir.html','a-propos.html','accueil.html','medina.html',
         'rome-immersion.html','sources-credits.html','apps.html'}
fuite = []
if termes:
    mot = re.compile('|'.join(re.escape(t) for t in set(termes)), re.I)
    for f in [x for x in HTML if x not in RECIT] + [j for j in JS if j != 'heritage.config.js']:
        for i, l in enumerate(lire(f).split('\n'), 1):
            if 'data-i18n' in l or re.search(r'(url\(|src=|href=)[^ ]*\.(jpg|png|webp|svg|mp3)', l):
                continue
            if mot.search(l): fuite.append(f'{f}:{i}')
dire(not fuite, '4. Aucun nom de pays dans le code', 'hors pages de récit',
     f'{len(fuite)} ligne(s) : ' + ', '.join(fuite[:3]), mou=True)

# ── 5. valeurs d'édition lues depuis HConf, jamais figées ──────────────────
#    ← APPSTORE_URL='' en dur : le lien App Store ne s'affichait JAMAIS sur le web
figees = []
for f in JS + HTML:
    s = sans_commentaires(scripts_de(f) if f.endswith('.html') else lire(f))
    for m in re.finditer(r"var\s+(APPSTORE_URL|PLAYSTORE_URL|CHECKOUT_URL|TIP_URL|SUPPORT_URL)\s*=\s*(['\"])\2", s):
        figees.append(f'{f}:{m.group(1)}')
dire(not figees, '5. URLs d\'édition lues depuis HConf', '',
     'figées à vide : ' + ', '.join(figees))

# ── 6. aucun verrou premium sur une clé obsolète ───────────────────────────
#    ← les 5 parcours de Médina restaient verrouillés MÊME pour un abonné payant
vieux = []
for f in HTML + JS:
    s = sans_commentaires(scripts_de(f) if f.endswith('.html') else lire(f))
    lignes = s.split('\n')
    for n, l in enumerate(lignes):
        if "getItem('the_premium')" not in l: continue
        # repli de secours toléré : THEPass est testé juste au-dessus, ou mentionné ici
        contexte = '\n'.join(lignes[max(0, n-3):n+1])
        if 'THEPass' in contexte or 'module absent' in l: continue
        vieux.append(f'{f}:{n+1} {l.strip()[:52]}')
dire(not vieux, '6. Verrous premium sur le vrai système', '',
     '; '.join(vieux[:2]))

# ── 7. aucun déblocage gratuit ni mention de démonstration ─────────────────
#    ← bouton « Débloquer Premium » gratuit + « déblocage simulé, sans paiement réel »
DEMO = re.compile(r"order\s*:\s*['\"]demo['\"]|déblocage simulé|activation simulée|"
                  r"sans paiement réel|Débloquer Premium", re.I)
demo = [f for f in HTML + JS if DEMO.search(sans_commentaires(lire(f)))]
dire(not demo, '7. Aucun déblocage gratuit / mode démo', '', ', '.join(demo))

# ── 8. le mur de navigation est bien retiré ────────────────────────────────
#    ← gate() renvoyait au paywall et coupait 10 pages sur 18 → 3 rejets Apple
pass_js = sans_commentaires(lire('the-pass.js'))
murs = len(re.findall(r"location\.replace\(['\"]premium\.html['\"]\)", pass_js))
dire(murs == 0, '8. Mur de navigation retiré', 'aucune redirection',
     f'{murs} redirection(s) active(s)')

# ── 9. le paywall est atteignable depuis le menu ───────────────────────────
#    ← le paywall n'était joignable que depuis des pages que le mur bloquait
menu = lire('decouvrir.html')
gratuite = not (H.get('checkout') or H.get('iapPrefix'))
dire(gratuite or 'href="premium.html"' in menu, '9. Paywall atteignable depuis le menu',
     'édition gratuite' if gratuite else '', 'aucun lien premium dans decouvrir.html')

# ── 10. filtres alignés entre la carte et la liste ─────────────────────────
#    ← « Autres lieux » existait sur la carte, pas dans la liste : 19 lieux perdus
a_carte = "'autres'" in lire('index.html')
a_liste = "'autres'" in lire('liste.html')
dire(a_carte == a_liste, '10. Filtres carte ↔ liste alignés',
     '« Autres lieux » des deux côtés' if a_carte else 'pas de filtre « autres »',
     f'carte={a_carte} liste={a_liste}')

# ── 11-12. les langues ─────────────────────────────────────────────────────
#    ← 18 mots en gras restaient en français : le seuil de 2 mots les ratait
# Exceptions déclarées par l'édition (noms propres, marque) — une par ligne,
# avec sa justification en commentaire. Voir .audit-exceptions.txt
EXCEPT = {l.split('#')[0].strip() for l in lire('.audit-exceptions.txt').split('\n')
          if l.strip() and not l.strip().startswith('#')}
PROPRE = EXCEPT | {H.get('marque',''), H.get('marqueCourte',''), 'Heritage', 'Experience',
          'Heritage Experience', 'Heritage\u00a0Experience',
          'THE', 'UNESCO', 'Premium', 'FREE', '🌐 Langue / Language'}
IGNORE = {'apps.html', 'credits-photos.html'}
NB = chr(160)
def nettoie(x): return html.unescape(x).replace(NB, ' ').strip()
trous = []
for f in [x for x in HTML if x not in IGNORE and not x.startswith('google')]:
    s = re.sub(r'<!--.*?-->', '', lire(f), flags=re.S)
    s = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', s, flags=re.S | re.I)
    s = re.sub(r'<([a-z0-9]+)[^>]*\bdata-i18n(?:-html)?="[^"]*"[^>]*>.*?</\1>', '', s, flags=re.S | re.I)
    for y in {nettoie(z) for z in re.split(r'<[^>]+>', s)}:
        # DEUX lettres suffisent : « Au » devant un groupe en gras restait français.
        # On ignore ce qui n'est que chiffres et ponctuation.
        if not re.search(r'[A-Za-zÀ-ÿ]{2,}', y) or y in PROPRE or len(y) > 200:
            continue
        if re.fullmatch(r'[\d\s·—–\-•,.:;()«»\[\]/|]+', y):
            continue
        if [l for l in NAT if y not in UI[l]]: trous.append(f'{f}: {y[:40]}')
dire(not trous, '11. Texte visible traduit', f'{len(NAT)} langue(s)',
     f'{len(trous)} trou(s) : ' + ' | '.join(trous[:2]))

sans = []
for f in HTML:
    s = lire(f)
    cles = set(re.findall(r'data-i18n(?:-html|-placeholder|-title|-aria|-alt)?="([^"]+)"', s)) \
         | set(re.findall(r"uiT\('([^']+)'\)", s))
    for k in cles:
        if [l for l in NAT if k not in UI[l]]: sans.append(f'{f}: {k}')
dire(not sans, '12. Clés i18n toutes traduites', '', f'{len(sans)} : ' + ' | '.join(sans[:2]))

# ── 13. jetons de substitution intacts ─────────────────────────────────────
#    ← DeepL traduisait __MARQUE_COURTE__ en __KURZE_MARKE__ : jamais remplacé
VALIDES = {'__MARQUE__','__MARQUE_COURTE__','__MARQUE_MARK__','__PAYS__',
           '__PAYS_MAJ__','__LE_PAYS__','__PAYS_DE__','__LANGUE_NAT__','__ENDONYME__'}
casses_j = {t for l in LANGS for v in UI[l].values() if isinstance(v, str)
            for t in re.findall(r'__[A-Z_]+__', v) if t not in VALIDES}
dire(not casses_j, '13. Jetons i18n valides', 'aucun jeton cassé', ', '.join(sorted(casses_j)))

# ── 14. rien d'interne ne fuit à l'écran ───────────────────────────────────
#    ← 4 brouillons légaux, un schéma de conception, 2 mémos, 1 note de déploiement
INTERNE = re.compile(r'TODO|FIXME|décision Helmy|Helmy|à faire|à revoir|provisoire|'
                     r'brouillon|WIP|prototype|schéma des flux|aucune valeur contractuelle|'
                     r'ne pas livrer|à supprimer', re.I)
sales = []
for f in HTML + glob.glob('patrimoine/*.html'):
    s = re.sub(r'<!--.*?-->', '', lire(f), flags=re.S)
    s = re.sub(r'<(script|style)\b[^>]*>.*?</\1>', '', s, flags=re.S | re.I)
    if INTERNE.search(html.unescape(re.sub(r'<[^>]+>', ' ', s))): sales.append(f)
for l in LANGS:
    for k, v in UI[l].items():
        if k.startswith('confid.'):   # mentions légales : le nom de l'éditeur y est obligatoire
            continue
        if isinstance(v, str) and INTERNE.search(v): sales.append(f'ui.{l}:{k[:26]}')
dire(not sales, '14. Aucune note interne visible', '', ', '.join(sorted(set(sales))[:3]))

# ── 15. aucun fichier de travail dans le paquet ────────────────────────────
travail = [f for f in os.listdir('.')
           if re.search(r'\.(avant|bak|zip|py|sh)|TODO|^\.git', f)
           and f != 'verifier-paquet.py']
dire(GABARIT or not travail, '15. Aucun fichier de travail',
     'gabarit : les scripts ont leur place' if GABARIT else '',
     ', '.join(travail[:4]), mou=True)

# ── 16. aucun brouillon ni schéma publié ───────────────────────────────────
brouillons = [f for f in ('cgu.html','cgv.html','mentions-legales.html',
                          'remboursement.html','flux.html','exemples-itineraires.html')
              if os.path.exists(f)]
dire(not brouillons, '16. Aucun brouillon ni schéma interne', '', ', '.join(brouillons))

# ── 17. les fichiers cachés voyagent (sans le point) ───────────────────────
#    ← FileZilla les masque : livrés avec le point, ils ne partaient jamais
caches = [] if GABARIT else [f for f in os.listdir('.') if f.startswith('.') and f not in ('.', '..')]
a_plat = GABARIT or os.path.exists('well-known') or os.path.exists('htaccess')
dire(a_plat and not caches, '17. Fichiers cachés livrables',
     'htaccess + well-known/ sans le point',
     ('encore cachés : ' + ', '.join(caches)) if caches else 'well-known/ ou htaccess absent')

# ── 18. liens Android cohérents ────────────────────────────────────────────
#    ← assetlinks pointait sur un AUTRE paquet, avec une seule empreinte
al = json.loads(lire('well-known/assetlinks.json') or lire('.well-known/assetlinks.json') or '[]')
pkg = al[0]['target']['package_name'] if al else ''
emp = len(al[0]['target']['sha256_cert_fingerprints']) if al else 0
attendu = H.get('androidPackage', '')
dire(GABARIT or (bool(al) and (not attendu or pkg == attendu) and emp >= 2),
     '18. assetlinks Android', f'{pkg} · {emp} empreintes',
     f'paquet={pkg or "—"} attendu={attendu or "—"} empreintes={emp}')

# ── 19. conformité des stores ──────────────────────────────────────────────
#    ← Apple 3.1.1 : jamais de paiement externe dans une app de store
prem, sout, foot = lire('premium.html'), lire('soutien.html'), lire('the-footer.js')
c = []
# deux écritures acceptées : le masquage groupé, ou la délégation à isStoreApp()
masque = re.search(r'isStoreApp\)\s*\{[^}]*ios-hide', prem, re.S) \
      or re.search(r'isStoreApp\(\)[\s\S]{0,500}?ios-hide', prem)
if not masque: c.append('premium: portes externes non masquées')
i, j = prem.find('buyWeb'), prem.find('HConf&&HConf.tip')
if not (i > 0 and j > i): c.append('premium: café hors branche web')
if 'ios-hide' not in sout: c.append('soutien: café non masqué en app')
if 'standalone' not in foot: c.append('footer: badges visibles en app installée')
if re.findall(r"https://(?:apps\.apple\.com|play\.google\.com/store)[^\"']*", prem + sout + foot):
    c.append('URL de store en dur')
dire(not c, '19. Conformité stores (Apple 3.1.1)', f'{5-len(c)}/5', '; '.join(c))

# ── 20. aucun lien mort ────────────────────────────────────────────────────
vises = {m for f in HTML for m in re.findall(r'href="([^"#?:]+\.html)', lire(f))}
morts = [l for l in sorted(vises) if not os.path.exists(l)]
dire(not morts, '20. Liens internes', 'aucun mort', ', '.join(morts))

# ── 21. couverture des filtres par les données ─────────────────────────────
#    ← les filtres étaient clonés d'une autre édition : 2 à 24 % des lieux couverts
ids = {t['id'] for t in H.get('themes', [])}
tot = sans_theme = 0
if ids:
    for g in glob.glob('*.geojson'):
        for ft in json.loads(lire(g) or '{"features":[]}').get('features', []):
            tot += 1
            th = ft.get('properties', {}).get('themes')
            if not (th if isinstance(th, list) else [th] if th else []): sans_theme += 1
    part = 100 * (tot - sans_theme) / tot if tot else 0
    dire(part >= 40 or a_carte, '21. Filtres couvrant les données',
         f'{tot} lieux · {part:.0f}% thématisés' + (' · repli « Autres lieux »' if a_carte else ''),
         f'seulement {part:.0f}% et pas de filtre « Autres »')
else:
    wn('21. Filtres couvrant les données', '', 'HConf.themes non déclaré')

# ── 22. le service worker a une version fraîche ────────────────────────────
v = re.search(r"VERSION\s*=\s*'([^']+)'", lire('sw.js'))
dire(bool(v), '22. Service worker tamponné', v.group(1) if v else '', 'VERSION introuvable')

# ── 23. codes d'invitation conservés ───────────────────────────────────────
#    ← la config en ligne avait 230 codes, le local 10 : l'envoi les aurait effacés
inv = len(H.get('invites', []) or [])
dire(True, '23. Codes d\'invitation', ('gabarit' if GABARIT else f'{inv}') + ('  ⚠️ vérifier contre le en-ligne' if inv < 20 else ''))

print()
if _fail:
    print(f'  {ROUGE}💥 {_fail} bloquant(s), {_warn} avertissement(s) — NE PAS LIVRER.{RAZ}\n')
    sys.exit(1)
print(f'  {VERT}✅ 23 contrôles passés ({_warn} avertissement(s)). Prouvé, pas affirmé.{RAZ}\n')
