#!/usr/bin/env bash
# Bézier ONE v2 — installation, mise à jour et retour arrière sur le NAS.
#
#   bash install.sh             installe (ou met à jour) la v2 et bascule le trafic dessus
#   bash install.sh --rollback  arrête la v2 et relance le conteneur v1
#   bash install.sh --status    état des conteneurs et test de santé
#
# La v1 n'est jamais modifiée : son dossier, son Compose (et le jeton Cloudflare qu'il
# contient) et son volume restent intacts. La v2 s'installe à côté et rejoint le réseau
# Docker de cloudflared sous l'alias « portal », que le tunnel utilise déjà.
set -euo pipefail

TARBALL="${BZ_TARBALL:-https://github.com/DernierExile/InkNoise/archive/refs/heads/claude/kind-hypatia-biu6jv.tar.gz}"
SUBDIR="bezier-one-portal"
APP_DIR="${BZ_APP_DIR:-/home/thierrybezier/BezierPortal-v2}"
LIBRARY_DIR="${BZ_LIBRARY:-/home/thierrybezier/Playbook}"
PROJECT_DIR="${BZ_PROJECT_DIR:-/docker/bezier-portal-v2}"
PROJECT_NAME="bezier-portal-v2"
V1_PROJECT="${BZ_V1_PROJECT:-bezier-portal}"
PUBLIC_ORIGIN="${BZ_PUBLIC_ORIGIN:-https://clients.thierrybezier.com}"
HOST_PORT="${BZ_HOST_PORT:-8095}"

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m✖ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------- Docker (avec sudo si nécessaire) ----------
SUDO=""
if ! docker info >/dev/null 2>&1; then
  if sudo docker info >/dev/null 2>&1; then SUDO="sudo"; else die "Docker est inaccessible (ni directement, ni via sudo)."; fi
fi
dk() { $SUDO docker "$@"; }
if dk compose version >/dev/null 2>&1; then
  dc() { $SUDO docker compose --project-name "$PROJECT_NAME" --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/docker-compose.yaml" "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
  dc() { $SUDO docker-compose --project-name "$PROJECT_NAME" --project-directory "$PROJECT_DIR" -f "$PROJECT_DIR/docker-compose.yaml" "$@"; }
else
  die "docker compose est introuvable."
fi
ensure_dir() { # crée un dossier, avec sudo seulement si nécessaire
  if [ -d "$1" ]; then [ -w "$1" ] || warn "$1 n'est pas modifiable par $(id -un) ; sudo sera utilisé"; return 0; fi
  if [ -w "$(dirname "$1")" ]; then mkdir -p "$1"; else sudo mkdir -p "$1"; fi
}
write_file() { # write_file <chemin> <mode>  (contenu sur stdin)
  local target="$1" mode="$2" tmp
  tmp="$(mktemp)"; cat > "$tmp"; chmod "$mode" "$tmp"
  if [ -w "$(dirname "$target")" ]; then mv "$tmp" "$target"; else sudo mv "$tmp" "$target"; sudo chown root:root "$target"; fi
}

v1_containers() { dk ps -a -q --filter "label=com.docker.compose.project=$V1_PROJECT" --filter "label=com.docker.compose.service=portal"; }
port_holders()  { dk ps -q --filter "publish=$HOST_PORT"; }
health_local()  { curl -fsS -m 5 "http://127.0.0.1:$HOST_PORT/health" 2>/dev/null; }

# ---------- Sous-commandes ----------
if [ "${1:-}" = "--status" ]; then
  say "Conteneurs"
  dk ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | grep -Ei 'portal|cloudflared|caddy|NAMES' || true
  say "Santé locale (port $HOST_PORT)"; health_local || echo "(pas de réponse)"
  say "Santé publique ($PUBLIC_ORIGIN)"; curl -fsS -m 15 "$PUBLIC_ORIGIN/health" || echo "(pas de réponse)"
  echo; exit 0
fi

if [ "${1:-}" = "--rollback" ]; then
  say "Retour à la v1"
  [ -f "$PROJECT_DIR/docker-compose.yaml" ] && dc down --remove-orphans || true
  ids="$(v1_containers)"
  [ -n "$ids" ] || die "Aucun conteneur v1 (projet « $V1_PROJECT », service « portal ») retrouvé. Relancez-le depuis l'application Docker du NAS."
  dk start $ids >/dev/null
  sleep 3
  ok "Conteneur v1 relancé : $(dk ps --format '{{.Names}}' --filter "publish=$HOST_PORT" | tr '\n' ' ')"
  health_local && echo || warn "Pas encore de réponse sur le port $HOST_PORT ; vérifiez dans quelques secondes."
  exit 0
fi

# ---------- Préparation ----------
say "Vérifications"
[ -d "$LIBRARY_DIR" ] || die "Bibliothèque introuvable : $LIBRARY_DIR"
command -v curl >/dev/null || die "curl est requis."
command -v tar  >/dev/null || die "tar est requis."
ok "Bibliothèque : $LIBRARY_DIR"

say "Téléchargement du code"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fsSL -o "$TMP/src.tgz" "$TARBALL" || die "Téléchargement impossible : $TARBALL"
tar -xzf "$TMP/src.tgz" -C "$TMP"
SRC="$(find "$TMP" -maxdepth 2 -type d -name "$SUBDIR" | head -1)"
[ -n "$SRC" ] && [ -f "$SRC/Dockerfile" ] || die "Archive inattendue : dossier $SUBDIR introuvable."
mkdir -p "$APP_DIR"
find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} + 2>/dev/null || true
cp -a "$SRC/." "$APP_DIR/"
ok "Code installé dans $APP_DIR (version $(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$APP_DIR/package.json" | head -1))"

say "Compte du studio"
ensure_dir "$PROJECT_DIR"
ENV_FILE="$PROJECT_DIR/.env"
if [ -e "$ENV_FILE" ] && ! [ -r "$ENV_FILE" ]; then
  ok "$ENV_FILE existe (lisible par root uniquement) : conservé tel quel"
elif [ -r "$ENV_FILE" ] && grep -q '^ADMIN_PASSWORD=.\{8,\}' "$ENV_FILE"; then
  ok "Compte maître « studio » déjà défini dans $ENV_FILE (inchangé)"
elif [ -r "$ENV_FILE" ] && grep -q '^ADMIN_PASSWORD=' "$ENV_FILE"; then
  ok "$ENV_FILE présent sans mot de passe maître : le compte propriétaire se crée dans le navigateur"
else
  PW="${BZ_ADMIN_PASSWORD:-}"
  if [ -z "$PW" ] && [ -t 0 ]; then
    echo "Facultatif : mot de passe du compte maître « studio ». Laissez vide (recommandé) pour créer"
    echo "le compte propriétaire directement dans le navigateur au premier accès à /admin."
    read -r -s -p "Mot de passe maître (Entrée pour passer) : " PW; echo
    if [ -n "$PW" ]; then
      read -r -s -p "Confirmez : " PW2; echo
      [ "$PW" = "$PW2" ] || die "Les deux saisies diffèrent."
      [ "${#PW}" -ge 8 ] || die "Trop court (8 caractères minimum)."
    fi
  fi
  if [ -n "$PW" ]; then
    printf 'ADMIN_PASSWORD=%s\n' "$PW" | write_file "$ENV_FILE" 600
    ok "Compte maître enregistré dans $ENV_FILE (lecture root uniquement)"
  else
    printf '# Compte maître facultatif (ADMIN_PASSWORD=...). Vide : initialisation dans le navigateur.\nADMIN_PASSWORD=\n' | write_file "$ENV_FILE" 600
    ok "Pas de compte maître : le compte propriétaire sera créé au premier accès à $PUBLIC_ORIGIN/admin"
  fi
fi

say "Réseau du tunnel Cloudflare"
NET=""
CF="$(dk ps --format '{{.Names}}\t{{.Image}}' | awk -F'\t' 'tolower($2) ~ /cloudflared/ {print $1; exit}')"
if [ -n "$CF" ]; then
  NET="$(dk inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$CF" | grep -v '^host$' | head -1)"
  [ -n "$NET" ] && ok "cloudflared « $CF » est sur le réseau « $NET »"
fi
if [ -z "$NET" ] && dk network inspect "${V1_PROJECT}_default" >/dev/null 2>&1; then
  NET="${V1_PROJECT}_default"; warn "cloudflared non détecté : utilisation du réseau $NET"
fi
if [ -z "$NET" ]; then
  NET="${PROJECT_NAME}_net"
  dk network inspect "$NET" >/dev/null 2>&1 || dk network create "$NET" >/dev/null
  warn "Aucun réseau existant trouvé : réseau « $NET » créé. Il faudra y connecter cloudflared : docker network connect $NET <conteneur cloudflared>"
fi

say "Fichier Compose"
write_file "$PROJECT_DIR/docker-compose.yaml" 644 <<EOF
# Généré par install.sh — Bézier ONE v2. Le service v1 et cloudflared restent dans $V1_PROJECT.
services:
  portal:
    build:
      context: $APP_DIR
      network: host
    image: bezier-one-portal:2
    container_name: bezier-portal-v2
    restart: unless-stopped
    ports:
      - "$HOST_PORT:8080"
    env_file:
      - $ENV_FILE
    environment:
      PORT: "8080"
      LIBRARY_ROOT: /library
      DATA_DIR: /data/v2
      PUBLIC_ORIGIN: $PUBLIC_ORIGIN
      SCAN_INTERVAL_MIN: "15"
      THUMB_CONCURRENCY: "2"
      PREWARM_THUMBS: "1"
    volumes:
      - $LIBRARY_DIR:/library:ro
      - portal-data:/data
    networks:
      default:
        aliases:
          - portal
    stop_grace_period: 15s
networks:
  default:
    name: $NET
    external: true
volumes:
  portal-data:
EOF
ok "$PROJECT_DIR/docker-compose.yaml"

say "Construction de l'image (quelques minutes la première fois)"
if ! dc build --pull portal; then
  warn "Docker Hub injoignable ou limité : nouvel essai à partir des images déjà présentes."
  DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 dc build portal 2>/dev/null || dc build portal
fi
ok "Image construite"

say "Bascule du trafic"
V1_IDS="$(v1_containers | tr '\n' ' ')"
HOLDERS="$(port_holders | tr '\n' ' ')"
if [ -n "$V1_IDS$HOLDERS" ]; then
  for id in $(printf '%s\n' $V1_IDS $HOLDERS | sort -u); do
    name="$(dk inspect -f '{{.Name}}' "$id" | sed 's#^/##')"
    [ "$name" = "bezier-portal-v2" ] && continue
    dk stop "$id" >/dev/null && ok "Conteneur arrêté : $name (non supprimé, pour un retour arrière)"
  done
fi
dc up -d --remove-orphans

say "Vérification"
for i in $(seq 1 60); do
  if out="$(health_local)"; then
    ok "Portail v2 en ligne : $out"
    break
  fi
  sleep 2
  [ "$i" -eq 60 ] && {
    warn "Le portail ne répond pas sur le port $HOST_PORT. Journal :"
    dc logs --tail 60 portal || true
    warn "Retour automatique à la v1."
    dc down --remove-orphans || true
    [ -n "$V1_IDS" ] && dk start $V1_IDS >/dev/null || true
    die "Déploiement annulé, la v1 est relancée."
  }
done
if pub="$(curl -fsS -m 20 "$PUBLIC_ORIGIN/health" 2>/dev/null)"; then
  ok "Accessible publiquement : $PUBLIC_ORIGIN"
else
  warn "Pas de réponse via $PUBLIC_ORIGIN pour l'instant. Si cela persiste au bout d'une minute, vérifiez que cloudflared est bien sur le réseau « $NET » (docker network connect $NET <cloudflared>)."
fi

SETUP_LINE=""
if printf '%s' "$out" | grep -q '"setupRequired":true'; then
  CODE="$(dk logs bezier-portal-v2 2>&1 | grep -o "Code d'initialisation : [A-Z0-9-]*" | tail -1 | sed "s/.*: //")"
  SETUP_LINE="  Premier accès : ouvrez $PUBLIC_ORIGIN/admin et créez le compte propriétaire avec le code ${CODE:-(voir docker logs bezier-portal-v2)}"
fi

cat <<EOF

Terminé.
$SETUP_LINE
  Studio        : $PUBLIC_ORIGIN/admin
  Journal       : $SUDO docker logs -f bezier-portal-v2
  Mise à jour   : bash $APP_DIR/deploy/install.sh
  Retour à v1   : bash $APP_DIR/deploy/install.sh --rollback
  État          : bash $APP_DIR/deploy/install.sh --status
EOF
