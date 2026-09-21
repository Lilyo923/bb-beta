/* =============================================================================
   BRAD BITT, MAIS LE JEU — sauvegarde et progression

   Tout ce que le joueur accumule vit ici : Brad Coins, ameliorations achetees,
   uniformes debloques, niveaux termines, parties d'arcade du jour.

   Un seul emplacement pour l'instant ; les notes prevoient plusieurs
   sauvegardes par profil, d'ou la forme d'objet plat facile a dupliquer.
   ========================================================================== */
'use strict';

const CLE_SAUVEGARDE = 'bradbitt.partie.v2';

const DIFFICULTES = [
  { cle: 'touriste',    nom: 'Touriste',    note: 'Pour l\'histoire. Les ennemis tapent moins fort.',
    degats: 0.5, pvEnnemi: 1, recompense: 1 },
  { cle: 'connaisseur', nom: 'Connaisseur', note: 'L\'équilibre prévu.',
    degats: 1, pvEnnemi: 1, recompense: 1 },
  { cle: 'salé',        nom: 'Salé',        note: 'Le BRADDY3000 ne vous le recommande pas. +20 % de récompenses.',
    degats: 1.5, pvEnnemi: 1.5, recompense: 1.2 },
];

/* -----------------------------------------------------------------------------
   AMELIORATIONS

   Le prix part de 30 BC et monte de 5 a chaque palier deja achete : le premier
   coute 30, le deuxieme 35, le troisieme 40. Une amelioration reste donc un
   objectif de plusieurs niveaux, et le dernier palier se merite.
-------------------------------------------------------------------------- */

const COUT_AMELIORATION = 30;
const PALIER_AMELIORATION = 5;

const AMELIORATIONS = [
  {
    cle: 'vie', nom: 'Barre de vie', paliers: 5,
    detail: '+2 PV par palier, jusqu\'à 20',
    valeur: n => 10 + n * 2, unite: ' PV',
    phrase: 'Plus de PV, plus de marge d\'erreur.',
  },
  {
    cle: 'degats', nom: 'Dégâts', paliers: 10,
    detail: '+10 % par palier, jusqu\'à +100 %',
    valeur: n => n * 10, unite: ' %',
    phrase: 'Les coups, les sauts, l\'onde — tout tape plus fort.',
  },
  {
    cle: 'resistance', nom: 'Résistance', paliers: 10,
    // Court expres : la ligne de detail partage sa rangee avec l'etat courant,
    // et un texte trop long allait se superposer a « actuel : … ».
    detail: '+5 % de chance d\'ignorer un coup',
    valeur: n => n * 5, unite: ' % de blocage',
    phrase: 'Un coup sur deux peut ne pas compter. Tu le verras : un bouclier s\'affiche.',
  },
];

/* Bonus permanents : achetes une seule fois. 10 BC pour le confort, 20 BC
   pour ceux qui changent vraiment la donne. */
const PERMANENTS = [
  { cle: 'aimant', nom: 'Aimant à BC', cout: 10,
    detail: 'Les Brad Coins sont attirés de deux fois plus loin.',
    phrase: 'Fini les pièces ratées d\'un pixel.' },
  { cle: 'lenteur', nom: 'Serrano rassis', cout: 20,
    detail: 'Les ennemis patrouillent 15 % moins vite.',
    phrase: 'Ils traînent. C\'est déjà ça.' },
  { cle: 'chance', nom: 'Poches percées', cout: 20,
    detail: '+50 % de Brad Coins lâchés par les ennemis.',
    phrase: 'Ils perdent plus de monnaie en tombant.' },
  { cle: 'shy', nom: 'Brad-Shy affûté', cout: 20,
    detail: 'La jauge de Brad-Shy se remplit 30 % plus vite.',
    phrase: 'L\'onde de choc revient plus souvent.' },
];

/* -----------------------------------------------------------------------------
   UNIFORMES
   Purement cosmetiques, aucun bonus — c'est le choix assume des notes : le
   joueur ne met jamais ses Brad Coins en concurrence entre beaute et
   puissance. Ils se debloquent en accomplissant des choses.
-------------------------------------------------------------------------- */

const UNIFORMES = [
  { cle: 'classique', nom: 'Le classique', condition: null,
    detail: 'Costard noir, cravate rouge. Depuis toujours.' },
  { cle: 'classique-bleu', nom: 'Cravate bleue', condition: 'niveaux>=1',
    detail: 'Débloqué en terminant un niveau.' },
  { cle: 'classique-vert', nom: 'Cravate verte', condition: 'niveaux>=2',
    detail: 'Débloqué en terminant deux niveaux.' },
  { cle: 'classique-orange', nom: 'Cravate orange', condition: 'ennemis>=50',
    detail: 'Débloqué en éliminant 50 ennemis.' },
  /* 300 points ne demandaient qu'une vague et demie : le seuil est passe a
     1000 a la demande du studio (prototype 25). */
  { cle: 'classique-violet', nom: 'Cravate violette', condition: 'arcade>=1000',
    detail: 'Débloqué en faisant 1000 points à l\'arcade.' },
  // Anciennement « Cravate Serrano » : personne ne pouvait deviner qu'il
  // s'agissait du jaune. Le surnom reste dans la description, ou il amuse
  // sans empecher de reconnaitre l'uniforme.
  { cle: 'cravate-jaune', nom: 'Cravate jaune', condition: 'pieces>=40',
    detail: 'Jaune Serrano, dit le BRADDY3000. Débloqué en accumulant 40 Brad Coins.' },
  { cle: 'classique-turquoise', nom: 'Cravate turquoise', condition: 'entrainement>=1',
    detail: 'Débloqué en passant une fois au camp d\'entraînement.' },
  { cle: 'classique-bordeaux', nom: 'Cravate bordeaux', condition: 'ameliorations>=25',
    detail: 'Débloqué en achetant TOUTES les améliorations, jusqu\'au dernier palier.' },
  /* Le costume d'or se meritait « en terminant dix niveaux », ce qui tombait
     au retour de la Lune — donc AVANT le manoir et avant le combat final. Il
     recompense maintenant la vraie fin du jeu. */
  { cle: 'dore', nom: 'Le costume d\'or', condition: 'final>=1',
    detail: 'Débloqué en battant Kirby 67 pour de bon. Bon courage.' },
  /* Le skin 3IRL. Il ne s'obtient pas en jouant : il s'obtient en SACHANT.
     Le code se tape directement dans le vestiaire, et il n'expire jamais. */
  { cle: '3irl', nom: 'Brad 3IRL', condition: 'code:FNAM3RL',
    detail: 'La légende raconte que pour l\'éloigner, il faut utiliser une boîte '
          + 'vocale. Mais bon, une légende en cache souvent une autre.' },
  /* Le skin de la beta. Il ne se gagne QUE pendant la beta — en terminant les
     niveaux 1, 2 et 3 — et il se garde ensuite dans la version finale. Il
     n'est pas range dans la partie mais a part (voir RECOMPENSES plus bas) :
     « Effacer la sauvegarde » ne doit pas le reprendre. */
  { cle: 'beta-testeur', nom: 'Le Bêta-testeur', condition: 'recompense:beta-testeur',
    detail: 'Porté par ceux qui étaient là avant tout le monde.' },
];

/* -----------------------------------------------------------------------------
   LES RECOMPENSES DURABLES

   Ce qui se gagne une fois et ne se reprend pas. Aujourd'hui une seule : le
   skin de la beta.

   ELLES VIVENT A PART DE LA PARTIE, sous leur propre clef. Deux raisons :

   1. « Effacer la sauvegarde » remet la PROGRESSION a zero. Le skin n'est pas
      une progression : c'est la trace d'avoir ete la pendant la beta. Le
      reprendre au joueur qui recommence sa partie serait une punition.

   2. La version finale doit le RECONNAITRE sans rien savoir de la partie beta.
      Elle ne lit que cette clef.

   Ce que ça ne protege PAS, et le jeu le dit au joueur : effacer les donnees
   du site dans le navigateur (historique, cookies et donnees de sites) efface
   aussi cette clef. Et le stockage d'un navigateur est propre a une ADRESSE :
   la version finale ne retrouvera le skin que si elle est publiee a la meme
   adresse que la beta.
-------------------------------------------------------------------------- */

const CLE_RECOMPENSES = 'bradbitt.recompenses.v1';

function recompensesObtenues() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_RECOMPENSES) || '[]');
    return Array.isArray(brut) ? brut.filter(x => typeof x === 'string') : [];
  } catch (e) { return []; }
}

function recompenseObtenue(cle) { return recompensesObtenues().indexOf(cle) >= 0; }

/* Vrai si la recompense est NOUVELLE. Ecrit immediatement : une recompense
   gagnee ne doit pas dependre de l'ecran suivant pour etre enregistree. */
function accorderRecompense(cle) {
  const liste = recompensesObtenues();
  if (liste.indexOf(cle) >= 0) return false;
  liste.push(cle);
  try { localStorage.setItem(CLE_RECOMPENSES, JSON.stringify(liste)); }
  catch (e) { return false; }                // navigation privee : rien d'ecrit
  return true;
}

/* La beta est-elle « finie » pour ce joueur ? Les trois niveaux, termines. */
function trioBetaTermine() {
  return NIVEAUX_RECOMPENSE_BETA.every(id => niveauTermine(id));
}

/* -----------------------------------------------------------------------------
   LES TROIS PIECES DE L'APPAREIL A RACLETTE

   Le fil rouge de l'aventure. Chaque piece garde un boss, tous les trois
   niveaux : 3, 6 et 9. Reunies, elles permettent d'attirer KIRBY67 et de
   situer sa position — ce qui ouvre le niveau 10 et son boss.

   La liste porte les trois pieces des maintenant, meme si seule la premiere
   est atteignable : la vitrine de la base montre ainsi les deux emplacements
   vides, et le joueur sait des le premier niveau ce qu'il lui reste a faire.
-------------------------------------------------------------------------- */

const OBJETS_MAJEURS = [
  {
    cle: 'poelon', nom: 'Le poêlon', niveau: 'niveau3',
    court: 'Poêlon',
    detail: 'Un poêlon à raclette. Un seul. Il en faudrait huit pour une soirée correcte, mais on commence par un.',
    ou: 'Niveau 3 — la vallée enchantée',
    prise: 'Un poêlon. En pleine vallée enchantée. Personne ne trouvera ça normal, et c\'est très bien.',
  },
  {
    cle: 'garniture', nom: 'Le fromage et la charcuterie', niveau: 'niveau6',
    court: 'Garniture',
    detail: 'Une meule et de quoi l\'accompagner. La partie périssable du plan.',
    ou: 'Niveau 6 — la maison hantée',
    prise: 'Le fromage. La charcuterie. Le plan devient sérieux, et légèrement odorant.',
  },
  {
    cle: 'appareil', nom: 'L\'appareil à raclette', niveau: 'niveau9',
    court: 'Appareil',
    detail: 'La machine elle-même. Sans elle, les deux autres pièces ne sont qu\'un pique-nique.',
    ou: 'Niveau 9 — l\'espace',
    prise: 'L\'appareil. Le vrai. Il ne manque plus rien.',
  },
];

function aObjet(cle) { return partie.objets.indexOf(cle) >= 0; }
function objetsTrouves() { return partie.objets.length; }
function serieComplete() { return partie.objets.length >= OBJETS_MAJEURS.length; }

/* La piece que garde ce niveau, s'il en garde une. */
function objetDuNiveau(id) { return OBJETS_MAJEURS.find(o => o.niveau === id) || null; }

function ramasserObjet(cle) {
  if (!cle || aObjet(cle)) return false;
  partie.objets.push(cle);
  enregistrerPartie();
  return true;
}

/* -----------------------------------------------------------------------------
   ETAT
-------------------------------------------------------------------------- */

const partie = {
  existe: false,
  pieces: 0,
  difficulte: 'connaisseur',
  tempsJoue: 0,
  ennemisTotal: 0,
  meilleurArcade: 0,
  uniforme: 'classique',
  termines: [],                 // ids des niveaux termines
  ameliorations: { vie: 0, degats: 0, resistance: 0 },
  permanents: [],               // cles achetees
  arcadeJour: '',               // date locale AAAA-MM-JJ
  arcadeParties: 0,
  entrainements: 0,             // passages au camp — ne rapporte rien d'autre
  hubVu: false,                 // le dialogue de decouverte de la base a deja eu lieu
  fusee: false,                 // la cinematique du depart pour la lune a deja eu lieu
  manoirVu: false,              // la cinematique d'arrivee au manoir a deja eu lieu
  manoirFait: false,            // Kirby 67 est tombe au manoir : le portail existe
  finalGagne: false,            // le combat final est gagne — le jeu est fini
  piste: 'menu',                // morceau choisi au jukebox
  codes: [],                    // codes du jukebox deja entres
  codesUniformes: [],           // codes du vestiaire deja entres
  objets: [],                   // pieces de l'appareil a raclette recuperees
  bossVaincus: [],              // ids des niveaux dont le boss est tombe
  piecesSecretes: 0,            // Brad Coins secrets en poche
  /* Deux compteurs CUMULES, distincts des deux porte-monnaie ci-dessus. Le
     generique affiche « gagnes » et « trouves » : sans eux il aurait affiche
     ce qui RESTE, et une partie ou l'on a tout depense en boutique se serait
     racontee comme une partie ou l'on n'a rien ramasse. */
  piecesGagnees: 0,             // total de Brad Coins ramasses depuis le debut
  secretsTrouves: 0,            // total de Brad Coins secrets trouves
  secretsVus: false,            // la section Secrets de la boutique est ouverte
  secrets: [],                  // ameliorations secretes achetees
  maj: 0,
};

/* -----------------------------------------------------------------------------
   LES BRAD COINS SECRETS

   Une seconde monnaie, decrite dans la roadmap : « une ressource obtenue en
   effectuant des boss secondaires ou avec une faible probabilite si un ennemi
   est elimine (n'importe lequel, avec une probabilite de 1.67 %, qui ne
   s'accumule pas) ».

   Elle n'existait pas dans le code jusqu'ici — d'ou le fait qu'on n'en ait
   jamais trouve.

   La section Secrets de la boutique reste INVISIBLE tant qu'on n'a pas trouve
   la premiere piece. Un onglet vide qu'on ne peut pas remplir est une promesse
   frustrante ; un onglet qui apparait le jour ou l'on a de quoi y acheter
   quelque chose est une recompense. Le BRADDY3000 l'annonce au retour a la
   base, ce qui fait de la premiere piece un evenement.
-------------------------------------------------------------------------- */

const CHANCE_BC_SECRET = 0.0167;      // par elimination, sans accumulation

/* LES QUATRE APTITUDES SECRETES.

   Trois d'entre elles etaient annoncees dans la boutique sans etre achetables.
   Elles le sont maintenant, et aucune n'a demande un bouton de plus : un
   platformer qui reclame une sixieme touche a perdu la partie.

     frappe chargee  -> on TIENT le bouton de coup
     plaquage        -> on frappe EN COURANT a pleine vitesse
     tourelle        -> elle se debrouille seule

   Les couts montent : la premiere aptitude s'achete vite, la derniere se
   merite. */
const SECRETS = [
  {
    cle: 'double-saut', nom: 'Double saut', cout: 1,
    detail: 'Un second saut en plein vol.',
    phrase: 'Deux sauts. J\'ai longtemps pense que c\'était physiquement discutable. Ça l\'est.',
  },
  {
    cle: 'frappe-chargee', nom: 'Frappe chargée', cout: 1,
    detail: 'Maintiens le coup une demi-seconde : il porte plus loin et fait le double.',
    phrase: 'Tu tiens, ça brille, tu lâches. Le Serra n\'a pas le temps de comprendre.',
  },
  {
    cle: 'plaquage', nom: 'Plaquage', cout: 2,
    detail: 'Frappe en pleine course : Brad charge et renverse tout sur trois mètres.',
    phrase: 'Ce n\'est pas élégant. C\'est efficace. Ce sont deux choses différentes.',
  },
  {
    cle: 'tourelle', nom: 'Tourelle anti-serrano', cout: 2,
    detail: 'Une tourelle te suit et tire toute seule sur ce qui approche.',
    phrase: 'Elle ne parle pas, elle ne se plaint pas, elle vise mieux que toi. Ne le prends pas mal.',
  },
];

// Plus rien n'est promis sans etre livre : la liste est vide, et elle le reste.
const SECRETS_A_VENIR = [];

function aSecret(cle) { return partie.secrets.indexOf(cle) >= 0; }

/* Ouvre la section pour de bon. Appele des qu'une piece secrete est ramassee,
   et par le bouton de test du panneau F1. */
function decouvrirSecrets() {
  if (partie.secretsVus) return false;
  partie.secretsVus = true;
  return true;                        // vrai la premiere fois seulement
}

function peutAcheterSecret(s) {
  return !aSecret(s.cle) && partie.piecesSecretes >= s.cout;
}

function acheterSecret(s) {
  if (!peutAcheterSecret(s)) return false;
  partie.piecesSecretes -= s.cout;
  partie.secrets.push(s.cle);
  enregistrerPartie();
  return true;
}

/* Le double saut vient soit de l'achat secret, soit de la case du panneau de
   developpement. Une seule fonction pour que le jeu ne se contredise pas. */
function doubleSautActif() {
  return OPTIONS.doubleSaut || aSecret('double-saut');
}

const ARCADE_PAR_JOUR = 3;

function chargerPartie() {
  try {
    const brut = JSON.parse(localStorage.getItem(CLE_SAUVEGARDE) || 'null');
    if (!brut || typeof brut !== 'object') return false;
    // On ne relit que les cles connues : une sauvegarde ancienne reste
    // valable quand de nouveaux champs apparaissent.
    ['pieces', 'tempsJoue', 'ennemisTotal', 'meilleurArcade', 'arcadeParties',
     'entrainements', 'piecesSecretes', 'piecesGagnees', 'secretsTrouves', 'maj']
      .forEach(k => { if (typeof brut[k] === 'number') partie[k] = brut[k]; });
    if (typeof brut.secretsVus === 'boolean') partie.secretsVus = brut.secretsVus;
    if (Array.isArray(brut.secrets)) {
      partie.secrets = brut.secrets.filter(c => SECRETS.some(s => s.cle === c));
    }
    if (DIFFICULTES.some(d => d.cle === brut.difficulte)) partie.difficulte = brut.difficulte;
    if (UNIFORMES.some(u => u.cle === brut.uniforme)) partie.uniforme = brut.uniforme;
    if (Array.isArray(brut.termines)) partie.termines = brut.termines.filter(id => id in NIVEAUX);
    if (Array.isArray(brut.permanents)) {
      partie.permanents = brut.permanents.filter(c => PERMANENTS.some(p => p.cle === c));
    }
    if (brut.ameliorations && typeof brut.ameliorations === 'object') {
      AMELIORATIONS.forEach(a => {
        const n = brut.ameliorations[a.cle];
        if (typeof n === 'number') partie.ameliorations[a.cle] = Math.max(0, Math.min(a.paliers, n));
      });
    }
    if (typeof brut.arcadeJour === 'string') partie.arcadeJour = brut.arcadeJour;
    if (typeof brut.hubVu === 'boolean') partie.hubVu = brut.hubVu;
    ['fusee', 'manoirVu', 'manoirFait', 'finalGagne']
      .forEach(k => { if (typeof brut[k] === 'boolean') partie[k] = brut[k]; });
    if (typeof brut.piste === 'string' && PISTES_JUKEBOX.some(p => p.cle === brut.piste)) {
      partie.piste = brut.piste;
    }
    if (Array.isArray(brut.codesUniformes)) {
      partie.codesUniformes = brut.codesUniformes
        .filter(c => CODES_UNIFORME.some(p => p.code === c));
    }
    if (Array.isArray(brut.codes)) {
      partie.codes = brut.codes.filter(c => CODES_JUKEBOX.some(p => p.code === c));
    }
    if (Array.isArray(brut.objets)) {
      partie.objets = brut.objets.filter(c => OBJETS_MAJEURS.some(o => o.cle === c));
    }
    if (Array.isArray(brut.bossVaincus)) {
      partie.bossVaincus = brut.bossVaincus.filter(id => id in NIVEAUX);
    }
    partie.existe = true;
    return true;
  } catch (e) {
    return false;
  }
}

function enregistrerPartie() {
  partie.existe = true;
  partie.maj = Date.now();
  try {
    localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(partie));
  } catch (e) { /* navigation privee : la partie reste jouable, sans suivi */ }
}

function effacerPartie() {
  try { localStorage.removeItem(CLE_SAUVEGARDE); } catch (e) { /* ignore */ }
  partie.existe = false;
  partie.pieces = 0;
  partie.piecesGagnees = 0;
  partie.secretsTrouves = 0;
  partie.tempsJoue = 0;
  partie.ennemisTotal = 0;
  partie.meilleurArcade = 0;
  partie.uniforme = 'classique';
  partie.termines = [];
  partie.ameliorations = { vie: 0, degats: 0, resistance: 0 };
  partie.permanents = [];
  partie.arcadeJour = '';
  partie.arcadeParties = 0;
  partie.entrainements = 0;
  partie.hubVu = false;
  partie.fusee = false;
  partie.manoirVu = false;
  partie.manoirFait = false;
  partie.finalGagne = false;
  partie.objets = [];
  partie.bossVaincus = [];
  partie.piste = 'menu';
  partie.codes = [];
  partie.codesUniformes = [];
  partie.piecesSecretes = 0;
  partie.secretsVus = false;
  partie.secrets = [];
}

/* -----------------------------------------------------------------------------
   LECTURES DERIVEES
-------------------------------------------------------------------------- */

function reglageDifficulte() {
  return DIFFICULTES.find(d => d.cle === partie.difficulte) || DIFFICULTES[1];
}

function aPermanent(cle) { return partie.permanents.indexOf(cle) >= 0; }

function pvMaxDeBrad() { return 10 + partie.ameliorations.vie * 2; }
function bonusDegats() { return 1 + partie.ameliorations.degats * 0.1; }
/* Probabilite qu'un coup soit purement et simplement annule. Cinq pour cent
   par palier, dix paliers, donc la moitie des coups au maximum. Bornee des
   deux cotes : une sauvegarde bricolee ne doit pas rendre Brad invulnerable. */
function chanceBlocage() {
  return Math.max(0, Math.min(0.5, partie.ameliorations.resistance * 0.05));
}

function niveauTermine(id) { return partie.termines.indexOf(id) >= 0; }

/* La base n'existe, dans la fiction, qu'une fois le niveau d'introduction
   franchi : c'est le BRADDY3000 qui la monte pendant que Brad traverse. Y
   acceder avant reviendrait a s'y refugier pour fuir un niveau qu'on n'a pas
   encore terminé, et casserait l'ouverture du jeu. */
function baseAccessible() { return partie.termines.length > 0; }

/* Un niveau est jouable s'il est le premier, ou si le precedent est fini —
   et, pendant la beta, s'il fait partie de ceux qu'elle ouvre. Le verrou est
   ICI, dans la seule fonction que la carte consulte pour afficher ET pour
   partir : une partie venue d'une version de test, avec les dix niveaux
   termines, ne passe pas au travers. */
function niveauDebloque(id) {
  if (!niveauDansEdition(id)) return false;
  const i = ORDRE_NIVEAUX.indexOf(id);
  if (i <= 0) return true;
  return niveauTermine(ORDRE_NIVEAUX[i - 1]);
}

function prochainNiveau() {
  return ORDRE_NIVEAUX.find(id => !niveauTermine(id)) || ORDRE_NIVEAUX[ORDRE_NIVEAUX.length - 1];
}

/* Les codes du vestiaire. Ils viennent des autres projets du studio, ils ne se
   devinent pas, et ils sont VALABLES POUR TOUJOURS — pas d'evenement, pas de
   date limite. */
const CODES_UNIFORME = [
  { code: 'FNAM3RL', cle: '3irl' },
];

function codeUniformeConnu(code) {
  return CODES_UNIFORME.find(c => c.code === String(code || '').toUpperCase()) || null;
}

/* Pendant la beta, un code CONNU est reconnu mais pas enregistre : il ne
   s'ouvrira pas « en avance » a la sortie. Le vestiaire le dit au joueur
   (voir validerCodeVestiaire). */
function entrerCodeUniforme(code) {
  const c = codeUniformeConnu(code);
  if (!c) return null;
  if (!uniformeDansEdition(c.cle)) return Object.assign({ horsEdition: true }, c);
  if (partie.codesUniformes.indexOf(c.code) < 0) {
    partie.codesUniformes.push(c.code);
    enregistrerPartie();
    return c;                       // nouveau
  }
  return c;                         // deja connu, on le redit sans rien casser
}

function uniformeDebloque(u) {
  // Hors de l'edition, rien ne s'ouvre — pas meme ce qu'une vieille partie
  // aurait deja debloque.
  if (!uniformeDansEdition(u.cle)) return false;
  if (!u.condition) return true;
  if (u.condition.indexOf('recompense:') === 0) {
    return recompenseObtenue(u.condition.slice(11));
  }
  // Un uniforme a code n'a pas de seuil : il est ouvert ou il ne l'est pas.
  if (u.condition.indexOf('code:') === 0) {
    return partie.codesUniformes.indexOf(u.condition.slice(5)) >= 0;
  }
  const m = /^(\w+)>=(\d+)$/.exec(u.condition);
  if (!m) return false;
  const seuil = Number(m[2]);
  switch (m[1]) {
    case 'niveaux': return partie.termines.length >= seuil;
    case 'ennemis': return partie.ennemisTotal >= seuil;
    case 'pieces': return partie.pieces >= seuil;
    case 'arcade': return partie.meilleurArcade >= seuil;
    case 'entrainement': return partie.entrainements >= seuil;
    case 'ameliorations': return paliersAchetes() >= seuil;
    case 'final': return (partie.finalGagne ? 1 : 0) >= seuil;
  }
  return false;
}

/* Nombre total de paliers d'amelioration achetes, tous types confondus.
   25 = tout au maximum (5 vie + 10 degats + 10 resistance). */
function paliersAchetes() {
  return AMELIORATIONS.reduce((n, a) => n + partie.ameliorations[a.cle], 0);
}
function paliersTotal() {
  return AMELIORATIONS.reduce((n, a) => n + a.paliers, 0);
}

/* -----------------------------------------------------------------------------
   ARCADE — limite journaliere
   Les notes evoquent une limite de parties puis une attente. On se fie a
   l'horloge de la machine : une API de temps officielle ajouterait une
   dependance reseau pour un enjeu nul (le joueur ne triche que contre lui).
-------------------------------------------------------------------------- */

function aujourdHui() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
         '-' + String(d.getDate()).padStart(2, '0');
}

function partiesArcadeRestantes() {
  if (partie.arcadeJour !== aujourdHui()) return ARCADE_PAR_JOUR;
  return Math.max(0, ARCADE_PAR_JOUR - partie.arcadeParties);
}

function consommerPartieArcade() {
  const jour = aujourdHui();
  if (partie.arcadeJour !== jour) { partie.arcadeJour = jour; partie.arcadeParties = 0; }
  partie.arcadeParties++;
  enregistrerPartie();
}

/* -----------------------------------------------------------------------------
   ACHATS
-------------------------------------------------------------------------- */

/* Le prix monte avec le palier deja atteint : 30, 35, 40... */
function coutAmelioration(a) {
  return COUT_AMELIORATION + partie.ameliorations[a.cle] * PALIER_AMELIORATION;
}

function peutAcheterAmelioration(a) {
  return partie.ameliorations[a.cle] < a.paliers && partie.pieces >= coutAmelioration(a);
}

function acheterAmelioration(a) {
  if (!peutAcheterAmelioration(a)) return false;
  partie.pieces -= coutAmelioration(a);
  partie.ameliorations[a.cle]++;
  enregistrerPartie();
  return true;
}

function peutAcheterPermanent(p) {
  return !aPermanent(p.cle) && partie.pieces >= p.cout;
}

function acheterPermanent(p) {
  if (!peutAcheterPermanent(p)) return false;
  partie.pieces -= p.cout;
  partie.permanents.push(p.cle);
  enregistrerPartie();
  return true;
}

function dureeLisible(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return m + ' min ' + String(r).padStart(2, '0');
}

/* Relecture au chargement de la page. Cette ligne est la seule chose qui
   ressuscite une partie : sans elle, la sauvegarde s'ecrit correctement mais
   n'est jamais relue, et « Continuer » reste gris pour toujours. */
chargerPartie();
