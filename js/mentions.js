/* =============================================================================
   BRAD BITT, MAIS LE JEU — MENTIONS, CONTROLES ET CONTACT

   Trois ecrans qui n'ont rien a voir avec le jeu lui-meme, et qui doivent
   pourtant exister :

   1. CONTROLES — la liste des commandes, clavier, tactile et manette. Elle est
      la pour qu'on puisse VERIFIER le mappage sans brancher six manettes : la
      legende est construite a partir de la meme table que celle qui pilote la
      manette, dans js/entrees.js. Si le mappage change, cet ecran change avec
      lui — il ne peut pas mentir.

   2. CONDITIONS ET CONFIDENTIALITE — le texte, adapte de celui du site, mais
      pas recopie : le jeu ne charge ni police ni vignette chez un tiers, et il
      ecrit d'autres choses dans le navigateur. Annoncer les regles du site ici
      serait faux.

   3. CONTACT — une adresse, et un courriel pre-rempli avec ce qu'il faut pour
      diagnostiquer : appareil, navigateur, taille d'ecran, version du jeu.
      Personne ne sait dire de tete quelle version il joue.

   Rien de tout cela n'est envoye nulle part. Les caracteristiques de l'appareil
   sont ecrites DANS le brouillon du courriel, que le joueur lit et envoie —
   ou pas.
   ========================================================================== */
'use strict';

const VERSION_JEU = '0.25';
const DATE_VERSION = 'septembre 2026';
const CONTACT_MAIL = 'imaginestudio.hwr@gmail.com';

/* La clef de premiere visite. Elle vit a part de la sauvegarde : effacer sa
   partie ne doit pas refaire apparaitre un bandeau juridique deja lu. */
const CLE_MENTIONS = 'bradbitt.mentions.v1';

/* La version telle qu'on la LIT : « 0.25 bêta » pendant la beta. C'est elle
   qu'affichent le menu, les conditions et le courriel de contact — un rapport
   de bug doit dire de quelle edition il parle. */
function versionLisible() { return VERSION_JEU + (BETA ? ' bêta' : ''); }

function mentionsDejaLues() {
  try { return localStorage.getItem(CLE_MENTIONS) === '1'; } catch (e) { return false; }
}
function marquerMentionsLues() {
  try { localStorage.setItem(CLE_MENTIONS, '1'); } catch (e) { /* navigation privee */ }
}

/* -----------------------------------------------------------------------------
   LE TEXTE

   Structure simple : { t: 'titre' } ou { p: 'paragraphe' } ou { l: 'puce' }.
   Le rendu se debrouille avec le retour a la ligne.
-------------------------------------------------------------------------- */

/* La section de la beta. Elle passe EN TETE : c'est la premiere chose qu'un
   joueur de la beta doit savoir, avant les conditions generales.

   Chaque phrase dit ce qui est vrai, pas ce qu'on espere : le skin sera
   reconnu par la version finale A CONDITION qu'elle soit jouee dans le meme
   navigateur, sur le meme site — c'est ainsi que fonctionne le stockage d'un
   navigateur, et le texte le dit tel quel. La progression, elle, n'est pas
   promise. */
const SECTION_BETA = [
  { t: 'Version bêta' },
  { p: 'Vous jouez à la bêta ouverte de Brad Bitt, mais le jeu, ' + DATES_BETA
     + '. Elle contient le niveau d\'introduction et les trois premiers niveaux. '
     + 'Le jeu complet sort le ' + DATE_SORTIE + '.' },
  { p: 'Une bêta sert à trouver ce qui ne va pas. Elle peut comporter des bugs '
     + 'plus ou moins gênants. Si vous en rencontrez un, ou si vous avez une idée, '
     + 'écrivez à ' + CONTACT_MAIL + ' — « Options › Signaler un bug » prépare le '
     + 'message pour vous.' },
  { p: 'La manette n\'est pas prise en charge pendant la bêta. Elle le sera à la '
     + 'sortie du jeu.' },
  { t: 'Le skin exclusif de la bêta' },
  { p: 'Terminer les niveaux 1, 2 et 3 pendant la bêta débloque « Le '
     + 'Bêta-testeur ». Il est enregistré dans votre navigateur, à part de votre '
     + 'partie : effacer la sauvegarde depuis les options du jeu ne le reprend pas.' },
  { p: 'La version finale le reconnaîtra si vous y jouez avec le même navigateur, '
     + 'sur le même appareil et sur ce même site. En revanche, effacer '
     + 'l\'historique ou les données de ce site dans votre navigateur le supprime : '
     + 'il ne pourra plus être obtenu une fois la bêta terminée. Nous n\'en gardons '
     + 'aucune copie.' },
  { p: 'Votre progression de la bêta — niveaux, Brad Coins, achats — est '
     + 'enregistrée de la même façon, mais nous ne garantissons pas qu\'elle sera '
     + 'reprise telle quelle par la version finale.' },
];

const TEXTE_MENTIONS = [
  ...(BETA ? SECTION_BETA : []),
  { t: 'Conditions d\'utilisation' },
  { p: 'Brad Bitt, mais le jeu est un projet indépendant et gratuit. Il n\'est '
     + 'vendu nulle part, ne contient aucun achat, aucune publicité et aucun '
     + 'traceur. Y jouer n\'engage rien d\'autre que votre temps.' },
  { p: 'Le jeu est fourni tel quel, sans garantie. C\'est un prototype : il '
     + 'peut comporter des défauts, et une mise à jour peut changer ou retirer '
     + 'ce qui vous plaisait.' },
  { l: 'Vous pouvez y jouer, en parler, le montrer, en faire des vidéos.' },
  { l: 'Brad Bitt, son univers, ses personnages, ses visuels et sa musique '
     + 'restent la propriété de leur créateur.' },
  { l: 'Vous ne pouvez pas le revendre, ni le redistribuer modifié en le '
     + 'faisant passer pour l\'original.' },
  { p: 'IMAGINe Studio et HwR Engine ne sont pas deux sociétés distinctes : ce '
     + 'sont les deux moitiés d\'un même groupe, supervisé par une seule '
     + 'personne — H.D.N. IMAGINe Studio pour la création, HwR Engine pour le '
     + 'développement. Directeur de la publication : H.D.N.' },

  { t: 'Vos données — en résumé' },
  { l: 'Aucun cookie, aucun compte, aucune publicité, aucun traceur.' },
  { l: 'Aucune donnée de jeu ne quitte votre appareil.' },
  { l: 'Votre progression est écrite dans votre navigateur, et nulle part ailleurs.' },
  { l: 'L\'hébergeur tient des journaux techniques qui contiennent votre adresse IP.' },

  { t: 'Ce que le jeu enregistre chez vous' },
  /* CINQ valeurs. Le texte en annonçait trois depuis le prototype 23 ; la
     course automatique (24) et les recompenses (25) en ont ajoute deux, et la
     liste n'avait pas suivi. Un test compare maintenant cette liste aux clefs
     que le code ecrit reellement : elle ne peut plus prendre de retard. */
  { p: 'Le jeu écrit cinq valeurs dans le stockage local de votre navigateur. '
     + 'Elles ne quittent jamais votre appareil et ne sont jamais transmises.' },
  { l: 'bradbitt.partie.v2 — votre progression : niveaux terminés, Brad Coins, '
     + 'achats, uniforme, difficulté.' },
  { l: 'bradbitt.feel.v1 — vos réglages : volumes, sensations, difficulté.' },
  { l: 'bradbitt.mentions.v1 — le fait que vous ayez vu cet écran, pour ne pas '
     + 'vous le remontrer à chaque lancement.' },
  { l: 'bradbitt.courseauto.v1 — le réglage de course automatique des commandes '
     + 'tactiles.' },
  { l: 'bradbitt.recompenses.v1 — ce qui se gagne une fois et ne se reprend pas, '
     + 'comme le skin exclusif de la bêta. Effacer la sauvegarde depuis le jeu n\'y '
     + 'touche pas.' },
  { p: 'Effacer les données de site dans votre navigateur efface tout cela, '
     + 'progression comprise. Il n\'en existe aucune copie ailleurs : personne, '
     + 'y compris nous, ne peut vous la rendre.' },

  { t: 'Hébergement et journaux' },
  { p: 'Le jeu est hébergé par Netlify (Netlify Inc., San Francisco, '
     + 'États-Unis). Comme chez tout hébergeur, les requêtes de votre '
     + 'navigateur transitent par son infrastructure, y compris par des '
     + 'serveurs situés hors de l\'Union européenne.' },
  { p: 'L\'hébergeur conserve des journaux techniques contenant notamment '
     + 'l\'adresse IP, la date et l\'heure, la page demandée et le type de '
     + 'navigateur. Ils servent à comprendre le flux — combien de visites, '
     + 'depuis quelles zones géographiques — pour savoir s\'il faudra un jour '
     + 'proposer le jeu dans d\'autres langues.' },
  { p: 'Aucun profilage, aucune revente, aucun partage, aucun recoupement, '
     + 'aucune tentative d\'identifier qui que ce soit derrière une adresse. '
     + 'Base légale : l\'intérêt légitime (article 6.1.f du RGPD). La durée de '
     + 'conservation est celle de l\'hébergeur.' },

  { t: 'Ce que le jeu ne charge pas' },
  { p: 'Contrairement au site, le jeu ne charge aucune police, aucune vidéo et '
     + 'aucune image chez un tiers. Tout ce dont il a besoin — images, '
     + 'musiques, polices système — est servi avec lui. Aucune requête ne part '
     + 'vers Google, YouTube ou qui que ce soit d\'autre pendant que vous '
     + 'jouez.' },

  { t: 'Comment ce jeu a été écrit' },
  { p: 'Le code et les textes ont été produits avec l\'aide de plusieurs agents '
     + 'conversationnels (IA), principalement Claude Opus 5 d\'Anthropic.' },
  { p: 'Rien de tout cela n\'est autonome. Chaque direction artistique, chaque '
     + 'texte, chaque correction est demandée, relue et validée par une '
     + 'personne. L\'IA exécute, elle ne décide pas. Les choix de conception, le '
     + 'ton et l\'univers relèvent de la responsabilité de l\'éditeur. Aucune '
     + 'donnée de joueur n\'est envoyée à un système d\'IA.' },

  { t: 'Vos droits' },
  { p: 'Le RGPD vous donne un droit d\'accès, de rectification, d\'effacement, '
     + 'de limitation et d\'opposition. En pratique, ce jeu ne retient de vous '
     + 'qu\'une trace technique dans les journaux de l\'hébergeur, et une '
     + 'sauvegarde qui vous appartient, sur votre appareil.' },
  { p: 'Pour toute demande ou question : ' + CONTACT_MAIL + '. Si vous estimez '
     + 'que vos droits ne sont pas respectés, vous pouvez saisir l\'autorité de '
     + 'contrôle compétente — en France, la CNIL.' },

  { t: 'Contact' },
  { p: CONTACT_MAIL + ' — pour un bug, une idée, une question, ou l\'exercice '
     + 'de vos droits.' },
  { p: 'Mise à jour : ' + DATE_VERSION + ' · version ' + versionLisible() + ' du jeu.' },
];

/* -----------------------------------------------------------------------------
   L'ECRAN DEFILANT
-------------------------------------------------------------------------- */

const mentions = { defilement: 0, hauteur: 0, retour: 'options' };

function ouvrirMentions(retour) {
  mentions.defilement = 0;
  mentions.retour = retour || 'options';
  scene = 'mentions';
  audio.bruit('menu');
}

function fermerMentions() {
  scene = mentions.retour === 'accueil' ? 'accueil' : 'options';
  audio.bruit('menu');
}

function defilerMentions(pas) {
  const max = Math.max(0, mentions.hauteur - (HAUTEUR - 74));
  mentions.defilement = Math.max(0, Math.min(max, mentions.defilement + pas));
}

/* Une page entiere, moins un chevauchement : on ne perd pas la ligne ou on en
   etait. Ce sont les boutons ▲ ▼ de l'ecran, et Page haut / Page bas. */
function pageMentions(sens) {
  defilerMentions(sens * (HAUTEUR - 74) * 0.8);
  audio.bruit('menu');
}

/* Decoupe un paragraphe a la largeur donnee. `ctx.measureText` sert de regle :
   on n'estime pas la largeur d'un caractere, on la mesure. */
function lignesDe(texte, largeur) {
  const mots = texte.split(' ');
  const sorties = [];
  let courante = '';
  for (const m of mots) {
    const essai = courante ? courante + ' ' + m : m;
    if (ctx.measureText(essai).width > largeur && courante) { sorties.push(courante); courante = m; }
    else courante = essai;
  }
  if (courante) sorties.push(courante);
  return sorties;
}

function dessinerMentions() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);

  const marge = 54, large = LARGEUR - marge * 2;
  let y = 46 - mentions.defilement;

  ctx.textAlign = 'left';
  for (const bloc of TEXTE_MENTIONS) {
    if (bloc.t) {
      y += 14;
      ctx.font = 'bold 13px system-ui, sans-serif';
      if (y > 30 && y < HAUTEUR - 28) {
        ctx.fillStyle = '#e8b62c';
        ctx.fillText(bloc.t, marge, y);
      }
      y += 16;
      continue;
    }
    const puce = !!bloc.l;
    const texte = bloc.p || bloc.l;
    ctx.font = '11px system-ui, sans-serif';
    const x = marge + (puce ? 12 : 0);
    for (const ligne of lignesDe(texte, large - (puce ? 12 : 0))) {
      if (y > 30 && y < HAUTEUR - 28) {
        ctx.fillStyle = 'rgba(255,255,255,.76)';
        ctx.fillText(ligne, x, y);
        if (puce && ligne === lignesDe(texte, large - 12)[0]) {
          ctx.fillStyle = 'rgba(232,182,44,.7)';
          ctx.fillText('·', marge + 3, y);
        }
      }
      y += 15;
    }
    y += 7;
  }
  mentions.hauteur = y + mentions.defilement;

  // Bandeaux haut et bas : le texte passe dessous, pas dessus.
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, LARGEUR, 30);
  ctx.fillRect(0, HAUTEUR - 28, LARGEUR, 28);
  texteCentre('CONDITIONS D\'UTILISATION ET CONFIDENTIALITÉ', 20,
              'bold 12px system-ui, sans-serif', '#e8b62c');

  /* LA BARRE DE DEFILEMENT, ET DE QUOI S'EN SERVIR AU DOIGT.

     Le texte ne se lisait qu'aux fleches du clavier. Sur telephone il n'y a pas
     de fleches : le contrat d'utilisation etait donc illisible au-dela du
     premier ecran, exactement la ou il faut le plus pouvoir le lire.

     Trois moyens, maintenant : les fleches, le glissement du doigt (gere dans
     js/entrees.js), et ces deux boutons — un par page. Les boutons existent
     parce qu'un glissement ne s'annonce pas : rien a l'ecran ne dit qu'on peut
     faire glisser. */
  const visible = HAUTEUR - 74;
  const defilable = mentions.hauteur > visible;
  if (defilable) {
    const h = Math.max(24, visible * visible / mentions.hauteur);
    const p = mentions.defilement / Math.max(1, mentions.hauteur - visible);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(LARGEUR - 8, 34, 3, visible);
    ctx.fillStyle = 'rgba(232,182,44,.5)';
    ctx.fillRect(LARGEUR - 8, 34 + p * (visible - h), 3, h);

    [['mentions-haut', '▲', 46], ['mentions-bas', '▼', HAUTEUR - 46]]
      .forEach(([action, glyphe, cy]) => {
        const actif = action === 'mentions-haut'
          ? mentions.defilement > 0
          : mentions.defilement < mentions.hauteur - visible - 1;
        const dessus = souris.survol && souris.survol.action === action;
        ctx.fillStyle = dessus && actif ? 'rgba(232,182,44,.28)' : 'rgba(255,255,255,.07)';
        ctx.fillRect(LARGEUR - 40, cy - 13, 26, 26);
        texteCentreEn(glyphe, LARGEUR - 27, cy + 4, '12px system-ui, sans-serif',
                      actif ? (dessus ? '#ffe9a8' : 'rgba(232,182,44,.8)')
                            : 'rgba(255,255,255,.18)');
        zone(LARGEUR - 40, cy - 13, 26, 26, action);
      });
  }

  const survol = souris.survol && souris.survol.action === 'mentions-retour';
  texteCentre(survol ? '‹ RETOUR ›'
                     : 'Retour  ·  ↑ ↓ ou fais glisser pour lire', HAUTEUR - 10,
              '11px system-ui, sans-serif', survol ? '#e8b62c' : 'rgba(255,255,255,.5)');
  zone(0, HAUTEUR - 28, LARGEUR, 28, 'mentions-retour');
  ctx.textAlign = 'left';
}

/* -----------------------------------------------------------------------------
   L'ECRAN DES CONTROLES
-------------------------------------------------------------------------- */

const CLAVIER_LEGENDE = [
  { geste: '← →  ·  A D  ·  Q D', role: 'Se déplacer' },
  { geste: 'Espace  ·  ↑  ·  W  ·  Z', role: 'Sauter — maintenir pour sauter plus haut' },
  { geste: 'Maj', role: 'Courir' },
  { geste: 'X  ·  J', role: 'Frapper, lancer un objet' },
  { geste: 'C  ·  K', role: 'Brad-Shy, quand la jauge est pleine' },
  { geste: 'E', role: 'Parler, agir devant un poste de la base' },
  { geste: 'Échap', role: 'Menu pause' },
  { geste: 'R', role: 'Recommencer le niveau' },
];

function ouvrirControles() { scene = 'controles'; audio.bruit('menu'); }
function fermerControles() { scene = 'options'; audio.bruit('menu'); }

function dessinerControles() {
  ctx.fillStyle = '#0a0c14';
  ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
  texteCentre('CONTRÔLES', 26, 'bold 14px system-ui, sans-serif', '#e8b62c');

  const colonne = (titre, liste, x, large) => {
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText(titre, x, 52);
    ctx.fillStyle = 'rgba(232,182,44,.3)';
    ctx.fillRect(x, 58, large, 1);
    let y = 74;
    for (const e of liste) {
      ctx.font = 'bold 9.5px system-ui, sans-serif';
      ctx.fillStyle = '#e8b62c';
      ctx.fillText(e.geste, x, y);
      ctx.font = '9.5px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,.62)';
      for (const l of lignesDe(e.role, large)) { y += 11; ctx.fillText(l, x, y); }
      y += 16;
    }
    return y;
  };

  colonne('CLAVIER', CLAVIER_LEGENDE, 26, 270);

  if (BETA) {
    /* En beta, la colonne manette ANNONCE au lieu de decrire : decrire des
       boutons qui ne font rien serait promettre ce que la beta ne tient pas.
       Le mappage, lui, est pret — c'est celui de la version finale. */
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText('MANETTE', 330, 52);
    ctx.fillStyle = 'rgba(232,182,44,.3)';
    ctx.fillRect(330, 58, 284, 1);
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.fillStyle = '#e8b62c';
    ctx.fillText('Pas pendant la bêta.', 330, 78);
    ctx.font = '9.5px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.62)';
    let y = 96;
    for (const ligne of lignesDe('Le support des manettes PlayStation, Xbox et Switch '
        + 'arrive avec la version finale, le ' + DATE_SORTIE + '. Pendant la bêta, '
        + 'le jeu se joue au clavier et à l\'écran tactile.', 280)) {
      ctx.fillText(ligne, 330, y); y += 13;
    }
  } else {
    colonne('MANETTE', MANETTE_LEGENDE, 330, 284);

    // L'etat reel de la manette : branchee ou non, et laquelle.
    ctx.textAlign = 'left';
    ctx.font = '9px system-ui, sans-serif';
    const pad = etatManetteLisible();
    ctx.fillStyle = pad ? 'rgba(126,224,138,.85)' : 'rgba(255,255,255,.34)';
    ctx.fillText(pad || 'Aucune manette détectée — appuie sur un bouton pour la réveiller.',
                 330, HAUTEUR - 44);
  }

  /* L'ecran tactile merite plus qu'une ligne : la course automatique ne se
     devine pas, et sans elle Brad ne court jamais au doigt. */
  ctx.font = '9px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.34)';
  ctx.fillText('Sur écran tactile, les boutons apparaissent pendant le jeu.',
               26, HAUTEUR - 56);
  ctx.fillStyle = courseAuto.actif ? 'rgba(232,182,44,.8)' : 'rgba(255,255,255,.34)';
  ctx.fillText('Le bouton « ▶▶ », à gauche, fait courir Brad en permanence — '
             + (courseAuto.actif ? 'activé.' : 'désactivé.'), 26, HAUTEUR - 44);

  const survol = souris.survol && souris.survol.action === 'controles-retour';
  texteCentre(survol ? '‹ RETOUR ›' : 'Retour', HAUTEUR - 12,
              '11px system-ui, sans-serif', survol ? '#e8b62c' : 'rgba(255,255,255,.5)');
  zone(0, HAUTEUR - 26, LARGEUR, 26, 'controles-retour');
  ctx.textAlign = 'left';
}

/* Le navigateur ne signale une manette qu'apres une premiere pression : tant
   que le joueur n'a touche a rien, il n'y a rien a afficher, et ce n'est pas
   une panne. On le dit plutot que de laisser croire a un defaut. */
function etatManetteLisible() {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  const liste = navigator.getGamepads();
  for (let i = 0; i < liste.length; i++) {
    if (liste[i] && liste[i].connected) {
      const nom = String(liste[i].id || 'manette').slice(0, 42);
      return 'Manette détectée : ' + nom;
    }
  }
  return null;
}

/* -----------------------------------------------------------------------------
   LE CONTACT

   Un courriel pre-rempli. Les caracteristiques servent a diagnostiquer, et
   elles restent dans le brouillon : rien n'est envoye tant que le joueur
   n'appuie pas sur « envoyer » dans SON logiciel de courrier.
-------------------------------------------------------------------------- */

function typeAppareil() {
  const ua = (navigator.userAgent || '');
  const tactile = typeof estTactile !== 'undefined' ? estTactile
                  : ('ontouchstart' in window);
  if (/iPad|Tablet/i.test(ua)) return 'tablette';
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablette';
  if (/iPhone|iPod|Android|Mobile/i.test(ua)) return 'mobile';
  return tactile ? 'écran tactile' : 'ordinateur';
}

function navigateurLisible() {
  const ua = navigator.userAgent || '';
  const m = ua.match(/(Firefox|Edg|OPR|Chrome|Safari)\/([\d.]+)/);
  if (!m) return 'inconnu';
  const noms = { Edg: 'Edge', OPR: 'Opera' };
  return (noms[m[1]] || m[1]) + ' ' + m[2].split('.')[0];
}

function corpsDuMessage() {
  const p = typeof partie !== 'undefined' ? partie : {};
  return [
    'Décris ici ce qui s\'est passé (ce que tu faisais, ce que tu attendais,',
    'ce qui est arrivé à la place). Merci !',
    '',
    '',
    '--- à garder, ça aide à comprendre ---',
    'Version du jeu : ' + versionLisible() + ' (' + DATE_VERSION + ')',
    'Appareil : ' + typeAppareil(),
    'Navigateur : ' + navigateurLisible(),
    'Écran : ' + Math.round(window.innerWidth) + ' × ' + Math.round(window.innerHeight),
    'Manette : ' + (etatManetteLisible() ? 'oui' : 'non détectée'),
    'Niveaux terminés : ' + ((p.termines && p.termines.length) || 0) + ' / '
      + (typeof ORDRE_NIVEAUX !== 'undefined' ? ORDRE_NIVEAUX.length : '?'),
    'Difficulté : ' + (p.difficulte || '?'),
    'Incidents rencontrés : ' + (typeof incidents !== 'undefined' ? incidents.nombre : 0),
  ].join('\n');
}

function ecrireAuStudio() {
  const sujet = 'Brad Bitt ' + versionLisible() + ' — bug ou suggestion';
  const url = 'mailto:' + CONTACT_MAIL
            + '?subject=' + encodeURIComponent(sujet)
            + '&body=' + encodeURIComponent(corpsDuMessage());
  try { window.open(url, '_blank'); } catch (e) { location.href = url; }
  audio.bruit('valider');
}

/* -----------------------------------------------------------------------------
   LE BANDEAU DE PREMIERE VISITE

   Il s'affiche sous le bouton « Jouer », une seule fois. Les deux passages
   soulignes en bleu ouvrent le texte ; le reste de la phrase ne reagit pas.
-------------------------------------------------------------------------- */

const BLEU_LIEN = '#6fb4ff';

function dessinerBandeauMentions() {
  if (mentionsDejaLues()) return;

  const y = 316;
  ctx.textAlign = 'left';
  ctx.font = '9.5px system-ui, sans-serif';

  const av = 'En cliquant sur « Jouer », vous acceptez avoir lu les ';
  const a1 = 'conditions d\'utilisation de ce jeu';
  const mi = ' et ce qu\'il advient de ';
  const a2 = 'vos données';
  const ap = '.';
  const w = t => ctx.measureText(t).width;
  const total = w(av) + w(a1) + w(mi) + w(a2) + w(ap);
  let x = (LARGEUR - total) / 2;

  const gris = 'rgba(255,255,255,.44)';
  const survol = souris.survol && souris.survol.action === 'mentions-lien';

  ctx.fillStyle = gris; ctx.fillText(av, x, y); x += w(av);
  const x1 = x;
  ctx.fillStyle = survol ? '#a8d4ff' : BLEU_LIEN; ctx.fillText(a1, x, y);
  ctx.fillRect(x, y + 2, w(a1), 1); x += w(a1);
  ctx.fillStyle = gris; ctx.fillText(mi, x, y); x += w(mi);
  const x2 = x;
  ctx.fillStyle = survol ? '#a8d4ff' : BLEU_LIEN; ctx.fillText(a2, x, y);
  ctx.fillRect(x, y + 2, w(a2), 1); x += w(a2);
  ctx.fillStyle = gris; ctx.fillText(ap, x, y);

  // Les deux zones cliquables couvrent exactement les deux passages bleus.
  zone(x1 - 3, y - 10, w(a1) + 6, 15, 'mentions-lien');
  zone(x2 - 3, y - 10, w(a2) + 6, 15, 'mentions-lien');
  ctx.textAlign = 'left';
}
