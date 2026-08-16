/* ============================================================
   HERITAGE — CONFIG UNIQUE PAR PAYS (squelette)
   Édition : THE — Tunisia Heritage Experience
   Cloner = éditer CE SEUL fichier + déposer les données.
   Chargé en TOUT PREMIER dans le <head>.
   ============================================================ */
(function () {
  var C = {
    iso:          "tn",
    // langues de CETTE édition en plus du français et de l'anglais.
    // Le drapeau se déduit de « iso » — jamais écrit en dur.
    langNatCode: ["ar","de","it"],
    domaine:      "heritage.threshold-analytics.com",
    marque:       "Tunisia Heritage Experience",
    marqueCourte: "Tunisia Heritage",
    marqueMark:   "Tunisia&nbsp;Heritage<br>Experience",   // marque du LOGO (HTML, <br> permis) — data-brand-mark
    monogram:     "THE",   // monogramme court du logo (data-brand-mono)
    carte:        { lat: 34.5, lon: 9.5, zoom: 7 },
    // Point de départ d'un voyage libre sans GPS. Tunis : c'est là que le
    // voyageur arrive, et c'est ce que l'application faisait déjà.
    departDefaut: { lat: 36.8, lon: 10.18 },
    cloudflare:   "de37166feb0649ccb405647109e25906",
    exportNom:    "Tunisia-Heritage",
    description:  "Découvrir, comprendre et garder un souvenir du patrimoine tunisien — sites, itinéraires et carnet de voyage, hors-ligne.",   // manifest PWA/SEO
    appStore:     "https://apps.apple.com/app/id6785249427",   // lien App Store (badge pied de page) — vide = masqué
      // Pages de RÉCIT propres à l'édition, regroupées derrière une seule entrée de
      // menu. Vide ou absent → l'entrée ne s'affiche pas : une édition sans
      // documentaire ne montre pas de lien mort. [fichier, clé i18n du titre, icône]
      documentaires: [
        ["rome-immersion.html", "menu.rome",   "\uD83C\uDFDB\uFE0F"],
        ["medina.html",         "menu.medina", "\uD83D\uDD4C"]
      ],
    themes: [
      {id:"punique",    ic:"⚓", label:"theme.punique",      pri: 1, kw:["punique"]},
      {id:"numide",     ic:"🐎", label:"theme.numide",       pri: 2, kw:["numide"]},
      {id:"romain",     ic:"🏛️", label:"theme.romain",       pri: 3, kw:["romain", "romaine", "thysdrus", "sullecthum", "tacapae", "gightis", "hadrien", "gergis"]},
      {id:"byzantin",   ic:"✝️", label:"theme.byzantin",     pri: 4, kw:["byzantin", "byzantine", "paleochret"]},
      {id:"islam",      ic:"☪️", label:"theme.islam",        pri: 5, kw:["islamique", "aghlabide", "fatimide", "ziride", "hafside", "ibadite", "kateb"]},
      {id:"ottoman",    ic:"🕌", label:"theme.ottoman",      pri: 6, kw:["ottoman", "ottomane", "beylical", "husseinite", "mouradite", "hispano-ottoman", "espagnol"]},
      {id:"andalou",    ic:"🌿", label:"theme.andalou",      pri: 7, kw:["andalou", "morisque"]},
      {id:"berbere",    ic:"🏜️", label:"theme.berbere",      pri: 8, kw:["berbere", "ksour", "berberophone"]},
      {id:"colonial",   ic:"🏙️", label:"theme.colonial",     pri: 9, kw:["colonial", "coloniale", "contemporain", "contemporaine", "moderne", "xxe siecle", "post-1956", "1963", "1990", "1992", "1997"]},
      {id:"guerre",     ic:"🎖️", label:"theme.guerre",       pri:10, kw:["guerre mondiale"]},
      {id:"oasis",      ic:"🌴", label:"theme.oasis",        pri:11, kw:["oasis", "saharien", "saharienne", "frontaliere"]},
      {id:"cinema",     ic:"🎬", label:"theme.cinema",       pri:12, kw:["cinema"]},
      {id:"musee",      ic:"🖼️", label:"theme.musee",        pri:13, kw:[]},
      {id:"festival",   ic:"🎭", label:"theme.festival",     pri:14, kw:[]},
      {id:"marche",     ic:"🧺", label:"theme.marche",       pri:15, kw:[]}
    ],
    appStoreId:   "6785249427",   // id App Store (deep-link go.html / apps.html) — propre à l'édition
    support:      "support@threshold-analytics.com",   // e-mail contact/signalement (briques)
    // Page d'aide publique (URL de support de la fiche App Store). Vide = entrée masquée.
    supportURL:   "https://heritage-support.threshold-analytics.com/?lang=",
    iapPrefix:    "the",   // préfixe produit App Store (the_sub_annual) — propre à l'édition
    // Android — repris de l'assetlinks EN LIGNE (2 empreintes : upload + signature Play).
    androidPackage: "com.thresholdanalytics.heritage.tunisia",
    androidFingerprints: [
      "DA:9D:8A:4B:8E:0F:9F:FA:5F:B3:8E:3C:0D:76:EE:74:0F:AB:F7:37:20:56:6D:89:C5:3F:18:81:7C:04:3C:96",
      "BA:00:02:0A:02:A2:BD:4D:08:11:BE:04:DD:02:2A:BD:31:9E:28:00:F9:70:0F:B3:38:62:5B:64:DF:92:B1:54"
    ],
    checkout:     "https://boutique.threshold-analytics.com/checkout/buy/be44afe6-f994-4429-b1fc-fc0cd377b0ed",  // Lemon Squeezy (web) ; vide = pas de vente web
    tip:          "https://boutique.threshold-analytics.com/checkout/buy/3987d8ab-b0cb-4833-b110-a4d6893dd264",  // pourboire/soutien (web) ; vide = pas de bouton
    // Champ du géojson qui porte le découpage administratif de l'édition
    // (region ailleurs, gouvernorat ici). Sert à DÉRIVER les points de départ
    // de l'assistant d'itinéraire — aucune ville n'est écrite dans le code.
    // Nom du pays PAR LANGUE — alimente les tokens __PAYS__, __PAYS_MAJ__,
    // __LE_PAYS__ et __PAYS_DE__ des libellés i18n. Le code ne le nomme jamais.
    pays:   { fr:"Tunisie", en:"Tunisia", ar:"تونس", de:"Tunesien", it:"Tunisia" },
    paysLe: { fr:"la Tunisie", en:"Tunisia", ar:"تونس", de:"Tunesien", it:"la Tunisia" },
    paysDe: { fr:"de Tunisie", en:"of Tunisia", ar:"من تونس", de:"von Tunesien", it:"della Tunisia" },
    // Remise à zéro de l'essai gratuit : tout essai commencé AVANT cette date est
    // effacé et l'utilisateur repart pour une période complète. Laisser vide ("")
    // pour ne rien remettre à zéro. Posée le 15/08/2026 : le mur de navigation
    // avait gâché l'essai de tout le monde, la cause est corrigée.
    essaiDepuis: "2026-08-15T00:00:00Z",
    champRegion: "gouvernorat",
    // Points de départ SUPPLÉMENTAIRES propres à l'édition : villes très
    // demandées qui ne sont pas des chefs-lieux. [nom, latitude, longitude].
    departs: [
      ["Hammamet", 36.400, 10.612],
      ["Djerba (Houmt Souk)", 33.875, 10.857],
      ["Tabarka", 36.954, 8.758],
      ["La Marsa", 36.878, 10.324]
    ],
    patrimoineEmail: "patrimoine_tunisie@threshold-analytics.com",  // veille citoyenne (contribuer.html) ; vide = formulaire inactif
    invites:      [   // codes offerts (SHA-256), propres à l'édition
      "05784113a6edb6b845007d07f3f3b5547ee521bdb69d3910957a9686ec210801",
      "ddcfce828248f7108fab7bb31035c9e81f1fc526dfbd25a156989dd475db2fba",
      "12b912a8a9cb23d2b58acaf25d862418c6c84507bed7488ba3abcc3c4b8d231f",
      "963ee0a0a02206e629aa0a130e6c714124fc2631962eab1022fb1fc628400841",
      "dc13d4b56e727172f74149f609c8d2e766d37bd6fa7d500a089798bf9da1c616",
      "9a092543451108404b24f874a2614727587605b20ee00492630d8cb179d7b1b2",
      "97d3ae72020e6fb7cfc405c3a4f53c72e3ca934eff408ba54a907a2360ac2390",
      "4191812577dcff713e36ae2b1ed8272756c36c03c2fdb96644f6fd5695f9eb21",
      "9543e8d702b8a64c1414b6bcedb9ba7cc522644cce32a47f183919d81fe702f4",
      "58333aea61f2343b92278aa1181e7099a09c5209c0843e1e7fffb3e005ee2cb8",
      "b73675211116f74be9c1fa70c95e879c1b87a29c931813a2f8f20910737544bc",  // THE-IKBL-DC6K (Ikbel)
      "31e8639264695ebe02b15baa592f727f36e3c3cf79ac367565fa4c9088f81125",  // THE-IKBL-A4P4 (Ikbel)
      "79c44c0dcdadfc09ad929acce5925076522bb3c8f3f5b8734c0e6fa84687c91b",  // THE-IKBL-G3AZ (Ikbel)
      "341d3a664cba2a12736f499cfec79ba8a9b58a9b38ea31321255fba97b57ffff",  // THE-IKBL-L7ZL (Ikbel)
      "99dffdcb1f5fdb4c4e0f5d7f152eb752a33f18e0c2a759ac2574846ef3f0e48d",  // THE-IKBL-QMHF (Ikbel)
      "bcc557f608b4f7af7362a4cb6272d149c85cda1b774657579a3eea8059837246",  // THE-IKBL-AVCT (Ikbel)
      "74764a9e885ff324637243a0202a67112977eeb6b2faa6838bdd5f787752a3d6",  // THE-IKBL-EHU5 (Ikbel)
      "abd53e21cdd25c8fbf00a36c544dffa9bcf5e5654166ef12b3a3e9c3973e6a75",  // THE-IKBL-CS4P (Ikbel)
      "85641262199d8623ca80b18269fd5335c93f69a6bfee1f2b5f778058dccc519a",  // THE-IKBL-3V9C (Ikbel)
      "ee50ec1b99debe4911e373a6035efcbbdd9e79a120c2949ad29c430a199d11a2",  // THE-IKBL-J8BN (Ikbel)
      "a103aaf9a3f189206112c181373434228dd4c34f66cbbdb976453c485efdbee9",  // THE-IKBL-U5L6 (Ikbel)
      "943b266fd2750f5d423dba5d36bc443a5f67134f7dc341109f4c06db8446e30c",  // THE-IKBL-J4AH (Ikbel)
      "c7837de86511963292797483201cf98452b29f980399ac4aee267ad32a486a1f",  // THE-IKBL-VZFM (Ikbel)
      "b716b9d9b23bb6ef57fe1a885bce6731d9470c1190789b7b46e358bf7d2e968a",  // THE-IKBL-RZ23 (Ikbel)
      "ece18fc5ffef88194940dd11ec4ac60117ebd57a2824fabc22f692898f41d541",  // THE-IKBL-8CD6 (Ikbel)
      "a18eaa5e0630705e407ba4a4d10ea470208e05e5595e153171f010dbb0e9ab84",  // THE-IKBL-M7YM (Ikbel)
      "237bc5577d61bd56aab3b68d2595f64f73561af5c4baa9babc3ea376820eec85",  // THE-IKBL-J4GS (Ikbel)
      "b279b0c0449b3a38f0743a2a3096b5557bf732ff3a145cf1f6b9156871a56e0f",  // THE-IKBL-LZPF (Ikbel)
      "ca4472a2c9696ded2bf6adc6f1ac9ac71443aa1490bfbf931ae1377f8eff9920",  // THE-IKBL-5D5Z (Ikbel)
      "7780f46fc304701c4ca8333f8fafb6b76000af957b2f9e52badc7e55da4bc1d1",  // THE-IKBL-HD5A (Ikbel)
      "f9fc7cde532a52c57cc05498a5e207bc14ec724edaa08f851f73337609888b32",  // THE-HSNA-638W (Hasna)
      "253089ee900402373d3656ac5ae51cc419ea688fe884b7388ea8789905eaa2f2",  // THE-HSNA-E8LW (Hasna)
      "7ae15d32315ffa05754305b8e6001f6a9b8bdabf196550d3cf4c79beb7393bf9",  // THE-HSNA-87U2 (Hasna)
      "5e95eca2e505208baed970444e794e4f43ed5443add41ddda2d8c6e517b8b1d5",  // THE-HSNA-VFRC (Hasna)
      "66454c81810920b81a323b29bd10a3a74b5bc0976be770e312891069b6630d8a",  // THE-HSNA-M4VU (Hasna)
      "4149a78336d8477ffe26eb12668943e6da254082360c0e7f4ab650c187ab02c2",  // THE-HSNA-G2F7 (Hasna)
      "fe36cd06afb082f7ccdbf7e82ca9b1d35de8d4177794e06fb4b1db142e6b260b",  // THE-HSNA-WKRZ (Hasna)
      "89173583605498fde3bbead9cbc9c93c19058f5d670e494b9529dcc56c08f8aa",  // THE-HSNA-93X7 (Hasna)
      "46079f784a81a54024f0204616ef634e8f4e22eb943e72db7bd38e6b1fbb7b36",  // THE-HSNA-JZDE (Hasna)
      "52552a82f43845d70c2ad2a05b84e246fd778d0d3f594c1d670341f5bbb8c03d",  // THE-HSNA-MC3G (Hasna)
      "5e7fbd937f29a834eee474a3b3584fd9377dfc4f87e7db4111d62c4772973211",  // THE-HSNA-2H39 (Hasna)
      "6986489955336b0fd0ca99c08570a41a01198e3d93cb144831fc4a763d78e0f3",  // THE-HSNA-HJYX (Hasna)
      "92af2b13ee505172ed10c2cc7ec101d4a68317dcdded961ea7452b6604f46cc0",  // THE-HSNA-4ZGT (Hasna)
      "753e30066440ff7722a61569d2145a4e52d10857cc0f479b44884d740c99965e",  // THE-HSNA-3MHF (Hasna)
      "eb20059e0d7e451fa395d251e1f870b6a0385c0b745a1556b140588bda30a2ca",  // THE-HSNA-KMXN (Hasna)
      "b48579feedfdedabf4ad3cdce2e0d0ed58113ee6f578caec55ccc6bc3a8b4f79",  // THE-HSNA-656N (Hasna)
      "527539d8b414ded1f3fd239d3e6f70f98a0d789873baf115e9cc8ec2de807266",  // THE-HSNA-G7QB (Hasna)
      "e0ebf2625d300da53b8b697acb993a1aa540f85bf38f41192b6ca633015c3ab1",  // THE-HSNA-QYBT (Hasna)
      "5256dd0e4527ce313e5dc24b652e7a3c2e5c9cec50ca4bd02bd546e6aaa6d937",  // THE-HSNA-WSHQ (Hasna)
      "ca45cf4e38b0c7e2a108bee6fec85a9ae19094fd28ca95ad47cd3427322f0d4e",  // THE-HSNA-48CH (Hasna)
      "f3da0bf4b4e445bbe6ed3460178e8f8c3bf2a4484c17af61d05ef57273e2aac2",  // THE-ELHM-YFGV (Elham)
      "9b2a581f961f2934203ca2abde90a82b758b74df4f442bf9e49b2218d324bbf9",  // THE-ELHM-4DT4 (Elham)
      "a9e95b619a1972c07100f830c8ca9ad35e51e59e82ecfa21b3f3bf61d90f8428",  // THE-ELHM-CSGB (Elham)
      "4e6e87b32db3d1cb1103983dfec6c0b7a6742ba3e6d7d27227ba36745ec98505",  // THE-ELHM-SLQ6 (Elham)
      "51a759413fd40c6e000e3f113e8755f5715348f95d8155d00bbc1e04e2df6f3a",  // THE-ELHM-WJ42 (Elham)
      "48dc4bc21e0cbf3b4f35cfb90f0481f8bebe844a540938d30ec5c96af377e2bb",  // THE-ELHM-AK4W (Elham)
      "002c7ff1b897f6a09c412fc36d59387942129b7d9253772bbb7790c592fa517b",  // THE-ELHM-8KUR (Elham)
      "b96907b644e7ee885788309c969173eff97703c369d774e56b7db3787e7dd3de",  // THE-ELHM-VUDE (Elham)
      "0268c7a14df72ca388e9c378e8303990f92b02653c447555e96e9845a1c3fe01",  // THE-ELHM-MEE6 (Elham)
      "2d4d22e6971ebd783184427d5f311640f680837adb988b4fcaacb3c46174afe2",  // THE-ELHM-NR99 (Elham)
      "4738c22307b31bf9f8cc7222639f0af7698cdca916da146d306d6dad822eba6d",  // THE-ELHM-AHFX (Elham)
      "ce92a95b92948980fda12bb1c6e24a308ceb98889778cd5f5141a348da5ab3ff",  // THE-ELHM-XMSD (Elham)
      "b1a93cd9c5338669e8c1f380e049f410777fcf94c4c811f0b6423b516bfcadd2",  // THE-ELHM-RDHX (Elham)
      "80e0838483ef09328136c8f0ae05d40e9832ed938a63049c09872852ea8bab5c",  // THE-ELHM-VM5R (Elham)
      "b6490190344ce3f431903e27db82d0a165dc339c806101638dd9d75cd8f4c4c2",  // THE-ELHM-J9H2 (Elham)
      "e553cdb43d58c89ff190d9993eec7f66dd545c4e886a18345dcd3026f7be922d",  // THE-ELHM-RH4U (Elham)
      "087a72ddfbe52ebe1f7a168de7ab1bcc3c101ca747dea789fbfcb8a81bba610d",  // THE-ELHM-L4HY (Elham)
      "4d3bf08650d1f2c6f705af7a1fc1fb20beb781289b61417ce0de7e7f34588cda",  // THE-ELHM-ACLM (Elham)
      "cff8b66d5921c2f8a439650364fd40e0d11c10e0784c2b427a9f86a181c710a5",  // THE-ELHM-6NDG (Elham)
      "7b147d816cd439e82a7ee1914ec83e5b258984bb8b0331c77241780c922a3be6",  // THE-ELHM-RQC7 (Elham)
      "7f670af8f723ec42d307fade5177f76f65094d88c6bcbd4e31ef396452b82169",  // THE-KHLL-KDJG (Khalil)
      "4d04fe884d9aaa3d163ddfd2aea708d14a5a4195bd55dd324474d676515c3720",  // THE-KHLL-RE9V (Khalil)
      "655de941501f29ed0c41198d48cc2946e206279998a1cd632249efb142f3b4a7",  // THE-KHLL-7D8N (Khalil)
      "4ba7b6c89fb8d7e68661466639a3221e28b3bcc9b490f878e2021de17a060703",  // THE-KHLL-Q9TG (Khalil)
      "447fb55c16372e218ba532008e3c5b727c1bef324779600c0bd7f2d3edbef32c",  // THE-KHLL-VKRB (Khalil)
      "3460084e99680a6b0cc22c9533f6a04eba12af5e716fd7eaf4df1ec53bccfaf7",  // THE-KHLL-U4EB (Khalil)
      "918e353ee86fe08c98699cb6879734e845ebdd4d06eee52b3db51856f72cc78f",  // THE-KHLL-L9WR (Khalil)
      "c3a82179a3b8f1b2033f8ab5e63fd178fa014560e4b81b481a2a53d09204f430",  // THE-KHLL-6J9Z (Khalil)
      "86759c40c47b4d1af4c5ee4af8b74e4b07aba52f7dec137fbe492efc08215fab",  // THE-KHLL-A48F (Khalil)
      "2b3d808e2aa871486d9fbcb005e909b401cad56119d98418e3cfed663956bf97",  // THE-KHLL-3HDV (Khalil)
      "bd89c80e56de11f32cfb7dbd7dc3e6efdc443a703d17d4d2a65dfad26bca0deb",  // THE-KHLL-Y7Z2 (Khalil)
      "2a6e6b2bbac6c122d204dd5490b18b2b46616c1ff500739a7ebef7e59cea75d1",  // THE-KHLL-U6HC (Khalil)
      "105f45d4349d263d18e5fde5f63b0092d4affde8ca04e3eac482a50e908bdec9",  // THE-KHLL-D4A9 (Khalil)
      "1efc9abbf439f3bdb16de1cf70a42f1cd63be6b4384fbf36ad4a71f3aaf56d19",  // THE-KHLL-2QD4 (Khalil)
      "ab75abd344d1ab8bded41a1fd8170e450867ea52b3932f09751315c3bac0f235",  // THE-KHLL-S8YV (Khalil)
      "c660849de5d1ad27deaa8a785a9404542717720d1f4bd040a51f243809fdd7a7",  // THE-KHLL-J8LU (Khalil)
      "c73e49a4282a41e0bf75e570c46581eba9f1c5b6ed6b3ee954be98948692db25",  // THE-KHLL-QR3Q (Khalil)
      "bec5b92279b109870b66f93b3f72e8647849951bd3e1dcdc2ec0d6b76ac1e119",  // THE-KHLL-XJ5A (Khalil)
      "9fe94df9165d79d2623079ed866de84df570ec7537964b476f8e55c1f2369368",  // THE-KHLL-P8UD (Khalil)
      "1221cfacfe9aa3148ce7407ec483d867c177d8379c37e1894e553f52062feea9",  // THE-KHLL-VP2D (Khalil)
      "90786823bb3f0e8fce5594fe88ed87954511ce609b343b06841370c8fb4527f6",  // THE-IMEN-MKXS (Imen)
      "bf8d22988e51e888fcf38ce3cda2f396148c3dc4896c478781f2369f913d99a6",  // THE-IMEN-VTQX (Imen)
      "6776f32b19011126abbe5a77553f1005e092f20c2e97ca24167e0e6f65032392",  // THE-IMEN-Z7CU (Imen)
      "0a814669643ee4aeef6e1aa9c23e0e4beb895c9801d4e5ce0c74a652fa9f8575",  // THE-IMEN-KTMH (Imen)
      "7620b9474d0506d01cfd668edc126a43a55adc39375907a5125ef347ad527a33",  // THE-IMEN-TVGS (Imen)
      "27964bf25b745e7e08fbf7de150582462fe0ce6e5ff1125174e4954ca37bbeaa",  // THE-IMEN-36NY (Imen)
      "5c42527fcbb723cf4e819b78064ab4f40887cc756249675b5cb0bdf14746283d",  // THE-IMEN-S8M9 (Imen)
      "5576359a36e9ec7ed6a983bacb7e2709321975ef532a601bf60aa4e5dff982d4",  // THE-IMEN-VCLA (Imen)
      "a838755ff5f415f117d505727ed62b914490bfe6eb01d8a874c1c0f8013a1f36",  // THE-IMEN-QK4T (Imen)
      "bb3d014447edf619178d2b904209a523df65a393c94a68e93eb4f8c5b91ee8b3",  // THE-IMEN-SK3J (Imen)
      "8d0e7dc0811b48dcc1dc2501ab8cb36faac020d285a423a6185fce58d5d170c4",  // THE-IMEN-8VX7 (Imen)
      "ad46316b82f4e63df313826fa0bb5bb85c20524193b4bff839535bc155b2a167",  // THE-IMEN-W8Y2 (Imen)
      "ca8b178ed32510ffa87a1d94d566667d28a912138566ed42a31f7af52feabed3",  // THE-IMEN-93P3 (Imen)
      "347ec109f40e5dc30875fd36ac9fa92c399451466e8b5f4d20997b18dc7b5b03",  // THE-IMEN-RZXN (Imen)
      "9fb9f007c557d32e162873e31bf2da9b0d831617dbba280bb796b40618c46fdd",  // THE-IMEN-EQPC (Imen)
      "4ed1a2e5a0f235d8d28fc4117e2ba0dcc772735f091f28af621ef2181807b904",  // THE-IMEN-RXN4 (Imen)
      "bb3a42e4b2aaff0f711dd823a8d86d0220ed7b62160011e156ebebb08abe352b",  // THE-IMEN-WYRW (Imen)
      "c27d9b955c65b21e917dab24c2f076304b9e7cd20e89857bf42c7db40f619517",  // THE-IMEN-3DGC (Imen)
      "4109b9b658175c73f679e4962bf6b56a07604764871f5f185dfaaaf1a2b1e46b",  // THE-IMEN-4RAQ (Imen)
      "f3bca80cce280ba81d84dadb66c955cbac563ad7293baad59d1898356e70b3ab",  // THE-IMEN-VVJM (Imen)
      "2a84c362f6e96dfea938b42f44b704a5964bd2cae1bba879b910aab90f080d8b",  // THE-EMNA-S9A3 (Emna)
      "9261b6f860121cca4b4b35bcc75ddfbb99ffc10a5f6534eaa8c7d932f032b0d4",  // THE-EMNA-GNCV (Emna)
      "74a47831693184abe45c24e4c513a9aac5f498a457ac56c2a45d5cf46785f0ea",  // THE-EMNA-9QUZ (Emna)
      "5acbe7df00d5598cbfb5417dbd52b9cb5d9aeb2abe0c2386d013435dad18bc5c",  // THE-EMNA-VUKF (Emna)
      "9dabb6df1edcc0d1758ef0d9da66c7a5ba2797761860f357df9b92355f55df95",  // THE-EMNA-M3A3 (Emna)
      "9316c775c0876a1a60f65e3b57c01eb8cb5beda4072dc9d8792f40650a85e1d0",  // THE-EMNA-YUM8 (Emna)
      "78470c7bfea6b1a2d0191b925256df2574571c3935597796b50ea34baaff2983",  // THE-EMNA-4MX2 (Emna)
      "7931c4968bdcd98849384b6e5af01002fc13748c282e54662a234e71070457ab",  // THE-EMNA-2G5T (Emna)
      "b597f6d51f01c0a751cb44975d74660477c456a0fc19dde29809a8dbdf9dc67e",  // THE-EMNA-YJ8E (Emna)
      "e64c871649ee365eb9e247a489abca1ed3fed8f11254a8d2be494efdc71c5131",  // THE-EMNA-M6U2 (Emna)
      "0a288135223b2e12890d225433c50b3688c83528d6a181cb65a4f5fb6f48571b",  // THE-EMNA-TTCG (Emna)
      "ebe11ab99cc8561ee31147845fa8cbbb8326b5f3890cdf6cd246dff56c5a825d",  // THE-EMNA-2CLD (Emna)
      "b52657013e0e2e7847b24f000ec7d104550fc9da3a544a19fd3baa9754ab14fa",  // THE-EMNA-GT5R (Emna)
      "0abda4229c440d3af77ed41f793db6819bf567cca00de11b7ee1e644149ddec6",  // THE-EMNA-PS9M (Emna)
      "5c66c4d6418a56cc23913713879852760676bc6ceb6f20f77e93d9f96b10258b",  // THE-EMNA-7SH9 (Emna)
      "f1b71918908c44a289bc55d22fe8718d6efe6bd90ef27c023d2a760dc3939307",  // THE-EMNA-N3KX (Emna)
      "292f2d7c9c97710c479830f0b683170a17b79d2425af55eca83615bb6749c24c",  // THE-EMNA-XVWZ (Emna)
      "11bf791b75ec4e530db60b8cd433bd4f6a6912f1efd05c7d815ffe33c746d662",  // THE-EMNA-ZA9U (Emna)
      "19d3605bebf9951b51b9b413d6c5e44041297c184b871e59378e83bcb37968b8",  // THE-EMNA-NXLD (Emna)
      "c3b8590e1b9c2e0af07bf8ad6e0777d164a77168c838da092c053a179864db16",  // THE-EMNA-FQLH (Emna)
      "a1cfc99c42106b342170fc9370ce47076bc21aa74a0506d8a18d8886706d774a",  // THE-SONI-T7WW (Sonia)
      "f26edafe74cd9e2b5aacfe4db11bf606fcb6f5b6321eb7ac06b3ba6226e7370d",  // THE-SONI-JXA2 (Sonia)
      "510c5202d4a6bfa70eb67bcaf038651d6e43d4d517778f600d6f21881cb24e0f",  // THE-SONI-UBKK (Sonia)
      "9d436536555a19b20a292514bc8b9ad0216348e3959975a3beb84c54f0a7be3c",  // THE-SONI-PYW2 (Sonia)
      "e3058f8ed4ef050c107329b64f05babf75f99df28115111ec20520e29a47c66e",  // THE-SONI-NEME (Sonia)
      "22608a4fbcb918194be24305f4c4a3b8192efa668e0834de31f9a6fd6b5bfabe",  // THE-SONI-MRHB (Sonia)
      "69257c26e80627a0f2bfd5779952b5edfd71b740aebce98732d1f47121162c9d",  // THE-SONI-ZNHE (Sonia)
      "200393b7214e1746202094ecde87f08d764f479210a6047076207602d36dc732",  // THE-SONI-T2GD (Sonia)
      "467ac1d0b5041046f7c37cb2cf0c534e6298baefd513236ea1bd724bd6d4e415",  // THE-SONI-8XN2 (Sonia)
      "706ca7fe1d1e4f6541887d1b154454b31ddd1d585352ed34fb0559bb79407de5",  // THE-SONI-SCBT (Sonia)
      "f576829dd40bca43428baa40ce6af53307792c82a2090d027a734d351ac4f9c1",  // THE-SONI-LMUE (Sonia)
      "7e57db0a95734fa2575f5f19777e64dbf75c1749eba0171cff81451d149efc79",  // THE-SONI-Z7HU (Sonia)
      "eba63b1f407d4fe6ba6afcd7ec5684326dbb0509b650d59e8e0e706b522472f3",  // THE-SONI-P4XW (Sonia)
      "58f5d88dea7c4898e80f91034b251639274e7e39866bae8f188859e17a119f34",  // THE-SONI-KAZ5 (Sonia)
      "2006ee2dd04f43e0563fb8e564264684843be17a1b430924fe5b3ad4b9376444",  // THE-SONI-S4GB (Sonia)
      "f2e6dcddef9f1a95a97385f12cca3aba0ec8dafa3596e63aa095e020e426585a",  // THE-SONI-J9KH (Sonia)
      "5890af61eb245d4d2cb4e85f8a07e4fffd39db8fe3041c6eb93fca6b0da36df9",  // THE-SONI-SVUD (Sonia)
      "40fef5c486a9f7a4d58eeffeb1b48e8268d24e685fa6f1ad23bb13afab4e4770",  // THE-SONI-4S9T (Sonia)
      "86b5f2c5c5fc01cbf7690408027254be36c421bea8eb2b6a963d76e0eff28174",  // THE-SONI-BDYX (Sonia)
      "ab40c4010741a3a096661f05a36b2878f3f36f4c87d615dc566469ce135f7c58",  // THE-SONI-CK4L (Sonia),
      "04e76e76a4f9112cea0370083357c9f2f8599d0fda2a8a1e710a83ca0ce0b613",  // THE-ALI-CZZ9 (Ali)
      "04195d7e86a8048f0e004d6feef5142d8343800071ead607dd0956f4857ca1a5",  // THE-ALI-6N2R (Ali)
      "57e45cb8e0e57c31557e8c858b4e1c6b85b34663578f5b09c618b7046d25b279",  // THE-ALI-8RUK (Ali)
      "bc8437730f4ff21978279085802a80e6f065d7f792010f58c597bbc4c0ee0d03",  // THE-ALI-6H39 (Ali)
      "e46c796c7d14ca1d744a92988675c554c3460eba229243b177f45269b2030f76",  // THE-ALI-5DL9 (Ali)
      "400cda4b8f1caf18e7736a747c09287ab9b98158013556c5922170b55933bd67",  // THE-ALI-DEY6 (Ali)
      "06eac0f932fbed10e9058a8768a693d1405726fa99ad1982aca6b6146944b127",  // THE-ALI-2FRH (Ali)
      "c58889dccb325b6746eaa4f09295976730c9d679b7df3d2f3d89b15a29f5d9cd",  // THE-ALI-NMD3 (Ali)
      "15697fd8eb7f05d7c7e768d40a0c71abebc1aa0870cb5892e09edc9ee72fed1e",  // THE-ALI-ERTF (Ali)
      "ccd7eede0c85411ff621a88586959fe74da7f65007e41019234fbae6ffa10922",  // THE-ALI-HX29 (Ali)
      "1a82275e9aaaf17252c4ba7153542cc1e06be205c4d120eca205aa087695ef11",  // THE-ALI-9U9P (Ali)
      "9ce409f4f81745ca7f76180bea9f906fc8ee4a0faa6df3d5ab908301c9ee9a76",  // THE-ALI-5R2P (Ali)
      "9bd92e7db73125957ed4d57aefb397a1241d6f39dc707ccd39d59597c4590743",  // THE-ALI-BSVE (Ali)
      "7e3099bf4bff20d55a8ce1fde8e57c939a287ad64116e558245b6489c3fb771e",  // THE-ALI-4FPF (Ali)
      "60207b0f5979a4736a89156f85ba44391814bb88c1db3e53bdf17c5055413220",  // THE-ALI-3JJV (Ali)
      "80eb86a2426f948751255ec90e599fc94c9af814a5ead90d5688789ed9e82ed8",  // THE-ALI-AMBT (Ali)
      "ca0537aa3d5adc6da4a583b779a7abe8b30fbae7bd7d3908ac89b198f6720484",  // THE-ALI-JJHP (Ali)
      "0d16dc0de80afa515a06ffa3e4b91e3c2e3c64041384873353f6684307068c99",  // THE-ALI-GSZ6 (Ali)
      "ff27607eebd3ddabb5f7e221a91e2ac796e4e3572bf7babe04387a6e2491a616",  // THE-ALI-JDBS (Ali)
      "73e85f468750eb6109b6532adc28f4632b4ed5b370df47c9f39d83a9dba2aba2",  // THE-ALI-9WT9 (Ali)
      "4658b6cb10288873ad915995a0d40ad595c7f8ad3bd77c896db4b5165661bf76",  // THE-HTEM-FZA5 (Hatem)
      "c13a6ad93d0e801164140f93db952de78f1c63e9c97545bad861fe81d7f29913",  // THE-HTEM-DG8U (Hatem)
      "c17be096609cf1507ae91a2839910f73e39f196df5c0a481f22aac1a53d71ce2",  // THE-HTEM-443N (Hatem)
      "91a7bb478309e325e46bcf7cfb5f0c0844835c07b1232535e4ffc114425698f6",  // THE-HTEM-7JCB (Hatem)
      "d7277f32e88b91ac1a92a4df6d18e63399cad1e652d8d4147775e9dc9aeee5ff",  // THE-HTEM-TBGS (Hatem)
      "4f863e5cc02fade983d86d9a31ba8cc55204bd061a800af8550017386b107976",  // THE-HTEM-SEE2 (Hatem)
      "09a80efbab2f51c7f9d723a67bf64b78378483a850a8b44842d45fd0c0e67374",  // THE-HTEM-74MB (Hatem)
      "091487003b407ad002696a95d2bd945a1678776d3df9c8ef5a26cca115440e8e",  // THE-HTEM-R62S (Hatem)
      "a9ce3bee6e092cca4ff37aa5ef74603481970f491e00fee10ce55f5bf8a6fc60",  // THE-HTEM-KPY4 (Hatem)
      "bd85fe6d678db547bbb16aabc21b103553b42256cf12e96e3ef1fd86686f86eb",  // THE-HTEM-VMXV (Hatem)
      "79e4feb4900dc5aabc5ccd1e1754702b9e8dbbd6684ed5bec07fce69c94d053c",  // THE-HTEM-ELFG (Hatem)
      "8763015ccce8acb2579e4b999b19e73b93510664207aa043fc5f226b234e5e7b",  // THE-HTEM-U6RM (Hatem)
      "c3384d03dbef39153718678292389ff6b0143e1e618549722855c236f653f836",  // THE-HTEM-V9UU (Hatem)
      "9f3c1b74e4ea11e37741f55aea4e559995c9b73d2640812c33b90d0a757140d4",  // THE-HTEM-4VHG (Hatem)
      "30af0982b3870920fdd654b5c52350236863c24a243b9aede312b536156616e9",  // THE-HTEM-DE8U (Hatem)
      "676925d9a486f637674cc55a15adbd361a9c419c75c5227e92dbb4aabf2a8bd6",  // THE-HTEM-8UFX (Hatem)
      "42403d0c1762c8b818697c6e4dcaae4ce2e84108eb7ad4e4687e1758e6ca90f7",  // THE-HTEM-D55L (Hatem)
      "da57d6c917a21323c51ca53a32d852cbb0c84a702311fb5748fedb2d2434208b",  // THE-HTEM-ENK9 (Hatem)
      "7063d9b6824c05a3379d5a344a2753784164b1be3931be74e278609c8fa68bca",  // THE-HTEM-9ATY (Hatem)
      "8929bae384e5fa2ff5741409a12c604eaf9ccfbde14a9be00e0226d0e937fefd",  // THE-HTEM-RYFA (Hatem)
      "69dd9c9a0b0e890229fa3943a0f4fd8a79f459753fad4c1fae41e3e62e4c8014",  // THE-HIBA-J2NJ (Hiba)
      "87982da8351da5b1b2e3e9efd8dbf888028a5c5daf4d480a819a7301b62fbb94",  // THE-HIBA-SPVW (Hiba)
      "9952657f02fe9e5388b5bb4cd6a68d490baf6a7c10fdb8f46286d3e125c23e09",  // THE-HIBA-QF9W (Hiba)
      "a0462290a0ceff771915448db675cfd41d4bb927d8a66fb71d8de8d7af92fb2d",  // THE-HIBA-CEVM (Hiba)
      "3c67bc5112fda024c78a894e786a201faa3639c117ac9836ded9bc24a4e7b024",  // THE-HIBA-YSA2 (Hiba)
      "b36573bcf113c10f298e27ad48af0a892eab1f729245111901958a1556ac24f9",  // THE-HIBA-EZT2 (Hiba)
      "02c6ebdc202c37acae4e737af246fbaa9639614fafbe47f6930b8b19743d8ba9",  // THE-HIBA-SNXU (Hiba)
      "7f65b966fb51d8ebbae374a346a44736c820c909931a3e94548adaa727d9fcdb",  // THE-HIBA-NZM9 (Hiba)
      "d350d40c38276958222135a2da0948b83ddeef5ab5791fe655d50105be5d3f49",  // THE-HIBA-U9DU (Hiba)
      "901f7bcea5dae1181a1b24347458bb3337d5654dfd630046c331de2626c9a444",  // THE-HIBA-FD6B (Hiba)
      "aa29bfb5d9ed9396d8de4f3ea2009dfbe7b6adfb250e3a19cfa72045094719f6",  // THE-HIBA-KWWV (Hiba)
      "75975220b8269f7fba230acb76b77fb76afa89a55f655e048dff74f4785a4336",  // THE-HIBA-NJNA (Hiba)
      "66ea569df3d30c58c225dc90c7983ed1eee2f12c09055d28a3848aa877b1c676",  // THE-HIBA-94GK (Hiba)
      "2da43c7347a5e40f5c31c6237a7b552d12ee52d18894678a05bb1f8514f43e65",  // THE-HIBA-MFFW (Hiba)
      "05189e91d050ceeae3403a4c655ec1abb15d20c3f9a01ac972c7262d1230d8a3",  // THE-HIBA-H9M8 (Hiba)
      "10ac113447d1c553c3b32d21a6d629894fba608187ec16a17f1c9dc55210d991",  // THE-HIBA-Y4PQ (Hiba)
      "8b09a5d2c84d581f0b57d7822f7e39b6e7d591e3f0cc23c6dc8e083871ce8993",  // THE-HIBA-PENE (Hiba)
      "8d096f774d2dff1c000d59a3c6657d157355c032b9e9566665dd0de0f6d83c6b",  // THE-HIBA-CQDQ (Hiba)
      "90f41c035c1acf562e4ad864414e84761df02b8ecc9e805c54cf9f54103b794e",  // THE-HIBA-WEUV (Hiba)
      "69eec8f4962cc6f59de856445e0ee3286a07e691c5a8d1895ece67226d82f3f0",  // THE-HIBA-QC6A (Hiba)
      "d3475c333365280b36ff6900640eca5b5e89f0c558075961868c7313fa7b3576",  // THE-INTI-RG4X (Intissar)
      "3d535d5bb099386b4762334673fb7703c3114c038044692279bd76235956e413",  // THE-INTI-GYH4 (Intissar)
      "3251d6b079e41513db3c8431e2c97a00b39761b1b13135aa53bdd1a066b7f96c",  // THE-INTI-R4CE (Intissar)
      "f4bb2eb8405d664f0c19401590844b110ed658b1e0e6c4fa5b468efa71d5aa00",  // THE-INTI-A43E (Intissar)
      "b777e053df383f18d1f935abda5b8d92694dfda3a758d7295b93d6bf2ba37ca1",  // THE-INTI-DNZU (Intissar)
      "9377dde19b49caf9ec177c5ad96061bcf736592e64890987e0a4a551cf93085d",  // THE-INTI-UCRT (Intissar)
      "755303afa13368cd71453a6a9045ea4bf4f714dba9d3ec0f36920d87ba523118",  // THE-INTI-JCTY (Intissar)
      "aebc9bd066017b5f1e6769886867c9c3a13ddee97e2cebd035e1a7c06ddd0641",  // THE-INTI-3TMQ (Intissar)
      "750abbdc8bcf27dfabe19027c9875b9dbfe11bd922ab4c11afc6fa4a83f66db6",  // THE-INTI-7TTD (Intissar)
      "c297cd0b72fe5c4890bd8b2aedf61986c36e18ca801bfd7e1c8b87f1fcf1a904",  // THE-INTI-K9R6 (Intissar)
      "a856bc452f1daf88a256cee4dfaae6f380dda57c87f0a94da157dfc612df4686",  // THE-INTI-ZQBZ (Intissar)
      "c09093fcb2a6ff6e07ff101ff68c81fc91a8d2cc22511185774117e9573ec345",  // THE-INTI-ESNV (Intissar)
      "243add0337ea2041bf7c654f43bf39c40415c3636f7f29fb763c82a61b090406",  // THE-INTI-XBSV (Intissar)
      "69ea4ba53ed24c1dc4587deae142a213fddb197b891322b46c3686cba3e944d8",  // THE-INTI-XF4B (Intissar)
      "5017da30cb4d92f740f760b5b0918373729e2b1a428a67a09b48a5ca688121e2",  // THE-INTI-SE2U (Intissar)
      "31a36e44f2d3da76696dface1104813362b0a079cf4388968c52906acdc6b444",  // THE-INTI-2ZSP (Intissar)
      "8b8dbf80e1e142aa15d0d4cde60caab2d02d78d0e1d8354bb14cbc249748796a",  // THE-INTI-4VSA (Intissar)
      "9e129d1da3415a375b7c37b8daaf108788fc0e9fe800b09fa0f68f559d3f68a2",  // THE-INTI-VVJW (Intissar)
      "fb615c4882a19fd5d4d666ec6852d9aec1c3363d57eda9971754d90576eef0c7",  // THE-INTI-JW9L (Intissar)
      "95ea3185330c2cace9e5228711698e6a45c50fe98fc83b2669a66c2d34508f13",  // THE-INTI-KAP3 (Intissar)
    ],
    ref:          "THE-v81"
  };
  window.HConf = C;
  try {
    var page = (location.pathname.split("/").pop() || "");
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = "https://" + C.domaine + "/" + page;

    var at = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!at) { at = document.createElement("meta"); at.setAttribute("name", "apple-mobile-web-app-title"); document.head.appendChild(at); }
    at.setAttribute("content", C.marqueCourte);

    var pb = document.querySelector('meta[name="pc-brand"]');
    if (!pb) { pb = document.createElement("meta"); pb.setAttribute("name", "pc-brand"); document.head.appendChild(pb); }
    pb.setAttribute("content", C.marqueCourte);
    // Cloudflare : géré par analytics.js (lit HConf.cloudflare).

    // manifest PWA DYNAMIQUE (depuis HConf) — le manifest.json statique reste NEUTRE.
    var _lang = "fr"; try { _lang = localStorage.getItem("the_lang") || "fr"; } catch (e) {}
    document.documentElement.lang = _lang;
    var mf = {
      name: C.marque, short_name: C.marqueCourte, description: C.description || "",
      id: "/?app=heritage", start_url: "bienvenue.html", scope: "./",
      display: "standalone", orientation: "portrait",
      background_color: "#2b2318", theme_color: "#2b2318", lang: _lang,
      // Feuille de partage du système : « Partager » dans Google Maps, Waze ou
      // Plans propose l'application, et le lieu arrive sur l'écran d'itinéraire.
      // (Android uniquement — iOS ne connaît pas le partage vers une application web.)
      share_target: { action: "itineraire.html", method: "GET",
                      params: { title: "titre", text: "texte", url: "lien" } },
      icons: [
        { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "logo-the.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
      ]
    };
    var mfUrl = URL.createObjectURL(new Blob([JSON.stringify(mf)], { type: "application/manifest+json" }));
    var mfLink = document.querySelector('link[rel="manifest"]');
    if (!mfLink) { mfLink = document.createElement("link"); mfLink.rel = "manifest"; document.head.appendChild(mfLink); }
    mfLink.href = mfUrl;
  } catch (e) {}
  // Marque affichée (hero + <title>) : remplie depuis HConf après parse du DOM.
  // Les éléments portent un repli NEUTRE en dur ; le loader y pose la marque du pays.
  function _fillBrand() {
    try {
      var el, i;
      el = document.querySelectorAll("[data-brand]");       for (i = 0; i < el.length; i++) el[i].textContent = C.marque;
      el = document.querySelectorAll("[data-brand-short]"); for (i = 0; i < el.length; i++) el[i].textContent = C.marqueCourte;
      el = document.querySelectorAll("[data-brand-mark]");  for (i = 0; i < el.length; i++) el[i].innerHTML  = C.marqueMark || C.marque;
      el = document.querySelectorAll("[data-brand-mono]");  for (i = 0; i < el.length; i++) { if (C.monogram) el[i].textContent = C.monogram; }
      var tt = document.querySelector("title[data-brand-title]"); if (tt) document.title = C.marque;
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", _fillBrand);
  else _fillBrand();
})();
