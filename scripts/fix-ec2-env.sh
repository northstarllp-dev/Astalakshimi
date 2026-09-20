#!/bin/bash
set -e
ENV=/home/ubuntu/Astalakshimi/.env

update_kv() {
  local key="$1"
  local val="$2"
  if grep -q "^${key}=" "$ENV"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV"
  else
    echo "${key}=${val}" >> "$ENV"
  fi
}

update_kv NODE_ENV production
update_kv JWT_EXPIRES_IN 1h
update_kv REFRESH_TOKEN_EXPIRES_IN 7d
update_kv AWS_S3_MEDIA_BUCKET ashtalakshimi-media
update_kv AWS_S3_VAULT_BUCKET ashtalakshimi-verification
update_kv CORS_ORIGIN "https://astalakshimi-web.vercel.app,http://localhost:3000"

# Remove stale keys from the old mock-OTP setup (no longer read by the API)
sed -i '/^MOCK_OTP_ENABLED=/d; /^DEFAULT_MOCK_OTP=/d' "$ENV"

# Production refuses to boot without a real SMS provider — verify before restarting
if ! grep -qE '^SMS_PROVIDER=..*' "$ENV" || ! grep -qE '^APITXT_AUTH_KEY=..*' "$ENV"; then
  echo "ERROR: SMS_PROVIDER and APITXT_AUTH_KEY must be set — the API fails closed without them." >&2
  exit 1
fi

# Generate a strong JWT_SECRET if missing or still a known weak/default value
if ! grep -q '^JWT_SECRET=' "$ENV" \
   || grep -qE '^JWT_SECRET=(astalakshimi-?|$)' "$ENV" \
   || [ "$(grep '^JWT_SECRET=' "$ENV" | head -n1 | cut -d= -f2- | wc -c)" -lt 33 ]; then
  update_kv JWT_SECRET "$(python3 -c 'import secrets; print(secrets.token_hex(48))')"
  echo "JWT_SECRET was missing or weak — generated a new one (existing sessions are invalidated)."
fi

echo "=== Updated EC2 .env (redacted) ==="
python3 <<'PY'
import re, pathlib
p = pathlib.Path('/home/ubuntu/Astalakshimi/.env')
for line in p.read_text().splitlines():
    if not line.strip() or line.strip().startswith('#'):
        continue
    k, v = line.split('=', 1)
    if k == 'DATABASE_URL':
        v = re.sub(r'://([^:]+):([^@]+)@', r'://\\1:***@', v)
    elif any(x in k for x in ('SECRET', 'ACCESS_KEY', 'JWT_SECRET')):
        v = '***'
    print(f'{k}={v}')
PY

pm2 restart api
sleep 8
echo "=== HEALTH ==="
curl -sS -m 15 http://127.0.0.1:4000/api/health
echo
pm2 list
