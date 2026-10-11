/* =============================================================================
   BRAD BITT, MAIS LE JEU — LE COMPTE A REBOURS AVANT LA BETA

   Tant que la beta n'est pas ouverte, le jeu ne montre que cet ecran. A
   l'instant dit (`OUVERTURE_BETA`, js/edition.js) il s'ouvre de lui-meme, pour
   tout le monde, sans rien redeployer.

   L'ecran n'a AUCUNE commande. Pas de bouton, pas de touche : rien de ce que
   fait le joueur ne mene au jeu. La seule chose qui se touche est la lettre
   « Ê » de « COMPTE À REBOURS AVANT LA BÊTA », qui ouvre un champ de code.

   DEUX CODES
     l'un ouvre le jeu tout de suite, pour qui doit y entrer avant l'heure ;
     l'autre joue un APERCU de la derniere minute et demie, puis revient au
     vrai compte a rebours — le jeu reste ferme.
   Ils ne sont pas ecrits ici. Seule leur EMPREINTE l'est : on peut verifier
   qu'un code est le bon sans pouvoir le lire dans le fichier. Pour en changer,
   voir tools/empreinte_code.py.

   ---------------------------------------------------------------------------
   CE QUE CET ECRAN PROTEGE, ET CE QU'IL NE PROTEGE PAS

   Le jeu est DEJA dans la page : ses fichiers sont telecharges avec le compte
   a rebours. Ce verrou tient donc contre tout ce qu'on fait avec un clavier,
   une souris, un doigt ou l'horloge de son ordinateur. Il ne tient pas contre
   quelqu'un qui ouvre les outils de developpement du navigateur et ecrit une
   ligne : aucun verrou pose dans une page ne le peut. Si la beta doit rester
   VRAIMENT invisible jusqu'a l'heure, il ne faut pas la publier avant — voir
   le README.

   L'HORLOGE N'EST PAS CELLE DE L'APPAREIL, quand on peut faire autrement.
   Avancer la date de son ordinateur est la premiere chose qu'on essaie. La
   page demande donc l'heure au serveur qui l'heberge (l'en-tete `Date` de sa
   propre reponse — aucun service exterieur), et compte ensuite avec une
   horloge que le reglage de l'appareil ne deplace pas. Autre benefice : tout le
   monde voit le zero au meme instant, y compris ceux dont l'horloge avance.
   Sans serveur (double-clic sur index.html), il ne reste que l'horloge locale.
   ========================================================================== */
'use strict';

const COMPTE = {
  ouverture: OUVERTURE_BETA,
  dateLisible: '27 NOVEMBRE 2026 À 20 H',
  apercuDepuis: 90,            // secondes : d'ou part l'apercu
  derniereMinute: 60,          // en deça, le compteur change de nature
  dureeOuverture: 4.4,         // duree de l'effet, a zero
  longueurCode: 12,
  /* Empreintes SHA-256 de « sel + CODE » (code en majuscules, sans espace).
     La valeur dit ce que fait le code. */
  sel: 'bradbitt-compte:',
  codes: {
    '60a93f1491ad37cba9cd3a5789f0072717a8dc8a82b7c54f25d58fed55583e2a': 'jouer',
    'c1cf5ce465c776a6f73cf60e30402b992c4d47c64e820cf58ab74afb91ae73bc': 'apercu',
  },
};

const compte = {
  actif: false,                // le jeu est ferme par le compte a rebours
  ouvertParCode: false,        // quelqu'un est entre avant l'heure
  // L'heure : un instant de reference, et l'horloge monotone a cet instant.
  ancreHeure: Date.now(),
  ancrePerf: performance.now(),
  ancreLocale: Date.now(),     // pour reperer un saut de l'horloge de l'appareil
  source: 'appareil',          // 'appareil' | 'serveur'
  apercu: null,                // { fin } pendant l'apercu
  ouverture: 0,                // > 0 : l'effet de zero est en cours
  accesDans: 0,                // > 0 : le bon code vient d'etre saisi
  t: 0,
  secondeVue: null,
  flash: 0,
  toast: '', toastT: 0,
  saisie: { ouverte: false, texte: '', message: '', messageT: 0, succes: false,
            essais: 0, blocage: 0 },
  titreOnglet: document.title,
};

/* -----------------------------------------------------------------------------
   1. L'HEURE
-------------------------------------------------------------------------- */

function heureCompte() {
  return compte.ancreHeure + (performance.now() - compte.ancrePerf);
}

/* Secondes avant l'ouverture. Pendant l'apercu, celles de l'apercu. */
function resteCompte() {
  if (compte.apercu) return (compte.apercu.fin - performance.now()) / 1000;
  return (COMPTE.ouverture - heureCompte()) / 1000;
}

function compteVerrouille() { return compte.actif; }

function ancrerCompte(heure, source) {
  compte.ancreHeure = heure;
  compte.ancrePerf = performance.now();
  compte.ancreLocale = Date.now();
  compte.source = source;
}

/* L'heure du serveur : l'en-tete `Date` de sa reponse a une requete sur la
   page elle-meme. Il est a la seconde pres ; on vise le milieu de cette
   seconde et le milieu de l'aller-retour. */
let synchroEnCours = false;

function synchroniserCompte() {
  if (!BETA || synchroEnCours) return;
  if (!/^https?:$/.test(location.protocol) || typeof fetch !== 'function') {
    ancrerCompte(Date.now(), 'appareil');
    appliquerHeureCompte();
    return;
  }
  synchroEnCours = true;
  const t0 = Date.now(), p0 = performance.now();
  let regle = false;
  const abandon = setTimeout(() => { regle = true; synchroEnCours = false; }, 6000);
  fetch(location.pathname + '?heure=' + t0, { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      const d = Date.parse(r.headers.get('Date') || '');
      if (regle || !isFinite(d)) return;
      const allerRetour = performance.now() - p0;
      ancrerCompte(d + 500 + allerRetour / 2, 'serveur');
      appliquerHeureCompte();
    })
    .catch(() => { /* hors ligne : on garde l'horloge qu'on a */ })
    .then(() => { clearTimeout(abandon); regle = true; synchroEnCours = false; });
}

/* L'heure vient de changer de source, ou d'etre corrigee. Si elle dit que la
   beta n'est pas ouverte alors que le jeu l'est — horloge de l'appareil en
   avance, reglee expres ou non — on referme. L'inverse (elle est ouverte, on
   compte encore) se regle tout seul a l'image suivante. */
function appliquerHeureCompte() {
  if (!BETA || compte.ouvertParCode) return;
  if (!compte.actif && (COMPTE.ouverture - heureCompte()) > 0) verrouillerCompte();
}

function verrouillerCompte() {
  compte.actif = true;
  compte.apercu = null; compte.ouverture = 0; compte.accesDans = 0;
  compte.secondeVue = null;
  compte.saisie.ouverte = false; compte.saisie.texte = '';
  // Si le jeu avait commence a s'ouvrir, on le remet a l'ecran d'accueil qu'il
  // retrouvera a l'heure dite.
  if (typeof demarrage !== 'undefined') { demarrage.lance = false; demarrage.t = 0; demarrage.finChargement = -1; }
  // La musique s'arrete — et celle qui serait encore en train de se charger
  // ne doit pas demarrer en arrivant : `demandee` est ce qu'elle consulte.
  if (typeof audio !== 'undefined') { audio.liberer(); audio.arreterMusique(0); audio.demandee = null; }
  if (typeof relacherTout === 'function') relacherTout();
  if (typeof confirmation !== 'undefined') confirmation = null;
  if (typeof CINEMA !== 'undefined') CINEMA = false;
  scene = 'compte';
  if (typeof reinitialiserDemo === 'function') reinitialiserDemo();
  chargerImagesCompte();
}

/* L'horloge de l'appareil a-t-elle saute ? (Reglage a la main, ou sortie de
   veille : l'horloge monotone peut s'arreter pendant que la machine dort.)
   On redemande alors l'heure. */
function surveillerHorlogeCompte() {
  const ecart = (Date.now() - compte.ancreLocale) - (performance.now() - compte.ancrePerf);
  if (Math.abs(ecart) > 2000) synchroniserCompte();
}

/* -----------------------------------------------------------------------------
   2. LES CODES

   SHA-256, ecrit ici plutot que demande au navigateur : `crypto.subtle`
   n'existe que dans une page « sure », et une page ouverte par double-clic ne
   l'est pas partout. Soixante lignes, sans dependance, verifiees contre la
   valeur de reference de « abc ».
-------------------------------------------------------------------------- */

const SHA_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Hex(texte) {
  const o = [];
  for (let i = 0; i < texte.length; i++) o.push(texte.charCodeAt(i) & 0xff);
  const bits = o.length * 8;
  o.push(0x80);
  while (o.length % 64 !== 56) o.push(0);
  for (let i = 7; i >= 0; i--) o.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 0xff);
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);
  const rot = (x, n) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < o.length; b += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = (o[b + 4 * i] << 24) | (o[b + 4 * i + 1] << 16) | (o[b + 4 * i + 2] << 8) | o[b + 4 * i + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let a = h[0], bb = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], k = h[7];
    for (let i = 0; i < 64; i++) {
      const t1 = (k + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i]) | 0;
      const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + bb) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + k) | 0;
  }
  return h.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

/* Ce que fait un code, ou null. On ne compare jamais deux textes : on calcule
   l'empreinte de ce qui est saisi et on regarde si elle est dans la table. */
function effetDuCode(saisie) {
  const code = String(saisie || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return null;
  return COMPTE.codes[sha256Hex(COMPTE.sel + code)] || null;
}

function ouvrirSaisieCompte() {
  if (compte.ouverture > 0 || compte.accesDans > 0) return;
  const s = compte.saisie;
  s.ouverte = true; s.texte = ''; s.message = ''; s.messageT = 0;
  audio.bruit('menu');
}

function fermerSaisieCompte() {
  compte.saisie.ouverte = false;
  compte.saisie.texte = '';
  audio.bruit('menu');
}

function tapeCodeCompte(c) {
  const s = compte.saisie;
  if (!s.ouverte || s.blocage > 0 || s.texte.length >= COMPTE.longueurCode) return;
  s.texte += c;
  audio.bruit('menu');
}

function effaceCodeCompte() {
  compte.saisie.texte = compte.saisie.texte.slice(0, -1);
  audio.bruit('menu');
}

function validerCodeCompte() {
  const s = compte.saisie;
  if (!s.ouverte || s.blocage > 0 || !s.texte) return;
  const effet = effetDuCode(s.texte);
  s.texte = '';
  if (effet === 'jouer') {
    s.message = 'Accès accordé.'; s.succes = true; s.messageT = 1.2;
    compte.accesDans = 0.9;
    audio.bruit('victoire');
  } else if (effet === 'apercu') {
    s.ouverte = false;
    lancerApercuCompte();
  } else {
    /* Trois erreurs de suite, et le champ se tait quelques secondes. Ce n'est
       pas ça qui arrete quelqu'un de decide — rien ici ne le peut — mais ça
       decourage de marteler le clavier au hasard. */
    s.essais++;
    s.succes = false;
    if (s.essais % 3 === 0) {
      s.blocage = 8;
      s.message = 'Le BRADDY3000 se méfie. Reviens dans quelques secondes.'; s.messageT = 8;
    } else {
      s.message = 'Code inconnu.'; s.messageT = 2.4;
    }
    audio.bruit('refus');
  }
}

/* -----------------------------------------------------------------------------
   3. L'APERCU, L'OUVERTURE
-------------------------------------------------------------------------- */

function direCompte(texte, duree) { compte.toast = texte; compte.toastT = duree || 4; }

function lancerApercuCompte() {
  compte.apercu = { fin: performance.now() + COMPTE.apercuDepuis * 1000 };
  compte.secondeVue = null;
  compte.ouverture = 0;
  audio.bruit('valider');
  direCompte('Aperçu : la dernière minute et demie. Le vrai compte à rebours, lui, continue.', 4.5);
}

function arreterApercuCompte(texte) {
  compte.apercu = null;
  compte.ouverture = 0;
  compte.secondeVue = null;
  confettis.length = 0;
  direCompte(texte || 'Fin de l\'aperçu.', 4.5);
}

function declencherOuvertureCompte() {
  compte.saisie.ouverte = false;
  compte.ouverture = COMPTE.dureeOuverture;
  // Au vrai zero, l'onglet cesse de dire « 00:01 ».
  if (!compte.apercu) document.title = compte.titreOnglet;
  compte.flash = 1;
  lancerConfettis(150, false);
  lancerConfettis(110, true);
  audio.fanfare();
}

function finirOuvertureCompte() {
  compte.ouverture = 0;
  if (compte.apercu) {
    // L'apercu montre la fin ; il n'OUVRE rien. Le second code serait sinon
    // une deuxieme cle du jeu, avec quatre-vingt-dix secondes d'attente.
    arreterApercuCompte('Fin de l\'aperçu. Le jeu reste fermé jusqu\'au vrai zéro.');
    return;
  }
  ouvrirLeJeuCompte(false);
}

function ouvrirLeJeuCompte(parCode) {
  compte.actif = false;
  compte.ouvertParCode = !!parCode;
  compte.apercu = null; compte.ouverture = 0; compte.accesDans = 0;
  compte.saisie.ouverte = false;
  confettis.length = 0;
  document.title = compte.titreOnglet;
  scene = 'accueil';
}

/* Le titre de l'onglet compte aussi : c'est ce qu'on voit quand le jeu attend
   dans un onglet a cote. */
function majTitreOngletCompte(reste) {
  const s = Math.max(0, Math.ceil(reste));
  const j = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600);
  const m = Math.floor(s % 3600 / 60), sec = s % 60;
  const deux = n => String(n).padStart(2, '0');
  const t = j > 0 ? 'J-' + j : (h > 0 ? h + ' h ' + deux(m) : deux(m) + ':' + deux(sec));
  const titre = t + ' · ' + compte.titreOnglet;
  if (document.title !== titre) document.title = titre;
}

function ticCompte(seconde) {
  if (seconde > COMPTE.derniereMinute || seconde <= 0) return;
  if (seconde <= 10) {
    audio.ton({ de: 880, vers: 660, duree: 0.16, forme: 'square', gain: 0.2 });
    audio.ton({ de: 220, vers: 110, duree: 0.2, forme: 'triangle', gain: 0.18 });
  } else {
    audio.ton({ de: seconde % 2 ? 520 : 440, vers: 400, duree: 0.07, forme: 'square', gain: 0.11 });
  }
}

function majCompte(dt) {
  compte.t += dt;
  majDemo(dt);
  majConfettis(dt);
  if (compte.flash > 0) compte.flash = Math.max(0, compte.flash - dt * 1.6);
  if (compte.toastT > 0) compte.toastT -= dt;
  const s = compte.saisie;
  if (s.messageT > 0) s.messageT -= dt;
  if (s.blocage > 0) s.blocage = Math.max(0, s.blocage - dt);

  if (compte.accesDans > 0) {
    compte.accesDans -= dt;
    if (compte.accesDans <= 0) ouvrirLeJeuCompte(true);
    return;
  }
  if (compte.ouverture > 0) {
    compte.ouverture -= dt;
    if (compte.ouverture <= 0) finirOuvertureCompte();
    return;
  }

  const reste = resteCompte();
  if (reste <= 0) { declencherOuvertureCompte(); return; }
  const seconde = Math.ceil(reste);
  if (seconde !== compte.secondeVue) {
    if (compte.secondeVue !== null) ticCompte(seconde);
    compte.secondeVue = seconde;
    if (!compte.apercu) majTitreOngletCompte(reste);
    if (seconde % 20 === 0) surveillerHorlogeCompte();
  }
}

/* -----------------------------------------------------------------------------
   4. LE CLAVIER

   Hors du champ de code, AUCUNE touche ne fait quoi que ce soit — sauf Echap,
   qui arrete un apercu. C'est cette fonction qui garantit qu'on ne « passe »
   pas l'ecran : elle ne contient aucun chemin vers le jeu.
-------------------------------------------------------------------------- */

function toucheCompte(e, lettre, annuler) {
  audio.debloquer();                       // un geste du joueur : le son est permis
  const s = compte.saisie;
  if (!s.ouverte) {
    if (annuler && compte.apercu && !(compte.ouverture > 0)) arreterApercuCompte('Aperçu interrompu.');
    return;
  }
  if (annuler) { fermerSaisieCompte(); return; }
  if (e.code === 'Backspace') { e.preventDefault(); effaceCodeCompte(); return; }
  if (!e.repeat && (e.code === 'Enter' || e.code === 'NumpadEnter')) { validerCodeCompte(); return; }
  if (/^[a-z0-9]$/.test(lettre)) tapeCodeCompte(lettre.toUpperCase());
}

/* -----------------------------------------------------------------------------
   5. LES CHIFFRES

   Des blocs, pas une police : cinq colonnes sur sept rangees, dessines
   rectangle par rectangle, comme les cases de la barre de vie. Le compteur
   reste ainsi le meme sur toutes les machines — une police systeme n'a pas la
   meme chasse sur Mac, Windows et Android, et un compte a rebours dont les
   chiffres changent de largeur danse a chaque seconde.
-------------------------------------------------------------------------- */

const CHIFFRES_BLOCS = [
  ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
];

/* Un chiffre en blocs, son coin haut-gauche en (x, y), `p` pixels par bloc. */
function chiffreBlocs(n, x, y, p, couleur, ombre) {
  const g = CHIFFRES_BLOCS[n];
  if (!g) return;
  for (let passe = ombre ? 0 : 1; passe < 2; passe++) {
    ctx.fillStyle = passe === 0 ? ombre : couleur;
    const d = passe === 0 ? Math.max(1, Math.round(p / 3)) : 0;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === '1') ctx.fillRect(x + c * p + d, y + r * p + d, p, p);
      }
    }
  }
  // Un reflet sur la rangee du haut de chaque bloc, comme sur les cases de vie.
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  const hr = Math.max(1, Math.round(p / 4));
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) if (g[r][c] === '1') ctx.fillRect(x + c * p, y + r * p, p, hr);
  }
}

/* -----------------------------------------------------------------------------
   6. LA DERNIERE MINUTE

   A soixante secondes, le compteur change de nature : plus que les secondes,
   en geant, et CHAQUE CHIFFRE A SA POLICE, son angle, sa taille, sa couleur —
   retires a chaque seconde. Le tirage part du numero de la seconde, pas du
   hasard : il est stable pendant la seconde, et tout le monde voit le meme.

   Les polices sont celles que le systeme a deja. Chaque entree finit par une
   famille generique (serif, cursive, monospace…) : la ou la premiere manque,
   le chiffre change quand meme d'allure.
-------------------------------------------------------------------------- */

const POLICES_FINALE = [
  'bold {t}px Impact, "Arial Black", sans-serif',
  'bold {t}px "Courier New", Courier, monospace',
  'italic bold {t}px Georgia, "Times New Roman", serif',
  'bold {t}px "Comic Sans MS", "Chalkboard SE", "Comic Neue", cursive',
  '{t}px "Times New Roman", Times, serif',
  'bold {t}px "Arial Black", "Helvetica Neue", Arial, sans-serif',
  'bold {t}px Menlo, Consolas, "DejaVu Sans Mono", monospace',
  'italic {t}px "Brush Script MT", "Snell Roundhand", "Segoe Script", cursive',
  'bold {t}px Papyrus, "Copperplate", fantasy',
  'bold {t}px "Trebuchet MS", Verdana, sans-serif',
  'bold {t}px "American Typewriter", Rockwell, "Courier New", serif',
  'BLOCS',                                   // les chiffres du compteur, en geant
];

const COULEURS_FINALE = ['#e8b62c', '#f2f3f8', '#d0453f', '#6fd0e8', '#7ee08a', '#ff7ab8', '#b08cff', '#ffa24a'];

function aleaCompte(graine) {
  let t = (graine + 0x6D2B79F5) | 0;
  return function () {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* L'allure de chacun des deux chiffres, pour chacune des soixante dernieres
   secondes. Jamais la meme police ni la meme couleur cote a cote, et jamais
   celles que CE chiffre avait a la seconde d'avant : sinon un tirage sur douze
   ne change rien, et on croit l'effet en panne.

   La table se construit d'un coup, de 60 vers 0 : chaque seconde connait ainsi
   ce que la precedente a VRAIMENT tire. (Recalculer « la seconde d'avant » a
   la volee ne marche pas : elle depend elle-meme de celle d'encore avant.) */
let ALLURES_FINALE = null;

function construireAlluresFinale() {
  const table = [];
  let avant = null;
  for (let s = COMPTE.derniereMinute; s >= 0; s--) {
    const paire = [];
    for (let rang = 0; rang < 2; rang++) {
      const rnd = aleaCompte(s * 97 + rang * 13 + 5);
      const voisins = [];
      if (avant) voisins.push(avant[rang]);
      if (rang === 1) voisins.push(paire[0]);
      const tirer = (n, cle) => {
        let v;
        do { v = Math.floor(rnd() * n); } while (voisins.some(a => a[cle] === v));
        return v;
      };
      const police = tirer(POLICES_FINALE.length, 'police');
      const couleur = tirer(COULEURS_FINALE.length, 'couleur');
      // Toujours penche, d'un cote ou de l'autre : de 4 a 24 degres.
      const sens = rnd() < 0.5 ? -1 : 1;
      paire.push({
        police, couleur,
        angle: sens * (0.07 + rnd() * 0.35),
        echelle: 0.82 + rnd() * 0.42,
        dy: Math.round((rnd() * 2 - 1) * 5),
      });
    }
    table[s] = paire;
    avant = paire;
  }
  return table;
}

function alluresFinale(seconde) {
  if (!ALLURES_FINALE) ALLURES_FINALE = construireAlluresFinale();
  return ALLURES_FINALE[Math.max(0, Math.min(COMPTE.derniereMinute, seconde))];
}

/* LA PLACE D'UN CHIFFRE. Un cadre qu'il ne depasse pas, tourne ou non, quelle
   que soit la police que le systeme a trouvee : sans lui, un « 6 » en Impact
   penche de vingt degres recouvrait le titre — et le « Ê » avec. On MESURE
   l'encre du chiffre (pas la boite de la police, qui compte du vide), on
   calcule ce qu'elle occupe une fois tournee, et on reduit si besoin. */
const CADRE_FINALE = { l: 114, h: 122 };

function dessinerChiffreFinale(n, cx, cy, allure, taille, pop) {
  const couleur = COULEURS_FINALE[allure.couleur];
  const modele = POLICES_FINALE[allure.police];
  const texte = String(n);
  let l, h, tracer;
  if (modele === 'BLOCS') {
    const p = Math.round(taille * 0.72 / 7);       // la hauteur d'une capitale
    l = 5 * p; h = 7 * p;
    tracer = () => chiffreBlocs(n, -l / 2, -h / 2, p, couleur, 'rgba(0,0,0,.6)');
  } else {
    ctx.font = modele.replace('{t}', String(taille));
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const m = ctx.measureText(texte);
    const connu = isFinite(m.actualBoundingBoxAscent) && isFinite(m.actualBoundingBoxRight);
    const gauche = connu ? m.actualBoundingBoxLeft : 0;
    const droite = connu ? m.actualBoundingBoxRight : m.width;
    const haut = connu ? m.actualBoundingBoxAscent : taille * 0.72;
    const bas = connu ? m.actualBoundingBoxDescent : 0;
    l = Math.max(1, gauche + droite); h = Math.max(1, haut + bas);
    const ox = gauche - l / 2, oy = haut - h / 2;  // l'encre centree sur (0, 0)
    tracer = () => {
      ctx.font = modele.replace('{t}', String(taille));
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillText(texte, ox + 4, oy + 5);
      ctx.fillStyle = couleur;
      ctx.fillText(texte, ox, oy);
    };
  }
  const c = Math.abs(Math.cos(allure.angle)), s = Math.abs(Math.sin(allure.angle));
  const e = Math.min(allure.echelle, CADRE_FINALE.l / (l * c + h * s), CADRE_FINALE.h / (h * c + l * s));
  ctx.save();
  ctx.translate(cx, cy + allure.dy);
  ctx.rotate(allure.angle);
  ctx.scale(e * pop, e * pop);
  tracer();
  ctx.restore();
  return { l: (l * c + h * s) * e, h: (h * c + l * s) * e };      // ce qu'il occupe, pour la suite de tests
}

const FINALE_Y = 157;          // le centre des deux chiffres
const FINALE_ECART = 62;       // de part et d'autre du milieu

function dessinerDerniereMinuteCompte(reste) {
  const seconde = Math.max(0, Math.ceil(reste));
  const dans = Math.min(1, seconde - reste);            // 0 -> 1 au fil de la seconde
  const urgence = seconde <= 10;

  // Le fond bat avec les secondes : un halo qui s'eteint, rouge sur les dix
  // dernieres.
  const halo = Math.max(0, 1 - dans * 2.2);
  ctx.fillStyle = (urgence ? 'rgba(208,69,63,' : 'rgba(232,182,44,') + (halo * (urgence ? 0.3 : 0.12)).toFixed(3) + ')';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  const allures = alluresFinale(seconde);
  // Chaque chiffre « pousse » a sa place au debut de la seconde. Il grandit
  // jusqu'a sa taille, il ne la depasse pas : le cadre tient aussi pendant
  // l'effet.
  const pousse = Math.max(0, 1 - dans / 0.16);
  const pop = 1 - 0.34 * pousse * pousse;
  const taille = urgence ? 150 : 124;
  const tremble = urgence ? Math.round(Math.sin(compte.t * 71) * 2 * (1 - dans)) : 0;
  const dizaine = Math.floor(seconde / 10), unite = seconde % 10;
  dessinerChiffreFinale(dizaine, LARGEUR / 2 - FINALE_ECART + tremble, FINALE_Y, allures[0], taille, pop);
  dessinerChiffreFinale(unite, LARGEUR / 2 + FINALE_ECART - tremble, FINALE_Y, allures[1], taille, pop);

  texteCentre(seconde > 1 ? 'SECONDES' : 'SECONDE', 244, 'bold 10px system-ui, sans-serif',
              urgence ? '#ff9a8c' : 'rgba(255,255,255,.6)');
}

/* -----------------------------------------------------------------------------
   7. LE RENDU
-------------------------------------------------------------------------- */

/* Une ligne ecrite lettre par lettre, avec un blanc regle entre les lettres.
   Rend la place de chacune : c'est ce qui permet de poser la zone cliquable
   exactement sous le « Ê », quelle que soit la police du systeme. */
function ligneLettresCompte(texte, y, police, couleur, blanc) {
  ctx.font = police;
  ctx.textAlign = 'left';
  const lettres = Array.from(texte);
  const largeurs = lettres.map(l => ctx.measureText(l).width);
  const total = largeurs.reduce((a, b) => a + b, 0) + blanc * (lettres.length - 1);
  let x = Math.round((LARGEUR - total) / 2);
  const places = [];
  ctx.fillStyle = couleur;
  lettres.forEach((l, i) => {
    ctx.fillText(l, x, y);
    places.push({ lettre: l, x, w: largeurs[i] });
    x += largeurs[i] + blanc;
  });
  return { places, x0: Math.round((LARGEUR - total) / 2), x1: x - blanc };
}

const TITRE_COMPTE = 'COMPTE À REBOURS AVANT LA BÊTA';

function dessinerEnteteCompte() {
  texteCentre('BRAD BITT', 40, 'bold 26px system-ui, sans-serif', '#f2f3f8');
  texteCentre('mais le jeu', 56, 'italic 12px system-ui, sans-serif', '#e8b62c');

  const y = 86;
  const ligne = ligneLettresCompte(TITRE_COMPTE, y, 'bold 12px system-ui, sans-serif', '#e8b62c', 2.5);
  // Deux rangees de blocs de part et d'autre, pour l'asseoir.
  ctx.fillStyle = 'rgba(232,182,44,.45)';
  for (let k = 0; k < 5; k++) {
    ctx.fillRect(ligne.x0 - 14 - k * 7, y - 7, 4, 4);
    ctx.fillRect(ligne.x1 + 10 + k * 7, y - 7, 4, 4);
  }
  /* La seule chose qui se touche sur cet ecran. La zone est DISCRETE : le
     curseur ne change pas en passant dessus (voir rendu(), js/jeu.js) — une
     main qui apparait au-dessus d'une lettre, c'est une porte qui s'annonce. */
  const e = ligne.places.find(p => p.lettre === 'Ê');
  if (e && !compte.saisie.ouverte && !(compte.ouverture > 0)) {
    zone(e.x - 4, y - 16, e.w + 8, 22, 'compte-e');
    zones[zones.length - 1].discret = true;
  }
}

function plaqueCompte(x, y, l, h) {
  ctx.fillStyle = 'rgba(9,11,20,.82)';
  ctx.fillRect(x, y, l, h);
  ctx.strokeStyle = 'rgba(232,182,44,.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + .5, y + .5, l - 1, h - 1);
  ctx.fillStyle = 'rgba(232,182,44,.5)';
  ctx.fillRect(x, y, l, 2);
}

function dessinerCompteurCompte(reste) {
  const s = Math.max(0, Math.ceil(reste));
  const valeurs = [
    [Math.floor(s / 86400), 'JOURS', 'JOUR'],
    [Math.floor(s % 86400 / 3600), 'HEURES', 'HEURE'],
    [Math.floor(s % 3600 / 60), 'MINUTES', 'MINUTE'],
    [s % 60, 'SECONDES', 'SECONDE'],
  ];
  const lp = 90, hp = 70, ecart = 14, y = 100;
  const x0 = Math.round((LARGEUR - (4 * lp + 3 * ecart)) / 2);
  valeurs.forEach(([v, pluriel, singulier], i) => {
    const x = x0 + i * (lp + ecart);
    plaqueCompte(x, y, lp, hp);
    const texte = String(v).padStart(2, '0');
    // Trois chiffres de jours : des blocs plus petits, la plaque ne bouge pas.
    const p = texte.length > 2 ? 4 : 6;
    const lc = 5 * p, blanc = p;
    const total = texte.length * lc + (texte.length - 1) * blanc;
    let cx = x + Math.round((lp - total) / 2);
    const cy = y + 9 + Math.round((42 - 7 * p) / 2);
    for (const c of texte) {
      chiffreBlocs(Number(c), cx, cy, p, i === 3 ? '#e8b62c' : '#f2f3f8', 'rgba(0,0,0,.55)');
      cx += lc + blanc;
    }
    texteCentreEn(v > 1 ? pluriel : singulier, x + lp / 2, y + hp - 7,
                  'bold 8px system-ui, sans-serif', 'rgba(255,255,255,.5)');
    // Les deux points, entre deux plaques : ils battent la seconde.
    if (i < 3) {
      const allume = (reste % 1) > 0.5;
      ctx.fillStyle = allume ? '#e8b62c' : 'rgba(232,182,44,.3)';
      ctx.fillRect(x + lp + ecart / 2 - 2, y + 24, 4, 4);
      ctx.fillRect(x + lp + ecart / 2 - 2, y + 38, 4, 4);
    }
  });

  // Une seule ligne, au-dessus de la plateforme du decor : sur deux lignes,
  // la seconde tombait dessus.
  texteCentre('OUVERTURE LE ' + COMPTE.dateLisible + '  ·  HEURE DE PARIS', y + hp + 13,
              'bold 9px system-ui, sans-serif', 'rgba(255,255,255,.62)');
}

/* CE QUE DIT LE BRADDY3000 EN ATTENDANT. Une phrase selon le temps qu'il
   reste, qui tourne toutes les neuf secondes. */
const REPLIQUES_COMPTE = [
  [14 * 86400, ['Je compte les secondes. Toutes. Je n\'ai que ça à faire.',
                'Brad dort. Moi je surveille le compteur. Chacun son talent.',
                'La base est presque montée. Il manque une vis. Je sais laquelle.']],
  [2 * 86400, ['Plus que quelques jours. J\'ai dépoussiéré la borne d\'arcade.',
               'Les Serra répètent. Je les entends d\'ici. C\'est inquiétant.',
               'J\'ai compté les Brad Coins. Deux fois. Il en manque toujours un.']],
  [86400, ['Demain. J\'ai vérifié trois fois : c\'est demain.',
           'Dors. Moi je ne dors pas, je suis un robot. C\'est pratique.']],
  [3600, ['Quelques heures. Ne reste pas debout, tu vas rayer le sol.',
          'Je chauffe les enceintes. Elles n\'aiment pas démarrer à froid.']],
  [60, ['Moins d\'une heure. Ne touche à rien.',
        'Ça y est presque. J\'ai dit : ne touche à rien.']],
];

function repliqueCompte(reste) {
  for (const [seuil, phrases] of REPLIQUES_COMPTE) {
    if (reste > seuil) return phrases[Math.floor(compte.t / 9) % phrases.length];
  }
  return '';
}

/* Le robot en petit, a gauche de sa phrase : les memes rectangles que dans la
   base, a la meme palette. */
function dessinerBraddyCompte(x, y) {
  const flotte = Math.round(Math.sin(compte.t * 1.6) * 2);
  y += flotte;
  ctx.fillStyle = '#39415a'; ctx.fillRect(x - 9, y - 10, 18, 16);
  ctx.fillStyle = '#4d5678'; ctx.fillRect(x - 9, y - 10, 18, 3);
  ctx.fillStyle = '#0e1420'; ctx.fillRect(x - 6, y - 6, 12, 8);
  const oeil = Math.round(Math.sin(compte.t * 0.9) * 3);
  ctx.fillStyle = '#6fd0e8'; ctx.fillRect(x - 2 + oeil, y - 5, 4, 5);
  ctx.fillStyle = '#4d5678'; ctx.fillRect(x - 1, y - 15, 2, 5);
  ctx.fillStyle = '#e8b62c'; ctx.fillRect(x - 2, y - 17, 3, 3);
  ctx.fillStyle = 'rgba(111,208,232,' + (0.25 + 0.2 * Math.sin(compte.t * 8)).toFixed(2) + ')';
  ctx.fillRect(x - 5, y + 6, 10, 3);
}

function dessinerRepliqueCompte(reste) {
  const texte = repliqueCompte(reste);
  if (!texte) return;
  ctx.font = 'italic 10px system-ui, sans-serif';
  const l = ctx.measureText(texte).width;
  const x = Math.round((LARGEUR - l) / 2) + 12, y = 228;
  ctx.fillStyle = 'rgba(9,11,20,.6)';
  ctx.fillRect(x - 34, y - 13, l + 44, 20);
  dessinerBraddyCompte(x - 18, y - 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(223,230,242,.85)';
  ctx.font = 'italic 10px system-ui, sans-serif';
  ctx.fillText(texte, x, y + 1);
}

function dessinerOuvertureCompte() {
  const age = COMPTE.dureeOuverture - compte.ouverture;
  // Le zero reste une demi-seconde, puis le mot arrive.
  if (age < 0.55) {
    const pousse = Math.max(0, 1 - age / 0.2);
    dessinerChiffreFinale(0, LARGEUR / 2, FINALE_Y,
                          { police: POLICES_FINALE.length - 1, couleur: 0, angle: 0, echelle: 1.4, dy: 0 }, 150,
                          1 - 0.34 * pousse * pousse);
    return;
  }
  const a = Math.min(1, (age - 0.55) / 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(LARGEUR / 2, 142);
  ctx.scale(1.12 - 0.12 * a, 1.12 - 0.12 * a);
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillText('LA BÊTA EST OUVERTE', 2, 3);
  ctx.fillStyle = '#e8b62c';
  ctx.fillText('LA BÊTA EST OUVERTE', 0, 0);
  ctx.restore();
  texteCentre('Introduction et trois niveaux, ' + DATES_BETA + '.', 174,
              'italic 11px system-ui, sans-serif', 'rgba(255,255,255,.7)', a);
}

/* LE CHAMP DE CODE. Le meme clavier a l'ecran que celui du jukebox : sur
   telephone il n'y en a pas d'autre, et sur ordinateur il dit qu'on peut
   taper. */
function dessinerSaisieCompte() {
  const s = compte.saisie;
  ctx.fillStyle = 'rgba(9,11,20,.86)';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  // Le fond avale les clics : rien de ce qui est dessous ne doit repondre.
  zone(0, 0, LARGEUR, HAUTEUR, 'compte-fond');

  const l = 440, h = 252, x = (LARGEUR - l) / 2, y = (HAUTEUR - h) / 2;
  ctx.fillStyle = 'rgba(24,28,42,.98)';
  ctx.fillRect(x, y, l, h);
  ctx.strokeStyle = 'rgba(232,182,44,.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + .5, y + .5, l - 1, h - 1);

  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = ACCENT;
  ctx.fillText('UN CODE ?', x + 18, y + 26);
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.fillText('Tu as trouvé la lettre. Il te manque le mot.', x + 18, y + 41);

  // Le champ
  const lc = 230, xc = (LARGEUR - lc) / 2, yc = y + 54;
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.fillRect(xc, yc, lc, 30);
  ctx.strokeStyle = s.blocage > 0 ? 'rgba(226,85,59,.6)' : 'rgba(232,182,44,.5)';
  ctx.strokeRect(xc + .5, yc + .5, lc - 1, 29);
  const curseur = s.blocage <= 0 && Math.sin(compte.t * 5) > 0 ? '_' : ' ';
  texteCentreEn(s.texte + curseur, xc + lc / 2, yc + 21, 'bold 16px monospace, monospace', '#ffe9a8');

  // Le clavier
  const cw = 30, ch = 22;
  let ky = yc + 42;
  for (const rangee of CLAVIER_CODE) {
    let kx = (LARGEUR - rangee.length * cw) / 2;
    for (const c of rangee) {
      const survol = souris.survol && souris.survol.action === 'compte-touche' && souris.survol.valeur === c;
      ctx.fillStyle = survol ? 'rgba(232,182,44,.25)' : 'rgba(255,255,255,.06)';
      ctx.fillRect(kx + 1, ky, cw - 2, ch);
      texteCentreEn(c, kx + cw / 2, ky + 15, '11px system-ui, sans-serif',
                    survol ? '#ffe9a8' : 'rgba(255,255,255,.7)');
      zone(kx + 1, ky, cw - 2, ch, 'compte-touche', c);
      kx += cw;
    }
    ky += ch + 3;
  }

  // Effacer · Valider · Fermer
  const bl = 104, by = ky + 6;
  [['Effacer', 'compte-effacer', LARGEUR / 2 - bl * 1.5 - 8, false],
   ['Valider', 'compte-valider', LARGEUR / 2 - bl / 2, true],
   ['Fermer', 'compte-fermer', LARGEUR / 2 + bl / 2 + 8, false]].forEach(([nom, action, bx, primaire]) => {
    const survol = souris.survol && souris.survol.action === action;
    ctx.fillStyle = primaire ? (survol ? 'rgba(232,182,44,.32)' : 'rgba(232,182,44,.16)')
                             : (survol ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.06)');
    ctx.fillRect(bx, by, bl, 24);
    ctx.strokeStyle = primaire ? '#e8b62c' : 'rgba(255,255,255,.22)';
    ctx.strokeRect(bx + .5, by + .5, bl - 1, 23);
    texteCentreEn(nom, bx + bl / 2, by + 16, (primaire ? 'bold ' : '') + '12px system-ui, sans-serif',
                  primaire ? '#ffe9a8' : 'rgba(255,255,255,.7)');
    zone(bx, by, bl, 24, action);
  });

  if (s.messageT > 0) {
    texteCentre(s.message, by + 44, '11px system-ui, sans-serif',
                s.succes ? '#7ee08a' : '#e2553b', Math.min(1, s.messageT));
  } else {
    texteCentre(estTactile ? 'Touche les lettres' : 'Tape au clavier  ·  Entrée valider  ·  Échap fermer',
                by + 44, '9px system-ui, sans-serif', 'rgba(255,255,255,.3)');
  }
}

function dessinerCompte() {
  // Le fond du menu : Brad joue tout seul, les Serra entrent par les cotes.
  dessinerDemo();
  const reste = resteCompte();

  dessinerEnteteCompte();
  if (compte.ouverture > 0) dessinerOuvertureCompte();
  else if (reste <= COMPTE.derniereMinute) dessinerDerniereMinuteCompte(reste);
  else { dessinerCompteurCompte(reste); dessinerRepliqueCompte(reste); }

  dessinerConfettis();
  if (compte.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (compte.flash * 0.9).toFixed(3) + ')';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }
  // La fin de l'effet redescend au noir : l'ecran d'accueil qui suit l'est.
  if (compte.ouverture > 0 && compte.ouverture < 0.7) {
    ctx.fillStyle = 'rgba(10,12,20,' + (1 - compte.ouverture / 0.7).toFixed(3) + ')';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  }

  // En bas : d'ou vient l'heure, et la version. Deux lignes pour qui cherche
  // pourquoi son compteur n'est pas celui du voisin.
  ctx.font = '8px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.24)';
  ctx.fillText(compte.source === 'serveur' ? 'heure du serveur' : 'heure de cet appareil', 8, HAUTEUR - 8);
  ctx.textAlign = 'right';
  ctx.font = '9px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(255,255,255,.26)';
  ctx.fillText('v' + versionLisible(), LARGEUR - 8, HAUTEUR - 8);
  ctx.textAlign = 'left';

  if (compte.toastT > 0 && !compte.saisie.ouverte) {
    ctx.font = '10px system-ui, sans-serif';
    const l = ctx.measureText(compte.toast).width + 24;
    const a = Math.min(1, compte.toastT / 0.5);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(10,12,20,.9)';
    ctx.fillRect((LARGEUR - l) / 2, HAUTEUR - 44, l, 22);
    ctx.strokeStyle = 'rgba(111,208,232,.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect((LARGEUR - l) / 2 + .5, HAUTEUR - 43.5, l - 1, 21);
    ctx.restore();
    texteCentre(compte.toast, HAUTEUR - 29, '10px system-ui, sans-serif', '#dfe6f2', a);
  }

  if (compte.saisie.ouverte) dessinerSaisieCompte();
}

/* Sur l'ecran d'accueil, pour qui est entre avec un code : dire que c'est en
   avance, et jusqu'a quand. Sinon on ne sait plus si le compte a rebours est
   fini ou si l'on est passe a cote. */
function dessinerRappelAccesCompte() {
  if (!BETA || !compte.ouvertParCode) return;
  const reste = (COMPTE.ouverture - heureCompte()) / 1000;
  if (reste <= 0) return;
  texteCentre('Accès anticipé  ·  ouverture publique le ' + COMPTE.dateLisible.toLowerCase(),
              186, '9px system-ui, sans-serif', 'rgba(111,208,232,.75)');
}

/* -----------------------------------------------------------------------------
   8. AU CHARGEMENT

   Le verrou se pose ICI, avant que la boucle du jeu ne dessine sa premiere
   image : ce fichier est charge avant js/jeu.js. L'ecran d'accueil ne
   s'affiche donc pas une seule image avant le compte a rebours.

   Si l'horloge de l'appareil dit que c'est ouvert, on la croit — pour ne pas
   faire attendre, une fois la beta lancee, tous ceux dont l'horloge est juste.
   Mais on demande quand meme l'heure au serveur, et s'il dit le contraire on
   referme (appliquerHeureCompte).
-------------------------------------------------------------------------- */

/* Les trois images dont le fond a besoin. Le reste du jeu se charge au clic
   sur « Jouer », comme avant : un visiteur qui vient regarder un compteur n'a
   pas a telecharger cinquante megaoctets de musique. */
function chargerImagesCompte() {
  const charger = (src, rangement, cle, apres) => {
    if (rangement[cle]) return;
    const img = new Image();
    img.onload = () => { if (!rangement[cle]) rangement[cle] = img; if (apres) apres(); };
    img.src = src;
  };
  charger(PLANCHES_UNIFORMES.classique, planchesBrad, 'classique',
          () => { if (!bradPret) appliquerUniforme('classique'); });
  ['Serra', 'Serra-Boost', 'Serra-Volant'].forEach(n =>
    charger('assets/ennemis/' + n + '.png', sprites, n));
}

if (BETA) {
  if (Date.now() < COMPTE.ouverture) {
    compte.actif = true;
    scene = 'compte';
    chargerImagesCompte();
  }
  synchroniserCompte();
  // L'heure se redemande de temps en temps, et quand l'onglet revient devant.
  setInterval(() => { if (compte.actif) synchroniserCompte(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && compte.actif) synchroniserCompte();
  });
}
