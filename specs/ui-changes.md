# UI changes log

Running log of product UI shipped in `apps/web` (frontend-only, mock `sessionStorage`). Update this file when behaviour or routes change.

---

## Discover — Search & Browse (Section 2)

**Route:** `/dashboard` (nav label **Discover**, was Home)  
**Files:** [`dashboard/page.tsx`](../apps/web/src/app/(dashboard)/dashboard/page.tsx), [`lib/discover.ts`](../apps/web/src/lib/discover.ts), [`lib/matches.ts`](../apps/web/src/lib/matches.ts)

### Search modes

| Feature | Access | Behaviour |
| --- | --- | --- |
| Quick search | All | Age range (dual sliders), location, community — **3 fields only**. Results update live; no Search button. |
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

## Signup — siblings

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
| Install on Vercel | Prefer `npm ci` in `apps/web` (avoids pnpm `ERR_INVALID_THIS` on some builders) |
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

- [ui-overview.md](./ui-overview.md) — route map
- [ui-dashboard.md](./ui-dashboard.md) — Discover, notifications, plans
- [ui-profile-view.md](./ui-profile-view.md) — other-member profile
- [ui-public-auth.md](./ui-public-auth.md) — register siblings
