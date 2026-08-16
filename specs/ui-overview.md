# UI overview

Frontend-only snapshot of what is built in `apps/web` today. Mock data lives in `sessionStorage` and local TypeScript modules. There is no live API.

Read this after [tech-stack.md](./tech-stack.md) and [architecture.md](./architecture.md).  
**Recent behaviour changes:** [ui-changes.md](./ui-changes.md).

## Documents

| File | Covers |
| --- | --- |
| [ui-changes.md](./ui-changes.md) | Change log — Discover, notifications, siblings, profile layout, deploy notes |
| [ui-ux.md](./ui-ux.md) | Colour codes, type, spacing, motion, buttons, UX rules |
| [ui-theme.md](./ui-theme.md) | Logo, chrome, imagery (short recap) |
| [ui-public-auth.md](./ui-public-auth.md) | Landing, login, register |
| [ui-dashboard.md](./ui-dashboard.md) | Discover, interests, inbox, plans, my profile, settings, notifications |
| [ui-profile-view.md](./ui-profile-view.md) | Other-member profile page (`/profiles/[id]`) |

## Route map

```
/                         landing (public)
/login                    OTP login
/register                 6-step signup (includes siblings)
/dashboard                Discover — search & browse
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
```

## Navigation

Mobile bottom nav (4 tabs) in [`mobile-bottom-nav.tsx`](../apps/web/src/components/layout/mobile-bottom-nav.tsx):

| Tab | Route |
| --- | --- |
| Discover | `/dashboard` |
| Interests | `/interests` |
| Premium | `/plans` |
| Profile | `/profile` |

Desktop logged-in header in [`dashboard-shell.tsx`](../apps/web/src/components/layout/dashboard-shell.tsx): Discover, Interests, Inbox, Premium, Profile. Bell → `/notifications` (unread count). Avatar → `/profile`. Profile match view hides the mobile bottom nav.

## Mock data (no API)

| Module | Role |
| --- | --- |
| `src/lib/matches.ts` | Demo match profiles + premium / joinedDaysAgo / manglik / star |
| `src/lib/discover.ts` | Quick + advanced filters, browse tabs, preference apply |
| `src/lib/plans.ts` | Plans, `isPaidMember()`, checkout helpers |
| `src/lib/profile-store.ts` | Signup / my-profile (`brothersCount`, `sistersCount`, `siblings`) |
| `src/lib/user-activity.ts` | Skip, shortlist, interests, settings, **notifications**, saved searches |
| `src/lib/images.ts` | Public image paths |

## Product copy rules (current UI)

- Pan-India matchmaking, not South-only.
- Greeting: **Namaste**.
- Free 3-month Community Plan starts **14 September 2026**.
- Paid plans use round prices (₹300 / ₹500 / etc. or current Silver/Gold/Platinum matrix in `plans.ts`).
