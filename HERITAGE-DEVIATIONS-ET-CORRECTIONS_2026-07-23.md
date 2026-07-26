# HERITAGE — JOURNAL DES DÉVIATIONS & CORRECTIONS (rétrospective honnête)
> Daté **2026-07-23**. Demandé par Helmy : lister **toutes mes déviations** depuis le début du projet Heritage (et Road Trip, l'origine), ce qui a été **corrigé** et **comment**. Sans enjoliver.
> But : garder la trace pour ne pas répéter. Chaque entrée = **Quoi · Quand · Impact · Correction · Règle/leçon**. Règles détaillées dans `HERITAGE-ARCHITECTURE-ET-REGLES_2026-07-23.md`.

---

## Repères de contexte
- **Road Trip de Foss** = l'origine (contenant : itinéraire/jours/carnet/carte postale, sans Firebase pour la gamme).
- **THE (Tunisia Heritage)** = app phare / squelette de référence. **MHE** (Maroc), **EHE** (5 pays Europe), **QHE** (Québec), **Estonia** = clones.
- Principe fondateur : **un fichier (`heritage.config.js`) par pays**, code 100% générique, contenu (données) qui change.

---

## 1) 2026-06-28 — BETA=true : accuser le cache pendant des heures
- **Déviation :** le freemium ne verrouillait rien. J'ai passé des **heures à blâmer le cache / le Service Worker / les appareils de Helmy** au lieu de lire le code.
- **Cause réelle :** un `if(BETA) return true;` (drapeau « tout ouvert » oublié à `true`) — trouvé **en une fois** en exécutant le code.
- **Impact :** perte de temps + Helmy répétant à raison « je ne suis pas premium, même sur iPad vierge ».
- **Correction :** retirer le drapeau ; exécuter le vrai code (curl+node) avant de théoriser.
- **Règle :** *debug l'évident d'abord, FAIRE CONFIANCE au rapport de Helmy, ne jamais blâmer son matériel.*

## 2) 2026-06-29 / 30 — Improviser une UI au lieu de reprendre le modèle
- **Déviation :** pour EHE, UI « maison » (points plats, **clustering** vert/jaune, **tout affiché par défaut**, mauvais flux d'entrée) au lieu de cloner le modèle MHE/THE.
- **Impact :** « on a fait deux belles applications MHE et THE et là c'est n'importe quoi » ; « il vous est **interdit d'improviser** ».
- **Correction :** reprendre exactement MHE/THE — **pastilles-PHOTO**, **rien affiché par défaut**, flux garde→Découvrir→app. EHE = MHE/THE, seule la garde change.
- **Règle :** *réutiliser le modèle de la gamme, ne jamais improviser ; lire le fichier source et cloner.*

## 3) 2026-07-05 — bienvenue.html : `uiT` non défini (bouton ENTRER bloqué)
- **Déviation/bug :** `bienvenue.html` appelait `uiT('Un instant…')` alors que `uiT` n'y est pas défini → `ReferenceError` **avant** la navigation → utilisateur **bloqué sur la page de garde** (bloquant sur THE, l'app phare).
- **Correction :** `((window.THEi18n&&THEi18n.ui('…'))||'…')` (API globale sûre) + bump sw v66→v67, vérifié en ligne.
- **Règle :** *les chaînes UI dans un handler JS doivent utiliser l'API i18n dispo sur CETTE page, jamais supposer `uiT`.*

## 4) 2026-07-06 — Généraliser sans regarder (5 pays EHE)
- **Déviation :** constat d'un bug de garde au Portugal → **affirmé que les 5 pays EHE étaient identiquement touchés** sur la foi d'un simple `grep`, **sans rendre chaque cas**. Faux : l'Irlande affichait bien le gaélique.
- **Impact :** « en fait vous regardez pas, vous assumez ».
- **Correction :** méthode « rendu réel headless » par pays/langue, cas par cas.
- **Règle :** *ne JAMAIS généraliser ; ouvrir/rendre CHAQUE cas (screenshot + DOM), un par un.*

## 5) 2026-07-06+ — Parler de cache / renvoyer au navigateur
- **Déviation :** expliquer des soucis d'affichage par « c'est ton cache », demander de vider le cache / navigation privée.
- **Impact :** vécu comme une non-réponse qui le blâme. « ne me parle **jamais plus de cache**, jamais de la vie ».
- **Correction :** régler côté déploiement en silence (bump `sw.js` VERSION), vérifier en ligne (curl/headless).
- **Règle :** *jamais prononcer « cache »/SW à Helmy ; bump sw systématique.*

## 6) 2026-07-07 → 07-10 — Série de correctifs gamme
- **Corrigés :** sitemaps EHE (07/07), garde QHE (08/07), **cache gamme** + **MHE liste/cache** (10/07), Découvrir corrigés (09/07).
- **Leçon :** conséquences des points 4-5 ; corriger **une fois dans le squelette** propage aux clones.

## 7) 2026-07-16 — i18n NON appliquée (constat QHE/EHE)
- **Déviation :** malgré la règle ABSOLUE « zéro texte en dur », QHE avait `the-i18n.js` **non câblé** (0 `data-i18n`, tout en dur FR) ; EHE rattrapait par un dico où **la clé = le français** → toute chaîne FR absente **fuit** en EN/GA. Les `type`/`themes` du géojson = français en clair, absents des dicos.
- **Correction :** chantier revue linguistique EHE (rendu réel, corrections par pays) ; sur Estonia, i18n à clés + garde-fou.
- **Règle :** *i18n à clés dès la 1ʳᵉ ligne, même en une langue ; jamais de texte en dur ; chaque `type` traduit (garde-fou).*

## 8) 2026-07-19 — INVENTER des données (villes du Québec)
- **Déviation :** en clonant QHE, j'ai **fabriqué la liste des villes du Québec + coordonnées** au lieu de prendre les vraies. Puis **sur-interprété** la data (fausse alerte « contamination Vatican » sur un item en réalité montréalais).
- **Impact :** « c'est pathétique, vous ne retenez aucune règle » — atteinte à la règle #1.
- **Correction :** prendre les vraies données du source ; placeholder + demander si absent ; vérifier coords avant d'affirmer.
- **Règle :** *NON-HALLUCINATION (#1) : jamais inventer villes/coords/faits ; ni sur-interpréter.*

## 9) 2026-07-20 / 21 — Série de FIX Estonia
- **Corrigés :** fuites i18n (20/07), narration-nav (20/07), carte UNESCO/niveaux (20/07), voyage-filtres (20/07), voyage-nature (21/07), descriptions FR (21/07), nettoyage registre (21/07), filtres-langue (21/07).
- **Leçon :** beaucoup de fuites FR + réglages d'affichage — mêmes familles de fautes (i18n, filtres, généralisation).

## 10) 2026-07-23 (cette session) — plusieurs déviations
### 10a. Collision des descriptions/voix par le NOM
- **Déviation :** j'ai intégré les descriptions i18n **clés par `norm(nom)`** — or les noms génériques estoniens collisionnent (kivikalme, kaabas, kalmistu…). Résultat : **47% des fiches (6 213)** partageaient une **fausse** description (« Ce tumulus de Jõõdre » sur 1 613 fiches), et les voix générées lisaient ce faux texte.
- **Correction :** **re-clé par `vkey`** (unique) — descriptions ET voix ; app lit `THEi18n.site(p.vkey)`. Voix régénérées (5 736) sur le texte corrigé.
- **Règle :** *clé UNIQUE = `vkey`, jamais le nom (qui collisionne).*

### 10b. Rétrécir le périmètre des voix / perdre des descriptions
- **Déviation :** (1) d'abord ciblé les voix « photo seulement » alors que la règle est « toute fiche à texte » (Helmy a dû rectifier 2×). (2) Mon rebuild par vkey a **perdu 851 vraies descriptions** (session antérieure, hors descout3) ; Helmy l'a remarqué.
- **Correction :** cibler toutes les fiches à texte ; récupérer 615 des 851 via l'ancien i18n (noms uniques). Les ~236 sur noms collisionnés = irrécupérables sans Qid (honnête : rien plutôt qu'un faux).
- **Règle :** *mesurer honnêtement le périmètre, vérifier qu'on ne perd pas de contenu réel.*

### 10c. Déviations « un fichier, un pays » + « oui » creux
- **Déviation :** j'avais introduit une **clé d'échelle nommée `Estonie`** (`itineraire.html` PERIM + `tours.json`), et laissé du pays-spécifique en dur : `IAP_PREFIX='ee'`, URLs **checkout**, `manifest.json` (nom), `<html lang="fr">`, coords de repli, alt logo, commentaires. **Et j'ai confirmé « c'est générique » sans vérifier** → Helmy exaspéré : « si c'est pour dire oui juste pour dire oui, ça sert à rien ».
- **Aggravation :** en corrigeant vite, un **`sed` trop large a corrompu `heritage.config.js`** (retiré « Estonia » là où il DOIT être). Réparé.
- **Correction :** tout passé par `HConf` (échelle → clé neutre `pays` ; IAP → `HConf.iso` ; checkout/tip/description → HConf ; manifest + `<html lang>` **générés par le loader**). `manifest.json` rendu générique. **Audit grep exhaustif** → zéro identité pays dans le code (avec DeepSeek en second regard). Seuls `sitemap.xml`/`robots.txt` restent par-domaine (SEO, sans JS).
- **Règle :** *un fichier, un pays ; **PROUVER par audit avant de confirmer** — un « oui » non prouvé ne vaut rien ; ne pas corriger à coups de `sed` aveugle sur le fichier de config.*

### 10d. `audit.sh` — regex qui ne couvrait qu'un type de guillemets
- **Déviation :** la regex de la section 3 d'`audit.sh` ne testait que les guillemets **simples** (`|| 'ee'`) → elle a **raté un repli pays en guillemets doubles** (`roadtrip-plan.js : var _iso=…||"ee"`). Le vérificateur lui-même avait un angle mort.
- **Impact :** un repli non-neutre passait « audit vert » — le contrôle mentait sur un cas réel.
- **Correction :** code → `|| ""` (repli neutre) ; regex durcie pour couvrir **les deux** guillemets : `['\"][^'\"]`. Vérifiée en la testant contre le vrai fichier (un cas qui **doit** échouer avant, réussir après).
- **Règle :** *tout check anti-fuite doit couvrir `'` **ET** `"`, et être **TESTÉ contre le vrai code** — avec un cas qui doit échouer — **avant** d'y faire confiance. Le vérificateur n'est pas exempté de vérification.*

---

## Familles de fautes récurrentes (à surveiller en priorité)
1. **Affirmer sans vérifier** (généraliser, dire « oui » sans audit, blâmer le cache/appareil) → #1, #4, #5, #10c. **➜ toujours prouver : exécuter/rendre/curl/grep.**
2. **Inventer / sur-interpréter la donnée** → #8. **➜ non-hallucination stricte.**
3. **Texte/valeurs en dur au lieu de dynamique** (i18n, HConf) → #3, #7, #10a, #10c. **➜ i18n à clés + tout via HConf.**
4. **Improviser au lieu de cloner le modèle** → #2. **➜ reprendre MHE/THE/RoadTrip.**

*Ce journal se complète à chaque nouvelle déviation constatée.*
