# Prompt pour une session Claude Cowork — déploiement de Bézier ONE v2 sur le NAS

À coller tel quel dans une nouvelle session Claude Cowork sur le PC Windows de Thierry
(le PC est sur le même réseau local que le NAS).

---

Tu déploies la v2 du portail client **Bézier ONE** sur mon NAS, à la place de la v1, puis
tu vérifies que tout fonctionne. Tu travailles depuis ce PC Windows, qui est sur le même
réseau local que le NAS. Réponds en français, avec des points de progression courts.

## Contexte

- NAS UGREEN DXP4800 Plus, IP locale `192.168.1.31`, utilisateur `thierrybezier`, système
  UGOS Pro (Debian). Docker et Docker Compose y sont installés.
- v1 en production : projet Docker `bezier-portal` avec trois conteneurs (`portal`,
  `caddy`, `cloudflared`). Compose v1 : `/docker/bezier-portal/docker-compose.yaml`.
  Code v1 : `/home/thierrybezier/BezierPortal`. Le tunnel Cloudflare `bezier-portal-nas`
  publie `https://clients.thierrybezier.com` vers `http://portal:8080`.
- Bibliothèque des clients : `/home/thierrybezier/Playbook` (montée en lecture seule par
  le portail). **Interdiction absolue** d'y déplacer, renommer ou supprimer quoi que ce
  soit.
- Code v2 et script d'installation (dépôt public GitHub, branche
  `claude/kind-hypatia-biu6jv`, dossier `bezier-one-portal`) :
  - script : `https://raw.githubusercontent.com/DernierExile/InkNoise/refs/heads/claude/kind-hypatia-biu6jv/bezier-one-portal/deploy/install.sh`
  - documentation : `https://github.com/DernierExile/InkNoise/blob/claude/kind-hypatia-biu6jv/bezier-one-portal/README.md`

## Ce que fait `install.sh` (tu n'as pas à le réécrire)

Il installe la v2 **à côté** de la v1 sans modifier le Compose v1 ni le tunnel :
télécharge le code dans `/home/thierrybezier/BezierPortal-v2`, écrit
`/docker/bezier-portal-v2/.env` et `/docker/bezier-portal-v2/docker-compose.yaml`, repère
le réseau Docker du conteneur `cloudflared` et y inscrit la v2 sous l'alias `portal`,
construit l'image (Node 22 + ffmpeg + poppler, quelques minutes), arrête le conteneur
`portal` v1 sans le supprimer, démarre la v2 sur le port `8095`, vérifie
`http://127.0.0.1:8095/health` puis `https://clients.thierrybezier.com/health`, et relance
la v1 tout seul si la v2 ne répond pas. Sous-commandes : `--status`, `--rollback`. Le
relancer sert de mise à jour. Lancé sans terminal interactif, il ne demande rien : le
compte propriétaire du studio se crée ensuite dans le navigateur avec un code
d'initialisation à usage unique, lu dans le journal du conteneur.

## Règles

1. Jamais de mot de passe, de jeton ou de clé dans la conversation, ni dans un fichier que
   tu écris. Tu ne me demandes aucun mot de passe : quand une saisie est nécessaire (mot
   de passe SSH ou sudo du NAS), tu me donnes la commande exacte et c'est moi qui la tape
   dans mon propre terminal.
2. Tu ne modifies ni `/docker/bezier-portal/docker-compose.yaml`, ni le tunnel Cloudflare,
   ni le DNS. Tu ne supprimes aucun conteneur, volume, image ou fichier. Le conteneur v1
   est seulement arrêté, par le script.
3. Tu ne touches jamais au contenu de `/home/thierrybezier/Playbook`.
4. Avant toute commande qui change l'état du NAS, tu vérifies que le diagnostic la
   justifie. En cas de doute, tu t'arrêtes et tu m'expliques.
5. Si une étape échoue, tu lis le journal (`docker logs bezier-portal-v2`) et tu corriges
   avec le script (relance, `--rollback`) plutôt qu'à la main. Tu ne laisses jamais le
   site public sans portail : si la v2 ne marche pas, la v1 doit tourner.

## Étapes

**1. Outils sur ce PC.** Vérifie que `ssh` (OpenSSH intégré à Windows) et `curl` sont
disponibles dans PowerShell.

**2. Accès SSH non interactif au NAS.** Teste :
`ssh -o BatchMode=yes -o ConnectTimeout=8 thierrybezier@192.168.1.31 "echo OK"`.
Si cela échoue :
- si la connexion est refusée, demande-moi d'activer SSH dans UGOS (Panneau de
  configuration → Terminal) et attends ma confirmation ;
- s'il manque une clé, crée-en une sans phrase de passe :
  `ssh-keygen -t ed25519 -N '""' -f "$env:USERPROFILE\.ssh\id_ed25519"` (ne pas écraser
  une clé existante), puis donne-moi à exécuter moi-même, dans Windows Terminal, la
  commande qui copie la clé publique sur le NAS, par exemple :
  `type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh thierrybezier@192.168.1.31 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"`
  Je taperai le mot de passe du NAS moi-même. Attends ma confirmation, puis reteste.

**3. Diagnostic du NAS** (en lecture seule) :
`ssh thierrybezier@192.168.1.31 "docker info >/dev/null 2>&1 && echo DOCKER_OK || (sudo -n docker info >/dev/null 2>&1 && echo SUDO_OK || echo SUDO_MDP)"`
puis `docker ps -a` (ou `sudo -n docker ps -a`), `docker network ls`, `ls /home/thierrybezier/Playbook | head`, `df -h /home /var/lib/docker`.
Confirme-moi : les trois conteneurs v1 tournent, `cloudflared` est présent, la
bibliothèque est visible, il reste plus de 3 Go de disque.
Si le résultat est `SUDO_MDP` (sudo demande un mot de passe), Docker ne peut pas être
piloté sans saisie : donne-moi alors les deux commandes à lancer moi-même dans mon
terminal SSH, et attends ma confirmation avant de continuer à l'étape 5 :
`curl -fsSL -o /tmp/install.sh <URL du script>` puis `bash /tmp/install.sh`.

**4. Installation** (si `DOCKER_OK` ou `SUDO_OK`) :
`ssh thierrybezier@192.168.1.31 "curl -fsSL -o /tmp/install.sh <URL du script> && bash /tmp/install.sh"`
Laisse la commande aller au bout (la construction de l'image peut prendre 5 à 10 minutes).
Montre-moi les lignes marquées ✔ et ⚠. Le script sait revenir à la v1 tout seul ; si
c'est arrivé, arrête-toi et explique-moi ce que dit le journal.

**5. Vérifications** :
- `ssh thierrybezier@192.168.1.31 "bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh --status"`
- depuis ce PC : `curl.exe -s https://clients.thierrybezier.com/health` doit renvoyer
  `"ok":true`, un nombre de fichiers indexés cohérent avec la bibliothèque, et
  `"setupRequired":true`.
- si le site public ne répond pas alors que le port 8095 répond sur le NAS, vérifie que la
  v2 est bien sur le réseau de `cloudflared` (`docker inspect bezier-portal-v2` et
  `docker inspect <cloudflared>`, section Networks) et dis-le moi avant de changer quoi
  que ce soit.

**6. Initialisation du studio** :
récupère le code d'initialisation :
`ssh thierrybezier@192.168.1.31 "docker logs bezier-portal-v2 2>&1 | grep -o \"Code d'initialisation : [A-Z0-9-]*\" | tail -1"`
(avec `sudo -n` si nécessaire). Ce code n'est pas un secret durable : tu peux me l'afficher.
Puis dis-moi d'ouvrir `https://clients.thierrybezier.com/admin`, de saisir ce code, et de
choisir mon identifiant et mon mot de passe. Attends ma confirmation, puis vérifie que
`https://clients.thierrybezier.com/health` renvoie `"setupRequired":false`.

**7. Rapport final** : ce qui a été fait, les vérifications réussies, l'état des conteneurs,
et les commandes utiles à garder :
- mise à jour : `bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh`
- état : `bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh --status`
- retour à la v1 : `bash /home/thierrybezier/BezierPortal-v2/deploy/install.sh --rollback`
- journal : `docker logs -f bezier-portal-v2`

Les aperçus des images et vidéos se génèrent en tâche de fond après le premier scan :
c'est normal que les premières vignettes mettent un moment à apparaître.
