# Cashfree payments — merchant setup and incident runbook

Cashfree is the only payment gateway. The NestJS adapter creates orders, verifies them server-side, accepts signed webhooks, and reconciles stuck rows. **Checkout, plans, and contact-unlock UI are not wired to Cashfree yet.** Do not point those pages at the web SDK until that follow-up is explicit.

Secrets live only in API env. Never commit merchant keys or Postman TEST credentials.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `CASHFREE_CLIENT_ID` | Yes (fail-fast) | Merchant App ID |
| `CASHFREE_CLIENT_SECRET` | Yes (fail-fast) | Merchant secret; used by the SDK and webhook HMAC |
| `CASHFREE_WEBHOOK_SECRET` | Strongly recommended | Same as client secret unless the dashboard shows a dedicated value. Unsigned webhooks are rejected until this is set. |
| `CASHFREE_ENVIRONMENT` | Yes | `sandbox` or `production` |
| `CASHFREE_API_VERSION` | No | Default `2025-01-01` (team Postman collection) |
| `CASHFREE_WEBHOOK_REPLAY_WINDOW_MS` | No | Default `300000` (5 minutes) |
| `PAYMENTS_WEBHOOK_IP_ALLOWLIST_ENABLED` | No | Set `true` in production after confirming source IPs |
| `CASHFREE_WEBHOOK_IPS` | With allow-list | Comma-separated. Sandbox: `52.66.25.127,15.206.45.168`. Production: `52.66.101.190,3.109.102.144,18.60.134.245,18.60.183.142` |
| `FRONTEND_URL` | For return_url | e.g. `https://astalakshimi-web.vercel.app` |
| `API_PUBLIC_URL` | For notify_url | Public API origin including `/api`, e.g. `https://api.example.com/api` |
| `NEXT_PUBLIC_CASHFREE_ENVIRONMENT` | Web only | `sandbox` or `production`. Used by `lib/cashfree.ts` when checkout is wired. |

The Node SDK picks the base URL from `CASHFREE_ENVIRONMENT`: sandbox `https://sandbox.cashfree.com/pg`, production `https://api.cashfree.com/pg`.

## Merchant dashboard checklist

1. Create a Cashfree PG merchant account and complete KYC.
2. In **Developers → API Keys**, copy sandbox App ID + Secret into `.env`. Do not paste Postman collection TEST keys into git.
3. In **Developers → Webhooks**, add `POST {API_PUBLIC_URL}/payments/webhook/cashfree`.
4. Subscribe at least to: `PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, `ORDER_PAID`, `PAYMENT_FLAGGED_WEBHOOK`, `USER_REFUNDED_WEBHOOK`.
5. Copy the webhook secret into `CASHFREE_WEBHOOK_SECRET`.
6. Confirm API version `2025-01-01` in dashboard / collection.
7. Production keys require 2FA. Switch `CASHFREE_ENVIRONMENT=production` only after sandbox is green.
8. Enable `PAYMENTS_WEBHOOK_IP_ALLOWLIST_ENABLED=true` with the production IP list before go-live.

## Webhook contract

- Headers: `x-webhook-signature`, `x-webhook-timestamp`.
- Signature: SDK `PGVerifyWebhookSignature(signature, rawBody, timestamp)` (HMAC over `timestamp + rawBody`).
- Replay: timestamps older than `CASHFREE_WEBHOOK_REPLAY_WINDOW_MS` return 401.
- Idempotency: `payments.webhook_event_id` is unique; duplicates return `{ received: true, alreadyProcessed: true }`.
- Raw body must be the exact bytes received. `main.ts` captures `req.rawBody` before JSON parse.

## Order vs payment status

| Order status | Our action |
| --- | --- |
| `ACTIVE` | Pending. After 20 minutes, reconciliation terminates the order. After 30 minutes still pending, flag a discrepancy. After 24 hours, manual review only. |
| `PAID` | Capture + activate entitlement (plan or contact unlock). |
| `EXPIRED` / `TERMINATED` / `TERMINATION_REQUESTED` | Mark payment `failed`. |
| Payment `FAILED` while order `ACTIVE` | User can retry the same order until expiry. Webhook `PAYMENT_FAILED_WEBHOOK` records failure on our row; do not treat a later `PAID` as impossible until the order is terminal. |
| `PAYMENT_FLAGGED_WEBHOOK` | Discrepancy row; **do not** activate entitlement. |
| `USER_REFUNDED_WEBHOOK` | Mark payment `refunded` and expire the tied subscription. Merchant `createRefund` does **not** revoke entitlement until this webhook confirms. |

## Sandbox manual checks

1. `CASHFREE_ENVIRONMENT=sandbox`.
2. `POST /api/payments/orders` with a paid plan returns `paymentSessionId`.
3. From a scratch page (not `/checkout`), call `openCashfreeCheckout({ paymentSessionId })`.
4. Test card `4111 1111 1111 1111` (any future expiry/CVV). UPI `success@cashfree` / `fail@cashfree`.
5. Tunnel webhooks (ngrok/cloudflared) to `/api/payments/webhook/cashfree`.
6. Re-run verify → already processed.
7. Replay the same webhook → `alreadyProcessed: true`.
8. Old timestamp or tampered body → 401.
9. Non-allowlisted IP with allow-list on → 401.
10. Flagged webhook → discrepancy, no subscription.
11. Refund webhook → subscription expired.

`/checkout` still only activates the free plan. Paid confirm throws until the paywall is wired.

## Incident runbook

### Webhook signature failures (`cashfree_webhook_signature_verification_failed`)

1. Confirm `CASHFREE_WEBHOOK_SECRET` matches the dashboard (usually the client secret).
2. Confirm the route is not behind a proxy that re-encodes JSON.
3. Check clock skew vs `x-webhook-timestamp`.
4. Do not disable verification to “unblock” payments.

### Stuck `created` payments (`payment_stuck > 30 min`)

1. Inspection: `payments` row + Cashfree Get Order.
2. If Cashfree is `PAID`, wait for the 10-minute reconciliation job or call verify.
3. If `ACTIVE` and abandoned, wait for terminate (20 min) then failed.
4. If older than 24 hours, resolve in `payment_discrepancies` after merchant dashboard confirmation.

### Amount / currency mismatch (`payment_discrepancy`)

1. Do **not** activate entitlement.
2. Compare `payments.amount_paise` with Cashfree `order_amount`.
3. Refund on Cashfree if they captured the wrong amount.
4. Mark the discrepancy resolved with operator id.

### Rate limits (429)

The SDK wrapper retries up to 3 times using `x-ratelimit-retry` (capped at 60s). Persistent 429s surface as 500 to the client. Back off traffic; do not loop create-order from the UI.

### Production cutover

1. Sandbox checklist green.
2. Rotate production App ID / secret via 2FA.
3. Set production webhook URL + secret + IP allow-list.
4. Switch `CASHFREE_ENVIRONMENT=production` and restart the API.
5. Keep `/checkout` unwired until the dedicated paywall task.

## Alerts to watch

- `payment_cashfree_error_rate > 1%`
- `payment_discrepancy` insert
- `payment_stuck > 30 min`
- `cashfree_webhook_signature_verification_failed`
