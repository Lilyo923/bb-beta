#!/usr/bin/env python3
"""
Brad Bitt, mais le jeu — l'empreinte d'un code du compte a rebours.

Les codes du compte a rebours ne sont pas ecrits dans le jeu : seule leur
empreinte l'est (js/compte.js, `COMPTE.codes`). On peut ainsi verifier qu'un
code est le bon sans pouvoir le lire dans le fichier.

Pour CHANGER un code, ou en ajouter un :

    python3 tools/empreinte_code.py MonNouveauCode

puis coller la ligne affichee dans `COMPTE.codes`, a la place de l'ancienne.
La valeur a droite dit ce que fait le code :

    'jouer'    ouvre le jeu avant l'heure
    'apercu'   joue la derniere minute et demie, puis revient au compte a rebours

Un code se lit sans tenir compte des majuscules ni des espaces, et ne garde que
les lettres sans accent et les chiffres : « Mon Code », « moncode » et
« MONCODE » sont le meme.

NE PAS ECRIRE UN VRAI CODE DANS CE DOSSIER — ni ici, ni dans le README, ni dans
une suite de verification. Tout ce qui est dans le dossier est publie avec le
jeu : un code ecrit en clair dans tools/ se lit a l'adresse du site.

AVANT DE PUBLIER, pour s'en assurer :

    python3 tools/empreinte_code.py --verifier

Le script ne connait pas les codes, lui non plus. Il fait donc l'inverse d'une
recherche : il prend chaque mot de chaque fichier du dossier (et chaque paire
de mots voisins, pour un code ecrit en deux morceaux), en calcule l'empreinte,
et regarde si elle est dans la table du jeu. S'il en trouve une, ce mot EST un
code, ecrit en clair — il dit dans quel fichier, sans le repeter.
"""
import hashlib
import os
import re
import sys

SEL = 'bradbitt-compte:'          # le meme que COMPTE.sel dans js/compte.js


def empreinte(code: str) -> str:
    normal = re.sub(r'[^A-Z0-9]', '', code.upper())
    if not normal:
        raise ValueError('un code doit contenir au moins une lettre ou un chiffre')
    return hashlib.sha256((SEL + normal).encode('ascii')).hexdigest()


# Ce qui n'est pas du texte : inutile d'y chercher des mots.
BINAIRES = {'.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.m4a', '.mp3', '.mp4', '.wav',
            '.ogg', '.zip', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.pyc'}


def verifier(racine: str) -> int:
    """Cherche un code ecrit en clair dans tout le dossier du jeu."""
    with open(os.path.join(racine, 'js', 'compte.js'), encoding='utf-8') as f:
        table = set(re.findall(r"'([0-9a-f]{64})'\s*:", f.read()))
    if not table:
        print("erreur : aucune empreinte trouvee dans js/compte.js")
        return 1
    vus, trouves, fichiers = set(), [], 0

    def essayer(mot: str, ou: str) -> None:
        if not mot or len(mot) > 40 or mot in vus:
            return
        vus.add(mot)
        if hashlib.sha256((SEL + mot).encode('ascii')).hexdigest() in table:
            trouves.append('%s (un mot de %d caracteres)' % (ou, len(mot)))

    for dossier, sous, noms in os.walk(racine):
        sous[:] = [d for d in sous if not d.startswith('.')]
        for nom in noms:
            chemin = os.path.join(dossier, nom)
            relatif = os.path.relpath(chemin, racine)
            # Un fichier NOMME comme un code le publie tout autant.
            mots_du_nom = re.findall(r'[A-Z0-9]+', nom.upper())
            for i, m in enumerate(mots_du_nom):
                essayer(m, relatif + ' : son nom')
                essayer(m + (mots_du_nom[i + 1] if i + 1 < len(mots_du_nom) else ''), relatif + ' : son nom')
            if nom.startswith('.') or os.path.splitext(nom)[1].lower() in BINAIRES:
                continue
            with open(chemin, encoding='utf-8', errors='ignore') as f:
                mots = re.findall(r'[A-Z0-9]+', f.read().upper())
            fichiers += 1
            for i, m in enumerate(mots):
                essayer(m, relatif)
                essayer(m + (mots[i + 1] if i + 1 < len(mots) else ''), relatif)

    if trouves:
        print('CODE EN CLAIR — a retirer avant de publier :')
        for t in sorted(set(trouves)):
            print('  - ' + t)
        return 1
    print('aucun code en clair : %d fichiers lus, %d mots et paires de mots essayes contre %d empreintes'
          % (fichiers, len(vus), len(table)))
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    if sys.argv[1] == '--verifier':
        ici = os.path.dirname(os.path.abspath(__file__))
        return verifier(sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(ici))
    for code in sys.argv[1:]:
        try:
            print("    '%s': 'jouer',      // ou 'apercu'" % empreinte(code))
        except ValueError as e:
            print('erreur :', e)
            return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
