/* =============================================================================
   BRAD BITT — verification du prototype 26, DANS LE NAVIGATEUR

   Les suites tools/verif.mjs et tools/verif-beta.mjs ont besoin de Node et de
   Playwright. Celle-ci n'a besoin de rien : elle tourne dans la page du jeu
   lui-meme, sur n'importe quelle machine qui sait ouvrir le jeu.

   LANCER
     1. python3 tools/serveur.py            (ou --edition finale)
     2. ouvrir http://localhost:8126/ — inutile de cliquer sur « Jouer »
     3. dans la console du navigateur :
          var s = document.createElement('script'); s.src = 'tools/verif-26.js';
          document.head.appendChild(s);
     Le bilan s'ecrit dans la console et reste dans `window.__verif26`.

   CE QU'ELLE NE FAIT PAS COMME UN JOUEUR, ET POURQUOI
     Elle n'attend pas l'horloge : elle fait avancer le jeu IMAGE PAR IMAGE, en
     appelant `imageDuJeu` avec des instants qu'elle fabrique. Douze secondes de
     regeneration se verifient en une fraction de seconde, et surtout le
     resultat ne depend plus de la fluidite de l'onglet — un onglet en
     arriere-plan tombe a deux images par seconde, et une suite qui attendrait
     « six vraies secondes » mesurerait alors n'importe quoi. (C'est en tombant
     dans ce piege que le defaut de l'accumulateur, section N, a ete trouve.)

   Elle joue avec la partie du navigateur : elle la SAUVEGARDE en entrant et la
   REMET en sortant, recompenses comprises.

   Elle s'adapte a l'edition servie : les verifications propres a la beta ou a
   la version finale ne tournent que dans la leur.
   ========================================================================== */
(async function verif26() {
  'use strict';

  const resultat = { reussies: 0, echecs: [], lignes: [] };
  const ecrire = t => { resultat.lignes.push(t); console.log(t); };
  const verifier = (nom, condition, detail) => {
    if (condition) { resultat.reussies++; ecrire('  ok    ' + nom); }
    else {
      const d = detail === undefined ? '' : ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail));
      resultat.echecs.push(nom + d); ecrire('  ÉCHEC ' + nom + d);
    }
  };
  const section = async (titre, f) => {
    ecrire('\n' + titre);
    try { await f(); }
    catch (e) { verifier(titre + ' : la section s\'est interrompue', false, String(e && e.stack || e).slice(0, 300)); }
  };
  const attendre = ms => new Promise(r => setTimeout(r, ms));

  /* --- La partie du joueur, mise de cote ---------------------------------- */
  const CLES = ['bradbitt.partie.v2', 'bradbitt.recompenses.v1', 'bradbitt.feel.v1',
                'bradbitt.courseauto.v1', 'bradbitt.mentions.v1'];
  const coffre = {};
  for (const c of CLES) { try { coffre[c] = localStorage.getItem(c); } catch (e) { coffre[c] = null; } }
  const volumes = { m: R.volMusique, e: R.volEffets };
  R.volEffets = 0;                       // la suite ne fait pas de bruit

  const erreurs = [];
  const surErreur = e => erreurs.push((e.message || 'erreur') + ' @' + String(e.filename || '').split('/').pop() + ':' + e.lineno);
  addEventListener('error', surErreur);

  /* --- Les outils ---------------------------------------------------------- */
  const appui = (code, key, repeat) =>
    auClavier({ code, key: key === undefined ? code : key, repeat: !!repeat, preventDefault() {} });
  const relache = (code, key) => auRelachement({ code, key: key === undefined ? code : key });

  // `s` secondes de JEU : soixante images par seconde, deux pas de simulation
  // par image, quelle que soit la cadence reelle de l'onglet.
  //
  // L'image dure un MILLIONIEME de milliseconde de plus que 1000/60. Sans ce
  // rien, « dernier + 16,666… − dernier » retombe, selon l'arrondi du moment,
  // juste au-dessus ou juste en dessous de deux pas : une image valait alors
  // tantot deux pas, tantot un seul, et une meme mesure donnait une seconde ou
  // deux d'une execution a l'autre. Constate en eprouvant cette suite contre
  // la version 0.25.
  const DUREE_IMAGE = 1000 / 60 + 1e-6;
  const avancer = (s, chaqueImage) => {
    const n = Math.round(s * 60);
    accumulateur = 0;
    let t = dernier;
    for (let i = 0; i < n; i++) {
      if (chaqueImage) chaqueImage(i);
      t += DUREE_IMAGE;
      imageDuJeu(t);
    }
    dernier = performance.now();
    accumulateur = 0;
  };

  // Pose Brad a la tuile donnee, SUR la premiere surface libre en partant du
  // haut : jamais dans un bloc (un tir de tourelle s'y eteindrait aussitot, et
  // la mesure ne vaudrait rien — c'est arrive).
  const poser = tuile => {
    brad.x = tuile * TUILE; brad.y = 15 * TUILE - brad.h;
    const dessous = solides.filter(s => brad.x + brad.w > s.x && brad.x < s.x + s.w).sort((a, b) => a.y - b.y);
    for (const s of dessous) {
      const essai = { x: brad.x, y: s.y - brad.h, w: brad.w, h: brad.h };
      if (essai.y >= 0 && !solides.some(o => chevauche(essai, o))) { brad.y = essai.y; break; }
    }
    brad.vx = 0; brad.vy = 0; brad.auSol = true;
    cam.x = Math.max(0, brad.x - 300);
    zoneAffichee = zoneDe(brad.x + brad.w / 2);
    transition.actif = false;
    pointSur.x = brad.x; pointSur.y = brad.y;
  };
  const niveau = (id, sansEnnemis) => {
    relancerNiveau(id); scene = 'jeu'; relacherTout();
    attaquePresseeCeTick = false; sautPresseCeTick = false;
    if (sansEnnemis) ennemis.length = 0;
  };
  // Un Serra-Lourd immobile et inoffensif : une cible qui ne fausse rien.
  const mannequin = dx => {
    const e = invoquer('Serra-Lourd', brad.x + dx, 15 * TUILE);
    e.t = Object.assign({}, e.t, { vitesse: 0, degats: 0 });
    e.pv = e.pvMax = 30;
    return e;
  };
  const partieNeuve = () => {
    effacerPartie();
    partie.termines = ['intro']; partie.hubVu = true; partie.difficulte = 'connaisseur';
    enregistrerPartie();
  };
  const dansLaBase = () => { entrerHub(false); avancer(0.1); };

  /* --- Mise en route : on passe l'accueil et les logos --------------------- */
  if (scene === 'accueil') lancerDemarrage();
  for (let i = 0; i < 300 && demarrage.finChargement < 0; i++) await attendre(100);
  for (let i = 0; i < 60 && (scene === 'logos' || scene === 'accueil'); i++) avancer(0.5);
  const incidentsAuDepart = incidents.nombre;

  ecrire('BRAD BITT — vérification du prototype 26 — édition ' + (BETA ? 'BÊTA' : 'FINALE'));

  /* ========================================================================= */
  await section('A. CHARGEMENT', async () => {
    verifier('le jeu est arrivé au menu', scene === 'menu', scene);
    verifier('version 0.26' + (BETA ? ' bêta' : ''), versionLisible() === '0.26' + (BETA ? ' bêta' : ''), versionLisible());
    verifier('les onze planches de Brad sont chargées',
             Object.keys(PLANCHES_UNIFORMES).every(c => planchesBrad[c]), Object.keys(planchesBrad).length);
    verifier('aucune erreur de script au chargement', erreurs.length === 0, erreurs);
  });

  /* ========================================================================= */
  await section('B. LA MUSIQUE DU MENU PRINCIPAL', async () => {
    const srcMenu = sourceMusique(PISTE_MENU);
    verifier('le fichier porte un nom sans majuscule ni espace', /^[a-z0-9-]+$/.test(PISTE_MENU), PISTE_MENU);
    verifier('la piste est préchargée avec le reste', audio.pistes.has(srcMenu), Array.from(audio.echecs));
    verifier('elle est demandée dès l\'ouverture du menu', audio.demandee === srcMenu, audio.demandee);
    const el = audio.pistes.get(srcMenu);
    verifier('elle est bien la piste en cours', !!el && audio.musique === el);
    verifier('elle dure plus de trois minutes (le bon fichier)', !!el && el.duration > 180, el && el.duration);
    partieNeuve(); dansLaBase();
    verifier('la base joue SA musique, pas celle du menu', audio.demandee === musiqueDeLaBase(), audio.demandee);
    appui('KeyP', 'p'); avancer(0.1);
    verifier('revenir au menu la relance', scene === 'menu' && audio.demandee === srcMenu, [scene, audio.demandee]);
    scene = 'options'; indexOptions = 0; retourOptions = 'menu'; avancer(0.2);
    verifier('elle continue dans les options ouvertes depuis le menu', audio.demandee === srcMenu);
    scene = 'menu';
    niveau('niveau1', true); commencerNiveau(); avancer(0.2);
    const duNiveau = audio.demandee;
    appui('KeyP', 'p'); appui('ArrowDown'); appui('ArrowDown'); appui('Enter'); avancer(0.2);
    verifier('les options ouvertes depuis la PAUSE gardent la musique du niveau',
             scene === 'options' && audio.demandee === duNiveau && duNiveau !== srcMenu, [scene, audio.demandee]);
    scene = 'jeu'; retourOptions = 'menu'; confirmation = null;
    retourAuMenu();
  });

  /* ========================================================================= */
  await section('C. LA BOULE DE SERRANO ET LA FRAPPE CHARGÉE', async () => {
    const lancer = (secrets, dureeAppui) => {
      partie.secrets = secrets.slice();
      niveau('niveau1', true); poser(5); boules.length = 0;
      brad.porte = true; brad.recharge = 0; brad.charge = 0;
      avancer(0.1);
      appui('KeyX', 'x'); avancer(dureeAppui); relache('KeyX', 'x'); avancer(0.1);
      return !brad.porte;
    };
    for (const [nom, secrets] of [['sans aptitude', []], ['avec la tourelle seule', ['tourelle']],
                                  ['avec la frappe chargée seule', ['frappe-chargee']],
                                  ['avec la tourelle ET la frappe chargée', ['tourelle', 'frappe-chargee']]]) {
      const r = [0.08, 0.3, 0.9].map(d => lancer(secrets, d));
      verifier('la boule part ' + nom + ' (appui bref, moyen, long)', r.every(Boolean), r);
    }
    partie.secrets = ['frappe-chargee'];
    niveau('niveau1', true); poser(5); brad.porte = null;
    avancer(0.1); appui('KeyX', 'x'); avancer(0.7); relache('KeyX', 'x'); avancer(0.05);
    verifier('sans boule, tenir 0,7 s donne toujours un coup chargé', brad.chargeTiree === true && brad.attaque > 0);
    niveau('niveau1', true); poser(5); brad.porte = null;
    avancer(0.1); appui('KeyX', 'x'); avancer(0.08); relache('KeyX', 'x'); avancer(0.03);
    verifier('un appui bref donne toujours un coup simple', brad.chargeTiree === false && brad.attaque > 0);
    niveau('niveau1', true); poser(5); brad.porte = null;
    avancer(0.1); appui('KeyX', 'x'); avancer(0.3); brad.porte = true; avancer(0.1); relache('KeyX', 'x'); avancer(0.1);
    verifier('une boule ramassée pendant une charge n\'est pas lancée par accident', brad.porte === true);
    partie.secrets = [];
  });

  /* ========================================================================= */
  await section('D. LE CHANGEMENT DE DÉCOR NE SE JOUE PLUS À L\'AVEUGLE', async () => {
    const traverser = (id, courir) => {
      const frontiere = NIVEAUX[id].zones[0].x1;
      partie.secrets = []; partie.permanents = []; partie.ameliorations = { vie: 0, degats: 0, resistance: 0 };
      niveau(id);
      ennemis = ennemis.filter(e => e.ancreX / TUILE >= frontiere);   // seule compte la garde d'APRES
      poser(frontiere - 3);
      appui('ArrowRight'); if (courir) appui('ShiftLeft', 'Shift');
      let n = 0;
      while (!transition.actif && scene === 'jeu' && n++ < 300) avancer(1 / 60);
      const x0 = brad.x, c0 = chrono, v0 = brad.vx;
      let images = 0;
      while (transition.actif && images < 300) { avancer(1 / 60); images++; }
      const devant = ennemis.filter(e => e.etat !== 'mort' && e.x > brad.x).map(e => (e.x - brad.x) / TUILE).sort((a, b) => a - b)[0];
      const r = { declenche: n < 300, tuiles: (brad.x - x0) / TUILE, chrono: chrono - c0, duree: images / 60,
                  pv: brad.pv, pvMax: brad.pvMax, vitesse: brad.vx, vitesseAvant: v0, premierEnnemi: devant };
      relacherTout();
      return r;
    };
    const ids = ORDRE_NIVEAUX.filter(id => niveauDansEdition(id) && NIVEAUX[id].zones.length > 1);
    /* La tolerance vaut UN pas de simulation, pas zero. La suite avance par
       images de deux pas : si le fondu s'acheve sur le premier, le second est
       deja du jeu normal, et Brad y fait ses deux pixels (250 px/s pendant
       1/120 s). C'est la mesure qui deborde d'un pas, pas le fondu — vu sur le
       niveau 5 a la premiere execution en edition finale. Avant correction,
       la meme mesure donnait 8 a 10 TUILES. */
    const unPas = R.vitesseCourse * PAS / TUILE + 0.001;
    for (const id of ids) {
      const r = traverser(id, true);
      verifier(id + ' : Brad ne bouge pas pendant le fondu (en courant)',
               r.declenche && Math.abs(r.tuiles) <= unPas && r.chrono <= PAS + 1e-9, r);
      verifier(id + ' : aucun point de vie perdu à la fin du fondu, élan conservé',
               r.pv === r.pvMax && Math.abs(r.vitesse - r.vitesseAvant) < 1, r);
    }
    const g = traverser('niveau1', false);
    verifier('le fondu dure une seconde', Math.abs(g.duree - 1) < 0.05, g.duree);
    verifier('niveau 1 : le premier Serra de la grotte est à plus de 8 tuiles à la reprise',
             g.premierEnnemi > 8, g.premierEnnemi);
  });

  /* ========================================================================= */
  await section('E. LA BORNE D\'ARCADE NE RELANCE PLUS TOUTE SEULE', async () => {
    partieNeuve(); dansLaBase();
    ouvrirPoste('arcade');
    verifier('trois jetons, « Insérer un jeton » choisi', partiesArcadeRestantes() === 3 && arcade.choix === 0);
    appui('ArrowRight'); const c1 = arcade.choix; appui('ArrowLeft');
    verifier('les flèches passent de « Jouer » à « Sortir » et retour', c1 === 1 && arcade.choix === 0, [c1, arcade.choix]);
    appui('Enter'); avancer(0.2);
    verifier('Entrée démarre la partie et prend un jeton', arcade.etat === 'jeu' && partiesArcadeRestantes() === 2);
    // Le joueur tire, Espace enfoncee : le navigateur repete la touche.
    appui('Space', ' '); arcade.score = 250;
    avancer(0.3, () => appui('Space', ' ', true));
    finirArcade('Brad a pris trop de Serrano.');
    verifier('à la défaite, l\'écran se verrouille ' + ARC.verrouFin + ' s', arcade.etat === 'fini' && Math.abs(arcade.verrou - ARC.verrouFin) < 0.01, arcade.verrou);
    relache('Space', ' '); appui('Space', ' '); appui('Enter'); activerZone({ action: 'arcade-start' });
    avancer(0.5, () => appui('Space', ' ', true));
    const zonesVerrou = zones.filter(z => z.action === 'arcade-start' || z.action === 'fermer-poste').length;
    verifier('pendant le verrou : ni appui neuf, ni Entrée, ni clic ne relancent',
             arcade.etat === 'fini' && partiesArcadeRestantes() === 2, [arcade.etat, partiesArcadeRestantes()]);
    verifier('pendant le verrou : aucun bouton n\'est cliquable', zonesVerrou === 0, zonesVerrou);
    avancer(ARC.verrouFin + 1, () => appui('Space', ' ', true));
    verifier('verrou fini, Espace TOUJOURS tenue : toujours rien', arcade.verrou === 0 && arcade.etat === 'fini' && partiesArcadeRestantes() === 2);
    verifier('le score et les Brad Coins sont restés affichés', arcade.score === 250 && arcade.bcGagnes === 2);
    relache('Space', ' '); avancer(0.1);
    verifier('les deux boutons redeviennent cliquables',
             zones.filter(z => z.action === 'arcade-start' || z.action === 'fermer-poste').length === 2);
    appui('ArrowRight'); appui('Enter'); avancer(0.1);
    verifier('→ puis Entrée : on sort au clavier, sans Échap', scene === 'hub' && partiesArcadeRestantes() === 2, scene);
    ouvrirPoste('arcade'); appui('Enter'); avancer(0.1); finirArcade('test'); avancer(ARC.verrouFin + 0.2);
    appui('Space', ' '); avancer(0.1); relache('Space', ' ');
    verifier('après le verrou, un appui NEUF sur « Rejouer » relance bien', arcade.etat === 'jeu' && partiesArcadeRestantes() === 0);
    finirArcade('fin'); avancer(ARC.verrouFin + 0.2);
    verifier('sans jeton, « Sortir » est choisi d\'office', arcade.choix === 1);
    appui('Enter'); avancer(0.1);
    verifier('et Entrée sort', scene === 'hub', scene);
  });

  /* ========================================================================= */
  await section('F. LA CONFIRMATION D\'ACHAT, AUX FLÈCHES', async () => {
    partieNeuve(); partie.pieces = 100; dansLaBase();
    ouvrirPoste('boutique'); ongletBoutique = 1;
    indexBoutique = PERMANENTS.findIndex(p => p.cle === 'regeneration');
    appui('Enter');
    verifier('Entrée sur un article pose la question, « Affirmatif » choisi', !!confirmation && confirmation.choix === 0);
    appui('ArrowRight');
    verifier('→ passe sur « Tout compte fait, non »', confirmation && confirmation.choix === 1);
    const index = indexBoutique, onglet = ongletBoutique;
    appui('ArrowDown'); appui('ArrowUp'); appui('ArrowRight'); appui('ArrowRight');
    verifier('les flèches ne déplacent pas la boutique derrière la question', indexBoutique === index && ongletBoutique === onglet);
    verifier('deux flèches de plus : retour sur « non »', confirmation && confirmation.choix === 1);
    appui('Enter');
    verifier('Entrée sur « non » n\'achète rien', !confirmation && !aPermanent('regeneration') && partie.pieces === 100, partie.pieces);
    appui('Enter'); appui('ArrowRight'); appui('ArrowLeft'); appui('Enter');
    verifier('← puis Entrée sur « Affirmatif » achète (30 Brad Coins)', aPermanent('regeneration') && partie.pieces === 70, partie.pieces);
    indexBoutique = PERMANENTS.findIndex(p => p.cle === 'aimant'); appui('Enter'); appui('Escape');
    verifier('Échap vaut toujours « non »', !confirmation && !aPermanent('aimant') && scene === 'boutique');
    rendu();
    const lignesMax = Math.max.apply(null, PERMANENTS.concat(SECRETS, AMELIORATIONS).map(a => {
      ctx.font = '12px system-ui, sans-serif';
      return lignesDe('Es-tu sûr de vouloir passer la transaction ? « ' + a.nom + ' » pour 30 Brad Coins secrets. ' + a.phrase, 368).length;
    }));
    verifier('la boîte grandit avec son texte (jusqu\'à ' + lignesMax + ' lignes ici) sans sortir de l\'écran',
             48 + lignesMax * 17 + 64 <= HAUTEUR - 20, lignesMax);
    fermerPoste();
    // Une touche TENUE ne valide rien.
    partie.pieces = 500; const avant = JSON.stringify([partie.ameliorations, partie.permanents]);
    ouvrirPoste('boutique'); for (let i = 0; i < 40; i++) appui('Space', ' ', true);
    verifier('Espace tenue en entrant dans la boutique n\'achète rien',
             JSON.stringify([partie.ameliorations, partie.permanents]) === avant && !confirmation);
    fermerPoste();
  });

  /* ========================================================================= */
  await section('G. « SORTIR » AU CLAVIER, DANS CHAQUE PANNEAU', async () => {
    partieNeuve(); partie.secretsVus = true; dansLaBase();
    for (let onglet = 0; onglet < 3; onglet++) {
      ouvrirPoste('boutique'); ongletBoutique = onglet;
      const n = articlesBoutique().length;
      for (let i = 0; i < n; i++) appui('ArrowDown');
      const f = focusSortir; rendu(); appui('Enter'); avancer(0.05);
      verifier('boutique, onglet ' + (onglet + 1) + ' (' + n + ' articles) : ↓ jusqu\'à « Sortir », Entrée sort', f && scene === 'hub', [f, scene]);
      ctx.font = '9px system-ui, sans-serif';
      verifier('boutique, onglet ' + (onglet + 1) + ' : la liste tient au-dessus de la ligne d\'aide',
               BOUTIQUE_Y0 + n * pasBoutique(n) <= HAUTEUR - 46, [n, pasBoutique(n)]);
    }
    ouvrirPoste('boutique'); appui('ArrowUp');
    verifier('boutique : ↑ depuis le premier article va aussi sur « Sortir »', focusSortir === true);
    appui('ArrowDown');
    verifier('boutique : ↓ depuis « Sortir » revient au premier article', !focusSortir && indexBoutique === 0);
    fermerPoste();

    ouvrirPoste('vestiaire'); appui('ArrowDown'); const v1 = focusSortir; appui('ArrowDown'); const v2 = focusSortir;
    appui('ArrowUp'); const v3 = focusSortir; appui('ArrowDown'); appui('Enter'); avancer(0.05);
    verifier('vestiaire : ↓ ↓ atteint « Sortir », ↑ en revient, Entrée sort', !v1 && v2 && !v3 && scene === 'hub', [v1, v2, v3, scene]);

    ouvrirPoste('carte'); for (let i = 0; i < ORDRE_NIVEAUX.length; i++) appui('ArrowDown');
    const fc = focusSortir, avantNiveau = niveauCourant; appui('Enter'); avancer(0.05);
    verifier('carte : ↓ jusqu\'à « Sortir », Entrée sort sans lancer de niveau', fc && scene === 'hub' && niveauCourant === avantNiveau, [fc, scene]);

    ouvrirPoste('jukebox'); for (let i = 0; i < PISTES_JUKEBOX.length; i++) appui('ArrowDown');
    const fj = focusSortir; appui('Enter'); avancer(0.05);
    verifier('jukebox, musiques : ↓ jusqu\'à « Sortir », Entrée sort', fj && scene === 'hub', [fj, scene]);
    ouvrirPoste('jukebox'); appui('ArrowRight'); appui('ArrowDown'); const fk = focusSortir;
    appui('KeyC', 'c'); const retour = !focusSortir && jukebox.saisie === 'C';
    appui('ArrowDown'); appui('Enter'); avancer(0.05);
    verifier('jukebox, code : ↓ va sur « Sortir », une lettre revient au champ, Entrée sort', fk && retour && scene === 'hub', [fk, retour, scene]);

    relancerNiveau('niveau1'); scene = 'jeu'; ennemis.length = 0; poser(5); brad.invincible = 0; brad.pv = 1;
    blesserBrad(5, brad.x - 50, 'Serra'); avancer(0.1);
    appui('ArrowDown'); const cm = choixMort; appui('Enter'); avancer(0.1);
    verifier('écran de mort : ↓ choisit « Retour à la base », Entrée y va', cm === 1 && scene === 'hub', [cm, scene]);

    ouvrirPoste('carte'); indexCarte = 1; appui('Enter'); avancer(0.05);
    const sp = scene; appui('ArrowDown'); const cp = choixPret; appui('Enter'); avancer(0.1);
    verifier('écran d\'avant-niveau : ↓ choisit « Retour à la base », Entrée y va', sp === 'pret' && cp === 1 && scene === 'hub', [sp, cp, scene]);

    retourAuMenu(); ouvrirChoixDifficulte();
    appui('ArrowDown'); const rd = retourDifficulte; appui('Enter'); avancer(0.05);
    verifier('choix de difficulté : ↓ choisit « Retour », Entrée revient au menu sans rien effacer',
             rd && scene === 'menu' && partie.termines.length === 1, [rd, scene]);

    if (BETA) {
      indexMenu = 0; appui('Enter'); avancer(0.05);
      const sa = scene; appui('ArrowRight'); const ca = avisBeta.choix; appui('Enter'); avancer(0.05);
      verifier('avertissement de la bêta : → choisit « Retour », Entrée revient au menu', sa === 'avisbeta' && ca === 1 && scene === 'menu', [sa, ca, scene]);
    }
  });

  /* ========================================================================= */
  await section('H. LA TOUCHE P, À LA PLACE D\'ÉCHAP', async () => {
    partieNeuve();
    niveau('niveau1', true); poser(5); avancer(0.1);
    appui('KeyP', 'p'); const p1 = scene; appui('KeyP', 'p');
    verifier('en jeu : P ouvre la pause, P la referme', p1 === 'pause' && scene === 'jeu', [p1, scene]);
    let fini = false;
    lancerDialogue(DIALOGUE_INTRO, () => { fini = true; }); avancer(0.3);
    const sd = scene; appui('KeyP', 'p'); avancer(0.2);
    verifier('dans un dialogue : P passe', sd === 'dialogue' && fini, [sd, fini]);
    dansLaBase(); appui('KeyP', 'p'); avancer(0.1);
    verifier('dans la base : P renvoie au menu principal', scene === 'menu', scene);
    dansLaBase(); rendu();
    verifier('dans la base : le rappel « Menu principal » est à l\'écran et se touche',
             zones.some(z => z.action === 'hub-menu'));
    ouvrirPoste('jukebox'); appui('ArrowRight'); appui('KeyP', 'p');
    verifier('dans un champ de saisie, P reste une lettre', scene === 'jukebox' && jukebox.saisie === 'P', [scene, jukebox.saisie]);
    fermerPoste();
    verifier('l\'écran Contrôles annonce P', CLAVIER_LEGENDE.some(l => /P/.test(l.geste) && /pause/i.test(l.role)));
    relancerNiveau('intro'); scene = 'jeu'; ennemis.length = 0; partie.termines = []; poser(5);
    brad.invincible = 0; brad.pv = 1; blesserBrad(5, brad.x - 50, 'Serra'); avancer(0.1);
    appui('Escape'); avancer(0.1);
    verifier('pendant l\'introduction, Échap sur l\'écran de mort ne mène pas à une base qui n\'existe pas', scene === 'mort', scene);
    appui('Enter'); avancer(0.1);
  });

  /* ========================================================================= */
  await section('I. LE BONUS PERMANENT DE RÉGÉNÉRATION', async () => {
    const regen = PERMANENTS.find(p => p.cle === 'regeneration');
    verifier('il existe, à 30 Brad Coins', !!regen && regen.cout === 30, regen && regen.cout);
    verifier('la boutique annonce le rythme réellement appliqué', regen && regen.detail.indexOf(String(REGEN_PERIODE)) >= 0, regen && regen.detail);
    ctx.font = '9px system-ui, sans-serif';
    verifier('sa description tient sur sa ligne', regen && ctx.measureText(regen.detail).width <= largeurDetail(false));
    partieNeuve(); partie.ameliorations = { vie: 0, degats: 0, resistance: 0 };
    niveau('niveau1', true); poser(5);
    brad.pv = 4; avancer(30);
    verifier('sans le bonus, rien ne remonte (30 s)', brad.pv === 4, brad.pv);
    partie.permanents = ['regeneration']; brad.pv = 4; brad.regen = 0;
    const gains = []; let pv = brad.pv, c0 = chrono;
    avancer(40, () => { if (brad.pv !== pv) { gains.push(Math.round((chrono - c0) * 10) / 10); pv = brad.pv; } });
    verifier('avec le bonus : +1 PV à 12, 24 et 36 s', gains.join() === [REGEN_PERIODE, 2 * REGEN_PERIODE, 3 * REGEN_PERIODE].join() && brad.pv === 7, gains);
    brad.pv = 5; brad.regen = 0; avancer(10); const jauge = brad.regen;
    brad.invincible = 0; blesserBrad(1, brad.x - 50, 'Serra');
    const apres = brad.regen; c0 = chrono; pv = brad.pv; let tGain = null;
    avancer(14, () => { if (tGain === null && brad.pv > pv) tGain = Math.round((chrono - c0) * 10) / 10; });
    verifier('un coup encaissé remet le compteur à zéro', jauge > 9.9 && apres === 0 && tGain === REGEN_PERIODE, [jauge, apres, tGain]);
    brad.pv = brad.pvMax; brad.regen = 0; avancer(15);
    verifier('barre pleine : rien ne s\'accumule', brad.pv === brad.pvMax && brad.regen === 0, brad.regen);
    poser(5); brad.invincible = 0; brad.pv = 1; blesserBrad(5, brad.x - 50, 'Serra'); avancer(20);
    verifier('elle ne ressuscite pas', scene === 'mort' && brad.pv === 0, [scene, brad.pv]);
    appui('Enter'); avancer(0.1);
    // La sauvegarde la retient.
    enregistrerPartie(); partie.permanents = []; chargerPartie();
    verifier('la sauvegarde retient l\'achat', aPermanent('regeneration'));
    partie.permanents = [];
  });

  /* ========================================================================= */
  await section('J. LA TOURELLE, BROUILLÉE PAR LES GARDIENS', async () => {
    const fiche = SECRETS.find(s => s.cle === 'tourelle');
    verifier('la boutique prévient AVANT l\'achat', /gardien/i.test(fiche.detail) && /gardien|boss/i.test(fiche.phrase), fiche.detail);
    ctx.font = '9px system-ui, sans-serif';
    verifier('la fiche tient sur sa ligne', ctx.measureText(fiche.detail).width <= largeurDetail(false), ctx.measureText(fiche.detail).width);
    const idBoss = ORDRE_NIVEAUX.find(id => niveauDansEdition(id) && NIVEAUX[id].arene && (NIVEAUX[id].arene.genre || 'blindage') === 'blindage');
    partieNeuve(); partie.secrets = ['tourelle']; partie.ameliorations = { vie: 5, degats: 0, resistance: 0 };
    const vus = new WeakSet();
    const jouer = (s, f) => { let emis = 0; avancer(s, () => { brad.invincible = 5; brad.pv = brad.pvMax; if (f) f();
      for (const b of boules) if (b.tourelle && !vus.has(b)) { vus.add(b); emis++; } }); return emis; };
    niveau(idBoss, true);
    const d = NIVEAUX[idBoss].arene;
    poser(d.x1 + 12); avancer(0.5, () => { brad.invincible = 5; });
    const boss = arene.boss;
    verifier('en entrant dans l\'arène, la tourelle se déclare brouillée',
             arene.active && tourelle.active && tourelle.brouillee === true, [arene.active, tourelle.active, tourelle.brouillee]);
    boss.t = Object.assign({}, boss.t, { vitesse: 0, degats: 0 });
    const pv0 = boss.pv;
    let n = jouer(8, () => { boss.x = brad.x + 100; });
    verifier('huit secondes, le gardien à 100 px : aucun tir, aucun dégât', n === 0 && boss.pv === pv0, [n, boss.pv, pv0]);
    rendu();
    boss.pv = Math.floor(boss.pvMax * 0.7); jouer(0.3);
    const renforts = arene.sbires.length; arene.sbires.forEach(s => { s.t = Object.assign({}, s.t, { degats: 0 }); });
    n = jouer(8, () => { boss.x = brad.x + 100; });
    verifier('phase blindée : les ' + renforts + ' renforts restent au joueur (aucun tir en 8 s)',
             renforts > 0 && n === 0 && arene.sbires.filter(s => s.etat !== 'mort').length === renforts, [renforts, n]);
    arene.sbires.forEach(s => tuerEnnemi(s)); jouer(0.5);
    boss.blinde = false; arene.blinde = false; boss.pv = 1; blesserEnnemi(boss, 5, 1); jouer(0.2);
    verifier('le gardien tombe : la tourelle est rétablie', boss.etat === 'mort' && arene.finie && tourelle.brouillee === false);
    jouer(1.2); ennemis = ennemis.filter(e => e.etat !== 'mort');
    poser(d.x1 + 12); const m = mannequin(120);
    n = jouer(6);
    verifier('et elle tire de nouveau, à sa cadence (un tir toutes les ' + TOURELLE_CADENCE + ' s)', n >= 3 && n <= 5 && m.pv < 30, [n, m.pv]);
    partie.secrets = [];
    niveau(idBoss, true); poser(d.x1 + 12); avancer(0.5, () => { brad.invincible = 5; });
    verifier('sans tourelle, rien ne change : pas de tourelle, pas de message', !tourelle.active && !tourelle.brouillee);
  });

  /* ========================================================================= */
  await section('K. LA CRAVATE VERTE : CINQ NIVEAUX', async () => {
    const verte = UNIFORMES.find(u => u.cle === 'classique-vert');
    verifier('la condition est « cinq niveaux terminés »', verte.condition === 'niveaux>=5' && /cinq/.test(verte.detail), verte.condition);
    partieNeuve();
    const avec = n => { partie.termines = ORDRE_NIVEAUX.slice(0, n); return uniformeDebloque(verte); };
    if (BETA) {
      verifier('en bêta elle reste « à la sortie », quel que soit le nombre de niveaux', !avec(2) && !avec(5) && !avec(11));
      verifier('et le vestiaire le dit', detailUniforme(verte) === A_LA_SORTIE);
    } else {
      verifier('verrouillée à 0, 1, 2 et 4 niveaux', !avec(0) && !avec(1) && !avec(2) && !avec(4));
      verifier('ouverte à 5 niveaux, et au-delà', avec(5) && avec(11));
      partie.termines = ORDRE_NIVEAUX.slice(0, 4);
      niveau(ORDRE_NIVEAUX[4], true);
      const avant = uniformeDebloque(verte); terminerNiveau();
      verifier('terminer un cinquième niveau la débloque pour de bon', !avant && uniformeDebloque(verte) && partie.termines.length === 5);
      rentrerALaBase(); avancer(0.1);
    }
    partie.termines = ['intro'];
    verifier('la cravate bleue, elle, tombe toujours au premier niveau' + (BETA ? ' (hors bêta : à la sortie)' : ''),
             BETA ? !uniformeDebloque(UNIFORMES.find(u => u.cle === 'classique-bleu'))
                  : uniformeDebloque(UNIFORMES.find(u => u.cle === 'classique-bleu')));
  });

  /* ========================================================================= */
  await section('L. LES DEUX PHRASES DU JUKEBOX', async () => {
    const core = PISTES_JUKEBOX.find(p => p.code === 'CORE'), n2s3 = PISTES_JUKEBOX.find(p => p.code === 'N2S3');
    verifier('CORE', core.detail === 'Un jour, ça sera sur grand écran. Enfin je l\'espère.', core.detail);
    verifier('N2S3', n2s3.detail === 'Musique présente lors de la (tentative) de capture de Kirby 67 sur Lille.', n2s3.detail);
    ctx.font = 'italic 10px system-ui, sans-serif';
    verifier('chacune tient dans sa bande (deux lignes au plus)',
             [core, n2s3].every(p => lignesDe(p.detail, LARGEUR - 112).length <= 2));
    partieNeuve(); dansLaBase(); ouvrirPoste('jukebox'); jukebox.index = PISTES_JUKEBOX.indexOf(core); rendu();
    verifier('verrouillé, un morceau ne dit toujours rien de lui', !pisteDebloquee(core));
    fermerPoste();
  });

  /* ========================================================================= */
  await section('M. LE SKIN « BÊTA-TESTEUR » N\'A PLUS DE TACHES NOIRES', async () => {
    // Le meme compte que tools/beta_brad.py, refait ici sur la planche CHARGEE
    // par le jeu : c'est ce fichier-la que le joueur voit.
    const compter = img => {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, w = c.width, h = c.height;
      const vide = (x, y) => d[(y * w + x) * 4 + 3] === 0;
      const dist = new Int32Array(w * h).fill(1e6), file = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (vide(x, y)) { dist[y * w + x] = 0; file.push(x, y); }
      for (let i = 0; i < file.length; i += 2) {
        const x = file[i], y = file[i + 1];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (dist[ny * w + nx] > dist[y * w + x] + 1) { dist[ny * w + nx] = dist[y * w + x] + 1; file.push(nx, ny); }
        }
      }
      let taches = 0, cellules = new Set();
      for (let y = 0; y < h; y++) {
        const ly = y % 48; if (ly < 24 || ly >= 44) continue;
        for (let x = 0; x < w; x++) {
          const lx = x % 36, bord = Math.min(lx + 1, 36 - lx, ly + 1, 48 - ly);
          if (vide(x, y) || Math.min(dist[y * w + x], bord) <= 2) continue;
          const r = d[(y * w + x) * 4], v = d[(y * w + x) * 4 + 1], b = d[(y * w + x) * 4 + 2];
          if ((r + v + b) / 3 < 30 && Math.max(r, v, b) - Math.min(r, v, b) < 24) { taches++; cellules.add(Math.floor(x / 36) + ',' + Math.floor(y / 48)); }
        }
      }
      return { taches, cellules: cellules.size };
    };
    const skin = compter(planchesBrad['beta-testeur']), base = compter(planchesBrad['classique']);
    verifier('aucun pixel noir à l\'intérieur du corps, sur les douze images', skin.taches === 0, skin);
    verifier('(le compte sait en voir : le costume noir d\'origine en a ' + base.taches + ')', base.taches > 300, base);
    const c = document.createElement('canvas'); c.width = 144; c.height = 144; const g = c.getContext('2d');
    g.drawImage(planchesBrad['beta-testeur'], 0, 0); const a = g.getImageData(0, 0, 144, 144).data;
    g.clearRect(0, 0, 144, 144); g.drawImage(planchesBrad['classique'], 0, 0); const o = g.getImageData(0, 0, 144, 144).data;
    let ecarts = 0, repeints = 0;
    for (let y = 0; y < 144; y++) for (let x = 0; x < 144; x++) {
      const i = (y * 144 + x) * 4, memes = a[i] === o[i] && a[i + 1] === o[i + 1] && a[i + 2] === o[i + 2] && a[i + 3] === o[i + 3];
      if (y % 48 < 24 || y % 48 >= 44) { if (!memes) ecarts++; } else if (!memes) repeints++;
    }
    verifier('la tête, le cou et les chaussures sont ceux de Brad, au pixel près', ecarts === 0, ecarts);
    verifier('le costume, lui, est bien repeint (' + repeints + ' pixels)', repeints > 2000, repeints);
    verifier('même silhouette : la planche garde ses 144 × 144 pixels', planchesBrad['beta-testeur'].width === 144 && planchesBrad['beta-testeur'].height === 144);
  });

  /* ========================================================================= */
  await section('N. UN RALENTISSEMENT NE SE RATTRAPE PLUS EN ACCÉLÉRÉ', async () => {
    partieNeuve(); niveau('niveau1', true); poser(5);
    let c0 = chrono; avancer(1);
    verifier('repère : une seconde fluide = une seconde de jeu', Math.abs(chrono - c0 - 1) < 0.02, chrono - c0);
    // Dix secondes a deux images par seconde, comme un onglet relegue en arriere-plan.
    accumulateur = 0; let t = dernier; c0 = chrono;
    for (let i = 0; i < 20; i++) { t += 500; imageDuJeu(t); }
    const ralenti = chrono - c0, reserve = accumulateur;
    verifier('à 2 images/s le jeu ralentit, il ne s\'emballe pas', ralenti < 2, ralenti);
    verifier('aucun retard n\'est mis en réserve', reserve < PAS, reserve);
    c0 = chrono; for (let i = 0; i < 60; i++) { t += DUREE_IMAGE; imageDuJeu(t); }
    verifier('la seconde fluide qui suit dure une seconde (elle en durait quatre)', Math.abs(chrono - c0 - 1) < 0.05, chrono - c0);
    dernier = performance.now(); accumulateur = 0;
  });

  /* ========================================================================= */
  await section('O. BALAYAGE : TOUS LES NIVEAUX, TOUS LES ÉCRANS', async () => {
    partieNeuve();
    partie.secrets = SECRETS.map(s => s.cle); partie.permanents = PERMANENTS.map(p => p.cle);
    partie.ameliorations = { vie: 5, degats: 10, resistance: 10 };
    const ids = ORDRE_NIVEAUX.filter(niveauDansEdition).concat(['entrainement']);
    for (const id of ids) {
      const i0 = incidents.nombre; let fondus = 0, enFondu = false, xMax = 0;
      niveau(id); appui('ArrowRight'); appui('ShiftLeft', 'Shift');
      avancer(25, i => {
        if (scene === 'mort') { relancerApresMort(); appui('ArrowRight'); appui('ShiftLeft', 'Shift'); }
        if (scene !== 'jeu') return;
        if (i % 37 === 0) appui('Space', ' '); if (i % 37 === 12) relache('Space', ' ');
        if (i % 23 === 0) appui('KeyX', 'x'); if (i % 23 === 4) relache('KeyX', 'x');
        if (i % 211 === 0) { appui('KeyC', 'c'); relache('KeyC', 'c'); }
        if (transition.actif && !enFondu) fondus++; enFondu = transition.actif;
        xMax = Math.max(xMax, brad.x);
      });
      relacherTout();
      verifier(id + ' : 25 s de robot, toutes aptitudes achetées, sans incident (tuile ' + Math.round(xMax / TUILE) + ', ' + fondus + ' fondu' + (fondus > 1 ? 's' : '') + ')',
               incidents.nombre === i0, incidents.dernier.slice(0, 200));
    }
    partie.secrets = []; partie.permanents = []; partie.pieces = 500; partie.piecesSecretes = 9; partie.secretsVus = true;
    partie.termines = ORDRE_NIVEAUX.filter(niveauDansEdition);
    const i0 = incidents.nombre; const vus = [];
    const voir = (nom, ouvrir, fermer) => { ouvrir(); avancer(1); vus.push(nom + ':' + scene); if (fermer) fermer(); avancer(0.2); };
    retourAuMenu();
    voir('options', () => { scene = 'options'; indexOptions = 0; retourOptions = 'menu'; }, () => { scene = 'menu'; });
    voir('contrôles', () => { scene = 'options'; ouvrirControles(); }, () => { appui('Enter'); scene = 'menu'; });
    voir('conditions', () => ouvrirMentions('options'), () => { appui('ArrowDown'); appui('Enter'); scene = 'menu'; });
    voir('crédits', () => { scene = 'credits'; }, () => appui('Enter'));
    voir('base', () => entrerHub(false), null);
    for (const poste of ['boutique', 'vestiaire', 'carte', 'jukebox', 'arcade']) {
      voir(poste, () => { scene = 'hub'; ouvrirPoste(poste); }, () => fermerPoste());
    }
    voir('achat', () => { ouvrirPoste('boutique'); appui('Enter'); avancer(0.2); appui('Enter'); }, () => fermerPoste());
    voir('pause', () => { niveau('niveau2'); avancer(0.3); appui('KeyP', 'p'); }, () => appui('KeyP', 'p'));
    voir('fin de niveau', () => { niveau('niveau2'); terminerNiveau(); }, () => { scene = 'hub'; });
    if (!BETA) {
      voir('combat final', () => { demarrerCombatFinal(true); avancer(8); }, () => { audio.arreterMusique(0); entrerHub(false); });
      voir('générique', () => { lancerGenerique(); avancer(4); }, () => quitterGenerique('menu'));
    }
    voir('bande-annonce', () => { lancerBandeAnnonce(); avancer(7); }, () => appui('Enter'));
    retourAuMenu(); avancer(0.5);
    verifier(vus.length + ' écrans ouverts, animés une seconde et refermés sans incident', incidents.nombre === i0, incidents.dernier.slice(0, 200));
  });

  /* ========================================================================= */
  ecrire('\nP. EN SORTANT');
  verifier('aucun incident d\'image pendant toute la suite', incidents.nombre === incidentsAuDepart, incidents.dernier.slice(0, 300));
  verifier('aucune erreur de script', erreurs.length === 0, erreurs.slice(0, 3));

  /* --- On rend au joueur ce qui est a lui ---------------------------------- */
  removeEventListener('error', surErreur);
  relacherTout(); confirmation = null; focusSortir = false;
  // D'abord la memoire, ENSUITE le stockage : effacerPartie() vide aussi la
  // clef de sauvegarde, et l'appeler apres l'avoir remise l'effacerait.
  effacerPartie();
  for (const c of CLES) {
    try { if (coffre[c] === null) localStorage.removeItem(c); else localStorage.setItem(c, coffre[c]); } catch (e) { /* navigation privee */ }
  }
  chargerPartie();
  R.volMusique = volumes.m; R.volEffets = volumes.e;
  appliquerUniforme(partie.uniforme);
  retourAuMenu();
  dernier = performance.now(); accumulateur = 0;
  let rendue = true;
  for (const c of CLES) { try { if (localStorage.getItem(c) !== coffre[c]) rendue = false; } catch (e) { /* idem */ } }
  verifier('la partie du joueur est remise exactement comme elle était', rendue);

  ecrire('\n================================');
  ecrire(resultat.reussies + ' vérifications réussies, ' + resultat.echecs.length + ' échec(s) — édition ' + (BETA ? 'bêta' : 'finale') + '.');
  for (const e of resultat.echecs) ecrire('  - ' + e);
  window.__verif26 = resultat;
  return resultat;
})();
