/* =============================================================================
   BRAD BITT, MAIS LE JEU — CE QUI N'EXISTE QUE PENDANT LA BETA

   Trois choses, et rien d'autre :

   1. LE « BÊTA ! » DU MENU, en diagonale, jaune, qui palpite — a la maniere
      des phrases jaunes de l'ecran titre de Minecraft. Meme angle (-20°), meme
      pulsation (5,5 % d'amplitude, deux battements par seconde), meme ombre
      portee au quart de la luminosite.

   2. L'AVERTISSEMENT de « Nouvelle partie » : c'est une beta, il peut y avoir
      des bugs, voici ou les signaler. A chaque nouvelle partie — c'est le
      moment ou l'on s'engage, et c'est la qu'il faut le savoir.

   3. L'ECRAN DE FIN DE BETA, apres le troisieme niveau : le skin exclusif, ce
      qu'il faut savoir pour le garder, et l'invitation a ecrire au studio.

   Tout le reste de la beta — niveaux fermes, uniformes, manette, panneau de
   developpement — est un verrou pose dans le code existant, a l'endroit ou la
   chose se decide. Voir js/edition.js.
   ========================================================================== */
'use strict';

/* -----------------------------------------------------------------------------
   1. LE « BÊTA ! » DU MENU
-------------------------------------------------------------------------- */

const SPLASH_BETA = 'Bêta !';

// L'onglet du navigateur le dit aussi : c'est ce qu'on voit dans une capture.
if (BETA) document.title = 'Brad Bitt, mais le jeu — bêta';

function dessinerSplashBeta() {
  if (!BETA) return;
  // On se cale sur le titre REEL : sa largeur se mesure, elle ne se devine pas
  // (la police systeme n'a pas la meme chasse sur Mac, Windows et Android).
  ctx.font = 'bold 34px system-ui, sans-serif';
  const bordTitre = LARGEUR / 2 + ctx.measureText('BRAD BITT').width / 2;

  const t = performance.now() / 1000;
  const echelle = 1 - Math.abs(Math.sin(t * Math.PI * 2)) * 0.055;

  ctx.save();
  ctx.translate(Math.round(bordTitre + 4), 82);
  ctx.rotate(-20 * Math.PI / 180);
  ctx.scale(echelle, echelle);
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#3f3f00';                  // l'ombre, au quart du jaune
  ctx.fillText(SPLASH_BETA, 1.5, 1.5);
  ctx.fillStyle = '#ffff00';
  ctx.fillText(SPLASH_BETA, 0, 0);
  ctx.restore();
  ctx.textAlign = 'left';
}

/* -----------------------------------------------------------------------------
   PETITS OUTILS COMMUNS AUX DEUX ECRANS
-------------------------------------------------------------------------- */

/* Un paragraphe coupe a la largeur donnee, centre. Rend l'ordonnee suivante. */
function paragrapheCentre(texte, y, largeur, police, couleur, interligne) {
  ctx.font = police;
  ctx.fillStyle = couleur;
  ctx.textAlign = 'center';
  for (const ligne of lignesDe(texte, largeur)) {
    ctx.fillText(ligne, LARGEUR / 2, y);
    y += interligne;
  }
  ctx.textAlign = 'left';
  return y;
}

/* L'adresse du studio, en bleu et soulignee, cliquable : elle ouvre le
   courriel pre-rempli (version, appareil, navigateur) — celui des options.
   Precedee d'une invite en gris, le tout centre. */
function lienCourriel(invite, y) {
  ctx.font = '10.5px system-ui, sans-serif';
  const wi = ctx.measureText(invite).width;
  const wa = ctx.measureText(CONTACT_MAIL).width;
  let x = (LARGEUR - wi - wa) / 2;
  const dessus = souris.survol && souris.survol.action === 'ecrire-studio';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.62)';
  ctx.fillText(invite, x, y);
  x += wi;
  ctx.fillStyle = dessus ? '#a8d4ff' : BLEU_LIEN;
  ctx.fillText(CONTACT_MAIL, x, y);
  ctx.fillRect(x, y + 2, wa, 1);
  zone(x - 3, y - 11, wa + 6, 16, 'ecrire-studio');
}

function boutonBeta(nom, action, x, y, l, primaire) {
  const h = 28;
  const survol = souris.survol && souris.survol.action === action;
  ctx.fillStyle = primaire
    ? (survol ? 'rgba(232,182,44,.32)' : 'rgba(232,182,44,.16)')
    : (survol ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)');
  ctx.fillRect(x, y, l, h);
  ctx.strokeStyle = primaire ? (survol ? '#ffe9a8' : '#e8b62c')
                             : (survol ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.22)');
  ctx.lineWidth = 1;
  ctx.strokeRect(x + .5, y + .5, l - 1, h - 1);
  texteCentreEn(nom, x + l / 2, y + 18, (primaire ? 'bold ' : '') + '12px system-ui, sans-serif',
                primaire ? '#ffe9a8' : 'rgba(255,255,255,.72)');
  zone(x, y, l, h, action);
}

/* -----------------------------------------------------------------------------
   2. L'AVERTISSEMENT DE « NOUVELLE PARTIE »
-------------------------------------------------------------------------- */

const avisBeta = { suite: null };

/* `suite` est ce que « Nouvelle partie » aurait fait sans la beta : demander
   s'il faut ecraser la partie, puis choisir la difficulte. L'avertissement
   s'intercale AVANT, et ne change rien a la suite. */
function ouvrirAvisBeta(suite) {
  avisBeta.suite = suite;
  scene = 'avisbeta';
  audio.bruit('menu');
}

function validerAvisBeta() {
  const suite = avisBeta.suite;
  avisBeta.suite = null;
  scene = 'menu';
  audio.bruit('valider');
  if (suite) suite();
}

function annulerAvisBeta() {
  avisBeta.suite = null;
  scene = 'menu';
  audio.bruit('menu');
}

function dessinerAvisBeta() {
  dessinerDemo();
  ctx.fillStyle = 'rgba(9,11,20,.78)';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  cadre(84, 46, LARGEUR - 168, 268);

  texteCentre('VERSION BÊTA', 76, 'bold 18px system-ui, sans-serif', '#ffff00');

  let y = 104;
  y = paragrapheCentre('Tu t\'apprêtes à jouer à la bêta ouverte de Brad Bitt, mais le jeu. '
    + 'Elle peut comporter des bugs plus ou moins mineurs : un décor mal placé, '
    + 'un ennemi coincé, un écran qui tarde à répondre.',
    y, LARGEUR - 220, '11px system-ui, sans-serif', 'rgba(255,255,255,.82)', 15);

  y += 8;
  y = paragrapheCentre('Au programme : l\'introduction et les trois premiers niveaux. '
    + 'Termine-les pour gagner un skin exclusif.',
    y, LARGEUR - 220, '11px system-ui, sans-serif', 'rgba(255,255,255,.6)', 15);

  y += 14;
  y = paragrapheCentre('Un bug, une idée ? Tout est bon à prendre.',
    y, LARGEUR - 220, '10.5px system-ui, sans-serif', 'rgba(255,255,255,.62)', 14);
  lienCourriel('Écris-nous : ', y + 2);

  const l = 150, yb = 246;
  boutonBeta('C\'est parti ▸', 'avisbeta-ok', LARGEUR / 2 - l - 6, yb, l, true);
  boutonBeta('Retour', 'avisbeta-retour', LARGEUR / 2 + 6, yb, l, false);

  texteCentre('Entrée pour continuer · Échap pour revenir',
              296, '9.5px system-ui, sans-serif', 'rgba(255,255,255,.3)');
}

/* -----------------------------------------------------------------------------
   3. LA FIN DE LA BETA

   Elle se declenche une fois, au moment exact ou le troisieme des trois
   niveaux est termine pour la premiere fois dans cette partie. La recompense
   est ECRITE a cet instant, avant meme l'ecran : un onglet ferme pendant
   l'ecran de fin ne doit pas couter le skin.
-------------------------------------------------------------------------- */

const finBeta = {
  aAfficher: false,
  nouveau: false,       // le skin vient-il d'etre gagne, ou l'avait-on deja ?
  enregistre: false,    // le navigateur a-t-il pu l'ecrire ?
  t0: 0,
};

/* Appelee par terminerNiveau(), juste apres l'enregistrement du niveau. */
function noterNiveauBeta(id, premiereFois) {
  if (!BETA || !premiereFois) return;
  if (NIVEAUX_RECOMPENSE_BETA.indexOf(id) < 0) return;
  if (!trioBetaTermine()) return;
  finBeta.nouveau = accorderRecompense('beta-testeur');
  finBeta.enregistre = recompenseObtenue('beta-testeur');
  finBeta.aAfficher = true;
}

function ouvrirFinBeta() {
  finBeta.aAfficher = false;
  finBeta.t0 = performance.now();
  audio.arreterMusique(0.8);
  audio.bruit('victoire');
  scene = 'finbeta';
}

function quitterFinBeta() {
  audio.bruit('valider');
  rentrerALaBase();
}

function dessinerFinBeta() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  texteCentre('FIN DE LA BÊTA', 40, 'bold 20px system-ui, sans-serif', '#ffff00');
  texteCentre('Tu as terminé les trois niveaux de la bêta. Merci d\'avoir joué.',
              60, 'italic 11px system-ui, sans-serif', 'rgba(255,255,255,.6)');

  /* Le skin, en grand, qui marche sur place. Trois fois sa taille : c'est la
     seule fois ou le joueur le verra sans avoir a plisser les yeux. */
  const age = (performance.now() - finBeta.t0) / 1000;
  const img = planchesBrad['beta-testeur'];
  const cx = 150, bas = 214;
  ctx.fillStyle = 'rgba(232,182,44,.07)';
  ctx.fillRect(cx - 62, 76, 124, 150);
  ctx.strokeStyle = 'rgba(255,255,0,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - 61.5, 76.5, 123, 149);
  if (img) {
    const { cw, ch } = BRAD_PLANCHE;
    const col = Math.floor(age / 0.22) % 4;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, col * cw, 0, cw, ch, cx - cw * 1.5, bas - ch * 3 + 6, cw * 3, ch * 3);
  }

  // A droite : ce qui vient de se passer, et ce qu'il faut savoir.
  const xt = 232, large = LARGEUR - xt - 40;
  ctx.textAlign = 'left';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillStyle = finBeta.enregistre ? '#7ee08a' : '#e2553b';
  ctx.fillText(finBeta.enregistre
    ? (finBeta.nouveau ? 'SKIN EXCLUSIF DÉBLOQUÉ' : 'SKIN EXCLUSIF — DÉJÀ À TOI')
    : 'SKIN EXCLUSIF — NON ENREGISTRÉ', xt, 90);
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = '#f2f3f8';
  ctx.fillText('Le Bêta-testeur', xt, 110);

  const blocs = finBeta.enregistre
    ? [
        ['Il est sauvegardé dans ce navigateur et sera jouable dans la version '
         + 'finale, le ' + DATE_SORTIE + '. Il t\'attend déjà au vestiaire.',
         'rgba(255,255,255,.8)'],
        ['Attention : si tu effaces l\'historique ou les données de ce site, il sera '
         + 'perdu — et il ne pourra plus être obtenu une fois la bêta terminée.',
         '#ffb37c'],
      ]
    : [
        /* La navigation privee, ou un navigateur qui refuse le stockage : le
           dire, plutot que d'annoncer un skin qui n'existera plus au prochain
           lancement. */
        ['Ton navigateur n\'a pas pu l\'enregistrer — la navigation privée, le '
         + 'plus souvent, efface tout en fermant la fenêtre.',
         '#ffb37c'],
        ['Rejoue les trois niveaux dans une fenêtre normale pendant la bêta pour '
         + 'le garder.', 'rgba(255,255,255,.8)'],
      ];
  let y = 132;
  for (const [texte, couleur] of blocs) {
    ctx.font = '10.5px system-ui, sans-serif';
    ctx.fillStyle = couleur;
    for (const ligne of lignesDe(texte, large)) { ctx.fillText(ligne, xt, y); y += 14; }
    y += 6;
  }

  // Le petit mot demande : l'invitation a ecrire.
  ctx.fillStyle = 'rgba(255,255,255,.1)';
  ctx.fillRect(60, 240, LARGEUR - 120, 1);
  /* L'adresse se place APRES le paragraphe, a l'ordonnee qu'il rend — pas a
     une ordonnee fixe. Premiere version : 276 en dur, et un paragraphe qui
     passait sur deux lignes ecrivait sa seconde ligne sur l'adresse. */
  const yLien = paragrapheCentre('Un bug croisé en route ? Une idée pour la suite ? '
    + 'C\'est exactement ce que la bêta est venue chercher.',
    258, LARGEUR - 140, '10.5px system-ui, sans-serif', 'rgba(255,255,255,.72)', 14);
  lienCourriel('Écris-nous : ', yLien + 2);

  const l = 180;
  boutonBeta('Retour à la base ▸', 'finbeta-ok', (LARGEUR - l) / 2, HAUTEUR - 56, l, true);
  texteCentre('Entrée pour continuer', HAUTEUR - 14,
              '9.5px system-ui, sans-serif', 'rgba(255,255,255,.3)');
}
