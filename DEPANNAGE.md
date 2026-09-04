
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

## 02/09/2026 — Les photos d'une étape viraient au gris (le point 7)

**Symptôme.** « Les photos que je mets sur une étape apparaissent, dès que je
sors de l'itinéraire elles sont grises, je dois recharger la page pour que ça
réapparaisse, et si je recharge ça se regrise à la place des photos. »

**Ce que ce n'était pas.** Ni la base — l'entrée était bien rangée sous la bonne
clé, et l'index `place` la rendait sans faute. Ni un chargement trop lent.

**La cause.** Les liens d'objet (`URL.createObjectURL`) sont regroupés par
« zone » pour être libérés proprement — mécanisme posé le 30/08 contre une vraie
fuite mémoire. Mais la zone s'appelait **`'hero'` et `'grid'` pour TOUTES les
étapes**. Chaque étape dessinée prenait les liens de la zone, puis les révoquait
après avoir posé les siens — c'est-à-dire qu'elle **révoquait ceux de l'étape
précédente, encore affichés à l'écran**. Sur quatre étapes, trois perdaient leurs
images. D'où le gris, et d'où l'alternance : au rechargement l'ordre de dessin
change, ce ne sont pas les mêmes étapes qui survivent.

Le commentaire du 30/08 nommait pourtant le piège mot pour mot : *« on libère
après avoir posé le nouveau contenu, jamais avant : libérer un lien encore porté
par une image affichée la casse à l'écran »*. La règle était juste ; la zone,
elle, n'était pas assez fine.

**Correctif.** `the-carnet.js` — la zone porte désormais la clé de l'étape :
`'hero:'+place` et `'grid:'+place`. Une étape ne peut plus libérer les liens
d'une autre. Les zones `manager` et `entete` restent globales : ce sont des
modales, il n'y en a qu'une ouverte à la fois.

**Vérifié à l'écran**, une photo dans chacune des quatre étapes, chaque lien
chargé pour de bon : **5 vignettes, 5 vivantes, 0 morte** — au premier rendu,
après rechargement, et après être sorti de l'itinéraire puis revenu.

**La leçon.** Une libération groupée n'est sûre que si le groupe correspond
exactement à ce qui est redessiné. Ici le groupe était la page, alors que l'unité
redessinée était l'étape.

## 02/09/2026 — « Une fois entier, une fois juste Partager » : la carte coupait le menu

**Symptôme.** « La modale du crayon apparaît une fois entière et une fois il y a
juste Partager dedans, aléatoirement. »

**Ce que ce n'était pas.** Ni le bornage de hauteur posé le matin même, ni le
manque de place autour du bouton. J'ai cherché des deux côtés avant de mesurer
les ancêtres.

**La cause.** `.stop` porte **`overflow:hidden`**. Le menu est en
`position:absolute` À L'INTÉRIEUR de la carte d'étape : dès qu'il en déborde, la
carte le **coupe**. Aucun `z-index` n'y peut rien — l'`overflow` d'un ancêtre
clippe avant tout empilement. Selon l'endroit où le menu tombait, on en voyait
tout, ou une seule ligne. D'où l'« aléatoire ».

**Correctif.** Le menu s'ouvre en `position:fixed`, qui échappe à l'`overflow`
d'un ancêtre, et sa place est calculée à la main depuis le bouton : côté où il
tient, sinon le plus grand des deux, borné à la place réelle avec défilement
interne. Aligné sur le bord GAUCHE du crayon — aligné par la droite, il partait
hors de la carte, dans le vide à côté d'elle.

⚠️ **Le piège à connaître** : `position:fixed` se règle sur l'ancêtre le plus
proche portant un `transform`, `filter` ou `contain`, s'il y en a un. Vérifié le
02/09 : aucun ancêtre de `.rtp-pop` n'en porte. Si l'un venait à en recevoir, ce
menu se replacerait par rapport à lui.

**Et le menu a maigri.** Helmy, le même jour : « dans la modale il restera
modifier, monter, descendre, définir comme base, recaler et retirer cette
étape ». Il en portait neuf. Sont partis :
- **Partager** — retiré entièrement, du menu et du bas de l'étape ; sa place en
  bas revient à la **météo ⛅** ;
- **Ce qu'il y a autour** — garde son icône 🔎, quitte le menu ;
- **Découvrir ce lieu** — supprimé. ⚠️ **À savoir** : ce n'était PAS le bouton
  « 📖 Découvrir ce lieu » visible sur l'étape. Celui-là (`.st-livre`) déplie le
  texte que le lieu porte déjà, et ne paraît que s'il y en a un. Le geste retiré
  appelait `HDecouvrir`, qui va CHERCHER une description sourcée pour une étape
  qui n'en a aucune — un hôtel, une adresse posés à la main. Deux noms voisins,
  deux fonctions différentes. `brique-decouvrir-lieu.js` reste chargée.

**Nouveau drapeau `horsMenu`** dans `roadtrip-plan.js` : la page demande une
icône sans entrée de menu. Le module place, il ne décide toujours pas. Un geste
`horsMenu` SANS `icone` n'est atteignable par rien — le module l'écrit maintenant
en console plutôt que de le laisser disparaître en silence.

**Vérifié à l'écran** : six entrées (cinq sur la première étape, « Monter » n'y a
pas lieu d'être), menu entier, contenu dans la carte, en `fixed`.

**Second avis DeepSeek** demandé sur ce changement. Il a vu juste sur trois
points — le geste inatteignable, le risque de références par `id` (aucune, après
vérification), et le plancher `Math.max(120, place)` qui transformait la place
disponible en minimum. Il s'est trompé sur un quatrième, en affirmant que `i`
n'était pas défini dans le `forEach` : il vient de `cards.forEach(function(card,
i))`, c'est l'index de l'ÉTAPE, et c'est voulu. Vérifié avant d'agir.

## 02/09/2026 — Le PDF sortait de grands cadres blancs en travers de la page

**Symptôme.** « Le PDF produit ou à imprimer produit l'itinéraire entier avec
cadres, boutons, etc., alors qu'on devrait avoir juste les éléments ajoutés
comme passeport : les médias par étape, les noms d'étape, la carte. »

**Méthode.** Pour ne pas deviner, les règles `@media print` ont été extraites des
feuilles de style et **appliquées pour de bon** au document : la feuille telle
qu'elle sort, à l'écran, mesurable et photographiable.

**La cause.** Le bloc print portait `.album-doc .album-ph{display:block;}`, posée
la veille contre les coupures. `.album-ph` est en `flex` (l. 305) : forcée en
`block`, chaque vignette passait de **168 px à 1751 px**. D'où les grands cadres
blancs de travers qui traversaient la feuille — c'étaient les polaroids étirés.
Les coupures étaient déjà tenues par le `break-inside:avoid` posé sur `.pic`
juste au-dessus : la règle n'apportait rien qu'un dégât. Retirée.

**Deux nettoyages dans la foulée.**
- Le **pied de page du site** s'imprimait avec ses liens de navigation. Un album,
  un passeport, un dépliant se lisent seuls : `#the-footer` masqué.
- Les **notes d'étape** s'imprimaient comme des champs de saisie — bordure, coin
  de redimensionnement, et pour les étapes sans note, le texte d'invite
  « Écrivez un mot sur ce lieu… » imprimé comme s'il était du voyageur. Elles
  s'impriment maintenant comme du texte, et `:placeholder-shown` écarte celles
  qui sont vides.

**Vérifié à l'écran**, règles print appliquées : vignette à 168 px, `.album-ph`
resté en `flex`, pied de page à `none`, 3 notes vides masquées sur 4, la seule
remplie visible. Feuille photographiée : en-tête, carte, puis chaque étape avec
son nom, sa ville, sa note et ses photos.

## 03/09/2026 — La carte absente du HTML, coupée dans le PDF : une seule cause

**Symptômes, signalés à une heure d'écart.** « La carte itinéraire n'apparaît pas
dans le HTML produit. » Puis, capture à l'appui : « tronqué » — la carte du PDF
coupée par une bande grise à droite.

**La cause commune.** Une carte Leaflet n'existe pas dans le document : elle
existe dans un contexte de rendu. Ici, huit canvas de tuiles, deux SVG pour le
tracé, quatre marqueurs.

- **En HTML**, `the-souvenir.js` clonait `.album-doc`. Un `cloneNode` copie la
  BALISE `<canvas>`, jamais ce qui y est dessiné : le pixel n'appartient pas au
  document. Le fichier partait avec un cadre vide.
- **En PDF**, Leaflet ne charge que les tuiles de la zone qu'il croit occuper.
  L'impression change la largeur ET la hauteur du conteneur
  (`@media print{.ac-carte{height:170px}}`) **après** coup : il ne l'apprend
  jamais, et tout ce qui dépasse reste gris. Recadrer avant ne servirait à rien —
  la taille imprimée n'est pas encore connue.

**Le correctif, un seul pour les deux.** `aplatirCarte()` redessine la carte sur
un canvas unique, dans son ordre d'empilement : les tuiles, puis le tracé
sérialisé depuis le SVG, puis les points numérotés — ces derniers **redessinés**
et non photographiés, car on ne fabrique pas une image depuis du HTML sans y
perdre les polices. La fonction est publiée par `the-souvenir.js` ;
`the-print.js` s'en sert pour substituer une image plate le temps d'imprimer,
puis remet la carte. Une image s'adapte à n'importe quelle largeur sans rien
recharger.

**Vérifié EN LIGNE** — en local les tuiles sont exclues de la copie de test, le
fond y est donc uni : ne pas conclure de là. En ligne : rues, noms de lieux,
tracé vert, quatre points numérotés, 144 Ko.

## 03/09/2026 — Une composition sans photo sortait des pages blanches

La même capture montrait six « Pas de photo ici » entassés, sans titres d'étape.
Reproduit : composition **« Une photo par page »** sur un itinéraire **sans
photo**. Cette composition masque titres et notes — c'est son principe, elle ne
montre que l'image. Sans image, il ne reste que le message d'absence, répété.

Quatre des huit compositions vivent entièrement des photos : *une photo par
page*, *planche-contact*, *grande photo*, *frigo*. Elles refusent maintenant de
s'exécuter à zéro photo et le disent, au lieu de produire du vide.

**Vu au passage, à surveiller.** Le repli de clé posé le 02/09 (essayer `#1`
quand `it123…#1` ne rend rien) peut faire remonter une photo ORPHELINE — rangée
avant qu'un itinéraire ait son identifiant — dans un itinéraire neuf. Constaté en
test : un itinéraire fraîchement créé affichait une photo d'un essai précédent.
Sans gravité (la photo appartient bien au voyageur) mais inattendu. Le repli
reste : sans lui, les photos d'avant la correction seraient perdues.


## 03/09/2026 — L'album fabriquait sa propre carte, au lieu de prendre la bonne

**Helmy, après un premier correctif jugé insuffisant :** « non, ce n'est pas bon,
la carte, vous avez reproduit n'importe quoi. Vous faites une capture d'écran de
la carte dans l'itinéraire, avec TOUT l'itinéraire, et vous la collez dans
l'album — il ne faut pas reconstruire la carte. »

**Il avait raison, et le premier correctif traitait le mauvais problème.**
J'avais rendu la carte de l'album imprimable ; je n'avais pas vu que cette
carte-là ne devait pas exister.

**Ce qui se passait.** L'album créait sa PROPRE instance Leaflet (`#acCarte`),
dans un cadre court et large de 230 px de haut, avec son propre `fitBounds`. Sur
un parcours de 300 km, elle n'en montrait qu'un morceau : le tracé sortait du
cadre, et la zone non couverte restait grise. Deux cartes du même voyage, cadrées
différemment, dont une fausse.

**Le correctif.** `openAlbum()` saisit en image la carte de l'itinéraire —
`#map`, la vraie, cadrée sur le parcours entier — **avant** de la masquer (une
carte cachée mesure zéro et rendrait une image vide), et la couverture pose cette
image. La seconde instance Leaflet n'est plus créée du tout.

**Vérifié en ligne** : image de 1368 × 660 dans l'album, `#acCarte` absent, tout
le parcours visible avec ses quatre points, ses rues et ses noms de lieux.

**La leçon.** Deux vues du même objet finissent toujours par diverger. La bonne
question n'était pas « comment réparer la seconde carte » mais « pourquoi y en
a-t-il deux ».


## 03/09/2026 — Le correctif de la carte recréait le défaut qu'il corrigeait

**Helmy :** « le HTML, c'est réglé ? » — non. Vérifié en produisant vraiment le
fichier et en le lisant : deux images de 4 et 7 Ko, aucune carte.

**Ce qui s'était passé.** La veille, `the-souvenir.js` avait reçu un
aplatissement de la carte, parce que le clone rendait un canvas vide. Le
lendemain, la couverture a cessé de créer sa propre carte : elle porte désormais
l'IMAGE de celle de l'itinéraire. L'aplatissement, lui, s'exécutait toujours — et
ne trouvant ni canvas ni SVG dans une image, il produisait un aplat uni de 4 Ko
et REMPLAÇAIT la vraie carte par ce vide.

**Un correctif devenu nuisible parce que la cause avait disparu sous lui.** Le
clonage suffit désormais : une `<img>` se clone entière, avec son `data:`. Le
bloc est retiré.

**Vérifié en ligne, fichier produit et ouvert** : 277 Ko contre 80, la carte à
201 Ko dedans, tout le parcours visible.

**La leçon.** Quand la cause d'un défaut disparaît, son correctif ne devient pas
inoffensif : il devient un défaut. À chaque changement de fond, relire ce qui
avait été posé pour l'ancien état.

## 03/09/2026 — Le diaporama avait l'air d'un onglet sélectionné

**Helmy :** « je ne sais pas pourquoi le diaporama est en noir en permanence ».

`.album-bar .ab.go` portait `background:var(--ink)` — EXACTEMENT le noir de
`.tpl.on`, deux lignes plus haut, qui marque le style choisi. Deux boutons noirs
côte à côte, dont un seul est un onglet actif, et rien pour les distinguer.

Le diaporama n'est pas un style, c'est un geste. Il garde sa mise en avant — fond
clair, cadre doré plus épais — sans emprunter le signe de la sélection. Vérifié :
`rgb(255,253,247)` contre `rgb(43,35,24)`, ils ne se confondent plus.


## 03/09/2026 — Le fichier HTML héritait de l'habillage affiché

**Helmy :** « HTML n'a rien à voir avec le style. »

Il avait raison, et c'était sa règle de la veille appliquée ailleurs : Baroudeur,
Passeport et Dépliant sont des **produits** ; imprimer, partager, enregistrer sont
des **sorties**. On ne dit pas « un PDF en passeport ».

**Ce qui se passait.** `the-souvenir.js` exportait « l'album déjà rendu » : le
fichier reprenait `class="tpl-…"` du `<body>`, mais aussi la STRUCTURE du style —
le passeport range ses étapes en livre à deux pages sur papier ligné, avec
tampons, le dépliant en bande horizontale. Le même itinéraire donnait donc trois
fichiers différents, selon le bouton sur lequel on se trouvait par hasard au
moment d'appuyer.

**Correctif, en deux temps.**
- Le `<body>` du fichier n'a plus de classe de style. Les règles `tpl-*` voyagent
  toujours dans le CSS embarqué : faute de classe, elles ne s'appliquent à rien.
- Retirer la classe ne suffisait pas — la structure, elle, était déjà écrite dans
  le DOM. On repasse donc au rendu de base le temps de fabriquer le fichier, puis
  **on remet l'écran comme on l'a trouvé**.

**Vérifié en ligne, fichier produit depuis le Passeport et ouvert** : 277 Ko,
aucun `pp-book` ni `pp-page` dans le corps, la carte à sa place, et le style
Passeport toujours actif à l'écran après coup.


## 03/09/2026 — Le fichier souvenir devient un tableau de bord

**Helmy :** « HTML équivalent à album. Un HTML avec un tableau de bord : la carte
avec les étapes cliquables, qui ouvrent une fenêtre avec les photos et les
commentaires. » Puis, pour lever le doute : « la carte reprend la carte dynamique
de l'itinéraire, on n'invente rien ».

Le fichier ne clone plus le DOM de l'album — c'est ce clonage qui le faisait
changer d'allure selon le style affiché. Il lit les DONNÉES (nom, ville, note,
photos) et écrit un document à lui : en-tête, la carte de l'itinéraire en image,
les pastilles posées dessus **en pourcentage** (un pourcentage suit l'image quand
elle est redimensionnée, un pixel non), et sous la carte la liste complète des
étapes — qui sert de repli sans script, sans souris, et à l'impression.

**Limite assumée.** Dans le fichier, la carte est une image : on ne peut ni
zoomer ni déplacer. Une carte réellement interactive hors ligne exigerait
d'embarquer le fond de carte entier, soit 75 Mo de tuiles. Le fichier fait 213 Ko.

### Trois défauts traversés, et ce qu'ils ont appris

**① Le sélecteur prenait la mauvaise carte.** `.ac-carte, #map` rend `#map`, qui
vient en premier dans le document — or l'album étant ouvert, `#map` est masqué, et
une carte cachée mesure zéro. Le fichier partait sans carte ni pastilles.
L'ordre d'un sélecteur groupé suit le DOM, jamais l'ordre écrit.

**② Une ligne dupliquée tuait le script embarqué.** Une correction précédente
avait laissé `document.body.style.overflow="hidden";}` deux fois : la fonction se
refermait trop tôt. `node --check` validait le module — il ne voit pas ce que le
module ÉCRIT.

**③ `'<\\/script>'` au lieu de `'<\/script>'`.** En double, la barre oblique
inverse n'échappe plus rien : elle se retrouve VISIBLE dans le fichier produit, et
le navigateur refuse tout le script. Le fichier s'ouvrait, la carte s'affichait,
et aucune étape ne réagissait au clic.

**Contrôle n°1bis, né de ② et ③** — `.controle-scripts-embarques.py` : il
reconstitue la chaîne comme le ferait le navigateur, la compile, et refuse la
barre oblique en trop devant `/script`. Éprouvé sur du code volontairement
fautif : il l'attrape ; sur le code corrigé : il se tait.

**La leçon.** Un module qui ÉCRIT du code doit voir son écriture contrôlée, pas
seulement sa propre syntaxe. Sans cela, le vert du contrôle ne dit rien de ce qui
est livré.

---

## 04/09/2026 — « composer un voyage libre ne fonctionne pas »

**Symptôme (Helmy, à l'écran).** On choisit *Voyage libre*, on nomme le voyage, on
remplit la première étape, on appuie sur **Ajouter cette étape** — et rien
n'apparaît : un en-tête, une carte vide, pas une seule étape. Le compteur disait
`~NaN km`.

**Ce n'était pas un retour de bug : c'était un angle mort du 30/08.** Ce jour-là on
a retiré `nearestOrder()` du chemin d'ajout manuel, à juste titre — il réordonnait
le voyage derrière le voyageur. Mais c'est LUI qui posait `fromPrev` sur chaque
étape (`itineraire.html:1462`). En retirant l'ordre imposé, on a retiré le calcul de
distance avec, sans s'en apercevoir : les itinéraires **composés** passent toujours
par `nearestOrder` et n'ont jamais montré le défaut. Seul le voyage libre, qui pose
ses étapes à la main, était touché.

**Deux causes en chaîne, mesurées.**

1. `itineraire.html:4046` — `base.route = items; render(...)` livrait l'étape sans
   `fromPrev`. Le total `route.reduce((t,s)=>t+s.fromPrev,0)` (l. 2368) devenait
   `NaN`.
2. `itineraire.html:2426` — dans un voyage libre, le **départ et la première étape
   sont le même point** : on nomme le voyage là où on se trouve, on y pose sa
   première halte. `L.latLngBounds(line)` avait donc une **surface nulle**,
   `fitBounds` cherchait un zoom infini, Leaflet levait
   `Invalid LatLng object: (NaN, NaN)`. L'exception coupait `render()` **net, à la
   ligne du cadrage** — donc AVANT le dessin des étapes (l. 2430 et suivantes).
   Rien n'était perdu : rien n'était dessiné.

**Réparé.**

- `itineraire.html:4046` — la chaîne des distances se refait d'origine en étape à
  chaque ajout, exactement comme `removeStep` le fait après une suppression
  (l. 1582). C'est un recalcul d'une valeur **dérivée** : il ne déplace aucune étape
  et ne touche pas à l'ordre choisi par le voyageur.
- `itineraire.html:2426` — on mesure la surface des bornes avant de cadrer ; nulle,
  on fait `setView(centre, 12)`. **Leçon déjà écrite chez Terralog**,
  `blocs/40-carte.js` l. 32 : « ON NE CADRE PAS SUR UN POINT UNIQUE. fitBounds sur
  une boîte sans surface fait plonger Leaflet au zoom maximum » — réparé là-bas le
  27/08. Là-bas la garde compte les points (l. 141-142) ; ici il en faut deux, mais
  confondus : on mesure donc la surface, pas le nombre.
- `brique-etape.js:243` — la position se prend **d'elle-même** à l'ouverture de la
  première étape d'un voyage libre. Un voyage libre se fait sur place : la position,
  on l'a. Sans cela le refus « Il manque la position » s'affichait **397 px
  au-dessus** du bouton pressé — hors écran sur un téléphone, d'où « rien ne se
  passe ». **Manière de Terralog** (`blocs/40-carte.js` l. 433,
  `blocs/90-live.js` l. 163) : on APPELLE la position, on annonce l'attente, on
  retombe en silence. Pas de `navigator.permissions.query` — Terralog ne demande
  jamais la permission de demander.

**Vérifié à l'écran, en local.** Voyage libre neuf → position prise seule
(📍 36.8702, 10.3417) → une étape : carte, repère, fiche. Deuxième étape à Carthage :
2 étapes · ~5 km, distances 2,5 + 2,5, deux fiches, trois repères, plus une seule
exception Leaflet.

**Ce que ça apprend.** Quand on retire un mécanisme parce qu'il fait une chose de
trop, il faut regarder ce qu'il faisait **d'autre**. `nearestOrder` faisait deux
métiers : ordonner, et mesurer. On n'en voulait plus qu'un — on a perdu les deux.

---

## 04/09/2026 — le départ et l'arrivée : les bornes du voyage

**Demande (Helmy).** « Sur Terralog on définit un point de départ dès le début. Si
le voyage est une boucle ou un aller-retour, le point de départ et le point
d'arrivée clôture l'itinéraire — bien entendu on peut changer le point de départ.
Sur un aller simple le point de départ est différent du point d'arrivée, donc on
définit le point d'arrivée à la fin de l'itinéraire. Ou alors au début on définit
le point de départ puis on définit le point d'arrivée, et on remplit entre. Si on
change, on édite. »

**Ce qui manquait, mesuré avant d'écrire.**

| Attendu | État réel |
|---|---|
| Boucle → départ = arrivée, clôture l'itinéraire | La carte refermait le tracé, mais **aucune fiche d'arrivée** dans la liste |
| Aller-retour → idem | **La carte ne refermait rien** : `allerretour` doublait les km (l. 2372) sans jamais rentrer |
| On peut changer le point de départ | **Aucun moyen**, jamais |
| Aller simple → point d'arrivée | **N'existait pas** |

**Fait.**

- `brique-etape.js` — l'écran d'étape prend un **mode borne**. Le mot du carnet,
  les dates, l'heure et la place dans la liste tiennent dans un seul bloc qu'on
  masque ; la validation sort par `the:borne` au lieu de `the:etape`.
  ⚠️ **On ne duplique pas l'écran.** Terralog l'a fait et l'a payé
  (`blocs/21-edition.js` l. 208) : « le même écran a été écrit deux fois, une fois
  pour l'étape et une fois pour le départ, et la correction n'avait touché qu'une
  copie ». Un écran, deux usages.
- `the-bornes.js` (bloc auto-porté, 5 langues) — fiche **Départ** avant la liste,
  fiche **Arrivée** après. Boucle et aller-retour : l'arrivée porte le nom du
  départ, **sans bouton** — la changer là serait mentir, son lieu EST le départ
  (Terralog l. 743). Aller simple : son propre lieu, à définir puis à changer.
- `itineraire.html` l. 2424 — le tracé se referme sur **tout ce qui n'est pas un
  aller simple**, règle de Terralog `blocs/20-itineraire.js` l. 590 mot pour mot :
  `rtReturnsHome() = forme !== 'oneway'`. En aller simple, il va jusqu'à l'arrivée
  si elle est définie, avec son repère 🏁.
- L'arrivée voyage dans les 4 fabrications de fiche et se relit à la reprise.
  Changer le départ **refait toute la chaîne des distances**, comme `removeStep`.

**Trois pièges rencontrés, et ce qu'ils apprennent.**

1. **`LASTRES` n'est pas sur `window`.** La page le déclare en `let` dans sa propre
   portée (l. 1259). Le bloc lisait `window.LASTRES` : `undefined`, et il ne
   dessinait rien **sans lever la moindre erreur**. L'API publique de lecture,
   c'est `THEvoyage()` — faite pour ça, et qui rend une copie.
2. **Une borne n'est pas une étape : elle ne va pas dans `#stops`.** Première
   écriture, j'y insérais les deux fiches. Mesuré : `dessiner()` appelée
   **8 513 fois** en un rendu. `the-etape.js` l. 271 observe `#stops` ; toute
   insertion le réveille, le rendu repart, et me rappelle. La correction est aussi
   la bonne conception : le départ et l'arrivée ont leurs propres boîtes, l'une
   avant la liste, l'autre après. Le conteneur observé n'est plus touché.
3. **Un bloc `defer` n'existe pas au premier rendu.** Le crochet de l'hôte teste
   `window.THEbornes` et saute en silence. La page se dessine pendant son analyse ;
   les bornes n'apparaissaient donc qu'au **deuxième** rendu — donc jamais si l'on
   ne touchait à rien. Le bloc se dessine une fois tout seul à l'arrivée, idiome
   repris de Terralog `blocs/roadtrip-plan.js` l. 570.

**Et un quatrième, purement visuel :** fond transparent + encre `--ink`, le nom du
départ était **invisible**. Les bornes sont hors des panneaux clairs, sur le fond
sombre de la page. Une fiche d'étape le savait déjà : `.stop` porte
`background:var(--paper)` (l. 127). Même papier, trait pointillé conservé — une
borne n'est pas une étape, et ça doit se voir d'un coup d'œil.

**Vérifié à l'écran, en local, les quatre formes.** Aller simple : arrivée
« Kelibia, le fort » posée par GPS, repère 🏁 sur la carte, 10 repères. Départ
changé pour « Sousse, la médina » : 12 km → **130 km**, première branche 118,6 km.
Boucle : arrivée « Sousse, la médina — Retour au point de départ », **sans bouton**.
Aller-retour : **~261 km**, le double, et le tracé rentre enfin au départ.

**Ce que j'avais mal lu.** J'avais signalé comme un manque qu'un voyage libre ne
propose pas de choisir sa forme. Helmy, le même jour : « le voyage libre n'a pas
besoin de forme. Il se définit de jour en jour, étape par étape. Il a besoin d'un
point de départ, c'est tout. » Ce n'était donc pas un manque, et l'écran le
montrait : on lui demandait « dites où le voyage se termine » alors que par nature
il ne le sait pas — c'est sa définition même. **Un voyage libre n'affiche que son
départ** ; la liste finit sur la dernière étape posée, comme le voyage lui-même.
La forme reste demandée dans « Composer » seulement, question 6.
