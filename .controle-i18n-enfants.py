#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data-i18n sur un élément QUI PORTE DES ENFANTS.

Né le 05/09/2026, Helmy : « l'appareil photo et la vidéo tout en haut de
l'itinéraire ne fonctionnent pas, ce sont des icônes vides ». Le mot était juste :
VIDES. Le moteur applique une langue en écrivant `el.textContent = UI[cle]`
(`the-i18n.js` l. 166) — et écrire `textContent` EFFACE TOUS LES ENFANTS.

Un `<label data-i18n>` qui portait son `<input type="file">` le perdait donc à
chaque application de langue : au chargement, puis à chaque changement. Il restait
un emoji et plus aucun geste — sans erreur, sans trace. Mesuré à l'écran le 05/09 :
entrée présente avant l'application, ABSENTE après.

⚠️ On ne cherche pas les `<label>` : on cherche TOUT élément marqué `data-i18n` à
qui du code ajoute ensuite un enfant. Le motif repérable est le couple
`setAttribute('data-i18n', …)` puis `appendChild` sur la même variable.
"""
import io, os, re, sys

MARQUE = re.compile(r"(\w+)\.setAttribute\(\s*['\"]data-i18n['\"]")
mal = []
for f in sorted(os.listdir('.')):
    if not (f.endswith('.js') or f.endswith('.html')):
        continue
    if '.avant' in f:
        continue
    s = io.open(f, encoding='utf-8', errors='ignore').read()
    for m in MARQUE.finditer(s):
        var = m.group(1)
        suite = s[m.end(): m.end() + 1400]
        if re.search(r'\b' + re.escape(var) + r'\.appendChild\(', suite):
            ligne = s[:m.start()].count('\n') + 1
            mal.append("%s:%d : `%s` porte data-i18n ET reçoit un enfant — "
                       "l'enfant sera effacé à chaque langue" % (f, ligne, var))

print('\n'.join(mal))
sys.exit(0)
