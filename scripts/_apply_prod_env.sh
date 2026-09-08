#!/bin/bash
set -euo pipefail
ENV=/home/ubuntu/Astalakshimi/.env
NEW=/tmp/ashtalakshmi.prod.env
BACKUP=/home/ubuntu/Astalakshimi/.env.bak.$(date +%Y%m%d%H%M%S)

if [ ! -f "$NEW" ]; then
  echo "Missing $NEW"
  exit 1
fi

cp "$ENV" "$BACKUP"
echo "Backed up to $BACKUP"

# If incoming Razorpay keys are empty, keep existing server values
python3 - <<'PY'
from pathlib import Path
import re

def parse(path):
    d = {}
    for line in Path(path).read_text().splitlines():
        if not line.strip() or line.strip().startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        d[k] = v
    return d

old = parse('/home/ubuntu/Astalakshimi/.env')
new = parse('/tmp/ashtalakshmi.prod.env')

for k in ('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'):
    if not new.get(k) and old.get(k):
        new[k] = old[k]
        print(f'preserved {k} from existing server env')

# Fail closed if still missing required prod keys
required = ['NODE_ENV', 'JWT_SECRET', 'DATABASE_URL', 'SMS_PROVIDER']
missing = [k for k in required if not new.get(k)]
if missing:
    raise SystemExit(f'Missing required keys: {missing}')

if new.get('NODE_ENV') != 'production':
    raise SystemExit('NODE_ENV must be production')
if new.get('MOCK_OTP_ENABLED', 'false').lower() == 'true':
    raise SystemExit('MOCK_OTP_ENABLED must be false in production')
if len(new.get('JWT_SECRET', '')) < 32:
    raise SystemExit('JWT_SECRET too short')
if not new.get('RAZORPAY_KEY_ID') or not new.get('RAZORPAY_KEY_SECRET'):
    raise SystemExit('RAZORPAY_KEY_ID/SECRET missing on server and in incoming env — cannot boot production API')

order = [
'NODE_ENV','PORT','API_PREFIX','CORS_ORIGIN',
'DATABASE_URL','DB_POOL_MAX',
'JWT_SECRET','JWT_EXPIRES_IN','REFRESH_TOKEN_EXPIRES_IN','OTP_TTL_SECONDS','MOCK_OTP_ENABLED','DEFAULT_MOCK_OTP',
'SMS_PROVIDER','APITXT_AUTH_KEY','APITXT_CHANNEL','APITXT_TEMPLATE_ID','APITXT_COUNTRY',
'AWS_REGION','AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_S3_MEDIA_BUCKET','AWS_S3_VAULT_BUCKET','CLOUDFRONT_URL',
'RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET',
]
out = ['# Astalakshimi API production env']
seen = set()
for k in order:
    if k in new:
        out.append(f'{k}={new[k]}')
        seen.add(k)
for k, v in new.items():
    if k not in seen:
        out.append(f'{k}={v}')
Path('/home/ubuntu/Astalakshimi/.env').write_text('\n'.join(out) + '\n')
print('Wrote updated .env')
PY

chmod 600 "$ENV"

# Restart SSM agent so instance profile / managed node can register
sudo systemctl enable amazon-ssm-agent 2>/dev/null || true
sudo systemctl restart amazon-ssm-agent 2>/dev/null || sudo snap restart amazon-ssm-agent 2>/dev/null || true

pm2 restart api
sleep 8
echo '=== HEALTH ==='
curl -sS -m 15 http://127.0.0.1:4000/api/health || echo FAIL
echo
pm2 list
echo '=== REDACTED ENV ==='
python3 /tmp/_remote_audit_env.py 2>/dev/null || true
