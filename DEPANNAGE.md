
## 02/09/2026 — L'album, le passeport, le dépliant et le PDF sortaient la carte, sans les photos ni les notes

**Symptôme.** « L'album ne produit et ne prend aucune photo, aucune en-tête,
aucune note » — et, plus précis encore : « la carte apparaît mais ni les photos
ni les commentaires ». Corrigé sur le Portugal, puis trois fois sur la Tunisie.
Revenu chaque fois.

**Pourquoi la carte, elle, sortait.** Elle est dessinée à partir des coordonnées
de l'itinéraire. Elle ne dépend d'AUCUNE clé de rangement. Tout le reste — photos,
notes, en-têtes — passe par `placeKey()`. Le symptôme désignait donc la cause :
seul ce qui dépendait de la clé manquait.

**Cause 1 — la clé changeait sous les pieds des photos.** Un itinéraire ne
recevait son identifiant qu'à l'ENREGISTREMENT. Avant : `placeKey` rendait `#1`.
Après : `it1788…#1`. Les photos rangées entre les deux devenaient introuvables.
Elles restaient visibles dans l'étape — qui lit `data-place` écrit dans le DOM —
mais l'album, qui recalcule `placeKey`, ne les trouvait plus. D'où l'impression
que « ça marche dans l'étape mais pas dans l'album ».

**Cause 2 — le filet de rattrapage était troué.** Trois endroits
(`itineraire.html` photosFor et capLire, `the-carnet.js` getMediaLarge) essayaient
une clé de repli avec `String(cle).split('#').pop()`. Cela rend **`1`**, pas
`#1` : le dièse est mangé. Le repli cherchait une clé qui n'a jamais existé.
**C'est pour cela que les corrections précédentes ne tenaient pas** : elles
posaient un filet qui ne pouvait rien attraper, et le cas de test — un itinéraire
déjà enregistré — passait quand même.

**Cause 3 — cinq portes, une seule fermée à la fois.** `itineraire.html`
fabriquait un identifiant en CINQ endroits (enrichissement d'une fiche,
enregistrement, halte, voyage libre, rendu). Corriger un seul laissait les quatre
autres recréer une seconde identité et orpheliner les photos.

**Correctif (trois volets).**
1. `render()` — *l'identité naît avec l'itinéraire*, plus à son enregistrement.
   `if(!LASTRES._id) LASTRES._id='it'+Date.now();` avant toute écriture des
   `data-place`. Une fiche rouverte apporte la sienne dans `res._id`.
2. Les cinq fabrications reprennent l'identité existante avant d'en créer une.
3. Les trois replis essaient les DEUX formes, `#1` et `1`. Lecture seule : aucune
   migration — celle tentée par le passé avait emporté `capLire()` avec elle.

**Ce qui empêche le retour.** `controle.sh`, contrôle n°7 : il refuse le
déploiement si un `split('#').pop()` n'est pas suivi de la forme au dièse, si un
`'it'+Date.now()` ne reprend pas l'identifiant existant, ou si `render()` cesse de
poser l'identité. Les trois causes sont désormais tenues par la machine.

**Vérifié à l'écran**, cycle complet : créer un itinéraire · écrire une note ·
ranger une photo · enregistrer · fermer · rouvrir depuis les sauvegardés · ouvrir
l'album → carte, en-tête, titre, ville, note et photo, tous présents.

**La règle, telle que Terralog l'applique.** La clé de rangement d'un média ne
bouge JAMAIS : `blocs/50-medias.js:189` range sous `'s'+n`, le numéro d'étape seul.
Et quand une clé doit malgré tout changer, `blocs/21-edition.js:112` **déplace**
les médias vers la nouvelle. Il n'y laisse pas d'orphelins.

## 02/09/2026 — Le menu du crayon sortait de l'écran (deuxième passe)

**Symptôme.** « La modale du crayon sur chaque étape apparaît hors écran, on
avait déjà corrigé ça, ça recommence. »

**Pourquoi la première correction n'a pas tenu.** Elle datait du 01/09 et ne
traitait qu'un cas : si le menu débordait par le HAUT, il basculait vers le bas.
Elle ne vérifiait jamais qu'il tenait **en bas**, et ne bornait pas sa hauteur.
Or ce menu fait **358 px pour neuf entrées** : sur un téléphone en paysage
(~374 px utiles), aucun des deux côtés ne peut l'accueillir. Il sortait quoi
qu'on fasse. C'est, à l'identique, le défaut qui a valu le rejet 2.1(a) sur le ✕
d'une fiche.

**Correctif.** `roadtrip-plan.js`, à l'ouverture du menu : on mesure la place
au-dessus et au-dessous du bouton, on choisit **celle qui est la plus grande**,
on borne `max-height` à cette place et on met `overflow-y:auto`. Les bords
latéraux sont vérifiés dans les deux sens, plus seulement à droite.

**Vérifié à l'écran** dans un cadre de 390 × 380 px — un téléphone en paysage :
menu borné à 154 px, défilement interne, entièrement dans l'écran (216 → 370
sur 374). Et sur grand écran, crayon en haut de page : bascule vers le bas,
top 52, dans l'écran.

**La leçon.** Un repositionnement qui choisit un côté sans borner la hauteur ne
résout rien : il déplace le débordement. La seule règle sûre est *choisir la plus
grande place, puis s'y contraindre*.
