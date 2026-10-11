/* =============================================================================
   BRAD BITT — la suite de verification qui tourne DANS LE NAVIGATEUR

   Nee au prototype 26 (sections A a O), etendue au prototype 27 (P a U) puis
   au prototype 28 (W a Z : le compte a rebours — elles passent en premier). Elle
   s'appelait tools/verif-26.js : un nom de prototype sur une suite qui vit
   au-dela du prototype, c'etait un nom qui allait mentir.

   Les suites tools/verif.mjs et tools/verif-beta.mjs ont besoin de Node et de
   Playwright. Celle-ci n'a besoin de rien : elle tourne dans la page du jeu
   lui-meme, sur n'importe quelle machine qui sait ouvrir le jeu.

   LANCER
     1. python3 tools/serveur.py            (ou --edition finale)
     2. ouvrir http://localhost:8126/ — inutile de cliquer sur « Jouer », ni
        d'avoir un code : la suite passe le compte a rebours par l'interieur
     3. dans la console du navigateur :
          var s = document.createElement('script'); s.src = 'tools/verif-navigateur.js';
          document.head.appendChild(s);
     Le bilan s'ecrit dans la console et reste dans `window.__verif`.

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
(async function verifNavigateur() {
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
  // L'appui REND l'evenement : `defaut` dit si le jeu a laisse au navigateur
  // l'action par defaut de la touche, ou s'il l'a annulee.
  const appui = (code, key, repeat, extra) => {
    const ev = Object.assign({ code, key: key === undefined ? code : key, repeat: !!repeat,
                               defaut: true, preventDefault() { this.defaut = false; } }, extra || {});
    auClavier(ev);
    return ev;
  };
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

  /* =========================================================================
     LE COMPTE A REBOURS (prototype 28) — sections W a Z. ELLES PASSENT EN
     PREMIER : ce qu'elles verifient d'abord, c'est qu'avant l'heure rien du
     jeu n'a demarre ni ete telecharge. Une fois le jeu ouvert pour les
     sections A a V, ce n'est plus mesurable.

     Elles ne dependent pas de la date du jour : elles posent leur propre heure
     d'ouverture (dans quarante-sept jours) et remettent la vraie en sortant.
     Apres le 27 novembre 2026 elles tournent donc toujours.

     AUCUN CODE N'EST ECRIT ICI. Ce dossier est publie avec le jeu : un code
     ecrit dans un fichier de test est un code publie. Les deux codes d'essai
     de la section X sont inventes, et leur empreinte n'est dans la table que
     le temps de cette section. La section X verifie d'ailleurs qu'aucun
     fichier publie ne contient un mot dont l'empreinte est dans la table —
     celui-ci compris.
  ========================================================================= */
  const aLeCompte = typeof compte !== 'undefined' && typeof COMPTE !== 'undefined';
  const ouvertureVraie = aLeCompte ? COMPTE.ouverture : 0;
  const dateVraie = Date.now;
  const JOUR = 86400e3;
  const pistesAuDepart = audio.pistes.size;
  const dejaPassee = !!window.__verif;       // la suite a deja tourne dans cette page

  // De VRAIS evenements de pointeur, envoyes au canvas : ils passent par tous
  // les ecouteurs du jeu, comme un doigt ou une souris.
  const pointeur = (type, x, y) => {
    const r = canvas.getBoundingClientRect();
    canvas.dispatchEvent(new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 1,
      clientX: r.left + x * r.width / LARGEUR, clientY: r.top + y * r.height / HAUTEUR }));
  };
  const clic = (x, y) => { pointeur('pointerdown', x, y); dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); };
  const clicZone = z => clic(z.x + z.w / 2, z.y + z.h / 2);
  const taper = texte => { for (const c of texte) appui(/[0-9]/.test(c) ? 'Digit' + c : 'Key' + c.toUpperCase(), c.toLowerCase()); };

  // « Ferme » : le compte a rebours tient, et RIEN du jeu n'a bouge derriere.
  const ferme = () => scene === 'compte' && compte.actif && !demarrage.lance && audio.pistes.size === pistesAuDepart;
  const zoneE = () => zones.find(z => z.action === 'compte-e');
  const poserOuverture = ms => { COMPTE.ouverture = heureCompte() + ms; compte.secondeVue = null; };
  const reverrouiller = () => {
    compte.ouvertParCode = false;
    Object.assign(compte.saisie, { ouverte: false, texte: '', message: '', messageT: 0, succes: false, essais: 0, blocage: 0 });
    compte.apercu = null; compte.ouverture = 0; compte.accesDans = 0; compte.toastT = 0; compte.flash = 0;
    confettis.length = 0;
    verrouillerCompte();
    avancer(0.1);
  };
  const ouvrirLeChamp = () => { avancer(1 / 60); const z = zoneE(); if (z) clicZone(z); avancer(1 / 60); };
  const bouton = action => { const z = zones.find(q => q.action === action); if (z) clicZone(z); avancer(1 / 60); return !!z; };

  if (!aLeCompte) {
    ecrire('\nW–Z. LE COMPTE À REBOURS');
    verifier('le module du compte à rebours est chargé', false, 'js/compte.js absent de cette version');
  } else if (!BETA) {
    ecrire('\nW–Z. LE COMPTE À REBOURS');
    verifier('pas de compte à rebours dans la version finale', !compte.actif && scene !== 'compte' && !compteVerrouille(), scene);
    synchroniserCompte();
    verifier('… et elle ne demande l\'heure à personne', compte.source === 'appareil' && !synchroEnCours, compte.source);
  } else {
    /* ======================================================================= */
    await section('W. LE COMPTE À REBOURS : LE VERROU', async () => {
      if (heureCompte() >= ouvertureVraie) {
        ecrire('  (la bêta est ouverte : rien à vérifier « au chargement »)');
      } else if (dejaPassee) {
        ecrire('  (la suite a déjà tourné dans cette page : recharger pour vérifier « au chargement »)');
      } else {
        const auChargement = scene === 'compte' && compte.actif && !compte.ouvertParCode;
        verifier('avant l\'heure, la page s\'ouvre sur le compte à rebours', auChargement, scene);
        verifier('… rien du jeu n\'a démarré : ni logos, ni chargement', !demarrage.lance && demarrage.finChargement < 0);
        verifier('… aucune musique n\'a été téléchargée', audio.pistes.size === 0, audio.pistes.size);
        const images = Object.keys(planchesBrad).length + Object.keys(sprites).length;
        verifier('… quatre images au plus : Brad et trois Serra, pour le décor', images <= 4, images);
      }

      // A partir d'ici, l'heure d'ouverture est celle de la suite.
      poserOuverture(47 * JOUR + 5 * 3600e3);
      reverrouiller();
      verifier('le verrou se pose', ferme(), scene);

      // 1. LE CLAVIER — chaque touche, appuyee, tenue, relachee.
      const touches = [];
      for (const l of 'abcdefghijklmnopqrstuvwxyz') touches.push(['Key' + l.toUpperCase(), l]);
      for (let i = 0; i < 10; i++) touches.push(['Digit' + i, String(i)], ['Numpad' + i, String(i)]);
      for (let i = 1; i <= 12; i++) touches.push(['F' + i, 'F' + i]);
      for (const c of ['Space', 'Enter', 'NumpadEnter', 'Escape', 'Tab', 'Backspace', 'Delete', 'ArrowUp',
                       'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'ControlLeft',
                       'AltLeft', 'Home', 'End', 'PageUp', 'PageDown']) touches.push([c, c === 'Space' ? ' ' : c]);
      let fuites = [];
      for (const [code, key] of touches) {
        appui(code, key); appui(code, key, true); relache(code, key); avancer(1 / 60);
        if (!ferme() || compte.saisie.ouverte) { fuites.push(code); reverrouiller(); }
      }
      verifier('aucune des ' + touches.length + ' touches n\'ouvre le jeu ni le champ de code', fuites.length === 0, fuites);
      verifier('Échap n\'y fait pas non plus sortir du plein écran', appui('Escape').defaut === false);

      // 2. LA SOURIS — toute la surface, sauf la lettre.
      avancer(1 / 60);
      const zE = zoneE();
      verifier('une seule chose se touche à l\'écran : la lettre « Ê »', zones.length === 1 && !!zE, zones.map(z => z.action));
      verifier('… une zone étroite, sur la ligne du titre',
               !!zE && zE.w < 24 && zE.h < 26 && zE.y > 60 && zE.y < 100 && zE.discret === true, zE && [zE.x, zE.y, zE.w, zE.h, zE.discret]);
      let clics = 0; fuites = [];
      for (let y = 2; y < HAUTEUR; y += 6) {
        for (let x = 2; x < LARGEUR; x += 6) {
          if (zE && x >= zE.x - 1 && x <= zE.x + zE.w + 1 && y >= zE.y - 1 && y <= zE.y + zE.h + 1) continue;
          clic(x, y); clics++;
          if (!ferme() || compte.saisie.ouverte) { fuites.push([x, y]); reverrouiller(); }
        }
        avancer(1 / 60);
      }
      verifier(clics + ' clics sur tout l\'écran, hors de la lettre : rien ne s\'ouvre', fuites.length === 0, fuites.slice(0, 5));
      if (zE) { pointeur('pointermove', zE.x + zE.w / 2, zE.y + zE.h / 2); avancer(2 / 60); }
      verifier('le curseur ne se change pas en main au-dessus de la lettre',
               canvas.style.cursor === 'default' && !!souris.survol && souris.survol.action === 'compte-e', canvas.style.cursor);
      pointeur('pointermove', 5, 5); avancer(1 / 60);

      // 3. LE RESTE DE CE QU'UN NAVIGATEUR PEUT ENVOYER.
      const courseAvant = courseAuto.actif;
      zoneTactile.querySelectorAll('.tbtn').forEach(b => {
        b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
        b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      });
      if (courseAuto.actif !== courseAvant) basculerCourseAuto();
      avancer(0.1);
      verifier('les boutons tactiles sont cachés, et n\'ouvrent rien', zoneTactile.hidden === true && ferme());
      canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 240, bubbles: true, cancelable: true }));
      canvas.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
      for (const n of ['blur', 'focus', 'resize', 'pagehide', 'contextmenu']) dispatchEvent(new Event(n));
      avancer(0.2);
      verifier('ni la molette, ni le double-clic, ni un changement de fenêtre', ferme());

      // 4. PAR LE CODE DU JEU LUI-MEME.
      lancerDemarrage(); avancer(0.2);
      verifier('« Jouer », appelé directement, ne démarre rien', ferme());
      // Et si l'ecran d'accueil s'affichait malgre tout — par un defaut qu'on
      // n'a pas vu — il resterait inerte tant que le compte tient.
      scene = 'accueil'; avancer(1 / 60);
      clic(12, 12); appui('Space', ' '); appui('Enter'); avancer(0.2);
      const inerte = !demarrage.lance && scene === 'accueil';
      scene = 'compte'; avancer(1 / 60);
      verifier('… et l\'écran d\'accueil lui-même resterait inerte', inerte && ferme());

      // 5. AU HASARD — touches, clics, et la lettre elle-meme : le champ
      // s'ouvre, on y tape n'importe quoi, on valide.
      let graine = 28;
      const alea = () => { graine = (Math.imul(graine, 1664525) + 1013904223) >>> 0; return graine / 4294967296; };
      let ouvertures = 0, sorti = false;
      for (let i = 0; i < 4000 && !sorti; i++) {
        const r = alea();
        if (r < 0.45) { const [code, key] = touches[Math.floor(alea() * touches.length)]; appui(code, key); relache(code, key); }
        else if (r < 0.9) clic(alea() * LARGEUR, alea() * HAUTEUR);
        else { const z = zoneE(); if (z) { clicZone(z); ouvertures++; } }
        if (i % 3 === 0) avancer(1 / 60);
        if (scene !== 'compte' || !compte.actif || demarrage.lance) sorti = true;
      }
      verifier('4 000 gestes au hasard, champ de code compris : le jeu reste fermé',
               !sorti && ouvertures > 20 && audio.pistes.size === pistesAuDepart, [scene, ouvertures]);
      reverrouiller();
    });

    /* ======================================================================= */
    await section('X. LE COMPTE À REBOURS : LES CODES', async () => {
      verifier('SHA-256 : les trois valeurs de référence',
               sha256Hex('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
               && sha256Hex('') === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
               && sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')
                  === '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
      if (window.crypto && crypto.subtle && typeof TextEncoder === 'function') {
        let pareil = true;
        for (const t of ['bradbitt-compte:A', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), 'w'.repeat(119), 'v'.repeat(1000)]) {
          const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
          const hex = Array.from(new Uint8Array(b)).map(o => o.toString(16).padStart(2, '0')).join('');
          if (hex !== sha256Hex(t)) pareil = false;
        }
        verifier('… et le même résultat que le navigateur, sur six longueurs pièges', pareil);
      } else ecrire('  (page ouverte hors serveur local : pas de crypto.subtle pour comparer)');

      const cles = Object.keys(COMPTE.codes);
      verifier('la table ne contient que deux empreintes — jamais un code',
               cles.length === 2 && cles.every(c => /^[0-9a-f]{64}$/.test(c))
               && cles.map(c => COMPTE.codes[c]).sort().join() === 'apercu,jouer', cles.length);

      /* AUCUN CODE EN CLAIR DANS CE QUI EST PUBLIE. On ne peut pas chercher un
         mot qu'on n'a pas le droit d'ecrire ; on fait donc l'inverse : chaque
         mot de chaque fichier (et chaque paire de mots voisins, pour un code
         ecrit en deux morceaux) passe par la meme fonction que le champ de
         saisie. Si l'un d'eux ouvre quelque chose, il est ecrit en clair.
         Un mot TEMOIN, que l'on sait present, prouve que la recherche voit. */
      const temoin = sha256Hex(COMPTE.sel + 'BRADDY3000');
      COMPTE.codes[temoin] = 'temoin';
      const fichiers = new Set(Array.from(document.scripts).map(s => s.getAttribute('src')).filter(Boolean)
        .concat(['index.html', 'style.css', 'README.md', 'diagnostic-audio.html', 'tools/verif-navigateur.js',
                 'tools/empreinte_code.py', 'tools/serveur.py', 'tools/beta_brad.py', 'assets/audio/LISEZ-MOI.txt']));
      const vus = new Set(), enClair = [];
      let lus = 0, temoins = 0;
      try {
        for (const f of fichiers) {
          let texte = '';
          try { const r = await fetch(f, { cache: 'no-store' }); if (!r.ok) continue; texte = await r.text(); }
          catch (e) { continue; }
          lus++;
          const mots = texte.toUpperCase().match(/[A-Z0-9]+/g) || [];
          for (let i = 0; i < mots.length; i++) {
            for (const m of [mots[i], mots[i] + (mots[i + 1] || '')]) {
              if (m.length > COMPTE.longueurCode || vus.has(m)) continue;
              vus.add(m);
              const effet = COMPTE.codes[sha256Hex(COMPTE.sel + m)];
              if (effet === 'temoin') temoins++;
              else if (effet) enClair.push(f + ' (un mot de ' + m.length + ' caractères)');
            }
          }
        }
      } finally { delete COMPTE.codes[temoin]; }
      verifier('la recherche d\'un code en clair voit bien : elle retrouve son mot témoin', temoins > 0 && lus >= 30, [temoins, lus]);
      verifier('aucun des deux codes n\'est écrit dans les ' + lus + ' fichiers publiés', enClair.length === 0, enClair);
      ecrire('        (' + vus.size + ' mots et paires de mots essayés)');

      // DEUX CODES D'ESSAI, inventes, le temps de la section.
      const ESSAI_JOUER = 'ESSAIJOUER', ESSAI_APERCU = 'ESSAIAPERCU';
      const eJ = sha256Hex(COMPTE.sel + ESSAI_JOUER), eA = sha256Hex(COMPTE.sel + ESSAI_APERCU);
      COMPTE.codes[eJ] = 'jouer'; COMPTE.codes[eA] = 'apercu';
      const clesStockage = () => { try { return Object.keys(localStorage).sort().join('|'); } catch (e) { return ''; } };
      const stockageAvant = clesStockage();
      try {
        poserOuverture(47 * JOUR + 5 * 3600e3);
        reverrouiller();
        verifier('majuscules, minuscules, espaces et tirets : c\'est le même code',
                 effetDuCode(' essai-Jouer ') === 'jouer' && effetDuCode('ESSAIJOUE') === null
                 && effetDuCode('ESSAIJOUERX') === null && effetDuCode('') === null);

        ouvrirLeChamp();
        verifier('un clic sur le « Ê » ouvre le champ de code', compte.saisie.ouverte === true);
        verifier('… et tant qu\'il est ouvert, la lettre n\'est plus là et le fond avale les clics',
                 !zoneE() && zones.length > 0 && zones[0].action === 'compte-fond', zones.slice(0, 2).map(z => z.action));
        taper('zqsd');
        verifier('on y tape au clavier', compte.saisie.texte === 'ZQSD', compte.saisie.texte);
        appui('Backspace');
        verifier('Retour arrière efface une lettre', compte.saisie.texte === 'ZQS', compte.saisie.texte);
        taper('abcdefghijklmnop');
        verifier('douze caractères au plus', compte.saisie.texte.length === COMPTE.longueurCode, compte.saisie.texte.length);
        appui('Enter'); avancer(0.1);
        verifier('un mauvais code : « Code inconnu. », et rien ne s\'ouvre',
                 compte.saisie.message === 'Code inconnu.' && compte.saisie.ouverte && ferme(), compte.saisie.message);
        taper('non'); appui('Enter'); taper('nonplus'); appui('Enter'); avancer(0.1);
        const bloque = compte.saisie.blocage > 0;
        taper(ESSAI_JOUER); appui('Enter'); avancer(0.1);
        verifier('trois erreurs de suite : le champ se tait — même le bon code attend',
                 bloque && compte.saisie.texte === '' && ferme() && !(compte.accesDans > 0), [compte.saisie.blocage, compte.saisie.texte]);
        avancer(8.2);
        verifier('… huit secondes, puis il reprend', compte.saisie.blocage === 0 && compte.saisie.ouverte, compte.saisie.blocage);

        const touche = c => { const z = zones.find(q => q.action === 'compte-touche' && q.valeur === c); if (z) clicZone(z); };
        avancer(1 / 60); touche('B'); touche('7');
        verifier('le clavier dessiné à l\'écran écrit aussi (téléphone)', compte.saisie.texte === 'B7', compte.saisie.texte);
        bouton('compte-effacer');
        verifier('« Effacer » retire une lettre', compte.saisie.texte === 'B', compte.saisie.texte);
        clic(8, 8); avancer(1 / 60);
        verifier('un clic à côté du panneau ne ferme rien et n\'ouvre rien', compte.saisie.ouverte && ferme());
        bouton('compte-fermer');
        verifier('« Fermer » referme, et vide le champ', !compte.saisie.ouverte && compte.saisie.texte === '');
        ouvrirLeChamp(); taper('x');
        const echap = appui('Escape'); avancer(1 / 60);
        verifier('Échap referme le champ, sans faire sortir du plein écran', !compte.saisie.ouverte && echap.defaut === false);

        // LE CODE D'APERCU
        ouvrirLeChamp(); taper(ESSAI_APERCU.toLowerCase()); appui('Enter'); avancer(0.1);
        const r0 = resteCompte();
        verifier('le code d\'aperçu lance la dernière minute et demie',
                 !!compte.apercu && !compte.saisie.ouverte && r0 > 88 && r0 <= 90, r0);
        verifier('… le jeu reste fermé, et l\'onglet garde le vrai compte', ferme() && /^J-47 · /.test(document.title), document.title);
        appui('Escape'); avancer(0.1);
        verifier('Échap interrompt l\'aperçu : retour au vrai compte à rebours',
                 !compte.apercu && resteCompte() > 46 * 86400 && ferme(), resteCompte());
        ouvrirLeChamp(); taper(ESSAI_APERCU); bouton('compte-valider'); avancer(0.1);
        verifier('« Valider », à la souris, vaut Entrée', !!compte.apercu && !compte.saisie.ouverte);
        compte.apercu.fin = performance.now() - 1; avancer(0.3);
        const effet = compte.ouverture > 0 && !zoneE() && ferme();
        lancerDemarrage();
        avancer(COMPTE.dureeOuverture + 0.3);
        verifier('à zéro, l\'aperçu joue l\'ouverture… et revient au compte : il n\'ouvre PAS le jeu',
                 effet && !compte.apercu && !(compte.ouverture > 0) && ferme() && resteCompte() > 46 * 86400,
                 [effet, scene, compte.actif]);

        // LE CODE D'ACCES
        ouvrirLeChamp(); taper(ESSAI_JOUER); appui('Enter'); avancer(0.1);
        verifier('le bon code : « Accès accordé. »', compte.saisie.message === 'Accès accordé.' && compte.accesDans > 0, compte.saisie.message);
        avancer(1.2);
        verifier('… et l\'écran d\'accueil s\'ouvre', scene === 'accueil' && !compte.actif && compte.ouvertParCode === true, scene);
        verifier('… l\'onglet reprend le nom du jeu', document.title === compte.titreOnglet, document.title);
        appliquerHeureCompte(); avancer(0.2);
        verifier('… l\'heure du serveur ne referme pas derrière celui qui a le code', scene === 'accueil' && !compte.actif);
        verifier('… rien n\'est retenu dans le navigateur : le code se retape à chaque visite', clesStockage() === stockageAvant);
      } finally {
        delete COMPTE.codes[eJ]; delete COMPTE.codes[eA];
      }
      verifier('les codes d\'essai sont retirés de la table', Object.keys(COMPTE.codes).length === 2);
      reverrouiller();
      verifier('et l\'on referme : le verrou reprend comme au premier instant', ferme() && !compte.ouvertParCode, scene);
    });

    /* ======================================================================= */
    await section('Y. LE COMPTE À REBOURS : LE COMPTEUR ET LA DERNIÈRE MINUTE', async () => {
      /* La date est ecrite deux fois : en chiffres pour la machine
         (OUVERTURE_BETA, js/edition.js) et en lettres pour l'ecran
         (COMPTE.dateLisible). Si l'on change l'une sans l'autre, l'ecran
         annonce une heure et le jeu en applique une autre. */
      const morceaux = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long',
        year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false }).formatToParts(new Date(ouvertureVraie));
      const m = t => (morceaux.find(x => x.type === t) || { value: '' }).value;
      const attendue = m('day') + ' ' + m('month').toUpperCase() + ' ' + m('year') + ' À ' + m('hour') + ' H';
      verifier('la date écrite à l\'écran est celle de l\'ouverture, à l\'heure de Paris',
               COMPTE.dateLisible === attendue && m('minute') === '00', [COMPTE.dateLisible, attendue, m('minute')]);
      poserOuverture(47 * JOUR + 5 * 3600e3); reverrouiller();
      verifier('l\'onglet annonce « J-47 »', /^J-47 · /.test(document.title), document.title);
      poserOuverture(5 * 3600e3 + 3 * 60e3 + 30e3); avancer(0.1);
      verifier('… puis les heures : « 5 h 03 »', /^5 h 03 · /.test(document.title), document.title);
      poserOuverture(125e3 - 400); avancer(0.1);
      verifier('… puis les minutes : « 02:05 »', /^02:05 · /.test(document.title), document.title);

      let cote = 0, suite = 0, plat = 0;
      const polices = new Set();
      for (let s = COMPTE.derniereMinute; s >= 0; s--) {
        const a = alluresFinale(s);
        if (a[0].police === a[1].police || a[0].couleur === a[1].couleur) cote++;
        for (let r = 0; r < 2; r++) {
          polices.add(a[r].police);
          const deg = Math.abs(a[r].angle) * 180 / Math.PI;
          if (deg < 4 || deg > 24.1) plat++;
          if (s < COMPTE.derniereMinute) {
            const avant = alluresFinale(s + 1)[r];
            if (a[r].police === avant.police || a[r].couleur === avant.couleur) suite++;
          }
        }
      }
      verifier('dernière minute : jamais la même police ni la même couleur côte à côte', cote === 0, cote);
      verifier('… ni deux secondes de suite pour le même chiffre', suite === 0, suite);
      verifier('… chaque chiffre est penché, de 4 à 24 degrés', plat === 0, plat);
      verifier('… les douze polices servent', polices.size === POLICES_FINALE.length && polices.size === 12, polices.size);
      verifier('… le tirage d\'une seconde ne change pas pendant la seconde',
               JSON.stringify(alluresFinale(37)) === JSON.stringify(alluresFinale(37)));
      const allures = new Set(POLICES_FINALE.filter(p => p !== 'BLOCS').map(p => {
        ctx.font = p.replace('{t}', '100');
        return Math.round(ctx.measureText('8').width) + (p.indexOf('italic') >= 0 ? 'i' : 'd');
      }));
      verifier('… sur cette machine, au moins six allures vraiment différentes (plus les blocs)', allures.size >= 6, allures.size);

      /* L'ENCRE. Chaque chiffre des soixante et une secondes est dessine seul
         sur un fond uni, et l'on regarde quels pixels ont change : c'est la
         place qu'il prend VRAIMENT, police du systeme et rotation comprises. */
      const k = canvas.width / LARGEUR;
      const encre = dessin => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
        ctx.fillStyle = '#ff00ff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
        dessin();
        const d = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let h = 1e9, b = -1, g = 1e9, dr = -1;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            if (Math.abs(d[i] - 255) + d[i + 1] + Math.abs(d[i + 2] - 255) > 24) {
              if (y < h) h = y; if (y > b) b = y; if (x < g) g = x; if (x > dr) dr = x;
            }
          }
        }
        return { h: h / k, b: b / k, g: g / k, d: dr / k };
      };
      const hors = []; let collisions = 0;
      for (let s = COMPTE.derniereMinute; s >= 0; s--) {
        const a = alluresFinale(s), taille = s <= 10 ? 150 : 124;
        // Le tremblement des dix dernieres secondes compris : deux pixels.
        const A = encre(() => dessinerChiffreFinale(Math.floor(s / 10), LARGEUR / 2 - FINALE_ECART + 2, FINALE_Y, a[0], taille, 1));
        const B = encre(() => dessinerChiffreFinale(s % 10, LARGEUR / 2 + FINALE_ECART - 2, FINALE_Y, a[1], taille, 1));
        if (Math.min(A.h, B.h) < 88 || Math.max(A.b, B.b) > 235) hors.push([s, Math.round(Math.min(A.h, B.h)), Math.round(Math.max(A.b, B.b))]);
        if (B.g - A.d < 0) collisions++;
      }
      verifier('… aucun chiffre ne recouvre le titre (donc le « Ê ») ni le mot « SECONDES »', hors.length === 0, hors.slice(0, 6));
      verifier('… et les deux chiffres ne se marchent pas dessus', collisions === 0, collisions);

      // Toute la derniere minute, image par image, sans un incident.
      const incidentsAvant = incidents.nombre;
      compte.apercu = { fin: 0 };
      let lettrePresente = true;
      for (let r = 61.2; r > 0.05; r -= 0.25) {
        compte.apercu.fin = performance.now() + r * 1000; avancer(1 / 60);
        if (!zoneE()) lettrePresente = false;
      }
      compte.apercu = null; avancer(1 / 60);
      verifier('… elle se dessine d\'un bout à l\'autre sans incident, et la lettre reste là',
               incidents.nombre === incidentsAvant && lettrePresente && ferme(), [incidents.nombre - incidentsAvant, lettrePresente]);
    });

    /* ======================================================================= */
    await section('Z. LE COMPTE À REBOURS : L\'HEURE, ET LE VRAI ZÉRO', async () => {
      poserOuverture(47 * JOUR); reverrouiller();
      const synchroFinie = async () => { await attendre(60); for (let i = 0; i < 80 && synchroEnCours; i++) await attendre(100); };
      /* SANS SERVEUR — le jeu ouvert par double-clic sur index.html. La page ne
         peut alors demander l'heure a personne ; c'est la meme branche que si
         `fetch` n'existait pas, et c'est ainsi qu'on l'emprunte ici. */
      await synchroFinie();
      const vraiFetch = window.fetch;
      window.fetch = undefined;
      try { synchroniserCompte(); } finally { window.fetch = vraiFetch; }
      avancer(0.1);
      verifier('sans serveur, le compte suit l\'horloge de l\'appareil — et tient tout autant',
               compte.source === 'appareil' && ferme() && resteCompte() > 46 * 86400, [compte.source, Math.round(resteCompte())]);
      if (/^https?:$/.test(location.protocol)) {
        synchroniserCompte(); await synchroFinie();
        verifier('l\'heure est demandée au serveur qui héberge la page', compte.source === 'serveur', compte.source);
        const reste0 = resteCompte();
        Date.now = () => dateVraie.call(Date) + 400 * JOUR;
        try {
          avancer(1);
          const tient = ferme() && Math.abs(resteCompte() - reste0) < 5;
          surveillerHorlogeCompte(); await synchroFinie(); avancer(0.5);
          verifier('avancer l\'horloge de l\'appareil de plus d\'un an n\'ouvre rien',
                   tient && ferme() && compte.source === 'serveur' && Math.abs(resteCompte() - reste0) < 10,
                   [tient, compte.source, Math.round(resteCompte() - reste0)]);
        } finally { Date.now = dateVraie; }
        synchroniserCompte(); await synchroFinie();
      } else ecrire('  (page ouverte par double-clic : pas de serveur à qui demander l\'heure)');

      // Une page ouverte A TORT — horloge de l'appareil en avance au
      // chargement, « Jouer » deja clique — se referme quand le serveur repond.
      ouvrirLeJeuCompte(false); demarrage.lance = true; scene = 'logos';
      appliquerHeureCompte(); avancer(0.2);
      verifier('une page ouverte à tort par une horloge en avance se referme dès que l\'heure arrive', ferme(), scene);

      // LE VRAI ZERO : pas un apercu, l'heure elle-meme.
      poserOuverture(40);
      await attendre(90); avancer(0.3);
      const effet = compte.ouverture > 0 && compte.actif && scene === 'compte' && !zoneE();
      lancerDemarrage();
      const tenu = !demarrage.lance;
      avancer(COMPTE.dureeOuverture + 0.3);
      verifier('au vrai zéro : l\'effet d\'ouverture, pendant lequel le jeu est encore fermé', effet && tenu, [effet, tenu]);
      verifier('… puis l\'écran d\'accueil s\'ouvre tout seul', scene === 'accueil' && !compte.actif && !compte.ouvertParCode, scene);
      avancer(1);
      verifier('… et le compte à rebours ne revient pas', scene === 'accueil' && !compte.actif, scene);
      verifier('… l\'onglet reprend le nom du jeu', document.title === compte.titreOnglet, document.title);
    });
  }

  /* On entre dans le jeu pour la suite. Avant l'heure, c'est par l'interieur —
     exactement ce que le README dit qu'un outil de developpement peut faire. */
  if (aLeCompte) {
    COMPTE.ouverture = ouvertureVraie;
    Date.now = dateVraie;
    if (BETA) {
      if (compte.actif) ouvrirLeJeuCompte(true);
      compte.ouvertParCode = true;       // qu'une synchro ne referme pas au milieu de la suite
      scene = 'accueil';
    }
  }

  /* --- Mise en route : on passe l'accueil et les logos --------------------- */
  if (scene === 'accueil') lancerDemarrage();
  for (let i = 0; i < 300 && demarrage.finChargement < 0; i++) await attendre(100);
  for (let i = 0; i < 60 && (scene === 'logos' || scene === 'accueil'); i++) avancer(0.5);
  const incidentsAuDepart = incidents.nombre;

  ecrire('BRAD BITT — vérification dans le navigateur — version ' + versionLisible()
         + ' — édition ' + (BETA ? 'BÊTA' : 'FINALE'));

  /* ========================================================================= */
  await section('A. CHARGEMENT', async () => {
    verifier('le jeu est arrivé au menu', scene === 'menu', scene);
    verifier('version 0.28' + (BETA ? ' bêta' : ''), versionLisible() === '0.28' + (BETA ? ' bêta' : ''), versionLisible());
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
    appui('KeyP', 'p'); appui('Enter'); avancer(0.1);
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

    // Le vestiaire a trois etages : la grille, le champ de code, « Sortir ».
    ouvrirPoste('vestiaire');
    const etage = () => focusSortir ? 'sortir' : (vestiaireCode.focus ? 'code' : 'grille');
    const trajet = [];
    for (let i = 0; i < 6 && etage() !== 'sortir'; i++) { appui('ArrowDown'); trajet.push(etage()); }
    appui('ArrowUp'); const remonte = etage(); appui('ArrowDown'); appui('Enter'); avancer(0.05);
    verifier('vestiaire : ↓ descend la grille, puis le champ de code, puis « Sortir » ; ↑ en revient, Entrée sort',
             trajet.join() === 'grille,code,sortir' && remonte === 'code' && scene === 'hub', [trajet, remonte, scene]);

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
    const question = !!confirmation && scene === 'hub';
    appui('Enter'); avancer(0.1);
    verifier('dans la base : P demande, Entrée confirme, et on est au menu principal', question && scene === 'menu', [question, scene]);
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

  /* =========================================================================
     PROTOTYPE 27
     ========================================================================= */
  await section('P. LA BANDE-ANNONCE GARDE SA MUSIQUE', async () => {
    const srcBA = sourceMusique(BA.piste), nom = () => (audio.demandee || '').split('/').pop();
    retourAuMenu(); avancer(0.2);
    indexMenu = MENU_PRINCIPAL.findIndex(e => e.cle === 'bande'); appui('Enter'); avancer(0.1);
    const el = audio.pistes.get(srcBA);
    verifier('la piste de la bande-annonce est chargée et réservée au lancement',
             scene === 'bandeannonce' && !!el && audio.reservee === srcBA && audio.musique === el, [scene, audio.reservee]);
    // Ce que le moteur tente pendant un plan de boss : il ne doit rien obtenir.
    audio.jouerMusiqueDifferee(sourceMusique('boss3'), 0.6);
    audio.jouerMusique(sourceMusique('niveau1'), 0.4);
    audio.arreterMusique(0);
    verifier('pendant le montage, ni une arène, ni un niveau, ni un arrêt ne touchent à la piste',
             audio.musique === el && audio.demandee === srcBA && audio.cible === R.volMusique, [nom(), audio.cible]);
    // Et pour de vrai : on se place sur le premier plan de boss, on laisse le
    // moteur declencher l'arene, puis on attend que le fichier du boss ait eu
    // tout le temps d'arriver — c'est A SON ARRIVEE qu'il prenait la place.
    try { el.currentTime = instantBA(36) + 0.3; } catch (e) { /* piste non positionnable */ }
    bandeAnnonce.t = instantBA(36) + 0.3;
    avancer(0.5);
    const plan = bandeAnnonce.plan, areneLancee = !!ARENE && arene.active;
    await attendre(1500);
    avancer(0.2);
    verifier('plan de boss : l\'arène tourne (' + (plan && plan.niveau) + '), la musique reste celle de la bande-annonce',
             plan && plan.genre === 'boss' && areneLancee && audio.musique === el && audio.demandee === srcBA,
             [plan && plan.genre, areneLancee, nom()]);
    appui('Enter'); avancer(0.2);
    verifier('en sortant : la réserve tombe et le menu reprend sa musique',
             scene === 'menu' && audio.reservee === null && audio.demandee === sourceMusique(PISTE_MENU), [scene, audio.reservee, nom()]);
    partieNeuve();
    const idBoss = ORDRE_NIVEAUX.find(id => niveauDansEdition(id) && NIVEAUX[id].arene && NIVEAUX[id].arene.musique);
    niveau(idBoss, true); poser(NIVEAUX[idBoss].arene.x1 + 12); avancer(0.5, () => { brad.invincible = 5; });
    verifier('hors bande-annonce, un vrai combat lance toujours la musique de son boss',
             arene.active && audio.demandee === sourceMusique(NIVEAUX[idBoss].arene.musique), nom());
    audio.arreterMusique(0); retourAuMenu();
  });

  /* ========================================================================= */
  await section('Q. UNE TOUCHE LÂCHÉE EST LÂCHÉE', async () => {
    partieNeuve();
    // Brad doit s'arreter apres le relachement : on mesure le chemin parcouru.
    const essai = (bas, haut) => {
      niveau('niveau1', true); poser(20); const x0 = brad.x;
      bas(); avancer(0.3); const prise = entrees.gauche; haut(); avancer(2);
      const r = { prise, bloquee: entrees.gauche, tuiles: (x0 - brad.x) / TUILE }; relacherTout(); return r;
    };
    const propre = r => r.prise && !r.bloquee && r.tuiles < 3;
    let r = essai(() => appui('ArrowLeft'), () => relache('ArrowLeft'));
    verifier('repère : ← pressée puis relâchée, Brad s\'arrête', propre(r), r);
    r = essai(() => appui('KeyA', 'q'), () => relache('KeyA', 'â'));
    verifier('Q (AZERTY) relâchée avec une autre lettre : relâchée quand même', propre(r), r);
    r = essai(() => appui('KeyQ', 'a'), () => relache('KeyQ', 'æ'));
    verifier('A (AZERTY) relâchée avec Option, la lettre devenue « æ » : relâchée quand même', propre(r), r);
    r = essai(() => appui('KeyQ', 'a'), () => relache('KeyQ', 'q'));
    verifier('même touche, disposition de clavier changée entre-temps : relâchée quand même', propre(r), r);
    r = essai(() => appui('ArrowLeft'), () => { appui('MetaLeft', 'Meta', false, { metaKey: true }); relache('MetaLeft', 'Meta'); });
    verifier('← lâchée pendant que ⌘ est enfoncée (macOS n\'en dit rien) : relâchée au passage de ⌘', propre(r), r);
    niveau('niveau1', true); poser(20);
    appui('MetaLeft', 'Meta', false, { metaKey: true });
    const ev = appui('ArrowLeft', 'ArrowLeft', false, { metaKey: true });
    verifier('⌘ + ← est un raccourci du système : pas une commande de jeu, et le jeu n\'y touche pas',
             !entrees.gauche && ev.defaut === true, [entrees.gauche, ev.defaut]);
    relache('MetaLeft', 'Meta');

    const filet = declencher => {
      niveau('niveau1', true); poser(20); appui('ArrowLeft'); appui('ShiftLeft', 'Shift');
      const avant = entrees.gauche && entrees.courir; declencher();
      const ok = avant && !entrees.gauche && !entrees.courir && Object.keys(touchesTenues).length === 0;
      relacherTout(); return ok;
    };
    const filets = {
      'perte de focus': () => dispatchEvent(new Event('blur')),
      'page cachée': () => dispatchEvent(new Event('pagehide')),
      'menu contextuel': () => dispatchEvent(new Event('contextmenu')),
      'changement de plein écran': () => document.dispatchEvent(new Event('fullscreenchange')),
      'changement de plein écran (Safari)': () => document.dispatchEvent(new Event('webkitfullscreenchange')),
      'fenêtre qui change de taille d\'un coup': () => { fenetreVue.l -= 400; dispatchEvent(new Event('resize')); },
    };
    for (const nomFilet of Object.keys(filets)) verifier('tout est lâché : ' + nomFilet, filet(filets[nomFilet]));
    niveau('niveau1', true); poser(20); appui('ArrowLeft'); dispatchEvent(new Event('resize'));
    verifier('mais pas quand seule la taille INTÉRIEURE bouge (barre d\'adresse d\'un téléphone)', entrees.gauche === true);
    relacherTout();
    // Le symptome d'origine, pour memoire : une commande restee vraie.
    niveau('niveau1', true); poser(20); entrees.gauche = true; avancer(0.6);
    const seul = brad.vx; appui('ArrowRight'); avancer(0.6); const retenu = brad.vx; relache('ArrowRight'); avancer(0.6);
    verifier('(le symptôme signalé se reconnaît : -150 px/s sans touche, arrêt sous →, -150 dès qu\'on la lâche)',
             seul < -100 && Math.abs(retenu) < 5 && brad.vx < -100, [seul, retenu, brad.vx]);
    relacherTout();
  });

  /* ========================================================================= */
  await section('R. ÉCHAP NE FAIT PLUS SORTIR DU PLEIN ÉCRAN', async () => {
    partieNeuve();
    const scenes = {
      'menu': () => retourAuMenu(),
      'options': () => { scene = 'options'; retourOptions = 'menu'; },
      'en jeu': () => niveau('niveau1', true),
      'pause': () => { niveau('niveau1', true); ouvrirPause(); },
      'base': () => { confirmation = null; entrerHub(false); },
      'question posée': () => { confirmation = null; entrerHub(false); demanderRetourMenu(); },
      'boutique': () => { confirmation = null; entrerHub(false); ouvrirPoste('boutique'); },
      'vestiaire': () => { entrerHub(false); ouvrirPoste('vestiaire'); },
      'vestiaire, en saisie': () => { entrerHub(false); ouvrirPoste('vestiaire'); entrerSaisieVestiaire(); },
      'carte': () => { entrerHub(false); ouvrirPoste('carte'); },
      'jukebox': () => { entrerHub(false); ouvrirPoste('jukebox'); },
      'arcade': () => { entrerHub(false); ouvrirPoste('arcade'); },
      'dialogue': () => lancerDialogue(DIALOGUE_INTRO, () => {}),
      'écran de mort': () => { niveau('niveau1', true); poser(5); brad.invincible = 0; brad.pv = 1; blesserBrad(5, brad.x - 50, 'Serra'); },
    };
    const laissees = [];
    for (const nomScene of Object.keys(scenes)) {
      scenes[nomScene](); avancer(0.05);
      if (appui('Escape').defaut) laissees.push(nomScene);
      avancer(0.05); confirmation = null;
    }
    verifier('l\'action par défaut d\'Échap est annulée dans les ' + Object.keys(scenes).length + ' écrans essayés',
             laissees.length === 0, laissees);
    retourAuMenu();
    const touchees = ['F5', 'F11', 'Tab', 'KeyP', 'KeyX', 'Enter'].filter(c => !appui(c, c.length === 4 ? c[3].toLowerCase() : c).defaut);
    verifier('les autres touches gardent la leur (F5, F11, Tab, P, X, Entrée)', touchees.length === 0, touchees);
    confirmation = null; retourAuMenu();
  });

  /* ========================================================================= */
  await section('S. QUITTER LA BASE DEMANDE CONFIRMATION', async () => {
    partieNeuve(); dansLaBase();
    appui('ArrowLeft'); avancer(0.3); appui('KeyP', 'p'); avancer(0.5);
    verifier('P : la question est posée, on est toujours dans la base, Brad s\'arrête',
             !!confirmation && scene === 'hub' && Math.abs(hub.brad.vx) < 1 && !entrees.gauche, [scene, hub.brad.vx]);
    ctx.font = '12px system-ui, sans-serif';
    verifier('aucune ligne de la question ne finit ou ne commence par un guillemet seul',
             lignesDe(confirmation.texte, 368).every(l => !/«$/.test(l.trim()) && !/^»/.test(l.trim())));
    appui('KeyP', 'p'); avancer(0.1);
    verifier('P de nouveau la referme', !confirmation && scene === 'hub');
    appui('KeyP', 'p'); appui('ArrowRight'); appui('Enter'); avancer(0.1);
    verifier('→ puis Entrée (« non ») : on reste', !confirmation && scene === 'hub', scene);
    appui('Escape'); const parEchap = !!confirmation; appui('Escape'); avancer(0.1);
    verifier('Échap pose la même question, et la referme', parEchap && !confirmation && scene === 'hub');
    rendu(); activerZone({ action: 'hub-menu' });
    verifier('le clic sur « Menu principal » la pose aussi', !!confirmation && scene === 'hub');
    appui('Enter'); avancer(0.2);
    verifier('Entrée sur « Affirmatif » : menu principal, partie intacte',
             scene === 'menu' && partie.termines.length === 1 && partie.existe, scene);
  });

  /* ========================================================================= */
  await section('T. LE VESTIAIRE : RANGEMENT, CHAMP DE CODE, Z Q S D', async () => {
    partieNeuve(); partie.entrainements = 1; dansLaBase(); ouvrirPoste('vestiaire'); avancer(0.05);
    const ordre = ordreVestiaire(), cles = ordre.map(u => u.cle);
    const { cases, titres } = casesVestiaire();
    verifier('les onze uniformes sont tous là, une fois chacun',
             cles.length === UNIFORMES.length && new Set(cles).size === UNIFORMES.length, cles);
    if (BETA) {
      verifier('ceux de la bêta d\'abord, dans l\'ordre de js/edition.js',
               cles.slice(0, UNIFORMES_BETA.length).join() === UNIFORMES_BETA.join(), cles);
      verifier('deux groupes, chacun sous son titre', titres.length === 2 && /BÊTA/.test(titres[0].texte) && /SORTIE/.test(titres[1].texte),
               titres.map(t => t.texte));
      verifier('la rangée du haut ne contient QUE des uniformes de la bêta, les autres aucun',
               cases.every(c => (c.rang === 0) === uniformeDansEdition(c.u.cle)));
    } else {
      verifier('version finale : l\'ordre de toujours, sans titre de groupe', cles.join() === UNIFORMES.map(u => u.cle).join() && titres.length === 0);
    }
    verifier('aucune case n\'en recouvre une autre, aucune ne sort du panneau',
             !cases.some((a, i) => cases.some((b, j) => j > i && chevauche(a, b))) &&
             cases.every(c => c.x >= 44 && c.x + c.w <= LARGEUR - 44 && c.y >= 70 && c.y + c.h <= 266));
    verifier('le champ de code ne passe plus sous « Sortir »', VESTIAIRE_CODE.x + VESTIAIRE_CODE.l <= LARGEUR - 96,
             [VESTIAIRE_CODE.x + VESTIAIRE_CODE.l, LARGEUR - 96]);
    rendu();
    const zCode = zones.find(z => z.action === 'vestiaire-code'), zSortir = zones.find(z => z.action === 'fermer-poste');
    verifier('à l\'écran aussi : les deux zones cliquables sont disjointes', !!zCode && !!zSortir && !chevauche(zCode, zSortir));

    // Z Q S D naviguent, et n'ecrivent rien.
    indexVestiaire = 0;
    const pas = []; for (const [c, k] of [['KeyD', 'd'], ['KeyS', 's'], ['KeyA', 'q'], ['KeyW', 'z']]) { appui(c, k); pas.push(indexVestiaire); }
    verifier('D, S, Q, Z déplacent la sélection', pas[0] === 1 && cases[pas[1]].rang === 1 && pas[2] !== pas[1] && cases[pas[3]].rang === 0, pas);
    verifier('et rien ne s\'écrit dans le champ', vestiaireCode.saisie === '' && !vestiaireCode.actif, vestiaireCode.saisie);
    for (const c of 'fnam3rl') appui('Key' + c.toUpperCase(), c);
    verifier('hors saisie, un code tapé à la volée ne va nulle part', vestiaireCode.saisie === '' && scene === 'vestiaire', vestiaireCode.saisie);

    // Porter : Entree sur un uniforme gagne.
    indexVestiaire = cles.indexOf('classique-turquoise'); appui('Enter');
    const attendu = uniformeDansEdition('classique-turquoise') ? 'classique-turquoise' : 'classique';
    verifier('Entrée porte l\'uniforme choisi' + (BETA ? '' : ' (la turquoise, gagnée au camp)'), partie.uniforme === attendu, partie.uniforme);
    const ferme = ordre.find(u => !uniformeDebloque(u));
    indexVestiaire = ordre.indexOf(ferme); appui('Enter');
    verifier('Entrée sur un uniforme fermé ne le porte pas, et le robot dit pourquoi',
             partie.uniforme === attendu && hub.reponse.indexOf(detailUniforme(ferme)) >= 0, hub.reponse);

    // Le champ : on y entre, on ecrit, on valide.
    indexVestiaire = cases.filter(c => c.rang === cases[cases.length - 1].rang)[0].i;
    appui('ArrowDown');
    verifier('↓ sous la dernière rangée : le champ de code est choisi, pas encore en saisie', vestiaireCode.focus && !vestiaireCode.actif);
    appui('KeyZ', 'w'); const remonte = !vestiaireCode.focus; appui('ArrowDown');
    appui('Enter');
    verifier('Entrée y fait entrer', vestiaireCode.actif === true && remonte);
    for (const [c, k] of [['KeyW', 'z'], ['KeyA', 'q'], ['KeyS', 's'], ['KeyD', 'd']]) appui(c, k);
    verifier('là, Z Q S D s\'écrivent', vestiaireCode.saisie === 'ZQSD', vestiaireCode.saisie);
    rendu();
    for (let i = 0; i < 4; i++) appui('Backspace');
    verifier('Retour arrière efface', vestiaireCode.saisie === '');
    for (const c of 'fnam3rl') appui('Key' + c.toUpperCase(), c);
    const tape = vestiaireCode.saisie; appui('Enter'); avancer(0.05);
    if (BETA) {
      verifier('FNAM3RL en bêta : reconnu, annoncé pour la sortie, rien d\'ouvert',
               tape === 'FNAM3RL' && /Code reconnu/.test(vestiaireCode.message) && !uniformeDebloque(UNIFORMES.find(u => u.cle === '3irl')), vestiaireCode.message);
    } else {
      verifier('FNAM3RL en version finale : le skin 3IRL s\'ouvre et la sélection saute sur lui',
               tape === 'FNAM3RL' && uniformeDebloque(UNIFORMES.find(u => u.cle === '3irl')) && ordre[indexVestiaire].cle === '3irl', vestiaireCode.message);
    }
    verifier('la saisie est refermée, on est toujours au vestiaire', !vestiaireCode.actif && scene === 'vestiaire');
    rendu();
    verifier('le message du code est affiché (dans la bande de description, plus sous le panneau)', vestiaireCode.messageT > 0);
    // Echap : la saisie d'abord, le vestiaire ensuite.
    ouvrirPoste('vestiaire'); entrerSaisieVestiaire(); appui('KeyX', 'x'); appui('Escape');
    const e1 = scene === 'vestiaire' && !vestiaireCode.actif && vestiaireCode.saisie === '';
    appui('Escape'); avancer(0.05);
    verifier('Échap abandonne la saisie ; un second Échap sort du vestiaire', e1 && scene === 'hub', [e1, scene]);
    ouvrirPoste('vestiaire'); for (let i = 0; i < 6 && !focusSortir; i++) appui('KeyS', 's'); appui('Enter'); avancer(0.05);
    verifier('on sort au clavier avec S seul : S… jusqu\'à « Sortir », Entrée', scene === 'hub', scene);
    ouvrirPoste('vestiaire'); activerZone({ action: 'vestiaire-code' });
    verifier('un clic sur le champ y fait entrer', vestiaireCode.actif === true);
    fermerPoste();
    verifier('fermer le vestiaire referme la saisie', !vestiaireCode.actif && !vestiaireCode.focus);
    partie.uniforme = 'classique'; appliquerUniforme('classique');
  });

  /* ========================================================================= */
  await section('U. LA PHRASE DU NIVEAU 2', async () => {
    const textes = NIVEAUX.niveau2.panneaux.map(p => p.texte);
    const premier = textes.find(t => /^La ville\./.test(t));
    verifier('« Brad en connaît un rayon sur certaines villes. »',
             premier === 'La ville. Brad en connaît un rayon sur certaines villes.', premier);
    verifier('l\'ancienne phrase a disparu du jeu', !textes.some(t => /jamais aimé la ville/.test(t)));
    ctx.font = '10px system-ui, sans-serif';
    verifier('elle tient à l\'écran', ctx.measureText(premier).width < LARGEUR - 40, ctx.measureText(premier).width);
  });

  /* ========================================================================= */
  ecrire('\nV. EN SORTANT');
  verifier('aucun incident d\'image pendant toute la suite', incidents.nombre === incidentsAuDepart, incidents.dernier.slice(0, 300));
  verifier('aucune erreur de script', erreurs.length === 0, erreurs.slice(0, 3));

  /* --- On rend au joueur ce qui est a lui ---------------------------------- */
  removeEventListener('error', surErreur);
  relacherTout(); confirmation = null; focusSortir = false;
  vestiaireCode.focus = false; vestiaireCode.actif = false; vestiaireCode.saisie = ''; vestiaireCode.messageT = 0;
  audio.liberer();
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
  /* Avant l'heure, la page retourne ou elle etait : au compte a rebours. La
     suite etait entree par l'interieur ; elle ne laisse pas la porte ouverte. */
  if (aLeCompte && BETA) {
    compte.ouvertParCode = false;
    if (heureCompte() < COMPTE.ouverture) verrouillerCompte();
  }
  dernier = performance.now(); accumulateur = 0;
  let rendue = true;
  for (const c of CLES) { try { if (localStorage.getItem(c) !== coffre[c]) rendue = false; } catch (e) { /* idem */ } }
  verifier('la partie du joueur est remise exactement comme elle était', rendue);

  ecrire('\n================================');
  ecrire(resultat.reussies + ' vérifications réussies, ' + resultat.echecs.length + ' échec(s) — édition ' + (BETA ? 'bêta' : 'finale') + '.');
  for (const e of resultat.echecs) ecrire('  - ' + e);
  window.__verif = resultat;
  return resultat;
})();
