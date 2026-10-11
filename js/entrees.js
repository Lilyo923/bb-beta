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

/* =============================================================================
   UNE TOUCHE QUE LE JEU CROIT ENFONCEE

   Symptome signale pendant la beta : Brad part vers la gauche et ne s'arrete
   plus ; appuyer a droite l'immobilise, relacher le fait repartir. C'est une
   commande restee a « vrai » parce que son RELACHEMENT n'est jamais arrive.
   Reproduit : -150 px/s sans aucune touche, 0 pendant qu'on tient →, -150 des
   qu'on la lache — et seul un appui sur ← le libere.

   Le jeu n'apprend qu'une touche est lachee que si le navigateur le lui dit.
   Quatre cas ou il ne le dit pas, ou mal — chacun a maintenant sa parade :

   1. LA LETTRE CHANGE ENTRE L'APPUI ET LE RELACHEMENT. La touche du coin haut
      gauche (A en AZERTY, Q en QWERTY) n'est reconnue QUE par sa lettre. Si
      Option est enfoncee avant de la lacher, le relachement annonce « æ » :
      inconnu, donc ignore. On retient desormais, a l'appui, quelle TOUCHE
      PHYSIQUE (`code`) fait quelle action ; au relachement on relit cette
      note, quelle que soit la lettre.

   2. ⌘ SUR MAC. Tant que ⌘ est enfoncee, macOS ne signale AUCUN relachement
      des autres touches — et ⌘ est sous le pouce, a cote d'Espace. Une touche
      avec ⌘ est un raccourci du systeme, pas une commande de jeu : on lache
      tout, a l'appui comme au relachement de ⌘.

   3. LA FENETRE CHANGE D'ETAT : plein ecran qu'on quitte, onglet qu'on cache,
      menu contextuel, fenetre redimensionnee. Pendant ces transitions le
      navigateur peut avaler des evenements. On lache tout a chacune.

   4. LA FENETRE PERD LE FOCUS — celui-la etait deja traite.

   Je n'ai pas pu rejouer la partie ou le defaut est apparu : je ne sais donc
   pas LAQUELLE de ces portes etait ouverte ce jour-la. Elles sont toutes
   fermees ; s'il reparait, c'est qu'il en existe une cinquieme.
========================================================================== */

const touchesTenues = {};        // code de la touche physique -> action

function relacherTout() {
  Object.keys(entrees).forEach(k => { entrees[k] = false; });
  for (const c of Object.keys(touchesTenues)) delete touchesTenues[c];
}

/* Une commande de jeu enfoncee : on la note sous sa touche physique. */
function enfoncer(e, action) {
  if (FRONTS[action] && !entrees[action]) marquerFront(action);
  entrees[action] = true;
  if (e && e.code) touchesTenues[e.code] = action;
}

function estToucheCommande(e) {
  return e.key === 'Meta' || e.code === 'MetaLeft' || e.code === 'MetaRight' ||
         e.code === 'OSLeft' || e.code === 'OSRight';
}

/* Le corps du gestionnaire est une FONCTION NOMMEE, et pas seulement pour la
   lisibilite : la manette s'en sert. Elle fabrique des evenements de la meme
   forme ({ code, key }) et les passe ici, ce qui lui donne d'un coup toute la
   navigation du jeu — menus, boutique, jukebox, pause, combat final,
   generique, bande-annonce — sans en reecrire une ligne. */
function auClavier(e) {
  if (!e.preventDefault) e.preventDefault = () => {};
  // Un raccourci du systeme n'est pas une commande de jeu, et tant que ⌘ est
  // enfoncee macOS ne signale aucun relachement : voir plus haut. On ne
  // touche pas a l'evenement — ⌘Q doit toujours quitter.
  if (e.metaKey || estToucheCommande(e)) { relacherTout(); relacherFinal(); return; }
  if (e.code === 'F1') { e.preventDefault(); basculerPanneau(); return; }
  if (TOUCHES_DEFILEMENT.includes(e.code)) e.preventDefault();
  /* ECHAP NE DOIT PAS FAIRE SORTIR DU PLEIN ECRAN.

     Dans Safari, Echap quitte le plein ecran de la fenetre — SAUF si la page
     annule l'action par defaut de la touche. Le jeu ne l'annulait pas : chaque
     Echap ouvrait donc la pause ET reduisait la fenetre. C'est une ligne.

     (J'avais ecrit au prototype 26 que le navigateur « garde Echap pour lui »
     et que le jeu ne l'entend pas. C'est vrai du plein ecran demande par une
     page — l'API Fullscreen — que le jeu n'utilise pas. Pour le plein ecran de
     la fenetre, celui du bouton vert, c'etait faux : la touche arrive bien.)

     Non essaye dans Safari, que je ne peux pas piloter : c'est le comportement
     documente, a confirmer sur place. */
  if (e.code === 'Escape') e.preventDefault();

  const lettre = (e.key || '').toLowerCase();
  /* UNE TOUCHE TENUE NE VALIDE RIEN.

     Le navigateur repete une touche gardee enfoncee, une trentaine de fois par
     seconde. Or Espace est a la fois « sauter », « tirer » et « valider » :
     garder le doigt dessus en changeant d'ecran validait donc le suivant sans
     l'avoir lu — relancer une partie d'arcade en perdant, acheter le premier
     article en entrant dans la boutique, sauter le bilan d'un niveau.

     Valider demande desormais un appui NEUF. Les fleches, elles, continuent de
     se repeter : faire defiler une liste en gardant ↓ reste voulu. */
  const valider = !e.repeat &&
    (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter');
  const annuler = e.code === 'Escape';
  /* P : LA TOUCHE QUI FAIT CE QUE FAIT ECHAP, LA OU ON NE TAPE PAS DE TEXTE.

     Une seconde touche pour la meme chose, sous la main droite. Dans les
     panneaux, « Sortir » se choisit aux fleches (voir focusSortir, js/hub.js).
     En jeu et dans la base il n'y a pas de liste ou le ranger : P ouvre donc
     la pause, demande a quitter la base, et passe un dialogue. */
  const toucheP = lettre === 'p' && !e.repeat;

  // Une question posee passe avant tout le reste, quelle que soit la scene.
  if (toucheConfirmation(e, lettre, valider, annuler)) return;

  const haut = e.code === 'ArrowUp', bas = e.code === 'ArrowDown';
  const gauche = e.code === 'ArrowLeft', droite = e.code === 'ArrowRight';

  switch (scene) {
    /* LE COMPTE A REBOURS. Ce `case` et son `return` sont le verrou du clavier :
       sans eux, une scene inconnue tomberait dans le code de la scene de jeu,
       tout en bas — ou la touche R relance un niveau. */
    case 'compte':
      toucheCompte(e, lettre, annuler);
      return;

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
      if (gauche || droite || haut || bas || lettre === 'q' || lettre === 'd') {
        avisBeta.choix = avisBeta.choix ? 0 : 1; audio.bruit('menu');
      } else if (valider) {
        if (avisBeta.choix === 1) annulerAvisBeta(); else validerAvisBeta();
      } else if (annuler) annulerAvisBeta();
      return;

    case 'finbeta':
      if (valider || annuler) quitterFinBeta();
      return;

    case 'pause':
      if (e.code === 'ArrowUp' || lettre === 'z' || lettre === 'w') deplacerPause(-1);
      else if (e.code === 'ArrowDown' || lettre === 's') deplacerPause(1);
      else if (valider) validerPause();
      else if (annuler || toucheP) reprendreJeu();
      return;

    case 'jukebox': {
      if (annuler) { fermerPoste(); return; }
      if (jukebox.onglet === 1) {
        /* Onglet code : le clavier physique tape directement dans le champ.
           ↓ descend sur « Sortir », ↑ revient au champ ; taper une lettre y
           revient aussi — on ne perd jamais un caractere. */
        if (haut || bas) { focusSortir = bas; audio.bruit('menu'); return; }
        if (gauche || droite) {
          jukebox.onglet = 0; focusSortir = false; audio.bruit('menu'); return;
        }
        if (focusSortir && valider) { fermerPoste(); return; }
        if (e.code === 'Backspace') { e.preventDefault(); focusSortir = false; effaceCode(); return; }
        if (valider) { validerCode(); return; }
        if (/^[a-z0-9]$/.test(lettre)) { focusSortir = false; tapeCode(lettre.toUpperCase()); return; }
        return;
      }
      if (haut || lettre === 'z' || lettre === 'w') {
        jukebox.index = deplacerAvecSortir(jukebox.index, -1, PISTES_JUKEBOX.length);
      } else if (bas || lettre === 's') {
        jukebox.index = deplacerAvecSortir(jukebox.index, 1, PISTES_JUKEBOX.length);
      } else if (gauche || droite || lettre === 'q' || lettre === 'd') {
        jukebox.onglet = jukebox.onglet ? 0 : 1; focusSortir = false; audio.bruit('menu');
      } else if (valider) {
        if (focusSortir) fermerPoste();
        else choisirPiste(PISTES_JUKEBOX[jukebox.index].cle);
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
      } else if (haut || bas || lettre === 'z' || lettre === 'w' || lettre === 's') {
        // Deux boutons sous les cartes : « Commencer » et « Retour ».
        retourDifficulte = !retourDifficulte; audio.bruit('menu');
      } else if (valider) {
        if (retourDifficulte) quitterChoixDifficulte(); else validerDifficulte();
      } else if (annuler) quitterChoixDifficulte();
      return;

    case 'dialogue':
      if (valider) avancerDialogue();
      else if (annuler || toucheP) passerDialogue();
      return;

    case 'hub': {
      // (Une confirmation ouverte a deja pris la main, tout en haut : les
      // touches de deplacement ne font pas marcher Brad derriere la question.)
      // Le hub se joue : on laisse passer les commandes de deplacement, et le
      // saut sert d'action devant un poste (majHub le consomme).
      if (annuler || toucheP) { demanderRetourMenu(); return; }
      const ah = actionDe(e);
      if (!ah) return;
      enfoncer(e, ah);
      return;
    }

    case 'boutique':
      if (annuler) { fermerPoste(); return; }
      if (haut || lettre === 'z' || lettre === 'w') {
        indexBoutique = deplacerAvecSortir(indexBoutique, -1, articlesBoutique().length);
      } else if (bas || lettre === 's') {
        indexBoutique = deplacerAvecSortir(indexBoutique, 1, articlesBoutique().length);
      } else if (gauche || droite || lettre === 'q' || lettre === 'd') {
        /* La boutique a deux ou trois onglets selon que les Secrets sont
           decouverts : la bascule ne peut plus etre un simple « 1 moins ». */
        const n = ongletsBoutique().length;
        const pas = (gauche || lettre === 'q') ? -1 : 1;
        ongletBoutique = ((ongletBoutique + pas) % n + n) % n;
        indexBoutique = 0; focusSortir = false; audio.bruit('menu');
      } else if (valider) {
        if (focusSortir) fermerPoste(); else acheterArticleCourant();
      }
      return;

    /* LE VESTIAIRE. Z Q S D y naviguent comme partout ailleurs ; le clavier
       n'ecrit dans le champ de code QUE si on y est entre (voir « la saisie
       de code », js/hub.js). De haut en bas : la grille, le champ de code,
       « Sortir ». */
    case 'vestiaire': {
      if (vestiaireCode.actif) {
        // --- En saisie : le clavier ecrit.
        if (annuler) { quitterSaisieVestiaire(true); return; }
        if (e.code === 'Backspace') { e.preventDefault(); effaceCodeVestiaire(); return; }
        if (!e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
          if (vestiaireCode.saisie) { validerCodeVestiaire(); vestiaireCode.actif = false; }
          else quitterSaisieVestiaire(false);
          return;
        }
        // Une fleche sort de la saisie en gardant ce qui est tape, puis
        // deplace la selection comme d'habitude (suite du `case`).
        if (!(haut || bas || gauche || droite)) {
          if (/^[a-z0-9]$/.test(lettre)) tapeCodeVestiaire(lettre);
          return;
        }
        vestiaireCode.actif = false;
      }
      if (annuler) { fermerPoste(); return; }
      if (e.code === 'Backspace') { e.preventDefault(); return; }   // pas de « page precedente »

      const vHaut = haut || lettre === 'z' || lettre === 'w';
      const vBas = bas || lettre === 's';
      const vGauche = gauche || lettre === 'q';
      const vDroite = droite || lettre === 'd';
      const n = ordreVestiaire().length;

      if (vestiaireCode.focus) {
        // --- Le champ de code est choisi, on n'y ecrit pas encore.
        if (vHaut) { vestiaireCode.focus = false; audio.bruit('menu'); }
        else if (vBas || vDroite) { vestiaireCode.focus = false; focusSortir = true; audio.bruit('menu'); }
        else if (valider) entrerSaisieVestiaire();
        return;
      }
      if (focusSortir) {
        if (vHaut || vGauche) { focusSortir = false; vestiaireCode.focus = true; audio.bruit('menu'); }
        else if (valider) fermerPoste();
        return;
      }
      // --- La grille.
      if (vGauche) { indexVestiaire = (indexVestiaire - 1 + n) % n; audio.bruit('menu'); }
      else if (vDroite) { indexVestiaire = (indexVestiaire + 1) % n; audio.bruit('menu'); }
      else if (vHaut) {
        const v = voisinVestiaire(indexVestiaire, -1);
        if (v !== null) indexVestiaire = v;
        audio.bruit('menu');
      } else if (vBas) {
        // Sous la derniere rangee : le champ de code, puis « Sortir ».
        const v = voisinVestiaire(indexVestiaire, 1);
        if (v !== null) indexVestiaire = v; else vestiaireCode.focus = true;
        audio.bruit('menu');
      } else if (valider) porterUniformeCourant();
      return;
    }

    case 'carte':
      if (annuler) { fermerPoste(); return; }
      if (haut || lettre === 'z' || lettre === 'w') {
        indexCarte = deplacerAvecSortir(indexCarte, -1, ORDRE_NIVEAUX.length);
      } else if (bas || lettre === 's') {
        indexCarte = deplacerAvecSortir(indexCarte, 1, ORDRE_NIVEAUX.length);
      } else if (valider) {
        if (focusSortir) fermerPoste(); else lancerNiveauCourant();
      }
      return;

    case 'arcade': {
      if (annuler) { fermerPoste(); return; }
      if (arcade.etat !== 'jeu') {
        /* Accueil et fin de partie : deux boutons, aux fleches. Juste apres
           un game over, l'ecran n'ecoute rien pendant ARC.verrouFin secondes
           (voir js/arcade.js) — les deux fonctions ci-dessous le savent. */
        if (gauche || droite || haut || bas || lettre === 'q' || lettre === 'd') deplacerChoixArcade();
        else if (valider) validerChoixArcade();
        return;
      }
      const aa = actionDe(e);
      if (!aa) return;
      enfoncer(e, aa);
      return;
    }

    /* LE COMBAT FINAL A SES PROPRES COMMANDES.

       On n'y saute pas : on se deplace sur une place, en quatre directions.
       Les touches de saut deviennent donc « avancer », et Espace devient
       l'esquive. Le mappage vit ici, dans son propre tableau, plutot que dans
       MAP_CODE : le reste du jeu ne doit pas voir passer une direction qu'il
       ne sait pas interpreter. */
    case 'final': {
      if (annuler || toucheP) {
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

    /* Deux ecrans a deux boutons, dont le second — « Retour » — n'etait
       atteignable qu'a la souris ou par Echap. ↑ ↓ passent de l'un a l'autre,
       Entree valide celui qui est allume. */
    case 'pret':
      if (haut || bas || lettre === 'z' || lettre === 'w' || lettre === 's') {
        choixPret = choixPret ? 0 : 1; audio.bruit('menu');
      } else if (valider) {
        if (choixPret === 1) quitterPret(); else commencerNiveau();
      } else if (annuler) retourAuMenu();
      return;

    case 'mort':
      if ((haut || bas || lettre === 'z' || lettre === 'w' || lettre === 's') && baseAccessible()) {
        choixMort = choixMort ? 0 : 1; audio.bruit('menu');
      } else if (valider || (lettre === 'x' && !e.repeat)) {
        if (choixMort === 1 && baseAccessible()) { audio.arreterMusique(0.5); entrerHub(false); }
        else relancerApresMort();
      } else if (annuler && baseAccessible()) {
        // Echap ne rentre a la base que si elle existe : pendant l'introduction
        // elle n'est pas encore montee, et le bouton n'est d'ailleurs pas offert.
        audio.arreterMusique(0.5); entrerHub(false);
      }
      return;

    case 'fin':
      // Un seul chemin, clavier comme clic : rentrerALaBase() coupe la musique,
      // entre dans le hub et fait commenter le retour par le BRADDY3000. Passer
      // par entrerHub() directement sauterait la replique.
      if (valider || annuler) rentrerALaBase();
      return;
  }

  // --- Scene 'jeu' ---------------------------------------------------------
  if (annuler || toucheP) {
    // Echap (ou P) n'abandonne plus le niveau d'un coup : il ouvre le menu de
    // pause, qui previent que quitter ne sauvegarde rien.
    ouvrirPause();
    return;
  }
  if (lettre === 'r') { preparerNiveau(niveauCourant); relacherTout(); return; }

  const a = actionDe(e);
  if (!a) return;
  enfoncer(e, a);
}
addEventListener('keydown', auClavier);

function auRelachement(e) {
  // ⌘ relachee : ce qui a ete lache pendant qu'elle etait enfoncee n'a rien dit.
  if (estToucheCommande(e)) { relacherTout(); relacherFinal(); return; }
  /* L'action est celle NOTEE A L'APPUI pour cette touche physique. La lettre
     que porte le relachement peut avoir change entre-temps (Option, verrouillage
     majuscule, changement de disposition) : s'y fier, c'est laisser la
     commande enfoncee pour toujours. */
  const notee = e.code ? touchesTenues[e.code] : undefined;
  if (e.code) delete touchesTenues[e.code];
  if (scene === 'final') {
    const af = actionFinale(e);
    if (af) entreesFinal[af] = false;
    if (notee) entrees[notee] = false;
    return;
  }
  const a = notee || actionDe(e);
  if (a) entrees[a] = false;
}
addEventListener('keyup', auRelachement);

/* TOUT LACHER QUAND LA FENETRE CHANGE D'ETAT. Voir « une touche que le jeu
   croit enfoncee », plus haut. Lacher a tort ne coute qu'un appui a refaire ;
   ne pas lacher coute un Brad qui court tout seul. */
function toutLacher() { relacherTout(); relacherFinal(); }

addEventListener('blur', toutLacher);
addEventListener('pagehide', toutLacher);
addEventListener('contextmenu', toutLacher);
document.addEventListener('visibilitychange', () => { if (document.hidden) toutLacher(); });
['fullscreenchange', 'webkitfullscreenchange'].forEach(nom =>
  document.addEventListener(nom, toutLacher));

/* Le plein ecran de la fenetre (le bouton vert de macOS) ne previent par aucun
   evenement qui lui soit propre : il se lit a la taille EXTERIEURE de la
   fenetre, qui saute. On ne reagit qu'a un vrai saut — sur telephone, la barre
   d'adresse qui se replie change la taille interieure plusieurs fois par
   minute, et lacher les commandes a chaque fois couperait la course. */
const fenetreVue = { l: window.outerWidth || 0, h: window.outerHeight || 0 };
addEventListener('resize', () => {
  const l = window.outerWidth || 0, h = window.outerHeight || 0;
  if (Math.abs(l - fenetreVue.l) > 40 || Math.abs(h - fenetreVue.h) > 40) toutLacher();
  fenetreVue.l = l; fenetreVue.h = h;
});

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
  delete touchesTenues[touche.code];
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
