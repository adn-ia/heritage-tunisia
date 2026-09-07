#!/usr/bin/env python3
"""
Fabrique les voix de la visite guidée.   python3 .faire-voix-tour.py

⚠️ CE FICHIER EST LE SEUL ENDROIT OÙ LE NARRATEUR EST ÉCRIT.
`.gitignore` exclut `*.mp3` : les 80 voix de `voix/tour/` ne sont PAS versionnées.
Elles se refabriquent d'ici, à l'identique, tant que ce script existe — c'est
exactement ce qui manquait aux 60 MP3 du 1er août, faits avec une voix que
personne n'avait notée.

Le point (dot) devant le nom le tient hors des envois : `deployer.sh` écarte les
fichiers cachés, comme les autres outils de contrôle.

Fabrique les voix de la visite guidée — 15 étapes × 5 langues.

⚠️ UN NARRATEUR PAR LANGUE, ÉCRIT ICI pour qu'on puisse refaire à l'identique.
Les 60 MP3 d'avant (1er août) avaient été faits avec une voix que personne
n'avait notée : impossible de les prolonger sans changer de narrateur en cours
de route. On régénère donc TOUT, d'une seule voix par langue.

⚠️ LES EMOJIS SE RETIRENT AVANT DE PARLER. Leçon du 04/09 (canon, point 20) :
les MP3 disaient « bienvenue waving hand ».
"""
import asyncio, json, re, os, sys
import edge_tts

VOIX = {
    "fr": "fr-FR-DeniseNeural",
    "en": "en-GB-SoniaNeural",
    "de": "de-DE-KatjaNeural",
    "it": "it-IT-ElsaNeural",
    "ar": "ar-TN-ReemNeural",   # arabe TUNISIEN, pour une application sur la Tunisie
}
EMOJI = re.compile("[\U0001F000-\U0001FAFF☀-➿️←-⇿⬀-⯿]+")

def a_dire(titre, corps):
    t = EMOJI.sub("", titre).strip(" .·—-")
    c = EMOJI.sub("", corps).strip()
    return (t + ". " + c) if t else c

async def une(lang, ident, texte, dossier):
    chemin = os.path.join(dossier, "%s-%s.mp3" % (ident, lang))
    await edge_tts.Communicate(texte, VOIX[lang]).save(chemin)
    return chemin, os.path.getsize(chemin)

async def main():
    d = json.load(open("brique-tour.data.json", encoding="utf-8"))
    dossier = "voix/tour"
    os.makedirs(dossier, exist_ok=True)
    faits = 0
    for s in d["steps"]:
        for lang in VOIX:
            texte = a_dire(s["title"][lang], s["body"][lang])
            for essai in (1, 2, 3):
                try:
                    ch, taille = await une(lang, s["id"], texte, dossier)
                    print("  %-28s %6d o" % (os.path.basename(ch), taille))
                    faits += 1
                    break
                except Exception as e:
                    if essai == 3:
                        print("  ⚠ ÉCHEC %s-%s : %s" % (s["id"], lang, e))
                    else:
                        await asyncio.sleep(2)
            await asyncio.sleep(0.4)      # on ne martèle pas le service
    print("\n  %d fichiers sur %d" % (faits, len(d["steps"]) * len(VOIX)))

asyncio.run(main())
