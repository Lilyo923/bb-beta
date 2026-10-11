#!/usr/bin/env python3
"""
Brad Bitt, mais le jeu — petit serveur local de verification.

Le socle Playwright (tools/socle.mjs) a besoin de Node. Celui-ci n'a besoin que
du Python livre avec macOS : il sert le dossier du jeu en HTTP, pour jouer ou
verifier sans rien installer.

    python3 tools/serveur.py                    le jeu tel qu'il est sur le disque
    python3 tools/serveur.py --edition finale   le meme jeu, BETA a false
    python3 tools/serveur.py --port 8200

Trois choses qu'un `python3 -m http.server` ne fait pas :

1. L'EDITION A LA VOLEE. Comme le socle Node : `--edition finale` sert
   js/edition.js avec `const BETA = false;` SANS toucher au fichier. Ce qui est
   livre reste exactement ce qui est dans le dossier.
2. AUCUN CACHE. Un fichier corrige doit etre celui que le navigateur relit.
3. LES REQUETES PARTIELLES (Range). Safari refuse de lire un fichier audio
   qu'on ne sait pas lui servir par morceaux.
"""
import argparse
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.png': 'image/png', '.json': 'application/json',
    '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
}


def fabrique(racine, edition):
    class Gestionnaire(SimpleHTTPRequestHandler):
        # Connexions gardees ouvertes : le jeu charge une quarantaine de
        # fichiers d'un coup, et en HTTP/1.0 chacun rouvrait une connexion.
        protocol_version = 'HTTP/1.1'

        def __init__(self, *a, **k):
            super().__init__(*a, directory=racine, **k)

        def log_message(self, fmt, *args):
            # Seules les erreurs meritent une ligne : 404, 500.
            if len(args) > 1 and str(args[1]).startswith(('4', '5')):
                sys.stderr.write('%s %s\n' % (args[1], args[0]))

        def _entetes(self, code, type_, longueur, extra=None):
            self.send_response(code)
            self.send_header('Content-Type', type_)
            self.send_header('Content-Length', str(longueur))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Accept-Ranges', 'bytes')
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()

        def do_GET(self):
            self._servir(True)

        def do_HEAD(self):
            self._servir(False)

        def _servir(self, corps):
            chemin = self.translate_path(self.path.split('?')[0])
            if os.path.isdir(chemin):
                chemin = os.path.join(chemin, 'index.html')
            if not os.path.isfile(chemin):
                self.send_error(404)
                return
            type_ = TYPES.get(os.path.splitext(chemin)[1].lower(), 'application/octet-stream')

            # L'interrupteur d'edition, bascule a la volee.
            if edition and chemin.endswith(os.path.join('js', 'edition.js')):
                texte = open(chemin, encoding='utf-8').read()
                voulu = 'true' if edition == 'beta' else 'false'
                texte, n = re.subn(r'const BETA = (true|false);', 'const BETA = %s;' % voulu, texte)
                if n != 1:
                    self.send_error(500, 'interrupteur BETA introuvable')
                    return
                donnees = texte.encode('utf-8')
                self._entetes(200, type_, len(donnees))
                if corps:
                    self.wfile.write(donnees)
                return

            taille = os.path.getsize(chemin)
            debut, fin, code, extra = 0, taille - 1, 200, {}
            m = re.match(r'bytes=(\d*)-(\d*)$', self.headers.get('Range', '') or '')
            if m and (m.group(1) or m.group(2)):
                if m.group(1):
                    debut = int(m.group(1))
                    if m.group(2):
                        fin = min(int(m.group(2)), taille - 1)
                else:
                    debut = max(0, taille - int(m.group(2)))
                if debut > fin:
                    self.send_response(416)
                    self.send_header('Content-Range', 'bytes */%d' % taille)
                    self.end_headers()
                    return
                code = 206
                extra['Content-Range'] = 'bytes %d-%d/%d' % (debut, fin, taille)
            self._entetes(code, type_, fin - debut + 1, extra)
            if not corps:
                return
            with open(chemin, 'rb') as f:
                f.seek(debut)
                reste = fin - debut + 1
                try:
                    while reste > 0:
                        bloc = f.read(min(65536, reste))
                        if not bloc:
                            break
                        self.wfile.write(bloc)
                        reste -= len(bloc)
                except (BrokenPipeError, ConnectionResetError):
                    pass          # le navigateur a coupe : il a ce qu'il voulait

    return Gestionnaire


def main():
    p = argparse.ArgumentParser(description='Serveur local de Brad Bitt, mais le jeu.')
    p.add_argument('--port', type=int, default=8126)
    p.add_argument('--edition', choices=['beta', 'finale'], default=None,
                   help="force l'edition servie, sans modifier js/edition.js")
    p.add_argument('--racine', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
    a = p.parse_args()
    racine = os.path.abspath(a.racine)
    # La file d'attente par defaut (5) est plus courte que la rafale d'un
    # chargement de page : le navigateur voyait des connexions refusees, et des
    # scripts manquaient a l'appel — une panne du serveur qui ressemblait a une
    # panne du jeu.
    ThreadingHTTPServer.request_queue_size = 128
    ThreadingHTTPServer.daemon_threads = True
    serveur = ThreadingHTTPServer(('127.0.0.1', a.port), fabrique(racine, a.edition))
    print('Brad Bitt servi sur http://localhost:%d/  (%s%s)' % (
        a.port, racine, ', edition ' + a.edition if a.edition else ''))
    sys.stdout.flush()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
