#!/usr/bin/env python3
"""
CONTRÔLE 12 — le balayage des nœuds de texte peut-il écraser un bloc traduit ?

Né le 07/09/2026, d'un refus de DeepSeek que la mesure a tempéré mais pas annulé.

`applyUI` (the-i18n.js) fait DEUX passes sur le même arbre, dans cet ordre :
  ① les éléments `data-i18n-html` reçoivent leur traduction en innerHTML ;
  ② un TreeWalker balaie TOUS les nœuds de texte — y compris ceux que ① vient de
    créer — et remplace ceux dont le texte détouré est une clé du dictionnaire.

Donc : si la traduction posée par ① contient un fragment qui EST une clé, ② le
retraduit par-dessus. Le défaut serait silencieux et illisible à la lecture du code.

Mesuré le 07/09 sur les 117 clés de la page « à quoi sert », dans les CINQ
langues : 0 collision. Le danger est donc réel en principe et nul en fait — ce
qui est exactement le cas où l'on pose un contrôle plutôt que de modifier un
moteur partagé par une application publiée et testée.

Le contrôle rend nul, ou la liste des collisions.
"""
import json, re, html, glob, os, sys

LANGUES = ("fr", "en", "de", "it", "ar")

# les clés réellement posées en data-i18n-html dans les pages
posees = set()
for page in glob.glob("*.html"):
    s = open(page, encoding="utf-8", errors="ignore").read()
    posees.update(re.findall(r'data-i18n-html="([^"]+)"', s))
if not posees:
    sys.exit(0)

collisions = []
for lang in LANGUES:
    p = os.path.join("i18n", "ui.%s.json" % lang)
    if not os.path.exists(p):
        continue
    UI = json.load(open(p, encoding="utf-8"))
    for cle in posees:
        v = UI.get(cle)
        if not isinstance(v, str):
            continue
        for morceau in re.split(r"<[^>]+>", v):
            m = html.unescape(morceau).replace("\u00a0", " ").strip()
            # ⚠️ On ne signale QUE ce qui changerait le texte. Un fragment dont
            # la traduction est identique à lui-même (« Hafsia » → « Hafsia »,
            # « OpenStreetMap / Nominatim ») est réécrit sans rien changer : le
            # signaler apprendrait à ignorer ce contrôle — c'est la leçon du
            # point 72 du canon, où `deployer.sh` criait au loup à chaque envoi.
            if len(m) > 1 and m in UI and UI[m] != m:
                collisions.append("%s · %s · « %s » serait réécrit en « %s »"
                                  % (lang, cle, m[:44], str(UI[m])[:44]))

for c in collisions:
    print(c)
