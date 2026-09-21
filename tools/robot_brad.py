#!/usr/bin/env python3
"""
Brad Bitt, mais le jeu — la planche du skin 3IRL (Brad robot).

Elle derive de la planche de base plutot que d'etre redessinee : c'est le meme
Brad, dans le meme costume, avec la meme demarche. Ce qui change, c'est la
matiere — une peau de graphite mat au lieu d'une peau, une coiffure sculptee au
lieu de cheveux, et des articulations qui se voient aux epaules et aux coudes.

POURQUOI PAR BANDES ET NON PAR COULEUR

La planche fait 4 colonnes x 3 lignes de cellules de 36 x 48. Un masque par
couleur seule ne suffit pas : le beige des cheveux et le beige de la main sont
voisins, et le gris du costume est le meme que celui du contour. On travaille
donc par BANDE DE HAUTEUR dans chaque cellule, comme pour la planche de
Kirby 67 :

    0 - 11   cheveux
   11 - 22   visage
   22 - 36   torse et bras
   36 - 44   jambes
   44 - 48   chaussures

et a l'interieur d'une bande on distingue par la teinte. C'est ce qui evite que
l'or du costume parte dans la coiffure — la faute exacte qu'on venait de
corriger sur l'uniforme dore.

Usage : python3 robot_brad.py <planche_base.png> <sortie.png>
"""
import sys
import numpy as np
from PIL import Image

HAUTEUR_CELLULE = 48
LARGEUR_CELLULE = 36

# Les bandes ont ete relevees SUR LA PLANCHE, pas estimees. Premier essai avec
# des cheveux jusqu'a la rangee 12 : la regle des cheveux mordait sur le haut du
# visage, et les deux masques se disputaient les memes pixels. Le visage occupe
# en realite les rangees 8 a 23, la chevelure s'arrete a 8.
Y_CHEVEUX = (0, 8)
Y_VISAGE = (8, 23)
Y_TORSE = (23, 36)

# Les yeux, releves eux aussi : deux petits amas sombres aux colonnes 16-24,
# rangees 14 a 18. Le premier masque prenait « tout pixel sombre du visage »,
# donc AUSSI le trait qui cerne la tete — d'ou deux coulees cyan le long des
# joues au lieu de deux yeux.
Y_YEUX = (14, 18)
X_YEUX = (15, 25)

# Les articulations : deux rangees seulement, sur les colonnes exterieures,
# la ou passent les bras. Le premier essai barrait tout le torse.
# Deuxieme reglage : sept colonnes de large, les « articulations » barraient
# le torse d'un trait blanc d'un bord a l'autre. Quatre colonnes et une teinte
# plus sourde suffisent — on veut une jointure, pas un bandage.
RANGEES_JOINTS = (25, 31)
X_BRAS_GAUCHE = (5, 9)
X_BRAS_DROIT = (26, 30)

# La matiere du robot. Graphite froid, pas noir : un noir pur sur fond sombre
# effacerait la silhouette.
GRAPHITE_CLAIR = (126, 132, 146)     # ce qui prend la lumiere
GRAPHITE_SOMBRE = (44, 48, 58)       # ce qui est dans l'ombre
CASQUE_CLAIR = (78, 84, 98)          # la coiffure, sculptee d'un bloc
CASQUE_SOMBRE = (26, 29, 37)
OEIL = (150, 232, 255)               # la seule couleur vive du personnage
JOINT = (116, 126, 146)              # les articulations apparentes


def rampe(valeurs, sombre, clair, bas, haut):
    """Repartit une plage de luminance entre deux couleurs."""
    t = ((valeurs - bas) / max(1, (haut - bas))).clip(0.0, 1.0)
    return [np.uint8(sombre[c] + (clair[c] - sombre[c]) * t) for c in range(3)]


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    arr = np.array(Image.open(sys.argv[1]).convert("RGBA"))
    out = arr.copy()
    h, w = arr.shape[:2]

    r = arr[..., 0].astype(int)
    g = arr[..., 1].astype(int)
    b = arr[..., 2].astype(int)
    a = arr[..., 3]
    visible = a > 0
    lum = (r + g + b) / 3

    lignes = np.arange(h)[:, None] % HAUTEUR_CELLULE
    colonnes = np.arange(w)[None, :] % LARGEUR_CELLULE

    dans = lambda bande: (lignes >= bande[0]) & (lignes < bande[1])

    # --- La peau : tout ce qui est clair et chaud, dans le visage et les mains.
    #     r > b nettement, et pas blanc pur (la chemise).
    peau = visible & (r > 150) & (r > b + 40) & ~((r > 245) & (g > 245) & (b > 245))
    if peau.any():
        canaux = rampe(lum[peau], GRAPHITE_SOMBRE, GRAPHITE_CLAIR, 120, 235)
        for c in range(3):
            out[..., c][peau] = canaux[c]

    # --- Les cheveux : meme famille de teinte, mais dans la bande du haut. On
    #     les traite APRES la peau pour qu'ils l'emportent sur elle.
    cheveux = visible & dans(Y_CHEVEUX) & (r > 120) & (r > b + 30)
    if cheveux.any():
        canaux = rampe(lum[cheveux], CASQUE_SOMBRE, CASQUE_CLAIR, 100, 210)
        for c in range(3):
            out[..., c][cheveux] = canaux[c]

    # --- Les yeux : deux amas, a un endroit precis, et nulle part ailleurs.
    yeux = (visible & (lignes >= Y_YEUX[0]) & (lignes < Y_YEUX[1])
            & (colonnes >= X_YEUX[0]) & (colonnes < X_YEUX[1]) & (lum < 70))
    if yeux.any():
        for c in range(3):
            out[..., c][yeux] = OEIL[c]

    # --- Les articulations : deux rangees claires sur les bras, et seulement
    #     sur des pixels DEJA sombres — donc sur le costume, jamais dans le vide.
    costume = visible & (lignes >= Y_TORSE[0]) & (lignes < Y_TORSE[1]) \
              & (lum >= 14) & (lum <= 74)
    bras = costume & (((colonnes >= X_BRAS_GAUCHE[0]) & (colonnes < X_BRAS_GAUCHE[1]))
                      | ((colonnes >= X_BRAS_DROIT[0]) & (colonnes < X_BRAS_DROIT[1])))
    for y in RANGEES_JOINTS:
        cible = bras & (lignes == y)
        if cible.any():
            for c in range(3):
                out[..., c][cible] = JOINT[c]

    Image.fromarray(out, "RGBA").save(sys.argv[2])
    print(sys.argv[2])
    return 0


if __name__ == "__main__":
    sys.exit(main())
