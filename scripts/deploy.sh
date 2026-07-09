#!/usr/bin/env bash
# Deploy SamFin to fin.samsoft.pl (shared hosting).
#
# Run from WSL/Linux in repo root (not from PowerShell, not inside a container):
#   cd /home/msamotyj/www/fin && make deploy
#   git deploy -all   (after: make git-deploy-alias)
#
# Default (hybrid): local npm build + upload frontend artifacts, git pull + composer on server.
# -all / deploy-all: git add, commit, push lokalnie — potem ten sam deploy (git pull na serwerze).
# PHP webroot files (.htaccess, index.php) come from git pull — commit and push before deploy.
# Fallback:         ./scripts/deploy.sh --full-rsync  (when composer fails on hosting)
#
# File transfer: rsync when available on the remote host; otherwise tar+ssh/scp
# (typical on jailshell shared hosting where rsync is not installed).
#
# Preflight (every run): Docker app+frontend running, SSH to server OK, rsync detection.
#
# One-time server setup:
#   1. git clone <repo> ~/public_html/samfin
#   2. composer available on server (COMPOSER_BIN in deploy.env, default: composer)
#   3. cp backend/.env.prod.dist backend/.env && edit secrets (backend/.env is gitignored — nie commituj)
#   4. Subdomain fin.samsoft.pl — either:
#        docroot -> .../public_html/samfin/backend/public
#      or symlink:
#        cd ~/public_html && ln -s samfin/backend/public fin.samsoft.pl
#   5. Create MySQL database and set DATABASE_URL in backend/.env
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.yml"

# shellcheck source=/dev/null
[[ -f "$REPO_ROOT/deploy.env" ]] && source "$REPO_ROOT/deploy.env"

DEPLOY_HOST="${DEPLOY_HOST:-mjmvszga@146.59.111.235}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-911}"
DEPLOY_REPO_PATH="${DEPLOY_REPO_PATH:-/home/mjmvszga/public_html/samfin}"
DEPLOY_BACKEND_PATH="${DEPLOY_BACKEND_PATH:-$DEPLOY_REPO_PATH/backend}"
COMPOSER_BIN="${COMPOSER_BIN:-composer}"

SSH_OPTS=(-p "$DEPLOY_SSH_PORT" -o ServerAliveInterval=60 -o ConnectTimeout=10)
SCP_OPTS=(-P "$DEPLOY_SSH_PORT" -o ServerAliveInterval=60 -o ConnectTimeout=10)
RSYNC_SSH="ssh ${SSH_OPTS[*]}"
RSYNC_FLAGS=(-avz)

REMOTE_HAS_RSYNC=false
FULL_RSYNC=false
DRY_RUN=false
GIT_COMMIT_ALL=false

usage() {
    cat <<'EOF'
Usage: ./scripts/deploy.sh [OPTIONS]

Options:
  --all, -all    git add -A, commit ("poprawki" if unstaged changes), push — then deploy (git pull on server)
  --full-rsync   Build vendor locally and upload entire backend/ (no git pull / composer on server)
  --dry-run      Build locally; skip git add/commit/push (-all), upload and post-deploy
  -h, --help     Show this help
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --all|-all)   GIT_COMMIT_ALL=true; shift ;;
        --full-rsync) FULL_RSYNC=true; shift ;;
        --dry-run)    DRY_RUN=true; shift ;;
        -h|--help)    usage; exit 0 ;;
        *) echo "Unknown option: $1" >&2; usage; exit 1 ;;
    esac
done

log() { printf '==> %s\n' "$*"; }
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

compose_running() {
    local service="$1"
    docker compose -f "$COMPOSE_FILE" ps --status running --services 2>/dev/null | grep -qx "$service"
}

detect_remote_rsync() {
    if ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "command -v rsync" >/dev/null 2>&1; then
        REMOTE_HAS_RSYNC=true
        log "Remote rsync: available"
    else
        REMOTE_HAS_RSYNC=false
        log "Remote rsync: not available (using tar+ssh/scp fallback)"
    fi
}

preflight() {
    log "Preflight checks..."

    if ! compose_running app || ! compose_running frontend; then
        log "Docker services not running — starting..."
        docker compose -f "$COMPOSE_FILE" up -d
        sleep 2
    fi

    compose_running app     || fail "container 'app' is not running (docker compose up -d)"
    compose_running frontend || fail "container 'frontend' is not running (docker compose up -d)"

    if ! ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "echo OK" >/dev/null 2>&1; then
        fail "SSH to $DEPLOY_HOST failed (port $DEPLOY_SSH_PORT)"
    fi

    detect_remote_rsync

    log "Preflight OK"
}

git_commit_and_push() {
    log "Git: add, commit, push..."
    git add -A
    if git diff --staged --quiet; then
        log "Nothing to commit — pushing current branch"
    else
        git commit -m "poprawki"
    fi
    git push
}

NPM_EXEC_ENV=(-e HOME=/app -e NPM_CONFIG_CACHE=/app/.npm-cache)

build_frontend() {
    log "Building frontend..."
    docker compose -f "$COMPOSE_FILE" exec -T "${NPM_EXEC_ENV[@]}" frontend npm ci
    log "Running frontend tests (Vitest)..."
    docker compose -f "$COMPOSE_FILE" exec -T -e HOME=/app frontend npm run test
    docker compose -f "$COMPOSE_FILE" exec -T -e HOME=/app frontend npm run build
}

build_backend_vendor() {
    log "Building backend vendor (prod)..."
    docker compose -f "$COMPOSE_FILE" exec -T app \
        composer install --no-dev --optimize-autoloader --no-interaction
}

has_download_artifacts() {
    local downloads_dir="$REPO_ROOT/backend/public/downloads"
    [[ -f "$downloads_dir/mobile.json" ]] && return 0
    compgen -G "$downloads_dir/*.apk" >/dev/null && return 0
    return 1
}

upload_downloads_artifacts() {
    local downloads_dir="$REPO_ROOT/backend/public/downloads"
    if ! has_download_artifacts; then
        log "Brak APK/manifestu w backend/public/downloads/ — pomijam upload mobile"
        return 0
    fi

    if [[ "$REMOTE_HAS_RSYNC" == true ]]; then
        log "Rsync mobile downloads to $DEPLOY_HOST:$DEPLOY_BACKEND_PATH/public/downloads/"
        rsync "${RSYNC_FLAGS[@]}" \
            -e "$RSYNC_SSH" \
            "$downloads_dir/" \
            "$DEPLOY_HOST:$DEPLOY_BACKEND_PATH/public/downloads/"
    else
        log "Upload mobile downloads (tar+ssh) to $DEPLOY_HOST:$DEPLOY_BACKEND_PATH/public/downloads/"
        ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "mkdir -p '$DEPLOY_BACKEND_PATH/public/downloads'"
        tar -C "$downloads_dir" -czf - . \
            | ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "tar -C '$DEPLOY_BACKEND_PATH/public/downloads' -xzf -"
    fi
}

upload_frontend_artifacts() {
    if [[ "$REMOTE_HAS_RSYNC" == true ]]; then
        log "Rsync frontend to $DEPLOY_HOST:$DEPLOY_BACKEND_PATH/public/app/"
        rsync "${RSYNC_FLAGS[@]}" --delete \
            -e "$RSYNC_SSH" \
            "$REPO_ROOT/backend/public/app/" \
            "$DEPLOY_HOST:$DEPLOY_BACKEND_PATH/public/app/"

        if [[ -f "$REPO_ROOT/backend/config/build_info.json" ]]; then
            log "Rsync build_info.json"
            rsync "${RSYNC_FLAGS[@]}" \
                -e "$RSYNC_SSH" \
                "$REPO_ROOT/backend/config/build_info.json" \
                "$DEPLOY_HOST:$DEPLOY_BACKEND_PATH/config/build_info.json"
        fi

        upload_downloads_artifacts
    else
        local remote_app="$DEPLOY_BACKEND_PATH/public/app"
        log "Upload frontend (tar+ssh) to $DEPLOY_HOST:$remote_app/"
        ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" \
            "rm -rf '$remote_app' && mkdir -p '$DEPLOY_BACKEND_PATH/public'"
        tar -C "$REPO_ROOT/backend/public" -czf - app \
            | ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "tar -C '$DEPLOY_BACKEND_PATH/public' -xzf -"

        if [[ -f "$REPO_ROOT/backend/config/build_info.json" ]]; then
            log "Upload build_info.json (scp)"
            scp "${SCP_OPTS[@]}" \
                "$REPO_ROOT/backend/config/build_info.json" \
                "$DEPLOY_HOST:$DEPLOY_BACKEND_PATH/config/build_info.json"
        fi

        upload_downloads_artifacts
    fi
}

upload_full_backend() {
    local -a excludes=(
        --exclude='var/cache/*'
        --exclude='var/log/*'
        --exclude='.env'
        --exclude='.env.local'
        --exclude='.env.*.local'
    )

    if [[ "$REMOTE_HAS_RSYNC" == true ]]; then
        log "Rsync full backend to $DEPLOY_HOST:$DEPLOY_BACKEND_PATH/"
        rsync "${RSYNC_FLAGS[@]}" "${excludes[@]}" --delete \
            -e "$RSYNC_SSH" \
            "$REPO_ROOT/backend/" \
            "$DEPLOY_HOST:$DEPLOY_BACKEND_PATH/"
    else
        log "Upload full backend (tar+ssh) to $DEPLOY_HOST:$DEPLOY_BACKEND_PATH/"
        ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "mkdir -p '$DEPLOY_BACKEND_PATH'"
        tar -C "$REPO_ROOT/backend" \
            --exclude='var/cache' \
            --exclude='var/log' \
            --exclude='.env' \
            --exclude='.env.local' \
            -czf - . | ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" \
            "tar -C '$DEPLOY_BACKEND_PATH' -xzf -"
    fi
}

remote_post_deploy() {
    local skip_composer="${1:-false}"
    log "Post-deploy on server..."
    # shellcheck disable=SC2029
    ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" bash -s -- \
        "$DEPLOY_REPO_PATH" \
        "$DEPLOY_BACKEND_PATH" \
        "$COMPOSER_BIN" \
        "$skip_composer" <<'REMOTE'
set -euo pipefail
REPO_PATH="$1"
BACKEND_PATH="$2"
COMPOSER_CMD="$3"
SKIP_COMPOSER="$4"

if [[ "$SKIP_COMPOSER" != "true" ]]; then
    cd "$REPO_PATH"
    ENV_BACKUP=""
    if [[ -f "$BACKEND_PATH/.env" ]]; then
        ENV_BACKUP="$(mktemp)"
        cp "$BACKEND_PATH/.env" "$ENV_BACKUP"
    fi
    git pull
    if [[ -n "$ENV_BACKUP" ]]; then
        cp "$ENV_BACKUP" "$BACKEND_PATH/.env"
        rm -f "$ENV_BACKUP"
    fi
    cd "$BACKEND_PATH"
    # shellcheck disable=SC2086
    $COMPOSER_CMD install --no-dev --optimize-autoloader --no-interaction
else
    cd "$BACKEND_PATH"
fi

mkdir -p var/cache var/log
chmod -R u+rwX var

if [[ ! -f .env ]]; then
    echo "ERROR: brak backend/.env na serwerze. Skopiuj .env.prod.dist i ustaw DATABASE_URL (localhost, nie db)." >&2
    exit 1
fi
if grep -qE '@db[:/]' .env 2>/dev/null; then
    echo "ERROR: backend/.env wskazuje host 'db' (Docker dev). Ustaw produkcyjny DATABASE_URL, np. z .env.prod.dist." >&2
    exit 1
fi

# Jednorazowe przemianowanie wersji migracji 07–10.07 → 06.07 (2026-07). Idempotentne (0 wierszy gdy już zastosowane).
# W SQL namespace wymaga podwójnego backslasha; w bash w cudzysłowie — poczwórnego (\\\\ → \\ w SQL → \ w wartości).
php bin/console dbal:run-sql "UPDATE doctrine_migration_versions SET version = 'App\\\\Migrations\\\\Version20260706140100' WHERE version = 'App\\\\Migrations\\\\Version20260707120000'" --no-interaction --env=prod --quiet || true
php bin/console dbal:run-sql "UPDATE doctrine_migration_versions SET version = 'App\\\\Migrations\\\\Version20260706140200' WHERE version = 'App\\\\Migrations\\\\Version20260708120000'" --no-interaction --env=prod --quiet || true
php bin/console dbal:run-sql "UPDATE doctrine_migration_versions SET version = 'App\\\\Migrations\\\\Version20260706140300' WHERE version = 'App\\\\Migrations\\\\Version20260709120000'" --no-interaction --env=prod --quiet || true
php bin/console dbal:run-sql "UPDATE doctrine_migration_versions SET version = 'App\\\\Migrations\\\\Version20260706140400' WHERE version = 'App\\\\Migrations\\\\Version20260710120000'" --no-interaction --env=prod --quiet || true

php bin/console doctrine:migrations:migrate --no-interaction --env=prod
php bin/console cache:clear --env=prod
php bin/console cache:warmup --env=prod

echo "Post-deploy done."
REMOTE
}

main() {
    cd "$REPO_ROOT"
    if [[ "$GIT_COMMIT_ALL" == true ]]; then
        if [[ "$DRY_RUN" == true ]]; then
            log "Dry run: skipping git add/commit/push"
        else
            git_commit_and_push
        fi
    fi
    preflight

    if [[ "$FULL_RSYNC" == true ]]; then
        build_backend_vendor
        build_frontend
        if [[ "$DRY_RUN" != true ]]; then
            upload_full_backend
            remote_post_deploy true
        else
            log "Dry run: skipping upload and post-deploy"
        fi
    else
        build_frontend
        if [[ "$DRY_RUN" != true ]]; then
            upload_frontend_artifacts
            remote_post_deploy false
        else
            log "Dry run: skipping upload and post-deploy"
        fi
    fi

    log "Deploy finished."
    log "Check: https://fin.samsoft.pl/api/health"
}

main
