# UI changes log

Running log of product UI shipped in `apps/web` (frontend-only, mock `sessionStorage`). Update this file when behaviour or routes change.

---

## Member verification states (Home)

**Routes:** `/home`, `/profile/verify`  
**Files:** [`home/page.tsx`](../apps/web/src/app/(dashboard)/home/page.tsx), [`profile/verify/page.tsx`](../apps/web/src/app/(dashboard)/profile/verify/page.tsx), [`profile-store.ts`](../apps/web/src/lib/profile-store.ts)

- Member `verificationStatus`: `idle` | `pending` | `verified` | `rejected` (+ optional `rejectionReason`)
- Home: amber pending banner (demo Approve / Simulate reject) · red rejected banner with reason + Re-upload CTA
- `/profile/verify` reuses signup verify step; resubmit → pending and clears reason
- Discover still requires verified + 80% completeness

---

## Offer bar (replaces hero timeline)

**Route:** `/`  
**File:** [`hero-free-search-countdown.tsx`](../apps/web/src/components/landing/hero-free-search-countdown.tsx)

- Replaced Days/Hrs/Min/Sec boxes with a slim maroon strip under the header
- Copy: `3 months free from 14 Sep 2026 · Nd Nh Nm left` (minute refresh; hides when expired)

---

## Admin mobile + PWA redesign

**Routes:** `/admin/*`  
**Files:** [`admin-shell.tsx`](../apps/web/src/components/admin/admin-shell.tsx), [`install-app-button.tsx`](../apps/web/src/components/admin/install-app-button.tsx), [`manifest.ts`](../apps/web/src/app/manifest.ts)

- Removed sidebar / “operations console” decorative AI look
- Mobile bottom tabs + compact top bar; desktop uses top links
- Flat stat cards and list rows; profiles use cards on phone, table on desktop
- **Install app** button (PWA) on login and header  Chrome prompt or iOS Add to Home Screen tip
- Spec: [ui-admin.md](./ui-admin.md)

---

## Login split layout

**Route:** `/login`  
**File:** [`login/page.tsx`](../apps/web/src/app/(auth)/login/page.tsx)

- Full-bleed heritage split: temple-lamps photo with maroon wash on desktop; cream OTP card with kolam corners and gold rule
- Mobile: compact photo banner, then the same form
- OTP flow unchanged (phone → 6-digit code → `/home` or `/register`)

---

## Admin operations console

**Routes:** `/admin`, `/admin/login`, `/admin/profiles`, `/admin/profiles/new`, `/admin/profiles/[id]`, `/admin/reports`, `/admin/audit`  
**Files:** [`admin-store.ts`](../apps/web/src/lib/admin-store.ts), [`admin-queries.ts`](../apps/web/src/hooks/admin-queries.ts), [`admin-shell.tsx`](../apps/web/src/components/admin/admin-shell.tsx)

- Separate staff auth (email + password)  not member OTP at `/login`
- Analytics home: users, profiles, subscriptions, pending verifications, revenue, SLA breaches
- Profiles: Review queue + All profiles with search/filters; create-for-others; KYC detail (photos, govt ID, horoscope) with approve/reject
- Reports and audit trail (mock sessionStorage)
- Spec: [ui-admin.md](./ui-admin.md)

---

## Plans compare redesign

**Route:** `/plans`  
**Files:** [`plans/page.tsx`](../apps/web/src/app/(dashboard)/plans/page.tsx), [`plan-compare.tsx`](../apps/web/src/components/plans/plan-compare.tsx)

- Dark compare strip replaced with cream heritage cards (temple maroon / gold / peacock badges).
- Gold stays the featured plan (gold banner, gold price, filled CTA). Horizontal scroll on small screens; five columns on large.
- Plan choice is validated with Zod before checkout. Subscription + invoices use TanStack Query.

---

## Zod + TanStack Query

**Files:** [`lib/validation.ts`](../apps/web/src/lib/validation.ts), [`hooks/queries.ts`](../apps/web/src/hooks/queries.ts), [`providers/query-provider.tsx`](../apps/web/src/providers/query-provider.tsx)

- Forms use **React Hook Form** + **Zod** (login, register steps, hero register, profile edit, search filters, checkout UPI).
- Profile, notifications, shortlist, interests, membership, and settings load through **TanStack Query**. Mutations invalidate the same keys. Mock source is still `sessionStorage`.

---

## Home hub + portal gating

**Route:** `/home` (nav label **Home**)  
**Files:** [`home/page.tsx`](../apps/web/src/app/(dashboard)/home/page.tsx), [`lib/portal-access.ts`](../apps/web/src/lib/portal-access.ts), [`match-thumb-card.tsx`](../apps/web/src/components/dashboard/match-thumb-card.tsx), [`dashboard-shell.tsx`](../apps/web/src/components/layout/dashboard-shell.tsx), [`mobile-bottom-nav.tsx`](../apps/web/src/components/layout/mobile-bottom-nav.tsx)

Signup stays short, so a new profile lands around **25%** complete (`profileCompleteness` is weighted: basics from signup = 25%). After register/login, members go to **Home**, not Discover.

### Home contents

| Block | Behaviour |
| --- | --- |
| Completeness | Ring + next actions (photos, career, about, lifestyle, horoscope, verify) until unlocked |
| Verification | Pending banner; demo **Approve now** sets `verificationStatus: verified` |
| Top matches | **4** portrait thumbnails (photo + name + match % / Verified) |
| Activity | Who viewed you, profiles you viewed, interests received, shortlisted you |

### Unlock rule

Discover, Interests, Search, and Shortlist stay in the nav. If the member is not yet verified **and** ≥ 80% complete, those pages show **Complete your profile** instead of results.

---

## Discover  Search & Browse (Section 2)

**Route:** `/dashboard` (nav label **Discover**)  
**Files:** [`dashboard/page.tsx`](../apps/web/src/app/(dashboard)/dashboard/page.tsx), [`lib/discover.ts`](../apps/web/src/lib/discover.ts), [`lib/matches.ts`](../apps/web/src/lib/matches.ts)

### Search modes

| Feature | Access | Behaviour |
| --- | --- | --- |
| Quick search | All | Age range (dual sliders), location, community  **3 fields only**. Results update live; no Search button. |
| Advanced filters | Paid | “More filters” sheet: height, education, income, occupation, diet, smoking, drinking, Manglik, horoscope star, willing to relocate. Free → upgrade prompt → `/plans`. |
| Saved searches | Paid | Save current quick filters with a label; reapply from dropdown. Stored in `astalakshimi.savedSearches`. |
| Partner preference match | All | “My preferences” applies signup `prefAgeMin` / `prefAgeMax` / city / caste as the active search. |

### Browse tabs

| Tab | Access | Behaviour |
| --- | --- | --- |
| All matches | All | Default sort: match score (highest first). |
| New profiles | All | `joinedDaysAgo ≤ 7`; **New** badge on card. |
| Nearby | All | Same city as current user’s profile. |
| Premium members | Paid | `premium: true`; gold Premium badge. |
| Verified profiles | All | `verified: true`. |
| Recently active | Paid | Online now / Today / 2 hours ago; **Active today** badge. |

### Match list card badges

**File:** [`match-list-card.tsx`](../apps/web/src/components/dashboard/match-list-card.tsx)

- **On photo (stacked vertically):** match % only + Verified (if photo verified).
- **In details column:** Top, New, Premium, Active today.

### Nav

- Desktop + mobile: **Discover** → `/dashboard` (Compass icon on mobile).
- Header search icon → `/dashboard`.

---

## Notifications (Section 6)

**Route:** `/notifications`  
**Files:** [`notifications/page.tsx`](../apps/web/src/app/(dashboard)/notifications/page.tsx), [`lib/user-activity.ts`](../apps/web/src/lib/user-activity.ts), [`dashboard-shell.tsx`](../apps/web/src/components/layout/dashboard-shell.tsx)

### Rules

- Every notification has a **deep link** (`href`). Never open Discover unless the intent is “new match digest”.
- Unread = blue/sky dot on the row; header bell shows unread count.
- Paid-only kinds (`profile_viewed`, `shortlisted`): free users see locked copy and tap → `/plans`.
- Persist list in `sessionStorage` key `astalakshimi.notifications`.

### Push / in-app types (seeded demos)

| Kind | Access | Deep link |
| --- | --- | --- |
| Interest received | All | `/profiles/{id}?action=interest` |
| Interest accepted | All | `/inbox/thread-{id}` |
| New match today | All | `/dashboard` |
| Profile viewed | Paid | Viewer profile (or `/plans` if free) |
| Shortlisted by someone | Paid | `/interests` (or `/plans` if free) |
| Profile incomplete nudge | All | `/profile/edit#photos` |
| Subscription expiry | All | `/plans` |
| Verification reminder | All | `/register` |

### In-app centre

| Feature | Behaviour |
| --- | --- |
| List | Reverse chronological |
| Filter tabs | All / Interests / Messages / Profile / Account |
| Mark all read | Clears unread flags |
| Clear all | Confirmation dialog, then empty list |

Product note (not enforced in demo): max **3 push notifications per day**; respect settings toggles when push is wired.

---

## Signup  siblings

**Route:** `/register` step 3 (Community & background)  
**Files:** [`register/page.tsx`](../apps/web/src/app/(auth)/register/page.tsx), [`lib/profile-store.ts`](../apps/web/src/lib/profile-store.ts)

| Field | Values |
| --- | --- |
| `brothersCount` | 0–5 (UI shows 5+) |
| `sistersCount` | 0–5 (UI shows 5+) |
| `siblings` | Summary string from `formatSiblings()` e.g. `1 brother, 2 sisters` or `Only child` |

Also shown on **My profile** and editable on **Edit profile**.

---

## Match profile view layout

**Route:** `/profiles/[profileId]`  
**Layout:** [`profiles/layout.tsx`](../apps/web/src/app/profiles/layout.tsx) → same `DashboardShell` header as logged-in app.

| Change | Detail |
| --- | --- |
| Header | Logo, Discover / Interests / Inbox / Premium / Profile, bell, avatar |
| Left photo | Portrait `aspect-[3/4]`, ~40% width (max 480px), not full-bleed |
| Scroll | Page shell fixed; **only right details** scroll |
| Back link | Removed (“Matches” arrow); use header nav |
| Action bar | Skip / Shortlist / Connect fixed bottom; mobile bottom nav hidden on profile |

---

## Filters UX (Discover predecessor)

Dashboard filter accordion sections **default collapsed** (chevron down), matching the compact Filters card pattern.

---

## Deploy / tooling notes

| Topic | Detail |
| --- | --- |
| Vercel Root Directory | Must be `apps/web` so Next.js is detected |
| Install on Vercel | Automatic `pnpm install` across workspace (pnpm monorepo with `workspace:*` dependencies) |
| Node | `engines.node: 22.x` in package.json; `.nvmrc` = 22 |
| GitHub Actions | Do not push `.github/workflows/*` with Cursor OAuth (needs `workflow` scope) |
| Commit email | Must match a verified GitHub email or Vercel blocks private-repo deploys |

---

## Mock storage keys (current)

| Key | Purpose |
| --- | --- |
| `astalakshimi.profile` | Signup / my profile |
| `astalakshimi.plan` | Current membership plan id |
| `astalakshimi.savedSearches` | Discover saved searches |
| `astalakshimi.notifications` | Notification centre |
| `astalakshimi.shortlist` / `skipped` / interests* | Activity |
| `astalakshimi.settings` | Privacy + alert prefs |

---

## Related specs

- [ui-overview.md](./ui-overview.md)  route map
- [ui-dashboard.md](./ui-dashboard.md)  Home, Discover, notifications, plans
- [ui-profile-view.md](./ui-profile-view.md)  other-member profile
- [ui-public-auth.md](./ui-public-auth.md)  register siblings
