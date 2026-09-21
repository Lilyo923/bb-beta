/* =============================================================================
   BRAD BITT, MAIS LE JEU — LA BANDE-ANNONCE

   Elle se lance depuis le menu et tourne dans le navigateur, montage compris.
   Rien n'est pre-calcule : les plans de jeu font TOURNER LE MOTEUR. Le decor
   defile, les Serra se reveillent, Brad court pour de vrai. Ce qui est a
   l'ecran est le jeu, pas une image du jeu.

   ---------------------------------------------------------------------------
   LE MONTAGE EST CALE SUR LA MUSIQUE, PAS SUR UNE HORLOGE

   La piste `bande-annonce` a ete analysee, pas devinee : 70,003 BPM, ecart
   moyen de 7,6 ms a une grille parfaite sur 177 temps, premiere mesure a
   0,0379 s. Un temps dure 0,857110 s, une mesure 3,428440 s, et le montage
   dure exactement 20 mesures.

   Chaque plan est donc place par son NUMERO DE TEMPS, pas par une duree en
   secondes : `b: 20` veut dire « au 21e temps », soit 17,18 s. Deplacer un
   plan, c'est changer un entier.

   Et surtout : l'horloge du montage est `audio.currentTime`, jamais un
   compteur interne. Un compteur interne derive — une image sautee, un onglet
   ralenti, et l'image ne tombe plus avec le son. On avance donc localement
   pour la fluidite, mais on se recale sur la piste des que l'ecart depasse
   RESYNC. Sans piste (fichier absent, lecture refusee), le compteur interne
   prend le relais : le montage tourne quand meme, en silence.

   ---------------------------------------------------------------------------
   COMMENT LE RETOUCHER

   Tout est dans `PLANS_BA`. Un objet par plan, avec son temps de depart. Le
   plan dure jusqu'au suivant — il n'y a aucune duree a tenir a jour, donc
   aucune duree a desynchroniser.
   ========================================================================== */
'use strict';

const BA = {
  piste: 'bande-annonce',
  t0: 0.0379,               // premier temps de la premiere mesure, en secondes
  battement: 0.857110,      // 70,003 BPM
  temps: 80,                // 20 mesures de 4 temps
  resync: 0.06,             // au-dela de cet ecart, on se recale sur la piste
  fondu: 0.28,              // apparition d'un carton
};
const MES_BA = 4 * BA.battement;

/* L'instant, en secondes, du temps numero b (0 = premier temps du morceau). */
function instantBA(b) { return BA.t0 + b * BA.battement; }
const DUREE_BA = instantBA(BA.temps);

/* -----------------------------------------------------------------------------
   LE MONTAGE

   `b`      : le temps ou le plan commence (0 a 79)
   `genre`  : logo · jeu · boss · base · titre · silhouette · dates · studios
   `flash`  : un eclair blanc sur la coupure, pour les entrees en force
-------------------------------------------------------------------------- */

/* SUR QUEL TEMPS COUPER ?

   Le premier montage coupait toutes les deux mesures, donc sur les temps 1 et
   3. C'est la que « des fois, les changements de plan sont plus ou moins en
   raccord ». Les coupures etaient pourtant justes a 8 ms pres : le probleme
   n'etait pas la precision, c'etait LE CHOIX DU TEMPS.

   La mesure des deux bandes de frequence le dit :

     temps 1 : grave 110,8  aigu  68,1   <- la grosse caisse
     temps 2 : grave  46,8  aigu 113,6   <- la caisse claire
     temps 3 : grave   3,6  aigu  80,9   <- presque rien
     temps 4 : grave  41,1  aigu 117,7   <- la caisse claire

   Le temps 3 est un trou. Une coupure sur trois tombait donc dans le silence
   du morceau, et c'est exactement ce qui s'entend.

   Le montage coupe maintenant sur les temps 1 et 4 — la grosse caisse et la
   caisse claire — en plans de 3 temps suivis d'un plan d'1 temps. Ce decoupage
   pousse vers la mesure suivante au lieu de la couper en deux. Le seul temps 3
   utilise est dans la rafale, ou la regularite porte la pulsation. */

const PLANS_BA = [
  /* --- INTRO : mesures 1 a 4 -------------------------------------------
     Dix secondes de studios, puis trois secondes et demie ou Brad dort et
     ouvre les yeux. Le refrain part sur le temps suivant. */
  { b: 0,  genre: 'logo', quoi: 'imagine' },
  /* Au temps 7, pas au 6 : le temps 3 de la mesure est le trou du morceau
     (grave 3,6 contre 110,8 sur le temps 1). Le temps 7 est un temps 4 —
     la caisse claire — et il lance la mesure 3, celle ou l'intro monte. */
  { b: 7,  genre: 'logo', quoi: 'hwr' },
  { b: 12, genre: 'dort' },

  /* --- REFRAIN : mesures 5 a 16 ----------------------------------------
     Coupures sur les temps 1 et 4 de chaque mesure : 3 temps, puis 1. */
  { b: 16, genre: 'jeu', niveau: 'niveau4', x: 177, flash: true },  // mes. 5
  { b: 19, genre: 'jeu', niveau: 'niveau2', x: 114 },
  { b: 20, genre: 'titre', haut: '10 NIVEAUX', bas: 'FARFELUS' },   // mes. 6
  { b: 24, genre: 'jeu', niveau: 'niveau1', x: 51 },                // mes. 7
  { b: 27, genre: 'jeu', niveau: 'niveau3', x: 135 },
  { b: 28, genre: 'jeu', niveau: 'niveau5', x: 54 },                // mes. 8
  { b: 31, genre: 'jeu', niveau: 'niveau6', x: 149 },
  { b: 32, genre: 'titre', haut: 'DES BOSS', bas: 'QUI NE RIGOLENT PAS' },
  { b: 36, genre: 'boss', niveau: 'niveau3', flash: true },         // mes. 10
  { b: 40, genre: 'boss', niveau: 'niveau6' },                      // mes. 11
  { b: 44, genre: 'boss', niveau: 'niveau9' },                      // mes. 12
  { b: 47, genre: 'jeu', niveau: 'niveau9', x: 171 },
  { b: 48, genre: 'titre', haut: 'UNE BASE, UNE BOUTIQUE',          // mes. 13
    bas: 'ET UNE SALLE D\'ARCADE' },
  { b: 52, genre: 'base' },                                         // mes. 14
  { b: 55, genre: 'jeu', niveau: 'niveau7', x: 204 },  // la tour est dans le fond
  // Rafale : un plan par temps. C'est la que la musique cogne le plus fort,
  // et le seul endroit ou le temps 3 sert.
  { b: 56, genre: 'jeu', niveau: 'niveau8', x: 124, flash: true },  // mes. 15
  { b: 57, genre: 'jeu', niveau: 'niveau4', x: 117 },
  { b: 58, genre: 'jeu', niveau: 'niveau6', x: 131 },
  { b: 59, genre: 'jeu', niveau: 'niveau9', x: 123 },
  // Et on retient son souffle une mesure entiere.
  { b: 60, genre: 'silhouette' },                                   // mes. 16

  /* --- OUTRO : mesures 17 a 20, la musique redescend -------------------- */
  { b: 64, genre: 'titre', haut: 'BRAD BITT', bas: 'mais le jeu', logo: true },
  { b: 68, genre: 'dates', etiquette: 'BÊTA OUVERTE', valeur: '27 — 29 NOVEMBRE 2026' },
  { b: 72, genre: 'dates', etiquette: 'SORTIE', valeur: '9 JANVIER 2027' },
  { b: 76, genre: 'studios' },
];

const bandeAnnonce = {
  actif: false,
  t: 0,                     // horloge du montage, en secondes
  plan: null,               // le plan affiche
  indice: -1,
  age: 0,                   // depuis combien de temps ce plan est a l'ecran
  flash: 0,
  sansSon: false,           // la piste n'a pas pu demarrer
};

/* -----------------------------------------------------------------------------
   LANCEMENT ET SORTIE
-------------------------------------------------------------------------- */

function lancerBandeAnnonce() {
  bandeAnnonce.actif = true;
  bandeAnnonce.t = 0;
  bandeAnnonce.plan = null;
  bandeAnnonce.indice = -1;
  bandeAnnonce.age = 0;
  bandeAnnonce.flash = 0;
  bandeAnnonce.sansSon = false;
  CINEMA = true;                       // ni ATH, ni bandeau de mise au point
  scene = 'bandeannonce';

  audio.arreterMusique(0);
  audio.jouerMusiqueDifferee(sourceMusique(BA.piste), 0);
  rembobinerBA();
  appliquerPlanBA(PLANS_BA[0], 0);
}

/* La piste a peut-etre deja servi : on la ramene a zero. Elle n'est pas
   forcement chargee au moment ou l'on demande — d'ou le second essai differe,
   sans quoi la bande-annonce demarrerait au milieu du morceau. */
function rembobinerBA() {
  const el = audio.pistes.get(sourceMusique(BA.piste));
  if (el) { try { el.currentTime = 0; } catch (e) { /* pas encore pret */ } }
  else setTimeout(rembobinerBA, 120);
}

function pisteBA() {
  const el = audio.pistes.get(sourceMusique(BA.piste));
  return (el && audio.musique === el) ? el : null;
}

function quitterBandeAnnonce() {
  bandeAnnonce.actif = false;
  CINEMA = false;
  audio.arreterMusique(0.5);
  const el = audio.pistes.get(sourceMusique(BA.piste));
  if (el) { try { el.pause(); el.currentTime = 0; } catch (e) { /* ignore */ } }
  relacherTout();
  retourAuMenu();
  // retourAuMenu() coupe la musique : le menu remet la sienne de lui-meme au
  // premier passage de majDemo. On ne force rien ici.
}

// Echap ou Entree : on sort. Toute autre touche laisse le montage tranquille.
function validerBandeAnnonce() { quitterBandeAnnonce(); }
function annulerBandeAnnonce() { quitterBandeAnnonce(); }

/* -----------------------------------------------------------------------------
   L'HORLOGE

   On avance de dt, puis on se recale sur la piste. Le recalage est doux tant
   que l'ecart est petit (sinon l'image saute a chaque correction) et sec au-dela
   d'un quart de seconde — la, c'est que la lecture a vraiment decroche.
-------------------------------------------------------------------------- */

function majHorlogeBA(dt) {
  bandeAnnonce.t += dt;
  const el = pisteBA();
  if (!el || el.paused || el.readyState < 2) { bandeAnnonce.sansSon = !el; return; }
  bandeAnnonce.sansSon = false;
  const ecart = el.currentTime - bandeAnnonce.t;
  if (Math.abs(ecart) > 0.25) bandeAnnonce.t = el.currentTime;
  else if (Math.abs(ecart) > BA.resync) bandeAnnonce.t += ecart * 0.25;
}

function majBandeAnnonce(dt) {
  if (!bandeAnnonce.actif) return;
  majHorlogeBA(dt);
  bandeAnnonce.age += dt;
  if (bandeAnnonce.flash > 0) bandeAnnonce.flash -= dt;

  // Le plan qui doit etre a l'ecran maintenant.
  let i = 0;
  while (i + 1 < PLANS_BA.length && bandeAnnonce.t >= instantBA(PLANS_BA[i + 1].b)) i++;
  if (i !== bandeAnnonce.indice) {
    appliquerPlanBA(PLANS_BA[i], i);
    // Un plan saute (onglet en arriere-plan) ne doit pas rejouer son entree
    // depuis le debut : on le prend a l'age qu'il devrait avoir.
    bandeAnnonce.age = Math.max(0, bandeAnnonce.t - instantBA(PLANS_BA[i].b));
  }

  if (bandeAnnonce.t >= DUREE_BA) { quitterBandeAnnonce(); return; }
  simulerPlanBA(dt);
}

/* -----------------------------------------------------------------------------
   LES PLANS DE JEU

   Un plan de jeu charge son niveau, pose Brad a l'endroit voulu, cadre, et
   laisse tourner. Charger un niveau coute entre 0,02 et 0,22 ms : on peut donc
   changer de decor sur un temps sans le moindre a-coup.
-------------------------------------------------------------------------- */

/* Le sol sous une abscisse : le solide le plus BAS qui la recouvre, c'est-a-dire
   celui sur lequel un joueur se tiendrait. Prendre le plus haut poserait Brad
   sur une corniche, ou sur un plafond. */
function solSousBA(px) {
  let sol = null;
  for (const s of solides) {
    if (px < s.x || px > s.x + s.w) continue;
    if (!sol || s.y > sol.y) sol = s;
  }
  return sol;
}

function poserBradBA(xTuile) {
  const px = xTuile * TUILE;
  let sol = solSousBA(px + brad.w / 2);
  // Rien sous cette abscisse : on cherche le sol le plus proche a droite.
  for (let d = 1; !sol && d <= 40; d++) sol = solSousBA(px + d * TUILE);
  brad.x = px;
  brad.y = sol ? sol.y - brad.h : NIVEAU_H - HAUTEUR / 2;
  brad.vx = 0; brad.vy = 0; brad.auSol = true;
  suivreZoneBA();
  cadrerBA();
  reveillerLeCadreBA();
}

/* Les Serra dorment jusqu'a ce que Brad approche — c'est voulu dans le jeu :
   sinon vingt-huit ennemis patrouillent depuis le chargement et ne sont plus
   nulle part quand on arrive. Mais un plan de bande-annonce dure deux
   secondes : on n'a pas le temps de les reveiller en marchant. On reveille
   donc ceux qui sont DANS LE CADRE, et eux seuls. Ils feront ce qu'ils font
   toujours ; simplement, ils le feront tout de suite. */
function reveillerLeCadreBA() {
  for (const e of ennemis) {
    if (e.etat === 'mort') continue;
    const sx = e.x - cam.x;
    if (sx > -60 && sx < LARGEUR + 60) e.dort = false;
  }
}

/* LA ZONE AFFICHEE, A LA MAIN.

   `majTransition` n'est pas appelee pendant un plan : elle declencherait un
   fondu au noir en plein montage des que Brad franchit une limite de zone.
   Mais c'est elle qui tient `zoneAffichee` a jour — et `zoneAffichee` ne sert
   pas qu'a la palette : `ennemiHorsZone` s'en sert pour decider quels ennemis
   dessiner.

   Sans cette ligne, la zone restait a 0 pour tout le montage. Consequence
   observee : Brad au milieu de la piste de danse, dans le decor de la file
   d'attente, et TOUS LES SERRA INVISIBLES — cinq d'entre eux etaient dans le
   cadre, aucun n'etait dessine. On la met donc a jour sechement, sans fondu. */
function suivreZoneBA() {
  if (typeof zoneDe === 'function') zoneAffichee = zoneDe(brad.x);
}

function cadrerBA() {
  cam.x = Math.max(0, Math.min(NIVEAU_L - LARGEUR, brad.x + brad.w / 2 - LARGEUR / 2));
  cam.y = Math.max(0, Math.min(NIVEAU_H - HAUTEUR, brad.y + brad.h - HAUTEUR * 0.66));
}

/* Brad ne doit jamais mourir pendant un plan : une bande-annonce qui bascule
   sur l'ecran de mort au milieu d'un montage, c'est fini. Il est donc
   invincible partout, y compris dans les arenes.

   J'ai essaye de lui rendre le recul dans les arenes, en pensant que c'etait
   lui qui separerait Brad du Seraphin. Ce n'etait pas la cause : la mesure de
   la distance l'etait (voir combattreBA). Une fois la portee calculee entre
   les bords, le chevauchement est tombe de 90 % a 7 % sans toucher a
   l'invincibilite — et la garder evite qu'un coup encaisse projette Brad dans
   un trou au milieu d'un plan de niveau. */
function rendreBradIntouchable() {
  brad.pvMax = 99; brad.pv = 99;
  brad.invincible = 9999;
}

function appliquerPlanBA(p, i) {
  bandeAnnonce.plan = p;
  bandeAnnonce.indice = i;
  bandeAnnonce.age = 0;
  if (p.flash) bandeAnnonce.flash = 0.16;

  if (p.genre === 'jeu' || p.genre === 'boss') {
    relancerNiveau(p.niveau);            // remet scene a 'jeu' : on la reprend
    scene = 'bandeannonce';
    rendreBradIntouchable();
    if (p.genre === 'boss') {
      /* Un boss n'apparait que lorsque Brad FRANCHIT la ligne d'entree de son
         arene. On entre donc d'abord, on laisse une demi-seconde pour qu'il
         surgisse — puis on RAMENE Brad a cote de lui.

         Sans ce second saut, le plan ratait : entre la ligne d'entree et le
         boss il y a une trentaine de tuiles, soit trois secondes et demie de
         course. Le plan en dure moins de deux : on ne voyait que Brad courant
         seul vers un adversaire hors du cadre. */
      poserBradBA(ARENE ? ARENE.x1 / TUILE + 4 : p.x || 40);
      for (let k = 0; k < 60; k++) pasDeSimulationBA(1 / 120);
      if (arene.boss) {
        poserBradBA((arene.boss.x - 96) / TUILE);
        for (let k = 0; k < 12; k++) pasDeSimulationBA(1 / 120);
        cadrerBA();
      }
    } else {
      poserBradBA(p.x);
    }
    return;
  }

  if (p.genre === 'base') {
    // PAS entrerHub() : il relance la musique de la base, ce qui couperait la
    // bande-annonce en deux.
    reinitialiserHub();
    scene = 'bandeannonce';
  }
}

/* Une image de simulation de niveau. On ne touche ni a majTransition (un
   changement de zone en plein plan ferait un fondu au noir hors montage) ni a
   la porte : le plan s'arrete de lui-meme au temps suivant. */
function pasDeSimulationBA(dt) {
  majMobiles(dt); majTerrain(dt); majBrad(dt); majEnnemis(dt);
  majArene(dt); majBoules(dt); majRamassages(dt); majCamera(dt); majEffets(dt);
  suivreZoneBA();
  // Ceinture : si quoi que ce soit a tente de changer de scene (mort, porte,
  // dialogue), on reprend la main immediatement.
  if (scene !== 'bandeannonce') scene = 'bandeannonce';
}

/* BRAD NE DOIT PAS TOMBER.

   C'etait le defaut le plus voyant du premier montage : Brad courait droit
   devant, ratait un trou, disparaissait par le bas — et la camera continuait
   d'avancer sans lui. Sur vingt plans, ça arrivait a la moitie.

   La cause etait bete : il sautait A INTERVALLE FIXE, une fois par seconde
   environ, sans regarder ou il mettait les pieds. Il saute maintenant PARCE
   QU'IL Y A UN TROU, exactement comme le robot qui traverse les niveaux dans
   la suite de verification. Trois regles, et elles suffisent :

   1. pas de sol devant a une tuile -> sauter ;
   2. le bouton de saut se TIENT pendant toute la montee. Le relacher aussitot
      declenche la gravite renforcee du saut court : Brad ne monte plus qu'au
      tiers de la hauteur et retombe dans le trou qu'il visait ;
   3. en l'air, en train de tomber, au-dessus du vide, avec un appui derriere :
      freiner. C'est le reflexe qu'a un joueur et que n'a pas une machine.
*/
function ilYaDuSolBA(px, ligne) {
  if (typeof solSousOuDessous === 'function' && solSousOuDessous(px, ligne, 130)) return true;
  if (typeof DALLES !== 'undefined') {
    for (const d of DALLES) {
      if (d.etat === 'tombee') continue;
      if (px >= d.x && px <= d.x + d.w && Math.abs(d.y - ligne) < 30) return true;
    }
  }
  if (typeof MOBILES !== 'undefined') {
    for (const m of MOBILES) {
      if (px >= m.x - 20 && px <= m.x + m.w + 20 && Math.abs(m.y - ligne) < 30) return true;
    }
  }
  return false;
}

/* Un appui quelconque sous cette abscisse, a n'importe quelle profondeur. */
function appuiSousBA(px, ligne) {
  for (const s of solides) if (px >= s.x && px <= s.x + s.w && s.y >= ligne - 8) return true;
  for (const t of traversantes) if (px >= t.x && px <= t.x + t.w && t.y >= ligne - 8) return true;
  if (typeof DALLES !== 'undefined') {
    for (const d of DALLES) {
      if (d.etat !== 'tombee' && px >= d.x && px <= d.x + d.w && d.y >= ligne - 8) return true;
    }
  }
  if (typeof MOBILES !== 'undefined') {
    for (const m of MOBILES) {
      if (px >= m.x - 10 && px <= m.x + m.w + 10 && m.y >= ligne - 8) return true;
    }
  }
  return false;
}

/* LES PLANS DE BOSS : BRAD SE BAT, IL NE COURT PLUS.

   Il avançait tout droit comme dans les plans de niveau — il depassait donc le
   boss en une demi-seconde et finissait « dans le coin droit en train de
   courir sans s'arreter ». Un plan de boss ou l'adversaire est hors champ ne
   montre rien.

   Il a maintenant la conduite du robot qui gagne les combats dans la suite de
   verification : aller au contact, S'ARRETER A PORTEE DE POING, frapper en
   cadence, sauter quand la cible est au-dessus de lui. Le coup part DEVANT
   Brad : se coller au centre de la cible ferait passer la zone d'attaque
   derriere elle, et il taperait dans le vide en oscillant dessus.

   Pendant un bonneteau (le Seraphin se duplique), il vise la copie qui EST le
   boss — sinon la bande-annonce le montrerait en train de frapper des
   mirages. */
/* LA DISTANCE SE MESURE ENTRE LES BORDS, PAS ENTRE LES CENTRES.

   Premiere version : « s'arreter a 44 px ». Mesures de centre a centre — or le
   Serra-Seraphin est large. Brad s'arretait donc a 13 px de son centre,
   c'est-a-dire DEDANS, et comme il etait invincible rien ne l'en repoussait :
   il restait plante la, immobile, le monstre superpose a lui. 90 % des images
   du plan avec les deux sprites l'un dans l'autre.

   Deux corrections. La portee se calcule maintenant a partir des demi-largeurs
   des deux corps, donc elle s'adapte a la taille du boss. Et le combat a un
   RYTHME : Brad avance, frappe, recule, revient. C'est ce que fait un joueur,
   c'est ce qui empeche l'image de se figer, et c'est ce qui fait qu'un plan de
   deux secondes ressemble a un duel plutot qu'a une collision. */
const BA_CYCLE = 1.0;        // duree d'un aller-retour, en secondes
const BA_MARGE = 12;         // jeu entre les deux corps quand il frappe
const BA_RECUL = 36;         // de combien il se degage entre deux assauts
const BA_ASSAUT = 0.75;      // part du cycle passee a l'attaque
const BA_FENETRE = 34;       // au-dela de la portee, il ne frappe plus

/* Les trois derniers chiffres sont mesures, pas choisis. Quatre reglages ont
   ete compares sur les trois plans de boss, en comptant les coups portes, le
   chevauchement des sprites et les images ou Brad ne bouge pas :

     sans recul      3: 2 coups  0% colles   |  6: 0  7%  |  9: 1  0%
     0,85 / 24 px    3: 3        0%          |  6: 0  7%  |  9: 4  0%
     0,75 / 36 px    3: 5        0%          |  6: 1  7%  |  9: 3  0%
     0,62 / 54 px    3: 2        0%          |  6: 6  7%  |  9: 2  0%

   Le chevauchement ne depend pas du recul — il est tombe de 90 % a 0-7 % le
   jour ou la portee s'est calculee entre les BORDS. Le recul, lui, sert au
   mouvement : c'est ce qui empeche l'image de se figer. 0,75 / 36 garde Brad
   engage le plus longtemps sans qu'il se colle. */

function combattreBA(dt) {
  const b = arene.boss;
  if (!b || b.etat === 'mort') return false;

  const vraie = (arene.copies && arene.copies.find(c => c.vrai)) || null;
  const cible = vraie || b;
  const cx = cible.x + cible.w / 2;
  const dx = cx - (brad.x + brad.w / 2);
  const d = Math.abs(dx);
  const vers = Math.sign(dx) || 1;

  // Portee de frappe : les deux corps se touchent presque, sans se traverser.
  const portee = (brad.w + cible.w) / 2 + BA_MARGE;
  // Phase du cycle : les deux premiers tiers a l'assaut, le dernier en retrait.
  const phase = (bandeAnnonce.age % BA_CYCLE) / BA_CYCLE;
  const assaut = phase < BA_ASSAUT;
  const voulue = assaut ? portee : portee + BA_RECUL;

  // On avance ou on recule selon l'ecart a la distance voulue. La zone morte
  // evite qu'il tremble sur place autour de sa cible.
  let sens = 0;
  if (d > voulue + 8) sens = vers;
  else if (d < voulue - 8) sens = -vers;
  entrees.droite = sens > 0;
  entrees.gauche = sens < 0;
  entrees.courir = Math.abs(d - voulue) > 70;

  // Il ne frappe que pendant l'assaut, et seulement s'il est a portee.
  const cadence = 0.30;
  const frappe = assaut && d < portee + BA_FENETRE &&
    Math.floor(bandeAnnonce.age / cadence) !== Math.floor((bandeAnnonce.age - dt) / cadence);
  entrees.attaque = assaut && (bandeAnnonce.age * 1000 | 0) % 300 < 130;
  if (frappe) attaquePresseeCeTick = true;

  // On saute quand le centre de la cible est au-dessus du sien, et seulement
  // quand on est presque dessous : sauter de loin ne sert a rien.
  const dessus = cible.y + cible.h / 2 < brad.y + brad.h / 2 - 6;
  if (brad.auSol && assaut && d < portee + 30 && dessus) {
    entrees.saut = true; sautPresseCeTick = true;
  } else if (!brad.auSol && brad.vy < 0) entrees.saut = true;
  else entrees.saut = false;
  return true;
}

function simulerPlanBA(dt) {
  const p = bandeAnnonce.plan;
  if (!p) return;

  if (p.genre === 'base') { hub.t += dt; hub.braddy.phase += dt; return; }
  if (p.genre !== 'jeu' && p.genre !== 'boss') return;

  if (p.genre === 'boss' && combattreBA(dt)) {
    rendreBradIntouchable();
    pasDeSimulationBA(dt);
    return;
  }

  const ligne = brad.y + brad.h;
  const centre = brad.x + brad.w / 2;
  const solDevant = ilYaDuSolBA(brad.x + brad.w + 26, ligne);
  const enChuteAuDessusDuVide = !brad.auSol && brad.vy > 0 && !appuiSousBA(centre, ligne);
  const freiner = enChuteAuDessusDuVide &&
                  !appuiSousBA(centre + 70, ligne) && appuiSousBA(centre - 70, ligne);

  // Brad avance : c'est ce qui fait defiler le decor et reveille les Serra.
  // Un plan « marche » le laisse au pas, pour les moments calmes.
  entrees.droite = !freiner;
  entrees.gauche = freiner;
  entrees.courir = !p.marche && !freiner;
  const frappe = p.genre === 'boss' && Math.floor(bandeAnnonce.age * 4) % 3 === 0;
  entrees.attaque = frappe;
  if (frappe) attaquePresseeCeTick = true;

  if (brad.auSol && !solDevant) { entrees.saut = true; sautPresseCeTick = true; }
  else if (!brad.auSol && brad.vy < 0) entrees.saut = true;   // on TIENT le bouton
  else entrees.saut = false;

  rendreBradIntouchable();
  pasDeSimulationBA(dt);
}

/* -----------------------------------------------------------------------------
   RENDU
-------------------------------------------------------------------------- */

function dessinerBandeAnnonce() {
  const p = bandeAnnonce.plan;
  ctx.fillStyle = '#05060c';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  if (!p) return;

  switch (p.genre) {
    case 'jeu':
    case 'boss':        rendreNiveau(); break;
    case 'base':        dessinerHub(); break;
    case 'logo':        planLogoBA(p); break;
    case 'dort':        planDortBA(p); break;
    case 'titre':       planTitreBA(p); break;
    case 'silhouette':  planSilhouetteBA(p); break;
    case 'dates':       planDatesBA(p); break;
    case 'studios':     planStudiosBA(p); break;
  }

  voileBA();
  if (bandeAnnonce.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (bandeAnnonce.flash / 0.16 * 0.55).toFixed(3) + ')';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }
  /* AUCUNE INDICATION A L'ECRAN.

     Un « Échap » en bas a droite se retrouve dans l'enregistrement, et une
     bande-annonce qui affiche ses propres commandes n'est plus une
     bande-annonce. La touche fonctionne toujours — elle ne s'annonce plus. */
}

/* Le tout premier plan monte du noir, le tout dernier y redescend : une
   bande-annonce ne commence pas et ne finit pas sur une image nue. */
function voileBA() {
  const t = bandeAnnonce.t;
  let noir = 0;
  if (t < 1.2) noir = 1 - t / 1.2;
  const reste = DUREE_BA - t;
  if (reste < 1.6) noir = Math.max(noir, 1 - reste / 1.6);
  if (noir <= 0) return;
  ctx.fillStyle = 'rgba(0,0,0,' + Math.min(1, noir).toFixed(3) + ')';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
}

/* L'apparition d'un carton : sec, cale sur le temps. Le texte grandit de 4 %
   en 0,28 s puis ne bouge plus — assez pour que l'oeil sente la coupure, assez
   peu pour rester lisible. */
function entreeCarton() {
  const a = Math.min(1, bandeAnnonce.age / BA.fondu);
  return { alpha: a, echelle: 1.04 - 0.04 * a };
}

function planLogoBA(p) {
  const e = entreeCarton();
  ctx.save();
  ctx.globalAlpha = e.alpha;
  if (p.quoi === 'hwr') {
    dessinerLogoHwr(LARGEUR / 2, HAUTEUR / 2 - 8, 104);
  } else if (logos.imagine) {
    const w = 260, h = logos.imagine.height * w / logos.imagine.width;
    ctx.drawImage(logos.imagine, LARGEUR / 2 - w / 2, HAUTEUR / 2 - 8 - h / 2, w, h);
  }
  ctx.restore();
  ctx.globalAlpha = e.alpha * 0.55;
  texteCentre(p.quoi === 'hwr' ? 'HwR Engine' : 'IMAGINe Studio',
              HAUTEUR / 2 + 74, '11px system-ui, sans-serif', 'rgba(255,255,255,.6)');
  ctx.globalAlpha = 1;
}

function planTitreBA(p) {
  const e = entreeCarton();
  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.translate(LARGEUR / 2, HAUTEUR / 2);
  ctx.scale(e.echelle, e.echelle);
  ctx.translate(-LARGEUR / 2, -HAUTEUR / 2);

  /* CENTRAGE.

     Le bloc etait cale trop haut : le titre sur une ligne de base a 158, et le
     filet superieur a 126 mordait sur les capitales. On centre maintenant le
     BLOC (titre + sous-titre) sur le milieu de l'ecran, et les deux filets
     sont poses symetriquement autour de lui. */
  let hautFilet, basFilet;
  if (p.logo) {
    texteCentre(p.haut, 180, 'bold 42px system-ui, sans-serif', '#f2f3f8');
    texteCentre(p.bas, 208, 'italic 17px system-ui, sans-serif', '#e8b62c');
    hautFilet = 126; basFilet = 236;
  } else {
    texteCentre(p.haut, 170, 'bold 27px system-ui, sans-serif', '#e8b62c');
    texteCentre(p.bas, 202, 'bold 19px system-ui, sans-serif', '#f2f3f8');
    hautFilet = 132; basFilet = 230;
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // Deux filets qui s'ecartent sur le premier temps : le carton respire.
  const l = 60 + 150 * Math.min(1, bandeAnnonce.age / 0.5);
  ctx.fillStyle = 'rgba(232,182,44,.3)';
  ctx.fillRect(LARGEUR / 2 - l / 2, hautFilet, l, 1);
  ctx.fillRect(LARGEUR / 2 - l / 2, basFilet, l, 1);
}

/* Kirby 67 a CONTRE-JOUR. On ne montre ni son visage ni son arene : la
   bande-annonce sort avant la bêta, et la fin du jeu reste une surprise.

   Un contre-jour, c'est une forme SOMBRE devant une source lumineuse — pas une
   forme claire sur du noir. Le premier essai peignait la silhouette en blanc :
   on obtenait une tache blanche qui ne ressemblait a personne. On peint donc la
   lueur derriere, et le personnage par-dessus, presque noir. */
function planSilhouetteBA(p) {
  const a = Math.min(1, bandeAnnonce.age / 0.6);

  const g = ctx.createRadialGradient(LARGEUR / 2, 168, 8, LARGEUR / 2, 168, 250);
  g.addColorStop(0,    'rgba(150,236,255,' + (0.95 * a).toFixed(3) + ')');
  g.addColorStop(0.22, 'rgba(58,192,220,'  + (0.62 * a).toFixed(3) + ')');
  g.addColorStop(0.6,  'rgba(22,64,104,'   + (0.30 * a).toFixed(3) + ')');
  g.addColorStop(1,    'rgba(5,6,12,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // Un sol, pour qu'il se tienne quelque part.
  ctx.fillStyle = 'rgba(4,5,10,.92)';
  ctx.fillRect(0, 252, LARGEUR, HAUTEUR - 252);

  const img = sprites.kirby;
  if (img) {
    // La planche fait 4 colonnes x 3 lignes : on en prend une seule cellule.
    const cw = img.width / 4, ch = img.height / 3;
    const ech = 4.4;
    const x = Math.round(LARGEUR / 2 - cw * ech / 2);
    const y = Math.round(254 - ch * ech);
    const sombre = teinter(img, '#04050b');
    ctx.save();
    ctx.globalAlpha = a;
    ctx.drawImage(sombre, 0, 0, cw, ch, x, y, Math.round(cw * ech), Math.round(ch * ech));
    ctx.restore();
  }
  ctx.globalAlpha = a;
  texteCentre('IL VOUS ATTEND', 300, 'bold 15px system-ui, sans-serif', '#f2f3f8');
  ctx.globalAlpha = 1;
}

/* -----------------------------------------------------------------------------
   BRAD DORT, PUIS OUVRE LES YEUX

   Le plan qui fait basculer la bande-annonce. Trois secondes et demie : deux
   secondes et demie de sommeil, puis il se redresse d'un coup — et le refrain
   part sur le temps suivant.

   Dessine a la main plutot que joue dans un niveau : il n'existe pas de
   chambre dans le jeu, et un plan aussi court doit etre lisible tout de suite.
-------------------------------------------------------------------------- */

const BA_REVEIL = 2.5;        // a quel age du plan il ouvre les yeux

function planDortBA(p) {
  const age = bandeAnnonce.age;
  const reveille = age >= BA_REVEIL;
  const depuis = Math.max(0, age - BA_REVEIL);
  // La lumiere monte d'un coup au reveil, puis se stabilise.
  const lum = reveille ? Math.min(1, depuis / 0.35) : 0;

  /* La chambre occupe tout le cadre. Premiere version : un lit minuscule pose
     bas, et cent pixels de noir en dessous. Le sol est maintenant a 296, le
     lit large, et Brad agrandi d'un tiers — a cette taille on voit qu'il dort,
     ce qui est tout l'interet du plan. */
  const SOL = 296, ECH = 1.4;

  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  // fenetre, avec la lune
  const fx = 74, fy = 48, fw = 132, fh = 104;
  ctx.fillStyle = '#16203a';
  ctx.fillRect(fx, fy, fw, fh);
  ctx.fillStyle = 'rgba(214,228,255,' + (0.55 + 0.3 * lum).toFixed(3) + ')';
  ctx.beginPath(); ctx.arc(fx + 92, fy + 34, 15, 0, 6.2832); ctx.fill();
  ctx.fillStyle = 'rgba(214,228,255,.10)';
  for (let i = 0; i < 14; i++) {
    ctx.fillRect(fx + 8 + (i * 37) % (fw - 14), fy + 12 + (i * 53) % (fh - 20), 2, 2);
  }
  ctx.fillStyle = '#0b0e18';
  ctx.fillRect(fx + fw / 2 - 3, fy, 6, fh);
  ctx.fillRect(fx, fy + fh / 2 - 3, fw, 6);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 3;
  ctx.strokeRect(fx + 1.5, fy + 1.5, fw - 3, fh - 3);

  // mur, puis plinthe et sol
  ctx.fillStyle = 'rgba(255,255,255,' + (0.035 + 0.05 * lum).toFixed(3) + ')';
  ctx.fillRect(0, 0, LARGEUR, SOL);
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  ctx.fillRect(0, SOL - 8, LARGEUR, 8);
  ctx.fillStyle = '#070912';
  ctx.fillRect(0, SOL, LARGEUR, HAUTEUR - SOL);

  // --- le lit
  const litX = 224, litY = SOL - 42, litL = 262;
  ctx.fillStyle = '#1d1726';
  ctx.fillRect(litX - 14, litY - 58, 16, 100);              // tete de lit
  ctx.fillRect(litX + litL - 2, litY - 32, 16, 74);         // pied de lit
  ctx.fillStyle = '#2a2033';
  ctx.fillRect(litX, litY, litL, 42);                       // matelas
  ctx.fillStyle = '#3b2c47';
  ctx.fillRect(litX, litY - 6, litL, 9);                    // drap
  ctx.fillStyle = '#d9dced';
  ctx.fillRect(litX + 14, litY - 17, 56, 15);               // oreiller

  /* --- Brad

     Couche, il tourne d'un quart de tour : ses pieds restent au point d'ancrage
     et sa tete part vers l'oreiller, a gauche. Mais une rotation autour des
     pieds met son AXE DU CORPS a la hauteur du point d'ancrage — donc la
     moitie de lui sous le matelas. Premiere version : Brad a moitie enfonce
     dans le lit. On releve donc l'ancrage de la demi-epaisseur du corps quand
     il est couche, et on ramene ce decalage a zero quand il se redresse. */
  const cx = litX + 120, sol = litY;
  const a = reveille ? Math.min(1, depuis / 0.3) : 0;
  ctx.save();
  ctx.translate(cx, sol - 24 * (1 - a));
  ctx.scale(ECH, ECH);
  // Un petit depassement au redressement, pour que le mouvement claque.
  ctx.rotate(-Math.PI / 2 * (1 - a) + (reveille ? Math.sin(a * Math.PI) * 0.12 : 0));
  dessinerPlancheBrad(0, 0, 1, 1,
    { ligne: BRAD_PLANCHE.repos, colonne: Math.floor(age * 2) % 4 });
  ctx.restore();

  // --- les Zzz, tant qu'il dort
  if (!reveille) {
    ctx.textAlign = 'left';
    for (let i = 0; i < 3; i++) {
      const t = (age * 0.55 + i * 0.34) % 1;
      ctx.globalAlpha = Math.max(0, 0.8 * (1 - t));
      ctx.font = 'bold ' + (11 + i * 5) + 'px system-ui, sans-serif';
      ctx.fillStyle = '#cfd6ee';
      ctx.fillText('z', cx + 34 + t * 44, litY - 34 - t * 76);
    }
    ctx.globalAlpha = 1;
  } else if (depuis < 0.55) {
    // Les yeux qui s'ouvrent : deux eclats, puis un « ! ».
    const a = 1 - depuis / 0.55;
    ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.95).toFixed(3) + ')';
    ctx.fillRect(cx - 10, sol - 56, 6, 4);
    ctx.fillRect(cx + 3, sol - 56, 6, 4);
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232,182,44,' + a.toFixed(3) + ')';
    ctx.fillText('!', cx + 46, sol - 58 - (1 - a) * 12);
    ctx.textAlign = 'left';
  }

  // Un voile sombre qui se leve au reveil : la chambre etait une veilleuse.
  if (lum < 1) {
    ctx.fillStyle = 'rgba(2,3,8,' + (0.34 * (1 - lum)).toFixed(3) + ')';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }
}

function planDatesBA(p) {
  const e = entreeCarton();
  ctx.globalAlpha = e.alpha;
  texteCentre(p.etiquette, 152, '12px system-ui, sans-serif', 'rgba(232,182,44,.9)');
  ctx.fillStyle = 'rgba(232,182,44,.3)';
  ctx.fillRect(LARGEUR / 2 - 54, 162, 108, 1);
  texteCentre(p.valeur, 196, 'bold 24px system-ui, sans-serif', '#f2f3f8');
  ctx.globalAlpha = 1;
}

/* La mention sur les agents conversationnels. Elle remplace la ligne de pied
   de page, a l'endroit le plus lu d'une fin de bande-annonce : juste sous les
   noms des studios. Meme fond que le generique, meme franchise. */
const MENTION_IA_BA = [
  'Plusieurs agents conversationnels ont été utilisés dans la création',
  'de ce jeu. L\'idée et le concept général ont été imaginés par un humain.',
];

/* LES SUPPORTS.

   Trois facons de jouer, et elles existent toutes les trois dans le code :
   les boutons tactiles (js/entrees.js, zone `tactile`), le clavier et la
   souris, et la manette (le module en bas du meme fichier).

   « Console » porte une etoile, et l'etoile dit exactement ce qu'elle vaut :
   le jeu n'est pas publie sur console, il se joue au navigateur avec une
   manette. Ecrire « Consoles » tout court serait une promesse que le jeu ne
   tient pas. */
const SUPPORTS_BA = 'Mobile  ·  PC  ·  Console *';
const ETOILE_BA = '* par le support des manettes, dans le navigateur';

function planStudiosBA(p) {
  const e = entreeCarton();
  ctx.globalAlpha = e.alpha;
  if (logos.imagine) {
    const w = 146, h = logos.imagine.height * w / logos.imagine.width;
    ctx.drawImage(logos.imagine, LARGEUR / 2 - w / 2, 74, w, h);
  }
  dessinerLogoHwr(LARGEUR / 2, 166, 58);
  texteCentre('IMAGINe Studio  ×  HwR Engine', 214,
              '11px system-ui, sans-serif', 'rgba(255,255,255,.55)');

  // Un filet, puis les supports : c'est une information, pas une signature.
  ctx.fillStyle = 'rgba(255,255,255,.10)';
  ctx.fillRect(LARGEUR / 2 - 110, 230, 220, 1);
  texteCentre('Écran tactile  ·  Clavier et souris  ·  Manette', 250,
              '10px system-ui, sans-serif', 'rgba(255,255,255,.5)');
  texteCentre(SUPPORTS_BA, 270, 'bold 13px system-ui, sans-serif', '#e8b62c');
  texteCentre(ETOILE_BA, 286, 'italic 9px system-ui, sans-serif',
              'rgba(255,255,255,.34)');

  MENTION_IA_BA.forEach((ligne, i) =>
    texteCentre(ligne, 312 + i * 13, '9px system-ui, sans-serif',
                'rgba(255,255,255,.34)'));
  ctx.globalAlpha = 1;
}
