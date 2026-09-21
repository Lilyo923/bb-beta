/* =============================================================================
   BRAD BITT, MAIS LE JEU — L'EDITION : BETA OU VERSION FINALE

   UN SEUL JEU, UN SEUL INTERRUPTEUR.

   La beta n'est pas une copie du projet : c'est le MEME code, avec cette ligne
   a `true`. Deux copies auraient diverge des le premier correctif — un bug
   corrige dans l'une et oublie dans l'autre. Ici, un correctif fait pendant la
   beta est deja dans la version finale.

   Pour publier la version finale : passer BETA a `false`. C'est tout. Les
   niveaux 4 a 10, les uniformes, la manette, le code FNAM3RL et le panneau de
   developpement reviennent d'eux-memes.

   Ce fichier est charge EN PREMIER (voir index.html) : les autres le lisent
   des leur propre chargement — la liste des options, par exemple, se compose
   a partir de lui.

   Rien ici ne se regle depuis l'adresse de la page ni depuis la console d'une
   facon qui survive au rechargement : une beta qu'on deverrouille en ajoutant
   « ?finale » a l'URL ne serait pas une beta.
   ========================================================================== */
'use strict';

const BETA = true;

const DATES_BETA = 'du 27 au 29 novembre 2026';
const DATE_SORTIE = '9 janvier 2027';

/* Ce que la beta ouvre. Tout le reste existe dans le code — la bande-annonce
   en a besoin, et la version finale aussi — mais ne se joue pas. */
const NIVEAUX_BETA = ['intro', 'niveau1', 'niveau2', 'niveau3'];

/* Les trois niveaux dont la fin vaut le skin exclusif. L'intro n'en fait pas
   partie : elle se termine forcement avant d'atteindre la base. */
const NIVEAUX_RECOMPENSE_BETA = ['niveau1', 'niveau2', 'niveau3'];

/* Trois uniformes a gagner, plus le skin exclusif. */
const UNIFORMES_BETA = ['classique', 'classique-turquoise', 'classique-violet',
                        'beta-testeur'];

function niveauDansEdition(id) {
  return !BETA || NIVEAUX_BETA.indexOf(id) >= 0;
}

function uniformeDansEdition(cle) {
  return !BETA || UNIFORMES_BETA.indexOf(cle) >= 0;
}

/* Ce que la beta affiche a la place d'un contenu qu'elle n'ouvre pas. Une
   seule formulation, partout : carte, vestiaire, controles. */
const A_LA_SORTIE = 'Disponible à la sortie du jeu, le ' + DATE_SORTIE + '.';
