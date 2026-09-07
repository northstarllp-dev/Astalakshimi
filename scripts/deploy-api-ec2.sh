#!/usr/bin/env bash
# Deploy the Nest API on EC2: pull latest code, build workspace packages, restart PM2, verify health.
# Run on the server: bash /home/ubuntu/Astalakshimi/scripts/deploy-api-ec2.sh
#
# Optional env:
#   DEPLOY_BRANCH=main          Git branch to deploy (default: main)
#   RUN_MIGRATIONS=true         Run drizzle migrations after build
#   SKIP_GIT_PULL=true          Skip fetch/reset (rebuild current checkout only)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4000/api/health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-20}"
HEALTH_INTERVAL_SEC="${HEALTH_INTERVAL_SEC:-3}"

log() { echo "[deploy] $*"; }

health_check() {
  local attempt response db_status
  for attempt in $(seq 1 "$HEALTH_RETRIES"); do
    if response="$(curl -sf -m 8 "$HEALTH_URL" 2>/dev/null)"; then
      db_status="$(printf '%s' "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('database',''))" 2>/dev/null || echo '')"
      if [ "$db_status" = "healthy" ]; then
        log "health ok (attempt $attempt): $response"
        return 0
      fi
      log "health response not ready (attempt $attempt): $response"
    else
      log "health request failed (attempt $attempt)"
    fi
    sleep "$HEALTH_INTERVAL_SEC"
  done
  return 1
}

build_api() {
  log "installing dependencies"
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@9.15.9 --activate >/dev/null 2>&1 || true
  pnpm install --frozen-lockfile

  log "building shared packages and api"
  pnpm --filter @astalakshimi/types build
  pnpm --filter @astalakshimi/validation build
  pnpm --filter @astalakshimi/database build
  pnpm --filter @astalakshimi/api build

  if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    log "running database migrations"
    pnpm --filter @astalakshimi/database db:migrate
  fi
}

restart_api() {
  log "restarting pm2 process"
  if pm2 describe api >/dev/null 2>&1; then
    pm2 restart ecosystem.config.cjs --only api --update-env
  else
    pm2 start ecosystem.config.cjs --only api
  fi
  pm2 save
}

PREV_COMMIT="$(git rev-parse HEAD)"
log "current commit: $PREV_COMMIT"

if [ "${SKIP_GIT_PULL:-false}" != "true" ]; then
  log "fetching origin/$DEPLOY_BRANCH"
  git fetch origin "$DEPLOY_BRANCH"
  git reset --hard "origin/$DEPLOY_BRANCH"
  log "deploying commit: $(git log -1 --oneline)"
fi

if ! build_api; then
  log "build failed"
  exit 1
fi

restart_api

if health_check; then
  log "deploy succeeded"
  pm2 list | head -10
  exit 0
fi

log "health check failed — rolling back to $PREV_COMMIT"
git reset --hard "$PREV_COMMIT"
build_api
restart_api

if health_check; then
  log "rollback succeeded; previous version restored"
  exit 1
fi

log "rollback also failed — manual intervention required"
pm2 logs api --nostream --lines 30 --err || true
exit 1
