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
14 a 23. Les mains, elles, sont sur les cotes : la bande ne les touche pas.

LA CRAVATE N'EST PAS DE LA PEAU. Un rouge vif passait le test « peau » ; ce qui
separe les deux, c'est le vert : la peau, meme dans l'ombre, en garde plus de
95 ; la cravate, moins de 90.

--------------------------------------------------------------------------------
LES TACHES NOIRES (prototype 26)

Le costume d'origine est NOIR, et il est dessine avec trois valeurs :

    luminance 30 a 62 ..... l'etoffe
    luminance 12 a 30 ..... l'OMBRE de l'etoffe : plis, creux du bras, jambe du
                            fond, et le contour
    luminance  0 a 12 ..... les TRAITS du dessin : la ligne entre le bras et le
                            torse, le dessous de la main

Sur du noir, l'ombre et les traits ne se voient presque pas : c'est du sombre
sur du sombre. La premiere version de ce script ne repeignait que l'etoffe —
et laissait l'ombre et les traits tels quels. Sur une veste rose et un gilet
turquoise, ils sont devenus des TACHES NOIRES : deux equerres au milieu du
gilet, un pate a l'entrejambe, un bloc dans le pli du bras quand Brad court.
Quant a la jambe du fond, peinte d'un turquoise d'ombre presque bleu nuit
(6, 78, 98), elle se lisait comme une grande tache sombre a chaque pas.

La regle, maintenant : UNE OMBRE A LA COULEUR DE CE QU'ELLE OMBRE. Un pixel
sombre a l'INTERIEUR du personnage devient un ton fonce de l'etoffe qui
l'entoure — rose fonce dans la veste, turquoise fonce dans le gilet et le
pantalon. Les traits du dessin restent des traits, un cran plus sombres encore,
mais colores.

Ce qui reste noir, et doit le rester :
  - le CONTOUR : tout pixel sombre a deux pixels ou moins du vide. C'est le
    trait noir qui cerne la silhouette, comme sur l'image de reference ;
  - les chaussures.

« A quelle etoffe appartient cette ombre ? » ne se lit pas sur le pixel : il
est noir. On le demande a ses VOISINS, de proche en proche, en partant de
l'etoffe deja peinte — la veste d'abord, pour qu'un trait pose a la frontiere
(le bord du revers) prenne le rose de la veste et non le turquoise du gilet.

Le script se termine par un COMPTE : le nombre de pixels quasi noirs restes a
l'interieur du corps, cellule par cellule. Il doit etre nul. Une tache noire
ne se cherche plus a l'oeil.

Aucune dependance hors Pillow : la premiere version demandait numpy.

Usage : python3 beta_brad.py <planche_base.png> <sortie.png>
"""
import sys
from collections import deque
from PIL import Image

HAUTEUR_CELLULE = 48
LARGEUR_CELLULE = 36

Y_TORSE = (24, 36)
Y_JAMBES = (36, 44)
X_CHEMISE = (14, 24)
Y_COL_OUVERT = (24, 26)      # les deux premieres rangees de la cravate : le col

SEUIL_ETOFFE = 30            # en dessous : ombre ou trait
SEUIL_TRAIT = 12             # en dessous : un trait du dessin
SEUIL_CLAIR = 62             # au-dessus : la chemise blanche et ses reflets
PROFONDEUR_CONTOUR = 2       # un pixel sombre a cette distance du vide reste noir

# Les couleurs, relevees sur l'image de reference puis assombries d'un cran :
# a 36 x 48, un rose a pleine saturation « bave » sur tout le personnage.
ROSE_CLAIR = (246, 54, 142)
ROSE_SOMBRE = (150, 16, 84)
ROSE_OMBRE = (118, 12, 68)          # l'ombre de la veste
ROSE_TRAIT = (84, 6, 46)            # un trait dans la veste
TURQUOISE_CLAIR = (34, 204, 224)
TURQUOISE_SOMBRE = (6, 124, 152)
TURQUOISE_OMBRE = (5, 98, 124)      # l'ombre du gilet et du pantalon
TURQUOISE_TRAIT = (3, 66, 86)       # un trait dans le gilet ou le pantalon
PEAU_COL = (238, 184, 138)          # le V du col ouvert : la peau de Brad

VESTE, GILET, PANTALON = 1, 2, 3


def rampe(valeur, sombre, clair, bas, haut):
    t = max(0.0, min(1.0, (valeur - bas) / max(1, haut - bas)))
    return tuple(int(sombre[c] + (clair[c] - sombre[c]) * t) for c in range(3))


def ton_sombre(lum, etoffe):
    """La couleur d'un pixel d'ombre ou de trait, selon l'etoffe qui l'entoure."""
    rose = etoffe == VESTE
    if lum < SEUIL_TRAIT:
        return ROSE_TRAIT if rose else TURQUOISE_TRAIT
    return ROSE_OMBRE if rose else TURQUOISE_OMBRE


def repeindre(src):
    """Rend la planche repeinte, et la carte des etoffes (pour le compte final)."""
    w, h = src.size
    px = src.load()
    out = src.copy()
    po = out.load()

    visible = [[px[x, y][3] > 0 for x in range(w)] for y in range(h)]
    lum = [[sum(px[x, y][:3]) / 3 for x in range(w)] for y in range(h)]

    def ligne(y): return y % HAUTEUR_CELLULE
    def colonne(x): return x % LARGEUR_CELLULE
    def dans(v, bande): return bande[0] <= v < bande[1]

    def est_peau(x, y):
        r, g, b, _ = px[x, y]
        return (visible[y][x] and r > 150 and r > b + 40 and g > 95 and g - b > 20
                and not (r > 245 and g > 245 and b > 245))

    def est_rouge(x, y):
        r, g, b, _ = px[x, y]
        return visible[y][x] and r > 100 and g < 90 and r > g + 60

    # --- Distance au vide (de Manhattan), par inondation depuis le vide. Le
    #     bord d'une cellule vaut du vide lui aussi (voir plus bas) : un pixel
    #     colle au bord de sa case est sur le contour, meme si la case voisine
    #     de la planche se trouve etre pleine a cet endroit.
    INFINI = 10 ** 6
    dist = [[0 if not visible[y][x] else INFINI for x in range(w)] for y in range(h)]
    file = deque((x, y) for y in range(h) for x in range(w) if not visible[y][x])
    while file:
        x, y = file.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h):
                continue
            if dist[ny][nx] > dist[y][x] + 1:
                dist[ny][nx] = dist[y][x] + 1
                file.append((nx, ny))
    # Le bord de la planche compte comme du vide.
    for y in range(h):
        for x in range(w):
            bord = min(colonne(x) + 1, LARGEUR_CELLULE - colonne(x),
                       ligne(y) + 1, HAUTEUR_CELLULE - ligne(y))
            dist[y][x] = min(dist[y][x], bord)

    etoffe = [[0] * w for _ in range(h)]          # VESTE, GILET, PANTALON, ou 0
    ombres = []                                   # pixels sombres interieurs, a attribuer

    for y in range(h):
        ly = ligne(y)
        torse, jambes = dans(ly, Y_TORSE), dans(ly, Y_JAMBES)
        if not (torse or jambes):
            continue
        for x in range(w):
            if not visible[y][x] or est_peau(x, y):
                continue
            l = lum[y][x]
            rouge = est_rouge(x, y)
            centre = dans(colonne(x), X_CHEMISE)
            interieur = dist[y][x] >= 2            # ne touche pas le vide

            if l < SEUIL_ETOFFE and not rouge:
                # Ombre ou trait. Pres du vide : c'est le contour, il reste noir.
                if dist[y][x] > PROFONDEUR_CONTOUR:
                    ombres.append((x, y))
                continue

            if torse and centre:
                # L'OUVERTURE DE LA VESTE : tout le centre du torse devient la
                # chemise et le gilet, du col jusqu'a la ceinture.
                etoffe[y][x] = GILET
                if rouge:
                    # La cravate : le col ouvert en haut, la patte de
                    # boutonnage en dessous.
                    po[x, y] = (PEAU_COL if dans(ly, Y_COL_OUVERT) else TURQUOISE_SOMBRE) + (255,)
                elif l >= SEUIL_CLAIR:
                    po[x, y] = rampe(l, TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 62, 250) + (255,)
                else:
                    po[x, y] = rampe(l, TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 28, 70) + (255,)
            elif torse and l < SEUIL_CLAIR and interieur:
                # LA VESTE. Les pixels de bord ne sont pas repeints : ce sont
                # ceux du contour, et les peindre poserait un halo rose AUTOUR
                # du trait noir au lieu de la veste a l'interieur.
                etoffe[y][x] = VESTE
                po[x, y] = rampe(l, ROSE_SOMBRE, ROSE_CLAIR, 28, 58) + (255,)
            elif jambes and l < SEUIL_CLAIR and interieur:
                etoffe[y][x] = PANTALON
                po[x, y] = rampe(l, TURQUOISE_SOMBRE, TURQUOISE_CLAIR, 28, 58) + (255,)

    # --- LES OMBRES : chacune prend l'etoffe de ses voisins, de proche en
    #     proche. La veste passe en premier a chaque tour.
    en_attente = set(ombres)
    for (x, y) in list(en_attente):
        if dans(ligne(y), Y_JAMBES):               # sous la ceinture, tout est pantalon
            etoffe[y][x] = PANTALON
            en_attente.discard((x, y))
    while en_attente:
        gagnes = {}
        for priorite in (VESTE, GILET, PANTALON):
            for (x, y) in en_attente:
                if (x, y) in gagnes:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and etoffe[ny][nx] == priorite:
                        gagnes[(x, y)] = VESTE if priorite == VESTE else GILET
                        break
        if not gagnes:
            # Un ilot sans voisin peint : il est dans la veste, par defaut.
            for (x, y) in en_attente:
                etoffe[y][x] = VESTE
            break
        for (x, y), e in gagnes.items():
            etoffe[y][x] = e
            en_attente.discard((x, y))
    for (x, y) in ombres:
        po[x, y] = ton_sombre(lum[y][x], etoffe[y][x]) + (255,)

    # --- LES REVERS DE MANCHE : un lisere turquoise juste au-dessus de la main.
    #     C'est le pixel de veste DIRECTEMENT au-dessus d'un pixel de peau, sur
    #     les cotes. Ça suit la main, quelle que soit la pose.
    for y in range(h - 1):
        if not dans(ligne(y), Y_TORSE):
            continue
        for x in range(w):
            if (etoffe[y][x] == VESTE and lum[y][x] >= SEUIL_ETOFFE
                    and not dans(colonne(x), X_CHEMISE) and est_peau(x, y + 1)):
                po[x, y] = TURQUOISE_CLAIR + (255,)

    # --- LA BANDE ROSE DU PANTALON : sur le cote EXTERIEUR de chaque jambe —
    #     le pixel de pantalon le plus a gauche et le plus a droite, rangee par
    #     rangee, cellule par cellule. Elle se calcule sur TOUT le pantalon,
    #     ombre comprise : avant, la jambe du fond n'etait pas du « pantalon »,
    #     et la bande se posait au milieu, a la frontiere des deux jambes.
    #     Sur une jambe dans l'ombre, la bande est dans l'ombre aussi.
    for y in range(h):
        if not dans(ligne(y), Y_JAMBES):
            continue
        for x0 in range(0, w, LARGEUR_CELLULE):
            xs = [x for x in range(x0, x0 + LARGEUR_CELLULE) if etoffe[y][x] == PANTALON]
            if len(xs) < 4:
                continue
            for x in (xs[0], xs[-1]):
                po[x, y] = (ROSE_OMBRE if lum[y][x] < SEUIL_ETOFFE else ROSE_CLAIR) + (255,)

    return out, dist


def compter_taches(planche, dist):
    """Pixels quasi noirs restes A L'INTERIEUR du corps, par cellule."""
    px = planche.load()
    w, h = planche.size
    compte = {}
    for y in range(h):
        ly = y % HAUTEUR_CELLULE
        if not (Y_TORSE[0] <= ly < Y_JAMBES[1]):
            continue
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0 or dist[y][x] <= PROFONDEUR_CONTOUR:
                continue
            # « Quasi noir » : sombre ET sans couleur. Un rose fonce ou un
            # turquoise fonce ne sont pas des taches noires.
            if (r + g + b) / 3 < SEUIL_ETOFFE and max(r, g, b) - min(r, g, b) < 24:
                cle = (x // LARGEUR_CELLULE, y // HAUTEUR_CELLULE)
                compte[cle] = compte.get(cle, 0) + 1
    return compte


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 1
    base = Image.open(sys.argv[1]).convert("RGBA")
    planche, dist = repeindre(base)
    planche.save(sys.argv[2])
    print("planche ecrite :", sys.argv[2])

    taches = compter_taches(planche, dist)
    total = sum(taches.values())
    print("pixels quasi noirs a l'interieur du corps :", total)
    for (c, r), n in sorted(taches.items()):
        print("   cellule colonne %d, ligne %d : %d" % (c, r, n))
    return 0 if total == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
