"""Un script écrit DANS une chaîne compile-t-il ?

`the-souvenir.js` fabrique un fichier qui porte son propre script, écrit morceau
par morceau dans une chaîne JavaScript. `node --check` valide le module qui
l'écrit — jamais ce qu'il écrit. Le 03/09/2026, une ligne dupliquée y refermait
une fonction trop tôt : le module compilait, le contrôle passait au vert, et le
fichier livré au voyageur était mort au chargement.

On reconstitue donc la chaîne comme le ferait le navigateur, et on la compile.
"""
import io, re, subprocess, tempfile, os, sys

mauvais = []
for f in sorted(os.listdir('.')):
    if not f.endswith('.js') or '.avant' in f:
        continue
    s = io.open(f, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r"var script\s*=\n(.*?)\n\s*var ", s, re.S):
        bouts = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))
        if not bouts:
            continue
        code = ''.join(b.replace("\\'", "'").replace('\\"', '"') for b in bouts)
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as t:
            t.write(code)
            p = t.name
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        os.unlink(p)
        if r.returncode:
            detail = (r.stderr.split('\n') + [''] * 6)[4].strip()
            mauvais.append("%s : le script qu'il ecrit ne compile pas — %s" % (f, detail))

# ── et la balise qui referme ce script ──────────────────────────────────────
# `'<\\/script>'` en source JavaScript vaut « <\/script> » : la barre oblique
# inverse se retrouve DANS le fichier produit, le navigateur bute dessus et
# refuse tout le script. Il en faut une seule — `'<\/script>'` — dont le rôle
# est d'empêcher le navigateur de croire que la balise se ferme dans le module.
for f in sorted(os.listdir('.')):
    if not f.endswith('.js') or '.avant' in f:
        continue
    s = io.open(f, encoding='utf-8', errors='ignore').read()
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.S)          # pas les commentaires
    if re.search(r"'<\\\\/script>'", s):
        mauvais.append(f + " : « <\\\\/script> » — une barre oblique inverse en trop, "
                           "le fichier produit embarquerait un script mort")

print('\n'.join(mauvais))
