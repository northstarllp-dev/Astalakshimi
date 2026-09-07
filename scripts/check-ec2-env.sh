#!/bin/bash
python3 <<'PY'
import re, pathlib

p = pathlib.Path('/home/ubuntu/Astalakshimi/.env')
if not p.exists():
    print('NO_ENV_FILE')
    raise SystemExit(1)

for line in p.read_text().splitlines():
    if not line.strip() or line.strip().startswith('#'):
        continue
    k, v = line.split('=', 1)
    if k in ('DATABASE_URL',):
        v = re.sub(r'://([^:]+):([^@]+)@', r'://\1:***@', v)
    elif any(x in k for x in ('SECRET', 'PASSWORD', 'ACCESS_KEY')):
        v = '***'
    print(f'{k}={v}')
PY

echo "--- PM2 ---"
pm2 show api 2>/dev/null | grep -E 'exec cwd|script path|status|restarts|uptime' || true

echo "--- HEALTH ---"
curl -sS -m 10 http://127.0.0.1:4000/api/health || echo FAIL
echo
