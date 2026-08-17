# Logged-in user area UI

Shell: [`(dashboard)/layout.tsx`](../apps/web/src/app/(dashboard)/layout.tsx) wraps [`DashboardShell`](../apps/web/src/components/layout/dashboard-shell.tsx).  
Match profiles also use [`profiles/layout.tsx`](../apps/web/src/app/profiles/layout.tsx) → same shell.

All of this is mock: skip / connect / shortlist / plan / notifications / saved searches persist in `sessionStorage`.

See also the full change log: [ui-changes.md](./ui-changes.md).

## Home `/home`

Post-signup landing (nav label **Home**). Always visible.

Logic: [`lib/portal-access.ts`](../apps/web/src/lib/portal-access.ts). Completeness is weighted so signup-only profiles sit near **25%**.

| Block | Behaviour |
| --- | --- |
| Completeness | Ring + missing steps until unlocked |
| Verification | Pending review copy; demo approve marks verified |
| Top matches | 4 portrait thumbnails (name + photo + match %) — [`MatchThumbCard`](../apps/web/src/components/dashboard/match-thumb-card.tsx) |
| Activity | Who viewed you, you viewed, interests received, shortlisted you (locked overlays until unlock; viewers/shortlist also paid) |

**Unlock Discover + Interests:** verified **and** completeness ≥ 80%. Until then those tabs stay visible and show [`CompleteProfileGate`](../apps/web/src/components/layout/complete-profile-gate.tsx) via [`RequireFullPortal`](../apps/web/src/components/layout/require-full-portal.tsx).

## Discover `/dashboard`

Primary search & browse (nav label **Discover**). Always in the nav. Incomplete / unverified members see **Complete your profile** instead of results.

### Quick search (all members)

- Age min/max dual sliders, city select, community select
- Results apply **instantly** (no Search button)
- **My preferences** — applies partner prefs from signup
- **Clear all** resets to defaults

### Paid search

- **More filters** — height, education, income, occupation, diet, smoking, drinking, Manglik, star, relocate
- **Save search** — label + reapply dropdown (`astalakshimi.savedSearches`)
- Free users get an upgrade banner → `/plans`

### Browse tabs

All matches · New profiles · Nearby · Premium (paid) · Verified · Recently active (paid)

Default sort: **match score** descending. Logic in [`lib/discover.ts`](../apps/web/src/lib/discover.ts).

### Match cards

[`MatchListCard`](../apps/web/src/components/dashboard/match-list-card.tsx):

- Photo: **match %** + **Verified** only (stacked)
- Details: Top / New / Premium / Active today, then fields + Skip / View / Connect

### Other chrome

- Verification banner if profile `pending`
- Stat chips → inbox / shortlist

## Search `/search`

Legacy filter sheet (city, community, mother tongue, education, income, age, verified, horoscope). Same complete-profile gate as Discover. Prefer Discover for the main browse path.

## Interests `/interests`

Received / sent interest management (Accept / Decline). Always in the nav; incomplete profiles see **Complete your profile**. Linked from Home activity and notifications.

## Inbox `/inbox`

Tabs: **Interests** | **Accepted** | **Messages**

- Received interests with Accept
- Sent interests from Connect
- Messages → `/inbox/thread-{profileId}` mock thread

## Shortlist `/shortlist`

Saved IDs from `toggleShortlist`. Gated with Discover. Skip on a card removes it from the list.

## Notifications `/notifications`

In-app notification centre (Section 6). Bell in header shows unread count.

| Feature | Behaviour |
| --- | --- |
| List | Reverse chronological; unread = sky blue dot |
| Filters | All / Interests / Messages / Profile / Account |
| Mark all read | Clears unread |
| Clear all | Confirm, then wipe `astalakshimi.notifications` |
| Deep links | Always present — profile, chat, Discover, plans, edit, register |
| Paid blur | Profile viewed / shortlisted → lock + `/plans` for free |

Seeded kinds: interest received/accepted, new match digest, profile viewed, shortlisted, incomplete nudge, plan expiry, verification reminder.

## Plans `/plans` and checkout `/checkout`

Monetisation surface.

### `/plans`

- Current plan status, comparison, feature matrix, refer & earn, invoices (as implemented in `lib/plans.ts`)
- Compare strip is cream heritage (not dark): Gold is featured with gold ring + filled CTA; Platinum uses peacock **Best value**; Diamond uses maroon **Until you marry**
- Subscription and invoices load via TanStack Query; Choose Plan validates with Zod (`planSelectSchema`) then goes to `/checkout?plan={id}`

### `/checkout?plan={id}`

- Demo pay activates plan in `sessionStorage`, unlocks Discover paid tabs / More filters / Save search / notification viewer names

## My profile `/profile` and `/profile/edit`

Reads `SignupData`. Completeness bar, verification badges, sections (basics, community **including brothers/sisters**, career, preferences).

Edit page is a single form (not the 6-step wizard), saves back to `sessionStorage`. Empty profile → prompt to `/register`.

## Settings `/settings`

- Account phone + **Log out (demo)** clears `sessionStorage` → `/login`
- Hide profile / photo visibility / last seen
- Email / SMS / push toggles
- Link to `/profile/edit#preferences`
