# Logged-in user area UI

Shell: [`(dashboard)/layout.tsx`](../apps/web/src/app/(dashboard)/layout.tsx) wraps [`DashboardShell`](../apps/web/src/components/layout/dashboard-shell.tsx).

All of this is mock: skip / connect / shortlist / plan choice persist in `sessionStorage`.

## Home `/dashboard`

Match feed only (inbox/premium stubs removed).

- Greeting from `loadProfile()` (“Namaste, {firstName}”)
- Verification banner if status is `pending`
- Stats chips → `/inbox`, `/shortlist`, `/notifications`
- Filter chips: All matches, Newly joined, Near you, Premium, With horoscope
- Sliders icon → `/search`
- [`MatchListCard`](../apps/web/src/components/dashboard/match-list-card.tsx): photo left (desktop), extra-photo thumbs, Skip / View / Connect

## Search `/search`

- Query field + Filters sheet: city, community, mother tongue, education, income, age min/max, photo verified, horoscope
- Same `MatchListCard` results, empty + reset

## Inbox `/inbox`

Tabs: **Interests** | **Accepted** | **Messages**

- Received interests with Accept
- Sent interests from Connect
- Messages → `/inbox/thread-{profileId}` mock thread (local send, not persisted)

## Shortlist `/shortlist`

Saved IDs from `toggleShortlist`. Skip on a card removes it from the list.

## Notifications `/notifications`

Static list: profile view, interest, verification, free-plan reminder. Rows link to profile / inbox / plans.

## Plans `/plans` and checkout `/checkout`

Same plan cards as landing. Current plan badge (default Free). Choose Plan → `/checkout?plan={id}` → **Pay later (demo)** writes `astalakshimi.plan` and returns to `/plans`. Assisted blurb links to `/#assisted`.

## My profile `/profile` and `/profile/edit`

Reads `SignupData`. Completeness bar, verification badges, sections (basics, community, career, preferences). Actions: Edit, Photos, Horoscope, Settings.

Edit page is a single form (not the 6-step wizard), saves back to `sessionStorage`. Empty profile → prompt to `/register`.

## Settings `/settings`

- Account phone + **Log out (demo)** clears `sessionStorage` → `/login`
- Hide profile toggle
- Photo visibility: Everyone / Accepted only / Premium
- Email / SMS / push toggles
- Link to `/profile/edit#preferences`
