# UI overview

Frontend-only snapshot of what is built in `apps/web` today. Mock data lives in `sessionStorage` and local TypeScript modules. There is no live API.

Read this after [tech-stack.md](./tech-stack.md) and [architecture.md](./architecture.md).  
**Recent behaviour changes:** [ui-changes.md](./ui-changes.md).

## Documents

| File | Covers |
| --- | --- |
| [ui-changes.md](./ui-changes.md) | Change log  Home hub, portal gating, Discover, notifications |
| [ui-ux.md](./ui-ux.md) | Colour codes, type, spacing, motion, buttons, UX rules |
| [ui-theme.md](./ui-theme.md) | Logo, chrome, imagery (short recap) |
| [ui-public-auth.md](./ui-public-auth.md) | Landing, login, register |
| [ui-dashboard.md](./ui-dashboard.md) | Home hub, Discover (gated), interests, inbox, plans, my profile, settings, notifications |
| [ui-admin.md](./ui-admin.md) | Staff operations console (`/admin`) |
| [ui-profile-view.md](./ui-profile-view.md) | Other-member profile page (`/profiles/[id]`) |

## Route map

```
/                         landing (public)
/login                    OTP login
/register                 5-step signup (short; profile ~25% after submit)
/home                     Home hub  top 4 matches + activity (post-signup landing)
/dashboard                Discover  search & browse (verified + 80% complete)
/search                   legacy search + filters
/interests                interests inbox
/inbox                    interests / accepted / messages
/inbox/[threadId]         mock chat thread
/plans                    membership
/checkout?plan=           demo checkout
/profile                  my profile
/profile/edit             edit my profile
/settings                 privacy + alerts
/shortlist                saved matches
/notifications            notification centre (deep links + filters)
/profiles/[profileId]     view another member (shell header + portrait photo)
/admin/login              staff sign-in (email + password)
/admin                    operations analytics home
/admin/profiles           review queue + all profiles
/admin/profiles/new       assisted profile create
/admin/profiles/[id]      KYC review detail
/admin/reports            member report queue
/admin/audit              approval history
```

## Navigation

Mobile bottom nav (5 tabs) in [`mobile-bottom-nav.tsx`](../apps/web/src/components/layout/mobile-bottom-nav.tsx): Home · Discover · Interests · Premium · Profile.

Desktop logged-in header in [`dashboard-shell.tsx`](../apps/web/src/components/layout/dashboard-shell.tsx): Home, Discover, Interests, Premium, Profile. Bell → `/notifications`. Avatar → `/profile`. Logo → `/home`.

Discover / Interests / Search / Shortlist always appear. Incomplete or unverified members see a **Complete your profile** screen on those routes (not a hidden tab).

## Mock data (no API)

| Module | Role |
| --- | --- |
| `src/lib/matches.ts` | Demo match profiles + premium / joinedDaysAgo / manglik / star |
| `src/lib/discover.ts` | Quick + advanced filters, browse tabs, preference apply |
| `src/lib/portal-access.ts` | Home unlock rule; completeness from `profile-completeness.ts` (filled / 40 details) |
| `src/lib/validation.ts` | Zod schemas for login, signup, edit, search, checkout |
| `src/hooks/queries.ts` | TanStack Query keys/hooks over mock sessionStorage |
| `src/hooks/admin-queries.ts` | Admin console TanStack Query hooks |
| `src/lib/admin-store.ts` | Admin session, profiles, reports, audit (mock) |
| `src/lib/plans.ts` | Plans, `isPaidMember()`, checkout helpers |
| `src/lib/profile-store.ts` | Signup / my-profile (`brothersCount`, `sistersCount`, `siblings`) |
| `src/lib/user-activity.ts` | Skip, shortlist, interests, settings, **notifications**, saved searches |
| `src/lib/images.ts` | Public image paths |

## Product copy rules (current UI)

- Pan-India matchmaking, not South-only.
- Greeting: **Namaste**.
- Free 3-month Community Plan starts **14 September 2026**.
- Paid plans use round prices (₹300 / ₹500 / etc. or current Silver/Gold/Platinum matrix in `plans.ts`).
