/* =============================================================================
   BRAD BITT — suite de verification de la BETA

   La suite principale (verif.mjs) teste l'edition finale. Celle-ci teste le
   fichier TEL QU'IL EST LIVRE : js/edition.js avec BETA a true.

   Elle se termine par le test qui compte le plus : gagner le skin en beta,
   puis recharger la MEME adresse en edition finale, et verifier qu'il y est
   toujours. Puis la meme chose a une AUTRE adresse, pour prouver qu'il n'y est
   pas — c'est l'avertissement qu'on donne au studio, et il merite d'etre
   mesure plutot qu'affirme.

   Lancement :  node tools/verif-beta.mjs
   ========================================================================== */
import { demarrer, relancerPage, compteur, MANQUES_ADMIS, RACINE } from './socle.mjs';
import fs from 'fs';
import path from 'path';

const { serveur, navigateur, page, erreurs, introuvables, changerEdition } =
  await demarrer({ port: 8201 });            // sans option : le fichier tel quel
const { verifier, bilan } = compteur();

/* Capture le texte ecrit a l'ecran pendant un rendu. C'est plus fiable que de
   lire des pixels pour savoir CE QUI EST DIT : on intercepte fillText. */
async function texteAffiche(prep) {
  return page.evaluate(p => {
    const lu = [];
    const vrai = ctx.fillText;
    ctx.fillText = function (t, ...r) { lu.push(String(t)); return vrai.call(this, t, ...r); };
    try { eval(p); rendu(); } finally { ctx.fillText = vrai; }
    // Recolle avec une ESPACE : un paragraphe coupe en lignes (« …la version » /
    // « finale, le… ») doit se relire comme la phrase qu'il est.
    return lu.join(' ');
  }, prep);
}

/* --- A. Chargement -------------------------------------------------------- */
console.log('\nA. CHARGEMENT DE LA BETA');
const debut = await page.evaluate(() => ({
  beta: BETA, titre: document.title, version: versionLisible(),
}));
verifier('le fichier livre est bien en beta', debut.beta === true);
verifier('l\'onglet le dit', /bêta/.test(debut.titre), debut.titre);
verifier('la version lisible porte « bêta »', /^\d+\.\d+ bêta$/.test(debut.version), debut.version);
verifier('aucune erreur de console au demarrage', erreurs.length === 0, erreurs.slice(0, 2).join(' | '));

/* --- B. Le menu ----------------------------------------------------------- */
console.log('\nB. LE MENU');
const splash = await page.evaluate(() => {
  retourAuMenu(); rendu();
  const d = ctx.getImageData(0, 0, LARGEUR, 140).data;
  let jaunes = 0, xmin = 1e9;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 230 && d[i + 1] > 230 && d[i + 2] < 60) {
      jaunes++; xmin = Math.min(xmin, (i / 4) % LARGEUR);
    }
  }
  return { jaunes, xmin, milieu: LARGEUR / 2 };
});
verifier('« Bêta ! » est ecrit en jaune pres du titre',
  splash.jaunes > 40 && splash.xmin > splash.milieu, splash.jaunes + ' pixels jaunes, a partir de x=' + splash.xmin);
const menuTexte = await texteAffiche(`retourAuMenu();`);
verifier('le numero de version affiche « bêta »', /v\d+\.\d+ bêta/.test(menuTexte));
verifier('le splash dit bien « Bêta ! »', /Bêta !/.test(menuTexte));

/* --- C. Nouvelle partie --------------------------------------------------- */
console.log('\nC. NOUVELLE PARTIE');
const avis = await page.evaluate(() => {
  effacerPartie();
  retourAuMenu();
  indexMenu = MENU_PRINCIPAL.findIndex(e => e.cle === 'nouvelle');
  menuValider();
  const s1 = scene;
  rendu();
  const lien = !!zones.find(z => z.action === 'ecrire-studio');
  // « Retour » : on revient au menu, rien d'autre ne s'est passe.
  annulerAvisBeta();
  const s2 = scene;
  // Et cette fois on accepte : sans partie, on arrive au choix de difficulte.
  menuValider();
  validerAvisBeta();
  const s3 = scene;
  // Avec une partie existante, la question d'ecrasement vient APRES l'avis.
  retourAuMenu();
  partie.termines = ['intro']; partie.existe = true;
  menuValider();
  const s4 = scene;
  validerAvisBeta();
  const confirmationOuverte = !!confirmation;
  const texteConfirmation = confirmation ? confirmation.texte || '' : '';
  confirmation = null;
  retourAuMenu();
  return { s1, lien, s2, s3, s4, confirmationOuverte, texteConfirmation };
});
verifier('« Nouvelle partie » ouvre l\'avertissement de beta', avis.s1 === 'avisbeta', avis.s1);
verifier('l\'adresse du studio y est cliquable', avis.lien);
verifier('« Retour » ramene au menu', avis.s2 === 'menu', avis.s2);
verifier('« C\'est parti » mene au choix de difficulte', avis.s3 === 'difficulte', avis.s3);
verifier('l\'avertissement passe AVANT la question d\'ecrasement',
  avis.s4 === 'avisbeta' && avis.confirmationOuverte, avis.s4);
const avisTexte = await texteAffiche(`ouvrirAvisBeta(() => {});`);
verifier('il parle de bugs et donne l\'adresse',
  /bugs plus ou moins mineurs/.test(avisTexte) && /imaginestudio\.hwr@gmail\.com/.test(avisTexte));
await page.evaluate(() => { retourAuMenu(); });

/* --- D. Les niveaux ------------------------------------------------------- */
console.log('\nD. LES NIVEAUX');
const niveaux = await page.evaluate(() => {
  effacerPartie();
  // Une partie « venue d'une version de test » : TOUT est termine.
  partie.termines = ORDRE_NIVEAUX.slice();
  partie.existe = true;
  const ouverts = ORDRE_NIVEAUX.filter(id => niveauDebloque(id));
  // Tenter de partir au niveau 4 depuis la carte.
  reinitialiserHub();
  scene = 'carte';
  indexCarte = ORDRE_NIVEAUX.indexOf('niveau4');
  lancerNiveauCourant();
  const apresTentative = scene;
  // Le portail, meme avec le manoir fait.
  partie.manoirFait = true;
  const portail = postesActifs().some(p => p.cle === 'portail');
  const entrainement = postesActifs().some(p => p.cle === 'entrainement');
  effacerPartie();
  retourAuMenu();
  return { ouverts, apresTentative, portail, entrainement };
});
verifier('seuls intro et niveaux 1 a 3 s\'ouvrent, meme avec une partie qui a tout fini',
  JSON.stringify(niveaux.ouverts) === JSON.stringify(['intro', 'niveau1', 'niveau2', 'niveau3']),
  niveaux.ouverts.join(','));
verifier('partir au niveau 4 depuis la carte est refuse', niveaux.apresTentative === 'carte',
  niveaux.apresTentative);
verifier('le portail du monde reel n\'apparait pas', !niveaux.portail);
verifier('le camp d\'entrainement, lui, reste ouvert', niveaux.entrainement);
const carteTexte = await texteAffiche(
  `reinitialiserHub(); partie.termines = ['intro']; indexCarte = 5; scene = 'carte';`);
verifier('la carte annonce la suite a la sortie',
  /À LA SORTIE/.test(carteTexte) && /9 janvier 2027/.test(carteTexte));
await page.evaluate(() => { effacerPartie(); retourAuMenu(); });

/* --- E. Les uniformes ----------------------------------------------------- */
console.log('\nE. LES UNIFORMES');
const unif = await page.evaluate(() => {
  effacerPartie();
  // Tout ce qui peut s'obtenir est obtenu — la beta doit quand meme filtrer.
  partie.termines = ORDRE_NIVEAUX.slice();
  partie.ennemisTotal = 9999; partie.pieces = 9999; partie.meilleurArcade = 99999;
  partie.entrainements = 9; partie.finalGagne = true;
  AMELIORATIONS.forEach(a => { partie.ameliorations[a.cle] = a.paliers; });
  partie.codesUniformes = ['FNAM3RL'];
  accorderRecompense('beta-testeur');
  const ouverts = UNIFORMES.filter(u => uniformeDebloque(u)).map(u => u.cle);

  // Le seuil de la cravate violette.
  const violette = UNIFORMES.find(u => u.cle === 'classique-violet');
  partie.meilleurArcade = 999; const a999 = uniformeDebloque(violette);
  partie.meilleurArcade = 1000; const a1000 = uniformeDebloque(violette);

  // FNAM3RL : reconnu, pas enregistre.
  partie.codesUniformes = [];
  vestiaireCode.saisie = 'fnam3rl';
  validerCodeVestiaire();
  const messageCode = vestiaireCode.message;
  const codeStocke = partie.codesUniformes.indexOf('FNAM3RL') >= 0;

  // Un uniforme hors beta, porte par une vieille partie, ne s'affiche pas.
  partie.uniforme = 'dore';
  appliquerUniforme('dore');
  const affiche = imgBrad === planchesBrad['classique'];

  effacerPartie();
  return { ouverts, a999, a1000, messageCode, codeStocke, affiche,
           nb: UNIFORMES.length };
});
verifier('exactement quatre uniformes s\'ouvrent en beta',
  JSON.stringify(unif.ouverts.sort()) ===
  JSON.stringify(['beta-testeur', 'classique', 'classique-turquoise', 'classique-violet']),
  unif.ouverts.join(','));
verifier('la cravate violette demande 1000 points, pas 999', !unif.a999 && unif.a1000);
verifier('FNAM3RL est reconnu et annonce pour la sortie',
  /Code reconnu/.test(unif.messageCode) && /9 janvier 2027/.test(unif.messageCode), unif.messageCode);
verifier('mais il n\'est PAS enregistre', !unif.codeStocke);
verifier('un uniforme hors beta porte par une vieille partie retombe sur le classique', unif.affiche);
const vestTexte = await texteAffiche(
  `reinitialiserHub(); indexVestiaire = UNIFORMES.findIndex(u => u.cle === 'dore'); scene = 'vestiaire';`);
verifier('le vestiaire dit « à la sortie » pour un uniforme ferme', /Disponible à la sortie du jeu/.test(vestTexte));
const grille = await page.evaluate(() => {
  reinitialiserHub(); scene = 'vestiaire'; rendu();
  const cases = zones.filter(z => z.action === 'uniforme');
  const hors = cases.filter(z => z.y + z.h > 268 || z.x < 40 || z.x + z.w > LARGEUR - 40);
  return { n: cases.length, hors: hors.length };
});
verifier('les ' + unif.nb + ' uniformes tiennent en deux rangees', grille.n === unif.nb && grille.hors === 0,
  grille.n + ' cases, ' + grille.hors + ' hors cadre');
await page.evaluate(() => { retourAuMenu(); });

/* --- F. Le skin exclusif -------------------------------------------------- */
console.log('\nF. LE SKIN EXCLUSIF');
const skin = await page.evaluate(() => {
  localStorage.removeItem(CLE_RECOMPENSES);
  effacerPartie();
  // Une partie realiste : l'intro est finie ET la base a deja ete visitee.
  // Sans `hubVu`, le retour a la base jouerait le dialogue de decouverte — ce
  // qui est juste, mais ce n'est pas ce qu'on mesure ici.
  partie.termines = ['intro']; partie.existe = true; partie.hubVu = true;
  const planche = planchesBrad['beta-testeur'];
  const dims = planche ? planche.width + 'x' + planche.height : 'absente';

  function finir(id) {
    relancerNiveau(id);
    scene = 'jeu';
    terminerNiveau();
  }
  finir('niveau1'); const apres1 = recompenseObtenue('beta-testeur');
  finir('niveau2'); const apres2 = recompenseObtenue('beta-testeur');
  finir('niveau3'); const apres3 = recompenseObtenue('beta-testeur');
  const aAfficher = finBeta.aAfficher;

  // « Continuer » depuis l'ecran de fin du niveau 3 : l'ecran de fin de beta.
  rentrerALaBase();
  const s1 = scene;
  rendu();
  const lien = !!zones.find(z => z.action === 'ecrire-studio');
  quitterFinBeta();
  const s2 = scene;

  // Refaire le niveau 3 ne relance pas l'ecran.
  finir('niveau3');
  const encore = finBeta.aAfficher;

  // Effacer la sauvegarde ne reprend pas le skin.
  effacerPartie();
  const apresEffacement = recompenseObtenue('beta-testeur');
  const stocke = localStorage.getItem(CLE_RECOMPENSES);
  retourAuMenu();
  return { dims, apres1, apres2, apres3, aAfficher, s1, lien, s2, encore,
           apresEffacement, stocke };
});
verifier('la planche du skin est chargee, au format de celle de Brad', skin.dims === '144x144', skin.dims);
verifier('ni le niveau 1 ni le niveau 2 seuls ne le donnent', !skin.apres1 && !skin.apres2);
verifier('le niveau 3 termine le donne, et l\'ecrit tout de suite', skin.apres3 && skin.aAfficher);
verifier('« Continuer » ouvre l\'ecran de fin de beta', skin.s1 === 'finbeta', skin.s1);
verifier('l\'ecran de fin invite a ecrire, adresse cliquable', skin.lien);
verifier('puis ramene a la base', skin.s2 === 'hub', skin.s2);
verifier('refaire le niveau 3 ne relance pas la fin de beta', !skin.encore);
verifier('« Effacer la sauvegarde » ne reprend pas le skin', skin.apresEffacement);
verifier('il vit sous sa propre clef', skin.stocke === '["beta-testeur"]', skin.stocke);

const finTexte = await texteAffiche(
  `finBeta.nouveau = true; finBeta.enregistre = true; finBeta.t0 = performance.now(); scene = 'finbeta';`);
verifier('l\'ecran dit que le skin est sauvegarde et jouable dans la version finale',
  /sauvegardé dans ce navigateur/.test(finTexte) && /version finale/.test(finTexte)
  && /9 janvier 2027/.test(finTexte));
verifier('et previent de ce qui le ferait perdre',
  /effaces l'historique ou les données de ce site/.test(finTexte)
  && /ne pourra plus être obtenu/.test(finTexte));

/* La navigation privee : le stockage refuse d'ecrire. L'ecran ne doit pas
   annoncer un skin qui aura disparu au prochain lancement. */
const prive = await page.evaluate(() => {
  localStorage.removeItem(CLE_RECOMPENSES);
  const vrai = Storage.prototype.setItem;
  Storage.prototype.setItem = function () { throw new Error('QuotaExceededError'); };
  try {
    effacerPartie();
    partie.termines = ['intro', 'niveau1', 'niveau2']; partie.existe = true;
    relancerNiveau('niveau3'); scene = 'jeu'; terminerNiveau();
  } finally { Storage.prototype.setItem = vrai; }
  const r = { enregistre: finBeta.enregistre, aAfficher: finBeta.aAfficher };
  finBeta.aAfficher = false;
  effacerPartie(); retourAuMenu();
  return r;
});
verifier('en navigation privee, l\'ecran s\'affiche mais dit que rien n\'est enregistre',
  prive.aAfficher && !prive.enregistre);

/* --- G. La manette -------------------------------------------------------- */
console.log('\nG. LA MANETTE');
const pad = await page.evaluate(() => {
  const vrai = navigator.getGamepads;
  const boutons = Array.from({ length: 17 }, () => ({ pressed: true, value: 1 }));
  navigator.getGamepads = () => [{ connected: true, id: 'manette de test',
                                   buttons: boutons, axes: [1, 0, 0, 0] }];
  relacherTout();
  scene = 'jeu';
  majManette(); majManette();
  const bouge = Object.values(entrees).some(v => v);
  navigator.getGamepads = vrai;
  relacherTout(); retourAuMenu();
  return { bouge };
});
verifier('une manette branchee, tous boutons enfonces, ne fait rien', !pad.bouge);
const ctrl = await texteAffiche(`ouvrirControles();`);
verifier('l\'ecran Controles annonce la manette pour la sortie',
  /Pas pendant la bêta/.test(ctrl) && /9 janvier 2027/.test(ctrl));
verifier('et ne decrit pas de boutons qui ne marchent pas', !/Bouton du bas/.test(ctrl));
await page.evaluate(() => { retourAuMenu(); });

/* --- H. Les outils de developpement -------------------------------------- */
console.log('\nH. LES OUTILS DE DEVELOPPEMENT');
const dev = await page.evaluate(() => {
  const panneau = document.getElementById('reglages');
  basculerPanneau();
  const apresBascule = panneau.hidden;
  auClavier({ code: 'F1', key: 'F1', preventDefault() {} });
  const apresF1 = panneau.hidden;
  return {
    options: MENU_OPTIONS.some(e => e.cle === 'avances'),
    bouton: document.getElementById('ouvrir-reglages').hidden,
    apresBascule, apresF1,
  };
});
verifier('les « Réglages de développement » ont quitte les options', !dev.options);
verifier('le bouton ⚙ est masque', dev.bouton);
verifier('ni la fonction ni F1 n\'ouvrent le panneau', dev.apresBascule && dev.apresF1);
const niveauTexte = await texteAffiche(`relancerNiveau('niveau1'); scene = 'jeu';`);
verifier('la barre de mesures du bas n\'apparait pas en jeu', !/fps/.test(niveauTexte));
const incident = await texteAffiche(`incidents.nombre = 1; incidents.t = 2; scene = 'jeu'; dessinerIncident();`);
verifier('l\'avis d\'incident renvoie vers « Signaler un bug », pas vers F1',
  /Signaler un bug/.test(incident) && !/F1/.test(incident));
await page.evaluate(() => { incidents.t = 0; incidents.nombre = 0; retourAuMenu(); });

/* --- I. Conditions d'utilisation ----------------------------------------- */
console.log('\nI. CONDITIONS ET CONFIDENTIALITE');
const politique = await page.evaluate(() => ({
  premier: TEXTE_MENTIONS[0].t,
  tout: TEXTE_MENTIONS.map(b => b.t || b.p || b.l).join(' '),
  courriel: corpsDuMessage(),
}));
verifier('la section bêta passe en tete', politique.premier === 'Version bêta', politique.premier);
verifier('elle donne les dates et la sortie',
  /27 au 29 novembre 2026/.test(politique.tout) && /9 janvier 2027/.test(politique.tout));
verifier('elle explique le skin, ce qui le garde et ce qui le perd',
  /Bêta-testeur/.test(politique.tout) && /effacer la sauvegarde depuis les options du jeu ne le reprend pas/.test(politique.tout)
  && /ce même site/.test(politique.tout));

/* LA LISTE DU STOCKAGE NE PEUT PLUS PRENDRE DE RETARD. On lit les fichiers du
   jeu sur le disque, on releve toutes les clefs 'bradbitt.*' qu'ils ecrivent,
   et chacune doit figurer dans le texte — avec le bon compte en toutes
   lettres. */
const clefs = new Set();
for (const f of fs.readdirSync(path.join(RACINE, 'js'))) {
  const src = fs.readFileSync(path.join(RACINE, 'js', f), 'utf8');
  for (const m of src.matchAll(/'(bradbitt\.[a-z0-9]+\.v\d+)'/g)) clefs.add(m[1]);
}
const manquantes = [...clefs].filter(k => !politique.tout.includes(k));
verifier('chaque clef que le jeu ecrit est declaree dans la politique (' + clefs.size + ')',
  manquantes.length === 0, manquantes.join(', '));
const enLettres = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept'][clefs.size];
verifier('et le texte annonce le bon nombre', new RegExp('écrit ' + enLettres + ' valeurs').test(politique.tout),
  'attendu « ' + enLettres + ' valeurs »');
verifier('le courriel de contact dit que c\'est la beta', /bêta/.test(politique.courriel));

/* --- J. Rendu de tous les ecrans de la beta ------------------------------ */
console.log('\nJ. RENDU');
const rates = await page.evaluate(() => {
  const liste = [
    ['menu', () => retourAuMenu()],
    ['avisbeta', () => ouvrirAvisBeta(() => {})],
    ['finbeta', () => { finBeta.t0 = performance.now(); scene = 'finbeta'; }],
    ['options', () => { scene = 'options'; }],
    ['mentions', () => ouvrirMentions('options')],
    ['controles', () => ouvrirControles()],
    ['carte', () => { reinitialiserHub(); scene = 'carte'; }],
    ['vestiaire', () => { reinitialiserHub(); scene = 'vestiaire'; }],
    ['jukebox', () => { reinitialiserHub(); scene = 'jukebox'; }],
    ['boutique', () => { reinitialiserHub(); scene = 'boutique'; }],
  ];
  const r = [];
  for (const [nom, prep] of liste) {
    try { prep(); rendu(); } catch (e) { r.push(nom + ' : ' + e.message); }
  }
  retourAuMenu();
  return r;
});
verifier('les dix ecrans de la beta se dessinent sans erreur', rates.length === 0, rates.join(' | '));

/* --- K. De la beta a la version finale ----------------------------------- */
console.log('\nK. DE LA BETA A LA VERSION FINALE');

/* Le skin gagne en beta. On recharge la MEME adresse, servie cette fois en
   edition finale : meme origine, donc meme stockage — c'est la situation du
   joueur le 9 janvier si la version finale remplace la beta au meme endroit. */
await page.evaluate(() => {
  localStorage.removeItem(CLE_RECOMPENSES);
  effacerPartie();
  partie.termines = ['intro', 'niveau1', 'niveau2']; partie.existe = true;
  relancerNiveau('niveau3'); scene = 'jeu'; terminerNiveau();
  finBeta.aAfficher = false;
});
changerEdition('finale');
await relancerPage(page);
const finale = await page.evaluate(() => {
  const u = UNIFORMES.find(x => x.cle === 'beta-testeur');
  return { beta: BETA, ouvert: uniformeDebloque(u),
           niveau10: niveauDansEdition('niveau10'), portail: typeof ouvrirPortailFinal };
});
verifier('rechargee a la meme adresse, la page est bien en edition finale', finale.beta === false);
verifier('et le skin Bêta-testeur y est toujours', finale.ouvert);

/* La version finale ne DONNE pas le skin : finir les trois niveaux n'y fait
   rien. */
const finaleSansBeta = await page.evaluate(() => {
  localStorage.removeItem(CLE_RECOMPENSES);
  effacerPartie();
  partie.termines = ['intro', 'niveau1', 'niveau2']; partie.existe = true;
  relancerNiveau('niveau3'); scene = 'jeu'; terminerNiveau();
  const u = UNIFORMES.find(x => x.cle === 'beta-testeur');
  const r = { ouvert: uniformeDebloque(u), ecran: finBeta.aAfficher, detail: detailUniforme(u) };
  effacerPartie();
  return r;
});
verifier('en version finale, finir les trois niveaux ne le donne pas',
  !finaleSansBeta.ouvert && !finaleSansBeta.ecran);
verifier('et le vestiaire dit a qui il est reserve', /Réservé à ceux qui ont joué la bêta/.test(finaleSansBeta.detail),
  finaleSansBeta.detail);

/* Et a une AUTRE adresse — un autre port suffit, c'est deja une autre origine
   pour le navigateur — le skin gagne ici n'existe pas. C'est l'avertissement
   donne au studio sur le nom de domaine, mesure plutot qu'affirme.

   Piege evite : ouvrir un SECOND navigateur aurait fait passer ce test pour
   de mauvaises raisons — un navigateur neuf n'a aucun stockage, quelle que
   soit l'adresse. C'est donc le MEME onglet, du meme navigateur, qui change
   d'adresse. Et on verifie d'abord que la clef est bien la avant de partir. */
const ici = await page.evaluate(() => {
  localStorage.setItem(CLE_RECOMPENSES, '["beta-testeur"]');
  return localStorage.getItem(CLE_RECOMPENSES);
});
const autre = await demarrer({ port: 8202, edition: 'finale' });
await autre.navigateur.close();                 // on ne garde que son serveur
await page.goto('http://localhost:8202/index.html');
await page.waitForFunction(() => typeof UNIFORMES === 'object', null, { timeout: 20000 });
const ailleurs = await page.evaluate(() => {
  const u = UNIFORMES.find(x => x.cle === 'beta-testeur');
  return { ouvert: uniformeDebloque(u), brut: localStorage.getItem(CLE_RECOMPENSES) };
});
verifier('la clef est bien enregistree a la premiere adresse', ici === '["beta-testeur"]', String(ici));
verifier('a une autre adresse, le MEME onglet ne la retrouve pas',
  !ailleurs.ouvert && ailleurs.brut === null, String(ailleurs.brut));
autre.serveur.close();

/* --- Bilan ---------------------------------------------------------------- */
console.log('\nL. SESSION');
verifier('aucune erreur de console sur toute la session',
  erreurs.length === 0, erreurs.slice(0, 3).join(' | '));
const mauvais = introuvables.filter(u => !MANQUES_ADMIS.test(u));
verifier('aucune ressource introuvable hors musiques attendues', mauvais.length === 0,
  mauvais.slice(0, 3).join(' | '));

const code = bilan();
await navigateur.close();
serveur.close();
process.exit(code ? 1 : 0);
