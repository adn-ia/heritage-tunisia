/* the-planche.js — LA PLANCHE-CONTACT, EN UNE IMAGE.
   Posé le 02/09/2026, sur la demande de Helmy :

     « les compositions d'impression peuvent être imprimées ou en PDF ; peut-on
       les avoir en PNG ou JPEG pour les importer sur Lightroom ou tout éditeur
       photo — surtout planche-contact »   puis, sur le contenu :
     « les planches contact, c'est les photos nues ».

   PHOTOS NUES. Aucun titre, aucune légende, aucun numéro d'étape, aucune marque.
   Une planche-contact sert à REGARDER et à choisir ; tout texte gravé dans
   l'image gênerait le travail qui suit. C'est sa consigne, et c'est aussi
   l'usage.

   CE QUE ÇA PRODUIT. Un fichier image unique, JPEG ou PNG, à la résolution que
   demande un éditeur : la vignette fait 640 pixels de côté, la planche s'étend
   selon le nombre de photos. Rien n'est envoyé : tout est dessiné dans le
   navigateur, à partir des photos déjà sur l'appareil.

   POURQUOI PAS L'IMPRESSION EXISTANTE. La composition « planche-contact » de
   `the-print.js` produit une PAGE — pour du papier ou un PDF. Celle-ci produit
   une IMAGE, sans mise en page ni typographie, faite pour être ouverte ailleurs.
   Les deux coexistent : ce ne sont pas les mêmes usages.

   BLOC AUTOPORTÉ. Une ligne dans la page. Il ne connaît du reste que les
   `.the-carnet[data-place]` écrits dans le DOM et `THECarnet.lire`. Il se retire
   en effaçant sa ligne. */
(function () {
  "use strict";
  if (window.THEplanche) return;

  var COTE = 640;      // côté d'une vignette, en pixels
  var JOINT = 20;      // l'espace entre deux vignettes
  var BORD = 44;

  function T(cle) {
    var v = window.THEi18n && THEi18n.ui && THEi18n.ui(cle);
    return (v && v !== cle) ? v : "";
  }
  function dire(t) { if (window.THEtoast) THEtoast(t); }

  function titre() {
    var h = document.querySelector(".album-cover h1, #rsum h2");
    return h ? h.textContent.replace(/^[^\wÀ-ÿ]+/, "").trim() : "";
  }

  function charger(blob) {
    return new Promise(function (res) {
      var u = URL.createObjectURL(blob), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); res(null); };
      im.src = u;
    });
  }

  /* toutes les images du voyage, étape après étape, dans l'ordre du parcours */
  function toutesLesPhotos() {
    var lire = window.THECarnet && THECarnet.lire;
    if (!lire) return Promise.resolve([]);
    var places = [].slice.call(document.querySelectorAll(".stop .the-carnet"))
                   .map(function (c) { return c.getAttribute("data-place"); })
                   .filter(Boolean);
    return Promise.all(places.map(function (pl) {
      return lire(pl).then(function (arr) {
        return (arr || []).filter(function (m) {
          return m && m.blob && String(m.type || m.blob.type || "").indexOf("image") === 0;
        });
      }).catch(function () { return []; });
    })).then(function (parEtape) {
      var out = [];
      parEtape.forEach(function (l) { l.forEach(function (m) { out.push(m); }); });
      return out;
    });
  }

  /* La grille cherche la forme la plus carrée : une planche de 40 photos sur
     deux colonnes serait un ruban, sur vingt une frise. */
  function colonnes(n) {
    if (n <= 2) return n;
    var c = Math.ceil(Math.sqrt(n * 1.25));
    return Math.max(2, Math.min(8, c));
  }

  function dessiner(images) {
    var n = images.length;
    var col = colonnes(n), lig = Math.ceil(n / col);
    var c = document.createElement("canvas");
    c.width  = BORD * 2 + col * COTE + (col - 1) * JOINT;
    c.height = BORD * 2 + lig * COTE + (lig - 1) * JOINT;
    var g = c.getContext("2d");

    /* fond blanc : c'est ce qu'attend un éditeur photo, et une vignette claire
       ou sombre s'y lit également bien. */
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);

    images.forEach(function (im, i) {
      var x = BORD + (i % col) * (COTE + JOINT);
      var y = BORD + Math.floor(i / col) * (COTE + JOINT);
      /* case gris très clair : une photo verticale ne flotte pas dans le vide */
      g.fillStyle = "#f2f2f2"; g.fillRect(x, y, COTE, COTE);
      if (!im) return;
      /* ON NE ROGNE PAS. Une planche-contact sert à juger le cadrage : une photo
         coupée pour entrer dans un carré ne montrerait plus la photo. On la pose
         entière, centrée, et la case respire autour. */
      var k = Math.min(COTE / im.naturalWidth, COTE / im.naturalHeight);
      var w = im.naturalWidth * k, h = im.naturalHeight * k;
      g.drawImage(im, x + (COTE - w) / 2, y + (COTE - h) / 2, w, h);
    });
    return c;
  }

  function produire(format) {
    dire(T("planche.en.cours"));
    toutesLesPhotos().then(function (medias) {
      if (!medias.length) { dire(T("planche.aucune.photo")); return; }
      return Promise.all(medias.map(function (m) { return charger(m.blob); }))
        .then(function (images) {
          var vives = images.filter(Boolean);
          if (!vives.length) { dire(T("planche.aucune.photo")); return; }
          var c = dessiner(vives);
          var type = (format === "png") ? "image/png" : "image/jpeg";
          c.toBlob(function (blob) {
            if (!blob) { dire(T("planche.echec")); return; }
            var u = URL.createObjectURL(blob), a = document.createElement("a");
            a.href = u;
            a.download = (titre() || "planche").replace(/[\/\\?%*:|"<>]/g, "-")
                       + "-planche-contact." + (format === "png" ? "png" : "jpg");
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function () { URL.revokeObjectURL(u); }, 8000);
            dire(T("planche.faite") + " " + vives.length);
          }, type, 0.94);
        });
    }).catch(function () { dire(T("planche.echec")); });
  }

  /* ── le choix du format ───────────────────────────────────────────────────── */
  function choisir() {
    var ov = document.getElementById("pl-modal");
    if (!ov) {
      var css = document.createElement("style");
      css.textContent =
        "#pl-modal{position:fixed;inset:0;z-index:1600;background:rgba(20,15,10,.78);display:none;" +
        "align-items:flex-start;justify-content:center;overflow:auto;padding:22px}" +
        "#pl-modal.on{display:flex}" +
        "#pl-modal .pl-box{background:#fffdf8;color:#2b2318;border-radius:14px;padding:18px;" +
        "max-width:420px;width:100%;position:relative;box-shadow:0 12px 44px rgba(0,0,0,.4)}" +
        "#pl-modal h3{font-family:Georgia,serif;font-size:22px;margin:0 2px 4px}" +
        "#pl-modal .pl-lead{color:#8a7c66;font-size:14px;margin:0 2px 14px;line-height:1.5}" +
        "#pl-modal button.pl-opt{display:block;width:100%;text-align:left;margin-bottom:9px;" +
        "border:1.5px solid #e3d8c4;background:#fff;border-radius:11px;padding:13px 15px;" +
        "font:inherit;font-size:16px;cursor:pointer;color:#2b2318}" +
        "#pl-modal button.pl-opt small{display:block;color:#8a7c66;font-size:13px;margin-top:3px}" +
        "#pl-modal .pl-x{position:absolute;top:8px;right:11px;background:none;border:none;" +
        "font-size:24px;line-height:1;cursor:pointer;color:#8a7c66}";
      document.head.appendChild(css);
      ov = document.createElement("div"); ov.id = "pl-modal";
      ov.innerHTML = '<div class="pl-box"></div>';
      document.body.appendChild(ov);
      ov.addEventListener("click", function (e) { if (e.target === ov) ov.classList.remove("on"); });
    }
    var b = ov.querySelector(".pl-box");
    b.innerHTML =
      '<button class="pl-x" type="button" aria-label="' + T("print.fermer") + '">×</button>' +
      "<h3>🔲 " + T("planche.titre") + "</h3>" +
      '<p class="pl-lead">' + T("planche.lead") + "</p>" +
      '<button class="pl-opt" type="button" data-f="jpg">' + T("planche.jpeg") +
        "<small>" + T("planche.jpeg.sous") + "</small></button>" +
      '<button class="pl-opt" type="button" data-f="png">' + T("planche.png") +
        "<small>" + T("planche.png.sous") + "</small></button>";
    b.querySelector(".pl-x").onclick = function () { ov.classList.remove("on"); };
    [].forEach.call(b.querySelectorAll(".pl-opt"), function (x) {
      x.onclick = function () { ov.classList.remove("on"); produire(x.getAttribute("data-f")); };
    });
    ov.classList.add("on");
  }

  window.THEplanche = { ouvrir: choisir, produire: produire };

  /* ── le bouton, dans la barre du document, après l'impression ─────────────── */
  function poser() {
    var barre = document.querySelector(".album-bar");
    if (!barre || barre.querySelector("[data-planche]")) return;
    var apres = document.getElementById("albumprint");
    var b = document.createElement("button");
    b.type = "button"; b.className = "ab";
    b.setAttribute("data-planche", "1");
    b.setAttribute("data-i18n", "planche.bouton");
    b.textContent = T("planche.bouton");
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
