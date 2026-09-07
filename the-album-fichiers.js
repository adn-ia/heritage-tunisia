/* ─────────────────────────────────────────────────────────────────────────────
   the-album-fichiers.js — RANGER SES PHOTOS EN DOSSIERS
   Brique AUTO-PORTÉE STRICTE (règle 4.11) : elle embarque son code, sa donnée et
   ses traductions. Elle lit UNIQUEMENT deux gestes publics de l'hôte —
   `THEvoyage()` pour le voyage, `THECarnet.lire()` pour les médias — et n'écrit
   nulle part. Elle se retire en effaçant sa ligne <script>.

   ⚠️ CE QU'ELLE RÉSOUT — Helmy, 07/09/2026 : « la répartition en répertoires
   spécifiques sur le téléphone des photos prises et des médias : sous-répertoire
   par nom d'étape […] le répertoire est le nom du voyage, le sous-répertoire le
   nom de l'étape, et dedans la photo d'origine, la photo modifiée y compris
   celle où il y a une légende, les sons et vidéos. »

   ⚠️ POURQUOI PAS UN LIEN VERS LA GALERIE — §10 du dépannage itinéraire :
   « un navigateur n'a pas accès au chemin d'un fichier ; la référence meurt avec
   la page ». Retenir « la photo n° 4237 de la photothèque » est impossible dans
   une PWA. Les médias vivent donc DÉJÀ dans l'application, rangés par étape —
   ce qui manquait, c'est de pouvoir les SORTIR sous cette forme.

   ⚠️ ET PAS DE DOUBLON : une photo prise dans le carnet ne va pas dans la
   pellicule ; c'est le bouton ⬇️ du gestionnaire qui l'y met, à la demande.

   Format demandé par Helmy le 07/09 : dossier = nom du voyage · sous-dossier =
   « <numéro> - <nom de l'étape> » · légende en BANDEAU SOUS la photo.

   Le fichier produit est un ZIP écrit ici même, sans bibliothèque : les photos
   sont déjà compressées, on les range telles quelles (méthode « stockage »).
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  if (window.THEalbumFichiers) return;

  var DATA = null, LANG = "fr";

  function charger() {
    if (DATA) return Promise.resolve(DATA);
    try { LANG = (localStorage.getItem("the_lang") || "fr").slice(0, 2); } catch (e) {}
    var src = (document.currentScript && document.currentScript.src) || "the-album-fichiers.js";
    return fetch(src.replace(/[^/]+$/, "the-album-fichiers.data.json"))
      .then(function (r) { return r.json(); })
      .then(function (j) { DATA = j; return j; });
  }
  /* repli ANGLAIS, jamais le français : c'est le pivot des briques (règle 4.11) */
  function L(cle) {
    var d = DATA || {};
    var t = (d[LANG] && d[LANG][cle]) || (d.en && d.en[cle]) || "";
    return t;
  }

  /* ── le nom d'un dossier ou d'un fichier, sans rien qui casse un système ──── */
  function propre(txt) {
    return String(txt || "")
      .replace(/[\/\\?%*:|"<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "-";
  }
  function extension(nom, type) {
    var m = /\.([A-Za-z0-9]{2,5})$/.exec(String(nom || ""));
    if (m) return m[1].toLowerCase();
    var t = String(type || "");
    if (t.indexOf("video") === 0) return "mp4";
    if (t.indexOf("audio") === 0) return "m4a";
    return "jpg";
  }

  /* ── la légende, en BANDEAU SOUS la photo ──────────────────────────────────
     Choix de Helmy, 07/09 : « en bandeau sous la photo ». L'image reste
     entière — on ajoute une bande dessous, on ne recouvre rien. */
  /* Combien de décodages ont expiré. Au-delà de deux, le moteur de ce téléphone
     ne sait manifestement pas ouvrir ces photos : on cesse d'essayer, sinon un
     voyage de trois cents photos attendrait douze secondes CHACUNE, soit une
     heure. Les originales, elles, sont rangées quoi qu'il arrive. */
  var renoncements = 0;

  function avecBandeau(blob, texte) {
    return new Promise(function (res) {
      if (!texte || renoncements >= 2) return res(null);
      var url = URL.createObjectURL(blob), img = new Image(), fini = false;
      /* ⚠️ GARDE EXTÉRIEURE — leçon du §4 du dépannage itinéraire : un décodage
         qui n'appelle NI onload NI onerror laisse la promesse en suspens pour
         toujours, et le bouton reste grisé. Le cas existe : une photo HEIC
         d'iPhone qu'un moteur ne sait pas ouvrir. On renonce au bandeau au bout
         de douze secondes — l'originale, elle, est déjà rangée. */
      function rendre(v) {
        if (fini) return;
        fini = true;
        URL.revokeObjectURL(url);
        res(v);
      }
      setTimeout(function () { if (!fini) renoncements++; rendre(null); }, 12000);
      img.onload = function () {
        try {
          var l = img.naturalWidth, h = img.naturalHeight;
          var marge = Math.round(l * 0.035);
          var taille = Math.max(14, Math.round(l * 0.032));
          var c = document.createElement("canvas"), x = c.getContext("2d");
          x.font = taille + "px Georgia, 'Times New Roman', serif";
          /* on coupe le texte en lignes qui tiennent dans la largeur */
          var mots = String(texte).split(/\s+/), lignes = [], ligne = "";
          for (var i = 0; i < mots.length; i++) {
            var essai = ligne ? ligne + " " + mots[i] : mots[i];
            if (x.measureText(essai).width > l - 2 * marge && ligne) { lignes.push(ligne); ligne = mots[i]; }
            else ligne = essai;
          }
          if (ligne) lignes.push(ligne);
          var interligne = Math.round(taille * 1.42);
          var bande = marge * 2 + lignes.length * interligne;
          c.width = l; c.height = h + bande;
          x.fillStyle = "#fffdf8"; x.fillRect(0, 0, l, h + bande);
          x.drawImage(img, 0, 0, l, h);
          x.fillStyle = "#c9ad79"; x.fillRect(0, h, l, Math.max(2, Math.round(l * 0.004)));
          x.fillStyle = "#4b3f2a";
          x.font = taille + "px Georgia, 'Times New Roman', serif";
          x.textBaseline = "top";
          for (var k = 0; k < lignes.length; k++)
            x.fillText(lignes[k], marge, h + marge + k * interligne);
          c.toBlob(function (b) { rendre(b); }, "image/jpeg", 0.92);
        } catch (e) { rendre(null); }
      };
      img.onerror = function () { rendre(null); };
      img.src = url;
    });
  }

  /* ── le ZIP, écrit ici : aucune bibliothèque, rien à télécharger ──────────
     Méthode « stockage » (pas de compression) : les photos et les vidéos sont
     déjà compressées, les recompresser ne gagnerait rien et coûterait du temps
     sur un téléphone. Le drapeau UTF-8 (bit 11) permet les accents dans les
     noms de dossiers.

     ⚠️ ON NE GARDE JAMAIS LES OCTETS. Refus de DeepSeek du 07/09/2026, motif 2 :
     « tous les Uint8Array restent dans entrees, puis on assemble encore un Blob
     géant » — sur un téléphone la page est tuée SANS erreur rattrapable. On lit
     donc chaque média une fois, juste le temps d'en calculer la somme de
     contrôle, puis on relâche les octets et on ne garde que le Blob d'origine :
     le navigateur le laisse sur le disque au lieu de la mémoire vive. */
  var TABLE = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(u8) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) c = TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function sommeDuBlob(blob) {
    return blob.arrayBuffer().then(function (a) { return crc32(new Uint8Array(a)); });
  }
  function motsDeDate(d) {
    var t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    var j = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
    return { heure: t, jour: j };
  }

  /* Les bornes du format : au-delà, les champs débordent et l'archive est
     illisible SANS le dire. On refuse d'en produire une plutôt que d'en donner
     une cassée au voyageur. (Refus DeepSeek, motif 3.) */
  var MAX_ENTREES = 65000, MAX_POIDS = 3900000000;
  var TROP = { trop: true };

  function zipper(entrees) {
    var enc = new TextEncoder(), morceaux = [], central = [], decalage = 0;
    var dt = motsDeDate(new Date());
    entrees.forEach(function (e) {
      var nom = enc.encode(e.chemin), taille = e.taille, som = e.somme;
      var eloc = new DataView(new ArrayBuffer(30));
      eloc.setUint32(0, 0x04034b50, true); eloc.setUint16(4, 20, true);
      eloc.setUint16(6, 0x0800, true);            /* noms en UTF-8 */
      eloc.setUint16(8, 0, true);                 /* stockage, sans compression */
      eloc.setUint16(10, dt.heure, true); eloc.setUint16(12, dt.jour, true);
      eloc.setUint32(14, som, true);
      eloc.setUint32(18, taille, true); eloc.setUint32(22, taille, true);
      eloc.setUint16(26, nom.length, true); eloc.setUint16(28, 0, true);
      morceaux.push(new Uint8Array(eloc.buffer), nom, e.blob);

      var ecen = new DataView(new ArrayBuffer(46));
      ecen.setUint32(0, 0x02014b50, true); ecen.setUint16(4, 20, true); ecen.setUint16(6, 20, true);
      ecen.setUint16(8, 0x0800, true); ecen.setUint16(10, 0, true);
      ecen.setUint16(12, dt.heure, true); ecen.setUint16(14, dt.jour, true);
      ecen.setUint32(16, som, true);
      ecen.setUint32(20, taille, true); ecen.setUint32(24, taille, true);
      ecen.setUint16(28, nom.length, true);
      ecen.setUint32(42, decalage, true);
      central.push(new Uint8Array(ecen.buffer), nom);
      decalage += 30 + nom.length + taille;
    });
    var tailleCentral = central.reduce(function (n, m) { return n + m.length; }, 0);
    var fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true);
    fin.setUint16(8, entrees.length, true); fin.setUint16(10, entrees.length, true);
    fin.setUint32(12, tailleCentral, true); fin.setUint32(16, decalage, true);
    return new Blob(morceaux.concat(central, [new Uint8Array(fin.buffer)]), { type: "application/zip" });
  }

  /* ── deux photos du même nom dans la même étape ────────────────────────────
     MESURÉ le 07/09/2026 : deux entrées au même chemin, et `unzip` comme le
     déballeur d'Apple gardent la SECONDE. La photo du matin disparaît sans un
     mot. On numérote donc le doublon avant de l'écrire. */
  function cheminLibre(vus, chemin) {
    if (!vus[chemin]) { vus[chemin] = 1; return chemin; }
    var n = ++vus[chemin];
    var m = /^(.*?)(\.[A-Za-z0-9]{2,5})$/.exec(chemin);
    var essai = m ? m[1] + " (" + n + ")" + m[2] : chemin + " (" + n + ")";
    return cheminLibre(vus, essai);
  }

  /* ── remettre le fichier au voyageur ───────────────────────────────────────
     ⚠️ En coque iOS, un `a.download` sur une URL `blob:` ne donne RIEN : c'est
     le motif 1 du refus de DeepSeek, et je n'ai pas d'iPhone pour le mesurer.
     On passe donc d'abord par la feuille de partage du téléphone, qui sait
     écrire dans Fichiers, et on ne retombe sur le lien que si elle est absente.
     Un partage annulé par le voyageur n'est pas un échec : on ne fait rien. */
  function lien(blob, nom) {
    var url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 8000);
  }
  function livrer(blob, nom) {
    var f = null;
    try { f = new File([blob], nom, { type: "application/zip" }); } catch (e) {}
    if (f && navigator.share && navigator.canShare && navigator.canShare({ files: [f] })) {
      return navigator.share({ files: [f], title: nom }).catch(function (e) {
        if (e && e.name === "AbortError") return;      /* il a dit non, c'est son droit */
        lien(blob, nom);
      });
    }
    lien(blob, nom);
    return Promise.resolve();
  }

  /* ── le geste ─────────────────────────────────────────────────────────────── */
  function ranger(bouton) {
    var v = (typeof THEvoyage === "function") ? THEvoyage() : null;
    if (!v || !v.etapes || !v.etapes.length) { dire(L("vide")); return; }
    if (!window.THECarnet || !THECarnet.lire) { dire(L("vide")); return; }

    var ancien = bouton.textContent;
    bouton.disabled = true; bouton.textContent = "⏳ " + L("en.cours");

    var racine = propre(v.titre || L("voyage"));
    var entrees = [], photos = 0, poids = 0, vus = {}, soucis = [];

    /* une entrée = un chemin unique, un poids compté, une somme calculée puis
       les octets relâchés. Rien ne s'accumule en mémoire. */
    function ajouter(chemin, blob) {
      if (entrees.length >= MAX_ENTREES || poids + blob.size > MAX_POIDS) throw TROP;
      return sommeDuBlob(blob).then(function (som) {
        poids += blob.size;
        entrees.push({ chemin: cheminLibre(vus, chemin), blob: blob, taille: blob.size, somme: som });
      });
    }

    var chaine = Promise.resolve();
    v.etapes.forEach(function (e) {
      chaine = chaine.then(function () {
        var dossier = racine + "/" + propre(e.n + " - " + (e.nom || ""));
        return THECarnet.lire(e.place).then(function (medias) {
          var suite = Promise.resolve();
          (medias || []).forEach(function (m, i) {
            suite = suite.then(function () {
              if (!m || !m.blob) return;
              var ext = extension(m.name, m.type);
              var base = propre((m.name || "").replace(/\.[A-Za-z0-9]{2,5}$/, "")) || (L("photo") + " " + (i + 1));
              var image = String(m.type || "").indexOf("image") === 0;
              return ajouter(dossier + "/" + base + "." + ext, m.blob).then(function () {
                if (image) photos++;
                /* la photo annotée vit à côté de l'originale, jamais à sa place */
                if (!image || !e.note) return;
                return avecBandeau(m.blob, e.note).then(function (b) {
                  if (!b) return;
                  return ajouter(dossier + "/" + base + " - " + propre(L("suffixe.legende")) + ".jpg", b);
                });
              });
            });
          });
          return suite.then(function () {
            if (!e.note) return;
            var t = new Blob([(e.nom || "") + "\n\n" + e.note + "\n"], { type: "text/plain" });
            return ajouter(dossier + "/" + propre(L("fichier.legende")) + ".txt", t);
          });
        });
      }).catch(function (err) {
        if (err === TROP) throw err;
        /* ⚠️ une étape illisible ne se tait PAS : elle se nomme à la fin.
           Refus DeepSeek, point supplémentaire : une archive partielle annoncée
           comme un succès, pour des souvenirs de voyage, est inacceptable. */
        soucis.push(e.nom || ("#" + e.n));
      });
    });

    chaine.then(function () {
      if (!entrees.length) { dire(L("vide")); return; }
      var nom = racine + " - " + new Date().toISOString().slice(0, 10) + ".zip";
      return livrer(zipper(entrees), nom).then(function () {
        dire(soucis.length
          ? L("partiel") + " " + soucis.join(", ")
          : L("fait") + " " + photos);
      });
    }).catch(function (err) {
      dire(err === TROP ? L("trop.gros") : L("echec"));
    }).then(function () {
      bouton.disabled = false; bouton.textContent = ancien;
    });
  }

  function dire(t) {
    if (!t) return;
    if (typeof showGuide === "function") { showGuide(t, 8000); return; }
    if (typeof THEtoast === "function") { THEtoast(t); return; }
  }

  /* ── le bouton, dans la barre du document, à côté de « Enregistrer l'album »
     ⚠️ L'ORDRE EST POSÉ EN LIGNE, PAS DANS LA FEUILLE DE L'HÔTE. La barre range
     ses gestes par `order` CSS (itineraire.html l. 296) ; une brique qui poserait
     son bouton sans ordre tomberait en tête. On déclare donc le nôtre ici — la
     page n'a pas une ligne à changer pour nous.

     ⚠️ ON N'ÉCOUTE PAS TOUT LE DOCUMENT. Refus DeepSeek, motif 6 : un observateur
     sur `document.body` en `subtree` se réveille à chaque marqueur que Leaflet
     redessine. On l'arrête dès que le bouton est posé, et on renonce au bout
     d'une minute si la barre n'existe pas dans cette page. */
  var guetteur = null, renoncer = null;
  function poser() {
    var barre = document.querySelector(".album-bar");
    if (!barre || barre.querySelector("[data-album-fichiers]")) return;
    charger().then(function () {
      if (barre.querySelector("[data-album-fichiers]")) return;
      var b = document.createElement("button");
      b.type = "button"; b.className = "ab";
      b.setAttribute("data-album-fichiers", "1");
      b.style.order = "8";                 /* juste après « Enregistrer l'album » */
      b.textContent = L("bouton");
      b.onclick = function () { ranger(b); };
      var apres = document.getElementById("albumsite");
      if (apres && apres.parentNode === barre) barre.insertBefore(b, apres.nextSibling);
      else barre.appendChild(b);
      arreterLaGuette();
    }).catch(function () {});
  }
  function arreterLaGuette() {
    if (guetteur) { try { guetteur.disconnect(); } catch (e) {} guetteur = null; }
    if (renoncer) { clearTimeout(renoncer); renoncer = null; }
  }

  window.THEalbumFichiers = { ranger: ranger };

  if (document.readyState !== "loading") poser();
  else document.addEventListener("DOMContentLoaded", poser);
  setTimeout(poser, 1500);
  try {
    guetteur = new MutationObserver(poser);
    guetteur.observe(document.body, { childList: true, subtree: true });
    renoncer = setTimeout(arreterLaGuette, 60000);
  } catch (e) {}
})();
