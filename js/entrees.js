/* =============================================================================
   BRAD BITT, MAIS LE JEU — entrees

   On ecoute a la fois event.code (touche physique, claviers QWERTY) et
   event.key (caractere produit, claviers AZERTY). Un joueur francais qui
   utilise Z Q S D est pris en charge sans aucune configuration.

   Toutes les entrees passent par la scene courante : le meme appui sur Espace
   demarre le jeu, valide un menu ou fait sauter Brad selon l'endroit ou l'on
   se trouve.
   ========================================================================== */
'use strict';

const entrees = {
  gauche: false, droite: false, saut: false, courir: false,
  attaque: false, onde: false,
};

// Fronts montants, consommes par la simulation puis remis a faux.
let sautPresseCeTick = false;
let attaquePresseeCeTick = false;
let ondePresseeCeTick = false;
let parlerPresseCeTick = false;

const MAP_CODE = {
  ArrowLeft: 'gauche', KeyA: 'gauche',
  ArrowRight: 'droite', KeyD: 'droite',
  ArrowUp: 'saut', Space: 'saut', KeyW: 'saut',
  ShiftLeft: 'courir', ShiftRight: 'courir',
  KeyX: 'attaque', KeyJ: 'attaque',
  KeyC: 'onde', KeyK: 'onde',
  KeyE: 'parler',
};
const MAP_TOUCHE = {
  q: 'gauche', a: 'gauche',
  d: 'droite',
  z: 'saut', w: 'saut',
  x: 'attaque', j: 'attaque',
  c: 'onde', k: 'onde',
  e: 'parler',
};

const FRONTS = { saut: 1, attaque: 1, onde: 1, parler: 1 };
const TOUCHES_DEFILEMENT = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function actionDe(e) {
  return MAP_CODE[e.code] || MAP_TOUCHE[(e.key || '').toLowerCase()] || null;
}

function marquerFront(action) {
  if (action === 'saut') sautPresseCeTick = true;
  else if (action === 'attaque') attaquePresseeCeTick = true;
  else if (action === 'onde') ondePresseeCeTick = true;
  else if (action === 'parler') parlerPresseCeTick = true;
}

function relacherTout() {
  Object.keys(entrees).forEach(k => { entrees[k] = false; });
}

/* Le corps du gestionnaire est une FONCTION NOMMEE, et pas seulement pour la
   lisibilite : la manette s'en sert. Elle fabrique des evenements de la meme
   forme ({ code, key }) et les passe ici, ce qui lui donne d'un coup toute la
   navigation du jeu — menus, boutique, jukebox, pause, combat final,
   generique, bande-annonce — sans en reecrire une ligne. */
function auClavier(e) {
  if (!e.preventDefault) e.preventDefault = () => {};
  if (e.code === 'F1') { e.preventDefault(); basculerPanneau(); return; }
  if (TOUCHES_DEFILEMENT.includes(e.code)) e.preventDefault();

  const lettre = (e.key || '').toLowerCase();
  const valider = e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter';
  const annuler = e.code === 'Escape';

  switch (scene) {
    case 'accueil':
      if (valider) lancerDemarrage();
      return;

    case 'logos':
    case 'chargement':
      return;                                   // rien a faire pendant un chargement

    /* Les deux ecrans partagent la meme navigation ET la meme confirmation :
       « Nouvelle partie » depuis le menu, « Effacer la sauvegarde » depuis les
       options. Le test de `confirmation` doit donc couvrir les deux — quand il
       ne valait que pour le menu, les fleches continuaient de deplacer la
       selection derriere le dialogue ouvert. */
    case 'menu':
    case 'options':
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') menuDeplacer(-1);
      else if (e.code === 'ArrowDown' || lettre === 's') menuDeplacer(1);
      else if (e.code === 'ArrowLeft' || lettre === 'q') menuAjuster(-1);
      else if (e.code === 'ArrowRight' || lettre === 'd') menuAjuster(1);
      else if (valider) menuValider();
      else if (annuler) menuRetour();
      return;

    case 'credits':
      if (valider || annuler) menuRetour();
      return;

    /* Les mentions se LISENT : les fleches font defiler, tout le reste sort.
       Depuis l'ecran d'accueil, sortir vaut acceptation — on marque la lecture
       pour ne plus reafficher le bandeau. */
    case 'mentions':
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') defilerMentions(-34);
      else if (e.code === 'ArrowDown' || lettre === 's') defilerMentions(34);
      else if (e.code === 'PageUp') defilerMentions(-200);
      else if (e.code === 'PageDown') defilerMentions(200);
      else if (valider || annuler) fermerMentions();
      return;

    case 'controles':
      if (valider || annuler) fermerControles();
      return;

    case 'avisbeta':
      if (valider) validerAvisBeta();
      else if (annuler) annulerAvisBeta();
      return;

    case 'finbeta':
      if (valider || annuler) quitterFinBeta();
      return;

    case 'pause':
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') deplacerPause(-1);
      else if (e.code === 'ArrowDown' || lettre === 's') deplacerPause(1);
      else if (valider) validerPause();
      else if (annuler) reprendreJeu();
      return;

    case 'jukebox': {
      if (annuler) { fermerPoste(); return; }
      if (jukebox.onglet === 1) {
        // Onglet code : le clavier physique tape directement dans le champ.
        if (e.code === 'Backspace') { e.preventDefault(); effaceCode(); return; }
        if (valider) { validerCode(); return; }
        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
          jukebox.onglet = 0; audio.bruit('menu'); return;
        }
        if (/^[a-z0-9]$/.test(lettre)) { tapeCode(lettre.toUpperCase()); return; }
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        jukebox.index = (jukebox.index - 1 + PISTES_JUKEBOX.length) % PISTES_JUKEBOX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        jukebox.index = (jukebox.index + 1) % PISTES_JUKEBOX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
                 lettre === 'q' || lettre === 'd') {
        jukebox.onglet = jukebox.onglet ? 0 : 1; audio.bruit('menu');
      } else if (valider) {
        choisirPiste(PISTES_JUKEBOX[jukebox.index].cle);
      }
      return;
    }

    case 'difficulte':
      if (e.code === 'ArrowLeft' || lettre === 'q') {
        indexDifficulte = (indexDifficulte - 1 + DIFFICULTES.length) % DIFFICULTES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowRight' || lettre === 'd') {
        indexDifficulte = (indexDifficulte + 1) % DIFFICULTES.length;
        audio.bruit('menu');
      } else if (valider) validerDifficulte();
      else if (annuler) { scene = 'menu'; audio.bruit('menu'); }
      return;

    case 'dialogue':
      if (valider) avancerDialogue();
      else if (annuler) passerDialogue();
      return;

    case 'hub': {
      // Une confirmation ouverte prend la main sur tout le reste : sinon les
      // touches de deplacement continueraient de faire marcher Brad derriere
      // la question posee.
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        else if (annuler) repondreConfirmation(false);
        return;
      }
      // Le hub se joue : on laisse passer les commandes de deplacement, et le
      // saut sert d'action devant un poste (majHub le consomme).
      if (annuler) { retourAuMenu(); relacherTout(); return; }
      const ah = actionDe(e);
      if (!ah) return;
      if (FRONTS[ah] && !entrees[ah]) marquerFront(ah);
      entrees[ah] = true;
      return;
    }

    case 'boutique':
      if (annuler) { confirmation ? repondreConfirmation(false) : fermerPoste(); return; }
      if (confirmation) {
        if (valider) repondreConfirmation(true);
        return;
      }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        indexBoutique = (indexBoutique - 1 + articlesBoutique().length) % articlesBoutique().length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        indexBoutique = (indexBoutique + 1) % articlesBoutique().length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || lettre === 'q' || lettre === 'd') {
        /* La boutique a deux ou trois onglets selon que les Secrets sont
           decouverts : la bascule ne peut plus etre un simple « 1 moins ». */
        const n = ongletsBoutique().length;
        const pas = (e.code === 'ArrowLeft' || lettre === 'q') ? -1 : 1;
        ongletBoutique = ((ongletBoutique + pas) % n + n) % n;
        indexBoutique = 0; audio.bruit('menu');
      } else if (valider) acheterArticleCourant();
      return;

    /* Le vestiaire accepte une SAISIE DE CODE. Les lettres et les chiffres vont
       donc au champ, et la navigation passe par les fleches seules — ZQSD y
       naviguait avant, mais on ne peut pas a la fois taper « FNAM3RL » et
       traiter le S comme « descendre ». Les fleches suffisent, et le champ
       reste inutile a qui n'a pas de code. */
    case 'vestiaire':
      if (annuler) {
        if (vestiaireCode.saisie) { vestiaireCode.saisie = ''; audio.bruit('menu'); return; }
        fermerPoste(); return;
      }
      if (e.code === 'Backspace') { e.preventDefault(); effaceCodeVestiaire(); return; }
      if (e.code === 'ArrowLeft') {
        indexVestiaire = (indexVestiaire - 1 + UNIFORMES.length) % UNIFORMES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowRight') {
        indexVestiaire = (indexVestiaire + 1) % UNIFORMES.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowUp') {
        indexVestiaire = Math.max(0, indexVestiaire - VESTIAIRE_COLONNES); audio.bruit('menu');
      } else if (e.code === 'ArrowDown') {
        indexVestiaire = Math.min(UNIFORMES.length - 1, indexVestiaire + VESTIAIRE_COLONNES);
        audio.bruit('menu');
      } else if (valider) {
        // Entree valide le code s'il y en a un a valider, sinon elle habille.
        if (!validerCodeVestiaire()) porterUniformeCourant();
      } else if (/^[a-z0-9]$/.test(lettre)) {
        tapeCodeVestiaire(lettre);
      }
      return;

    case 'carte':
      if (annuler) { fermerPoste(); return; }
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') {
        indexCarte = (indexCarte - 1 + ORDRE_NIVEAUX.length) % ORDRE_NIVEAUX.length;
        audio.bruit('menu');
      } else if (e.code === 'ArrowDown' || lettre === 's') {
        indexCarte = (indexCarte + 1) % ORDRE_NIVEAUX.length;
        audio.bruit('menu');
      } else if (valider) lancerNiveauCourant();
      return;

    case 'arcade': {
      if (annuler) { fermerPoste(); return; }
      if (arcade.etat !== 'jeu') {
        if (valider) demarrerArcade();
        return;
      }
      const aa = actionDe(e);
      if (!aa) return;
      if (FRONTS[aa] && !entrees[aa]) marquerFront(aa);
      entrees[aa] = true;
      return;
    }

    /* LE COMBAT FINAL A SES PROPRES COMMANDES.

       On n'y saute pas : on se deplace sur une place, en quatre directions.
       Les touches de saut deviennent donc « avancer », et Espace devient
       l'esquive. Le mappage vit ici, dans son propre tableau, plutot que dans
       MAP_CODE : le reste du jeu ne doit pas voir passer une direction qu'il
       ne sait pas interpreter. */
    case 'final': {
      if (annuler) {
        if (finale.mort || finale.fini) { audio.arreterMusique(0.5); entrerHub(false); return; }
        ouvrirPause();
        return;
      }
      if (finale.mort) {
        if (valider) demarrerCombatFinal(false);
        return;
      }
      const af = actionFinale(e);
      if (!af) return;
      if (!entreesFinal[af]) marquerFrontFinal(af);
      entreesFinal[af] = true;
      return;
    }

    /* Le generique. Trois touches seulement : valider (passer a la fin, puis
       choisir), les fleches pour choisir, et Echap qui renvoie au menu. */
    case 'generique':
      if (annuler) { quitterGenerique('menu'); return; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' ||
          lettre === 'q' || lettre === 'd' || lettre === 'a') {
        deplacerGenerique(e.code === 'ArrowLeft' || lettre === 'q' || lettre === 'a' ? -1 : 1);
      } else if (valider) validerGenerique();
      return;

    /* La bande-annonce ne se pilote pas : elle se regarde, ou on en sort.
       Toute autre touche est ignoree — appuyer sur une fleche au milieu d'un
       montage ne doit rien faire bouger. */
    case 'bandeannonce':
      if (valider || annuler) quitterBandeAnnonce();
      return;

    case 'pret':
      if (valider) commencerNiveau();
      else if (annuler) retourAuMenu();
      return;

    case 'mort':
      if (valider || lettre === 'x') relancerApresMort();
      else if (annuler) { audio.arreterMusique(0.5); entrerHub(false); }
      return;

    case 'fin':
      // Un seul chemin, clavier comme clic : rentrerALaBase() coupe la musique,
      // entre dans le hub et fait commenter le retour par le BRADDY3000. Passer
      // par entrerHub() directement sauterait la replique.
      if (valider || annuler) rentrerALaBase();
      return;
  }

  // --- Scene 'jeu' ---------------------------------------------------------
  if (annuler) {
    // Echap n'abandonne plus le niveau d'un coup : il ouvre le menu de pause,
    // qui previent que quitter ne sauvegarde rien.
    ouvrirPause();
    return;
  }
  if (lettre === 'r') { preparerNiveau(niveauCourant); relacherTout(); return; }

  const a = actionDe(e);
  if (!a) return;
  if (FRONTS[a] && !entrees[a]) marquerFront(a);
  entrees[a] = true;
}
addEventListener('keydown', auClavier);

function auRelachement(e) {
  if (scene === 'final') {
    const af = actionFinale(e);
    if (af) entreesFinal[af] = false;
    return;
  }
  const a = actionDe(e);
  if (a) entrees[a] = false;
}
addEventListener('keyup', auRelachement);

addEventListener('blur', () => { relacherTout(); relacherFinal(); });

/* --- Souris ---------------------------------------------------------------
   Le menu etant dessine dans le canvas, il faut convertir les coordonnees de
   l'ecran vers la resolution interne de 640x360.
------------------------------------------------------------------------- */

function versCanvas(ev) {
  const r = canvas.getBoundingClientRect();
  const nx = (ev.clientX - r.left) * (LARGEUR / r.width);
  const ny = (ev.clientY - r.top) * (HAUTEUR / r.height);
  if (Math.abs(nx - souris.x) > 0.5 || Math.abs(ny - souris.y) > 0.5) souris.bouge = true;
  souris.x = nx;
  souris.y = ny;
  souris.dansCanvas = true;
}

canvas.addEventListener('pointermove', ev => {
  versCanvas(ev);
  if (souris.glissement) { ev.preventDefault(); majGlissement(); }
});

canvas.addEventListener('pointerleave', () => {
  souris.dansCanvas = false;
  souris.survol = null;
  souris.glissement = null;
});

addEventListener('pointerup', () => { souris.glissement = null; });
addEventListener('pointercancel', () => { souris.glissement = null; });

/* --- Lire un texte long au doigt -----------------------------------------
   L'ecran des conditions d'utilisation ne se lisait qu'aux fleches du clavier.
   Sur telephone il n'y a pas de fleches : passe le premier ecran, le contrat
   etait inatteignable — et c'est le document qu'il faut le plus pouvoir lire
   en entier.

   On ecoute APRES le gestionnaire de zones ci-dessous : `versCanvas` y a deja
   converti les coordonnees, et un appui sur un bouton (Retour, ▲, ▼) ne doit
   pas demarrer un glissement.
------------------------------------------------------------------------- */

const glisseTexte = { actif: false, clientY: 0, bouge: 0 };

function texteDefilable() { return scene === 'mentions'; }

canvas.addEventListener('pointerdown', ev => {
  // Ce gestionnaire est enregistre AVANT celui des zones : les coordonnees
  // doivent donc etre converties ici aussi, sinon `zoneSousSouris` juge la
  // position du doigt PRECEDENT — et au doigt, il n'y a pas de survol qui
  // tiendrait la position a jour entre deux appuis.
  versCanvas(ev);
  if (!texteDefilable() || zoneSousSouris()) return;
  glisseTexte.actif = true;
  glisseTexte.clientY = ev.clientY;
  glisseTexte.bouge = 0;
  try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* sans capture */ }
});

canvas.addEventListener('pointermove', ev => {
  if (!glisseTexte.actif) return;
  ev.preventDefault();
  const r = canvas.getBoundingClientRect();
  const dy = (ev.clientY - glisseTexte.clientY) * (HAUTEUR / Math.max(1, r.height));
  glisseTexte.clientY = ev.clientY;
  glisseTexte.bouge += Math.abs(dy);
  // Le doigt descend, le texte monte : c'est le sens naturel d'un document.
  defilerMentions(-dy);
});

addEventListener('pointerup', () => { glisseTexte.actif = false; });
addEventListener('pointercancel', () => { glisseTexte.actif = false; });

canvas.addEventListener('wheel', ev => {
  if (!texteDefilable()) return;
  ev.preventDefault();
  defilerMentions(ev.deltaY * (ev.deltaMode === 1 ? 16 : 1));
}, { passive: false });

/* --- Pas de zoom pendant qu'on joue --------------------------------------
   `user-scalable=no` dans la balise viewport est ignore par Safari iOS depuis
   iOS 10 : un double appui rapide sur un bouton de commande zoomait la page,
   et on se retrouvait a jouer sur un ecran agrandi qu'il fallait repincer.

   Deux verrous, parce qu'aucun des deux ne suffit seul :
     - `touch-action: none` sur la scene et le canvas (feuille de style) ;
     - les evenements `gesture*`, propres a Safari, qui portent le pincement.
   Le panneau de developpement, lui, garde son defilement : il est en dehors
   de #scene.
------------------------------------------------------------------------- */
['gesturestart', 'gesturechange', 'gestureend'].forEach(nom => {
  document.addEventListener(nom, ev => ev.preventDefault(), { passive: false });
});
document.addEventListener('dblclick', ev => {
  if (ev.target.closest && ev.target.closest('#reglages')) return;
  ev.preventDefault();
}, { passive: false });

canvas.addEventListener('pointerdown', ev => {
  versCanvas(ev);
  const z = zoneSousSouris();
  if (z) { ev.preventDefault(); activerZone(z); return; }
  // Un clic n'importe ou sur l'ecran d'accueil demarre aussi : le bouton est
  // une invitation, pas un passage oblige.
  if (scene === 'accueil') { lancerDemarrage(); return; }
  if (scene === 'dialogue') { ev.preventDefault(); avancerDialogue(); return; }
  // Idem sur l'ecran de mort : au doigt, il n'y a pas de touche Espace a
  // presser. N'importe ou sur l'ecran relance.
  if (scene === 'mort') { ev.preventDefault(); relancerApresMort(); }
});

/* --- Commandes tactiles --------------------------------------------------- */

const zoneTactile = document.getElementById('tactile');
const estTactile = matchMedia('(pointer: coarse)').matches;

/* -----------------------------------------------------------------------------
   LA COURSE AUTOMATIQUE

   Au clavier, courir se fait en TENANT Maj. Au doigt, il n'y a pas de touche a
   tenir : sur telephone, Brad ne courait donc jamais — et plusieurs sauts du
   jeu demandent la vitesse de course pour passer.

   D'ou une bascule : une fois allumee, Brad court tout le temps. Le choix est
   retenu dans le navigateur, sous sa propre clef — effacer sa partie ne doit
   pas redemander ce reglage, qui n'est pas une progression.

   Le message ne reste pas : il dit ce qui vient de changer, puis s'efface.
-------------------------------------------------------------------------- */

const CLE_COURSE_AUTO = 'bradbitt.courseauto.v1';
const courseAuto = { actif: false, texte: '', message: 0 };
try { courseAuto.actif = localStorage.getItem(CLE_COURSE_AUTO) === '1'; }
catch (e) { /* navigation privee */ }

function basculerCourseAuto() {
  courseAuto.actif = !courseAuto.actif;
  try { localStorage.setItem(CLE_COURSE_AUTO, courseAuto.actif ? '1' : '0'); }
  catch (e) { /* navigation privee */ }
  courseAuto.texte = courseAuto.actif ? 'Course automatique activée'
                                      : 'Course automatique désactivée';
  courseAuto.message = 2.4;
  if (!courseAuto.actif) entrees.courir = false;
  audio.bruit('valider');
  majBoutonCourseAuto();
}

function majBoutonCourseAuto() {
  const b = zoneTactile.querySelector('[data-touche="course-auto"]');
  if (b) b.setAttribute('aria-pressed', courseAuto.actif ? 'true' : 'false');
}

/* Appelee une fois par image, avant la simulation. Elle n'agit qu'en jeu et
   dans la base : la bande-annonce pilote `entrees.courir` elle-meme, et lui
   forcer la main ferait rater ses sauts. */
function appliquerCourseAuto(delta) {
  if (courseAuto.message > 0) courseAuto.message -= delta;
  if (!courseAuto.actif) return;
  if (scene === 'jeu' || scene === 'hub' || scene === 'arcade') entrees.courir = true;
}

zoneTactile.querySelectorAll('.tbtn').forEach(btn => {
  const a = btn.dataset.touche;
  /* Le combat final n'a pas les memes actions : le bouton de saut y devient
     l'esquive. Les quatre boutons tactiles suffisent a le jouer — le
     deplacement en profondeur reste au clavier, mais tout ce qui fait mal
     s'esquive lateralement ou d'un bond. */
  const versFinal = { gauche: 'gauche', droite: 'droite', saut: 'esquive',
                      attaque: 'attaque', onde: 'onde' };
  const presser = ev => {
    ev.preventDefault();
    // La bascule agit a l'appui, partout, et ne se « tient » pas.
    if (a === 'course-auto') { basculerCourseAuto(); return; }
    if (scene === 'final') {
      const af = versFinal[a];
      if (!af) return;
      if (!entreesFinal[af]) marquerFrontFinal(af);
      entreesFinal[af] = true;
      return;
    }
    if (scene !== 'jeu' && scene !== 'hub' && scene !== 'arcade') return;
    if (FRONTS[a] && !entrees[a]) marquerFront(a);
    entrees[a] = true;
  };
  const relacher = ev => {
    ev.preventDefault();
    if (a === 'course-auto') return;
    entrees[a] = false;
    if (versFinal[a]) entreesFinal[versFinal[a]] = false;
  };
  btn.addEventListener('pointerdown', presser);
  btn.addEventListener('pointerup', relacher);
  btn.addEventListener('pointercancel', relacher);
  btn.addEventListener('pointerleave', relacher);
});

majBoutonCourseAuto();

/* Les boutons tactiles ne servent que pendant le jeu : ailleurs ils
   masqueraient inutilement le menu. */
function majAffichageTactile() {
  const jouable = scene === 'jeu' || scene === 'hub' || scene === 'final' ||
                  (scene === 'arcade' && arcade.etat === 'jeu');
  const visible = estTactile && jouable && !enPortrait();
  if (zoneTactile.hidden === visible) zoneTactile.hidden = !visible;
}

/* --- Orientation ----------------------------------------------------------
   Le jeu est cadre en 16:9 : en portrait, l'image occupe une bande minuscule
   et les commandes recouvrent la moitie de l'ecran. On demande donc la
   rotation avant tout — y compris avant le bouton « Jouer », pour que le
   joueur ne demarre pas dans une configuration injouable.
------------------------------------------------------------------------- */

const ecranRotation = document.getElementById('rotation');

function enPortrait() {
  return estTactile && innerHeight > innerWidth;
}

function majOrientation() {
  const demander = enPortrait();
  if (ecranRotation.hidden === demander) ecranRotation.hidden = !demander;
  if (demander) relacherTout();
}

addEventListener('resize', majOrientation);
addEventListener('orientationchange', () => setTimeout(majOrientation, 120));
majOrientation();

/* =============================================================================
   LA MANETTE

   Elle ne duplique RIEN. Chaque bouton est traduit en un evenement de la meme
   forme que celui d'un clavier — { code, key } — et passe a `auClavier` /
   `auRelachement`. La manette herite donc d'un coup de toute la navigation du
   jeu : les menus, la boutique, le jukebox, la pause, le combat final, le
   generique, la bande-annonce. Ajouter un ecran plus tard, c'est le rendre
   jouable a la manette sans y penser.

   Le mappage suit la disposition commune aux manettes reconnues par le
   navigateur (« standard gamepad ») :

     croix directionnelle et stick gauche  ->  fleches
     bouton du bas   (A / croix)           ->  Espace   saut, valider
     bouton de droite(B / rond)            ->  Echap    retour, pause
     bouton de gauche(X / carre)           ->  X        frapper
     bouton du haut  (Y / triangle)        ->  C        onde de choc
     gachettes hautes L1 / R1              ->  Maj      courir
     Start                                 ->  Echap    pause

   Un navigateur ne signale une manette qu'apres une premiere pression : c'est
   volontaire (empreinte numerique), et il n'y a rien a faire de plus que
   d'interroger `navigator.getGamepads()` a chaque image.
========================================================================== */

const MANETTE_ZONE_MORTE = 0.45;      // en deca, le stick est considere au repos

/* =============================================================================
   LE MAPPAGE

   Les index sont ceux de la « standard gamepad » du navigateur, et ils sont
   POSITIONNELS, pas nominaux : l'index 0 est toujours le bouton DU BAS, quel
   que soit ce qui est grave dessus.

     index 0  bas     ✕ PlayStation    A Xbox    B Switch
     index 1  droite  ○ PlayStation    B Xbox    A Switch
     index 2  gauche  □ PlayStation    X Xbox    Y Switch
     index 3  haut    △ PlayStation    Y Xbox    X Switch
     index 6  L2      index 7  R2      4 L1      5 R1

   C'est ce qui permet de tenir la demande telle qu'elle a ete formulee :
   « ✕ PlayStation / B Switch / A Xbox » designe bien UN SEUL bouton, celui du
   bas, et c'est lui qui lance un objet.

   UN MEME BOUTON, TROIS CONTEXTES. Le bouton du bas lance un objet en jeu et
   valide dans un menu : ce sont deux roles differents, donc trois tables
   plutot qu'une. Le dispatch existant fait le reste — la manette fabrique un
   evenement clavier et le passe a `auClavier`, qui sait deja quoi en faire
   selon la scene.
========================================================================== */

const T_SPACE  = { code: 'Space',      key: ' ' };
const T_ECHAP  = { code: 'Escape',     key: 'Escape' };
const T_X      = { code: 'KeyX',       key: 'x' };
const T_C      = { code: 'KeyC',       key: 'c' };
const T_MAJ    = { code: 'ShiftLeft',  key: 'Shift' };
const T_HAUT   = { code: 'ArrowUp',    key: 'ArrowUp' };
const T_BAS    = { code: 'ArrowDown',  key: 'ArrowDown' };
const T_GAUCHE = { code: 'ArrowLeft',  key: 'ArrowLeft' };
const T_DROITE = { code: 'ArrowRight', key: 'ArrowRight' };

/* Les directions et la pause ne changent jamais : elles sont communes. */
const MANETTE_COMMUN = {
  3:  T_ECHAP,     // haut  △ / Y / X  -> pause
  9:  T_ECHAP,     // Start            -> pause
  12: T_HAUT, 13: T_BAS, 14: T_GAUCHE, 15: T_DROITE,
};

/* EN NIVEAU. Le bouton du bas lance un objet, celui de gauche declenche le
   Brad-Shy, la gachette droite fait courir. Le saut n'etait pas dans la
   demande : il est sur le HAUT du stick et de la croix — comme la fleche haut
   au clavier — et double sur le bouton de droite, parce qu'un platformer sans
   saut sous le pouce n'est pas jouable. */
const MANETTE_JEU = Object.assign({}, MANETTE_COMMUN, {
  0: T_X,          // bas    ✕ / A / B  -> lancer un objet
  1: T_HAUT,       // droite ○ / B / A  -> sauter
  2: T_C,          // gauche □ / X / Y  -> Brad-Shy
  4: T_MAJ, 5: T_MAJ, 6: T_MAJ, 7: T_MAJ,   // gachettes -> courir
});

/* AU COMBAT FINAL. La scene a ses propres commandes : Espace y est l'esquive,
   les fleches haut et bas avancent et reculent en profondeur. Le bouton du bas
   garde son role — frapper — et celui de droite devient l'esquive. */
const MANETTE_FINAL = Object.assign({}, MANETTE_COMMUN, {
  0: T_X,          // frapper
  1: T_SPACE,      // esquiver
  2: T_C,          // Brad-Shy
  4: T_SPACE, 5: T_SPACE, 6: T_SPACE, 7: T_SPACE,
});

/* PARTOUT AILLEURS — menus, base, boutique, jukebox, dialogues. Le bouton du
   bas valide, celui de droite annule. C'est la convention PlayStation et Xbox.
   Sur une manette Nintendo, le bouton du bas porte un B : valider avec B peut
   surprendre, mais l'alternative serait d'inverser le sens physique du geste
   d'un support a l'autre. */
const MANETTE_MENU = Object.assign({}, MANETTE_COMMUN, {
  0: T_SPACE,      // valider, et agir devant un poste de la base
  1: T_ECHAP,      // annuler, revenir
  2: T_C,
  4: T_MAJ, 5: T_MAJ, 6: T_MAJ, 7: T_MAJ,
});

function tableManette() {
  if (scene === 'final') return MANETTE_FINAL;
  if (scene === 'jeu') return MANETTE_JEU;
  return MANETTE_MENU;
}

/* Ce que la manette fait, en clair — c'est cette table qui alimente l'ecran
   « Contrôles » des options. Un seul endroit a tenir a jour. */
const MANETTE_LEGENDE = [
  { geste: 'Stick gauche · croix', role: 'Se déplacer, naviguer dans les menus' },
  { geste: 'Stick haut · croix haut', role: 'Sauter' },
  { geste: 'Gâchette droite (R2 · RT · ZR)', role: 'Courir' },
  { geste: 'Bouton du bas  ✕ · A · B', role: 'Lancer un objet — et valider dans un menu' },
  { geste: 'Bouton de droite  ○ · B · A', role: 'Sauter — et revenir en arrière dans un menu' },
  { geste: 'Bouton de gauche  □ · X · Y', role: 'Brad-Shy' },
  { geste: 'Bouton du haut  △ · Y · X', role: 'Menu pause' },
  { geste: 'Start · Options', role: 'Menu pause' },
];

/* L'etat precedent, pour n'envoyer un evenement qu'au CHANGEMENT. Sans ça, un
   bouton maintenu rejouerait son evenement soixante fois par seconde : le menu
   defilerait a toute vitesse et Brad sauterait en boucle.

   On retient aussi AVEC QUELLE TOUCHE chaque bouton a ete enfonce. Changer de
   scene change la table : un bouton enfonce en niveau et relache dans un menu
   doit etre relache avec la touche qu'il avait a l'appui, sinon la touche reste
   collee — Brad courait tout seul apres une pause. */
const manette = { boutons: {}, tenues: {}, branchee: false };

/* L'APPUI passe par le dispatch normal : il doit agir selon la scene courante.

   Le RELACHEMENT, non. `auRelachement` choisit sa table d'apres la scene du
   MOMENT ou la touche est lachee — or un bouton enfonce au combat final et
   relache dans un menu se relachait alors dans la mauvaise table : l'esquive
   restait enfoncee pour toujours dans `entreesFinal`. On relache donc dans LES
   DEUX tables, directement. Relacher une touche qui n'etait pas tenue ne coute
   rien ; ne pas relacher celle qui l'etait coute une commande bloquee. */
function evenementManette(enfonce, touche) {
  if (enfonce) { auClavier({ code: touche.code, key: touche.key }); return; }
  const e = { code: touche.code, key: touche.key };
  const a = actionDe(e);
  if (a) entrees[a] = false;
  const af = actionFinale(e);
  if (af) entreesFinal[af] = false;
}

function etatManette(i, enfonce, touche) {
  if (!!manette.boutons[i] === !!enfonce) return;
  manette.boutons[i] = enfonce;
  if (enfonce) {
    manette.tenues[i] = touche;
    evenementManette(true, touche);
  } else {
    evenementManette(false, manette.tenues[i] || touche);
    manette.tenues[i] = null;
  }
}

function relacherManette() {
  for (const i of Object.keys(manette.boutons)) {
    if (manette.boutons[i] && manette.tenues[i]) evenementManette(false, manette.tenues[i]);
    manette.boutons[i] = false;
    manette.tenues[i] = null;
  }
}

function majManette() {
  /* La manette arrive a la sortie du jeu, pas pendant la beta. On ne
     l'interroge pas du tout : une manette branchee ne doit rien faire, plutot
     que de faire a moitie quelque chose. Tout le code reste en place — il
     suffit de repasser BETA a false. */
  if (BETA) return;
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
  let g = null;
  const liste = navigator.getGamepads();
  for (let i = 0; i < liste.length; i++) {
    if (liste[i] && liste[i].connected) { g = liste[i]; break; }
  }
  if (!g) {
    // Manette debranchee en cours de partie : on relache tout ce qu'elle
    // tenait, sinon Brad continuerait de courir vers la droite pour toujours.
    if (manette.branchee) {
      relacherManette();
      manette.branchee = false;
      relacherTout();
    }
    return;
  }
  manette.branchee = true;
  const table = tableManette();

  for (const i of Object.keys(table)) {
    const b = g.buttons[i];
    etatManette(i, !!b && (b.pressed || b.value > 0.5), table[i]);
  }

  // Le stick gauche double la croix directionnelle. On le traite comme quatre
  // boutons virtuels pour que le reste du jeu n'ait rien a savoir d'un axe.
  const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
  etatManette('sg', ax < -MANETTE_ZONE_MORTE, T_GAUCHE);
  etatManette('sd', ax > MANETTE_ZONE_MORTE, T_DROITE);
  etatManette('sh', ay < -MANETTE_ZONE_MORTE, T_HAUT);
  etatManette('sb', ay > MANETTE_ZONE_MORTE, T_BAS);
}

addEventListener('gamepadconnected', () => { manette.branchee = true; });
