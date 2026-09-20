#!/usr/bin/env bash
# One-time EC2 bootstrap for git-based deploys. Run as ubuntu on the server.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

log() { echo "[setup] $*"; }

log "node: $(node -v 2>/dev/null || echo missing)"
log "pnpm: $(pnpm -v 2>/dev/null || echo missing)"

if ! command -v node >/dev/null 2>&1; then
  log "install Node 22 first (nvm, nodesource, or apt)"
  exit 1
fi

corepack enable
corepack prepare pnpm@9.15.9 --activate

chmod +x scripts/deploy-api-ec2.sh

# Git read access for private repo (deploy key ΓÇö add public key in GitHub repo Settings ΓåÆ Deploy keys)
DEPLOY_KEY="$HOME/.ssh/astalakshimi_deploy"
if [ ! -f "$DEPLOY_KEY" ]; then
  log "generating deploy key at $DEPLOY_KEY"
  ssh-keygen -t ed25519 -f "$DEPLOY_KEY" -N "" -C "ec2-astalakshimi-deploy"
  log ""
  log "Add this public key as a read-only Deploy key in GitHub:"
  log "https://github.com/northstarllp-dev/Astalakshimi/settings/keys"
  cat "${DEPLOY_KEY}.pub"
  log ""
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
if ! grep -q "github.com" "$HOME/.ssh/config" 2>/dev/null; then
  cat >> "$HOME/.ssh/config" <<EOF

Host github.com
  HostName github.com
  User git
  IdentityFile $DEPLOY_KEY
  IdentitiesOnly yes
EOF
  chmod 600 "$HOME/.ssh/config"
fi

git remote set-url origin git@github.com:northstarllp-dev/Astalakshimi.git
log "testing github ssh (may fail until deploy key is added)"
ssh -T git@github.com || true

if ! command -v pm2 >/dev/null 2>&1; then
  log "installing pm2 globally"
  npm install -g pm2
fi

pm2 startup systemd -u ubuntu --hp "$HOME" | tail -1 | bash || true

log "initial deploy"
bash scripts/deploy-api-ec2.sh

log "setup complete"
