# UI overview

Frontend-only snapshot of what is built in `apps/web` today. Mock data lives in `sessionStorage` and local TypeScript modules. There is no live API.

Read this after [tech-stack.md](./tech-stack.md) and [architecture.md](./architecture.md).

## Documents

| File | Covers |
| --- | --- |
| [ui-ux.md](./ui-ux.md) | Colour codes, type, spacing, motion, buttons, UX rules |
| [ui-theme.md](./ui-theme.md) | Logo, chrome, imagery (short recap) |
| [ui-public-auth.md](./ui-public-auth.md) | Landing, login, register |
| [ui-dashboard.md](./ui-dashboard.md) | Logged-in shell, matches, inbox, plans, my profile, settings |
| [ui-profile-view.md](./ui-profile-view.md) | Other-member profile page (`/profiles/[id]`) |

## Route map

```
/                         landing (public)
/login                    OTP login
/register                 6-step signup
/dashboard                match feed (home)
/search                   search + filters
/inbox                    interests / accepted / messages
/inbox/[threadId]         mock chat thread
/plans                    membership
/checkout?plan=           demo checkout
/profile                  my profile
/profile/edit             edit my profile
/settings                 privacy + alerts
/shortlist                saved matches
/notifications            bell list
/profiles/[profileId]     view another member
```

## Navigation

Mobile bottom nav (5 tabs) in [`mobile-bottom-nav.tsx`](../apps/web/src/components/layout/mobile-bottom-nav.tsx):

| Tab | Route |
| --- | --- |
| Home | `/dashboard` |
| Matches | `/search` |
| Inbox | `/inbox` |
| Premium | `/plans` |
| Profile | `/profile` |

Desktop logged-in header (same routes) lives in [`dashboard-shell.tsx`](../apps/web/src/components/layout/dashboard-shell.tsx). Bell → `/notifications`. Avatar → `/profile`.

## Mock data (no API)

| Module | Role |
| --- | --- |
| `src/lib/matches.ts` | Five demo match profiles + photos |
| `src/lib/plans.ts` | Membership plans (₹0 / ₹300 / ₹500 / ₹750 / ₹1000 / ₹1500) |
| `src/lib/profile-store.ts` | Signup / my-profile in `sessionStorage` |
| `src/lib/user-activity.ts` | Skip, shortlist, interests, settings, notifications |
| `src/lib/images.ts` | Public image paths |

## Product copy rules (current UI)

- Pan-India matchmaking, not South-only.
- Greeting: **Namaste**.
- Free 3-month Community Plan starts **14 September 2026**.
- Paid plans use round prices (₹300 not ₹299).
