# Bézier ONE — portail client (v2)

Portail auto-hébergé sur le NAS, pensé pour remplacer Playbook.com : bibliothèque
hiérarchique, aperçus, sélection multi-dossiers et liens de partage privés.

- Public : `https://clients.thierrybezier.com` (page d'accueil neutre, aucun contenu listé)
- Studio : `https://clients.thierrybezier.com/admin` (mot de passe)
- Lien de partage : `https://clients.thierrybezier.com/s/<jeton>`

## Ce que fait le portail

**Bibliothèque (studio)**
- Arbre complet des dossiers dans la barre latérale, comme les « boards » de Playbook.
- Chaque dossier s'affiche avec ses sous-dossiers en rangées (couverture + premiers
  fichiers, « Tout afficher » pour déplier) et ses fichiers en grille ou en liste.
- Filtres par type (images, vidéos, documents), tri (nom, date, taille, type), taille
  des vignettes, recherche instantanée sans tenir compte des accents.
- Visionneuse plein écran : images, vidéos (lecture directe), PDF, audio ; navigation
  clavier et tactile.
- Sélection de dossiers et de fichiers, y compris dans plusieurs dossiers à la fois
  (clic sur la coche, Maj + clic pour une plage, Ctrl/Cmd + A pour tout sélectionner).
  Une barre flottante permet de partager, télécharger (.zip) ou vider la sélection.

**Liens de partage**
- Un lien = une sélection (dossiers entiers et/ou fichiers). Le destinataire ne voit
  que ce périmètre : aucune navigation possible en dehors.
- Titre, message, expiration (7/30/90 jours ou date), mot de passe, autorisation ou
  non du téléchargement.
- Page de gestion : copier, ouvrir, modifier (y compris retirer des éléments),
  désactiver, supprimer ; compteur de vues et dernière ouverture.
- Côté client : page sobre au nom de Bézier ONE, mêmes rangées/grilles, visionneuse,
  téléchargement fichier par fichier, par dossier, de toute la sélection ou d'un
  sous-ensemble choisi. Responsive (téléphone, tablette).

**Comptes du studio**
- Le compte maître `studio` est défini par `ADMIN_PASSWORD`. Depuis « Comptes », un
  propriétaire crée d'autres comptes (identifiant, nom, mot de passe, rôle) : les
  membres accèdent à la bibliothèque et aux liens, les propriétaires gèrent aussi les
  comptes. Chaque lien mémorise qui l'a créé. Changer un mot de passe ou désactiver
  un compte déconnecte immédiatement ses sessions.

**Sous le capot**
- Index en mémoire de toute la bibliothèque (relu au démarrage, toutes les 15 min et
  sur « Actualiser ») ; cache JSON pour un démarrage instantané.
- Aperçus WebP générés à la demande et mis en cache (`sharp` pour les images, `ffmpeg`
  pour les vidéos/HEIC/PSD, `pdftoppm` pour PDF/AI/EPS) ; pré-génération en tâche de
  fond à faible priorité.
- Fichiers servis avec `Range` (lecture vidéo fluide), archives ZIP en flux sans
  compression (ZIP64, pas de limite de taille).
- Sécurité : bibliothèque montée en lecture seule, chemins strictement validés,
  liens symboliques ignorés, jetons aléatoires (16 caractères), sessions signées
  HMAC, limitation des tentatives de mot de passe, en-têtes `noindex`, CSP.
- Aucune dépendance de build côté front (HTML/CSS/JS natifs).

## Déploiement sur le NAS en une commande

Prérequis : les conteneurs v1 (`portal`, `caddy`, `cloudflared`) tournent et le tunnel
Cloudflare pointe vers `http://portal:8080`. Rien ne change côté réseau ni côté Cloudflare.

Depuis un terminal sur le NAS (SSH sur `192.168.1.31`, ou le terminal de UGOS) :

```sh
curl -fsSL -o install.sh https://raw.githubusercontent.com/DernierExile/InkNoise/refs/heads/claude/kind-hypatia-biu6jv/bezier-one-portal/deploy/install.sh
bash install.sh
```

Le script demande un mot de passe pour le studio, puis enchaîne tout seul :

1. télécharge le code dans `/home/thierrybezier/BezierPortal-v2` (la v1 reste intacte
   dans `/home/thierrybezier/BezierPortal`) ;
2. écrit `/docker/bezier-portal-v2/.env` (mot de passe, lisible par root seulement) et
   `/docker/bezier-portal-v2/docker-compose.yaml` ;
3. repère le réseau Docker du conteneur `cloudflared` et y inscrit la v2 sous l'alias
   `portal`, celui que le tunnel utilise déjà ;
4. construit l'image (Node 22 + ffmpeg + poppler), arrête le conteneur `portal` v1 sans
   le supprimer, démarre la v2 sur le port `8095` ;
5. vérifie `http://127.0.0.1:8095/health` puis `https://clients.thierrybezier.com/health`.
   Si la v2 ne répond pas, il relance la v1 automatiquement.

Ensuite :

```sh
bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh            # mise à jour (re-télécharge et reconstruit)
bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh --status   # état et tests de santé
bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh --rollback # retour à la v1 en quelques secondes
docker logs -f bezier-portal-v2                                        # journal
```

Le compte maître du studio s'appelle `studio`. Pour changer son mot de passe : éditer
`/docker/bezier-portal-v2/.env` puis `docker compose -p bezier-portal-v2 -f /docker/bezier-portal-v2/docker-compose.yaml up -d`.

Sans terminal, l'équivalent manuel est possible depuis l'application Docker de UGOS :
déposer le dossier du projet dans `/home/thierrybezier/BezierPortal-v2`, créer un projet
`bezier-portal-v2` avec le contenu de `docker-compose.example.yaml` (en remplaçant le réseau
par celui du projet v1, en général `bezier-portal_default`), arrêter le conteneur `portal`
v1, puis démarrer le projet.

## Variables d'environnement

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `8080` | Port d'écoute interne |
| `LIBRARY_ROOT` | `/library` | Bibliothèque (montage lecture seule) |
| `DATA_DIR` | `/data/v2` (image) | Index, aperçus, liens, secret de session |
| `PUBLIC_ORIGIN` | `https://clients.thierrybezier.com` | Origine des liens générés |
| `ADMIN_PASSWORD` | — | Mot de passe du compte maître `studio` (obligatoire au premier démarrage) |
| `SCAN_INTERVAL_MIN` | `15` | Relecture automatique de la bibliothèque (0 = jamais) |
| `THUMB_CONCURRENCY` | `2` | Générations d'aperçus simultanées |
| `PREWARM_THUMBS` | `1` | Pré-génération des vignettes après chaque scan (`0` pour couper) |
| `BRAND_NAME` | `Bézier ONE` | Nom affiché |

## Développement local

```sh
npm install
node test/make-library.mjs        # bibliothèque factice dans test/library
npm run dev                       # http://localhost:8080 — mot de passe « studio »
npm test                          # test de fumée de bout en bout (API, sécurité, zip, partages)
```

Nécessite Node 22, `ffmpeg` et `pdftoppm` (poppler) dans le PATH pour les aperçus
vidéo et PDF ; sans eux, ces aperçus sont simplement désactivés.

## API (résumé)

- `GET /health`
- Studio (cookie de session) : `POST /api/admin/login`, `/logout`, `GET /api/admin/me`,
  `/status`, `/dirs`, `/dir?p=`, `/files?p=`, `/search?q=`, `/thumb?p=&w=480|1600`,
  `/file?p=[&dl=1]`, `/zip?p=`, `POST /api/admin/zip` (`paths` JSON), `POST /api/admin/rescan`,
  `POST /api/admin/prewarm`, `GET|POST /api/admin/shares`, `GET|PATCH|DELETE /api/admin/shares/:id`,
  `GET|POST /api/admin/users`, `PATCH|DELETE /api/admin/users/:login` (propriétaires)
- Partage : `GET /api/s/:id`, `POST /api/s/:id/unlock`, `GET /api/s/:id/tree?p=`,
  `GET /api/s/:id/thumb?p=&w=`, `GET /s/:id/file?p=[&dl=1]`, `GET /s/:id/zip[?p=]`,
  `POST /s/:id/zip` (`paths` JSON)

## Structure

```
server.mjs            point d'entrée (Express 5) : routes, sécurité, fichiers, zip
src/library.mjs       index de la bibliothèque (scan, cache, arbre, recherche)
src/thumbs.mjs        aperçus (sharp / ffmpeg / pdftoppm), files d'attente, cache
src/shares.mjs        liens de partage (création, périmètre, mot de passe, expiration)
src/auth.mjs          sessions signées, cookies, limitation des tentatives
src/users.mjs         comptes du studio (compte maître + comptes nommés, rôles)
src/zip.mjs           archives en flux
public/assets/        styles et composants communs (tuiles, sections, visionneuse…)
public/admin/         application studio
public/share/         page de partage
public/index.html     accueil public · public/404.html
test/                 générateur de bibliothèque, test de fumée, captures Playwright
```
