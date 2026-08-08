#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# tamponner-patrimoine.sh — cache-busting AUTO-PORTÉ du plugin patrimoine.
# Le plugin gère SON cache tout seul : aucune règle dans le sw de l'hôte.
# Les pages (servies network-first, générique) référencent leurs scripts avec
# une empreinte ?v=<hash8>. Un JS change → le hash change → le navigateur charge
# la version fraîche, même si le sw hôte est en cache-first. Zéro dépendance hôte.
# À lancer dans patrimoine/ avant d'uploader une MAJ du plugin.
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd "$(dirname "$0")" || exit 2
# Inclut les JSON i18n : un changement de libellé change le hash → le moteur re-fetch les JSON (?v) → fin de la dette de cache i18n.
FILES="config.js firebase.js export.js i18n/engine.js app.js feed.js tour.js i18n/fr.json i18n/en.json i18n/de.json i18n/it.json i18n/ar.json"
H=$( { for f in $FILES; do [ -f "$f" ] && cat "$f"; done; } | shasum -a 256 | cut -c1-8 )
for html in index.html apropos.html; do
  [ -f "$html" ] || continue
  sed -i '' -E "s/(config|firebase|export|app|feed|engine|tour)\.js\?v=[^\"]*/\1.js?v=$H/g" "$html"
done
echo "✓ patrimoine tamponné : ?v=$H  ($(echo $FILES | wc -w | tr -d ' ') scripts)"
