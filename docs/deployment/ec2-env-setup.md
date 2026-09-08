# EC2 environment setup — `ashtalakshimi-api`

The NestJS API runs on EC2 at `http://43.204.228.63`. Its env lives at
`/home/ubuntu/Astalakshimi/.env`. This file lists every required variable and
the exact shell commands to update them.

---

## Routine: audit + edit

```bash
# Show the current env (redacted)
bash scripts/check-ec2-env.sh

# Apply this session's hardening + prod failsafe
bash scripts/fix-ec2-env.sh

# SSH into the EC2 box (alternatively use AWS SSM Session Manager; aws:startShellCommand)
ssh ubuntu@43.204.228.63
sudo -i   # or `cd /home/ubuntu/Astalakshimi` as the app user
```

---

## Required vars, by purpose

### Auth / JWT

| Var                       | Current (sensitive — don't commit)              | Production fail-fast? |
| ------------------------- | ----------------------------------------------- | ---------------------- |
| `JWT_SECRET`              | `e45059f3...0`                                | Yes — must be ≥32 chars, not start with `astalakshimi-` |
| `JWT_EXPIRES_IN`          | `1h`                                            | No  |
| `REFRESH_TOKEN_EXPIRES_IN`| `7d`                                            | No  |

If `JWT_SECRET` is weak or missing in prod, the API throws on boot (added during hardening).

### OTP / SMS

| Var                  | Dev           | Prod                                             | Fail-fast? |
| -------------------- | ------------- | ------------------------------------------------ | ---------- |
| `MOCK_OTP_ENABLED`   | `true`        | **`false`** or unset                            | Yes — prod refuses to start if `true` |
| `SMS_PROVIDER`       | unset         | `apitxt`                                         | |
| `APITXT_AUTH_KEY`    | unset         | *(your apitxt dashboard key — rotate)*          | Required by SmsService when `SMS_PROVIDER=apitxt` |
| `APITXT_CHANNEL`     | unset         | `sms` (or `whatsapp` for WhatsApp delivery)      | |
| `APITXT_COUNTRY`     | `91`          | `91`                                             | Default if unset |
| `APITXT_TEMPLATE_ID` | unset         | *(DLT template id)*                              | Optional |
| `OTP_TTL_SECONDS`    | `300`         | `300` or `180` for tighter windows               | No |
| `OTP_MAX_PER_PHONE_PER_WINDOW` | `3`   | `3`                                              | No |
| `OTP_SEND_WINDOW_SECONDS`     | `600` | `300` for tighter windows                       | No |

### RDS / Database

| Var           | Value (rotate in IAM-equivalent / RDS console)             |
| ------------- | ----------------------------------------------------------- |
| `DATABASE_URL`| `postgresql://postgres:<password>@ashtalakshmi-db.../ashtalakshmi?sslmode=require` |
| `DB_POOL_MAX` | `20` (default `10` is too small for chat load)              |

### Storage (S3)

| Var                       | Value                                        |
| ------------------------- | -------------------------------------------- |
| `AWS_REGION`              | `ap-south-1`                                 |
| `AWS_ACCESS_KEY_ID`       | *(IAM — rotate)*                             |
| `AWS_SECRET_ACCESS_KEY`   | *(IAM — rotate)*                             |
| `AWS_S3_MEDIA_BUCKET`     | `ashtalakshmi-media`                         |
| `AWS_S3_VAULT_BUCKET`     | `ashtalakshmi-verification`                  |
| `CLOUDFRONT_URL`          | *(empty or your CDN)*                        |

### Payments (Razorpay)

| Var                            | Production              | Notes |
| ------------------------------ | ----------------------- | ----- |
| `RAZORPAY_KEY_ID`              | `rzp_live_...`           | Required by PaymentsService. |
| `RAZORPAY_KEY_SECRET`          | *(Razorpay — rotate)*   | **Production fail-fast:** API refuses to start without this. |
| `RAZORPAY_WEBHOOK_SECRET`      | *(set on Razorpay side)*| Future webhook support. |

### App

| Var          | Prod                       |
| ------------ | -------------------------- |
| `NODE_ENV`   | `production`               |
| `PORT`       | `4000`                     |
| `API_PREFIX` | `api`                      |
| `CORS_ORIGIN`| `https://astalakshimi-web.vercel.app` (comma-list if multiple) |

---

## Editing `.env` on the server (after rotation)

```bash
ssh ubuntu@43.204.228.63
cd /home/ubuntu/Astalakshimi
nano .env          # or vi .env

# After saving:
pm2 restart api    # pm2 picks up the fresh .env
sleep 5
curl -s http://127.0.0.1:4000/api/health
```

Update `pm2 status` and `pm2 logs api` if needed.

---

## The fail-fast rules (summary)

The API **refuses to boot** in production if any of these is missing/weak:

1. `JWT_SECRET` < 32 chars or starts with `astalakshimi-`
2. `MOCK_OTP_ENABLED=true`
3. `SMS_PROVIDER=apitxt` and `APITXT_AUTH_KEY` is missing  → SmsService throws on first OTP
4. `SMS_PROVIDER=razorpay` and `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` missing  → PaymentsConfig throws

In **development** all of these fall back to safe dummy values so the server boots without ceremony.

---

## One-shot audit before deploy

```bash
bash scripts/check-ec2-env.sh
```

This is the redacted viewer — shows every var with values masked for secrets,
full URL with the password replaced by `***`.

To update runtime secrets cleanly without editing the file by hand, the
existing `bash scripts/fix-ec2-env.sh` script automates the common changes:
- forces `NODE_ENV=production`
- forces `MOCK_OTP_ENABLED=false`
- generates a new `JWT_SECRET` if the existing one is missing/short/default
- keeps `AWS_*_BUCKET` and `CORS_ORIGIN` aligned
