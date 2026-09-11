# Vercel environment setup — `astalakshimi-web`

This file lists every env var you need to set on <https://vercel.com/dashboard>
→ `astalakshimi-web` → **Settings** → **Environment Variables**.

Each entry has: key, value (or where you get it), environments, and why it matters.

---

## Required in every environment

| Key                          | Value                                                      | Why |
| ---------------------------- | ---------------------------------------------------------- | --- |
| `NEXT_PUBLIC_API_URL`       | `http://43.204.228.63/api`                                 | What the browser/BFF calls. Never `localhost`. |
| `NEXT_PUBLIC_AWS_REGION`     | `ap-south-1`                                               | Builds S3 URLs for media. |
| `NEXT_PUBLIC_S3_MEDIA_BUCKET`| `ashtalakshmi-media`                                       | Public bucket — covers `getMediaUrl()` fallbacks. |
| `NEXT_PUBLIC_CLOUDFRONT_URL` | *(empty, or your CDN once verified)*                        | When set, all images go via CDN. |

Set these in **Production**, **Preview**, and **Development**.

---

## Production only — real OTP / payment / media

Rotate the keys (every dev/chat-exposed one is now public). Save the new values only here,
not in chat history.

| Key                          | Where to get it                                                                 | Notes |
| ---------------------------- | -------------------------------------------------------------------------------- | ----- |
| `JWT_SECRET`                 | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`       | Min 32 chars. Don't set in Preview/Dev (use a separate value). |
| `SMS_PROVIDER`               | `apitxt`                                                                          | **Required** in prod; the API refuses to start otherwise. |
| `APITXT_AUTH_KEY`            | <https://dashboard.apitxt.com> → API Keys → Create                                | Rotate the previously-pasted key. |
| `APITXT_CHANNEL`             | `sms`                                                                             | |
| `APITXT_COUNTRY`             | `91`                                                                              | |
| `APITXT_TEMPLATE_ID`         | (your verified DLT template id — leave blank for default config)                  | Optional. |
| `RAZORPAY_KEY_ID`            | `rzp_live_...`                                                                    | |
| `RAZORPAY_KEY_SECRET`        | Razorpay dashboard                                                                | |
| `RAZORPAY_WEBHOOK_SECRET`    | Razorpay → Settings → Webhooks                                                     | For future webhook. |
| `AWS_REGION`                 | `ap-south-1`                                                                      | **Server-only** (no `NEXT_PUBLIC_`). Used by S3 presign. |
| `AWS_ACCESS_KEY_ID`          | IAM → Users → Security credentials → rotate                                         | Rotated — paste the new one. |
| `AWS_SECRET_ACCESS_KEY`      | Same as above                                                                     | Rotated. |

---

## Preview / staging

Preview deploys talk to the same EC2 API as production (via `NEXT_PUBLIC_API_URL`).
The login flow requires the EC2 API to be reachable — there is no mock/dev OTP path.
If EC2 is down, `/api/proxy/*` returns 502 and the front end shows an error, which is
the correct failure mode.

---

## Things Vercel sets automatically

Don't override these on Vercel — the platform controls them:

- `NODE_ENV` — Vercel sets `production` for prod, `preview` for PR builds,
  `development` for `vercel dev`.
- `VERCEL_REGION`, `VERCEL_URL`, `VERCEL_ENV`, `PORT` — reserved.

---

## How to add them

1. Open <https://vercel.com/dashboard>.
2. Select the **`astalakshimi-web`** project.
3. **Settings → Environment Variables**.
4. Click **Add New**.
5. Paste **Key** and **Value**. Tick **Production**, **Preview**, and
   **Development** for every variable.
6. **Save**. Trigger a redeploy (Deployments → ... → Redeploy) for env changes
   to take effect.

---

## Order of operations (recommended)

```text
1. Rotate AWS keys in IAM.
2. Rotate Razorpay live secret in Razorpay dashboard.
3. Rotate JWT_SECRET (generate new, paste to env).
4. Paste all rotated secrets into Vercel Production.
5. Redeploy.
6. Smoke test from the Vercel URL:
      curl -X POST https://astalakshimi-web.vercel.app/api/proxy/auth/send-otp \
           -H "Content-Type: application/json" \
           -d '{"phone":"9999999999","consentAccepted":true}'
   Expect: 201 with a real OTP SMS landing on the test phone within a few seconds.
7. Then move to EC2 .env updates (see `docs/deployment/ec2-env-setup.md`).
```

Doing Vercel first means even if your EC2 breaks during the rollout, the
front end still has up-to-date secrets; the BFF returns 502 from any
non-OTP route until EC2 is reachable again, but no real logins succeed
without the EC2 — which is what you want during a credential rotation.
