# Admin console UI

Frontend-only operations dashboard under `/admin`. Separate from the member app  different login, layout, and session.

Read with [ui-ux.md](./ui-ux.md) for tokens. Data is mock in `sessionStorage` until Nest admin endpoints are wired through the BFF.

## Auth (duplicate)

| Route | Purpose |
| --- | --- |
| `/admin/login` | Staff email + password (not member OTP) |

- Schemas: `adminLoginSchema` in [`validation.ts`](../apps/web/src/lib/validation.ts)
- Session key: `astalakshimi.admin.session` in [`admin-store.ts`](../apps/web/src/lib/admin-store.ts)
- Demo admin: `admin@astalakshimi.in` / `AstaAdmin@2026`
- Demo moderator: `moderator@astalakshimi.in` / `Mod@2026`
- Logout clears **only** admin session; member cookies / `localStorage.is_authenticated` untouched
- Layout gate: [`admin-gate.tsx`](../apps/web/src/components/admin/admin-gate.tsx)

## Shell

[`AdminShell`](../apps/web/src/components/admin/admin-shell.tsx)  mobile-first:

- Top bar: logo mark, staff name, **Install app**, sign out
- Desktop: horizontal nav links (no left sidebar)
- Mobile: bottom tab bar  Home · Profiles · Reports · Audit
- Flat cream chrome, hairline borders  no decorative gold labels or sidebar drawer

## PWA / Install as webapp

- Manifest: [`app/manifest.ts`](../apps/web/src/app/manifest.ts)  name **Astalakshimi Admin**, `start_url: /admin`, `display: standalone`
- Install control: [`install-app-button.tsx`](../apps/web/src/components/admin/install-app-button.tsx)
  - Chrome/Android: uses `beforeinstallprompt`
  - iOS: shows Share → Add to Home Screen hint
- Shown on login and in the admin header

## Routes

```
/admin/login              staff sign-in
/admin                    analytics home
/admin/profiles           Review | All profiles tabs
/admin/profiles/new       assisted create (brokers / family)
/admin/profiles/[id]      KYC review detail
/admin/reports            member report queue
/admin/audit              approval history
```

## Home `/admin`

Compact 2×4 stat grid (users, profiles, paid, pending, revenue, verified, rejected, incomplete). List-style pending-by-type and SLA watch  no decorative progress bars or “royal” kickers.

## Profiles

### Review tab

Pending queue from mock store. Row: photo, name, city, method (selfie / govt ID), horoscope flag, submitted time, SLA chip. **Review** → detail page.

### All profiles tab

Search (name, phone, city). Filters: verification status, gender, city, completeness band, created-by (self / staff). Actions: View, Suspend.

### Create `/admin/profiles/new`

Two steps: basics (identity + community) then photos / selfie or govt ID / horoscope via reused signup verify step. Optional **Mark verified after create** for walk-in KYC. No member OTP.

### Review detail `/admin/profiles/[id]`

Three panes:

1. **Photos**  grid with per-photo status
2. **Govt ID / Selfie**  document preview
3. **Horoscope**  PDF name + birth fields

Footer when pending: **Approve** or **Reject** (Zod `adminRejectSchema`, reason required). Writes audit entry.

## Reports & audit

- **Reports**  inappropriate photo, fake ID, harassment, spam; status New / Actioned
- **Audit**  staff name, action (approved / rejected / suspended / created), timestamp, note

## Mock data keys

| Key | Contents |
| --- | --- |
| `astalakshimi.admin.session` | Staff session |
| `astalakshimi.admin.profiles` | ~12 seeded profiles |
| `astalakshimi.admin.reports` | Member flags |
| `astalakshimi.admin.audit` | Staff action log |

Hooks: [`admin-queries.ts`](../apps/web/src/hooks/admin-queries.ts)  TanStack Query over the store. Shapes match Nest admin API for later swap.

## API target (not wired in this pass)

```
GET  /api/admin/stats
GET  /api/admin/verifications/pending
PATCH /api/admin/verifications/:profileId  { status, rejectionReason? }
```

Requires JWT with role `admin` or `moderator`.
