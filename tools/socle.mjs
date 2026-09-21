/* =============================================================================
   BRAD BITT — socle de verification

   La suite Playwright d'avant a disparu avec le conteneur ou elle vivait : elle
   n'etait pas dans le zip. Celle-ci l'est — elle part avec le jeu, sous
   `tools/`, pour que ça ne se reproduise pas.

   Ce fichier ne contient que le socle : serveur local, navigateur, compteur.
   Les verifications sont dans verif.mjs, a cote.

   Le jeu est servi en HTTP et non en file:// parce que `getImageData` refuse de
   lire un canvas nourri par une image chargee en file://.
   ========================================================================== */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
import http from 'http';
import fs from 'fs';
import path from 'path';

/* La racine du jeu. Par defaut le dossier parent de tools/, pour que la suite
   marche depuis n'importe ou le zip a ete deballe ; BRADBITT_RACINE permet de
   la forcer, ce qui sert a verifier une archive fraichement construite. */
export const RACINE = process.env.BRADBITT_RACINE
  || path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.json': 'application/json',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg',
};

/* Deux familles d'absences admises, et elles n'ont rien a voir :

   1. Les trois musiques qui n'ont pas encore ete fournies.
   2. TOUS les `.mp3`. Le jeu n'expedie que des `.m4a` ; `EXT_AUDIO` essaie le
      format que le navigateur declare preferer, puis se rabat sur l'autre. Le
      Chromium de test est compile sans decodeur AAC : il demande donc les
      `.mp3` en premier, ne les trouve pas, et prend les `.m4a`. Ces 404-la
      sont le repli qui fonctionne, pas une panne.

   Toute AUTRE adresse introuvable fait echouer la suite. */
export const MANQUES_ADMIS =
  /\/assets\/audio\/(mini-kirby|mega-kirby|generique)\.m4a$|\/assets\/audio\/[^/]+\.mp3$|favicon/;

/* L'EDITION SERVIE.

   Le jeu n'a qu'un interrupteur, `const BETA = true|false;`, dans
   js/edition.js. Le serveur de test peut le basculer A LA VOLEE, sans toucher
   au fichier sur le disque : `demarrer({ edition: 'finale' })` sert le meme
   jeu avec BETA a false. Ainsi la suite teste les DEUX editions du meme code,
   et ce qui est livre reste exactement ce qui est dans le dossier.

   Sans option, le fichier est servi tel quel. */
function servirEdition(contenu, edition) {
  if (!edition) return contenu;
  const voulu = edition === 'beta' ? 'true' : 'false';
  const remplace = contenu.replace(/const BETA = (true|false);/, 'const BETA = ' + voulu + ';');
  if (remplace === contenu && !contenu.includes('const BETA = ' + voulu + ';')) {
    throw new Error('interrupteur BETA introuvable dans js/edition.js');
  }
  return remplace;
}

export async function demarrer(opts = {}) {
  const port = opts.port || 8099;
  const serveur = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(RACINE, url === '/' ? 'index.html' : url);
    if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
      res.writeHead(404); res.end('404'); return;
    }
    if (url === '/js/edition.js') {
      // Jamais en cache : `changerEdition` doit prendre effet au rechargement.
      res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
      res.end(servirEdition(fs.readFileSync(f, 'utf8'), opts.edition));
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => serveur.listen(port, r));

  const navigateur = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
  const page = await navigateur.newPage({ viewport: { width: 1280, height: 720 } });

  const erreurs = [];
  const introuvables = [];
  page.on('response', r => { if (r.status() === 404) introuvables.push(r.url()); });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/Failed to load resource/.test(m.text())) return;   // juge par `introuvables`
    erreurs.push(m.text());
  });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));

  await page.goto('http://localhost:' + port + '/index.html');
  /* Les `const` de haut niveau d'un script classique vivent dans la portee
     lexicale globale, PAS sur `window` : on teste donc le nom nu. */
  await page.waitForFunction(
    () => typeof NIVEAUX === 'object' && !!NIVEAUX.niveau5 && typeof sprites === 'object',
    null, { timeout: 20000 });
  // Le jeu ne charge ses planches qu'apres l'ecran d'accueil : c'est ce clic
  // qui autorise l'audio.
  await page.evaluate(() => lancerDemarrage());
  await page.waitForFunction(() => Object.keys(sprites).length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(1200);

  /* Changer d'edition SANS changer d'adresse : meme serveur, meme port, donc
     meme origine pour le navigateur — et meme stockage local. C'est ce qui
     permet de verifier, de bout en bout, qu'un skin gagne en beta est bien
     reconnu par la version finale publiee au meme endroit. */
  const changerEdition = e => { opts.edition = e; };

  return { serveur, navigateur, page, erreurs, introuvables, changerEdition };
}

/* Remet le jeu dans l'etat d'apres le clic sur « Jouer », apres un
   rechargement de page. */
export async function relancerPage(page) {
  await page.reload();
  await page.waitForFunction(
    () => typeof NIVEAUX === 'object' && !!NIVEAUX.niveau5 && typeof sprites === 'object',
    null, { timeout: 20000 });
  await page.evaluate(() => lancerDemarrage());
  await page.waitForFunction(() => Object.keys(sprites).length > 0, null, { timeout: 30000 });
  await page.waitForTimeout(600);
}

export function compteur() {
  const etat = { reussis: 0, echecs: [] };
  etat.verifier = (nom, condition, detail) => {
    if (condition) { etat.reussis++; console.log('  ok   ' + nom); }
    else {
      etat.echecs.push(nom + (detail ? ' — ' + detail : ''));
      console.log('  ECHEC ' + nom + (detail ? ' — ' + detail : ''));
    }
  };
  etat.bilan = () => {
    console.log('\n================================');
    console.log(etat.reussis + ' verifications reussies, ' + etat.echecs.length + ' echec(s).');
    for (const e of etat.echecs) console.log('  - ' + e);
    return etat.echecs.length;
  };
  return etat;
}
