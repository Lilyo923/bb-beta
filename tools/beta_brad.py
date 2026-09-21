#!/usr/bin/env python3
"""
Brad Bitt, mais le jeu — la planche du skin « Le Bêta-testeur ».

D'apres l'image de reference fournie : veste rose vif, chemise turquoise au col
ouvert, pantalon turquoise a bande rose sur le cote exterieur, chaussures
noires. Pas de cravate.

Comme pour le skin 3IRL, la planche DERIVE de celle de base plutot que d'etre
redessinee : meme Brad, meme demarche, memes douze images. Seule l'etoffe
change.

LES ZONES, RELEVEES SUR LA PLANCHE (carte ASCII de la cellule 0,0) :

    0 - 22   tete (cheveux, visage) ............ intouchee
   22 - 24   cou .............................. intouche
   24 - 36   torse : veste sur les cotes, chemise et cravate au centre
   36 - 44   jambes : le pantalon
   44 - 48   chaussures ....................... intouchees

Dans le torse, la CHEMISE et la CRAVATE occupent une bande centrale, colonnes
14 a 23. Premier essai avec 11 a 20 : releve a l'oeil et FAUX — le centre du
personnage est a la colonne 19, pas 16. La bande mordait sur la veste a gauche
et laissait un pixel blanc de chemise a droite. Les mains, elles, sont sur les
cotes (colonnes 7-10 et 26-30) : la bande ne les touche pas.

LA CRAVATE N'EST PAS DE LA PEAU. Un rouge vif (200, 30, 40) passait le test
« peau » (rouge nettement plus fort que le bleu) : la cravate etait donc
protegee comme un visage, et restait rouge au milieu de la chemise turquoise.
Ce qui separe les deux, c'est le vert : la peau, meme dans l'ombre, en garde
plus de 95 ; la cravate, moins de 90.

LES BORDS NE SONT PAS RECOLORES. Un pixel de veste qui touche le vide est un
pixel d'anticrenelage du contour : le peindre en rose poserait un halo rose
AUTOUR du trait noir, au lieu de la veste a l'interieur.

Usage : python3 beta_brad.py <planche_base.png> <sortie.png>
"""
import sys
import numpy as np
from PIL import Image

HAUTEUR_CELLULE = 48
LARGEUR_CELLULE = 36

Y_TORSE = (24, 36)
Y_JAMBES = (36, 44)
X_CHEMISE = (14, 24)
Y_COL_OUVERT = (24, 26)      # les deux premieres rangees de la cravate : le col
Y_OUVERTURE = (24, 36)       # du col a la ceinture, comme sur l'image

# Les couleurs, relevees sur l'image de reference puis assombries d'un cran :
# a 36 x 48, un rose a pleine saturation « bave » sur tout le personnage.
ROSE_CLAIR = (246, 54, 142)
ROSE_SOMBRE = (150, 16, 84)
TURQUOISE_CLAIR = (34, 204, 224)
TURQUOISE_SOMBRE = (6, 124, 152)
TURQUOISE_OMBRE = (6, 78, 98)       # la jambe du fond, dans l'ombre
PEAU_COL = (238, 184, 138)   # le V du col ouvert : la peau de Brad elle-meme


def rampe(valeurs, sombre, clair, bas, haut):
    t = ((valeurs - bas) / max(1, (haut - bas))).clip(0.0, 1.0)
    return [np.uint8(sombre[c] + (clair[c] - sombre[c]) * t) for c in range(3)]


def peindre(out, masque, canaux):
    for c in range(3):
        out[..., c][masque] = canaux[c] if np.ndim(canaux[c]) else canaux[c]


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
    lignes = np.broadcast_to(lignes, (h, w))
    colonnes = np.broadcast_to(colonnes, (h, w))
    dans_y = lambda bande: (lignes >= bande[0]) & (lignes < bande[1])
    dans_x = lambda bande: (colonnes >= bande[0]) & (colonnes < bande[1])

    # Un pixel « de bord » a au moins un voisin transparent (4-connexite).
    vide = ~visible
    bord = np.zeros_like(visible)
    bord[1:, :] |= vide[:-1, :]
    bord[:-1, :] |= vide[1:, :]
    bord[:, 1:] |= vide[:, :-1]
    bord[:, :-1] |= vide[:, 1:]
    interieur = visible & ~bord

    rouge = visible & (r > 100) & (g < 90) & (r > g + 60)      # la cravate
    # La peau garde nettement plus de vert que de bleu (g - b > 20), meme dans
    # l'ombre. Les REFLETS de la cravate — un rose clair ou vert et bleu sont a
    # egalite — passaient sans ce critere pour de la peau, et restaient en ligne
    # rose au milieu du gilet turquoise. Deuxieme essai, meme lecon que le
    # premier : c'est une propriete de la couleur qui separe les deux, pas un
    # seuil plus serre.
    peau = (visible & (r > 150) & (r > b + 40) & (g > 95) & (g - b > 20)
            & ~((r > 245) & (g > 245) & (b > 245)))
    etoffe_sombre = interieur & (lum >= 30) & (lum < 62)       # le costume noir
    clair = visible & (lum >= 62) & ~peau & ~rouge              # chemise et reflets

    torse = dans_y(Y_TORSE)
    centre = dans_x(X_CHEMISE)

    # --- L'OUVERTURE DE LA VESTE : tout le centre du torse, du col jusqu'au
    #     bas de la cravate. Premier essai : seuls le blanc et le rouge VIF y
    #     etaient repeints, et les pixels rouge SOMBRE de la cravate, trop
    #     sombres pour passer le seuil, tombaient dans la regle de la veste —
    #     d'ou une ligne rose au milieu de la chemise, comme une cravate rose.
    #     La zone est donc prise en entier : tout ce qui n'y est ni peau ni
    #     contour devient chemise.
    ouverture = torse & centre & dans_y(Y_OUVERTURE) & visible & ~peau & ((lum >= 30) | rouge)
    cravate = ouverture & rouge
    col = cravate & dans_y(Y_COL_OUVERT)
    chemise = ouverture & ~cravate
    # Deux rampes : le blanc de la chemise d'origine donne le turquoise clair,
    # l'etoffe noire du bas du torse (ou la veste se fermait) donne le meme
    # turquoise, un cran plus sombre — comme le gilet de l'image.
    chemise_claire = chemise & clair
    chemise_etoffe = chemise & ~clair
    if chemise_claire.any():
        peindre(out, chemise_claire,
                rampe(lum[chemise_claire], TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 62, 250))
    if chemise_etoffe.any():
        peindre(out, chemise_etoffe,
                rampe(lum[chemise_etoffe], TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 28, 70))
    # La cravate, sous le col, devient la patte de boutonnage : un ton plus
    # sombre que la chemise, comme la rangee de boutons de l'image.
    patte = cravate & ~col
    if patte.any():
        peindre(out, patte, TURQUOISE_SOMBRE)
    if col.any():
        peindre(out, col, PEAU_COL)

    # --- LA VESTE : l'etoffe sombre du torse, hors de TOUTE l'ouverture.
    #     Premiere ecriture : « hors chemise ». Or la cravate n'est pas la
    #     chemise : ses pixels sombres, deja repeints en turquoise, etaient
    #     repeints une seconde fois ici, en rose. Quatre-vingt-un pixels —
    #     comptes, pas estimes — faisaient une cravate rose au milieu du gilet.
    veste = torse & etoffe_sombre & ~ouverture
    if veste.any():
        peindre(out, veste, rampe(lum[veste], ROSE_SOMBRE, ROSE_CLAIR, 28, 58))

    # --- LES REVERS DE MANCHE : sur l'image, un liseré turquoise juste au-dessus
    #     de la main. C'est le pixel de veste DIRECTEMENT au-dessus d'un pixel de
    #     peau, sur les cotes. Ça suit la main, quelle que soit la pose.
    au_dessus_peau = np.zeros_like(visible)
    au_dessus_peau[:-1, :] = peau[1:, :]
    manchette = veste & au_dessus_peau & ~centre
    if manchette.any():
        peindre(out, manchette, TURQUOISE_CLAIR)

    # --- LE PANTALON : turquoise, avec une bande rose sur le cote EXTERIEUR de
    #     chaque jambe — le pixel le plus a gauche et le plus a droite du
    #     pantalon, rangee par rangee, cellule par cellule. Les bords interieurs
    #     restent turquoise, comme sur l'image.
    jambes = dans_y(Y_JAMBES) & etoffe_sombre
    # La jambe du FOND est dessinee presque noire sur la planche d'origine
    # (luminance 12 a 29) : c'est l'ombre, pas le contour. Laissee telle quelle,
    # elle faisait un pantalon a une jambe turquoise et une jambe noire. Elle
    # devient un turquoise d'ombre ; le vrai contour, qui touche le vide, reste
    # noir.
    ombre = dans_y(Y_JAMBES) & interieur & (lum >= 12) & (lum < 30)
    if ombre.any():
        peindre(out, ombre, TURQUOISE_OMBRE)
    if jambes.any():
        peindre(out, jambes, rampe(lum[jambes], TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 28, 58))
        bande = np.zeros_like(visible)
        for y in range(h):
            if not (Y_JAMBES[0] <= y % HAUTEUR_CELLULE < Y_JAMBES[1]):
                continue
            for x0 in range(0, w, LARGEUR_CELLULE):
                xs = np.nonzero(jambes[y, x0:x0 + LARGEUR_CELLULE])[0]
                if len(xs) < 4:
                    continue
                bande[y, x0 + xs[0]] = True
                bande[y, x0 + xs[-1]] = True
        peindre(out, bande, ROSE_CLAIR)

    Image.fromarray(out).save(sys.argv[2])
    print("planche ecrite :", sys.argv[2])
    return 0


if __name__ == "__main__":
    sys.exit(main())
