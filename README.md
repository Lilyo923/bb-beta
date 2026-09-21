# Brad Bitt, mais le jeu — prototype 22

Le niveau d'introduction devient un vrai parcours, avec tout ce qui l'entoure :
écran d'accueil, animation des studios, menu jouable, musique, sauvegarde et
ligne d'arrivée.

## Lancer

Double-clique `index.html`. Aucune dépendance, aucun serveur nécessaire.
Déployable tel quel sur Netlify (racine du dépôt, pas de commande de build).

## Commandes

| Action | Touches |
|---|---|
| Déplacement | ← → · A D · Q D |
| Saut | Espace · ↑ · W · Z — **maintenir = plus haut** |
| Courir | Maj |
| Frapper / lancer la boule | X · J |
| Onde de choc (Brad-Shy plein) | C · K |
| Menus | ↑ ↓ pour choisir, ← → pour régler, Entrée, Échap |
| Retour au début du niveau | R |
| Panneau de développement | F1 |

AZERTY et QWERTY sont pris en charge sans configuration. Sur mobile, les
boutons tactiles n'apparaissent que pendant le jeu.

---

## Ce qui est nouveau

### Démarrage

`Jouer` → animation des deux logos → barre de chargement → menu.

Le bouton n'est pas décoratif : **les navigateurs interdisent toute lecture
audio tant que l'utilisateur n'a pas interagi avec la page**. C'est ce clic qui
autorise le son pour le reste de la session.

Le menu s'ouvre au plus tard des deux : la fin de l'animation des logos, ou la
fin du chargement **plus 3 secondes de marge**. Un chargement rapide ne coupe
donc pas l'animation, et un chargement lent ne saute rien.

### Menu

Nouvelle partie · Continuer (grisé sans sauvegarde) · Options · Crédits.

Le fond n'est pas une image : **Brad y joue tout seul**. Des Serra entrent par
les côtés, il va les écraser, grimpe sur les plateformes, et quand le calme
revient il flâne puis sort son téléphone. La simulation est complètement
séparée de celle du niveau.

Les options couvrent le volume de la musique, celui des effets, la difficulté
(Touriste / Connaisseur / Salé) et l'effacement de la sauvegarde. Les crédits
sont volontairement une page d'attente.

### Son

- La **musique** passe par un élément `<audio>` : une piste de 2 min 20 et
  2,3 Mo se diffuse, elle n'a rien à faire dans la mémoire du contexte audio.
- Les **effets** sont synthétisés à la volée en Web Audio — pas un seul fichier
  à télécharger. Ce sont des placeholders assumés : quand tu auras tes vrais
  sons, il suffira de remplacer le corps de `bruit()` dans `js/audio.js`.

Un bouton **Commencer** précède chaque niveau, comme demandé.

### Sauvegarde

`localStorage`, écrite à la fin d'un niveau : Brad Coins, PV max, difficulté,
temps joué. La structure prévoit déjà les champs de la Roadmap pour que le hub
et la boutique n'aient rien à casser.

### Le niveau

Presque deux fois plus long (256 tuiles jusqu'à la porte), en **deux zones de
décor** : « Zone de largage » à l'extérieur, puis « Complexe — niveau -2 ».

Le passage de l'une à l'autre déclenche un fondu au noir et un effet sonore
**sans recharger la page ni changer de fichier** — c'est le mécanisme que
décrivent tes notes (« le niveau 1 où Brad va dans une grotte, c'est toujours
le niveau 1 »). La géométrie reste continue ; seule la palette bascule pendant
que l'écran est masqué. Ajouter une zone tient en une entrée dans `ZONES`.

Le niveau se termine par une **porte** dans laquelle Brad entre en marchant :
aucune touche à deviner. Il finit d'y entrer tout seul, puis le bilan
s'affiche (temps, ennemis, Brad Coins, prime de +5 BC).

---

## Les trois bugs signalés

### Les volants quittaient la map

Deux causes, deux correctifs.

**Rien ne les arrêtait.** Un ennemi terrestre est borné par les murs et les
bords de plateforme ; un volant, en plein ciel, n'a aucune de ces limites.
Chaque ennemi porte maintenant un **rayon de patrouille** autour de son point
de départ, et le volant est en plus tenu par une laisse appliquée *après* tous
ses déplacements — poursuite comprise. Il peut déborder un peu de sa zone,
jamais la quitter.

**Ils patrouillaient depuis le chargement.** Les 27 ennemis du niveau se
mettaient en marche dès la première image : au moment où le joueur arrivait,
ils étaient ailleurs. Un ennemi reste désormais **figé à son point de départ**
tant que Brad n'est pas à portée (460 px par défaut, réglable), et se rendort
quand il s'éloigne. Les volants regagnent alors tranquillement leur position :
revenir sur ses pas les retrouve là où on les avait laissés.

*Vérifié : après 25 s d'inactivité, dérive maximale de 88 px, aucun ennemi hors
de sa zone. Un volant lancé en poursuite s'écarte de 64 px puis revient à 6 px
de son ancre.*

### Le blocage sur le Serra-Lourd

Brad **se tient maintenant sur sa tête**. L'ancienne version le faisait
rebondir : coincé entre le Lourd et une marche d'escalier, il retombait dessus
et rebondissait sans fin. Faire du Lourd un sol solide supprime la boucle et
retourne le problème en outil — il devient une marche mobile.

Les ennemis terrestres tolèrent aussi maintenant **un décrochement d'une
tuile** : une marche se descend au lieu d'être traitée comme un précipice. Le
Lourd peut donc suivre un escalier. Son rayon de patrouille le garde malgré
tout à distance du haut des marches, là où le combat était le plus pénible.

*Vérifié : 0 rebond, 0 dégât, contact exact, et le saut depuis sa tête atteint
bien 70 px.*

### Les textes qui se superposaient

Deux traitements complémentaires : les gains identiques **se cumulent**
(« +2 BC » plutôt que deux « +1 BC » l'un sur l'autre), et les libellés
différents **s'empilent** en remontant. Un contour sombre a été ajouté pour que
le texte reste lisible sur n'importe quel décor.

---

## Structure

```
index.html
style.css
js/reglages.js      valeurs ajustables + persistance
js/audio.js         musique et effets synthétisés
js/monde.js         constantes, chargement, données du niveau, zones
js/sauvegarde.js    localStorage, difficultés
js/acteurs.js       Brad, ennemis, boules, ramassages, effets, porte
js/menu.js          démarrage, scène de fond, menu, options, crédits
js/entrees.js       clavier, souris, tactile — aiguillés par la scène
js/jeu.js           caméra, transitions, rendu, boucle
assets/brad/        planche de Brad (4×3)
assets/ennemis/     sprites extraits des JPG
assets/ui/          logos des studios, détourés
assets/audio/       musique du niveau d'introduction
tools/              scripts d'extraction
```

**Scripts classiques, pas de modules ES, aucun `fetch()`** : la page reste
ouvrable par double-clic. L'ordre des balises `<script>` compte.

Une seule variable, `scene`, pilote tout : la boucle sait quoi simuler, le
rendu sait quoi dessiner, les entrées savent qui écouter.

### Les deux encodages de la musique

`intro.m4a` est ton fichier d'origine ; `intro.mp3` en est une conversion.

Elle n'est pas décorative : **tous les navigateurs ne savent pas lire l'AAC**.
Les compilations libres de Chromium — plusieurs distributions Linux, et les
navigateurs livrés sans codecs propriétaires — le refusent, et le jeu serait
alors silencieux sans qu'on comprenne pourquoi. Le navigateur de test utilisé
ici est justement dans ce cas, ce qui a permis de s'en rendre compte.

Le jeu choisit au démarrage le premier format qu'il déclare savoir lire.

Le MP3 est transcodé depuis l'AAC, donc **légèrement dégradé** — deux
compressions successives. Pour la version finale, mieux vaut réexporter le MP3
depuis ton master d'origine plutôt que depuis le .m4a.

---

## Ce qui n'est pas encore là

Le hub façon Splatoon, la phase de dialogue d'introduction, la boutique, le
BRADDY3000, les uniformes, les mini-jeux, les Brad Coins secrets.

### À propos des uniformes

Ils ne sont pas branchables tels quels, pour une raison de format : chacun est
**une seule pose statique de face**, alors que le jeu utilise une planche de
12 images (repos ×4, marche ×4, course ×4).

Deux familles se dégagent :

- **Recolorations pures** — `classique`, `classique-bleu/orange/vert/violet`,
  `cravate-jaune`, `doré`. Même silhouette, seules les couleurs changent. Un
  échange de palette appliqué à la planche existante suffit : aucune image
  supplémentaire à produire.
- **Silhouettes différentes** — `t-shirt`, `pecheur`, `funky`, `exclu-beta`.
  Manches courtes, ciré à capuche, col ouvert, pantalon distinct. Ceux-là
  demandent une vraie planche de 12 images chacun.

À voir quand on y arrivera : c'est une décision de production, pas un blocage
technique.

---

## Corrections du prototype 06

### La chemise transparente de Brad

Le trou est dans la planche d'origine : entre les revers de la veste, les pixels
de la chemise ont un alpha nul, et le décor se voyait à travers le torse.

Le rebouchage se fait maintenant à l'extraction, et il distingue un **trou**
d'un **creux** par connexité : le fond extérieur touche forcément le bord de la
vignette, donc une zone transparente qui ne le touche pas est un trou à
remplir. L'échancrure entre les jambes, elle, débouche sur le bas de l'image :
elle reste intacte. Les douze images sont corrigées d'un coup, sans retouche
manuelle — si tu réexportes la planche un jour, relance simplement le script.

### Le décor qui sautait

Les tours étaient numérotées **à partir du bord gauche de l'écran**. À chaque
fois que le motif bouclait, toute la rangée se décalait d'un cran et les tours
changeaient de hauteur d'un coup — d'où le sursaut.

Elles sont désormais indexées sur une position **absolue dans le monde** : une
tour donnée garde sa hauteur du début à la fin du niveau. Vérifié en balayant
toute la largeur jouable : aucune incohérence, aucun saut.

### La frappe qui partait toujours à droite

La zone de dégâts a toujours été du bon côté — c'est l'image qui mentait.
`ctx.arc(…, -0.9, 0.9)` dessine invariablement le côté droit d'un cercle, donc
l'arc blanc partait à droite même quand Brad frappait à gauche. L'arc est
maintenant miroité selon son regard.

### Les options

- **Les volumes ne pouvaient plus descendre** parce qu'un pointeur immobile
  posé sur une autre ligne volait la sélection au clavier : les flèches
  réglaient la mauvaise valeur. Le survol ne prend la main que si la souris a
  réellement bougé.
- **Les jauges se manipulent directement** : cliquer à gauche baisse, cliquer à
  droite monte, et on peut glisser. Avant, tout clic incrémentait — impossible
  de baisser à la souris.
- **Les flèches ‹ › de difficulté** sont deux vrais boutons, chacun avec sa
  zone exactement sous le caractère. Avant, une seule zone couvrait la ligne et
  se trouvait décalée de 16 px vers le bas : cliquer sur « ‹ » avançait quand
  même d'un cran.
- **Bouton « Rétablir les réglages par défaut »** ajouté.

### La musique

Elle ne boucle plus bord à bord. À la fin du morceau, **10 à 15 secondes de
silence**, puis une reprise en fondu de 3,5 s. C'est ce qui évite d'entendre la
couture d'une piste qui n'a pas été composée pour tourner en rond.

### Le sas entre les deux zones

Le décor changeait sans qu'aucun élément ne l'explique. Il y a maintenant un
véritable sas à la frontière : encadrement métallique, portes coulissantes qui
s'ouvrent à l'approche de Brad, voyant qui passe au vert, bandes
d'avertissement au sol. Purement décoratif — rien ne bloque le passage — mais
le changement d'ambiance a enfin une cause visible.

### Le Brad du menu

Il ignorait purement les volants. Il les prend maintenant pour cible, et
surtout il sait **grimper** : il choisit la plateforme depuis laquelle la cible
est atteignable, enchaîne les paliers s'il en faut deux, puis saute.

### Mobile

- **Icônes SVG** à la place des émojis. Un émoji change de dessin d'un appareil
  à l'autre, arrive parfois en couleur et ne s'aligne pas pareil ; un tracé
  vectoriel est identique partout.
- **Demande de rotation** en portrait, avant même le bouton « Jouer » — qui
  reste neutralisé tant que l'appareil n'est pas en paysage. Le jeu est cadré
  en 16:9 : en portrait, l'image tiendrait dans une bande et les commandes
  recouvriraient la moitié de l'écran.
- **Relance au toucher après une mort** : un bouton « RÉESSAYER », et un
  toucher n'importe où sur l'écran fonctionne aussi. Il fallait la touche
  Espace, injouable au doigt.
- Le bouton de développement « Réglages » est masqué sur écran tactile : il
  chevauchait le compteur de Brad Coins. Le panneau reste accessible depuis
  Options → « Réglages de développement… ».

---

# Prototype 07 — le hub, l'intro et le niveau 1

## Le flux du jeu, maintenant

```
Jouer → logos → menu
  Nouvelle partie → dialogue d'intro → niveau d'introduction → dialogue → LA BASE
  Continuer       → LA BASE (ou l'intro si elle n'a jamais été finie)

LA BASE ⇄ boutique · vestiaire · arcade · carte
                                            └→ niveau → bilan → LA BASE
```

## La base

Une salle souterraine que Brad **parcourt à pied**. On ne choisit pas dans un
menu : on marche jusqu'au comptoir et on entre (Espace, ou le bouton ▲ au
doigt). Quatre postes, une mini-carte en bas d'écran pour se repérer, et le
BRADDY3000 qui flotte près de la boutique et commente.

Brad y a son **propre acteur**, séparé de celui des niveaux. Le hub n'a ni PV,
ni Brad-Shy, ni combat : mélanger les deux états aurait exposé le jeu à des
bugs sournois — mourir dans le hub, ressortir du magasin avec une boule de
Serrano en main.

### Boutique

Deux onglets. Les **améliorations** de la Roadmap, à 3 BC l'unité : vie
(+2 PV par palier jusqu'à 20), dégâts et résistance (+10 % par palier jusqu'à
+100 %). Et des **bonus permanents** moins chers, achetés une seule fois :
ennemis ralentis, plus de Brad Coins lâchés, aimant à pièces, Brad-Shy plus
rapide.

Chaque achat passe par la confirmation du BRADDY3000 — « Es-tu sûr de vouloir
passer la transaction ? » / « Affirmatif » ou « Tout compte fait, non » — comme
le demandent les notes. Et ses répliques quand ça ne va pas : « Mhh. J'ai
jamais été bon en maths, mais je pense que les comptes n'y sont pas. »

**Les améliorations agissent réellement** : les PV max au départ du niveau, les
dégâts du poing et de l'onde, l'atténuation des coups reçus, la vitesse des
patrouilles, le rayon de l'aimant, le remplissage de la jauge.

### Vestiaire

Sept uniformes, **purement cosmétiques et gratuits** — c'est le choix assumé
des notes : le joueur ne met jamais ses Brad Coins en concurrence entre beauté
et puissance. Ils se débloquent en accomplissant des choses (finir un niveau,
éliminer 50 ennemis, faire 300 points à l'arcade, accumuler 40 BC, finir le
jeu). Les verrouillés montrent un cadenas et leur condition.

Les six variantes sont **pré-générées** par `tools/recolor_brad.py` plutôt que
recolorées dans le navigateur : un canvas nourri par une image locale est
teinté en `file://` et refuse `getImageData`, donc la recoloration à l'exécution
aurait cassé le mode double-clic.

### Arcade — SERRA INVADERS

Un Invaders remixé. Les notes demandaient de s'inspirer d'un jeu connu pour
n'avoir aucune règle à expliquer ; les variantes maison suffisent à le rendre
Brad Bitt :

- le rang du fond est composé de **Serra-Lourd** qui encaissent trois boules ;
- le rang suivant est composé de **Lanceurs** qui ripostent ;
- des **Volants** traversent l'écran en diagonale et valent le double ;
- Brad tire des **boules de Serrano**, pas des lasers.

100 points = 1 Brad Coin, et **3 parties par jour** — sinon la borne devient
une machine à monnaie. La limite se fie à l'horloge de la machine : une API de
temps ajouterait une dépendance réseau pour un enjeu nul, le joueur ne trichant
que contre lui-même.

### Carte

Les niveaux disponibles, terminés ou verrouillés — le suivant s'ouvre quand le
précédent est fini. La liste des huit niveaux à venir est affichée dessous,
pour montrer la route.

## Le dialogue d'introduction

Boîte de texte, effet machine à écrire, clic pour avancer. Le premier clic
**termine la ligne** au lieu de la sauter : c'est la convention que tout le
monde connaît, et elle évite de rater une réplique en cliquant trop vite. Un
bouton « Passer » pour ceux qui rejouent.

Quatorze répliques qui suivent la version retenue dans tes notes : Brad sort
les poubelles, reçoit une notification du BRADDY3000, se téléporte, et casse la
télécommande de retour à l'atterrissage. Six répliques de plus à l'arrivée au
hub. **C'est un premier jet à corriger** — le ton est celui que j'ai lu dans
tes notes, mais les vraies vannes sont les tiennes. Tout est dans
`js/dialogue.js`, en clair, en haut de fichier.

## Le niveau 1

**Champ de tournesols**, puis **la grotte** — même fichier, même partie, le
décor bascule derrière un fondu, exactement comme l'intro. 236 tuiles, sa
musique (`level1.m4a`), et une entrée de grotte avec ses torches qui s'allument
à l'approche de Brad plutôt qu'un sas métallique.

Vérifié : un bot le traverse de bout en bout sans blocage.

## Un fichier par niveau

`monde.js` est devenu un **chargeur**. Chaque niveau vit dans `niveaux/` et
n'est que de la donnée : géométrie, zones, ennemis, musique, porte. Aucun code
de gameplay dedans.

```js
NIVEAUX['niveau1'] = { nom, musique, largeur, zones, solides, ennemis, porte, … };
```

Ajouter le niveau 2, c'est ajouter `niveaux/niveau2.js`, une balise `<script>`,
et une entrée dans `ORDRE_NIVEAUX`. C'est l'architecture que décrivent tes
notes, et elle est maintenant réelle.

## Structure

```
index.html
style.css
niveaux/intro.js      données du niveau d'introduction
niveaux/niveau1.js    données du niveau 1
js/reglages.js        valeurs ajustables + persistance
js/audio.js           musique et effets synthétisés
js/monde.js           constantes, chargement des assets, chargeur de niveaux
js/sauvegarde.js      progression, améliorations, uniformes, arcade
js/acteurs.js         Brad, ennemis, boules, ramassages, effets, porte
js/dialogue.js        système de dialogue + scripts d'intro
js/hub.js             la base : déplacement, boutique, vestiaire, carte
js/arcade.js          Serra Invaders
js/menu.js            démarrage, scène de fond, menu, options, crédits
js/entrees.js         clavier, souris, tactile — aiguillés par la scène
js/jeu.js             caméra, transitions, rendu, boucle
```

La sauvegarde passe en `bradbitt.partie.v2` : les anciennes parties ne sont pas
relues, la structure a trop changé.

## Ce qui n'est pas encore là

Les huit autres niveaux, les boss, les Brad Coins secrets et leurs aptitudes,
les mini-jeux supplémentaires, le camp d'entraînement, les uniformes à
silhouette différente (t-shirt, pêcheur, funky, exclu-bêta — ils demandent une
vraie planche de 12 images chacun).

---

# Prototype 08 — six bugs, sept ajouts

## Les six bugs

### La base était accessible avant d'avoir fini l'introduction

`baseAccessible()` répond maintenant « oui » seulement une fois au moins un
niveau terminé. Trois portes étaient ouvertes et sont fermées : le bouton
« Retour à la base » de l'écran de mort, la touche Échap pendant le niveau, et
« Continuer » depuis le menu (qui relance l'intro au lieu d'ouvrir le hub).
Le camp d'entraînement reste, lui, toujours quittable — c'est une salle de la
base, pas un niveau dont on s'échapperait.

### « Passer » ne fonctionnait pas dans la cinématique

Deux causes indépendantes, les deux corrigées.

La première est dans le code : `zoneSousSouris()` parcourt la pile de zones
cliquables à l'envers, donc la **dernière** enregistrée gagne. Le rectangle
plein écran qui fait avancer le dialogue était posé après le bouton, et
l'avalait. Il est maintenant posé en premier.

La seconde est de la mise en page, et c'est celle que tu voyais : le bouton
HTML « ⚙ Réglages » est en `position: fixed` dans le coin haut-droit, **par
dessus** le canvas. « Passer » était dessiné exactement dessous. Le clic
atterrissait sur le bouton de réglages et jamais sur « Passer ». Le bouton est
descendu juste au-dessus de la boîte de texte, là où rien ne le recouvre. Un
test vérifie désormais que les deux rectangles ne se croisent pas, et reclique
pour de vrai à trois tailles de fenêtre.

### Les ennemis de la zone 2 étaient visibles depuis la zone 1

`ennemiHorsZone()` compare la zone de l'ennemi à la zone affichée. Un ennemi
hors zone n'est ni mis à jour ni dessiné : il ne bouge pas, ne tire pas, et
n'apparaît pas au loin derrière le sas.

### Les cadenas des uniformes étaient des émojis

Remplacés par `dessinerCadenas()`, tracé en primitives, à l'échelle demandée et
dans la couleur demandée. Un émoji change de dessin d'un appareil à l'autre et
arrive parfois en couleur au milieu d'une ligne grise ; le tracé, lui, est
identique partout. La suite de tests refuse tout caractère émoji dans les
fichiers de rendu.

### L'économie

Les améliorations coûtent **30 BC**, plus **5 BC par palier déjà acheté** :
30, 35, 40, 45, 50… Les bonus permanents coûtent **10 BC** (l'aimant à Brad
Coins) ou **20 BC** (Serrano rassis, Poches percées, Brad-Shy affûté).

### La partie ne se sauvegardait pas

C'était le bug le plus bête et le plus grave. `sauvegarde.js` écrivait
correctement dans `localStorage`, mais l'appel `chargerPartie()` en fin de
fichier — la seule ligne qui relit la partie au chargement de la page — avait
disparu pendant la réécriture du prototype 07. La sauvegarde existait, personne
ne la lisait, « Continuer » restait gris. La ligne est revenue, avec un
commentaire qui explique pourquoi elle ne doit plus jamais partir.

## Les sept ajouts

### Confirmation avant une nouvelle partie

« Nouvelle partie » alors qu'une partie existe demande confirmation, en
rappelant ce qui va disparaître : les Brad Coins et les niveaux terminés.

### Choix de la difficulté avant la cinématique

Trois cartes — Touriste, Connaisseur, Salé — chacune avec quatre lignes qui
disent exactement ce qui change : dégâts subis, résistance des ennemis,
récompenses, et à qui ça s'adresse. La cinématique ne part qu'après.

### « Continuer » à la fin d'un niveau

L'écran de bilan propose « Continuer ▸ » en bouton principal (retour à la base)
et « Rejouer » en second. Espace fait la même chose que le clic. Au retour, le
BRADDY3000 commente — parfois sur la mission, parfois sur rien du tout.

### Le camp d'entraînement

Une salle de la base, accessible depuis le hub. Le drapeau `entrainement` du
fichier de niveau coupe **toute** récompense : aucun Brad Coin dans le décor,
aucun lâché par les ennemis, aucun comptage d'éliminations, aucune progression.
Les ennemis réapparaissent en boucle et mourir n'y coûte rien. La garantie est
posée dans la donnée, pas dispersée dans le code : c'est ce qui empêche la
salle de devenir une ferme à pièces.

Le seul effet du camp sur la progression est cosmétique : un passage débloque
la cravate turquoise.

### La scène de découverte de la base

Douze répliques entre Brad et le BRADDY3000, jouées **dans** la base : la
caméra se tourne vers chaque poste dont il parle, le robot le suit, et Brad
marche à côté. Toute la base est remontée de 62 pixels pendant le dialogue,
sinon le sol — et donc les deux personnages — se retrouve derrière la boîte de
texte. Elle ne se joue qu'une fois par partie : le drapeau vit dans la
sauvegarde, pas dans une variable de session.

### Deux uniformes de plus

- **Cravate turquoise** — un passage au camp d'entraînement.
- **Cravate bordeaux** — les 25 paliers d'améliorations achetés, santé, dégâts
  et résistance au maximum. C'est la récompense la plus longue du jeu.

Le vestiaire est passé de quatre à cinq colonnes : à neuf uniformes, une grille
de quatre débordait sur une troisième rangée qui recouvrait la description et le
bouton « Sortir ».

### Parler au BRADDY3000

Approche-le dans la base : « E pour parler » apparaît (« Touche-le pour
parler » sur mobile). Son corps reste cliquable même pendant qu'il répond, pour
relancer la conversation au doigt sans attendre. Il donne des conseils liés à
ton avancement — argent, améliorations non achetées, niveaux restants — deux
fois sur trois, et dit n'importe quoi le reste du temps.

## Vérification

`101` contrôles automatisés, tous verts : les treize points ci-dessus, plus
un pilote automatique qui traverse l'introduction et le niveau 1 de bout en
bout, une passe mobile en portrait puis en paysage, et un contrôle qu'aucune
erreur JavaScript n'est apparue de toute la session.

## Structure

```
niveaux/entrainement.js   le camp — aucune récompense, ennemis en boucle
```

Le reste est inchangé. La sauvegarde reste `bradbitt.partie.v2`, avec un champ
`hubVu` en plus (les parties du prototype 07 restent lisibles : un champ absent
prend sa valeur par défaut).

## Ce qui n'est pas encore là

Les niveaux 2 à 10, les boss, les Brad Coins secrets et leurs aptitudes, et les
uniformes à silhouette différente (t-shirt, pêcheur, funky, exclu-bêta — ils
demandent une vraie planche de 12 images chacun, la recoloration ne suffit pas).

---

# Prototype 09 — les niveaux 2 et 3, le premier boss, l'appareil à raclette

## L'appareil à raclette

Le fil rouge de l'aventure, en trois pièces, une tous les trois niveaux :

| Pièce | Niveau | Ce que c'est |
|---|---|---|
| **Le poêlon** | 3 — la vallée enchantée | Un poêlon. Un seul. Il en faudrait huit. |
| **La garniture** | 6 — la maison hantée | Le fromage et la charcuterie. |
| **L'appareil** | 9 — l'espace | La machine elle-même. |

Réunies, elles permettent d'attirer Kirby 67 et de situer sa position — ce qui
ouvre le niveau 10 et son boss. Les trois sont déjà déclarées dans le code :
la vitrine de la base montre les deux emplacements encore vides, avec le niveau
où les trouver. Le joueur sait donc dès la première visite ce qui l'attend.

Les pièces vivent dans la sauvegarde (`partie.objets`), filtrées à la relecture :
une sauvegarde bricolée à la main ne peut pas s'inventer une quatrième pièce.

### La vitrine

Trois emplacements au mur de la base, entre le vestiaire et le camp. Ce n'est
pas un poste : rien à activer, rien à acheter. Un mur qui se remplit. Les pièces
manquantes apparaissent en silhouette avec un cadenas — montrer la forme absente
vaut mieux qu'un point d'interrogation.

## Le premier boss

Le **Serra-Colosse** garde le poêlon dans le cercle de pierres, au bout du
niveau 3. C'est le principe demandé : *un Serra-Lourd avec plus de vie et plus
de dégâts, qui se blinde par moments et qu'il faut redevenir vulnérable en
nettoyant la salle.*

Concrètement, il a quatorze points de vie et trois seuils. À chaque seuil
franchi il se blinde et appelle une vague de renforts — 2, puis 3, puis 4, de
plus en plus mobiles. Tant qu'un renfort tient debout, **les coups portés au
boss rebondissent**, onde de choc comprise. La vague nettoyée, le blindage
tombe et il repart, plus rapide.

C'est ce qui évite le boss-sac-à-points-de-vie : on ne gagne pas en tapant plus
fort, on gagne en gérant la salle.

Trois garde-fous, parce qu'un combat bloqué est pire qu'un combat trop dur :

- **La porte de sortie est verrouillée** tant que le boss vit — et elle le dit,
  plutôt que d'ignorer un Brad qui la piétine.
- **Les renforts volants apparaissent bas** (rangée 11) et ne renoncent jamais
  à poursuivre Brad. Un sbire hors d'atteinte transformerait la phase blindée
  en salle d'attente.
- **Au bout de trente secondes de blindage, l'armure lâche seule.** Aucune
  partie normale n'atteint ce délai — les vagues se nettoient en une dizaine de
  secondes — mais si un renfort se coince quelque part, le joueur récupère la
  main au lieu de devoir quitter le niveau.

Mourir pendant le combat le remet à zéro proprement. Mourir *après* la victoire
ne ressuscite pas le boss, et la pièce tombée mais pas encore ramassée est
reposée au sol : sans ça elle disparaissait avec le reste et l'objet du niveau
devenait à jamais inatteignable.

## Le niveau 2 — la ville, en été

Deux zones. Les rues, avec leurs immeubles à fenêtres allumées, leurs
réservoirs sur les toits et leurs échafaudages. Puis l'arrière-cour, derrière
une grille : murs grillagés, cordes à linge, poubelles, et des lanceurs postés
en hauteur. C'est un niveau de métier, sans objet majeur — les pièces sont aux
niveaux 3, 6 et 9.

## Le niveau 3 — la vallée enchantée

Trois zones, une de plus que les niveaux précédents. La clairière (montagnes
enneigées, sapins, lucioles), le bosquet profond (champignons géants), puis le
cercle de pierres — l'arène. Le moteur accepte désormais plusieurs sas par
niveau, un par changement de décor.

L'arène est plate et large exprès : le combat a besoin de place pour courir
entre le boss et ses renforts. Une salle encombrée de plateformes rendrait la
phase blindée illisible.

## La règle de tracé des niveaux

Ce round a coûté trois blocages de niveau qu'aucune relecture n'aurait
attrapés. Ils sont devenus une règle, écrite en tête des deux fichiers :

1. **Le chemin du sol est le chemin garanti.** Ses trous ne dépassent jamais
   4 tuiles (96 px) là où Brad court à 141 px de portée.
2. **Rien au-dessus d'un élan.** Une plateforme posée juste avant un trou fait
   cogner Brad en plein saut et le précipite dedans. C'est le pire bug de
   niveau qui soit : il ressemble à une erreur du joueur.
3. **Pas de plafond bas au-dessus d'une marche.** Un bloc de 2 tuiles sous une
   plateforme à 72 px est infranchissable — Brad n'a pas la place de sauter.
4. **Les obstacles posés au sol font 2 tuiles au plus**, et jamais contre le
   bord d'un trou.

Tout ce qui monte plus haut est une voie *optionnelle* : des pièces, un
raccourci, une position de tir. Jamais un passage obligé.

Deux analyseurs automatiques vérifient ces règles sur les cinq niveaux, et
c'est eux qui ont trouvé le mur de 96 px du niveau 2, les cinq plateformes
posées au-dessus d'un élan, et le plafond à 72 px au-dessus d'une marche. Un
troisième contrôle, ajouté après coup, a trouvé la porte du niveau 3 placée
*au-delà* du mur de droite : elle était tout simplement hors du niveau.

## Le BRADDY3000 parle moins vite

Une réplique restait 3,4 secondes à l'écran quelle que soit sa longueur. Deux
changements :

- **La durée se calcule sur le texte** — 2,2 s de base plus 55 ms par
  caractère, plafonnée à 14 s. Une réplique courante tient maintenant 6 à 9
  secondes.
- **Et surtout, la bulle attend qu'on la ferme.** Passé un court délai de
  lecture, un « E pour fermer ▸ » clignote dans le coin ; réappuyer sur E (ou
  toucher la bulle, au doigt) la referme ou enchaîne. Le minuteur reste comme
  filet : si Brad s'éloigne ou fait autre chose, elle finit par se refermer
  seule.

Le délai avant que l'appui ne ferme est là exprès : sans lui, le E qui vient
d'ouvrir la bulle la refermerait dans la même seconde.

Il a aussi de quoi parler. Ses répliques sur l'appareil à raclette changent
complètement selon le nombre de pièces rapportées, et rentrer d'un niveau avec
une pièce déclenche une réplique dédiée qui prime sur son commentaire de
mission habituel.

## Vérification

`81` contrôles automatisés, tous verts. Ils couvrent la durée et la fermeture
des répliques, la géométrie des deux niveaux, la structure de l'arène, le
déroulement complet du combat (y compris : le boss encaisse bien **zéro** dégât
pendant le blindage), le ramassage de la pièce, sa persistance après
rechargement, le comportement en cas de mort avant et après la victoire, le
filet anti-blocage, et une traversée automatique des **quatre** niveaux de bout
en bout — le pilote bat le boss et rapporte le poêlon.

## Structure

```
niveaux/niveau2.js    la ville, en été
niveaux/niveau3.js    la vallée enchantée et l'arène
js/boss.js           arènes, blindage, vagues de renforts, pièces majeures
```

Le chargeur de niveaux accepte maintenant plusieurs sas (`SAS_LISTE`) et un
bloc `arene`. La sauvegarde reste `bradbitt.partie.v2`, avec `objets` et
`bossVaincus` en plus : les parties du prototype 08 restent lisibles.

## Ce qui n'est pas encore là

Les niveaux 4 à 10, les boss des niveaux 6 et 9, le boss final sous le manoir,
les Brad Coins secrets et leurs aptitudes, et les uniformes à silhouette
différente. Les niveaux 2 et 3 réutilisent la musique du niveau 1 en attendant
leurs propres pistes.

---

# Prototype 10 — le jukebox, la pause, et douze corrections

## Le jukebox

Une borne dans la base, entre l'arcade et la carte. Six morceaux : trois
disponibles d'entrée — **Classique** (le thème de la base), **Chill** et
**Techno** — et trois derrière un code : **3IRL**, **CORE**, **N2S3**. Chacun a
sa description ; les morceaux verrouillés restent visibles, en gris, avec un
cadenas, pour qu'on sache qu'il y a quelque chose à chercher.

L'onglet « Code » a un clavier à l'écran **et** accepte la frappe au clavier
physique. Le clavier à l'écran n'est pas qu'une concession au tactile : le jeu
est dessiné dans un canvas, il n'a pas de champ de saisie, et un joueur devant
un rectangle vide n'a aucune raison de deviner qu'il peut taper. Un code valide
prévient, ajoute le morceau à la liste, bascule dessus, et fait réagir le
BRADDY3000.

Le morceau choisi et les codes trouvés vivent dans la sauvegarde : revenir dans
la base retrouve son ambiance.

Les six morceaux ne sont **pas** préchargés au lancement — ce serait une
trentaine de mégaoctets d'attente pour un seul qui sera écouté. Ils se chargent
à la demande, avec un garde-fou : si le joueur change d'avis pendant le
chargement, le morceau abandonné ne démarre pas par-dessus le nouveau.

## Le menu de pause

Échap coupait le niveau et renvoyait à la base **sans rien demander** — donc
sans prévenir que les Brad Coins ramassés étaient perdus. Il ouvre maintenant un
menu : Reprendre, Recommencer le niveau, Options, Retour à la base, Menu
principal.

L'avertissement est affiché **deux fois**, et c'est voulu : en rouge sous les
choix, avec le compte exact (« 14 BC ramassés seraient perdus »), puis dans une
confirmation. Le joueur doit connaître le risque avant de viser le bouton, pas
seulement après l'avoir cliqué.

Les options ouvertes depuis la pause y reviennent, au lieu de retomber au menu
principal en abandonnant le niveau.

## L'écran de chargement

« Continuer » basculait dans la base en une image. Sept secondes de logo, de
barre et d'un conseil tiré parmi quatorze rendent la transition supportable — et
donnent enfin une place aux conseils qu'aucun écran n'affichait. Le chargement
du lancement (les deux logos studio) est conservé tel quel.

## Les plateformes mobiles

Une barre qui fait la navette au-dessus du vide, avec son rail visible pour
qu'on puisse anticiper. Deux au niveau 2, une au niveau 3.

Deux règles ont guidé leur placement. D'abord Brad est **porté** : sans cela la
barre glisse sous ses pieds et il tombe en restant immobile, ce qui ressemble à
un jeu cassé. Ensuite, chaque barre survole un trou que Brad peut **déjà**
franchir d'un saut : elle est un confort et une variation de rythme, jamais le
seul passage. Un niveau qui dépend d'une plateforme mobile devient injouable si
elle se bloque.

## Les musiques

Les niveaux 2 et 3 ont enfin les leurs, et les mini-boss des niveaux 3, 6 et 9
ont chacun la sienne. Celle du boss remplace celle du niveau au déclenchement du
combat, et rend la main à la fin.

Le dossier `assets/audio` pèse maintenant environ 77 Mo (onze pistes en deux
encodages, AAC et MP3). C'est beaucoup pour un site : si le poids devient
gênant, le MP3 peut sauter — il n'existe que pour les compilations de Chromium
sans AAC, tous les navigateurs grand public lisent le `.m4a`.

## Les douze corrections

### Le « Sortir » de Serra Invaders

`texteCentre()` dessine **toujours** au milieu du canvas. S'en servir pour
étiqueter un bouton placé ailleurs pose le mot au centre de l'écran, à 224
pixels de sa zone cliquable. Le joueur cliquait sur le mot « Sortir » ; le
bouton, lui, était un rectangle vide dans le coin. Sur l'écran de fin de partie,
c'était pire : les deux étiquettes se superposaient au milieu et aucune n'était
sur son bouton. Un `texteCentreEn(texte, x, …)` a été ajouté et les deux écrans
corrigés.

### Les taches de couleur sur le visage de Brad

La détection de la cravate cherchait « du rouge dominant » : elle attrapait
aussi l'ombre sous la mâchoire (187,114,68) et le contour des cheveux
(221,146,104), qui sont du rouge dominant — mais de la peau. Ces pixels
prenaient la couleur de la cravate sur chaque planche recolorée.

Ce qui sépare vraiment les deux, c'est le **niveau absolu** du vert et du bleu :
la cravate tourne autour de (161,4,18), la peau ne descend jamais sous ~100 de
vert. Le filtre exige maintenant `r > 120`, `g < 95` et `b < 95`. Un test
compare chaque planche recolorée à l'originale et **refuse le moindre pixel
modifié au-dessus de la ligne du col**.

### « Cravate Serrano »

Ce n'était pas une erreur : c'est bien la cravate **jaune**, débloquée à 40
Brad Coins. Mais le nom ne permettait pas de le deviner. Elle s'appelle
maintenant « Cravate jaune », et le surnom Serrano est passé dans la
description, où il amuse sans égarer.

### La cinématique de la base fermée trop vite

Pendant la scène, la caméra se promène et les deux personnages la suivent : la
passer déposait Brad là où la mise en scène l'avait laissé — souvent à l'autre
bout de la base, parfois déjà dans la zone d'activation d'un poste. Et la bulle
du BRADDY3000, qui a sa propre durée, survivait à la scène.

La fin de la scène remet maintenant tout en place : Brad à l'entrée, le robot à
son comptoir, la caméra au bord gauche, aucune réplique en cours. Cela vaut
aussi bien pour la scène regardée en entier que pour la scène passée.

### Les fenêtres qui clignotaient

Le pire des douze, parce qu'il n'est pas seulement laid. L'état de chaque
fenêtre était tiré de sa position **à l'écran** — qui change à chaque pixel de
défilement. Le même carreau se rallumait plusieurs fois par seconde dès que
Brad marchait : toute la façade stroboscopait, ce qui est franchement risqué
pour une personne photosensible.

L'état dépend maintenant du numéro de l'immeuble et du rang de la fenêtre dans
cet immeuble — deux nombres qui ne bougent jamais. Un test mesure les pixels
allumés à huit positions de caméra consécutives et refuse toute variation
notable.

### Les plateformes inatteignables et superposées

Vingt-quatre défauts trouvés, sur les **cinq** niveaux, pas seulement les
nouveaux. Un outil a été écrit pour ça — `tools/verifier_niveaux.js` — qui
charge les fichiers de niveau et les règlages réels du jeu, puis vérifie trois
choses : aucun solide n'en recouvre un autre ; chaque plateforme est atteignable
par une chaîne de sauts depuis le sol ; et rien ne fait plafond au-dessus d'un
élan ou d'une marche.

Deux enseignements en sont sortis. Le premier : mon modèle de portée était trop
sévère et condamnait des plateformes parfaitement atteignables — il calcule
maintenant le vrai temps de vol à la hauteur visée. Le second : **les
plateformes traversables ne font pas plafond**, puisque Brad les franchit par en
dessous ; les compter comme des obstacles condamnait à tort la moitié des
perchoirs.

Le verdict est aujourd'hui « aucun défaut » sur les cinq niveaux, et le test
échoue si cela change.

### Le Serra-Boost coincé près de la sortie du niveau 2

Quatre ennemis apparaissaient **à l'intérieur** d'un bloc et onze au-dessus du
vide — conséquence des plateformes déplacées. Un contrôle compare chaque point
d'apparition à la géométrie et refuse tout ennemi encastré ou suspendu.

### L'arène

- **Des trampolines dans les deux coins.** Sans eux, un joueur acculé par le
  Colosse n'avait aucune sortie : le boss est plus large que Brad, il le plaquait
  contre le mur, et le combat se terminait par une mort qui ne devait rien à son
  niveau de jeu. Le rebond a dû être exempté de la « gravité bouton relâché »,
  sans quoi il ne montait qu'à 68 px au lieu de 176 — et ne servait à rien.
- **Les corniches sont descendues** de la rangée 10 à la 12 : à 120 px du sol,
  elles étaient hors de portée d'un saut de 74 px.
- **On ne reste plus coincé sur le boss.** Atterrir sur son crâne ne coûte
  désormais aucun point de vie et éjecte Brad vers le centre de la salle.

Deux effets de bord, trouvés par les tests : le trampoline de droite était posé
**sur la porte de sortie** — Brad rebondissait par-dessus au lieu d'entrer — et
la corniche droite se trouvait au point de chute du poêlon, qui atterrissait donc
sur une étagère au lieu du sol de l'arène. Les deux ont été déplacés.

## Vérification

`83` contrôles automatisés, tous verts, plus l'outil de géométrie sur les cinq
niveaux. La suite tourne sur un petit serveur HTTP local : en `file://`,
`getImageData()` refuse de lire un canvas qui a reçu une image locale, et le
test anti-clignotement en a besoin.

Le pilote automatique traverse les quatre niveaux, bat le boss et rapporte le
poêlon. Il a fallu lui apprendre deux choses au passage, toutes deux
révélatrices : ne pas sauter un trou avec un ennemi dans les pattes — le recul
d'un coup reçu en plein saut coupe l'élan et fait tomber dans le vide — et,
après le boss, aller chercher la pièce puis la porte au lieu de continuer vers
le mur du fond.

## Structure

```
js/jukebox.js         la borne, les codes, les six morceaux
js/pause.js           menu de pause et écran de chargement
js/mobiles.js         plateformes mobiles
tools/verifier_niveaux.js   contrôle de géométrie des niveaux
```

La sauvegarde reste `bradbitt.partie.v2`, avec `piste` et `codes` en plus.

## Ce qui n'est pas encore là

Les niveaux 4 à 10, les boss des niveaux 6 et 9, le boss final, les Brad Coins
secrets, et les uniformes à silhouette différente.

---

# Prototype 10a — le silence, et les codes qui se donnaient

## Pourquoi il n'y avait plus de musique

Le défaut était dans `audio.precharger()`, et il était **invisible par
construction**. Quand le fichier du format choisi ne se chargeait pas, la
fonction résolvait sa promesse **sans rien enregistrer** : pas d'erreur, pas de
trace, juste une table de pistes vide. Tous les `jouerMusique()` suivants ne
faisaient alors plus rien du tout. Le jeu tournait parfaitement, en silence
complet, sans que quoi que ce soit n'indique pourquoi — dans les niveaux comme
au jukebox.

`EXT_AUDIO` choisit le format une fois pour toutes au démarrage, en demandant
son avis au navigateur via `canPlayType()`. Or cet avis n'est qu'un avis : la
méthode répond « maybe » pour des formats que le navigateur refuse ensuite
réellement de lire. Un seul mauvais pronostic, et toute la bande-son
disparaissait.

Deux garde-fous :

1. **Repli automatique sur l'autre format.** Chaque morceau existe en `.m4a` et
   en `.mp3`. `EXT_AUDIO` n'est plus qu'une *préférence* : si le fichier préféré
   échoue, l'autre est chargé et rangé sous la clé d'origine — le reste du jeu
   ignore ce repli. Le délai de sécurité ne déclare plus une piste bonne sans
   avoir vérifié que le navigateur en a lu quelque chose.
2. **Les échecs se voient.** Ce qui n'a pu être chargé d'aucune façon atterrit
   dans `audio.echecs`, et le menu principal affiche une ligne rouge nommant le
   premier fichier fautif. Un son manquant doit être un fait constaté, pas un
   mystère.

Un test rejoue précisément la panne : il force le jeu à demander le `.m4a` dans
un navigateur qui l'annonce sans savoir le lire, et vérifie que la musique sort
quand même. Un autre cache les deux encodages d'une piste et vérifie que le jeu
le signale.

## Les morceaux à code ne donnent plus leur code

Le nom affiché **était** le code : « 3IRL », « CORE », « N2S3 » se lisaient dans
la liste, et il n'y avait plus rien à chercher. Les morceaux verrouillés
s'affichent désormais `? ? ?`, avec « code requis » à droite et « Verrouillé. Il
existe un code pour ça. » en description. Le nom apparaît au déblocage.

Un test intercepte tout le texte réellement dessiné à l'écran et **échoue si un
seul des trois codes y apparaît**.

## Vérification

`30` contrôles, tous verts : les deux scénarios audio, l'absence de fuite des
codes, la géométrie des cinq niveaux, et la traversée automatique des quatre
niveaux.

---

# Prototype 10b — trouver la cause du silence

Le repli de format du 10a n'a rien changé chez toi : les fichiers de ton dossier
sont valides dans les deux encodages, et le code déployé est **octet pour
octet** celui que je teste (empreintes comparées). La cause est donc dans
l'environnement du navigateur, et je ne peux pas la voir d'ici.

D'où deux choses.

## Une page de diagnostic

`diagnostic-audio.html` se double-clique à côté de `index.html`. Elle refait
exactement ce que fait le jeu, dans le même navigateur, depuis le même dossier,
et rend un verdict en clair : le format que le navigateur annonce savoir lire,
le résultat de chargement des 13 pistes **dans les deux formats**, les réglages
mémorisés, et un bouton qui tente une vraie lecture sur un vrai clic.

## Le suspect numéro un

`volMusique` est mémorisé dans `localStorage` sous `bradbitt.feel.v1`, **par
navigateur et pour toujours**. S'il est descendu à 0 — ce qui a très bien pu
arriver en testant les curseurs de volume, dont la réparation date du prototype
05 — alors toutes les pistes se chargent, démarrent, jouent… à volume nul. Le
symptôme est exactement celui décrit : plus rien, ni en niveau ni au jukebox,
sans le moindre message.

Ce cas ne se voyait nulle part. Il se dit maintenant : le menu principal affiche
en rouge « Le volume de la musique est à zéro (Options → Volume de la musique) ».

Deux autres silences muets ont été traités au passage : un fichier introuvable
nomme désormais le fichier fautif, et un refus de lecture par le navigateur
(politique de lecture automatique) est signalé au lieu d'être avalé.

---

# Prototype 10c — la vraie cause du silence

Ce n'était ni le code ni les fichiers. Les empreintes de tous les fichiers de
code étaient **identiques** entre ta machine et la mienne, et tes 26 fichiers
audio sont valides. Le jeu jouait la musique — depuis un dossier qui n'en avait
aucune.

Ton flux est : *dézipper mon envoi → pousser sur GitHub → Netlify → tester
l'URL*. Or **depuis le prototype 10, mes zips excluaient `assets/audio`** pour
tenir sous la limite de transfert vers ta machine. Le dossier dézippé n'avait
donc plus une seule piste, et c'est lui qui partait en ligne. Les traces le
confirmaient : `bradbitt 2` et `bradbitt 3` étaient en prototype 10 avec un
dossier `assets/audio` **absent**, pendant que `Jeu/` en avait 26.

C'était mon erreur, et le message « les musiques sont déjà sur ta machine »
était trompeur : vrai pour `Jeu/`, faux pour le dossier que tu ouvres.

## Ce qui change

- **Le zip livrable est désormais assemblé sur ta machine** (code + audio), donc
  toujours complet. Aucun gros transfert : l'audio y est déjà.
- **Le MP3 est retiré du site.** Tu as choisi de ne garder que le `.m4a`, lu par
  Safari, Chrome, Edge et Firefox. Le site passe de 76 à 41 Mo. Les MP3 sont
  déplacés, pas détruits.
- **Les trois fichiers à majuscules** (`menu-3IRL.m4a`…) sont renommés en
  minuscules. Ce n'était pas la cause du 404 — les sprites d'ennemis sont en
  majuscules et fonctionnent en ligne — mais une casse qui ne se voit qu'en
  production reste un piège inutile. Les clés du jukebox, elles, gardent leur
  casse : une sauvegarde qui contient `menu-N2S3` reste valable.
- **Le compte de pistes manquantes** ne double plus les formats : « 4 pistes
  introuvables » et non « 8 » pour quatre morceaux absents.

---

# Prototype 11 — les niveaux 4 et 5, deux mécaniques, deux ennemis

## Les deux corrections demandées

**Confirmation avant d'effacer la sauvegarde.** La ligne « Effacer la
sauvegarde » se trouve juste sous « Rétablir les réglages par défaut », qui
n'est pas irréversible : un cran de trop sur la flèche du bas suffisait à
supprimer toute la progression sans un mot. Le dialogue du BRADDY3000 s'ouvre
désormais et **chiffre ce qui serait perdu** — Brad Coins, niveaux terminés,
pièces de l'appareil.

Trois défauts ont été corrigés au passage, tous invisibles à la relecture :

- `dessinerConfirmation()` n'était **pas appelé** par l'écran des options. Le
  dialogue était armé mais jamais dessiné : le joueur se serait retrouvé devant
  des options qui ne répondaient plus.
- Le clavier de l'écran d'options ne testait pas `confirmation`. Les flèches
  continuaient de déplacer la sélection derrière le dialogue ouvert.
- Aucun fond n'avalait les clics. Le voile assombrissait l'écran mais les
  boutons du dessous restaient cliquables — viser à côté du dialogue rachetait
  un article dans la boutique. Corrigé pour **toutes** les confirmations du
  jeu, pas seulement celle-ci.

**L'arène du niveau 3.** Les deux corniches ont été retirées. Le Serra-Colosse
ne pouvait pas les atteindre : un joueur perché dessus le frappait en toute
impunité pendant qu'il tournait en rond en dessous, et le combat perdait sa
raison d'être. Le sol est maintenant **nu d'un seul tenant**. La traversante
centrale part aussi — même à travers, un perchoir reste un abri. **Les deux
trampolines des coins restent** : ils donnent une sortie sans donner un refuge.

## Ce que les niveaux 4 et 5 apportent

| | Niveau 4 — Discothèque Brésil | Niveau 5 — Ville USA hiver |
|---|---|---|
| Mécanique | Les dalles qui se dérobent | La glace |
| Ennemi | Serra-Samba | Serra-Glaçon |
| Ce qu'elle demande | **Ne pas s'arrêter** | **Préparer son freinage** |
| Zones | file d'attente · piste · loges | avenue gelée · parc enneigé |
| Musique | `level4.m4a` | `level5.m4a` |

Les deux mécaniques se répondent : la piste interdit l'immobilité, le Samba
l'impose. C'est ce contraste qui fait le niveau 4.

### Les dalles

Brad se pose, la dalle s'allume, craque une demi-seconde, tombe — puis
**revient** au bout de 2,4 s. Trois précautions :

- Elles sont **traversantes par le bas**. Une dalle qui ferait plafond
  transformerait un saut mesuré en mur invisible.
- Elles reviennent **toujours**. Aucun enchaînement ne peut enfermer le joueur.
- Une dalle qui réapparaît sur Brad ne le pousse pas : elle n'arrête que les
  chutes. Pas d'écrasement, pas d'éjection dans le décor.

Chaque dalle est dessinée avec son joint de deux pixels : sans lui, une rangée
se lisait comme une seule longue barre et on ne voyait pas qu'elles tombent une
par une.

### La glace

Elle ne touche **qu'une chose** : l'adhérence. La vitesse maximale, la hauteur
de saut et le contrôle en l'air sont exactement ceux des quatre niveaux
précédents — donc aucun saut calibré ailleurs ne devient infaisable. C'est
vérifié automatiquement (`la glace ne touche pas la hauteur de saut`).

Règle de tracé qui en découle : **deux tuiles sèches avant chaque trou**. Une
plaque qui irait jusqu'au bord serait une chute imposée. Le vérificateur
l'impose désormais et il a servi tout de suite : il a refusé les cinq corniches
gelées de 5 tuiles, où deux tuiles sèches de chaque côté ne laissent qu'une
tuile de glace. Une seule corniche est gelée dans le jeu, allongée à 9 tuiles
exprès.

### Les deux ennemis

Aucun dessin nouveau. Comme le Serra-Colosse, ils réutilisent une planche
existante avec une teinte et une échelle — la différence tient entièrement au
comportement. La teinte est construite en `source-atop`, sans lecture de pixels :
la page reste ouvrable en double-clic.

- **Serra-Samba** (Serra-Boost rose) : avance par à-coups, 0,8 s d'élan puis
  0,55 s d'arrêt. Ennemi de lecture, pas de réflexe.
- **Serra-Glaçon** (Serra bleu givré) : sa vitesse suit sa volonté très
  lentement. Il dépasse les bords, met du temps à faire demi-tour, et peut finir
  dans le vide. Sur la glace, **n'importe quel** ennemi subit la même règle que
  Brad : c'est ce qui rend la surface lisible.

## Deux incohérences corrigées au passage

**La route des niveaux.** La carte annonçait « discothèque Brésil · maison
hantée », ce qui plaçait la maison hantée au niveau 5 — alors que la garniture y
est inscrite au **niveau 6** dans `sauvegarde.js` et dans la vitrine de la base.
Les deux ne pouvaient pas être vraies. La liste suit désormais les données.

**Le libellé des sas.** « ARRIÈRE-COUR » était écrit en dur dans le rendu :
correct au niveau 2, faux partout ailleurs. Le niveau nomme maintenant ses sas.

**La carte des missions ne tenait plus.** À 58 px par ligne, la sixième entrée
sortait du cadre : on la sélectionnait sans jamais la voir. Elle défile
désormais, cinq missions à la fois, en gardant la sélection dans la fenêtre —
le problème se serait posé de toute façon à onze entrées.

## Vérification

- `tools/verifier_niveaux.js` — chevauchements, accessibilité au saut, plafonds,
  et trois familles neuves : glace posée dans le vide, glace collée au bord,
  dalle recouvrant un solide, ennemi terrestre posé dans le vide **ou sur une
  dalle** (ils ne les connaissent pas et tomberaient au premier passage). Il sait
  aussi qu'un trou large enjambé par des dalles ou une barre se mesure au plus
  grand bond, pas à sa largeur totale. **Aucun défaut sur les sept niveaux.**
- Suite automatisée : **47 vérifications**, dont la traversée complète des
  niveaux 4 et 5 par un robot qui ne sait que courir et sauter. Il a fallu lui
  apprendre deux choses, et les deux sont des pièges réels du jeu : **tenir** le
  bouton de saut pendant la montée (le relâcher déclenche la gravité du saut
  court — le même piège que le trampoline du niveau 3), et **corriger sa
  trajectoire en l'air** après un rebond sur la tête d'un ennemi.

## À faire ensuite

Niveau 6 — la maison hantée — avec le deuxième mini-boss et la garniture.

---

# Prototype 12 — les niveaux 6 et 7, le Séraphin, les barrières laser

## Le mini-boss du niveau 6 : le Serra-Séraphin

Un Serra-Volant agrandi deux fois et demie, qui garde la garniture dans la
salle de bal du manoir. Le principe demandé : **un géant volant qui se duplique
en petits volants, et qu'il faut retrouver pour l'assommer**.

### Le bonneteau

C'est la question à laquelle tout le combat répond : *comment le joueur sait-il
lequel est le vrai ?* Trois options étaient possibles ; celle retenue est la
seule qui récompense l'attention plutôt que la chance.

1. **Révélation** — le vrai clignote une seconde et demie, halo doré, anneau,
   flèche et le mot « LUI ». C'est la seule information gratuite du combat.
2. **Mélange** — les copies échangent leurs places en glissant, jamais en se
   téléportant : c'est le trajet qui se suit à l'œil. Cinq copies au premier
   cycle, sept au deuxième, neuf au troisième, et le mélange accélère.
3. **Choix** — frapper la bonne l'assomme trois secondes et demie, résistance
   levée. Frapper une fausse ne coûte **rien** : pas un point de vie, pas un
   point au boss. Ça relance simplement un mélange éclair — deviner reste
   possible, ça coûte juste tout le bénéfice d'avoir suivi le bon des yeux.

Trois filets, tous vérifiés automatiquement :

- **Aucune loterie.** Le vrai est toujours montré avant le mélange.
- **Aucun blocage.** Vingt secondes sans réponse et les copies se recomposent.
  Le joueur n'a rien gagné, mais rien n'est cassé.
- **Aucune copie ne se distingue.** Même état, même échelle, même teinte, et
  surtout aucun point d'exclamation — la machine à états des ennemis en
  allumait un au-dessus des copies proches de Brad, ce qui attirait l'œil au
  pire moment.

### Les trois ajouts que tu as demandés

| Ajout | Ce qu'il fait |
|---|---|
| **Le manoir s'éteint** | Un dégradé radial centré sur Brad, jamais un interrupteur. Les copies luisent faiblement pour rester lisibles. |
| **Les lustres** | Trois plateformes traversantes au-dessus de l'arène. Contrairement au niveau 3, elles ne protègent de rien : le Séraphin vole, il monte y chercher Brad. |
| **Le piqué** | Il fond sur Brad juste après avoir encaissé un coup. Rester collé dessous à marteler coûte quelque chose. |

### Les Spectres, et ta remarque

Tu avais raison de la soulever. Les renforts sont des **Serra-Spectres verts**,
et deux règles les séparent des copies :

- ils **n'apparaissent jamais pendant un mélange** — ils s'évanouissent avec la
  lumière quand la duplication commence, et la vague suivante les remplace ;
- ils sont **rencontrés dans les couloirs, avant le combat**, seuls, sur un sol
  plein. Le joueur arrive donc dans la salle de bal en sachant déjà qu'un
  Spectre vert n'est pas une copie violette.

### La résistance

Il encaisse, il n'est pas invulnérable. La réduction s'applique en **fraction
accumulée** : trois coups valent exactement un point. Un arrondi aurait donné
soit zéro (invulnérable), soit un (aucune résistance). Un plafond par coup
complète la règle — une boule de Serrano renvoyée vaut 999 points de dégâts et
l'aurait couché d'un seul renvoi.

## Le niveau 7 : les barrières laser

Citées dans ta roadmap. Deux formes, et leur alternance fait tout le niveau :

- **haute** — elle descend au sol et monte au-dessus de la tête : on l'attend ;
- **basse** — elle s'arrête à mi-hauteur : on la saute, si on prend le bon
  moment.

Trois règles tenues par le code et vérifiées par le vérificateur :

1. **Rien ne clignote.** L'intensité monte et descend par une rampe continue de
   trois dixièmes de seconde. Mesuré : le plus grand écart entre deux images
   est inférieur à 4 %.
2. **Elle est visible éteinte** — émetteurs, pointillé, et un voyant vert qui
   sert de feu de circulation.
3. **Elle blesse, elle ne tue pas.** Deux points, jamais une mort instantanée.

Et une règle de pose : **aucune barrière à moins de deux tuiles du bord d'un
trou**. Une barrière qui s'allume pendant l'élan obligerait à s'arrêter au bord
du vide. Le vérificateur la refuse désormais, avec un minimum de voie libre qui
dépend de la forme — 1,5 s pour une haute qu'on ne peut qu'attendre, 1 s pour
une basse qu'un saut franchit.

## Trois défauts trouvés par la suite de tests, pas par la relecture

- **`genre` n'était pas transmis au moteur.** `chargerNiveau()` recopiait tous
  les champs de l'arène sauf celui-là : le niveau 6 déclarait bien
  « duplication » et le moteur jouait le blindage du niveau 3. Le Séraphin ne
  se divisait jamais.
- **`copie` est une propriété du type, pas de l'instance.** Le test
  `if (e.copie)` valait toujours `undefined` : les copies encaissaient des
  dégâts ordinaires et mouraient comme des ennemis banals. Frapper la bonne ne
  déclenchait rien, et le combat se gagnait uniquement à l'usure — en 108 s au
  lieu de 20.
- **L'obscurité ne se dissipait pas après la victoire.** Elle était gérée dans
  le scénario de duplication, qui s'arrête dès que le boss tombe — et comme on
  le tue assommé, la salle restait à moitié éteinte jusqu'à la porte.

## Deux corrections de confort

- Les copies ne font **aucun dégât au contact**. Neuf silhouettes qui piquent
  rendaient l'énigme injouable : Brad passait son temps à être repoussé au lieu
  de choisir. Le harcèlement, c'est le rôle des Spectres.
- **« blindé ! » ne s'affiche plus à tort.** Le message apparaissait en
  rebondissant sur le crâne de n'importe quel boss non écrasable, même quand il
  n'était pas en phase défensive.

## Vérification

- **82 vérifications automatisées**, 0 échec. Dont : le combat complet du
  Séraphin gagné en 20 s par un robot qui suit le vrai des yeux, les quatre
  phases obligatoires jouées, le filet anti-blocage déclenché, la mort en pleine
  obscurité, la boule de Serrano qui ne one-shot pas, et l'éventail de copies
  qui tient dans un écran (elles s'étalaient sur toute la largeur de l'arène :
  les extrémités sortaient du champ, et suivre le vrai devenait impossible).
- **Vérificateur de géométrie** : aucun défaut sur les neuf niveaux, barrières
  laser comprises.
- **Passe exploratoire** : menus, hub, six postes, achats en boucle, pause,
  trois morts d'affilée, camp d'entraînement, sauvegarde bricolée. Rien à
  signaler côté jeu.

## À faire ensuite

Niveau 8, puis l'espace (niveau 9, l'appareil à raclette et le troisième
mini-boss), puis le manoir de Kirby 67 et le combat final.

---

# Prototype 13 — le Séraphin, corrigé

## Trois corrections sur le mini-boss du niveau 6

**Écraser la bonne copie ne coûte plus rien.** Le géant se recomposait à
l'endroit exact où Brad venait d'atterrir, donc à son contact : **2 à 3 points
de vie pour avoir résolu l'énigme**, et une mort quand la barre était basse.
Trois changements, tous vérifiés :

- un ennemi **assommé ne blesse pas** — c'est une règle de justice autant que
  de lisibilité, un boss qui voit des étoiles ne peut pas mordre ;
- le géant réapparaît **décalé du côté opposé à Brad** et remonté d'un cran ;
- une seconde d'invincibilité, pour le cas où la géométrie de l'arène ne
  laisserait pas la place.

**La caméra se porte sur les copies.** Pendant la révélation elle y va
entièrement — le joueur n'a rien d'autre à faire que regarder. Pendant le
mélange elle en garde trois quarts, et elle rend la main à Brad au moment de
choisir, parce qu'à cet instant il faut de nouveau se déplacer. Le poids est
interpolé, jamais basculé : un saut de caméra au milieu d'une énigme visuelle
ferait perdre de vue exactement ce qu'on demande de suivre.

**Le piqué laisse le temps d'esquiver.** L'élan passe de 0,42 s à **0,9 s**, la
plongée de 560 à 460 px/s, et le repos de 2,6 à 3,2 s. Surtout, il **verrouille
sa cible au début de l'élan** et la montre par un trait au sol qui se resserre
à mesure que l'échéance approche. Avant, il visait la position de Brad au
moment où la plongée commençait : esquiver pendant l'élan ne servait à rien,
la cible suivait jusqu'au dernier instant.

## Un défaut de conception que le robot a révélé

En rendant le combat testable, la traversée automatique du niveau 6 s'est mise
à échouer une fois sur trois, toujours avec le même relevé : `pv 24/24,
cycle 0`. Le robot restait à l'entrée de l'arène sans entamer le boss.

La cause : le Séraphin planait à 118 px du sol. Avec un corps de 66 px, son
bas se trouvait **six pixels au-dessus du crâne de Brad**. Chaque coup exigeait
donc un saut, et comme la résistance ne laisse passer qu'un point tous les
trois coups, il en fallait **dix-huit qui portent** avant la première
duplication. Le combat n'atteignait jamais sa propre mécanique.

- Hauteur de vol : 118 → **96 px**. Le bas du boss descend dans la hauteur de
  Brad debout : on le frappe au sol, et le saut sert à le poursuivre.
- Seuils de duplication : 75/50/25 % → **90/60/30 %**. Le bonneteau est le cœur
  du combat, pas sa récompense finale.

Un joueur qui suit correctement le vrai gagne maintenant en **12 à 15 s** au
lieu de 20, et la traversée complète du niveau passe à chaque fois.

## Livraison des musiques

Le fichier envoyé au prototype 12 ne contenait que les deux pistes nouvelles —
c'était le lot d'ajout, pas la collection. Les **17 musiques** sont désormais
livrées en deux archives de 24 Mio (la conversation plafonne à 30 Mio par
fichier), et les mêmes deux lots existent dans `_envois-github/` : chacun passe
sous le plafond global de GitHub, qui refusait déjà un envoi de 48 Mo.

## Vérification

**88 vérifications**, 0 échec, stables sur trois exécutions consécutives. Les
huit nouvelles portent sur ces corrections : le coût nul de l'identification
sur les trois difficultés, la durée de l'élan, le verrouillage de la cible,
la position de Brad hors du point d'impact, le poids de la caméra pendant la
duplication, son cadrage réel sur le centre de l'éventail, et sa restitution
au moment du choix.

---

# Prototype 14 — le Séraphin domptable, la résistance qui se voit, les secrets

## Le bug du Séraphin : une erreur d'unité

Tu décrivais un boss qui fonce dès l'entrée et tient la vitesse de Brad. La
cause est une ligne que j'avais écrite au prototype 12 :

```js
const base = b.t.vitesse * vitesseEnnemiEffective() * 62;
```

J'avais pris `vitesseEnnemiEffective()` pour un multiplicateur autour de 1.
C'est une **vitesse en pixels par seconde** — 42 par défaut. Le facteur 62 la
multipliait une seconde fois : le Séraphin volait à **2 083 px/s**, huit fois
la course de Brad. Il traversait l'arène en un tiers de seconde et ne lâchait
plus jamais.

Sans le facteur, il vole à **92 px/s** — plus lent que la *marche* de Brad
(150). Mesuré : après huit secondes de course, Brad est à 449 px devant lui et
n'a pas perdu un seul point de vie.

**Et le contact ne blesse plus.** Depuis que je l'ai fait voler bas pour qu'on
puisse le frapper au sol, il touchait Brad rien qu'en existant. Seul son
**piqué** coûte désormais quelque chose : il est annoncé, visé, esquivable.
Un géant qui plane n'est pas une machine à dégâts.

**Une conséquence trouvée en testant** : on pouvait frapper la bonne copie
**pendant la révélation**, c'est-à-dire pendant que le jeu la désigne d'un halo
et d'une flèche. Un joueur rapide gagnait le combat sans jamais voir un seul
mélange. On regarde d'abord — le coup est refusé, et le jeu le dit.

## La résistance, refondue

Ton idée, et elle corrige un vrai défaut : l'ancienne formule réduisait les
dégâts de 5 % par palier, un effet réel mais que le joueur ne voyait **jamais**
— un coup à 3 restait un coup à 3 après arrondi.

Désormais : **5 % de chance par palier d'annuler entièrement un coup**, dix
paliers, jusqu'à 50 %. Un écusson bleu s'affiche, un son tinte, et on sait à
cet instant précis que l'achat vient de servir. Coût inchangé (30 BC, +5 par
palier).

Mesuré sur 4 000 coups par palier : 0 %, 25,4 % et 49,8 % de blocage pour 0, 5
et 10 paliers. Et un coup qui passe fait les **dégâts pleins** — il n'y a plus
de réduction cachée en plus du hasard.

## Les Brad Coins secrets

**Réponse à ta question : ils n'existaient pas.** Aucune trace dans le code.
Tu n'as pas manqué de chance, il n'y avait rien à trouver.

- **1,67 %** par élimination, le chiffre de ta roadmap. Mesuré sur 20 000
  éliminations : 1,66 %. **Jamais au camp d'entraînement** — vérifié sur 5 000
  éliminations, zéro.
- **+1 garanti par mini-boss**, lâché au sol comme la pièce de l'appareil.
- La pièce est **bleue, plus grosse, entourée d'un halo** : impossible de la
  confondre avec une pièce dorée. Une pièce qui tombe une fois sur soixante ne
  doit pas se rater faute d'être reconnue.
- **La section Secrets de la boutique reste fermée** jusqu'à la première
  trouvaille, comme tu le proposais — je suis d'accord, un onglet vide qu'on ne
  peut pas remplir est une promesse frustrante. Le BRADDY3000 l'annonce au
  retour à la base.
- **Le double saut** y coûte 1 BC secret. Les trois autres aptitudes de la
  roadmap sont annoncées mais pas achetables : un bouton qui ne fait rien est
  pire qu'une ligne de texte honnête.

## La fanfare de victoire

À la chute d'un mini-boss, la musique du combat **s'arrête net**, une fanfare
de trois secondes et demie joue seule, puis le thème du niveau revient en
fondu au bout de 4,2 secondes. Le retour est compté dans la boucle du jeu et
non par un minuteur : sinon la musique reviendrait pendant l'écran de pause.

La fanfare est **synthétisée** avec les mêmes oscillateurs que les autres sons
— il n'existe aucun fichier de musique de victoire dans le dossier. Le jour où
tu en auras un, il suffira de le jouer à la place : l'enchaînement ne changera
pas.

## La téléportation (panneau F1)

Choix du niveau, puis du point d'arrivée — début, premier quart, milieu, arène
du boss, devant la porte. Plus trois boutons de test : +100 BC, +1 BC secret,
vie au maximum.

Deux précautions : elle **débloque les niveaux précédents** (arriver au niveau
6 avec une carte qui prétend qu'on n'a pas fini le premier produirait des bugs
qui n'existent pas), et elle **pose la caméra et la zone à la main** au lieu de
les laisser rattraper.

## Vérification

**116 vérifications**, 0 échec, stables sur trois exécutions. Trois défauts de
la suite elle-même ont été corrigés au passage — des sections qui se
transmettaient un état : le robot de traversée héritait du double saut acheté
par le test des secrets et ratait la barre mobile du niveau 5, et le test des
lasers héritait d'une résistance à 50 % qui bloquait la moitié des tirs. Chaque
section repart maintenant d'un Brad nu.

Un défaut d'affichage trouvé par une capture : le libellé de la résistance
passait par-dessus la colonne « actuel : … ». Les deux textes sont désormais
bornés, et un test refuse tout libellé trop long pour sa colonne.


---

# Prototype 15 — Paris, le tokamak, la Lune et le Serra-Balistique

## La renumérotation

Le complexe scientifique était le niveau 7 et jouait la musique n° 7. Il joue
désormais la n° 8, et il **est** le niveau 8. Le niveau 7 devient **Paris**, et
garde la musique n° 7.

Concrètement : `niveaux/niveau7.js` a été entièrement réécrit (les toits de
Paris), `niveaux/niveau8.js` reprend le complexe. Tout ce qui parlait du
niveau 7 a suivi — les répliques du BRADDY3000 au retour de mission, ses
conseils sur les barrières laser, la suite de tests. Deux vérifications
existent maintenant exprès pour ce genre de décalage : elles refusent un
niveau 7 qui aurait des lasers, et un niveau 8 qui ne jouerait pas la n° 8.

**Deux musiques manquent encore** : `niveau8` et `niveau9`. Elles ne m'ont
jamais été transmises. Le jeu les demande sous les noms `assets/audio/niveau8`
et `assets/audio/niveau9` ; tant qu'elles ne sont pas là, ces deux niveaux se
jouent en silence et le menu principal affiche « 2 pistes audio introuvables ».
Il suffit de déposer les fichiers sous ces noms.

## Le réacteur qu'on ne voyait pas — la vraie cause

Tu avais signalé qu'en franchissant le sas de la deuxième zone du complexe, on
ne percevait pas le réacteur. Ce n'était pas une question d'éclairage.

`dessinerTuyaux()` **repeignait l'écran entier** avant de dessiner ses tuyaux.
Elle servait à deux endroits opposés : comme première couche, où c'est
exactement ce qu'il faut, et comme couche avant, par-dessus une machine déjà
dessinée. La salle appelait donc `dessinerReacteur(...)` puis
`dessinerTuyaux(...)`, et la seconde effaçait la première. Le réacteur était
dessiné à chaque image, puis recouvert avant d'être montré. Il n'a jamais
manqué de lumière : il manquait d'exister à l'écran.

La fonction distingue désormais ses deux usages. En couche avant, elle ne pose
aucun fond et ses tuyaux passent en silhouette sombre — ce qui est de toute
façon ce qu'on voit d'un tuyau placé devant une machine allumée.

À la place du réacteur, la salle abrite maintenant un **tokamak** : la chambre
torique d'un réacteur à fusion, avec son plasma qui pulse et ses dix bobines de
champ. Clin d'œil à CORE, et une forme qu'on reconnaît d'un coup d'œil.

## Paris

Deux zones : les toits de zinc à l'aube, puis au-dessus des cheminées en plein
jour. Le tracé est le plus **vertical** du jeu — on monte autant qu'on avance.
Les échafaudages sont des barres mobiles, les balcons des plateformes
traversantes : aucune mécanique nouvelle, et c'est délibéré. Les quatre niveaux
précédents en ont chacun introduit une ; en empiler une cinquième ici ferait un
jeu qui n'apprend plus rien au joueur, il l'assomme.

La Tour Eiffel est posée une seule fois, jamais répétée. Elle a demandé trois
corrections, toutes du même genre :

- elle était placée « à la tuile 132 » alors que les couches de fond ont leur
  propre repère : elle ne serait entrée dans le cadre qu'à la tuile 750 d'un
  niveau qui en compte 250. Elle était dessinée à chaque image, toujours hors
  champ ;
- son arche était creusée avec `destination-out`, qui efface **tout** ce qui a
  déjà été dessiné : elle perçait un trou noir en forme d'arche dans le ciel.
  Elle est maintenant un seul tracé rempli en `evenodd`, comme l'anneau du
  tokamak ;
- à 268 px son sommet sortait de l'écran, à 206 px elle passait sous la ligne
  des toits. 240 px la font dépasser d'une vingtaine de pixels.

## La cinématique de la fusée

Elle se joue **une fois**, entre le choix de la mission sur la carte et le
chargement du niveau 9, et nulle part ailleurs — ni au retour, ni en rejouant,
ni depuis le panneau de téléportation. Le BRADDY3000 a construit une fusée
derrière la base ; il prévient que la lune du monde parallèle pèse moins, et
qu'il y tombe des cailloux. Deux fonds dessinés en primitives : le pas de tir,
et la Lune vue de l'espace.

Le fil était posé depuis le niveau 3 : « la dernière pièce est loin, très loin.
Il faudra une fusée, et je préfère t'en parler plus tard. »

## Le niveau 9 : la Lune

`gravite: 0.55`, un **multiplicateur** du réglage global — le curseur
« Gravité » du panneau continue de piloter tout le jeu, et la Lune reste légère
quel que soit le réglage. Tout ce qui tombe le subit : Brad, les Serra, les
boules, les pièces. Une lune où seul le héros flotte se lirait comme un bug.

|                    | Terre  | Lune   |
|--------------------|--------|--------|
| hauteur de saut    | 74 px  | 134 px |
| portée au pas      | 94 px  | 171 px |
| portée en course   | 157 px | 285 px |

Le tracé suit ces chiffres au lieu de recopier ceux des huit niveaux
précédents : trous de six à sept tuiles au lieu de quatre, plateformes à quatre
puis huit rangées du sol. On saute exactement autant qu'avant ; c'est le décor
qui a grandi autour du saut. Le vide le plus large fait sept tuiles, soit moins
que la portée **au pas** : aucune course n'est jamais obligatoire.

Le vérificateur de niveaux calcule désormais ces portées **par niveau**, à
partir de la gravité déclarée. Lui appliquer la gravité terrestre condamnerait
des plateformes parfaitement atteignables et, pire, laisserait passer des trous
infranchissables.

La Terre est visible au fond, et elle a demandé la même correction que la Tour
Eiffel : posée à 1400 px d'un monde qui en fait 6624, elle n'entrait jamais
dans le cadre.

## Le mini-boss : le Serra-Balistique

Un Serra-Lanceur nourri, avec des jambes. **Troisième genre de combat** du jeu
(`genre: 'asteroides'`), à côté du blindage du Colosse et de la duplication du
Séraphin. Les deux autres n'ont pas été touchés.

Le principe en une phrase : **les poings ne suffisent pas, c'est le ciel qui
frappe**. Le champ d'astéroïdes bombarde la salle en continu, et chaque impact
est annoncé une seconde et demie à l'avance par un cercle au sol **posé là où
se trouve Brad**. D'où le combat : rester sur le cercle, laisser le Balistique
venir — il marche vers Brad à 67 px/s, contre 150 au pas — et s'écarter au
dernier instant.

Ce que cette construction garantit :

- **aucun hasard.** Le marquage suit Brad ; c'est lui qui choisit où tombera le
  prochain rocher. Rater l'appât est une erreur de placement, pas un tirage ;
- **deux esquives.** S'écarter, ou sauter — un astéroïde ne touche que ce qui
  est près du sol, et le saut lunaire monte à 134 px. Les deux laissent le boss
  dessous ;
- **aucun blocage.** Sa coque n'est pas une invulnérabilité : elle ne laisse
  passer qu'un quart des dégâts, donc le joueur qui n'a rien compris finit par
  gagner au poing — en cent vingt coups. Personne ne le fait par accident, et
  personne n'est enfermé ;
- **une fenêtre de dégâts propre.** Un impact l'assomme trois secondes, et la
  pluie s'arrête pendant ce temps. On ne lui fait pas payer sa récompense.

La boule renvoyée, qui couche un Lanceur ordinaire d'un seul coup, est plafonnée
sur lui : sa parade familière marche encore, elle ne suffit plus.

## Trois bugs trouvés par les tests, pas par la relecture

**Le modulo négatif.** `rangeeDeFond()` numérote les motifs de décor par leur
indice dans le monde, et cet indice est **négatif** au début d'un niveau. Or en
JavaScript `(-7) % 4` vaut `-3`. Trente et une variations de décor renvoyaient
donc des valeurs négatives sur les premiers écrans — et sur la Lune, un rayon
de cratère de −6 px, que `ctx.ellipse()` refuse net : le rendu du niveau 9
s'arrêtait sur une exception dès la première image. Toutes passent maintenant
par `restePositif()`. (Elle ne s'appelle pas `motif` : trois fonctions du
fichier déclarent déjà un tableau local de ce nom, et l'appel s'y résolvait.)

**`undefined <= 0` vaut faux.** `assomme` n'était posé que par les combats qui
s'en servent, et valait `undefined` partout ailleurs. Toute condition écrite
« tant qu'il n'est pas assommé » était donc ignorée sur un ennemi qui ne
l'avait jamais été — c'est ce qui empêchait la pluie d'astéroïdes de
**commencer**. Le champ est maintenant initialisé à zéro à la création.

**Le rebond sans fin.** Sauter sur un Serra-Lanceur ne l'écrase pas : Brad
rebondit et se fait pousser de côté. Le robot d'exploration, lui, repousse
« droite » à l'image suivante, retombe au même endroit, rebondit encore — et
sur la Lune, où un rebond dure plus d'une demi-seconde, la boucle ne s'arrête
jamais. Il est resté six minutes à la tuile 147 d'un niveau que l'autre robot
traverse en 56 secondes. **Le défaut était dans le robot**, pas dans le
niveau : un joueur lâche la touche. On le lui a appris.

## Vérification

**154 vérifications**, 0 échec. Vingt-six sont nouvelles et portent sur la
Lune : la gravité mesurée en faisant sauter Brad pour de vrai sur les deux
planètes, le marquage posé sous Brad, le préavis d'une seconde et demie, l'appât
qui coûte sept points de vie au boss et zéro à Brad, les deux esquives, les deux
bords de la coque, la pluie qui se tait pendant l'assommage, la fuite possible,
et la cinématique qui ne se rejoue jamais.

Les 404 des deux musiques manquantes sont désormais **jugés séparément** : la
console disait « Failed to load resource » quatre fois sans dire laquelle, et
on ne pouvait pas distinguer un script absent d'une musique attendue. Le test
relève maintenant l'adresse de chaque ressource introuvable et n'accepte que
`niveau8` et `niveau9`.

Le vérificateur de géométrie passe sur les onze niveaux, avec la gravité de
chacun : aucun défaut.

## À faire ensuite

Le niveau 10 : le manoir de Kirby 67 et le combat final. C'est le dernier, et
c'est le seul qui reste.


---

# Prototype 16 — le manoir de Kirby 67, et le combat final

Le jeu a une fin.

## Kirby 67, en pixels

Sa planche **dérive de celle de Brad** : mêmes proportions, mêmes douze images,
même trait, même cadence d'animation. Le dessiner à part aurait donné deux
styles côte à côte — deux épaisseurs de contour, deux façons d'ombrer — et ils
partagent l'écran pendant deux combats et cinq cinématiques.

`tools/kirby_sprite.py` ne change que l'habillement : t-shirt cyan à manches
courtes avec les avant-bras nus, jean bleu foncé, baskets claires, cheveux
châtain foncé, barbe de trois jours. Le visage, la silhouette et les
animations sont ceux de Brad.

**Une précision sur la photo que tu m'as envoyée.** J'ai travaillé à partir de
ta *description* — t-shirt cyan, jean bleu foncé, cheveux courts bruns, barbe —
et pas du visage. Je ne peux pas confirmer de qui il s'agit sur cette image, et
faire d'une personne réelle identifiable le méchant d'un jeu n'est pas quelque
chose que je ferai. À 36 × 48 pixels, la différence est nulle à l'écran : ce
sont la silhouette et les couleurs qui font le personnage.

Trois corrections ont été nécessaires sur la recoloration, et elles disent
toutes la même chose — **on ne peut pas repeindre une veste en t-shirt** :

- classer les pixels par rôle (costume / chemise / cravate) conservait le
  modelé du costume : revers, ouverture, plastron. Kirby 67 portait un *blazer*
  cyan. Il a fallu repeindre par bande et supprimer le trait intérieur ;
- les cheveux blonds et la peau éclairée des mains tombent dans la même
  fourchette de couleur : sans borne de lignes, il avait les mains brunes ;
- les mèches des tempes, elles, ne se distinguent pas de l'ombre de la joue par
  la couleur. C'est leur **position** qui tranche : les quatre colonnes
  extérieures de la tête.

## Le niveau 10 : le manoir

Trois zones — le parc d'honneur, la galerie des trophées, la salle du trône.
Tu voulais qu'il ne ressemble pas au manoir hanté du niveau 6 ; trois règles
suffisent à ce qu'ils ne se croisent jamais :

|                | Niveau 6 (hanté)          | Niveau 10 (chic)            |
|----------------|---------------------------|-----------------------------|
| lumière        | elle manque partout       | lustres, appliques, vitrines |
| palette        | violet, bois, froid       | marbre crème, or, bordeaux  |
| composition    | tout est de travers       | tout est aligné au pixel    |

Et partout du serrano exposé comme un trophée de chasse : quarante et une
vitrines, chacune avec sa meule sous une lumière rasante.

**La garde**, comme demandé : des Serra en livrée, mêmes dessins, mêmes
comportements, mais deux à six fois la vie et deux à trois fois les dégâts.
Une subtilité d'équilibrage qui compte — les points de vie ne protègent que des
**coups de poing** ; un saut sur la tête tue toujours en une fois. Le Garde
ordinaire reste donc écrasable (il punit celui qui martèle, pas celui qui
saute), le Garde-Lourd et le Hallebardier non.

## Le premier combat

`genre: 'kirby'` — le **quatrième** scénario de combat du jeu, à côté du
blindage, de la duplication et des astéroïdes. C'est le plus direct des quatre,
et c'est délibéré : à la onzième heure, une cinquième règle à apprendre
retarderait le joueur au lieu de le récompenser. On frappe Kirby 67, il perd de
la vie.

Ce qu'il a à la place, c'est un rythme : il roule des meules (qu'un coup de
poing brise), il aspire, il charge, il appelle sa garde. **Deux de ces gestes —
l'aspiration et la charge — sont exactement ceux du combat final.** On les
apprend ici, seuls et sans danger, pour ne pas les découvrir là-bas sous trois
attaques simultanées. C'est la raison d'être de ce premier combat.

Il ne meurt pas : sous 4 PV, le combat s'arrête de lui-même et la cinématique
prend la main. Il fallait bien qu'il reste debout pour se relever.

## L'acte final

Quatre cinématiques, chacune avec son déclencheur :

1. **l'arrivée au manoir** — une seule fois, au départ depuis la carte ;
2. **l'explosion** — il se relève, fait sauter quarante et une vitrines et
   deux cents mètres de tapis rouge, et passe dans le monde réel. Direction
   Lille, Grand-Place. Le BRADDY3000 explique pourquoi ce n'est pas un hasard ;
3. **le portail**, monté au fond de la base. Le BRADDY3000 demande « ES-TU
   SÛR ? » et rappelle combien de Brad Coins il reste — la boutique est sur le
   chemin du portail, ce n'est pas un hasard non plus ;
4. **la fin**, quand Kirby 67 s'assoit sur le pavé mouillé.

Le costume d'or ne se débloque plus « en terminant dix niveaux » (ce qui
tombait au retour de la Lune) mais **en battant Kirby 67 pour de bon**.

## Le combat final, à Lille

Un fichier à part, `js/final.js`, avec sa propre simulation et son propre
rendu. Le moteur du jeu est un plateformer en coupe ; ce combat se joue sur une
**place** — on tourne autour de l'adversaire, on s'écarte d'une meule qui
arrive de face. Ajouter un axe de profondeur au moteur aurait touché chaque
collision, chaque ennemi et chaque niveau déjà validé. Là, rien de ce qui
marche ailleurs ne peut casser, et réciproquement.

**La perspective** tient en six lignes — une projection en trou d'épingle :

```
d  = z + DIST_CAM          distance du point à la caméra
k  = FOCALE / d            échelle à cette distance
sx = LARGEUR/2 + (x - cam) * k
sy = HORIZON + (HAUTEUR_CAM - y) * k
```

Le sol est un damier dont les bandes se resserrent vers le fond, les
personnages sont des sprites multipliés par `k`, et l'ordre de dessin est
simplement l'ordre des `z` décroissants. Aucune bibliothèque, aucun WebGL, et
la page reste ouvrable par double-clic.

**Les règles.** Kirby 67 a trois points de vie, et une seule chose peut les lui
retirer : une onde de Brad-Shy **chargée à bloc, tirée de près**. Les poings ne
lui font rien — et le jeu le dit à chaque coup dans le vide, plutôt que de
laisser croire à un bug.

La jauge se remplit en abattant les Serra qu'il envoie. Ses vagues ne sont donc
pas une nuisance ajoutée pour l'intensité : **ce sont les munitions**. Sans
elles on ne peut pas gagner ; avec elles, rester en vie devient le problème.
Les deux moitiés du combat se tiennent.

À chaque point de vie perdu, une mécanique de plus, et il peut les enchaîner :

| PV restants | ce qu'il a |
|-------------|------------|
| 3           | l'aspiration |
| 2           | + la charge téléguidée |
| 1           | + la pluie de meules |

**Les commandes changent**, et c'est la seule fois du jeu : on ne saute pas sur
une place, on s'écarte. Les flèches (ou ZQSD) déplacent dans les quatre
directions, **Espace devient une esquive** — un bond court, invincible, suivi
d'un temps de recharge. X frappe les Serra, C tire l'onde. Un bandeau le
rappelle au début du combat.

## Quatre bugs trouvés par les tests

**`undefined <= 0` vaut faux.** Encore. `reposCharge` valait `undefined` tant
que le pilotage n'avait pas tourné une fois, et la condition « la charge est
rechargée » était donc fausse au premier tour : Kirby 67 ne chargeait **jamais**
au manoir. C'est exactement le piège qui empêchait la pluie d'astéroïdes de
démarrer au prototype 15. Toutes ces conditions s'écrivent maintenant `!(x > 0)`.

**Le boss agissait pendant sa propre charge.** La phase retombait à « attente »
dès l'image suivante, parce qu'elle ne testait que la course et pas l'élan qui
la précède. Il roulait une meule au milieu de sa course, ou relançait une
seconde charge par-dessus la première.

**L'aspiration ne se déclenchait presque jamais.** Elle demandait 190 px
d'écart, alors que Kirby 67 vise une distance de confort de 150 et s'y tient à
quarante pixels près. Un joueur qui restait au contact ne voyait donc jamais le
geste que le manoir est justement chargé de lui apprendre.

**Trois quarts de l'écran ne montraient rien** dans la première version de
l'arène finale : les façades étaient posées sur la ligne d'horizon, et entre
elles et le terrain jouable s'étalaient cent trente pixels de sol vide. Elles
sont maintenant posées sur le **fond de la place**. Ce qui remplissait de vide
est devenu la Grand-Place.

## Vérification

**206 vérifications, 0 échec.** Cinquante-deux sont nouvelles :

- la garde du manoir existe, est plus dure, et reste écrasable là où il faut ;
- Kirby 67 est lu comme une planche d'animation, pas comme un sprite ;
- le combat du manoir s'arrête **avant** sa mort, appelle ses trois vagues, et
  joue bien ses quatre gestes ;
- l'aspiration déplace Brad **sans le blesser** ;
- le portail n'existe qu'entre les deux combats et demande confirmation ;
- **cinquante coups de poing ne font rien à Kirby 67** ; l'onde à jauge vide
  est refusée ; l'onde tirée de trop loin le rate mais consomme la jauge ;
  l'onde pleine et proche lui retire un point de vie et le sonne ;
- les trois paliers ne donnent jamais une mécanique avant son heure ;
- frapper dans le vide ne charge rien, abattre un Serra charge ;
- **le combat se gagne** (32 s de simulation, 4 PV sur 24 restants) et **ne se
  gagne pas en restant immobile** ;
- les quatre cinématiques existent, ne se rejouent pas, et le costume d'or ne
  s'obtient qu'à la vraie fin.

Le manoir est traversé par le robot jusqu'à la salle du trône en 21,6 s. Il
n'est pas dans la liste des « traversées complètes », et ce n'est pas un
oubli : sa porte ne se franchit jamais, la cinématique la remplace.

Le vérificateur de géométrie passe sur les douze niveaux.

## Les musiques

Cinq manquent maintenant, toutes déclarées et attendues sous ces noms :

| fichier attendu | à quel moment |
|-----------------|---------------|
| `assets/audio/niveau8.m4a`  | le complexe scientifique |
| `assets/audio/niveau9.m4a`  | la lune |
| `assets/audio/niveau10.m4a` | le manoir de Kirby 67 |
| `assets/audio/mini-kirby.m4a` | le premier combat, salle du trône |
| `assets/audio/mega-kirby.m4a` | le combat final, à Lille |

Le menu principal les signale (« 5 pistes audio introuvables ») au lieu de se
taire. Dépose-les sous ces noms, ou envoie-les-moi et je te renvoie le lot
converti en `.m4a` + `.mp3`.

## Ce qui reste

Rien, pour ce jeu. Il a un début, dix niveaux, quatre mini-boss, un boss final
et une fin. Le reste, c'est le kart.

---

# Prototype 17 — deux corrections, et le générique

## Les deux corrections demandées

### 1. La fin du combat du manoir était brutale

**C'était vrai.** Le dernier coup de poing et la boîte de dialogue tombaient
sur la **même image** : rien entre les deux. On frappait, et on lisait.

Il y a maintenant **trois secondes** entre les deux, et elles sont occupées :

| moment | ce qui se passe |
|--------|-----------------|
| 0,0 s | Kirby 67 tombe à genoux, la musique s'arrête en fondu (1,4 s), l'écran tremble |
| 0,0 → 2,6 s | le bandeau **« KIRBY 67 EST À GENOUX »** |
| 0,0 → 3,0 s | la garde encore debout quitte la salle, les meules disparaissent |
| 1,6 → 3,0 s | l'écran se ferme au noir |
| 3,0 s | la cinématique prend la main, écran déjà noir |

Pendant ces trois secondes **les commandes ne répondent plus** — volontairement.
Sans ça, Brad continuait de courir et de frapper sous le bandeau, ce qui
ressemblait à un bug plutôt qu'à une fin de combat.

Une conséquence à laquelle je ne m'attendais pas : **Kirby 67 à genoux pouvait
encore être tué**. Un coup en retard, une meule encore en vol, et il tombait à
0 PV — alors qu'il doit se relever pour faire exploser le manoir. `blesserEnnemi`
refuse maintenant tout dégât à un ennemi à genoux.

### 2. Le jeu ne répondait plus après le combat final

**C'était un vrai bug, et il était grave** : gagner le jeu l'empêchait de
continuer.

La cause exacte. Le décompte qui lance la fin (`attenteFin`) vivait dans
`majOndesFinales`, appelée **après** cette ligne :

```js
if (finale.fini || finale.mort) return;
```

Kirby 67 abattu, `finale.fini` passait à `true` — et la fonction qui devait
compter les trois dernières secondes n'était plus jamais atteinte. Le décompte
restait figé, `terminerLeJeu()` n'était jamais appelé, et l'arène gardait la
main pour toujours.

Le décompte est maintenant dans `majMinuteursFinal(dt)`, appelée depuis une
branche dédiée à `finale.fini` : la simulation s'arrête, le décompte continue,
la caméra glisse doucement de Brad vers Kirby. C'est **exactement la même faute**
que celle du manoir un an de code plus tôt : *un compteur placé derrière un
`return` ne compte plus.* Les deux sont maintenant devant.

## Le générique

Il se joue quand la dernière cinématique s'achève, et il suit ta liste dans ton
ordre. **Pas de défilement** : une catégorie occupe l'écran, s'efface, la
suivante arrive.

| s | catégorie | contenu |
|---|-----------|---------|
| 1,5 | Idée originale de | IMAGINe Studio |
| 9,5 | Développement | HwR Engine |
| 17,5 | Échantillons de musiques par | Mixvibes |
| 25,5 | Musique | lılyº |
| 33,5 | **Propulsé par** | GitHub, puis Opus 5, puis Netlify — **le titre ne bouge pas** tant que les trois ne sont pas là |
| 47 | L'univers Brad Bitt créé par | H.D.N |
| 55 | Merci | à mes amis / pour leurs idées des plus farfelues |
| 62 | *(carte de titre)* | BRAD BITT — mais le jeu |
| **69** | **Voix de Brad Bitt** | **1 min 09**, comme demandé |
| 80 | Le bestiaire | les douze Serra croisés en chemin |
| 94 | Cette partie | tes chiffres à toi |
| 106 | Une précision | la mention sur les agents conversationnels |
| **122** | *(reprise)* | **2 min 02** : il ne reste que **MERCI D'AVOIR JOUÉ** |

Les quatre cartes ajoutées (titre, bestiaire, statistiques, précision) sont là
pour la raison que tu donnais : **tenir jusqu'à 1 min 09 sans étirer les
premières**. Elles se retirent en supprimant leur ligne dans `CARTES`, en haut
de `js/generique.js` — tout le générique se règle là, sans toucher au rendu.

### Le calage sur la musique

Dépose `assets/audio/generique.m4a` et **rien n'est à recalculer** : le jeu lit
la durée réelle de la piste et fait finir le générique avec elle. Tant qu'elle
manque, il dure 2 min 48 par défaut. Une piste tronquée ou illisible ne le
raccourcit pas — c'est vérifié.

### La fin

Sur la dernière carte, deux boutons : **Menu principal** et **Retour à la base**.
Sans rien toucher, la dernière note renvoie au menu. Espace saute directement à
cette carte, mais **seulement avant la reprise** — après, il valide le bouton
choisi.

### Les confettis

Ils tombent à l'arrivée sur le menu, et **à chaque lancement du jeu une fois
terminé** — une seule bordée par session, pas à chaque aller-retour dans les
options.

## Trois chiffres qui mentaient

La carte « Cette partie » lisait **le contenu des poches** là où elle annonce
« gagnés » et « trouvés ». Une partie où l'on avait tout dépensé en boutique se
racontait donc comme une partie où l'on n'avait rien ramassé. Deux compteurs
cumulés (`piecesGagnees`, `secretsTrouves`) ont été ajoutés, et ils survivent
aux achats.

Le troisième : **le combat final ne comptait dans aucun temps de jeu**. Il n'est
pas un niveau, il ne passe donc par aucun bilan de fin de niveau — ses minutes
n'étaient additionnées nulle part. Elles le sont maintenant.

## L'aspiration de Kirby 67 était impossible à fuir

Trouvée en équilibrant, pas signalée — mais elle méritait d'être corrigée : la
bannière disait **« IL ASPIRE — ÉLOIGNE-TOI »** alors que le jeu l'interdisait.
L'aspiration tirait à **260 px/s** quand Brad court à 190, et elle mordait à
chaque fenêtre d'invincibilité, soit 4 à 6 PV par aspiration.

Trois changements : la traction passe à **165 px/s** (on recule, lentement, mais
on recule) ; **l'esquive brise l'aspiration** ; et **une seule morsure par
aspiration**. Le robot de test est passé de 7 victoires sur 8 à **8 sur 8**, en
finissant avec 6 à 21 PV sur 24 au lieu de 3.

## Vérification

**242 vérifications, 0 échec.** Trente-six sont nouvelles :

- la respiration du manoir dure plus de deux secondes, Kirby 67 y **reste
  vivant, à genoux**, la salle se vide de sa garde, et **le joueur ne peut plus
  agir** (moins de 2 px parcourus en une seconde de touches enfoncées) ;
- la cinématique arrive **après**, jamais pendant ;
- la fin du combat final **n'est plus figée** : elle arrive, mais pas
  immédiatement — plus de 2,5 s de pause avant la boîte de dialogue ;
- le générique se dessine de bout en bout sans une erreur, sur ses quinze
  cartes ;
- à 1 min 12 on est bien sur la carte de la voix, à 2 min 10 il ne reste que le
  remerciement ;
- les deux boutons renvoient où il faut, et **ne rien faire** renvoie au menu à
  la dernière note ;
- Espace saute à la fin **avant** la reprise, et valide **après** ;
- sans piste, le générique garde sa durée de repli ; une piste tronquée ne le
  raccourcit pas ; une vraie piste commande la durée ;
- pas de confettis avant d'avoir fini le jeu, des confettis après, **une seule
  bordée par lancement**, et ils finissent par disparaître ;
- les Brad Coins gagnés et les secrets trouvés **survivent à la boutique** ;
- le combat final compte dans le temps de jeu.

Le vérificateur de géométrie passe sur les douze niveaux. Les six traversées
robot et celle du manoir passent aussi.

## Une anomalie de robot, pas de jeu

La passe exploratoire signale « traversée niveau3 : temps écoulé ». **Ce n'est
pas un défaut du niveau**, et je l'ai reproduit avant de le dire : le robot
court tout droit et saute un trou au moment précis où un **Serra-Boost** charge
dans sa direction. Il le prend en pleine course au-dessus du vide, se fait
repousser vers l'arrière et tombe. Les niveaux 1 et 2 échouent de la même façon,
au même genre d'endroit. Un joueur voit la charge arriver ; le robot, non.

Je ne l'ai pas « corrigé » : il n'y a rien à corriger dans les niveaux. Je le
signale pour que le rapport de la passe exploratoire soit lisible.

## Les musiques

Six manquent, toutes déclarées et attendues sous ces noms :

| fichier attendu | à quel moment |
|-----------------|---------------|
| `assets/audio/niveau8.m4a`  | le complexe scientifique |
| `assets/audio/niveau9.m4a`  | la lune |
| `assets/audio/niveau10.m4a` | le manoir de Kirby 67 |
| `assets/audio/mini-kirby.m4a` | le premier combat, salle du trône |
| `assets/audio/mega-kirby.m4a` | le combat final, à Lille |
| `assets/audio/generique.m4a` | **le générique** |

Le menu principal les signale (« 6 pistes audio introuvables ») au lieu de se
taire. Dépose-les sous ces noms, ou envoie-les-moi et je te renvoie le lot
converti en `.m4a` + `.mp3`.

## Deux choses à me dire

1. **« Voix de Brad Bitt : Brad Bitt (lui-même) »** est un gag de remplacement.
   Donne-moi le vrai nom et je le change — c'est une ligne dans `CARTES`.
2. Le **bandeau de mise au point** en bas de l'écran (`vx 0 · saut 74px · sol ·
   ennemis 1/1 · 60fps`) s'affiche toujours pendant le jeu. Il est utile pour
   déboguer, mais il n'a rien à faire dans une version jouable. Je peux le
   passer sous F1 avec le reste — dis-moi.

---

# Prototype 18 — la bande-annonce, calée sur la musique

## Ce que l'analyse du morceau a donné

Tu as demandé si je pouvais analyser un fichier audio et faire tomber les
coupures dessus. Voici ce que « Like this » a donné — mesuré, pas estimé.

### Le fichier

WAV 48 kHz stéréo 16 bits, PCM non compressé, 2 min 32,6. Crête vraie
**−0,2 dBFS**, aucun échantillon écrêté, **−13,8 LUFS** intégré, plage de
dynamique 3,6 LU, décalage continu négligeable. Techniquement irréprochable.

### Le tempo

**70,003 BPM.** Ce n'est pas un arrondi de complaisance : sur les 177 temps
détectés, l'écart moyen à une grille parfaite est de **7,6 ms**. Le morceau est
quantifié.

| grandeur | valeur |
|---|---|
| un temps | 0,857110 s |
| une mesure | 3,428440 s |
| premier temps | 0,0379 s |
| durée | 44 mesures, dernier son à 2 min 30,87 |

### Où tombe le premier temps

La question n'est pas anodine : se tromper d'un temps, c'est monter tout le
film à contretemps. La détection d'attaque en pleine bande donnait une réponse,
la structure du morceau en donnait une autre. J'ai tranché en séparant les
instruments :

| emplacement | grave (< 120 Hz) | aigu (1,8–6 kHz) |
|---|---|---|
| **temps 1** | **110,8** | 68,1 |
| temps 2 | 46,8 | **113,6** |
| temps 3 | 3,6 | 80,9 |
| temps 4 | 41,1 | **117,7** |

La grosse caisse marque le 1, la caisse claire les 2 et 4, et le 3 n'a presque
aucune basse. C'est un placement de batterie de manuel, et il ne laisse aucun
doute : la mesure commence à 0,0379 s. La détection en pleine bande s'était
laissé tromper par la caisse claire, plus forte que la grosse caisse.

### La structure

**Des blocs de 12 mesures exactement.** Les quatre changements tombent sur des
débuts de mesure à moins de 20 ms près.

| section | mesures | de | à |
|---|---|---|---|
| intro | 1–4 | 0:00,04 | 0:13,75 |
| **refrain** | 5–16 | 0:13,75 | 0:54,89 |
| couplet | 17–28 | 0:54,89 | 1:36,03 |
| **refrain** | 29–40 | 1:36,03 | 2:17,18 |
| outro | 41–44 | 2:17,18 | 2:30,87 |

Tu avais raison : le refrain revient **deux fois**, identique.

## Le montage du morceau

Tu as choisi 1 min 09 : mesures 1–16, puis 41–44. Le raccord est à **0:54,89**,
exactement sur une barre de mesure — la fin du refrain enchaîne sur l'outro.

Fondu croisé à puissance constante de 0,15 s, centré sur le raccord, pour que
la réverbération du refrain ne soit pas coupée net. Puis **−1 dB de marge**
avant encodage : à −0,2 dBFS, un encodage avec perte peut faire dépasser 0 dB à
la lecture et grésiller.

**Le résultat a été vérifié, pas supposé :**

- durée **68,6067 s**, soit 20 mesures à la milliseconde près ;
- tempo après montage : **70,007 BPM** (70,003 avant) — la pulsation n'a pas
  bougé ;
- un temps est détecté **exactement sur le raccord** (54,892 s), et les
  intervalles qui suivent font 859 ms, la valeur nominale ;
- pas de clic : le plus grand saut d'échantillon au raccord vaut **0,206**,
  contre **0,560** ailleurs dans le morceau. Le raccord est plus doux qu'une
  attaque de batterie ordinaire.

La piste est livrée sous `assets/audio/bande-annonce.m4a` et `.mp3`. Les deux
encodages ressortent **alignés à l'échantillon** sur la source.

## La bande-annonce

Un bouton **« Bande-annonce »** au menu principal. 28 plans sur 20 mesures.

**Rien n'est pré-calculé.** Les plans de jeu font tourner le moteur : le décor
défile, les Serra se réveillent et patrouillent, Brad court pour de vrai. Ce
qui est à l'écran est le jeu, pas une image du jeu. Charger un niveau coûte
entre 0,02 et 0,22 ms — on peut donc changer de décor sur un temps sans le
moindre à-coup.

**L'horloge du montage est `audio.currentTime`, jamais un compteur interne.**
Un compteur interne dérive : une image sautée, un onglet ralenti, et l'image ne
tombe plus avec le son. On avance localement pour la fluidité, et on se recale
sur la piste dès que l'écart dépasse 60 ms. Sans piste (fichier absent, lecture
refusée), le compteur interne prend le relais et le montage tourne en silence.

**Mesure :** les 27 coupures tombent à **4,0 ms** de leur temps en moyenne,
**8,1 ms** au pire. Une image à 120 Hz dure 8,3 ms.

### Le déroulé

| mesures | contenu |
|---|---|
| 1–4 | logos IMAGINe et HwR, puis Brad dans les tournesols, au pas |
| 5–6 | la discothèque, la ville — coupures à la demi-mesure, éclair blanc sur l'entrée |
| 6–7 | **« 10 NIVEAUX FARFELUS »** |
| 7–9 | tournesols, vallée, ville gelée, manoir hanté |
| 9–10 | **« DES BOSS QUI NE RIGOLENT PAS »** |
| 10–12 | le Colosse, le Séraphin, le Balistique — au contact |
| 12–13 | **« UNE BASE, UNE BOUTIQUE ET UNE SALLE D'ARCADE »** |
| 13–14 | la base |
| 14–15 | les toits de Paris, la salle du tokamak |
| 15 | **rafale** : quatre plans, un par temps |
| 16 | **Kirby 67 à contre-jour** — tenu une mesure entière |
| 17–20 | le titre, la bêta, la sortie, les deux studios |

Kirby 67 n'apparaît qu'en silhouette : ni son visage, ni l'arène finale. La
bande-annonce sort avant la bêta, la fin du jeu reste une surprise.

### L'interface disparaît

Une bande-annonce filme le jeu, pas l'écran de jeu. Pendant le montage, la
barre de vie, le bandeau de mise au point, les panneaux d'aide, l'ATH de la
base et les textes flottants sont muets. Le seul texte à l'écran est celui
qu'on y a mis exprès.

## Le défaut que le test « aucun plan vide » a trouvé

Il mérite d'être raconté, parce qu'il était invisible à la lecture du code.

`majTransition` n'est pas appelée pendant un plan : elle déclencherait un fondu
au noir en plein montage dès que Brad franchit une limite de zone. Mais c'est
elle qui tient `zoneAffichee` à jour — **et `zoneAffichee` ne sert pas qu'à la
palette : `ennemiHorsZone` s'en sert pour décider quels ennemis dessiner.**

La zone restait donc à 0 pour tout le montage. Résultat : Brad au milieu de la
piste de danse, dans le décor de la file d'attente, et **tous les Serra
invisibles**. Cinq d'entre eux étaient dans le cadre ; aucun n'était dessiné.

Je ne l'avais pas vu à l'œil : sur des vignettes sombres, un plan vide
ressemble à un plan calme. C'est le test qui compte les Serra réellement
visibles — dans le cadre en x **et** en y, et pas endormis — qui l'a sorti.

Deux corrections : la zone est mise à jour sèchement à chaque image, sans
fondu ; et les Serra **dans le cadre** sont réveillés à l'entrée du plan. Ils
dorment jusqu'à ce que Brad approche, ce qui est voulu dans le jeu — mais un
plan dure deux secondes, on n'a pas le temps de les réveiller en marchant.

## Le choix des plans, mesuré

Les positions de caméra ne sont pas choisies à l'œil. Pour chaque niveau, j'ai
noté chaque position de départ possible en comptant les Serra **réellement
visibles** à 0,6 s et à 1,2 s après la coupure, et j'ai gardé le minimum des
deux — pour qu'un plan qui se vide en cours de route soit puni. Les treize
plans de jeu sont les meilleures notes de leur niveau.

## Le carré du logo HwR

Le carré ne disparaissait pas par moments : **il n'a jamais existé**. Le
fichier `logo-hwr.png` ne contient que les lettres blanches sur du transparent.
Sur le fond sombre de l'intro, il n'y avait rien à afficher, et rien à corriger
dans le code qui l'affichait.

Il est maintenant dessiné : plaque bleu nuit arrondie, filet clair pour qu'elle
se détache. Le `#12141f` demandé est presque le `#0a0c14` du fond de l'intro —
une plaque de cette couleur exacte aurait été invisible, ce qui ramenait le
problème de départ. Elle est donc relevée d'un cran. Une seule fonction,
`dessinerLogoHwr`, utilisée par l'intro, la page des crédits et la
bande-annonce.

**À signaler :** ton fichier contient quatre **traits de coupe blancs** dans
les coins, en blanc plein. Invisibles avant sur du noir, ils apparaissent
maintenant comme quatre points sur la plaque. Je peux les masquer, ou tu
m'envoies un export propre — je n'y touche pas sans que tu me le dises.

## Les dates

Le générique affichait « février 2027 ». Corrigé en **janvier 2027**, pour
coller à la sortie publique du 9. La bande-annonce affiche les deux dates :
bêta 27–29 novembre 2026, sortie 9 janvier 2027.

## Un test qui mesurait le hasard

L'assertion « le combat final coûte cher » jugeait **une** partie contre un
seuil fixe. Mesure sur quatorze combats : le robot finit entre 11 et 22 PV sur
24, moyenne 14,1, écart-type 3,3. Le seuil tombait donc du bon côté onze fois
sur quatorze.

Première correction — trois combats, jugés à la médiane — insuffisante : la
médiane de trois tirages dépasse encore le seuil une fois sur vingt, et c'est
arrivé au premier essai. Correction retenue : **cinq combats, jugés à la
moyenne**. L'écart-type de cette moyenne est de 1,5 : le seuil est à plus de
deux écarts-types. Le test mesure de nouveau la difficulté, et non un tirage au
sort.

## Vérification

**261 vérifications, 0 échec.** Dix-neuf sont nouvelles :

- les 28 plans passent tous à l'écran, et **chaque coupure tombe sur son temps
  à moins d'une image** (4,0 ms en moyenne, 8,1 ms au pire) ;
- le montage dure exactement 20 mesures et rend la main au menu à la fin ;
- **aucun plan de jeu n'est vide** — au moins un Serra éveillé et visible du
  début à la fin de chacun des quatorze ;
- les trois boss apparaissent, vivants, et **dans le cadre** ;
- le mode cinéma s'active puis se désactive ; le bandeau de mise au point ne
  s'affiche pas ; les textes flottants sont muets ;
- l'horloge **se recale sur la piste** quand on la fait dériver d'une
  demi-seconde ;
- **sans piste, le montage avance quand même** — un fichier absent ne fige pas
  un écran noir ;
- **la sauvegarde du joueur ressort intacte** après un montage complet ;
- le menu propose « Bande-annonce », l'entrée lance le montage, et l'on en
  ressort au menu ;
- le carré du logo HwR est dessiné et se détache du fond de l'intro.

Le vérificateur de géométrie passe sur les douze niveaux.

## Les musiques

Six manquent toujours. La septième, celle de la bande-annonce, est livrée.

| fichier attendu | à quel moment |
|---|---|
| `assets/audio/niveau8.m4a` | le complexe scientifique |
| `assets/audio/niveau9.m4a` | la lune |
| `assets/audio/niveau10.m4a` | le manoir de Kirby 67 |
| `assets/audio/mini-kirby.m4a` | le premier combat, salle du trône |
| `assets/audio/mega-kirby.m4a` | le combat final, à Lille |
| `assets/audio/generique.m4a` | le générique |
| ~~`assets/audio/bande-annonce.m4a`~~ | **livrée dans ce prototype** |

---

# Prototype 19 — la bande-annonce, corrigée

Cinq retours, cinq corrections. Le principal d'abord.

## 1. Brad tombait dans les trous

**C'était le défaut le plus voyant, et la cause était bête :** il sautait **à
intervalle fixe**, une fois par seconde environ, sans jamais regarder où il
mettait les pieds. Quand un trou arrivait entre deux sauts, il tombait — et la
caméra continuait d'avancer sans lui.

Il saute maintenant **parce qu'il y a un trou**, avec les trois règles du robot
qui traverse les niveaux dans la suite de vérification :

1. pas de sol devant à une tuile → sauter ;
2. **le bouton de saut se tient** pendant toute la montée. Le relâcher aussitôt
   déclenche la gravité renforcée du saut court : Brad ne monte plus qu'au tiers
   de la hauteur et retombe dans le trou qu'il visait ;
3. en l'air, en train de tomber, au-dessus du vide, avec un appui derrière :
   freiner.

**Mesure : 0 chute sur 15 plans**, chacun simulé 3,5 s — plus longtemps
qu'aucun plan ne dure. C'est vérifié à chaque exécution de la suite : une seule
chute la fait échouer, parce que dans une bande-annonce une seule se voit.

## 2. Pourquoi certaines coupures « sonnaient » mal

Les coupures étaient justes à 8 ms près. Le problème n'était pas la précision,
c'était **le choix du temps**.

Le premier montage coupait toutes les deux mesures, donc sur les temps 1 et 3.
Or la mesure des deux bandes de fréquence dit ceci :

| temps | grave (< 120 Hz) | aigu (1,8–6 kHz) | |
|---|---|---|---|
| 1 | **110,8** | 68,1 | la grosse caisse |
| 2 | 46,8 | **113,6** | la caisse claire |
| 3 | 3,6 | 80,9 | **presque rien** |
| 4 | 41,1 | **117,7** | la caisse claire |

**Le temps 3 est un trou dans le morceau.** Une coupure sur trois tombait donc
dans le silence — et c'est exactement ce qui s'entendait.

Le montage coupe maintenant sur les temps **1 et 4** : des plans de 3 temps
suivis d'un plan d'1 temps. Ce découpage pousse vers la mesure suivante au lieu
de la couper en deux. Le seul temps 3 encore utilisé est dans la rafale, où la
régularité porte la pulsation. Un test le vérifie et refuse toute coupure sur
un temps faible hors rafale.

## 3. Brad dort, puis ouvre les yeux

Nouveau plan, exactement au format demandé : **10,3 s de noms de studios**
(mesures 1 à 3), puis **3,4 s où Brad dort** (mesure 4) — et le refrain part
sur le temps suivant.

Une chambre, une fenêtre, la lune, des Zzz qui montent. À 2,5 s ses yeux
s'ouvrent en deux éclats, un « ! » apparaît, il se redresse d'un coup, la
lumière monte — et 0,9 s plus tard le montage explose sur la première mesure du
refrain.

Le plan est dessiné à la main plutôt que joué dans un niveau : il n'existe pas
de chambre dans le jeu, et un plan aussi court doit être lisible tout de suite.

**Un détail qui a demandé deux essais :** une rotation d'un quart de tour autour
des pieds met l'axe du corps à la hauteur du point d'ancrage — donc la moitié de
Brad sous le matelas. L'ancrage est relevé de la demi-épaisseur du corps quand
il est couché, et ce décalage revient à zéro quand il se redresse.

## 4. Le carré du logo HwR

Les traits ne se voyaient pas : 1 pixel à 16 % d'opacité sur 104 pixels de côté,
c'est invisible. Le filet fait maintenant **2 px à 62 %**, et la plaque est
**translucide** pour que le fond de la bande-annonce passe au travers, comme
demandé. Le carré se lit comme un cadre posé sur l'image, plus comme une tache
opaque.

## 5. Le centrage de « BRAD BITT »

Le bloc était calé trop haut, et le filet supérieur mordait sur les capitales.
Le bloc titre + sous-titre est maintenant centré sur le milieu de l'écran
(150 → 212, centre 181 pour un écran de 360), et les deux filets sont posés
symétriquement autour de lui.

## 6. La mention finale

La ligne de pied de page du dernier carton devient :

> Plusieurs agents conversationnels ont été utilisés dans la création de ce jeu.
> L'idée et le concept général ont été imaginés par un humain.

## Le déroulé, à jour

| mesures | temps | contenu |
|---|---|---|
| 1–2 | 0–6 | IMAGINe Studio |
| 2–4 | 7–11 | HwR Engine |
| 4 | 12–15 | **Brad dort, puis ouvre les yeux** |
| 5 | 16, 19 | la discothèque · la ville |
| 6 | 20 | **« 10 NIVEAUX FARFELUS »** |
| 7 | 24, 27 | les tournesols · la vallée |
| 8 | 28, 31 | la ville gelée · le manoir hanté |
| 9 | 32 | **« DES BOSS QUI NE RIGOLENT PAS »** |
| 10–12 | 36, 40, 44 | le Colosse · le Séraphin · le Balistique |
| 12 | 47 | la lune |
| 13 | 48 | **« UNE BASE, UNE BOUTIQUE ET UNE SALLE D'ARCADE »** |
| 14 | 52, 55 | la base · les toits de Paris |
| 15 | 56–59 | **rafale** : le tokamak, la discothèque, le manoir, la lune |
| 16 | 60 | **Kirby 67 à contre-jour** |
| 17–20 | 64, 68, 72, 76 | le titre · la bêta · la sortie · les studios |

## Vérification

**263 vérifications, 0 échec.** Deux sont nouvelles, et ce sont les deux qui
comptent :

- **Brad ne tombe dans aucun trou, sur aucun plan** — 15 plans, 3,5 s chacun ;
- **aucune coupure ne tombe sur le temps faible de la mesure**, hors rafale.

Les coupures tombent à **4,0 ms** de leur temps en moyenne, **8,1 ms** au pire.
Le vérificateur de géométrie passe sur les douze niveaux.

---

# Prototype 20 — Brad se bat contre les mini-boss

## Le défaut

Pendant les plans de boss, Brad avançait tout droit, exactement comme dans un
plan de niveau. Il dépassait donc le boss en une demi-seconde et finissait
**dans le coin droit, à courir contre le mur sans s'arrêter** — pendant que la
caméra le suivait, l'adversaire hors champ. Un plan de boss où le boss n'est
pas là ne montre rien.

## La correction

Les plans de boss ont maintenant leur propre conduite, celle du robot qui gagne
les combats dans la suite de vérification :

- **aller au contact, puis s'arrêter à 44 px** — à portée de poing, pas au
  contact. Le coup part *devant* Brad : collé au centre de sa cible, la zone
  d'attaque la dépasse et il tape dans le vide en oscillant dessus ;
- **frapper en cadence**, environ trois fois par seconde ;
- **sauter quand la cible est au-dessus de lui** et seulement quand il est
  presque dessous — ce qui lui permet de retomber sur la tête du Séraphin, qui
  vole ;
- pendant un bonneteau, **viser la copie qui EST le boss**. Le Séraphin se
  duplique : sans ça, la bande-annonce le montrerait en train de frapper des
  mirages.

## Mesure

Sur la durée entière de chaque plan :

| boss | coups portés | PV retirés | durée | distance max |
|---|---|---|---|---|
| Serra-Colosse | 9 | 4 | 3,4 s | 111 px |
| Serra-Séraphin | 11 | 3 | 3,4 s | 104 px |
| Serra-Balistique | 5 | 1 | 2,6 s | 101 px |

**Le boss ne quitte jamais le cadre** — 0 image sur les trois plans.

## Ce que le test mesure, et pourquoi

La première version du test exigeait que le boss **perde des points de vie**.
Elle échouait sur le Serra-Balistique, et à raison : il a une **coque** qui ne
cède qu'à un astéroïde. Le frapper ne lui retire rien tant qu'elle tient, et
exiger une perte de PV en 2,6 s revenait à exiger qu'un astéroïde tombe dans
l'intervalle — c'est-à-dire à tirer au sort.

Le test compte donc les **coups encaissés** : le clignotement du boss se
déclenche à chaque coup reçu, qu'il perde des PV ou non. Ce qu'on veut prouver,
c'est que Brad *le frappe*, pas qu'il le tue en trois secondes.

## Vérification

**265 vérifications, 0 échec.** Quatre sont nouvelles :

- les trois boss apparaissent, vivants ;
- **le boss ne quitte jamais le cadre** ;
- **Brad reste à portée au lieu de courir au mur** (moins de 150 px) ;
- **et il les frappe vraiment**.

---

# Prototype 21 — le duel du Séraphin, et la manette

## 1. Le monstre restait planté sur Brad

Diagnostic avant correction, sur le plan du Serra-Séraphin :

```
s=0.33  bx=5325  vy=-232  sol=false   ox=5340   chevauche
s=0.67  bx=5339  vx=0     sol=true    ox=5331   chevauche
s=1.00  bx=5339  vx=0     sol=true    ox=5327   chevauche
s=2.00  bx=5339  vx=0     sol=true    ox=5326   chevauche
s=3.00  bx=5339  vx=0     sol=true    ox=5322   chevauche
```

Brad saute, retombe sur l'échafaudage, **et ne bouge plus d'un pixel pendant
2,5 secondes** pendant que le Séraphin flotte à travers lui. **90 % des images
du plan** avec les deux sprites l'un dans l'autre.

**La cause :** la distance de maintien se mesurait **de centre à centre**. Le
Séraphin fait 58 px de large ; « s'arrêter à 44 px de son centre » veut dire
s'arrêter *dedans*. Et comme Brad est invincible pendant la bande-annonce, rien
ne l'en repoussait.

**La correction :** la portée se calcule à partir des demi-largeurs des deux
corps, donc elle s'adapte à la taille du boss. **Le chevauchement est tombé de
90 % à 0–7 %.**

J'avais d'abord supposé que c'était l'invincibilité qui empêchait le recul de
les séparer. **C'était faux** — la mesure l'a montré : une fois la portée
calculée entre les bords, le chevauchement disparaît sans toucher à
l'invincibilité. Je l'ai donc laissée, parce qu'elle protège la garantie
« Brad ne tombe jamais » dans les plans de niveau.

**Et un rythme de duel** par-dessus : Brad avance, frappe, se dégage, revient.
Les trois chiffres du cycle sont mesurés, pas choisis — quatre réglages
comparés sur les trois plans, en comptant les coups portés, le chevauchement et
les images où Brad ne bouge pas :

| réglage | niveau 3 | niveau 6 | niveau 9 |
|---|---|---|---|
| sans recul | 2 coups · 0 % collés | 0 · 7 % | 1 · 0 % |
| 0,85 / 24 px | 3 · 0 % | 0 · 7 % | 4 · 0 % |
| **0,75 / 36 px** | **5 · 0 %** | **1 · 7 %** | **3 · 0 %** |
| 0,62 / 54 px | 2 · 0 % | 6 · 7 % | 2 · 0 % |

Le recul ne change pas le chevauchement — il sert au mouvement, c'est-à-dire à
empêcher l'image de se figer.

### Pourquoi le test compte la somme des coups

Sur le plan du Séraphin, Brad est **en l'air 92 % du temps** — il rebondit sur
sa tête — et le boss est dans sa zone de coup **96 % du temps**. Ce qui varie,
c'est si la copie touchée est la vraie : le Séraphin se duplique, et frapper
une fausse copie ne lui fait rien. Exiger un coup enregistré sur *ce* boss-là
reviendrait à exiger de tomber sur la bonne copie en trois secondes, donc à
tirer au sort. Le test juge donc **la somme sur les trois boss**.

## 2. La manette

Tu voulais annoncer « écran tactile, clavier souris et manette physique » sur
le carton final. **Le tactile et le clavier existaient, la manette non.**
Je ne pouvais pas l'écrire sans que ce soit faux — je l'ai donc ajoutée.

Elle ne duplique rien. Le corps du gestionnaire clavier est devenu une fonction
nommée, `auClavier`, et la manette lui passe des événements de la même forme
(`{ code, key }`). Elle hérite donc d'un coup de **toute** la navigation du
jeu : menus, boutique, jukebox, pause, combat final, générique,
bande-annonce — sans une ligne réécrite. Un écran ajouté plus tard sera jouable
à la manette sans qu'on y pense.

| manette | équivaut à | effet |
|---|---|---|
| stick gauche et croix | flèches | se déplacer, naviguer |
| bouton du bas (A / ✕) | Espace | sauter, valider |
| bouton de droite (B / ○) | Échap | retour, pause |
| bouton de gauche (X / □) | X | frapper |
| bouton du haut (Y / △) | C | onde de choc |
| L1 / R1 | Maj | courir |
| Start | Échap | pause |

Détails qui comptent : un bouton **maintenu** n'envoie qu'un seul événement (sans
ça le menu défilerait à soixante entrées par seconde) ; le stick a une zone
morte de 0,45 ; et **débrancher la manette relâche tout**, sinon Brad
continuerait de courir vers la droite pour toujours.

## 3. Le carton final

```
              IMAGINe Studio  ×  HwR Engine
        Écran tactile · Clavier et souris · Manette
               Mobile  ·  PC  ·  Console *
        * par le support des manettes, dans le navigateur
```

L'étoile dit exactement ce qu'elle vaut : le jeu n'est pas publié sur console,
il se joue au navigateur avec une manette. Écrire « Consoles » tout court
serait une promesse que le jeu ne tient pas.

## Vérification

**275 vérifications, 0 échec**, deux exécutions consécutives identiques. Dix
sont nouvelles :

- **le monstre ne reste pas planté sur lui** (moins de 30 % d'images collées) ;
- **le duel ne se fige jamais** (moins de 45 % d'images immobiles) ;
- le stick gauche fait marcher Brad ; le bouton du bas fait sauter ;
- **un bouton maintenu ne se répète pas** ;
- les boutons frappe, onde et course répondent ;
- **débrancher la manette relâche tout** ;
- la croix navigue dans le menu, le bouton du bas valide, celui de droite sert
  d'Échap.

---

# Prototype 22 — le logo nu, et plus rien à l'écran

## 1. La plaque et le filet du logo HwR sont retirés

Vu sur matériel, écran d'ordinateur et téléphone : **le fichier porte déjà ses
propres traits.** Les quatre marques de coupe dans les coins de
`logo-hwr.png` — celles que je proposais de masquer — forment le cadre autour
des lettres. Ma plaque arrondie et mon filet faisaient donc double emploi, et
sur un grand écran les deux ensemble se lisaient mal.

Le logo se dessine maintenant **nu**, sur le fond de la scène. `dessinerLogoHwr`
tient en deux lignes.

Le tracé de carré arrondi qui allait avec a été supprimé, pas laissé en place :
du code mort est du code qu'on croit encore utile.

**Le test a été retourné plutôt que supprimé.** Il vérifiait qu'une plaque se
détachait du fond ; il vérifie maintenant l'inverse — que les lettres sont bien
là, et que **rien n'est dessiné autour**. On lit un point à l'endroit exact où
la plaque se trouvait : le fichier n'y pose aucun pixel, donc ce point doit
avoir la couleur du fond à moins de 6 unités près.

## 2. Plus d'indication « Échap » pendant la bande-annonce

Elle se serait retrouvée dans l'enregistrement. Une bande-annonce qui affiche
ses propres commandes n'est plus une bande-annonce. **La touche fonctionne
toujours — elle ne s'annonce plus.**

## Vérification

**275 vérifications, 0 échec.**

---

# Prototype 23 — la manette, le contrat, et ce que je n'ai pas su reproduire

Quatorze demandes. Onze sont faites et mesurées. Deux portaient sur des bugs
que **je n'ai pas réussi à reproduire** — c'est dit en clair plus bas, avec ce
que j'ai fait à la place. Une dernière, les musiques, sort du code.

## Avertissement : la suite de tests est passée de 275 à 60 vérifications

Ce n'est pas une régression, mais il faut le dire avant le reste.

Le conteneur qui hébergeait l'ancienne suite a été recyclé, et **elle n'était
pas dans le zip** : elle vivait à côté du jeu, pas dedans. Elle est perdue.

La nouvelle suite est écrite dans `tools/`, **donc elle part avec le jeu**.
Elle compte 60 vérifications au lieu de 275 : elle couvre ce prototype et les
points de rupture connus, pas encore les 215 assertions de détail accumulées
depuis le début. Elle rattrapera, prototype après prototype. En attendant,
**60 vérifications sur du neuf valent mieux qu'un chiffre que je ne peux plus
produire**, et je préfère l'écrire que laisser croire à une couverture que je
n'ai pas.

```
tools/socle.mjs   serveur local + navigateur + compteur
tools/verif.mjs   les 60 vérifications, sections A à J
```

Lancement : `node tools/verif.mjs` (il faut Playwright).

## 1. Pourquoi Lille

La phrase disait que Brad y avait grandi. Elle dit maintenant :

> PARCE QUE C'EST LÀ QU'IL A ÉTÉ DÉTECTÉ POUR LA DERNIÈRE FOIS DANS LE MONDE
> RÉEL.

Le test vérifie les deux moitiés : que l'ancienne phrase a disparu **et** que
la nouvelle raison est donnée. Vérifier seulement la disparition laisserait
passer un dialogue vide.

## 2. La manette

C'est le morceau sensible du lot, et il est traité comme tel : **dix-sept
vérifications sur les soixante**.

| geste | PlayStation | Switch | Xbox | clavier |
|---|---|---|---|---|
| se diriger | stick gauche | stick gauche | stick gauche | flèches |
| accélérer | R2 | ZR | RT | Maj |
| lancer un objet | ✕ | B | A | X |
| Brad-Shy | □ | Y | X | C |
| pause | △ | X | Y | Échap |
| valider un menu | ✕ | B | A | Espace |
| revenir en arrière | ○ | A | B | Échap |
| sauter | ○ ou stick haut | A ou stick haut | B ou stick haut | ↑ |

Deux ajouts que tu n'avais pas demandés, et pourquoi. **Le saut** : il n'était
pas dans la liste, mais un jeu de plateforme sans saut sous le pouce ne se joue
pas. Il est sur le haut du stick et de la croix — comme la flèche haut au
clavier — et doublé sur le bouton de droite. **Start / Options** ouvre aussi la
pause, en plus du bouton du haut. Et les quatre gâchettes font courir, pas
seulement celle de droite : tenir L2 par réflexe ne devait pas ne rien faire.

**Une nuance qu'il faut connaître.** L'API navigateur ne donne pas le *nom* des
boutons, elle donne leur **position** : l'index 0 est toujours le bouton du
bas. Sur PlayStation et Xbox, le bouton du bas est bien celui qui valide
(✕ et A). Sur une manette Switch, le bouton du bas est **B**, pas A — Nintendo
place ses lettres à l'inverse. Le jeu suit donc la position, pas la lettre :
**valider, c'est toujours le bouton du bas**, quel qu'il porte comme nom. C'est
le seul choix qui reste cohérent d'une manette à l'autre.

### Trois tables, pas une

Le même bouton ne veut pas dire la même chose au menu, en jeu et au combat
final. Il y a donc `MANETTE_JEU`, `MANETTE_FINAL` et `MANETTE_MENU`, et
`tableManette()` choisit d'après la scène.

**Le piège, trouvé en le mesurant :** la table est choisie au moment de
l'appui, mais le relâchement arrivait plus tard — parfois après un changement
de scène — et allait chercher la table de la *nouvelle* scène. La touche
restait enfoncée pour toujours. Le relâchement efface maintenant l'action dans
`entrees` **et** dans `entreesFinal`, sans passer par la table.

Deux tests gardent ça : « changer de scène ne laisse aucune touche collée » et
« débrancher la manette relâche tout ».

### L'écran Contrôles ne peut pas mentir

Il est dans les options. Sa légende n'est pas écrite à la main : elle est
**construite à partir de la table qui pilote réellement la manette**
(`MANETTE_LEGENDE`, dans `js/entrees.js`). Si le mappage change un jour et que
l'écran n'est pas mis à jour, ce n'est pas possible — il n'y a qu'une source.

## 3. Conditions d'utilisation, confidentialité, contact

Nouveau fichier : `js/mentions.js`.

**Au premier lancement**, et seulement au premier, un bandeau s'affiche sur
l'écran d'accueil, sous le bouton « Jouer » :

> En cliquant sur « Jouer », vous acceptez avoir lu les **conditions
> d'utilisation de ce jeu** et ce qu'il advient de **vos données**.

La phrase demandée disait « en cliquant sur *continuer* ». Il n'y a pas de
bouton « continuer » sur cet écran — il y a « Jouer ». Écrire le nom d'un
bouton qui n'existe pas dans une phrase d'acceptation aurait été bancal
juridiquement autant que visuellement ; le reste de la phrase est repris tel
quel. Si tu préfères vraiment « continuer », il faut renommer le bouton, et je
le fais.

Les deux passages en bleu sont cliquables et mènent à l'écran complet. Après
ça, le bandeau ne revient plus : la clef `bradbitt.mentions.v1` vit **à part de
la sauvegarde**, pour qu'effacer sa partie ne fasse pas réapparaître un texte
juridique déjà lu.

Le même texte est lisible à tout moment dans les options, à l'entrée
**« Conditions et confidentialité… »**.

**Le texte est adapté du site, pas recopié.** Celui du site annonce des polices
et des vignettes chargées chez des tiers ; le jeu n'en charge aucune, et il
écrit d'autres choses dans le navigateur. Recopier le texte du site ici aurait
été **faux** — c'est exactement le genre de demi-vérité qu'un contrat
d'utilisation ne doit pas contenir.

### Le courriel de contact

`imaginestudio.hwr@gmail.com`, dans les options. Cliquer ouvre un brouillon
**déjà rempli** :

```
--- à garder, ça aide à comprendre ---
Version du jeu : 0.23 (septembre 2026)
Appareil : ordinateur          (ou téléphone, ou tablette)
Navigateur : Chrome 140
Écran : 1512 × 982
Manette : non détectée         (ou « oui »)
Niveaux terminés : 7 / 11
Difficulté : connaisseur
Incidents rencontrés : 0
```

Rien n'est envoyé nulle part : ces lignes sont écrites **dans le brouillon**,
que le joueur lit, corrige et envoie — ou pas.

Ce n'est pas de la décoration. Personne ne sait dire de tête quelle version il
joue, et « ça bugue » sans appareil ni navigateur n'est pas un rapport de bug.

## 4. Le combat final était trop court

Mesuré avant de toucher à quoi que ce soit : **32,7 s en moyenne**. La demande
était « max 1 min ».

Deux réglages, pas dix :

| | avant | après |
|---|---|---|
| points de vie de Kirby 67 | 3 | 4 |
| sbires par décharge | 6 | 7 |

Mesure après, sur six combats gagnés menés par le robot :

```
44 s · 54 s · 49 s · 43 s · 43 s · 42 s     moyenne 45,8 s
```

Puis six autres, à la seconde exécution de la suite :

```
45 s · 42 s · 46 s · 46 s · 47 s · 45 s     moyenne 45,2 s
```

Douze combats, douze victoires, **aucun au-dessus de 54 s**. Le test exige
entre 40 et 60 s.

**Le quatrième point de vie a demandé une correction.** L'annonce de phase se
déclenchait à chaque coup encaissé ; au quatrième, elle réannonçait la phase
déjà en cours (« IL S'ACHARNE » deux fois). `k.phase` est maintenant plafonné.

## 5. Les deux bugs que je n'ai pas reproduits

Il faut le dire franchement.

### « Brad peut être bloqué au mini-boss 6 s'il est sur un échafaudage en même temps qu'il se fait toucher »

J'ai balayé **34 positions** sur l'échafaudage du mini-boss 6, avec un coup
reçu depuis la gauche puis depuis la droite à chacune. **Aucun blocage.**

### « En plein combat, le jeu peut ne plus marcher — après que Brad perde une vie et que le combat reprenne » (boss final 2)

J'ai joué **dix combats complets de 60 s**, plus un cycle complet
mort → réapparition → reprise. **Aucun figement.**

### Ce que j'ai fait à la place

Ne pas reproduire un bug ne veut pas dire qu'il n'existe pas — ça veut dire que
je ne sais pas encore le provoquer. Trois choses, donc :

**a) La boucle de jeu ne peut plus mourir.** C'était la cause la plus probable :
une exception levée pendant une image arrête `requestAnimationFrame`, et
l'écran se fige exactement comme décrit. Elle est maintenant attrapée.

```js
function boucle(maintenant) {
  try { imageDuJeu(maintenant); } catch (e) { noterIncident(e); }
  if (incidents.t > 0) { try { dessinerIncident(); } catch (_) {} }
  requestAnimationFrame(boucle);
}
```

Le jeu continue, et **affiche** qu'un incident s'est produit. Un test lève une
exception en pleine image et vérifie que la boucle tourne toujours l'image
suivante.

**b) Un filet anti-blocage.** Si le joueur demande à bouger, que Brad est libre
de bouger, et qu'il ne bouge pas pendant **40 images consécutives** (un tiers de
seconde), il est dégagé de deux pixels vers le haut et trois dans le sens
demandé. Deux tests : qu'il **ne se déclenche pas** en jeu normal, et qu'il
dégage bien Brad s'il est vraiment coincé.

Le premier test m'a d'ailleurs pris au piège : sa phase de « jeu normal »
lançait Brad dans le premier trou du niveau 1, la scène passait à `mort`, et le
filet — qui ne s'applique qu'en scène `jeu` — ne mesurait plus rien du tout. Un
test qui ne mesure rien passe toujours.

**c) Un compteur d'incidents**, reporté dans le courriel de contact. Si le bug
existe et se reproduit chez toi, la ligne « Incidents rencontrés » ne sera pas
à zéro, et le message d'erreur exact remontera.

**Je ne peux pas confirmer que ces deux bugs sont corrigés.** Je peux confirmer
que le *symptôme* décrit — écran figé, Brad qui ne répond plus — a maintenant
deux filets sous lui, et qu'une trace sera gardée s'il revient.

## 6. Le numéro de version

En bas à droite du menu principal, `v0.23`. Une seule source :
`VERSION_JEU` dans `js/mentions.js`, la même que celle du courriel de contact et
celle de l'écran des conditions.

## 7. Le costume d'or

**Le défaut, mesuré.** L'ancienne teinte appliquait *une seule* couleur dorée
multipliée par la luminance du pixel, écrêtée à 0,45. Résultat : la couleur la
plus fréquente de la planche était `(88, 68, 18)` — un brun-vert. « Trop
dépassé au niveau des couleurs » est exactement ça.

**La correction.** Une rampe à deux couleurs, de l'ombre `(86, 58, 12)` à la
lumière `(240, 206, 108)`, avec la cravate en `(104, 20, 30)`.

Premier essai raté : la rampe débordait sur les cheveux et le contour. La
teinte est maintenant restreinte aux **lignes 22 et suivantes** de chaque
cellule de 48 pixels — c'est-à-dire au costume, pas au visage.

## 8. Le skin 3IRL

Code **`FNAM3RL`**, à saisir dans le vestiaire. Il est actif en permanence, sans
condition de progression. La casse n'a pas d'importance.

> La légende raconte que pour l'éloigner, il faut utiliser une boîte vocale.
> Mais bon, une légende en cache souvent une autre.

Le sprite est généré par `tools/robot_brad.py` à partir de bandes **mesurées sur
la planche**, pas devinées : cheveux `0-8`, visage `8-23`, torse `23-36`, yeux
`14-18` × colonnes `15-25`, marques d'articulation lignes `25-31`, bras
`5-9` et `26-30`.

Les deux premiers essais ont échoué et méritent d'être notés : le masque des
yeux attrapait tout le contour du visage (traînées cyan), et les marques
d'articulation faisaient sept colonnes de large (barres blanches). C'est en
imprimant une carte ASCII de la planche pixel par pixel que la bonne géométrie
est sortie.

Le code est enregistré dans `partie.codesUniformes` : il survit à un
rechargement, et un test le vérifie.

## 9. Le jukebox

En bas à gauche de l'écran du jukebox : **Musiques par lılYº**. Seul le nom est
cliquable — il s'éclaircit au survol — et ouvre
`https://soundcloud.com/l-ly-39181851` dans un nouvel onglet.

## 10. Les bonus BC secrets, au complet

La liste « à venir » est maintenant **vide**, et elle le reste : plus rien n'est
promis sans être livré.

| aptitude | coût | ce qu'elle fait |
|---|---|---|
| Double saut | 1 BC secret | un second saut en plein vol |
| Frappe chargée | 1 | tenir le coup 0,5 s : portée ×1,9, dégâts ×2 |
| Plaquage | 2 | frapper en pleine course : charge sur 3 m |
| Tourelle anti-serrano | 2 | une tourelle suit Brad et tire seule |

Huit vérifications, dont deux nées de bugs réels :

- **La tourelle tuait tout d'un coup.** Son projectile était marqué `aBrad`,
  et dans `majBoules` une boule `aBrad` inflige 999 dégâts — c'est la règle de
  la boule *renvoyée*. Elle a maintenant ses propres dégâts.
- **La frappe chargée partait 0,27 s trop tard** après une réapparition.
  `brad.recharge` n'était pas remis à zéro — et 0,27 s, c'est exactement
  `R.recharge`. `reapparaitre()` remet maintenant à plat les quatre états
  d'attaque, le plaquage et la tourelle.

## 11. Les musiques, en deux archives

Hors du code, mais demandé.

Les 21 morceaux ont été **réencodés en AAC 96 kbit/s** (ils étaient à 128).

| | avant | après |
|---|---|---|
| poids total | 58 Mio | 44 Mio |
| coupure du spectre | 17,5 – 17,9 kHz | 16,6 kHz |
| durées | — | inchangées (écart max 0,04 s) |

**23 % de moins** à télécharger pour le joueur. Ce que ça coûte : une deuxième
génération de compression, mesurable tout en haut du spectre — là où il n'y a
quasiment plus d'énergie musicale. **Les originaux ne sont pas touchés.**

Deux archives, parce que 44 Mio ne passe pas en un seul envoi :

```
bradbitt-musiques-1-sur-2-niveaux.zip      11 morceaux   20,5 Mio
bradbitt-musiques-2-sur-2-boss-menus.zip   10 morceaux   24,0 Mio
```

Chacune porte déjà l'arborescence `assets/audio/`, et un `LISEZ-MOI.txt` qui
explique les deux façons de les déposer sur GitHub.

**Un point de fait, pour éviter un malentendu :** la limite des 25 Mo de GitHub
porte sur *chaque fichier déposé dans le dépôt*, pas sur l'archive. Le plus gros
morceau fait 5,9 Mo — aucun n'a jamais approché cette limite. La coupure en deux
vient de la limite d'envoi de cette conversation, 30 Mio.

**Trois musiques manquent toujours** et le jeu les attend :
`mini-kirby.m4a`, `mega-kirby.m4a`, `generique.m4a`. Sans elles, les mini-boss,
le combat final et le générique se jouent en silence — sans planter.

## Vérification

**60 vérifications, 0 échec**, deux exécutions consécutives identiques.

```
A. CHARGEMENT ................................  5
B. LA BOUCLE NE MEURT PAS ....................  2
C. LA MANETTE ................................ 17
D. MENTIONS ET CONTACT ....................... 11
E. LE SKIN 3IRL ..............................  5
F. LES APTITUDES SECRETES ....................  8
G. LE COMBAT FINAL ...........................  4
H. LE FILET ANTI-BLOCAGE .....................  2
I. LE DIALOGUE ...............................  2
J. RENDU .....................................  4
```

Et `node tools/verifier_niveaux.js` : **12 niveaux, aucun défaut de géométrie**,
chacun analysé avec sa propre gravité.

---

# Prototype 24 — neuf corrections, et une que je n'ai pas faite

Neuf points signalés, trois captures d'écran à l'appui. Tous les neuf sont
corrigés et mesurés. La suite passe de **60 à 102 vérifications**.

## 1. Le lien des conditions d'utilisation disparaissait après lecture

**Le défaut exact.** Sur l'écran d'accueil, cliquer sur le passage bleu
ouvrait le texte — et marquait au passage les mentions comme lues. En revenant
par Échap, la ligne avait disparu : plus aucun moyen de la relire depuis
l'accueil.

Une seule ligne de trop, dans `activerZone` :

```js
case 'mentions-lien': marquerMentionsLues(); ouvrirMentions('accueil'); break;
```

Le commentaire qui l'accompagnait disait « ouvrir le texte compte comme l'avoir
vu ». C'était un raisonnement plausible et une erreur : la phrase affichée dit
« **en cliquant sur « Jouer »**, vous acceptez… ». Le seul geste qui vaut
acceptation est donc celui-là, et c'est `lancerDemarrage` qui le marque.

Six vérifications gardent les deux moitiés : que lire **ne ferme pas** le
bandeau, et que « Jouer » le ferme bien et définitivement.

## 2. Les trois cadres trop petits

Trois écrans, trois causes différentes. Aucun n'a été « agrandi au jugé » :
dans les trois cas le test compte les **pixels clairs sous le bord du
panneau**, et exige zéro.

### Les options

Dix entrées à 28 px (34 pour la difficulté) font **286 px** ; le cadre en
offrait **218**. « Réglages de développement… » et « Retour » tombaient
dessous, et « Retour » sortait même de l'écran.

Deux corrections, pas une :

- le cadre prend les mêmes bornes que les panneaux de la base (26 → 334), au
  lieu d'être plus petit qu'eux ;
- **la hauteur d'une ligne se déduit** de la place et du nombre d'entrées.

```js
function hauteursOptions() {
  const brut = MENU_OPTIONS.map(e => (e.genre === 'choix' ? 40 : 28));
  const total = brut.reduce((a, b) => a + b, 0);
  const k = Math.min(1, (OPT_Y1 - OPT_Y0) / total);
  return brut.map(h => Math.max(16, Math.floor(h * k)));
}
```

Une onzième entrée resserrera la liste ; elle ne la fera plus déborder. C'est
la différence entre un écran qui marche aujourd'hui et un écran qui marche
encore au prochain ajout. Le test vérifie d'ailleurs que **les dix zones
cliquables existent et tombent toutes dans le cadre** — être visible ne suffit
pas, il faut être atteignable.

Deux détails ont suivi : le pourcentage des jauges, écrit sous le rail à
`y + 18`, tombait dans la ligne suivante une fois les lignes resserrées — il
est passé à droite du rail, sur la ligne du nom. Et la plaque de sélection est
plafonnée à 22 px, pour que la note « L'équilibre prévu. » reste lisible
au-dessous plutôt que noyée dans l'aplat ambre.

### Le vestiaire

La description du skin 3IRL mesure **565 px** d'un seul trait, à 10 px de
corps. Le panneau en offre 520. Elle dépassait des deux côtés et traversait le
champ « Code ».

Elle est maintenant coupée sur **deux lignes au plus** (`lignesDe`, qui mesure
au lieu d'estimer) et remontée dans la bande libre entre la grille
d'uniformes — qui finit à 268 — et le champ de code, qui commence à 310.

### Le jukebox

Le crédit « Musiques par lılYº » était dessiné à `HAUTEUR - 19`, soit **sept
pixels sous le bord du panneau** : il s'affichait sur le décor de la base, pas
dans l'écran du jukebox.

Les quatre bandes du bas sont maintenant nommées et ordonnées en un seul
endroit — liste, description, aide, crédit — au lieu d'être chacune un
« `HAUTEUR - quelque chose` » décidé à son propre endroit du fichier. Et comme
pour les options, la hauteur d'une ligne de la liste se déduit du nombre de
morceaux.

Un cas que je n'avais pas vu au premier coup d'œil : le message de validation
de code se dessinait au même endroit que la description. Les deux ensemble
étaient illisibles. Le message l'emporte — il s'efface tout seul.

## 3. Le dialogue parlait encore de trois décharges

Il y avait **trois endroits**, pas un. Les deux premiers se trouvaient en
cherchant « décharge » ; le troisième — « Kirby 67 t'y attend, avec ses trois
points de vie » — seulement en cherchant « trois ».

Plutôt que de corriger trois chiffres écrits en toutes lettres, les répliques
portent maintenant des jetons résolus depuis `F_PV_KIRBY` :

```
{DECHARGES_MAJ} décharges au but, et c'est fini.
La {DECHARGE_IEME} décharge le prend de plein fouet.
```

**Le remplacement se fait au lancement du dialogue, pas au chargement du
fichier.** `js/final.js` est chargé *après* `js/dialogue.js` : lire
`F_PV_KIRBY` à l'ouverture lèverait une `ReferenceError` — la zone morte
temporelle du `const`. C'est le genre de détail qui transforme une jolie
refonte en écran noir.

Neuf vérifications, dont une qui balaie **toutes les répliques du jeu** pour
s'assurer qu'aucune ne parle plus de trois décharges.

## 4. Au combat final, le coup partait toujours à droite

Celui-ci méritait d'être mesuré avant d'être corrigé, parce que le premier
soupçon était faux.

**Ce que j'ai vérifié d'abord.** La zone qui blesse suit-elle le sens de Brad ?
Oui : `frapperAuFinal` calcule `zx = b.x + b.sens * 27,6`, et en posant un Serra
de chaque côté à distance égale, c'est bien celui du bon côté qui encaisse — à
gauche comme à droite. **Le combat n'avait pas de défaut.**

**Ce qui n'allait pas, mesuré.** Le *dessin*. `ctx.arc(cx, cy, r, -0.9, 0.9)`
ouvre son arc autour de l'angle zéro, c'est-à-dire vers les x croissants,
**quel que soit `b.sens`** : seul le centre du cercle se décalait de seize
pixels à gauche. L'arc se retrouvait donc tracé par-dessus Brad.

En comptant les pixels du trait de part et d'autre de lui :

| | à gauche | à droite |
|---|---|---|
| face à droite, avant | 0 | 73 |
| **face à gauche, avant** | **4** | **0** |
| face à droite, après | 0 | 73 |
| face à gauche, après | 73 | 0 |

Quatre pixels : le coup disparaissait presque. Le repère est maintenant
retourné avant le tracé, centre et ouverture ensemble.

**Un joueur juge sur ce qu'il voit.** Le signalement était juste ; c'est mon
diagnostic de départ — « l'attaque va à droite » — qui portait sur la mauvaise
moitié du problème.

## 5. Trois corrections pour le téléphone

### On ne pouvait pas lire les conditions d'utilisation

Le texte ne défilait qu'aux flèches du clavier. Sur téléphone il n'y a pas de
flèches : passé le premier écran, le contrat était **inatteignable** — et c'est
précisément le document qu'il faut pouvoir lire en entier.

Trois moyens maintenant : les flèches, **le glissement du doigt**, et deux
boutons **▲ ▼** d'une page chacun. Les boutons existent parce qu'un glissement
ne s'annonce pas : rien à l'écran ne disait qu'on pouvait faire glisser. La
ligne du bas le dit aussi, désormais.

Un piège évité en l'écrivant : le gestionnaire de glissement est enregistré
**avant** celui des zones cliquables, il doit donc convertir les coordonnées
lui-même. Sans ça, `zoneSousSouris` aurait jugé la position du doigt
*précédent* — et au doigt, aucun survol ne tient la position à jour entre deux
appuis.

### Le zoom automatique

`user-scalable=no` était déjà dans la balise `viewport`. **Safari iOS l'ignore
depuis iOS 10** : un double appui rapide sur un bouton de commande agrandissait
la page en pleine partie.

Deux verrous, parce qu'aucun ne suffit seul :

- `touch-action: none` sur `#scene` et sur le canvas ;
- les événements `gesturestart` / `gesturechange` / `gestureend`, propres à
  Safari, qui portent le pincement.

Le panneau de développement garde son défilement : il vit en dehors de
`#scene`.

### La course automatique

Au clavier, courir se fait en **tenant** Maj. Au doigt, il n'y a rien à tenir :
sur téléphone, Brad ne courait donc jamais — et plusieurs sauts du jeu
demandent la vitesse de course pour passer.

Un cinquième bouton tactile, « ▶▶ », à gauche des flèches : une **bascule**,
pas un bouton qu'on tient. Le message « Course automatique activée » apparaît
en haut, tient deux secondes, puis s'efface.

Trois précautions :

- le choix est retenu dans le navigateur, sous sa **propre clef** — effacer sa
  partie ne doit pas redemander un réglage qui n'est pas une progression ;
- la course se réapplique **à chaque image**, sinon relâcher Maj au clavier
  l'annulerait ;
- elle ne s'applique **pas pendant la bande-annonce**, qui pilote la course
  elle-même et raterait ses sauts.

Le test vérifie les six.

## Ce que je n'ai pas fait, et qu'il faut savoir

**Le code `FNAM3RL` ne peut pas être saisi sur téléphone.** Le champ du
vestiaire attend un clavier physique ; le jukebox, lui, a un clavier à l'écran.
Tu ne l'as pas signalé et je n'ai pas voulu élargir le lot tout seul — mais le
skin 3IRL est donc, en l'état, inaccessible au doigt. Dis-moi si je l'ajoute :
c'est le même clavier que celui du jukebox.

## Deux tests que j'ai écrits faux, et comment je l'ai su

Il faut le raconter, parce que j'ai failli livrer « 102 vérifications, 0
échec » sur la foi de deux exécutions.

En construisant l'archive, j'ai relancé la suite depuis le zip dézippé. Elle a
échoué : **73 contre 72 pixels** sur la symétrie du coup de poing. J'ai
d'abord cru à l'anticrénelage et posé une tolérance de 5 %. Elle a échoué de
nouveau, autrement : **73 contre 60**. Treize pixels ne sont pas de
l'anticrénelage.

C'était **Kirby 67**. Je ne vidais l'arène que des sbires, des meules et des
particules ; le boss, lui, restait là et se dessinait par-dessus le trait selon
l'endroit où il se trouvait. Mon test mesurait la position du boss. (La
secousse de caméra, elle, expliquait bien le pixel d'écart du premier cas : les
deux causes se superposaient.)

Puis, sur vingt-six exécutions, **deux échecs** sur une autre ligne : « le
combat final se gagne, six fois sur six ». Mesure : sur **156 combats** menés
par le robot, il est mort **2 fois** — environ 1,3 % par combat. Exiger six
victoires sur six, c'est exiger 0,987⁶ : un échec de la suite une fois sur
douze. Le robot n'esquive qu'une image sur quarante et seulement en fuite ; il
joue moins bien qu'un joueur, et sa mort occasionnelle ne dit rien du combat.
La vérification affirme maintenant que le combat **se gagne** (au moins 5 sur
6) et affiche le score à chaque fois, même quand elle passe : une chute à 4/6
se verrait dans la sortie avant de faire échouer quoi que ce soit.

**Un test qui échoue une fois sur dix est pire qu'un test absent** : on prend
l'habitude de le relancer. Les deux sont corrigés dans le sens de la mesure,
pas dans celui du silence.

## Vérification

**102 vérifications, 0 échec**, sur **quatorze exécutions consécutives** après
correction des deux tests ci-dessus.

```
A. CHARGEMENT ................................  5
B. LA BOUCLE NE MEURT PAS ....................  2
C. LA MANETTE ................................ 17
D. MENTIONS ET CONTACT ....................... 11
E. LE SKIN 3IRL ..............................  5
F. LES APTITUDES SECRETES ....................  8
G. LE COMBAT FINAL ...........................  4
H. LE FILET ANTI-BLOCAGE .....................  2
I. LE DIALOGUE ...............................  2
J. LE BANDEAU JURIDIQUE ...................... 10
K. LES TROIS CADRES ..........................  8
L. LE NOMBRE DE DECHARGES ....................  9
M. LE SENS DE LA FRAPPE ......................  5
N. LE TELEPHONE .............................. 10
O. RENDU .....................................  4
```

Et `node tools/verifier_niveaux.js` : **12 niveaux, aucun défaut de géométrie**.

Le combat final mesure toujours dans la cible : `45 s · 43 s · 47 s · 46 s ·
45 s · 48 s`, six victoires sur six.

Version du jeu : **0.24**.

---

# Prototype 25 — la bêta

## Un seul jeu, un seul interrupteur

La bêta n'est **pas une copie** du projet. C'est le même code, avec une ligne
dans un nouveau fichier, `js/edition.js`, chargé avant tout le reste :

```js
const BETA = true;
```

Deux copies auraient divergé dès le premier correctif : un bug corrigé dans
l'une, oublié dans l'autre. Ici, un correctif fait pendant la bêta est déjà
dans la version finale.

**Pour publier la version finale : passer `BETA` à `false`.** C'est tout. Les
niveaux 4 à 10, les uniformes, la manette, le code FNAM3RL et le panneau de
développement reviennent d'eux-mêmes — ils n'ont jamais quitté le code, ils
étaient seulement fermés.

Rien ne se déverrouille depuis l'adresse de la page : une bêta qu'on ouvre en
ajoutant `?finale` à l'URL ne serait pas une bêta.

## Ce que la bêta ouvre, et ce qu'elle ferme

| | Bêta | Version finale |
|---|---|---|
| Niveaux | intro, 1, 2, 3 | les onze |
| Camp d'entraînement, arcade, boutique, jukebox | ouverts | ouverts |
| Uniformes | classique, cravate turquoise, cravate violette, **Bêta-testeur** | les onze |
| Code FNAM3RL | reconnu, « s'ouvrira le 9 janvier 2027 » | actif |
| Manette | ignorée, annoncée pour la sortie | active |
| Portail du monde réel | absent | après le manoir |
| Panneau de développement (F1, ⚙) | fermé | ouvert |
| Barre de mesures en bas des niveaux | masquée | affichée |

**Les verrous sont posés là où la chose se décide, pas à l'affichage.**
`niveauDebloque()` — la seule fonction que la carte consulte pour afficher ET
pour partir — refuse les niveaux hors bêta. `uniformeDebloque()` refuse les
uniformes hors bêta. Conséquence mesurée : une partie venue d'une version de
test, avec les dix niveaux terminés et tout acheté, n'ouvre en bêta que les
quatre niveaux et les quatre uniformes prévus. Un joueur qui porterait déjà le
costume d'or le voit retomber sur le classique — sa partie, elle, garde son
choix pour la sortie.

**Le panneau de développement.** Il téléporte dans n'importe quel niveau et
donne cent Brad Coins d'un clic : ouvert au public, il contournerait tout ce
que la bêta ferme. On ne cache pas seulement le bouton — `basculerPanneau()`,
que F1 et les options appellent, ne fait plus rien en bêta.

**La cravate violette passe de 300 à 1000 points à l'arcade**, dans les deux
éditions. Voir plus bas : c'est un vrai défi, et je l'ai mesuré.

## Le « Bêta ! » du menu

À la manière des phrases jaunes de l'écran titre de Minecraft : même angle
(−20°), même pulsation (5,5 % d'amplitude, deux battements par seconde), même
ombre portée au quart de la luminosité du jaune. Il se cale sur la largeur
**mesurée** du titre, pas devinée : la police système n'a pas la même chasse
sur Mac, Windows et Android.

Le texte tient dans une constante, `SPLASH_BETA` dans `js/beta.js`.

## L'avertissement de « Nouvelle partie »

À chaque nouvelle partie, avant tout le reste : c'est une bêta, elle peut
comporter des bugs plus ou moins mineurs, et voici l'adresse. L'adresse est
cliquable et ouvre le courriel pré-rempli des options (version, appareil,
navigateur). Il ajoute une ligne : les trois premiers niveaux donnent un skin
exclusif.

L'avertissement s'intercale **avant** la question « une partie existe déjà,
tout effacer ? », et ne change rien à ce qui suit.

## Le skin « Le Bêta-testeur »

### La planche

Dérivée de celle de Brad, pas redessinée — comme le skin 3IRL : même Brad,
même démarche, mêmes douze images. `tools/beta_brad.py` repeint l'étoffe
d'après ton image : veste rose, gilet et pantalon turquoise, bande rose sur le
côté extérieur de chaque jambe, col ouvert, pas de cravate.

Trois essais ratés, chacun instructif :

1. **La bande de la chemise était relevée à l'œil, et fausse.** Colonnes 11 à
   20 ; le centre du personnage est à la colonne 19. Elle mordait sur la veste
   à gauche et laissait un pixel blanc à droite. Mesurée sur une carte ASCII :
   14 à 23.
2. **La cravate passait pour de la peau.** Un rouge vif a nettement plus de
   rouge que de bleu, comme la peau. Ce qui les sépare, c'est le vert : la
   peau en garde plus de 95, la cravate moins de 90. Et ses reflets rose clair
   ont autant de vert que de bleu, là où la peau en a nettement plus.
3. **Quatre-vingt-un pixels de cravate rose** — comptés, pas estimés — au
   milieu du gilet. La règle de la veste excluait « la chemise », mais la
   cravate n'est pas la chemise : ses pixels, déjà repeints en turquoise,
   étaient repeints une seconde fois en rose.

### Où il vit

**À part de la partie**, sous sa propre clef `bradbitt.recompenses.v1` :

- « Effacer la sauvegarde » remet la progression à zéro, pas le skin. Les deux
  confirmations d'effacement le disent (« le skin Bêta-testeur, lui, reste à
  toi »).
- La version finale le reconnaît en ne lisant que cette clef.
- Il est écrit **au moment où le troisième niveau est terminé**, avant même
  l'écran de fin : fermer l'onglet pendant cet écran ne coûte rien.

### Ce qui le fait perdre — mesuré, pas affirmé

Le stockage d'un navigateur appartient à une **adresse** (son « origine »). La
suite de vérification le prouve en trois temps, dans le **même onglet** :

1. le skin est gagné en bêta ;
2. la même adresse est rechargée en édition finale → **le skin y est** ;
3. l'onglet passe à une autre adresse → **il n'y est pas**.

Le troisième test m'a d'ailleurs pris au piège à l'écriture : ouvrir un second
navigateur l'aurait fait passer pour de mauvaises raisons — un navigateur neuf
n'a aucun stockage, quelle que soit l'adresse. C'est donc le même onglet qui
change d'adresse.

**Conséquence pour le déploiement : la version finale doit être publiée à la
même adresse que la bêta.** Si l'adresse change entre les deux — un nouveau
site Netlify, un nom de domaine ajouté entre-temps — le skin reste à l'ancienne
adresse et la version finale ne le verra pas.

### La navigation privée

Le stockage y refuse d'écrire, ou efface tout à la fermeture. L'écran de fin
ne l'ignore pas : il dit « non enregistré » et conseille de rejouer dans une
fenêtre normale, plutôt que d'annoncer un skin qui aura disparu au prochain
lancement. Testé en faisant échouer l'écriture.

### Dans la version finale

Le skin ne s'y gagne plus : finir les trois niveaux n'y fait rien. Le
vestiaire affiche « Réservé à ceux qui ont joué la bêta, du 27 au 29 novembre
2026. »

## L'écran de fin de bêta

Après l'écran « Niveau terminé » du troisième niveau, une seule fois par
partie : le skin en grand qui marche sur place, ce qu'il faut savoir pour le
garder, et le petit mot demandé — « Un bug croisé en route ? Une idée pour la
suite ? » — avec l'adresse cliquable.

Un chevauchement corrigé en le regardant : l'adresse était posée à une
ordonnée fixe, et le paragraphe au-dessus, passé sur deux lignes, écrivait sa
seconde ligne dessus. Elle se place maintenant **après** le paragraphe, à
l'ordonnée qu'il rend.

## Les conditions d'utilisation

Une section « Version bêta » **en tête** : les dates, le contenu, où signaler
un bug, la manette, et le skin — ce qui le garde, ce qui le perd, sans
promettre plus que ce que le navigateur tient. La progression de la bêta, elle,
n'est pas promise pour la version finale : ce n'est pas décidé.

**Une erreur corrigée au passage.** Le texte annonçait « trois valeurs »
enregistrées dans le navigateur. Il y en avait quatre depuis la course
automatique (prototype 24), cinq avec les récompenses. **La liste n'avait pas
suivi.** Un test lit maintenant les fichiers du jeu sur le disque, relève
chaque clef `bradbitt.*` qu'ils écrivent, et exige que chacune figure dans le
texte — avec le bon nombre en toutes lettres. La liste ne peut plus prendre de
retard.

## La cravate violette à 1000 points : mesurée

Une vague complète vaut **610 points** (8 Lourds × 30, 8 Lanceurs × 20,
16 Serra × 10, bonus 50). 1000 points, c'est une vague entière et les deux
tiers de la suivante, qui va plus vite.

Trois robots, 140 parties :

| robot | médiane | meilleur | ≥ 300 | ≥ 1000 |
|---|---|---|---|---|
| vise le plus proche, esquive | 420 | 520 | 39 / 40 | **0 / 40** |
| vise le plus proche, n'esquive pas | 460 | 500 | 40 / 40 | **0 / 40** |
| anticipe la grille, vise le rang du bas | 920 | 1700 | — | **25 / 60** |

Un robot n'est pas un joueur, et **je ne peux pas confirmer** ce que ça donnera
avec des humains. Mais le signal est net : **à 300, c'était gagné d'avance ; à
1000, il faut viser en anticipant**. Avec la limite de trois parties par jour,
un testeur a au plus neuf essais sur les trois jours de la bêta.

## Vérification

Deux suites, une par édition, sur le même code :

```
node tools/verif.mjs        édition finale   102 vérifications
node tools/verif-beta.mjs   édition bêta      60 vérifications
```

Le serveur de test bascule l'interrupteur **à la volée**, sans toucher au
fichier : ce qui est livré reste exactement ce qui est dans le dossier.

**0 échec sur huit exécutions consécutives de chacune**, et
`tools/verifier_niveaux.js` : aucun défaut de géométrie.

```
A. CHARGEMENT DE LA BÊTA .....................  4
B. LE MENU ...................................  3
C. NOUVELLE PARTIE ...........................  6
D. LES NIVEAUX ...............................  5
E. LES UNIFORMES .............................  7
F. LE SKIN EXCLUSIF .......................... 12
G. LA MANETTE ................................  3
H. LES OUTILS DE DÉVELOPPEMENT ...............  5
I. CONDITIONS ET CONFIDENTIALITÉ .............  6
J. RENDU .....................................  1
K. DE LA BÊTA À LA VERSION FINALE ............  6
L. SESSION ...................................  2
```

Deux échecs à la première exécution, **tous deux dans mes tests** : une partie
artificielle qui n'avait jamais vu la base (le retour jouait donc le dialogue
de découverte — ce qui est juste), et une capture de texte qui recollait les
lignes d'un paragraphe avec « | », si bien que « la version » / « finale » ne
se relisait plus comme « la version finale ».

Version du jeu : **0.25 bêta**.
