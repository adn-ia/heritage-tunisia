/* ============================================================
   GREFFE « RoadTrip » sur l'itinéraire Heritage — Estonie
   Ajoute ce qui manquait au moteur :
     1) VRAI routage routier (OSRM) : trajet + km + durée réels
     2) Export Google Maps en TRONÇONS ≤ 10 arrêts
     3) « Mes 9 prochains arrêts » depuis la position GPS (navFromHere)
     4) Export KML → Google My Maps (tous les arrêts sur une carte)
     5) Suivi GPS EN DIRECT : bandeau « prochaine étape à X km » + alerte < 2 km
   Module autonome : lit les globales (LASTRES, navData, mapObj, haversine,
   render). N'altère rien d'existant.
   ============================================================ */
(function () {
  var OSRM = "https://router.project-osrm.org/route/v1/driving/";
  var realLayer = null, watchId = null, alerted = {}, meMarker = null;
  /* DEUX FONCTIONS, DEUX INTERRUPTEURS — 01/09/2026, Helmy : « le suivi actif et
     l'alerte de proximité doivent être séparés en deux, et on doit être capable
     d'en sortir ». C'étaient deux choses sous un seul bouton : voir où l'on est,
     et être prévenu d'un site à moins de 2 km. On veut souvent l'une sans l'autre.
     Une SEULE écoute GPS les sert toutes les deux — deux `watchPosition` sur le
     même appareil, c'est deux fois la batterie pour la même position. */
  var suiviOn = false, alerteOn = false;
  /* i18n EMBARQUÉ (module autonome) */
  var DICO = {"rt.a.distance.voir": {"fr": "à {d} de vous — voulez-vous le voir ?", "en": "{d} away — want to see it?", "et": "{d} kaugusel — kas soovite seda näha?", "it": "a {d} da te — vuoi vederlo?", "de": "{d} entfernt — möchten Sie es sehen?", "ar": "على بُعد {d} — هل تريد رؤيته؟"}, "rt.arreter": {"fr": "Arrêter", "en": "Stop", "et": "Peata", "it": "Ferma", "de": "Stopp", "ar": "إيقاف"}, "rt.avoir.tout.pres": {"fr": "À voir tout près !", "en": "Worth seeing nearby!", "et": "Vaata lähedalt!", "it": "Da vedere qui vicino!", "de": "Ganz in der Nähe!", "ar": "يستحق الزيارة قريبًا!"}, "rt.calculer.arrets": {"fr": "📍 Calculer mes 9 prochains arrêts", "en": "📍 Compute my next 9 stops", "et": "📍 Arvuta mu 9 järgmist peatust", "it": "📍 Calcola le mie prossime 9 tappe", "de": "📍 Meine nächsten 9 Halte berechnen", "ar": "📍 احسب محطاتي التسع القادمة"}, "rt.carte.partageable": {"fr": "🗺️ Carte complète partageable (Google My Maps · KML)", "en": "🗺️ Full shareable map (Google My Maps · KML)", "et": "🗺️ Täielik jagatav kaart (Google My Maps · KML)", "it": "🗺️ Mappa completa condivisibile (Google My Maps · KML)", "de": "🗺️ Vollständige teilbare Karte (Google My Maps · KML)", "ar": "🗺️ خريطة كاملة قابلة للمشاركة (Google My Maps · KML)"}, "rt.chaque.troncon": {"fr": "Chaque tronçon s'ouvre prêt à naviguer (≤ 10 arrêts, limite Google).", "en": "Each leg opens ready to navigate (≤ 10 stops, Google limit).", "et": "Iga lõik avaneb navigeerimiseks valmis (≤ 10 peatust, Google'i piir).", "it": "Ogni tratto si apre pronto per la navigazione (≤ 10 tappe, limite Google).", "de": "Jeder Abschnitt öffnet sich navigationsbereit (≤ 10 Halte, Google-Limit).", "ar": "يفتح كل مقطع جاهزًا للملاحة (≤ 10 محطات، حد Google)."}, "rt.composez.dabord": {"fr": "Composez d'abord un itinéraire.", "en": "Build an itinerary first.", "et": "Koosta esmalt teekond.", "it": "Componi prima un itinerario.", "de": "Erstellen Sie zuerst eine Route.", "ar": "أنشئ مسارًا أولاً."}, "rt.depart": {"fr": "Départ", "en": "Start", "et": "Algus", "it": "Partenza", "de": "Start", "ar": "الانطلاق"}, "rt.depuis.ma.position": {"fr": "📍 Depuis ma position — mes 9 prochains arrêts", "en": "📍 From my position — my next 9 stops", "et": "📍 Minu asukohast — mu 9 järgmist peatust", "it": "📍 Dalla mia posizione — le mie prossime 9 tappe", "de": "📍 Ab meinem Standort — meine nächsten 9 Halte", "ar": "📍 من موقعي — محطاتي التسع القادمة"}, "rt.etape": {"fr": "Étape", "en": "Stop", "et": "Etapp", "it": "Tappa", "de": "Halt", "ar": "محطة"}, "rt.export.gmaps": {"fr": "🗺️ Export Google Maps + KML", "en": "🗺️ Export Google Maps + KML", "et": "🗺️ Ekspordi Google Maps + KML", "it": "🗺️ Esporta Google Maps + KML", "de": "🗺️ Google Maps + KML exportieren", "ar": "🗺️ تصدير Google Maps + KML"}, "rt.fermer": {"fr": "Fermer", "en": "Close", "et": "Sulge", "it": "Chiudi", "de": "Schließen", "ar": "إغلاق"}, "rt.fin.parcours": {"fr": "🎉 Fin du parcours.", "en": "🎉 End of route.", "et": "🎉 Teekonna lõpp.", "it": "🎉 Fine del percorso.", "de": "🎉 Ende der Route.", "ar": "🎉 نهاية المسار."}, "rt.geo.indispo": {"fr": "Géolocalisation indisponible.", "en": "Geolocation unavailable.", "et": "Asukoht pole saadaval.", "it": "Geolocalizzazione non disponibile.", "de": "Standortbestimmung nicht verfügbar.", "ar": "تحديد الموقع الجغرافي غير متاح."}, "rt.gps.refuse": {"fr": "⚠️ GPS refusé ou indisponible.", "en": "⚠️ GPS denied or unavailable.", "et": "⚠️ GPS keelatud või pole saadaval.", "it": "⚠️ GPS rifiutato o non disponibile.", "de": "⚠️ GPS abgelehnt oder nicht verfügbar.", "ar": "⚠️ تم رفض GPS أو غير متاح."}, "rt.ideal.en.route": {"fr": "Idéal en route : ouvre la navigation vers les prochains arrêts à partir d'où vous êtes. Relancez-le à chaque étape, ça avance tout seul.", "en": "Ideal on the road: opens navigation to the next stops from where you are. Relaunch it at each stop, it moves along on its own.", "et": "Ideaalne teel: avab navigeerimise järgmiste peatusteni sealt, kus oled. Käivita igal peatusel uuesti, edeneb ise.", "it": "Ideale in viaggio: apre la navigazione verso le prossime tappe da dove ti trovi. Rilancialo a ogni tappa, avanza da solo.", "de": "Ideal unterwegs: öffnet die Navigation zu den nächsten Halten von Ihrem Standort. Bei jedem Halt neu starten, es läuft von selbst.", "ar": "مثالي أثناء التنقل: يفتح الملاحة نحو المحطات القادمة من مكانك. أعد تشغيله عند كل محطة، ويتقدم تلقائيًا."}, "rt.itineraire": {"fr": "Itinéraire", "en": "Itinerary", "et": "Teekond", "it": "Itinerario", "de": "Route", "ar": "المسار"}, "rt.kml.telecharge": {"fr": "KML téléchargé — importez-le dans google.com/maps/d (My Maps).", "en": "KML downloaded — import it into google.com/maps/d (My Maps).", "et": "KML alla laaditud — impordi see google.com/maps/d (My Maps).", "it": "KML scaricato — importalo in google.com/maps/d (My Maps).", "de": "KML heruntergeladen — in google.com/maps/d (My Maps) importieren.", "ar": "تم تنزيل KML — استورده في google.com/maps/d (My Maps)."}, "rt.le.parcours.en": {"fr": "🗺️ Le parcours en", "en": "🗺️ The route in", "et": "🗺️ Teekond", "it": "🗺️ Il percorso in", "de": "🗺️ Die Route in", "ar": "🗺️ المسار في"}, "rt.loc.refusee": {"fr": "Localisation refusée.", "en": "Location denied.", "et": "Asukoht keelatud.", "it": "Localizzazione rifiutata.", "de": "Ortung abgelehnt.", "ar": "تم رفض تحديد الموقع."}, "rt.localisation": {"fr": "Localisation…", "en": "Locating…", "et": "Asukoha määramine…", "it": "Localizzazione…", "de": "Ortung…", "ar": "تحديد الموقع…"}, "rt.localisation.en.cours": {"fr": "📍 Localisation en cours…", "en": "📍 Locating…", "et": "📍 Asukoha määramine…", "it": "📍 Localizzazione in corso…", "de": "📍 Ortung läuft…", "ar": "📍 جارٍ تحديد الموقع…"}, "rt.localisation.en.cours.2": {"fr": "Localisation en cours…", "en": "Locating…", "et": "Asukoha määramine…", "it": "Localizzazione in corso…", "de": "Ortung läuft…", "ar": "جارٍ تحديد الموقع…"}, "rt.ouvrir.google.maps": {"fr": "ouvrir dans Google Maps", "en": "open in Google Maps", "et": "ava Google Mapsis", "it": "apri in Google Maps", "de": "in Google Maps öffnen", "ar": "فتح في Google Maps"}, "rt.ouvrir.nav": {"fr": "▶ Ouvrir la navigation — {n} arrêt(s) à venir", "en": "▶ Open navigation — {n} stop(s) ahead", "et": "▶ Ava navigeerimine — {n} peatust ees", "it": "▶ Apri la navigazione — {n} tappa/e in arrivo", "de": "▶ Navigation öffnen — {n} Halt(e) folgen", "ar": "▶ افتح الملاحة — {n} محطة قادمة"}, "rt.prochaine.etape": {"fr": "🧭 Prochaine étape :", "en": "🧭 Next stop:", "et": "🧭 Järgmine peatus:", "it": "🧭 Prossima tappa:", "de": "🧭 Nächster Halt:", "ar": "🧭 المحطة التالية:"}, "rt.retour": {"fr": "Retour", "en": "Back", "et": "Tagasi", "it": "Ritorno", "de": "Rückkehr", "ar": "العودة"}, "rt.route.reel": {"fr": "🛣️ Par la route (réel) :", "en": "🛣️ By road (actual):", "et": "🛣️ Mööda teed (tegelik):", "it": "🛣️ Su strada (reale):", "de": "🛣️ Auf der Straße (real):", "ar": "🛣️ عبر الطريق (فعلي):"}, "rt.suivi.actif": {"fr": "📍 Suivi ACTIF — arrêter", "en": "📍 Tracking ON — stop", "et": "📍 Jälgimine SEES — peata", "it": "📍 Monitoraggio ATTIVO — ferma", "de": "📍 Verfolgung AKTIV — stoppen", "ar": "📍 التتبع نشط — إيقاف"}, "rt.suivi.active": {"fr": "Suivi activé — bandeau live + alerte à moins de 2 km.", "en": "Tracking on — live banner + alert within 2 km.", "et": "Jälgimine sees — live-riba + hoiatus alla 2 km.", "it": "Monitoraggio attivato — banner live + avviso a meno di 2 km.", "de": "Verfolgung aktiviert — Live-Banner + Warnung unter 2 km.", "ar": "تم تفعيل التتبع — شريط مباشر + تنبيه على بُعد أقل من 2 كم."}, "rt.suivi.desactive": {"fr": "Suivi désactivé", "en": "Tracking off", "et": "Jälgimine väljas", "it": "Monitoraggio disattivato", "de": "Verfolgung deaktiviert", "ar": "تم إيقاف التتبع"}, "rt.suivi.proximite": {"fr": "📍 Suivi & alerte proximité", "en": "📍 Tracking & proximity alert", "et": "📍 Jälgimine ja lähedushoiatus", "it": "📍 Monitoraggio e avviso di prossimità", "de": "📍 Verfolgung & Näherungswarnung", "ar": "📍 التتبع وتنبيه القرب"}, "rt.troncon": {"fr": "Tronçon {n} / {tot}", "en": "Leg {n} / {tot}", "et": "Lõik {n} / {tot}", "it": "Tratto {n} / {tot}", "de": "Abschnitt {n} / {tot}", "ar": "المقطع {n} / {tot}"}, "rt.troncons": {"fr": "tronçon(s)", "en": "leg(s)", "et": "lõik(u)", "it": "tratto/i", "de": "Abschnitt(e)", "ar": "مقطع/مقاطع"}, "rt.non": {"fr": "Non", "en": "No", "et": "Ei", "it": "No", "de": "Nein", "ar": "لا"}, "rt.oui.y.aller": {"fr": "Oui, y aller", "en": "Yes, go there", "et": "Jah, lähme", "it": "Sì, andiamo", "de": "Ja, los", "ar": "نعم، لنذهب"}, "rt.road.trip": {"fr": "Road trip", "en": "Road trip", "et": "Teekond", "it": "Road trip", "de": "Roadtrip", "ar": "رحلة برية"}, "rt.suivi.gps": {"fr": "Suivi GPS", "en": "GPS tracking", "de": "GPS-Ortung", "it": "Localizzazione GPS", "ar": "التتبع عبر نظام تحديد المواقع العالمي (GPS)", "et": "GPS-jälgimine"}, "rt.alerte.prox": {"fr": "Alerte de proximité", "en": "Proximity alert", "de": "Näherungswarnung", "it": "Avviso di prossimità", "ar": "تنبيه الاقتراب", "et": "Läheduse hoiatus"}, "rt.alerte.titre": {"fr": "Vous prévenir quand un site vaut le détour", "en": "To let you know when a site is worth a visit", "de": "Sie benachrichtigen, wenn eine Website einen Besuch wert ist", "it": "Avvisarvi quando un sito merita una visita", "ar": "إخطاركم عندما يكون هناك موقع يستحق الزيارة", "et": "Teavitame teid, kui mõni veebileht on külastamist väärt"}, "rt.alerte.texte": {"fr": "Pendant que vous roulez, l'application surveille votre position et vous prévient dès qu'un lieu remarquable se trouve à moins de deux kilomètres. Vous restez libre d'y aller ou non. Votre position ne quitte jamais votre appareil.", "en": "Whilst you’re cycling, the app tracks your location and alerts you as soon as there’s a point of interest within two kilometres. It’s up to you whether you want to go there or not. Your location data never leaves your device.", "de": "Während der Fahrt überwacht die App Ihren Standort und benachrichtigt Sie, sobald sich eine Sehenswürdigkeit in einem Umkreis von weniger als zwei Kilometern befindet. Es steht Ihnen frei, dorthin zu fahren oder nicht. Ihr Standort verlässt zu keinem Zeitpunkt Ihr Gerät.", "it": "Mentre sei in viaggio, l'app monitora la tua posizione e ti avvisa non appena un luogo di interesse si trova a meno di due chilometri di distanza. Sei libero di andarci o meno. La tua posizione non viene mai condivisa al di fuori del tuo dispositivo.", "ar": "أثناء القيادة، يتتبع التطبيق موقعك ويُعلمك فور وجود معلم بارز على بعد أقل من كيلومترين. لك الحرية في الذهاب إلى هناك أو عدم الذهاب. ولا يغادر موقعك جهازك أبدًا.", "et": "Sõidu ajal jälgib rakendus teie asukohta ja teavitab teid, kui mõni huviväärsus asub vähem kui kahe kilomeetri kaugusel. Teil on vabadus sinna minna või mitte. Teie asukoht ei lahku kunagi teie seadmest."}, "rt.activer": {"fr": "Activer", "en": "Activate", "de": "Aktivieren", "it": "Attiva", "ar": "تنشيط", "et": "Aktiveeri"}, "rt.arreter2": {"fr": "Arrêter", "en": "Stop", "de": "Beenden", "it": "Interrompere", "ar": "إيقاف", "et": "Peatada"}, "rt.suivi.actif.msg": {"fr": "Suivi activé — votre position s'affiche sur la carte.", "en": "Tracking enabled — your location is shown on the map.", "de": "Tracking aktiviert – Ihr Standort wird auf der Karte angezeigt.", "it": "Tracciamento attivato — la tua posizione viene visualizzata sulla mappa.", "ar": "تم تنشيط ميزة التتبع — يظهر موقعك على الخريطة.", "et": "Jälgimine on sisse lülitatud — teie asukoht kuvatakse kaardil."}, "rt.alerte.besoin.gps": {"fr": "L'alerte a besoin du suivi GPS. Il sera activé en même temps, vous n'avez rien d'autre à faire.", "en": "The alert requires GPS tracking. It will be activated at the same time; you don’t need to do anything else.", "de": "Für den Alarm ist eine GPS-Ortung erforderlich. Diese wird gleichzeitig aktiviert, Sie müssen nichts weiter tun.", "it": "L'allarme richiede il tracciamento GPS. Verrà attivato automaticamente, non dovete fare altro.", "ar": "يتطلب التنبيه استخدام نظام تحديد المواقع (GPS). سيتم تفعيله تلقائيًّا، ولا يتعين عليك القيام بأي شيء آخر.", "et": "Häire vajab GPS-jälgimist. See lülitatakse sisse samal ajal, te ei pea midagi muud tegema."}, "rt.gps.deja.titre": {"fr": "Votre position est déjà connue", "en": "Your position is already known", "de": "Ihr Standort ist bereits bekannt", "it": "La vostra posizione è già nota", "ar": "موقفكم معروف بالفعل", "et": "Teie asukoht on juba teada"}, "rt.gps.deja.texte": {"fr": "Vous avez autorisé l'application à connaître votre position au démarrage. Voulez-vous la garder, ou ne plus l'utiliser du tout ?", "en": "You have authorised the app to access your location when it starts up. Do you want to keep it, or stop using it altogether?", "de": "Sie haben der App beim Start die Erlaubnis erteilt, Ihren Standort zu ermitteln. Möchten Sie diese Berechtigung beibehalten oder die App gar nicht mehr verwenden?", "it": "Hai autorizzato l'app a rilevare la tua posizione all'avvio. Vuoi mantenere questa impostazione o smettere del tutto di usarla?", "ar": "لقد سمحت للتطبيق بالوصول إلى موقعك عند بدء التشغيل. هل تريد الاحتفاظ بهذا الإذن، أم إلغاءه تمامًا؟", "et": "Olete andnud rakendusele loa teie asukoha kindlakstegemiseks rakenduse käivitamisel. Kas soovite seda luba säilitada või rakendust enam üldse mitte kasutada?"}, "rt.gps.garder": {"fr": "Garder", "en": "Keep", "de": "Behalten", "it": "Conservare", "ar": "حفظ", "et": "Säilitada"}, "rt.gps.retirer": {"fr": "Ne plus utiliser ma position", "en": "Stop using my location", "de": "Meinen Standort nicht mehr verwenden", "it": "Non utilizzare più la mia posizione", "ar": "التوقف عن استخدام موقعي", "et": "Minu asukohta enam mitte kasutada"}, "rt.gps.retirer.expl": {"fr": "Sans votre position, le suivi et l'alerte de proximité s'arrêtent, et « Ma position » ne servira plus à composer un itinéraire. L'application cesse aussitôt de la lire. L'autorisation elle-même se retire dans les réglages de votre navigateur.", "en": "Without your location, tracking and proximity alerts will stop, and ‘My Location’ will no longer be used to plan a route. The app will immediately stop accessing your location. You can revoke this permission yourself in your browser settings.", "de": "Ohne Ihre Standortdaten werden die Ortung und die Annäherungswarnung deaktiviert, und „Mein Standort“ kann nicht mehr zur Routenplanung verwendet werden. Die App hört sofort auf, diese Daten abzurufen. Die Berechtigung selbst können Sie in den Einstellungen Ihres Browsers widerrufen.", "it": "Senza la tua posizione, il monitoraggio e gli avvisi di prossimità vengono disattivati e la funzione «La mia posizione» non potrà più essere utilizzata per calcolare un itinerario. L'applicazione smette immediatamente di leggerla. L'autorizzazione stessa può essere revocata nelle impostazioni del tuo browser.", "ar": "بدون موقعك، سيتوقف كل من ميزة التتبع والتنبيهات عند الاقتراب، ولن يُستخدم خيار «موقعي» بعد ذلك في تحديد مسار. وسيتوقف التطبيق على الفور عن قراءة موقعك. ويمكن إلغاء هذا الإذن نفسه من إعدادات متصفحك.", "et": "Ilma teie asukohata peatuvad jälgimine ja lähenemishoiatus ning funktsioon „Minu asukoht” ei ole enam marsruudi koostamiseks kasutatav. Rakendus lõpetab selle andmete lugemise kohe. Loa saab tühistada oma brauseri seadete kaudu."}, "rt.gps.retire.msg": {"fr": "Position abandonnée — l'application ne la lit plus.", "en": "Position abandoned — the app no longer reads it.", "de": "Position aufgegeben – die Anwendung liest sie nicht mehr aus.", "it": "Posizione abbandonata — l'applicazione non la legge più.", "ar": "الموضع غير مستخدم — لم يعد التطبيق يقرأه.", "et": "Hüljatud seisund — rakendus ei loe seda enam."}, "rt.suivi.arret.titre": {"fr": "Arrêter le suivi ?", "en": "Stop tracking?", "de": "Die Nachverfolgung beenden?", "it": "Interrompere il monitoraggio?", "ar": "هل تريد إيقاف المتابعة؟", "et": "Jälgimise lõpetamine?"}, "rt.suivi.arret.texte": {"fr": "Le point bleu disparaîtra de la carte et l'alerte de proximité s'arrêtera avec lui.", "en": "The blue dot will disappear from the map and the proximity alert will stop at the same time.", "de": "Der blaue Punkt verschwindet von der Karte, und die Annäherungswarnung wird damit beendet.", "it": "Il punto blu scomparirà dalla mappa e, con esso, cesserà anche l'avviso di prossimità.", "ar": "ستختفي النقطة الزرقاء من الخريطة، وستتوقف معها تنبيهات الاقتراب.", "et": "Sinine punkt kaob kaardilt ja koos sellega lõpeb ka lähedushäire."}, "rt.mode.changer": {"fr": "Changer de mode : voiture, vélo, à pied", "en": "Change your mode of transport: car, cycle, on foot", "de": "Verkehrsmittel wechseln: Auto, Fahrrad, zu Fuß", "it": "Cambiare mezzo di trasporto: auto, bicicletta, a piedi", "ar": "تغيير وسيلة التنقل: السيارة، الدراجة، المشي", "et": "Liikumisviisi vahetamine: autoga, jalgrattaga, jalgsi"}, "rt.duree.estime": {"fr": "estimé", "en": "estimated", "de": "geschätzt", "it": "stimato", "ar": "المقدَّر", "et": "hinnanguline"}, "rt.mode.auto": {"fr": "En voiture", "en": "By car", "de": "Mit dem Auto", "it": "In auto", "ar": "بالسيارة", "et": "Autoga"}, "rt.mode.velo": {"fr": "À vélo", "en": "By bike", "de": "Mit dem Fahrrad", "it": "In bicicletta", "ar": "بالدراجة", "et": "Jalgrattaga"}, "rt.mode.pied": {"fr": "À pied", "en": "On foot", "de": "Zu Fuß", "it": "A piedi", "ar": "سيرًا على الأقدام", "et": "Jalgsi"}};
  function T(k, v) {
    var lang = (window.THEi18n && THEi18n.lang && THEi18n.lang()) || 'fr';
    var row = DICO[k];
    var s = row ? (row[lang] || row.fr || k) : k;
    if (v) for (var p in v) { s = s.split('{'+p+'}').join(v[p]); }
    return s;
  }
  function fmtD(km){ return km < 1 ? Math.round(km*1000)+" m" : (km<10?km.toFixed(1).replace(".",","):Math.round(km))+" km"; }

  /* --- petit toast --- */
  function toast(msg) {
    var w = document.getElementById("rtq-toast");
    if (!w) { w = document.createElement("div"); w.id = "rtq-toast";
      w.style.cssText = "position:fixed;left:0;right:0;bottom:88px;z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 14px";
      document.body.appendChild(w); }
    var t = document.createElement("div"); t.textContent = msg;
    t.style.cssText = "background:#26201a;color:#fff;border-radius:13px;padding:12px 16px;font-size:14px;font-weight:600;box-shadow:0 8px 26px rgba(0,0,0,.35);max-width:440px;opacity:0;transform:translateY(12px);transition:.35s";
    w.appendChild(t); requestAnimationFrame(function(){ t.style.opacity=1; t.style.transform="none"; });
    setTimeout(function(){ t.style.opacity=0; setTimeout(function(){ t.remove(); }, 400); }, 4500);
  }
  function getPos(){ return new Promise(function(res,rej){
    if(!navigator.geolocation) return rej();
    navigator.geolocation.getCurrentPosition(function(p){res([p.coords.longitude,p.coords.latitude]);},rej,{enableHighAccuracy:true,timeout:15000,maximumAge:5000});
  });}
  function xe(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  /* popup « à voir tout près » : vibration + Oui/Non (déclenché < 2 km) */
  function proxPopup(nom, dist, c){
    var old = document.getElementById("rtq-prox-popup"); if (old) old.remove();
    var ov = document.createElement("div"); ov.id = "rtq-prox-popup";
    ov.style.cssText = "position:fixed;inset:0;z-index:10000;background:#00000077;display:flex;align-items:center;justify-content:center;padding:20px";
    ov.innerHTML = '<div style="background:#fff;border-radius:18px;max-width:360px;width:100%;padding:22px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.35)">'
      + '<div style="font-size:36px">📍</div>'
      + '<h3 style="margin:6px 0 4px;color:#1f4d3a">'+T('rt.avoir.tout.pres')+'</h3>'
      + '<p style="margin:0 0 4px;font-size:16px;font-weight:800">' + xe(nom) + '</p>'
      + '<p style="margin:0 0 16px;color:#7d6b45;font-size:13px">'+T('rt.a.distance.voir',{d:fmtD(dist)})+'</p>'
      + '<div style="display:flex;gap:10px">'
      + '<button id="rtq-pp-no" style="flex:1;border:2px solid #cbb98f;background:#fff;color:#7d6b45;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.non')+'</button>'
      + '<button id="rtq-pp-yes" style="flex:1;border:none;background:#1f4d3a;color:#fff;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.oui.y.aller')+' 🧭</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    ov.querySelector("#rtq-pp-no").onclick = function(){ ov.remove(); };
    ov.querySelector("#rtq-pp-yes").onclick = function(){ ov.remove(); window.open("https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + c[1] + "," + c[0], "_blank"); };
    setTimeout(function(){ if (document.body.contains(ov)) ov.remove(); }, 15000); // auto-ferme (conduite)
  }

  /* LE MODE DE DÉPLACEMENT — 01/09/2026, Helmy : « sur Terralog la durée change
     quand on change le mode, comment ça fait ? ». Repris de chez eux
     (`blocs/20-itineraire.js` l.64-96), à l'identique :
       • en VOITURE, si le routeur a répondu, on prend SA durée, telle quelle ;
       • à VÉLO ou à PIED, on prend sa DISTANCE — elle, est juste — et on divise
         par une vitesse de voyage. Le résultat est marqué « estimé » ;
       • sans routeur, la ligne d'origine reste, avec son estimation.
     ⚠️ ON NE DEMANDE PAS UN PROFIL VÉLO AU ROUTEUR. La session Terralog l'a
     mesuré : le serveur public rend la MÊME durée à `driving`, `cycling` et
     `foot` — 3607,3 s aux cinq essais. On afficherait une durée de voiture sous
     une icône de vélo, sans qu'un seul chiffre ne bouge pour avertir. */
  var RT_MODES = [
    { cle:'auto', icone:'\uD83D\uDE97', kmh:70 },
    { cle:'pied', icone:'\uD83D\uDEB6', kmh:4.5 }
  ];
  var RT_TRONCONS = null;
  function modeActuel(){
    var c='auto'; try{ c=localStorage.getItem('the_mode_trajet')||'auto'; }catch(e){}
    for(var i=0;i<RT_MODES.length;i++) if(RT_MODES[i].cle===c) return RT_MODES[i];
    return RT_MODES[0];
  }
  function modeSuivant(){
    var i = RT_MODES.indexOf(modeActuel());
    var suiv = RT_MODES[(i+1)%RT_MODES.length];
    try{ localStorage.setItem('the_mode_trajet', suiv.cle); }catch(e){}
    /* on ne redessine QUE les lignes de durée : la personne a le doigt sur
       l'écran, une page reconstruite lui sauterait sous les yeux. */
    rafraichirDurees();
    toast(T('rt.mode.'+suiv.cle));
  }

  /* Réécrit la ligne de trajet de chaque étape, elle seule. */
  function rafraichirDurees(){
    var m = modeActuel();
    var lignes = document.querySelectorAll('.stop .times');
    for (var i=0; i<lignes.length; i++){
      var L = lignes[i];
      var b = L.querySelector('.rt-mode');
      if (!b){
        b = document.createElement('button');
        b.type = 'button'; b.className = 'rt-mode';
        b.style.cssText = 'border:1px solid var(--line,#e3d8c4);background:#fff;border-radius:8px;'
          + 'min-width:34px;min-height:34px;padding:0 7px;font:inherit;font-size:16px;line-height:1;'
          + 'cursor:pointer;margin-right:5px';
        b.onclick = function(ev){ ev.stopPropagation(); modeSuivant(); };
        L.insertBefore(b, L.firstChild);
        var v = document.createElement('span'); v.className = 'rt-duree';
        L.insertBefore(v, b.nextSibling);
        /* la ligne d'origine reste, en repli, tant que le routeur n'a rien dit */
      }
      b.textContent = m.icone;
      b.title = T('rt.mode.changer'); b.setAttribute('aria-label', T('rt.mode.changer'));
      var t = RT_TRONCONS && RT_TRONCONS[i] ? RT_TRONCONS[i] : null;
      var v2 = L.querySelector('.rt-duree');
      var vieux = L.querySelector('.rt-vieux');
      /* Trois degrés de vérité, du meilleur au moindre — repris de Terralog :
         voiture + routeur = sa durée, telle quelle ;
         vélo ou pied      = sa DISTANCE (juste) ÷ une vitesse de voyage ;
         pas de routeur    = vol d'oiseau × 1,28 ÷ la même vitesse.
         Les deux derniers sont marqués « estimé ». On ne demande jamais un profil
         vélo au serveur public : il rend la durée voiture pour les trois. */
      var km = t ? t.km : (parseFloat(L.getAttribute('data-km')) || 0) * 1.28;
      var min;
      if (t && m.cle === 'auto') min = t.min;
      else if (km > 0)           min = km / m.kmh * 60;
      else { if(v2) v2.textContent=''; if(vieux) vieux.style.display=''; continue; }
      var n = Math.max(1, Math.round(min));
      var h = Math.floor(n/60), r = n%60;
      var txt = h ? (h+' h'+(r?' '+r:'')) : (n+' min');
      v2.innerHTML = '<b>'+txt+'</b>';
      if (vieux) vieux.style.display = 'none';
    }
  }

  /* --- 1) VRAI ROUTAGE OSRM --- */
  function drawRealRoute() {
    if (typeof mapObj === "undefined" || !mapObj || typeof navData !== "function") return;
    var d = navData(); if (!d) return;
    var pts = [d.origin].concat(d.stops); if (d.forme === "boucle") pts.push(d.origin);
    if (pts.length < 2) return;
    var coords = pts.map(function (p) { return p[0] + "," + p[1]; }).join(";");
    fetch(OSRM + coords + "?overview=full&geometries=geojson").then(function (r) { return r.json(); }).then(function (j) {
      if (!j.routes || !j.routes.length || !mapObj) return;
      var rt = j.routes[0];
      /* LES TRONÇONS ÉTAIENT JETÉS — 01/09/2026. Le routeur rend `legs[]` : la
         distance et la durée de CHAQUE segment. On n'en gardait que le total,
         affiché en tête, pendant que chaque étape montrait en dessous une
         estimation à vol d'oiseau — deux chiffres contradictoires à trois lignes
         d'écart. On garde les tronçons : ils nourrissent la ligne de chaque
         étape, sans un appel de plus. */
      try{
        RT_TRONCONS = (rt.legs || []).map(function(l){
          return { km:(l.distance||0)/1000, min:(l.duration||0)/60 };
        });
        rafraichirDurees();
      }catch(e){}
      try { if (realLayer) mapObj.removeLayer(realLayer); } catch (e) {}
      realLayer = L.polyline(rt.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }), { color: "#1f4d3a", weight: 4, opacity: .9 }).addTo(mapObj);
      // La vraie route est tracée → on retire la ligne droite pointillée « à vol d'oiseau »
      // (sinon les segments vers une étape ajoutée restent en ligne droite).
      try { mapObj.eachLayer(function (l) { if (l !== realLayer && l instanceof L.Polyline && l.options && l.options.dashArray) mapObj.removeLayer(l); }); } catch (e) {}
      var km = Math.round(rt.distance / 1000), min = Math.round(rt.duration / 60), h = Math.floor(min / 60), m = min % 60;
      var dur = h ? (h + " h" + (m ? " " + m : "")) : (m + " min");
      var b = document.getElementById("rtq-realbadge");
      if (!b) { b = document.createElement("div"); b.id = "rtq-realbadge";
        b.style.cssText = "text-align:center;margin:8px 0 2px;font-size:14px;color:#1f4d3a;font-weight:700";
        var meta = document.querySelector("#rsum .meta"); if (meta && meta.parentNode) meta.parentNode.insertBefore(b, meta.nextSibling); }
      b.innerHTML = T('rt.route.reel')+' <b>' + km + ' km</b> · <b>' + dur + '</b>';
    }).catch(function () {});
  }

  /* --- helpers itinéraire --- */
  function routePoints(){ // [{lat,lng,nom}] origine + étapes (+ retour si boucle)
    if (typeof navData !== "function") return null;
    var d = navData(); if (!d) return null;
    var pts = [{lat:d.origin[1],lng:d.origin[0],nom:T('rt.depart')}];
    (LASTRES.route||[]).forEach(function(s){ pts.push({lat:s.c[1],lng:s.c[0],nom:(s.p&&s.p.nom)||T('rt.etape')}); });
    if (d.forme === "boucle") pts.push({lat:d.origin[1],lng:d.origin[0],nom:T('rt.retour')});
    return pts;
  }
  function gmDir(seg){ // seg = [{lat,lng}]
    var o=seg[0], dd=seg[seg.length-1], wp=seg.slice(1,-1);
    return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin="+o.lat+","+o.lng+
      "&destination="+dd.lat+","+dd.lng+(wp.length?"&waypoints="+wp.map(function(p){return p.lat+","+p.lng;}).join("|"):"");
  }

  /* --- 2) EXPORT GOOGLE MAPS PAR TRONÇONS ≤ 10 + 3) 9 prochains arrêts + 4) KML --- */
  function gmChunks() {
    var pts = routePoints(); if (!pts) return null;
    var parts = [], i = 0, SIZE = 10;
    if (pts.length <= SIZE) parts.push(pts);
    else while (i < pts.length - 1) { parts.push(pts.slice(i, Math.min(i + SIZE, pts.length))); i += SIZE - 1; }
    return parts.map(gmDir);
  }
  // 3) navigation depuis la position : les 9 prochains arrêts (avance au fil du voyage)
  function navFromHere() {
    var box = document.getElementById("rtq-navbox"); if (box) box.textContent = T('rt.localisation.en.cours');
    getPos().then(function (pos) {
      var seq = routePoints(); if (!seq) return;
      var here = {lat:pos[1],lng:pos[0]};
      var k = 0, best = Infinity;
      seq.forEach(function (s, i) { var dd = haversine([s.lng,s.lat], pos); if (dd < best) { best = dd; k = i; } });
      var up = seq.slice(k).slice(0, 9);
      if (!up.length) { if (box) box.textContent = T('rt.fin.parcours'); return; }
      var url = gmDir([here].concat(up));
      var names = up.map(function(s){return s.nom;}).join(" → ");
      if (box) box.innerHTML = '<a href="'+url+'" target="_blank" rel="noopener" style="display:block;background:#eef7f1;border:1.5px solid #2e6a4d;border-radius:12px;padding:12px 14px;text-decoration:none;color:#1f4d3a;font-weight:700">'+T('rt.ouvrir.nav',{n:up.length})+'</a><p style="font-size:12px;color:#7d6b45;margin:6px 0 0">'+xe(names)+'</p>';
    }).catch(function () { if (box) box.textContent = T('rt.gps.refuse'); });
  }
  // 4) export KML pour Google My Maps
  function downloadKML() {
    var pts = routePoints(); if (!pts || pts.length < 2) { toast(T('rt.composez.dabord')); return; }
    var marks = pts.map(function (p, i) {
      return "<Placemark><name>" + xe((i===0?"":i+". ") + p.nom) + "</name><Point><coordinates>" + p.lng + "," + p.lat + ",0</coordinates></Point></Placemark>";
    }).join("\n");
    var line = "<Placemark><name>"+T('rt.itineraire')+"</name><LineString><tessellate>1</tessellate><coordinates>" +
      pts.map(function (p) { return p.lng + "," + p.lat + ",0"; }).join(" ") + "</coordinates></LineString></Placemark>";
    var _en = (window.HConf&&HConf.exportNom)||"Estonia-Heritage";
    var kml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>' + _en + '</name>\n' + line + "\n" + marks + "\n</Document></kml>";
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([kml], { type: "application/vnd.google-earth.kml+xml" }));
    a.download = ((window.HConf&&HConf.exportNom)||"Estonia-Heritage")+".kml"; document.body.appendChild(a); a.click(); a.remove();
    toast(T('rt.kml.telecharge'));
  }
  function exportGmapsChunks() {
    var links = gmChunks();
    if (!links) { toast(T('rt.composez.dabord')); return; }
    var ov = document.getElementById("rtq-modal");
    if (!ov) { ov = document.createElement("div"); ov.id = "rtq-modal";
      ov.style.cssText = "position:fixed;inset:0;z-index:9998;background:#00000088;display:flex;align-items:flex-end;justify-content:center";
      ov.onclick = function (e) { if (e.target === ov) ov.style.display = "none"; };
      document.body.appendChild(ov); }
    var h = '<div style="background:#f6f0e4;width:100%;max-width:520px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:20px 18px 30px">';
    h += '<div style="border:1px solid #cfe3d6;background:#f4fbf6;border-radius:12px;padding:12px;margin-bottom:14px">'
      + '<b style="color:#1f4d3a">'+T('rt.depuis.ma.position')+'</b>'
      + '<p style="font-size:12.5px;color:#7d6b45;margin:4px 0 9px">'+T('rt.ideal.en.route')+'</p>'
      + '<button id="rtq-navhere" type="button" style="width:100%;border:none;border-radius:11px;padding:12px;background:#2e6a4d;color:#fff;font-weight:800;font-family:inherit">'+T('rt.calculer.arrets')+'</button>'
      + '<div id="rtq-navbox" style="margin-top:9px"></div></div>';
    h += '<h3 style="margin:0 0 4px;color:#1f4d3a">'+T('rt.le.parcours.en')+' ' + links.length + ' '+T('rt.troncons')+'</h3>';
    h += '<p style="color:#7d6b45;font-size:13px;margin:0 0 10px">'+T('rt.chaque.troncon')+'</p>';
    links.forEach(function (u, i) {
      h += '<a href="' + u + '" target="_blank" rel="noopener" style="display:block;background:#fff;border:1.5px solid #cfe3d6;border-radius:12px;padding:12px 14px;margin-bottom:9px;text-decoration:none;color:#26201a;font-size:14px"><b style="color:#1f4d3a">'+T('rt.troncon',{n:i+1,tot:links.length})+'</b> — '+T('rt.ouvrir.google.maps')+' 🧭</a>';
    });
    h += '<button id="rtq-kml" type="button" style="width:100%;margin-top:6px;border:2px solid #1f4d3a;background:#fff;color:#1f4d3a;border-radius:12px;padding:13px;font-weight:800;font-family:inherit">'+T('rt.carte.partageable')+'</button>';
    h += '<button id="rtq-close" type="button" style="width:100%;margin-top:8px;border:none;background:#e7ddc8;color:#5a4a2a;border-radius:12px;padding:13px;font-weight:700;font-family:inherit">'+T('rt.fermer')+'</button></div>';
    ov.innerHTML = h; ov.style.display = "flex";
    document.getElementById("rtq-navhere").onclick = navFromHere;
    document.getElementById("rtq-kml").onclick = downloadKML;
    document.getElementById("rtq-close").onclick = function(){ ov.style.display = "none"; };
  }

  /* --- 5) SUIVI GPS EN DIRECT : bandeau « prochaine étape » + alerte < 2 km --- */
  function followBar(){
    var b = document.getElementById("rtq-followbar");
    if (!b) { b = document.createElement("div"); b.id = "rtq-followbar";
      b.style.cssText = "position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom) + 12px);z-index:9997;background:#1f4d3a;color:#fff;border-radius:14px;padding:11px 14px;box-shadow:0 8px 26px rgba(0,0,0,.3);display:none;align-items:center;gap:10px;font-size:13.5px";
      b.innerHTML = '<span id="rtq-followtxt" style="flex:1">'+T('rt.localisation')+'</span><button id="rtq-followstop" style="border:none;background:#ffffff33;color:#fff;border-radius:9px;padding:8px 11px;font-weight:700;font-family:inherit">'+T('rt.arreter')+'</button>';
      document.body.appendChild(b);
      b.querySelector("#rtq-followstop").onclick = function(){ stopFollow(); };
    }
    return b;
  }
  /* UN POINT VERT OU ROUGE — 01/09/2026, Helmy. Le pictogramme seul ne dit pas
     s'il tourne : on lui accroche une pastille, verte quand c'est actif, rouge
     quand ça ne l'est pas. Elle est posée EN LIGNE sur le bouton, jamais dans une
     feuille de style partagée — la leçon du 31/08. */
  function pastille(id, actif){
    var b = document.getElementById(id); if (!b) return;
    b.classList.toggle("on", !!actif);
    b.setAttribute("aria-pressed", actif ? "true" : "false");
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    var p = b.querySelector(".rtq-led");
    if (!p){
      p = document.createElement("span"); p.className = "rtq-led";
      p.style.cssText = "position:absolute;top:4px;right:4px;width:9px;height:9px;border-radius:50%;"
                      + "border:1.5px solid #fffdf7;pointer-events:none";
      b.appendChild(p);
    }
    p.style.background = actif ? "#2e9e5b" : "#b4462f";
  }

  /* L'écoute ne s'éteint que lorsque PLUS PERSONNE n'en a besoin. */
  function majEcoute(){
    if (!suiviOn && !alerteOn && watchId != null){
      navigator.geolocation.clearWatch(watchId); watchId = null;
      if (meMarker && typeof mapObj !== "undefined" && mapObj){ try{ mapObj.removeLayer(meMarker); }catch(e){} meMarker = null; }
    }
    var b = document.getElementById("rtq-followbar");
    if (b) b.style.display = suiviOn ? "flex" : "none";
    pastille("rtq-suivi", suiviOn);
    pastille("rtq-prox",  alerteOn);
  }
  function stopFollow(){ suiviOn = false; alerteOn = false; majEcoute(); toast(T('rt.suivi.desactive')); }

  /* ON DIT AVANT DE DEMANDER — Helmy : « quand on appuie dessus, ça explique ce
     que ça fait et ça propose ». Une application qui allume le GPS sans prévenir
     est une application qu'on désinstalle ; et Apple refuse une position prise
     sans motif annoncé. */
  /* UNE SEULE FENÊTRE POUR TOUTES LES QUESTIONS — 01/09/2026. On demande la même
     chose de quatre endroits différents ; une fenêtre par endroit, ce sont quatre
     libellés à tenir d'accord et quatre occasions de diverger. */
  function demander(icone, titre, texte, ouiTxt, nonTxt, siOui){
    var ov = document.getElementById("rtq-ask"); if (ov) ov.remove();
    ov = document.createElement("div"); ov.id = "rtq-ask";
    ov.style.cssText = "position:fixed;inset:0;z-index:9999;background:#00000066;display:flex;align-items:center;justify-content:center;padding:20px";
    ov.innerHTML = '<div style="background:#fffdf7;border-radius:14px;padding:18px;max-width:370px;width:100%;box-shadow:0 14px 40px rgba(0,0,0,.35)">'
      + '<h3 style="margin:0 0 8px;font-size:16px;color:#3d3320">'+icone+' '+xe(titre)+'</h3>'
      + '<p style="margin:0 0 15px;font-size:13.5px;line-height:1.5;color:#6b5c3a">'+xe(texte)+'</p>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      +   '<button id="rtq-ask-non" type="button" style="flex:1;min-width:120px;font-family:inherit;border-radius:9px;padding:11px;font-size:14.5px;font-weight:600;cursor:pointer;border:1.5px solid #cbbb95;background:#fffdf7;color:#4a3d22">'+xe(nonTxt)+'</button>'
      +   '<button id="rtq-ask-oui" type="button" style="flex:1;min-width:120px;font-family:inherit;border-radius:9px;padding:11px;font-size:14.5px;font-weight:600;cursor:pointer;border:1.5px solid #2e6a4d;background:#2e6a4d;color:#fff">'+xe(ouiTxt)+'</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    var fermer = function(){ var o=document.getElementById("rtq-ask"); if(o) o.remove(); };
    ov.onclick = function(e){ if (e.target === ov) fermer(); };
    document.getElementById("rtq-ask-non").onclick = fermer;
    document.getElementById("rtq-ask-oui").onclick = function(){ fermer(); siOui(); };
  }

  /* CE QUE LE NAVIGATEUR SAIT DÉJÀ. Une autorisation donnée au démarrage reste
     donnée : le bouton doit le dire, au lieu de faire croire qu'il l'obtient.
     ⚠️ On ne peut PAS révoquer une autorisation depuis la page — aucun navigateur
     ne le permet, et prétendre le contraire serait mentir. Ce qu'on peut faire, et
     qui compte : CESSER DE LIRE la position, tout de suite et partout. Le texte le
     dit en toutes lettres et renvoie aux réglages pour le reste. */
  var gpsAbandonne = false;
  try{ gpsAbandonne = localStorage.getItem('the_gps_abandon') === '1'; }catch(e){}
  function autorisationConnue(cb){
    try{
      if (navigator.permissions && navigator.permissions.query){
        navigator.permissions.query({name:'geolocation'}).then(function(r){ cb(r.state === 'granted'); })
          .catch(function(){ cb(false); });
        return;
      }
    }catch(e){}
    cb(false);
  }

  function allumerSuivi(){
    suiviOn = true;
    gpsAbandonne = false; try{ localStorage.removeItem('the_gps_abandon'); }catch(e){}
    var bar = followBar(); bar.style.display = "flex";
    document.getElementById("rtq-followtxt").textContent = T('rt.localisation.en.cours.2');
    ecouter();
  }

  function abandonnerPosition(){
    suiviOn = false; alerteOn = false;
    gpsAbandonne = true; try{ localStorage.setItem('the_gps_abandon','1'); }catch(e){}
    majEcoute();
    toast(T('rt.gps.retire.msg'));
  }

  function toggleSuivi(){
    if (suiviOn){
      /* on ne coupe pas d'un doigt qui glisse : le suivi emporte l'alerte avec lui */
      demander('\uD83D\uDEF0\uFE0F', T('rt.suivi.arret.titre'), T('rt.suivi.arret.texte'),
               T('rt.arreter'), T('rt.non'), function(){
        suiviOn = false; alerteOn = false; majEcoute(); toast(T('rt.suivi.desactive'));
      });
      return;
    }
    if (!navigator.geolocation){ toast(T('rt.geo.indispo')); return; }
    autorisationConnue(function(deja){
      if (deja && !gpsAbandonne){
        /* Helmy : « si la personne accepte au début, super ; si après elle pousse
           sur suivi GPS, on lui dit que la position est déjà connue, on confirme
           le maintien ou pas ». */
        demander('\uD83D\uDCCD', T('rt.gps.deja.titre'),
                 T('rt.gps.deja.texte') + ' ' + T('rt.gps.retirer.expl'),
                 T('rt.gps.garder'), T('rt.gps.retirer'),
                 allumerSuivi);
        var non = document.getElementById("rtq-ask-non");
        if (non) non.onclick = function(){ var o=document.getElementById("rtq-ask"); if(o) o.remove(); abandonnerPosition(); };
        return;
      }
      demander('\uD83D\uDEF0\uFE0F', T('rt.suivi.gps'), T('rt.suivi.actif.msg'),
               T('rt.activer'), T('rt.non'), allumerSuivi);
    });
  }

  function toggleAlerte(){
    if (alerteOn){
      alerteOn = false; majEcoute(); toast(T('rt.suivi.desactive')); return;
    }
    if (!navigator.geolocation){ toast(T('rt.geo.indispo')); return; }
    /* Helmy : « si la personne veut l'alerte de proximité, on l'informe qu'on va
       réintroduire le suivi GPS et le positionnement pour ça, et c'est fait sans
       qu'elle le demande ». Une seule confirmation, qui allume les deux. */
    var texte = T('rt.alerte.texte');
    if (!suiviOn) texte += ' ' + T('rt.alerte.besoin.gps');
    demander('\uD83D\uDCE1', T('rt.alerte.titre'), texte,
             T('rt.activer'), T('rt.non'), function(){
      alerteOn = true; alerted = {};
      if (!suiviOn) allumerSuivi(); else ecouter();
      majEcoute();
    });
  }

  function ecouter() {
    majEcoute();
    if (watchId != null) return;          // une seule écoute pour les deux
    toast(suiviOn ? T('rt.suivi.actif.msg') : T('rt.alerte.titre'));
    watchId = navigator.geolocation.watchPosition(function (p) {
      var me = [p.coords.longitude, p.coords.latitude];
      if (!LASTRES || !LASTRES.route) return;
      /* le point bleu et le bandeau appartiennent au SUIVI ; l'alerte n'en a pas
         besoin pour faire son travail. */
      if (suiviOn && typeof mapObj !== "undefined" && mapObj) {
        if (!meMarker) meMarker = L.marker([me[1], me[0]], { icon: L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid #fff;box-shadow:0 0 0 4px #1a73e855"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 2000 }).addTo(mapObj);
        else meMarker.setLatLng([me[1], me[0]]);
      }
      var near = null, nd = Infinity;
      LASTRES.route.forEach(function (s) { var dd = haversine(me, s.c); if (dd < nd) { nd = dd; near = s; } });
      var txt = document.getElementById("rtq-followtxt");
      if (suiviOn && near && txt) txt.innerHTML = T('rt.prochaine.etape')+' <b>' + xe(near.p.nom) + '</b> · ' + fmtD(nd);
      if (alerteOn && near && nd <= 2 && !alerted[near.p.nom]) {
        alerted[near.p.nom] = 1;
        try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch (e) {}
        try { if ("Notification" in window && Notification.permission === "granted") new Notification("📍 " + near.p.nom, { body: T('rt.avoir.tout.pres') }); } catch (e) {}
        proxPopup(near.p.nom, nd, near.c);   // vibration + popup Oui / Non
      }
    }, function () { toast(T('rt.loc.refusee')); },
       /* ⚠️ enableHighAccuracy: FALSE — corrigé le 31/08/2026, point 1 du chantier
          « alerte de proximité ».

          Il valait `true`, en contradiction frontale avec le §4 de notre propre
          dépannage : c'est la géolocalisation en haute précision qui a FIGÉ l'écran
          d'itinéraire en WKWebView, constaté le 23/08. Dans cette vue, une demande
          de position peut ne jamais rappeler ses callbacks, et son `timeout` ne
          court même pas pendant la demande d'autorisation native. Le remède avait
          été posé sur le départ GPS — personne ne l'avait porté ici, sur le SEUL
          endroit de l'application qui demande la position EN CONTINU.

          Et la haute précision ne sert à rien pour ce que fait ce suivi : il alerte
          à 2 km. Le GPS fin coûte la batterie pour une exactitude dont le calcul
          n'a aucun besoin.

          `maximumAge` passe de 4 s à 15 s : accepter une position d'un quart de
          minute épargne autant de réveils du GPS. À 90 km/h cela représente 375 m,
          négligeable devant un rayon de 2 km ; à pied, une vingtaine de mètres. */
       { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 });
  }

  /* --- injection des boutons + patch de render --- */
  function injectButtons() {
    if (document.getElementById("rtq-actions")) return;
    var anchor = document.getElementById("gmapshint");
    if (!anchor || !anchor.parentNode) return;
    var g = document.createElement("div");
    g.id = "rtq-actions"; g.className = "exp-group";
    /* « Export Google Maps + KML » a quitté cette barre : il est passé dans le
       bouton unique de la carte, avec les quatre applications de navigation.
       Un seul geste pour emporter son itinéraire, où qu'on aille. */
    /* DEUX BOUTONS — 01/09/2026, Helmy : « le suivi actif : l'icône GPS ; et suivi
       et alerte de proximité : une sorte d'icône radar ». Le nom part en `title`
       et `aria-label`, comme partout ailleurs dans l'étape. */
    g.innerHTML = '<div class="exp-lbl">🚗 '+T('rt.road.trip')+'</div><div class="exp">' +
      '<button id="rtq-suivi" type="button" aria-pressed="false" title="'+xe(T('rt.suivi.gps'))+'" aria-label="'+xe(T('rt.suivi.gps'))+'">\uD83D\uDEF0\uFE0F</button>' +
      '<button id="rtq-prox" type="button" aria-pressed="false" title="'+xe(T('rt.alerte.prox'))+'" aria-label="'+xe(T('rt.alerte.prox'))+'">\uD83D\uDCE1</button></div>';
    anchor.parentNode.insertBefore(g, anchor);
    document.getElementById("rtq-suivi").onclick = function () { toggleSuivi(); };
    document.getElementById("rtq-prox").onclick  = function () { toggleAlerte(); };
    /* la pastille se pose tout de suite : à l'arrivée, elle dit « éteint », ce qui
       est une information — un bouton sans état laisse croire qu'il n'en a pas. */
    majEcoute();
  }

  if (typeof render === "function") {
    var _render = render;
    render = function (o, r) {
      _render(o, r);
      setTimeout(function () { injectButtons(); if (r && r.route && r.route.length) drawRealRoute(); }, 300);
    };
  }
  /* Les trois sorties « road trip » sont désormais offertes par le bouton unique
     posé sur la carte (itineraire.html). Elles vivaient dans cette clôture ; on
     les publie telles quelles, sans rien changer à leur comportement. */
  window.THErt = { chunks: exportGmapsChunks, kml: downloadKML };

  document.addEventListener("DOMContentLoaded", injectButtons);
  setTimeout(injectButtons, 800);
  /* LA PASTILLE SE REPOSE — le bandeau de tête réduit ces boutons à leur seule
     icône en réécrivant leur contenu, ce qui emporte la pastille avec. Plutôt que
     d'interdire au bandeau de faire son travail, on la remet : elle est le reflet
     d'un état, pas un contenu. Un passage par seconde, c'est indolore et cela
     rattrape aussi bien le déplacement que le retour d'un rendu. */
  setInterval(function(){
    if (document.getElementById("rtq-suivi") || document.getElementById("rtq-prox")) majEcoute();
    /* Le bouton de mode ne doit pas attendre le routeur : sans réseau il n'y aurait
       aucun moyen de passer à pied ou à vélo, alors que c'est justement là qu'on en
       a besoin. Il paraît avec l'étape ; la durée réelle le rejoint si elle vient. */
    if (document.querySelector('.stop .times')) rafraichirDurees();
  }, 1000);
})();
