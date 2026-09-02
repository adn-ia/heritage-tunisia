/* the-affiche.js — L'AFFICHE DU VOYAGE, EN UNE SEULE IMAGE.
   Posé le 02/09/2026, sur la demande de Helmy :

     « la grande photo, pour moi, c'était une grande photo, un fichier de grande
       dimension, où la carte de l'itinéraire est mise, et où chaque étape ou
       lieu visité est mentionné, identifié, et des photos sélectionnées de
       chaque étape apparaissant en étoile reliées à l'étape ou au site visité. »

   Disposition retenue par lui le même jour : les photos en cadre TOUT AUTOUR,
   la carte au centre, un trait fin de chaque photo vers son point numéroté.

   CE QUE ÇA PRODUIT. Un fichier image unique — PNG ou JPEG — en 2480 × 3508
   pixels, c'est-à-dire un A4 à 300 points par pouce. Il s'imprime en grand
   format sans pixelliser, et il s'ouvre tel quel dans Lightroom ou n'importe
   quel éditeur. Rien n'est envoyé : tout est dessiné dans le navigateur.

   POURQUOI LA CARTE EST DESSINÉE, PAS PHOTOGRAPHIÉE. Le fond de carte vit dans
   des tuiles vectorielles rendues par Leaflet : on ne peut pas le recopier
   proprement dans une image de 2480 px sans le refaire pixel par pixel. Le
   tracé, lui, tient dans les coordonnées que la page porte déjà. On dessine
   donc la ROUTE et ses points, sur un fond uni — c'est net à toute taille, et
   c'est le parti-pris des affiches de voyage.

   BLOC AUTOPORTÉ. Une ligne dans la page, rien à modifier ailleurs. Il ne
   connaît du reste que ce qui est écrit dans le DOM — les `.the-carnet` et
   leurs `data-nom`, `data-ville`, `data-lat`, `data-lng` — et `THECarnet.lire`
   pour les photos. Il se retire en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEaffiche) return;

  /* A4 à 300 points par pouce, dans les deux sens. L'ORIENTATION SE CHOISIT SELON
     LE TRACÉ — 02/09/2026, après la deuxième affiche produite : un itinéraire de
     ville s'étend beaucoup plus en longitude qu'en latitude. Sur une feuille
     verticale, son tracé devenait un trait fin au milieu de deux tiers de vide.
     On ne déforme pas la carte pour remplir la page ; on tourne la page. */
  var A4_COURT = 2480, A4_LONG = 3508;
  var LARGE = A4_COURT, HAUT = A4_LONG;
  var MARGE = 110;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";     // zéro repli en dur : un trou se voit
  }
  function dire(t) { if (window.THEtoast) THEtoast(t); }

  /* ── ce que la page sait déjà de l'itinéraire ─────────────────────────────── */
  function etapes() {
    return [].slice.call(document.querySelectorAll(".stop")).map(function (st, i) {
      var cn = st.querySelector(".the-carnet");
      if (!cn) return null;
      var lat = parseFloat(cn.getAttribute("data-lat")),
          lng = parseFloat(cn.getAttribute("data-lng"));
      if (!isFinite(lat) || !isFinite(lng)) return null;
      return { n: i + 1, place: cn.getAttribute("data-place"),
               nom: cn.getAttribute("data-nom") || "",
               ville: cn.getAttribute("data-ville") || "",
               lat: lat, lng: lng };
    }).filter(Boolean);
  }
  function titre() {
    var h = document.querySelector("#rsum h2, #rsum .tour-t, .album-cover h1");
    return h ? h.textContent.replace(/^[^\wÀ-ÿ]+/, "").trim() : "";
  }
  function soustitre() {
    /* ⚠️ PAS `#rsum .meta` — 02/09/2026, première mise à l'épreuve. Il porte
       tout le détail de composition : « 4 étapes · itinéraire enregistré ·
       enregistré · aller simple · ~4 km depuis Tunis · durées indicatives ·
       📷 7 souvenirs… », qui débordait de l'affiche et se coupait au milieu d'un
       mot. La couverture de l'album porte déjà la ligne juste, en trois temps :
       « 4 étapes · ~4 km · 2 septembre 2026 ». On prend celle-là. */
    var m = document.querySelector(".album-cover .ac-meta");
    if (m) return m.textContent.replace(/\s+/g, " ").trim();
    var n = document.querySelectorAll(".stop").length;
    return n ? (n + " " + T("menu.etapes")) : "";
  }

  /* ── la projection : des degrés vers des pixels ───────────────────────────── */
  /* Mercator sur la latitude — sans elle, un pays haut en latitude s'écrase.
     À l'échelle d'un itinéraire c'est presque une droite, mais « presque »
     n'est pas une raison de fausser le dessin. */
  function merc(lat) {
    var r = lat * Math.PI / 180;
    return Math.log(Math.tan(Math.PI / 4 + r / 2));
  }
  function projeter(pts, boite) {
    var xs = pts.map(function (p) { return p.lng; }),
        ys = pts.map(function (p) { return merc(p.lat); });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs),
        y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    /* un itinéraire d'un seul point n'a pas d'étendue : on lui en invente une
       plutôt que de diviser par zéro. */
    if (x1 - x0 < 1e-9) { x0 -= 0.01; x1 += 0.01; }
    if (y1 - y0 < 1e-9) { y0 -= 0.01; y1 += 0.01; }
    var pad = 90;
    var l = boite.w - pad * 2, h = boite.h - pad * 2;
    /* ⚠️ MÊME ÉCHELLE EN X ET EN Y — on ne déforme pas une carte, jamais. Un
       itinéraire de ville s'étend beaucoup plus en longitude qu'en latitude : le
       tracé occupe alors toute la largeur et une bande fine en hauteur. C'est
       géométriquement juste, et c'est voulu. Le vide qui restait autour n'était
       pas dû à l'échelle mais aux photos tassées — voir `emplacements`. */
    var k = Math.min(l / (x1 - x0), h / (y1 - y0));
    var dx = boite.x + pad + (l - (x1 - x0) * k) / 2;
    var dy = boite.y + pad + (h - (y1 - y0) * k) / 2;
    return pts.map(function (p) {
      return { x: dx + (p.lng - x0) * k,
               y: dy + (y1 - merc(p.lat)) * k };         // le nord en haut
    });
  }

  /* ── les places des photos, tout autour du cadre ──────────────────────────── */
  /* On remplit d'abord les côtés, puis le haut et le bas : les traits restent
     courts et ne se croisent pas. */
  function emplacements(nb, boite, photoL, photoH) {
    /* ⚠️ ELLES SE RÉPARTISSENT SUR TOUTE LA HAUTEUR — corrigé le 02/09/2026 après
       la première affiche produite : les quatre photos se tassaient au milieu et
       laissaient les deux tiers de la feuille vides. On répartit maintenant à pas
       égal sur la colonne entière ; l'affiche est remplie quel que soit le nombre
       d'étapes. */
    var out = [], i;
    var parCote = Math.ceil(nb / 2);                 // moitié à gauche, moitié à droite
    var bloc = photoH + 74;                          // le cadre porte sa légende
    var pas = parCote > 1 ? (boite.h - bloc) / (parCote - 1) : 0;
    var depart = parCote > 1 ? boite.y : boite.y + (boite.h - bloc) / 2;
    var gauche = [], droite = [];
    for (i = 0; i < parCote; i++) {
      gauche.push({ x: MARGE, y: depart + i * pas });
      droite.push({ x: LARGE - MARGE - photoL, y: depart + i * pas });
    }
    for (i = 0; i < nb; i++) out.push(i % 2 ? droite[(i - 1) / 2 | 0] : gauche[i / 2 | 0]);
    return out.filter(Boolean);
  }

  function charger(blob) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); res(null); };
      im.src = u;
    });
  }

  /* ── le dessin ────────────────────────────────────────────────────────────── */
  /* la forme du trajet décide de celle de la feuille */
  function orienter(liste) {
    var xs = liste.map(function (p) { return p.lng; }),
        ys = liste.map(function (p) { return merc(p.lat); });
    var dx = Math.max.apply(null, xs) - Math.min.apply(null, xs);
    var dy = Math.max.apply(null, ys) - Math.min.apply(null, ys);
    var paysage = dx > dy * 1.15;          // nettement plus large que haut
    LARGE = paysage ? A4_LONG : A4_COURT;
    HAUT  = paysage ? A4_COURT : A4_LONG;
  }

  function dessiner(liste, photos) {
    orienter(liste);
    var c = document.createElement("canvas");
    c.width = LARGE; c.height = HAUT;
    var g = c.getContext("2d");

    var CREME = "#efe7d6", ENCRE = "#2b2318", OR = "#a8884f", VERT = "#2e6a4d";
    g.fillStyle = CREME; g.fillRect(0, 0, LARGE, HAUT);

    /* en-tête */
    g.fillStyle = ENCRE; g.textAlign = "center";
    g.font = "600 96px Georgia, 'Cormorant Garamond', serif";
    g.fillText(titre() || "", LARGE / 2, MARGE + 96);
    g.fillStyle = "#8a7c66"; g.font = "italic 44px Georgia, serif";
    g.fillText(soustitre(), LARGE / 2, MARGE + 168);

    /* le cadre photo occupe les bords ; la carte, le centre.
       LES PHOTOS SUIVENT LA FEUILLE — 02/09/2026 : à taille fixe, elles étaient
       justes en portrait et minuscules en paysage, où la feuille est 40 % plus
       large. On les dimensionne en part de la largeur. */
    var photoL = Math.round(LARGE * 0.155), photoH = Math.round(photoL * 0.75);
    var carte = { x: MARGE + photoL + 70, y: MARGE + 260,
                  w: LARGE - 2 * (MARGE + photoL + 70), h: HAUT - MARGE - 360 };

    var pts = projeter(liste, carte);

    /* le tracé */
    g.strokeStyle = VERT; g.lineWidth = 7;
    g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath();
    pts.forEach(function (p, i) { i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); });
    g.stroke();

    /* les places des photos, puis les traits — dessinés AVANT les pastilles
       pour passer dessous, jamais dessus */
    var places = emplacements(liste.length, { x: MARGE, y: carte.y, w: photoL, h: carte.h },
                              photoL, photoH);
    g.strokeStyle = "rgba(43,35,24,.34)"; g.lineWidth = 2.5;
    places.forEach(function (pl, i) {
      if (!pts[i]) return;
      var depart = pl.x < LARGE / 2 ? pl.x + photoL : pl.x;
      g.beginPath();
      g.moveTo(depart, pl.y + photoH / 2);
      g.lineTo(pts[i].x, pts[i].y);
      g.stroke();
    });

    /* les pastilles numérotées */
    pts.forEach(function (p, i) {
      g.beginPath(); g.arc(p.x, p.y, 34, 0, 6.2832);
      g.fillStyle = OR; g.fill();
      g.strokeStyle = CREME; g.lineWidth = 5; g.stroke();
      g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = "700 36px Georgia, serif";
      g.fillText(String(liste[i].n), p.x, p.y + 2);
      g.textBaseline = "alphabetic";
    });

    /* les photos et leur légende */
    places.forEach(function (pl, i) {
      var e = liste[i], im = photos[i];
      g.save();
      g.shadowColor = "rgba(0,0,0,.22)"; g.shadowBlur = 26; g.shadowOffsetY = 8;
      g.fillStyle = "#fff";
      g.fillRect(pl.x, pl.y, photoL, photoH + 74);        // le cadre, façon tirage
      g.restore();

      if (im) {
        /* on remplit le cadre sans déformer : on rogne le débordement */
        var k = Math.max(photoL / im.naturalWidth, photoH / im.naturalHeight);
        var w = im.naturalWidth * k, h = im.naturalHeight * k;
        g.save();
        g.beginPath(); g.rect(pl.x + 14, pl.y + 14, photoL - 28, photoH - 14); g.clip();
        g.drawImage(im, pl.x + 14 + (photoL - 28 - w) / 2, pl.y + 14 + (photoH - 14 - h) / 2, w, h);
        g.restore();
      } else {
        g.fillStyle = "#e4dcc9";
        g.fillRect(pl.x + 14, pl.y + 14, photoL - 28, photoH - 14);
      }

      g.fillStyle = ENCRE; g.textAlign = "left";
      g.font = "600 30px Georgia, serif";
      var nom = String(e.n) + ". " + e.nom;
      while (g.measureText(nom).width > photoL - 34 && nom.length > 6) nom = nom.slice(0, -2) + "…";
      g.fillText(nom, pl.x + 17, pl.y + photoH + 30);
      if (e.ville) {
        g.fillStyle = "#8a7c66"; g.font = "italic 26px Georgia, serif";
        g.fillText(e.ville, pl.x + 17, pl.y + photoH + 62);
      }
    });

    /* pied : la marque, discrète */
    g.fillStyle = "#8a7c66"; g.textAlign = "center"; g.font = "28px Georgia, serif";
    g.fillText((window.HConf && HConf.marque) || "", LARGE / 2, HAUT - 60);
    return c;
  }

  /* ── produire le fichier ──────────────────────────────────────────────────── */
  function produire(format) {
    var liste = etapes();
    if (!liste.length) { dire(T("affiche.aucune.etape")); return; }
    dire(T("affiche.en.cours"));

    var lire = (window.THECarnet && THECarnet.lire) ? THECarnet.lire : null;
    var attentes = liste.map(function (e) {
      if (!lire) return Promise.resolve(null);
      return lire(e.place).then(function (arr) {
        /* la photo d'en-tête si elle existe, sinon la première image */
        var im = (arr || []).filter(function (m) {
          return m && m.blob && String(m.type || m.blob.type || "").indexOf("image") === 0;
        });
        var h = im.filter(function (m) { return m.hero; })[0] || im[0];
        return h ? charger(h.blob) : null;
      }).catch(function () { return null; });
    });

    Promise.all(attentes).then(function (photos) {
      var c = dessiner(liste, photos);
      var type = (format === "png") ? "image/png" : "image/jpeg";
      c.toBlob(function (blob) {
        if (!blob) { dire(T("affiche.echec")); return; }
        var u = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = u;
        a.download = (titre() || "affiche").replace(/[\/\\?%*:|"<>]/g, "-")
                   + "-affiche." + (format === "png" ? "png" : "jpg");
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        dire(T("affiche.faite"));
      }, type, 0.92);
    }).catch(function () { dire(T("affiche.echec")); });
  }

  /* ── le choix du format, dans une fenêtre à soi ───────────────────────────── */
  function choisir() {
    var ov = document.getElementById("af-modal");
    if (!ov) {
      var css = document.createElement("style");
      css.textContent =
        "#af-modal{position:fixed;inset:0;z-index:1600;background:rgba(20,15,10,.78);display:none;" +
        "align-items:flex-start;justify-content:center;overflow:auto;padding:22px}" +
        "#af-modal.on{display:flex}" +
        "#af-modal .af-box{background:#fffdf8;color:#2b2318;border-radius:14px;padding:18px;" +
        "max-width:420px;width:100%;position:relative;box-shadow:0 12px 44px rgba(0,0,0,.4)}" +
        "#af-modal h3{font-family:Georgia,serif;font-size:22px;margin:0 2px 4px}" +
        "#af-modal .af-lead{color:#8a7c66;font-size:14px;margin:0 2px 14px}" +
        "#af-modal button.af-opt{display:block;width:100%;text-align:left;margin-bottom:9px;" +
        "border:1.5px solid #e3d8c4;background:#fff;border-radius:11px;padding:13px 15px;" +
        "font:inherit;font-size:16px;cursor:pointer;color:#2b2318}" +
        "#af-modal button.af-opt small{display:block;color:#8a7c66;font-size:13px;margin-top:3px}" +
        "#af-modal .af-x{position:absolute;top:8px;right:11px;background:none;border:none;" +
        "font-size:24px;line-height:1;cursor:pointer;color:#8a7c66}";
      document.head.appendChild(css);
      ov = document.createElement("div"); ov.id = "af-modal";
      ov.innerHTML = '<div class="af-box"></div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.remove("on"); });
    }
    var b = ov.querySelector(".af-box");
    b.innerHTML =
      '<button class="af-x" type="button" aria-label="' + T("print.fermer") + '">×</button>' +
      "<h3>🖼️ " + T("affiche.titre") + "</h3>" +
      '<p class="af-lead">' + T("affiche.lead") + "</p>" +
      '<button class="af-opt" type="button" data-f="jpg">' + T("affiche.jpeg") +
        "<small>" + T("affiche.jpeg.sous") + "</small></button>" +
      '<button class="af-opt" type="button" data-f="png">' + T("affiche.png") +
        "<small>" + T("affiche.png.sous") + "</small></button>";
    b.querySelector(".af-x").onclick = function () { ov.classList.remove("on"); };
    [].forEach.call(b.querySelectorAll(".af-opt"), function (x) {
      x.onclick = function () { ov.classList.remove("on"); produire(x.getAttribute("data-f")); };
    });
    ov.classList.add("on");
  }

  window.THEaffiche = { ouvrir: choisir, produire: produire };

  /* ── le bouton, dans la barre du document ─────────────────────────────────── */
  function poser() {
    var barre = document.querySelector(".album-bar");
    if (!barre || barre.querySelector("[data-affiche]")) return;
    var apres = document.getElementById("albumprint");
    var b = document.createElement("button");
    b.type = "button"; b.className = "ab";
    b.setAttribute("data-affiche", "1");
    b.setAttribute("data-i18n", "affiche.bouton");
    b.textContent = T("affiche.bouton");
    b.onclick = choisir;
    if (apres && apres.parentNode === barre) barre.insertBefore(b, apres.nextSibling);
    else barre.appendChild(b);
  }
  function guetter() {
    poser();
    try { new MutationObserver(poser).observe(document.body, { childList: true, subtree: true }); }
    catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", guetter);
  else guetter();
})();
