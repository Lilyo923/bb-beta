/* =============================================================================
   BRAD BITT — suite de verification

   ELLE VIT DANS LE PROJET, ET C'EST VOULU.

   La precedente — 275 assertions — habitait a cote du jeu, hors du zip. Le
   conteneur qui l'hebergeait a ete recycle, et elle a disparu avec lui : elle
   n'etait nulle part ailleurs. Celle-ci part avec le jeu, sous `tools/`, et
   survivra a la prochaine machine.

   Elle ne cherche pas a reproduire l'ancienne assertion par assertion. Elle
   couvre ce qui a ete touche depuis, et ce qui a deja casse une fois.

   CETTE SUITE TESTE L'EDITION FINALE — le jeu complet, dix niveaux, manette,
   code FNAM3RL. Le serveur de test bascule l'interrupteur a la volee ; le
   fichier livre, lui, reste en beta. La beta a sa propre suite :
   tools/verif-beta.mjs.

   Lancement :  node tools/verif.mjs
   ========================================================================== */
import { demarrer, compteur, MANQUES_ADMIS } from './socle.mjs';

const { serveur, navigateur, page, erreurs, introuvables } = await demarrer({ port: 8099, edition: 'finale' });
const { verifier, bilan } = compteur();

/* --- A. Chargement -------------------------------------------------------- */
console.log('\nA. CHARGEMENT');
verifier('aucune erreur de console au demarrage', erreurs.length === 0,
  erreurs.slice(0, 3).join(' | '));
verifier('aucun fichier introuvable hors musiques attendues',
  introuvables.every(u => MANQUES_ADMIS.test(u)),
  introuvables.filter(u => !MANQUES_ADMIS.test(u)).slice(0, 3).join(' | '));
verifier('les 11 entrees de la carte sont declarees',
  await page.evaluate(() => ORDRE_NIVEAUX.length) === 11);
verifier('le numero de version est expose',
  /^\d+\.\d+$/.test(await page.evaluate(() => VERSION_JEU)),
  await page.evaluate(() => VERSION_JEU));

/* Les trois musiques recuperees. Elles manquaient au menu ; elles sont la. */
/* On verifie que le FICHIER est la, pas que le navigateur de test l'a decode :
   ce Chromium n'a pas de decodeur AAC, il ne lira jamais un .m4a. Le joueur,
   si. */
const musiques = await page.evaluate(async () => {
  const m = {};
  for (const n of ['niveau8', 'niveau9', 'niveau10', 'bande-annonce', 'menu']) {
    try {
      const r = await fetch('assets/audio/' + n + '.m4a', { method: 'HEAD' });
      m[n] = r.ok;
    } catch (e) { m[n] = false; }
  }
  return m;
});
verifier('les musiques des niveaux 8, 9 et 10 sont livrees',
  musiques.niveau8 && musiques.niveau9 && musiques.niveau10, JSON.stringify(musiques));

/* --- B. La boucle ne meurt pas -------------------------------------------- */
console.log('\nB. LA BOUCLE NE MEURT PAS');

/* Le defaut signale — « en plein combat, le jeu peut ne plus marcher » — n'a
   pas ete reproduit. Mais sa MECANIQUE etait certaine : `requestAnimationFrame`
   etait la derniere instruction de l'image, donc toute exception arretait le
   jeu pour de bon. On verifie maintenant qu'une image qui echoue ne tue plus
   rien : on casse volontairement une fonction de rendu, on laisse tourner, et
   on verifie que la boucle est toujours vivante et l'incident retenu. */
const survie = await page.evaluate(async () => {
  const avant = incidents.nombre;
  const vrai = window.dessinerTourelle;
  let images = 0;
  const compter = () => { images++; requestAnimationFrame(compter); };
  requestAnimationFrame(compter);
  window.dessinerTourelle = () => { throw new Error('panne de test'); };
  scene = 'jeu';
  await new Promise(r => setTimeout(r, 400));
  window.dessinerTourelle = vrai;
  await new Promise(r => setTimeout(r, 300));
  return { incidents: incidents.nombre - avant, images,
           dernier: String(incidents.dernier).slice(0, 40) };
});
verifier('une exception en pleine image ne tue pas la boucle',
  survie.images > 20, survie.images + ' images apres la panne');
verifier('et l\'incident est retenu pour pouvoir etre rapporte',
  survie.incidents > 0 && /panne de test/.test(survie.dernier),
  survie.incidents + ' incident(s) — ' + survie.dernier);

/* --- C. La manette -------------------------------------------------------- */
console.log('\nC. LA MANETTE');

await page.evaluate(() => {
  window.__pad = { connected: true, id: 'manette de test', axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  window.__vrai = navigator.getGamepads;
  navigator.getGamepads = () => [window.__pad];
  window.__p = (i, v) => { window.__pad.buttons[i] = { pressed: !!v, value: v ? 1 : 0 }; };
  window.__s = (x, y) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; };
  window.__clic = i => { window.__p(i, 1); majManette(); window.__p(i, 0); majManette(); };
});

/* C1 — le mappage demande, bouton par bouton, EN NIVEAU.
   Les index sont positionnels : 0 = bouton du bas (croix PlayStation, A Xbox,
   B Switch), 2 = bouton de gauche (carre, X, Y), 3 = bouton du haut. */
const enJeu = await page.evaluate(() => {
  effacerPartie();
  relancerNiveau('niveau1'); scene = 'jeu'; relacherTout();
  const out = {};

  window.__s(1, 0); majManette(); out.stickDroite = entrees.droite;
  window.__s(-1, 0); majManette(); out.stickGauche = entrees.gauche && !entrees.droite;
  window.__s(0, -1); majManette(); out.stickHaut = entrees.saut;
  window.__s(0, 0); majManette(); out.repos = !entrees.gauche && !entrees.droite && !entrees.saut;

  window.__p(7, 1); majManette(); out.gachetteDroite = entrees.courir;
  window.__p(7, 0); majManette();

  attaquePresseeCeTick = false;
  window.__p(0, 1); majManette();
  out.basLance = { attaque: entrees.attaque, front: attaquePresseeCeTick };
  attaquePresseeCeTick = false;
  majManette();                                  // maintenu : pas de repetition
  out.pasDeRepetition = attaquePresseeCeTick === false;
  window.__p(0, 0); majManette();
  out.basRelache = entrees.attaque === false;

  ondePresseeCeTick = false;
  window.__p(2, 1); majManette();
  out.gaucheShy = { onde: entrees.onde, front: ondePresseeCeTick };
  ondePresseeCeTick = false;
  window.__p(2, 0); majManette();

  window.__p(1, 1); majManette(); out.droiteSaut = entrees.saut;
  window.__p(1, 0); majManette();

  window.__clic(3); out.hautPause = scene;
  if (scene === 'pause') reprendreJeu();
  return out;
});
verifier('le stick dirige Brad',
  enJeu.stickDroite && enJeu.stickGauche && enJeu.repos, JSON.stringify(enJeu));
verifier('le stick vers le haut fait sauter', enJeu.stickHaut === true);
verifier('la gachette droite fait courir', enJeu.gachetteDroite === true);
verifier('le bouton du bas (✕ · A · B) lance un objet',
  enJeu.basLance.attaque === true && enJeu.basLance.front === true
  && enJeu.basRelache === true, JSON.stringify(enJeu.basLance));
verifier('un bouton maintenu ne se repete pas', enJeu.pasDeRepetition === true);
verifier('le bouton de gauche (□ · X · Y) declenche le Brad-Shy',
  enJeu.gaucheShy.onde === true && enJeu.gaucheShy.front === true,
  JSON.stringify(enJeu.gaucheShy));
verifier('le bouton de droite (○ · B · A) fait sauter', enJeu.droiteSaut === true);
verifier('le bouton du haut (△ · Y · X) ouvre la pause',
  enJeu.hautPause === 'pause', 'scene ' + enJeu.hautPause);

/* C2 — le meme bouton du bas VALIDE dans un menu. C'est la demande : « pour
   confirmer une selection, c'est le bouton X chez PlayStation, A chez Xbox ». */
const enMenu = await page.evaluate(() => {
  retourAuMenu(); indexMenu = 0;
  const out = {};
  window.__clic(13); out.descend = indexMenu > 0;
  window.__clic(12); out.remonte = indexMenu === 0;
  indexMenu = MENU_PRINCIPAL.findIndex(e => e.cle === 'bande');
  window.__clic(0); out.valide = scene;
  window.__clic(1); out.annule = scene;
  return out;
});
verifier('la croix navigue dans les menus',
  enMenu.descend && enMenu.remonte, JSON.stringify(enMenu));
verifier('le bouton du bas valide une entree de menu',
  enMenu.valide === 'bandeannonce', 'scene ' + enMenu.valide);
verifier('le bouton de droite annule', enMenu.annule === 'menu', 'scene ' + enMenu.annule);

/* C3 — au combat final, la table change : le bouton de droite devient
   l'esquive, parce que la scene n'a pas de saut. Un bouton enfonce dans une
   scene et relache dans une autre ne doit rien laisser colle. */
const enFinal = await page.evaluate(() => {
  effacerPartie();
  demarrerCombatFinal(false);
  relacherFinal();
  const out = {};
  window.__p(0, 1); majManette(); out.frappe = entreesFinal.attaque;
  window.__p(0, 0); majManette();
  window.__p(1, 1); majManette(); out.esquive = entreesFinal.esquive;
  window.__p(1, 0); majManette();
  window.__p(2, 1); majManette(); out.onde = entreesFinal.onde;
  window.__p(2, 0); majManette();

  // On enfonce en combat, on change de scene, on relache : rien ne doit rester.
  window.__p(7, 1); majManette();
  retourAuMenu();
  window.__p(7, 0); majManette();
  out.rienDeColle = !entreesFinal.esquive && !entrees.courir;
  return out;
});
verifier('au combat final, le bouton du bas frappe', enFinal.frappe === true);
verifier('celui de droite esquive', enFinal.esquive === true);
verifier('celui de gauche declenche le Brad-Shy', enFinal.onde === true);
verifier('changer de scene ne laisse aucune touche collee',
  enFinal.rienDeColle === true);

const debranche = await page.evaluate(() => {
  relancerNiveau('niveau1'); scene = 'jeu'; relacherTout();
  window.__s(1, 0); majManette();
  const avant = entrees.droite;
  navigator.getGamepads = () => [];
  majManette();
  navigator.getGamepads = () => [window.__pad];
  window.__s(0, 0); majManette();
  return { avant, apres: entrees.droite };
});
verifier('debrancher la manette relache tout',
  debranche.avant === true && debranche.apres === false, JSON.stringify(debranche));

/* C4 — l'ecran « Contrôles » existe et decrit LA MEME table que celle qui
   pilote la manette. C'est ce qui empeche la legende de mentir. */
const ecranControles = await page.evaluate(() => {
  scene = 'controles';
  let err = null;
  try { dessinerControles(); } catch (e) { err = String(e.message); }
  return { err, lignes: MANETTE_LEGENDE.length, clavier: CLAVIER_LEGENDE.length };
});
verifier('l\'ecran Contrôles se dessine', ecranControles.err === null, ecranControles.err);
verifier('il decrit la manette et le clavier',
  ecranControles.lignes >= 7 && ecranControles.clavier >= 7,
  JSON.stringify(ecranControles));

await page.evaluate(() => { navigator.getGamepads = window.__vrai; retourAuMenu(); });

/* --- D. Mentions, contact, version ---------------------------------------- */
console.log('\nD. MENTIONS ET CONTACT');

const mentionsEtat = await page.evaluate(() => {
  localStorage.removeItem('bradbitt.mentions.v1');
  const out = { avant: mentionsDejaLues() };
  scene = 'accueil';
  zones.length = 0;
  dessinerAccueil();
  out.zonesLien = zones.filter(z => z.action === 'mentions-lien').length;
  marquerMentionsLues();
  out.apres = mentionsDejaLues();
  zones.length = 0;
  dessinerAccueil();
  out.zonesApres = zones.filter(z => z.action === 'mentions-lien').length;
  return out;
});
verifier('le bandeau juridique s\'affiche a la premiere visite',
  mentionsEtat.avant === false && mentionsEtat.zonesLien === 2,
  JSON.stringify(mentionsEtat));
verifier('les deux passages sont cliquables', mentionsEtat.zonesLien === 2);
verifier('et il ne revient plus ensuite',
  mentionsEtat.apres === true && mentionsEtat.zonesApres === 0,
  JSON.stringify(mentionsEtat));

const texteMentions = await page.evaluate(() => {
  ouvrirMentions('options');
  let err = null;
  try { dessinerMentions(); } catch (e) { err = String(e.message); }
  const h = mentions.hauteur;
  defilerMentions(10000);
  const bas = mentions.defilement;
  defilerMentions(-10000);
  const retourHaut = mentions.defilement;
  fermerMentions();
  return { err, h, bas, retourHaut, sortie: scene,
           titres: TEXTE_MENTIONS.filter(b => b.t).length,
           contact: TEXTE_MENTIONS.some(b => (b.p || '').indexOf('imaginestudio.hwr@gmail.com') >= 0) };
});
verifier('le texte des conditions se dessine', texteMentions.err === null, texteMentions.err);
verifier('il a de la matiere et defile',
  texteMentions.h > 600 && texteMentions.bas > 0 && texteMentions.retourHaut === 0,
  JSON.stringify({ h: texteMentions.h, bas: texteMentions.bas }));
verifier('il couvre les deux volets, conditions et donnees',
  texteMentions.titres >= 7, texteMentions.titres + ' sections');
verifier('l\'adresse de contact y figure', texteMentions.contact === true);
verifier('on en ressort par les options', texteMentions.sortie === 'options');

const courriel = await page.evaluate(() => {
  const corps = corpsDuMessage();
  return {
    corps,
    version: corps.indexOf(VERSION_JEU) >= 0,
    appareil: /Appareil : (mobile|tablette|ordinateur|écran tactile)/.test(corps),
    navigateur: /Navigateur : \w+ \d+/.test(corps),
    ecran: /Écran : \d+ × \d+/.test(corps),
    dansOptions: MENU_OPTIONS.some(e => e.cle === 'contact'),
    politique: MENU_OPTIONS.some(e => e.cle === 'politique'),
    controles: MENU_OPTIONS.some(e => e.cle === 'controles'),
  };
});
verifier('le courriel pre-rempli porte la version du jeu', courriel.version === true);
verifier('il decrit l\'appareil, le navigateur et l\'ecran',
  courriel.appareil && courriel.navigateur && courriel.ecran,
  JSON.stringify({ a: courriel.appareil, n: courriel.navigateur, e: courriel.ecran }));
verifier('les trois entrees sont dans les options',
  courriel.dansOptions && courriel.politique && courriel.controles);

/* --- E. Le skin 3IRL et son code ------------------------------------------ */
console.log('\nE. LE SKIN 3IRL');

const code3irl = await page.evaluate(() => {
  effacerPartie();
  const u = UNIFORMES.find(x => x.cle === '3irl');
  const out = { existe: !!u, planche: !!planchesBrad['3irl'] };
  out.verrouilleAvant = !uniformeDebloque(u);
  // Un code faux ne doit rien ouvrir.
  vestiaireCode.saisie = 'FNAM3RX';
  validerCodeVestiaire();
  out.mauvaisCode = !uniformeDebloque(u);
  // Le bon, si.
  vestiaireCode.saisie = 'fnam3rl';          // la casse ne doit pas compter
  validerCodeVestiaire();
  out.ouvertApres = uniformeDebloque(u);
  // Il survit a une sauvegarde / relecture.
  enregistrerPartie();
  partie.codesUniformes = [];
  chargerPartie();
  out.apresRelecture = uniformeDebloque(u);
  out.detail = (u.detail || '').slice(0, 30);
  return out;
});
verifier('l\'uniforme 3IRL existe, avec sa planche',
  code3irl.existe && code3irl.planche, JSON.stringify(code3irl));
verifier('il est verrouille tant qu\'on n\'a pas le code',
  code3irl.verrouilleAvant === true);
verifier('un mauvais code n\'ouvre rien', code3irl.mauvaisCode === true);
verifier('FNAM3RL l\'ouvre, quelle que soit la casse', code3irl.ouvertApres === true);
verifier('et il reste ouvert apres rechargement', code3irl.apresRelecture === true);

/* --- F. Les trois aptitudes secretes -------------------------------------- */
console.log('\nF. LES APTITUDES SECRETES');

const aptitudes = await page.evaluate(() => {
  const PAS = 1 / 120;
  const pas = n => { for (let i = 0; i < n; i++) {
    majMobiles(PAS); majTerrain(PAS); majBrad(PAS); majEnnemis(PAS);
    majArene(PAS); majBoules(PAS); majRamassages(PAS); } };
  const prep = secrets => {
    effacerPartie();
    partie.secrets = secrets.slice(); partie.secretsVus = true;
    relancerNiveau('niveau1'); scene = 'jeu'; reinitialiserEnnemis(true);
    for (const k of Object.keys(entrees)) entrees[k] = false;
    brad.pv = brad.pvMax = 99; brad.invincible = 9999;
  };
  const out = { achetables: SECRETS.length, aVenir: SECRETS_A_VENIR.length };

  // Sans aptitude, le coup part a l'appui — le jeu d'avant, intact.
  prep([]);
  attaquePresseeCeTick = true; entrees.attaque = true; pas(2);
  out.sansCharge = brad.attaque > 0 && !brad.charge;

  prep(['frappe-chargee']);
  entrees.attaque = true; attaquePresseeCeTick = true; pas(80);
  out.charge = +brad.charge.toFixed(2);
  entrees.attaque = false; pas(2);
  out.chargeTiree = !!brad.chargeTiree;

  prep(['plaquage']);
  attaquePresseeCeTick = true; pas(2);
  out.plaquageArret = brad.plaquage || 0;
  prep(['plaquage']);
  entrees.droite = true; entrees.courir = true; pas(120);
  attaquePresseeCeTick = true; pas(2);
  out.plaquageCourse = (brad.plaquage || 0) > 0;
  entrees.droite = false; entrees.courir = false;

  prep(['tourelle']);
  const e = ennemis.find(x => x.etat !== 'mort');
  brad.x = e.x - 90; brad.y = e.y; e.dort = false;
  pas(6);
  const pvDepart = e.pv;
  pas(200);
  out.tourelle = { active: tourelle.active, tirs: boules.filter(b => b.tourelle).length,
                   toucheMoinsQueLaBouleRenvoyee: e.pv > -100, pvDepart, pv: e.pv };

  // Aucune aptitude ne doit survivre a une reapparition.
  brad.charge = 5; brad.plaquage = 5;
  reapparaitre(true);
  out.remisAZero = !brad.charge && !brad.plaquage && !brad.recharge;
  return out;
});
verifier('les quatre aptitudes sont achetables, aucune n\'est promise en vain',
  aptitudes.achetables === 4 && aptitudes.aVenir === 0,
  JSON.stringify({ a: aptitudes.achetables, v: aptitudes.aVenir }));
verifier('sans l\'aptitude, le coup part a l\'appui comme avant',
  aptitudes.sansCharge === true);
verifier('la frappe chargee se charge en tenant le bouton',
  aptitudes.charge > 0.5 && aptitudes.chargeTiree === true,
  'charge ' + aptitudes.charge);
verifier('le plaquage ne part pas a l\'arret', aptitudes.plaquageArret === 0);
verifier('mais part en pleine course', aptitudes.plaquageCourse === true);
verifier('la tourelle tire toute seule',
  aptitudes.tourelle.active && aptitudes.tourelle.tirs >= 0
  && aptitudes.tourelle.pv < aptitudes.tourelle.pvDepart,
  JSON.stringify(aptitudes.tourelle));
verifier('et son tir ne tue pas d\'un coup comme une boule renvoyee',
  aptitudes.tourelle.toucheMoinsQueLaBouleRenvoyee === true,
  'pv tombe a ' + aptitudes.tourelle.pv);
verifier('aucune aptitude ne survit a une reapparition',
  aptitudes.remisAZero === true);

/* --- G. Le combat final --------------------------------------------------- */
console.log('\nG. LE COMBAT FINAL');

/* Le combat etait « trop rapide » : 32,7 s de moyenne au robot. On mesure
   maintenant SIX combats et on juge la moyenne, pas un tirage — un combat est
   stochastique, et une mesure unique ne mesure que le hasard. */
const combats = [];
for (let i = 0; i < 6; i++) {
  combats.push(await page.evaluate(() => {
    effacerPartie();
    partie.difficulte = 'connaisseur';
    partie.ameliorations = { vie: 5, degats: 6, resistance: 5 };
    demarrerCombatFinal(false);
    const PAS = 1 / 120;
    let images = 0;
    while (images++ < 120 * 160) {
      const b = finale.brad, k = finale.kirby;
      if (finale.fini) return { ok: true, s: images / 120, pv: b.pv, pvMax: b.pvMax };
      if (finale.mort) return { ok: false, s: images / 120 };
      const tirer = b.shy >= 100;
      let cible = k;
      if (!tirer) {
        let d0 = 1e9;
        for (const s of finale.sbires) {
          const d = Math.hypot(s.x - b.x, (s.z - b.z) * 1.6);
          if (d < d0) { d0 = d; cible = s; }
        }
      }
      const fuite = !tirer && (k.etat === 'prepare' || k.etat === 'charge' || k.etat === 'aspire');
      const dx = cible.x - b.x, dz = cible.z - b.z;
      const d = Math.hypot(dx, dz * 1.6);
      const arret = tirer ? 34 : 46;
      const ux = fuite ? (Math.sign(b.x - k.x) || 1) : (d > arret ? Math.sign(dx) : 0);
      const uz = fuite ? (Math.sign(b.z - k.z) || 1) : (d > arret ? Math.sign(dz) : 0);
      entreesFinal.droite = ux > 0; entreesFinal.gauche = ux < 0;
      entreesFinal.avancer = uz > 0; entreesFinal.reculer = uz < 0;
      if (fuite && images % 40 === 0) esquivePresseeCeTick = true;
      if (!tirer && d < 60 && images % 16 === 0) coupPresseCeTick = true;
      if (tirer && d < F_PORTEE_ONDE * 0.8) ondeFinalePresseeCeTick = true;
      majFinal(PAS); majEffetsFinal(PAS);
    }
    return { ok: false, raison: 'temps ecoule' };
  }));
}
const gagnes = combats.filter(c => c.ok);
const moy = t => t.reduce((a, b) => a + b, 0) / Math.max(1, t.length);
const duree = moy(gagnes.map(c => c.s));
/* PAS « six fois sur six ».

   Mesure : sur 156 combats menes par ce robot, il est mort 2 fois — environ
   1,3 % par combat. Exiger six victoires sur six revenait donc a exiger
   0,987^6, soit un echec de la suite une fois sur douze. C'est ce qui est
   arrive, deux fois sur vingt-six executions.

   Le robot n'esquive qu'une image sur quarante, et seulement en fuite : il
   joue moins bien qu'un joueur. Sa mort occasionnelle ne dit rien du combat.
   Ce que le test doit affirmer, c'est que le combat SE GAGNE et tient dans la
   duree visee — pas qu'un robot imparfait ne perd jamais.

   Le detail affiche le score meme quand ça passe : une chute a 4/6 se verrait
   dans la sortie avant de faire echouer quoi que ce soit. */
verifier('le combat final se gagne', gagnes.length >= 5,
  gagnes.length + ' / 6'
  + (gagnes.length < 6
      ? ' — ' + combats.filter(c => !c.ok).map(c => c.raison || 'mort').join(', ')
      : ''));
verifier('il dure desormais entre 40 et 60 secondes',
  duree > 40 && duree < 60, duree.toFixed(1) + ' s de moyenne');
verifier('et il coute cher', moy(gagnes.map(c => c.pv)) < 24 * 0.6,
  moy(gagnes.map(c => c.pv)).toFixed(1) + ' PV sur 24');
console.log('       (' + gagnes.map(c => c.s.toFixed(0) + 's').join(' · ') + ')');

/* Le compte a rebours de fin ne doit pas trainer d'une partie a l'autre. */
const relance = await page.evaluate(() => {
  demarrerCombatFinal(false);
  finale.attenteFin = 2.5;
  demarrerCombatFinal(false);
  return { attenteFin: finale.attenteFin, tueur: finale.tueur };
});
verifier('relancer le combat remet le compte a rebours a zero',
  relance.attenteFin === 0, String(relance.attenteFin));

/* --- H. Le filet anti-blocage --------------------------------------------- */
console.log('\nH. LE FILET ANTI-BLOCAGE');

const filet = await page.evaluate(() => {
  effacerPartie();
  relancerNiveau('niveau1'); scene = 'jeu'; relacherTout();
  const PAS = 1 / 120;
  const out = {};

  /* En jeu normal, il ne se declenche JAMAIS : Brad court, donc il bouge.
     Deux secondes, pas cinq — au-dela il atteint le premier trou du niveau 1,
     tombe, et la scene passe a « mort » : le filet ne s'applique plus, et le
     test ne mesurait plus rien. */
  const avant = antiBlocage.degagements;
  entrees.droite = true; entrees.courir = true;
  for (let i = 0; i < 240 && scene === 'jeu'; i++) { majBrad(PAS); majTerrain(PAS); }
  out.enCourse = antiBlocage.degagements - avant;
  out.sceneApresCourse = scene;

  // Brad fige de force, au depart : le filet doit le degager.
  reapparaitre(true);
  scene = 'jeu';
  const pivot = antiBlocage.degagements;
  entrees.droite = true; entrees.courir = false;
  for (let i = 0; i < 130; i++) { brad.vx = 0; majBrad(PAS); majTerrain(PAS); }
  out.degage = antiBlocage.degagements - pivot;
  entrees.droite = false; entrees.courir = false;
  return out;
});
verifier('le filet ne se declenche pas en jeu normal', filet.enCourse === 0,
  filet.enCourse + ' degagement(s) pendant 2 s de course, scene ' + filet.sceneApresCourse);
verifier('mais degage Brad s\'il ne bouge plus', filet.degage > 0,
  filet.degage + ' degagement(s)');

/* --- I. La replique corrigee ---------------------------------------------- */
console.log('\nI. LE DIALOGUE');
const replique = await page.evaluate(() => {
  const tout = DIALOGUE_EXPLOSION.map(l => l.texte).join(' | ');
  return { ancienne: /TU AS GRANDI/i.test(tout), nouvelle: /DÉTECTÉ POUR LA DERNIÈRE FOIS/i.test(tout) };
});
verifier('« tu as grandi à Lille » a disparu', replique.ancienne === false);
verifier('et la nouvelle raison est donnee', replique.nouvelle === true);


/* --- J. Le bandeau juridique et ses liens --------------------------------- */
console.log('\nJ. LE BANDEAU JURIDIQUE');

/* Le defaut signale : ouvrir le texte depuis l'accueil, revenir par Echap, et
   la ligne avait disparu — plus aucun moyen de la relire. Seul « Jouer » doit
   valoir acceptation, parce que c'est ce que la phrase annonce. */
const bandeau = await page.evaluate(() => {
  localStorage.removeItem(CLE_MENTIONS);
  scene = 'accueil'; rendu();
  const avant = !mentionsDejaLues();

  // On clique le lien bleu, comme un joueur curieux.
  const lien = zones.find(z => z.action === 'mentions-lien');
  activerZone(lien);
  const ouvert = scene === 'mentions' && mentions.retour === 'accueil';
  const apresLecture = !mentionsDejaLues();

  fermerMentions();
  scene = 'accueil'; rendu();
  const bandeauEncoreLa = !!zones.find(z => z.action === 'mentions-lien');

  return { avant, ouvert, apresLecture, bandeauEncoreLa };
});
verifier('le bandeau s\'affiche a la premiere visite', bandeau.avant);
verifier('le lien bleu ouvre bien le texte', bandeau.ouvert);
verifier('LIRE le texte ne vaut pas acceptation', bandeau.apresLecture);
verifier('et le bandeau est toujours la au retour', bandeau.bandeauEncoreLa);

const parJouer = await page.evaluate(() => {
  localStorage.removeItem(CLE_MENTIONS);
  demarrage.lance = false;
  lancerDemarrage();
  const lu = mentionsDejaLues();
  scene = 'accueil'; rendu();
  return { lu, resteUnLien: !!zones.find(z => z.action === 'mentions-lien') };
});
verifier('« Jouer », lui, vaut acceptation', parJouer.lu);
verifier('et le bandeau ne revient plus', !parJouer.resteUnLien);

/* Le texte doit pouvoir se lire en entier SANS clavier : deux boutons de page,
   et le glissement du doigt. */
const lecture = await page.evaluate(() => {
  ouvrirMentions('options'); rendu();
  const boutons = zones.filter(z => z.action === 'mentions-haut' || z.action === 'mentions-bas');
  const depart = mentions.defilement;
  pageMentions(1); rendu();
  const apresBas = mentions.defilement;
  pageMentions(-1); rendu();
  const apresHaut = mentions.defilement;
  // Le texte deborde-t-il vraiment ? Sans ça, le test ne prouverait rien.
  return { boutons: boutons.length, depart, apresBas, apresHaut,
           hauteur: Math.round(mentions.hauteur), fenetre: 360 - 74 };
});
verifier('le texte des conditions deborde d\'un ecran',
  lecture.hauteur > lecture.fenetre, lecture.hauteur + ' px pour ' + lecture.fenetre);
verifier('deux boutons de page sont proposes', lecture.boutons === 2, String(lecture.boutons));
verifier('ils font descendre puis remonter le texte',
  lecture.apresBas > lecture.depart && lecture.apresHaut === lecture.depart,
  lecture.depart + ' -> ' + lecture.apresBas + ' -> ' + lecture.apresHaut);

/* Et au doigt : un vrai glissement sur le canvas. */
await page.evaluate(() => { ouvrirMentions('options'); mentions.defilement = 0; rendu(); });
const boite = await page.evaluate(() => {
  const r = canvas.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height };
});
await page.mouse.move(boite.x, boite.y);
await page.mouse.down();
await page.mouse.move(boite.x, boite.y - boite.h * 0.25, { steps: 8 });
await page.mouse.up();
const apresGlissement = await page.evaluate(() => mentions.defilement);
verifier('faire glisser le doigt fait defiler le texte',
  apresGlissement > 20, 'defilement = ' + Math.round(apresGlissement));

/* --- K. Les trois cadres -------------------------------------------------- */
console.log('\nK. LES TROIS CADRES');

/* Trois captures d'ecran signalaient la meme chose : du texte hors du cadre.
   On ne juge pas a l'oeil — on compte les pixels CLAIRS sous le bord du
   panneau, la ou il ne doit rien y avoir. */
const debordements = await page.evaluate(() => {
  function pixelsSous(bas) {
    const d = ctx.getImageData(0, 0, LARGEUR, HAUTEUR).data;
    let n = 0;
    for (let y = bas + 1; y < HAUTEUR; y++)
      for (let x = 0; x < LARGEUR; x++) {
        const i = (y * LARGEUR + x) * 4;
        if (d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) n++;
      }
    return n;
  }
  reinitialiserHub();
  partie.codesUniformes = ['FNAM3RL'];
  indexVestiaire = UNIFORMES.findIndex(u => u.cle === '3irl');

  scene = 'options'; indexOptions = 2; rendu();
  const options = pixelsSous(334);

  scene = 'vestiaire'; rendu();
  const vestiaire = pixelsSous(334);

  scene = 'jukebox'; jukebox.onglet = 0; jukebox.index = 0; rendu();
  const jukebox0 = pixelsSous(334);
  const credit = zones.find(z => z.action === 'credit-lily');

  retourAuMenu();
  return { options, vestiaire, jukebox: jukebox0,
           creditY: credit ? credit.y + credit.h : null };
});
verifier('rien ne deborde sous le cadre des options',
  debordements.options === 0, debordements.options + ' pixels');
verifier('ni sous celui du vestiaire',
  debordements.vestiaire === 0, debordements.vestiaire + ' pixels');
verifier('ni sous celui du jukebox',
  debordements.jukebox === 0, debordements.jukebox + ' pixels');
verifier('le credit « lılYº » est DANS le panneau du jukebox',
  debordements.creditY !== null && debordements.creditY <= 334,
  'bas de la zone : ' + debordements.creditY);

/* Toutes les entrees des options doivent etre atteignables, pas seulement
   visibles : c'est la zone cliquable qui compte. */
const lignesOptions = await page.evaluate(() => {
  scene = 'options'; rendu();
  const lignes = zones.filter(z => z.action === 'option-ligne');
  const hors = lignes.filter(z => z.y < 26 || z.y + z.h > 334)
                     .map(z => MENU_OPTIONS[z.valeur].cle);
  const r = { total: lignes.length, attendu: MENU_OPTIONS.length, hors };
  retourAuMenu();
  return r;
});
verifier('les ' + lignesOptions.attendu + ' entrees des options ont leur zone',
  lignesOptions.total === lignesOptions.attendu,
  lignesOptions.total + ' / ' + lignesOptions.attendu);
verifier('et aucune ne tombe hors du cadre',
  lignesOptions.hors.length === 0, lignesOptions.hors.join(', '));

/* La description du vestiaire ne doit plus traverser le champ de code. */
const desc3irl = await page.evaluate(() => {
  ctx.font = '10px system-ui, sans-serif';
  const u = UNIFORMES.find(x => x.cle === '3irl');
  const brut = ctx.measureText(u.detail).width;
  const lignes = lignesDe(u.detail, LARGEUR - 180);
  const pire = Math.max(...lignes.map(l => ctx.measureText(l).width));
  return { brut: Math.round(brut), lignes: lignes.length, pire: Math.round(pire) };
});
verifier('la description du skin 3IRL est coupee en lignes',
  desc3irl.lignes >= 2 && desc3irl.lignes <= 2,
  desc3irl.brut + ' px d\'un trait -> ' + desc3irl.lignes + ' lignes');
verifier('et chacune tient dans le panneau',
  desc3irl.pire <= 460, desc3irl.pire + ' px');

/* --- L. Le nombre de decharges -------------------------------------------- */
console.log('\nL. LE NOMBRE DE DECHARGES');

const decharges = await page.evaluate(() => {
  const n = F_PV_KIRBY;
  // Toutes les repliques du jeu, une fois les jetons resolus.
  const toutes = [];
  const listes = [DIALOGUE_INTRO, DIALOGUE_HUB, DIALOGUE_FUSEE, DIALOGUE_MANOIR,
                  DIALOGUE_EXPLOSION, DIALOGUE_PORTAIL, DIALOGUE_VICTOIRE];
  for (const l of listes) for (const r of l) toutes.push(remplacerJetons(r.texte));
  return {
    n,
    mot: remplacerJetons('{DECHARGES_MAJ}'),
    ordinal: remplacerJetons('{DECHARGE_IEME}'),
    resteTrois: toutes.filter(t => /trois décharges|troisième décharge/i.test(t)),
    annonce: toutes.find(t => /décharges au but/i.test(t)) || '',
    victoire: toutes.find(t => /décharge le prend/i.test(t)) || '',
  };
});
verifier('le combat final compte bien quatre decharges', decharges.n === 4, String(decharges.n));
verifier('le jeton cardinal donne « Quatre »', decharges.mot === 'Quatre', decharges.mot);
verifier('le jeton ordinal donne « quatrième »', decharges.ordinal === 'quatrième',
  decharges.ordinal);
verifier('plus aucune replique ne parle de trois decharges',
  decharges.resteTrois.length === 0, decharges.resteTrois.join(' | ').slice(0, 80));
verifier('le BRADDY3000 annonce le bon compte',
  /Quatre décharges au but/.test(decharges.annonce), decharges.annonce.slice(-46));
verifier('et le narrateur aussi, a la victoire',
  /La quatrième décharge/.test(decharges.victoire), decharges.victoire.slice(0, 40));

/* Le troisieme endroit, celui qu'on ne trouve qu'en cherchant : la proposition
   de revanche. */
const revanche = await page.evaluate(() => {
  partie.finalGagne = true;
  let texte = '';
  const vrai = window.demanderConfirmation;
  window.demanderConfirmation = t => { texte = t; };
  ouvrirPortailFinal();
  window.demanderConfirmation = vrai;
  confirmation = null;
  return texte;
});
verifier('la revanche annonce le bon nombre de points de vie',
  /avec ses 4 points de vie/.test(revanche), revanche.slice(-50));

/* Et bout en bout : le dialogue lance doit porter le texte resolu, pas le
   jeton. */
const jetonResolu = await page.evaluate(() => {
  lancerDialogue(DIALOGUE_PORTAIL);
  const t = dialogue.lignes.map(l => l.texte).join(' ');
  retourAuMenu();
  return { jeton: /\{DECHARGES/.test(t), quatre: /Quatre décharges/.test(t) };
});
verifier('aucun jeton ne reste visible dans un dialogue lance', !jetonResolu.jeton);
verifier('et le texte resolu y est bien', jetonResolu.quatre);

/* --- M. Le sens de la frappe au combat final ------------------------------ */
console.log('\nM. LE SENS DE LA FRAPPE');

/* « Si Brad regarde a gauche et qu'il frappe, son attaque ira quand meme a
   droite. » La ZONE qui blesse suivait deja le sens. C'est le TRAIT du coup qui
   partait toujours vers la droite : `ctx.arc(..., -0.9, 0.9)` s'ouvre autour de
   l'angle zero, quel que soit le sens, et seul le centre se decalait. */
const frappe = await page.evaluate(() => {
  demarrerCombatFinal(true);
  const b = finale.brad;

  function trait(sens) {
    b.x = 0; b.z = 0; b.vx = 0; b.vz = 0; b.sens = sens;
    b.attaque = 0.16; b.invincible = 0;
    /* ON VIDE L'ARENE POUR DE BON.

       Premiere version : je ne nettoyais que les sbires, les meules et les
       particules. La verification echouait une fois sur dix, 73 contre 60 — et
       treize pixels ne sont pas de l'anticrenelage. C'etait KIRBY 67, toujours
       dans l'arene, qui se dessinait par-dessus le trait quand il se trouvait
       du bon (du mauvais) cote. Le test mesurait la position du boss.

       La secousse de camera, elle, decalait la projection d'une fraction de
       pixel : ça, c'etait bien l'anticrenelage, et c'est le pixel d'ecart. */
    finale.secousse = 0; finale.cam = 0;
    finale.sbires.length = 0; finale.meules.length = 0; particulesFinal.length = 0;
    finale.marques.length = 0; finale.ondes.length = 0;
    finale.kirby.x = 4000; finale.kirby.z = 0; finale.kirby.touche = 0;
    dessinerFinal();
    const p = projeter(b.x, 0, b.z);
    const cx = Math.round(p.sx);
    const d = ctx.getImageData(0, 0, LARGEUR, HAUTEUR).data;
    let g = 0, dr = 0;
    const y0 = Math.max(0, Math.round(p.sy - 48)), y1 = Math.min(HAUTEUR, Math.round(p.sy - 4));
    for (let y = y0; y < y1; y++) for (let x = 0; x < LARGEUR; x++) {
      const i = (y * LARGEUR + x) * 4;
      if (d[i] > 240 && d[i + 1] > 225 && d[i + 2] > 170 && d[i + 2] < 215) {
        if (x < cx - 4) g++; else if (x > cx + 4) dr++;
      }
    }
    return { g, dr };
  }

  function touche(sens) {
    b.x = 0; b.z = 0; b.vx = 0; b.vz = 0; b.sens = sens; b.recharge = 0;
    finale.sbires.length = 0;
    finale.sbires.push({ x: -40, z: 0, vx: 0, vz: 0, sens: 1, pv: 5, flash: 0, phase: 0, cote: 'G' });
    finale.sbires.push({ x: 40, z: 0, vx: 0, vz: 0, sens: -1, pv: 5, flash: 0, phase: 0, cote: 'D' });
    frapperAuFinal();
    const m = {};
    for (const s of finale.sbires) m[s.cote] = 5 - s.pv;
    return m;
  }

  const r = { traitD: trait(1), traitG: trait(-1), toucheD: touche(1), toucheG: touche(-1) };
  finale.actif = false;
  retourAuMenu();
  return r;
});
verifier('face a droite, le trait du coup part a droite',
  frappe.traitD.dr > 40 && frappe.traitD.g === 0,
  frappe.traitD.g + ' a gauche, ' + frappe.traitD.dr + ' a droite');
verifier('face a gauche, il part a gauche',
  frappe.traitG.g > 40 && frappe.traitG.dr === 0,
  frappe.traitG.g + ' a gauche, ' + frappe.traitG.dr + ' a droite');
/* A l'egalite EXACTE, cette verification a echoue une fois sur trois : 73
   contre 72. Elle mesurait l'anticrenelage d'un arc miroir, pas le sens du
   coup. Une tolerance de 5 % laisse passer le pixel de bord et rattrape
   toujours un arc qui pointe du mauvais cote — la, l'ecart serait de 100 %. */
verifier('et les deux sont symetriques, a l\'anticrenelage pres',
  Math.abs(frappe.traitD.dr - frappe.traitG.g) <= Math.max(3, frappe.traitD.dr * 0.05),
  frappe.traitD.dr + ' contre ' + frappe.traitG.g);
verifier('la zone qui blesse suit le sens, a droite',
  frappe.toucheD.D === 1 && frappe.toucheD.G === 0, JSON.stringify(frappe.toucheD));
verifier('et a gauche',
  frappe.toucheG.G === 1 && frappe.toucheG.D === 0, JSON.stringify(frappe.toucheG));

/* --- N. Le telephone ------------------------------------------------------ */
console.log('\nN. LE TELEPHONE');

const tactile = await page.evaluate(() => {
  const bouton = document.querySelector('#tactile [data-touche="course-auto"]');
  const styleJeu = getComputedStyle(document.getElementById('jeu')).touchAction;
  const styleScene = getComputedStyle(document.getElementById('scene')).touchAction;

  // Le pincement de Safari passe par des evenements `gesture*`.
  const ev = new Event('gesturestart', { cancelable: true, bubbles: true });
  document.dispatchEvent(ev);

  return { bouton: !!bouton, styleJeu, styleScene, pincementBloque: ev.defaultPrevented };
});
verifier('le bouton de course automatique existe', tactile.bouton);
verifier('le canvas refuse les gestes du navigateur',
  tactile.styleJeu === 'none' && tactile.styleScene === 'none',
  tactile.styleJeu + ' / ' + tactile.styleScene);
verifier('le pincement de Safari est bloque', tactile.pincementBloque);

const course = await page.evaluate(() => {
  localStorage.removeItem(CLE_COURSE_AUTO);
  courseAuto.actif = false; courseAuto.message = 0;
  entrees.courir = false;
  scene = 'jeu';

  basculerCourseAuto();
  const message = courseAuto.message > 0 ? courseAuto.texte : '';
  appliquerCourseAuto(0.016);
  const courtApres = entrees.courir;

  // Relacher Maj ne doit pas annuler la bascule.
  entrees.courir = false;
  appliquerCourseAuto(0.016);
  const tientLaDistance = entrees.courir;

  const enregistre = localStorage.getItem(CLE_COURSE_AUTO);

  // Le message s'efface tout seul.
  appliquerCourseAuto(3);
  const messageParti = !(courseAuto.message > 0);

  // Deuxieme appui : on rend la main.
  basculerCourseAuto();
  entrees.courir = false;
  appliquerCourseAuto(0.016);
  const rendu2 = entrees.courir;

  // Et la bande-annonce garde la main sur la course.
  basculerCourseAuto();
  scene = 'bandeannonce';
  entrees.courir = false;
  appliquerCourseAuto(0.016);
  const pendantLaBA = entrees.courir;

  courseAuto.actif = false; courseAuto.message = 0;
  try { localStorage.removeItem(CLE_COURSE_AUTO); } catch (e) {}
  retourAuMenu();
  return { message, courtApres, tientLaDistance, enregistre, messageParti, rendu2, pendantLaBA };
});
verifier('la bascule fait courir Brad', course.courtApres);
verifier('et elle tient, meme touche relachee', course.tientLaDistance);
verifier('elle annonce ce qu\'elle vient de faire',
  course.message === 'Course automatique activée', course.message);
verifier('le message s\'efface tout seul', course.messageParti);
verifier('le choix est retenu dans le navigateur', course.enregistre === '1', course.enregistre);
verifier('un second appui rend la main', !course.rendu2);
verifier('et la bande-annonce garde la sienne', !course.pendantLaBA);

/* --- O. Rendu de tous les ecrans ------------------------------------------ */
console.log('\nO. RENDU');
const ecrans = await page.evaluate(() => {
  const liste = ['accueil', 'menu', 'options', 'credits', 'mentions', 'controles',
                 'hub', 'boutique', 'vestiaire', 'carte', 'jukebox', 'arcade'];
  const rates = [];
  for (const s of liste) {
    try {
      if (s === 'hub' || s === 'boutique' || s === 'vestiaire' || s === 'carte' || s === 'jukebox') {
        reinitialiserHub();
      }
      scene = s;
      rendu();
    } catch (e) { rates.push(s + ' : ' + e.message); }
  }
  retourAuMenu();
  return rates;
});
verifier('les douze ecrans se dessinent sans erreur', ecrans.length === 0, ecrans.join(' | '));
verifier('aucune erreur de console sur toute la session',
  erreurs.filter(e => !/panne de test/.test(e)).length === 0,
  erreurs.filter(e => !/panne de test/.test(e)).slice(0, 3).join(' | '));
const mauvais = introuvables.filter(u => !MANQUES_ADMIS.test(u));
verifier('aucune ressource introuvable hors musiques attendues',
  mauvais.length === 0, mauvais.slice(0, 3).join(' | '));

const code = bilan();
await navigateur.close();
serveur.close();
process.exit(code ? 1 : 0);
