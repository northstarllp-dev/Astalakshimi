# Match profile view UI

Route: `/profiles/[profileId]`  
Files: [`page.tsx`](../apps/web/src/app/profiles/[profileId]/page.tsx), [`layout.tsx`](../apps/web/src/app/profiles/layout.tsx), [`profile-gallery.tsx`](../apps/web/src/components/profile/profile-gallery.tsx), [`profile-action-bar.tsx`](../apps/web/src/components/profile/profile-action-bar.tsx)

This is **another member’s** profile (not `/profile`). Data from `getMatchById()` in [`matches.ts`](../apps/web/src/lib/matches.ts).

Uses **DashboardShell** (logo, nav, bell, avatar). Mobile bottom nav is hidden on this route.

## Laptop (lg+)

Two columns under the header. The **page does not scroll**; only the right column does.

| Side | Behaviour |
| --- | --- |
| Left | Portrait photo card `aspect-[3/4]`, ~40% width (max ~480px), `overflow-hidden`, match % pill on photo |
| Right | About chips, About her/him, Education & career, Lifestyle, Family, Partner preferences — `overflow-y-auto` |

No separate “Matches” back link — use header Discover / logo.

## Mobile

Portrait photo card under the header; details stack below and scroll in the right/main column. Action bar fixed above safe area.

## Photo gallery

- Main photo + extra thumbs **next to the name**
- Cream **left / right** chevrons cycle photos (arrow keys too)
- Tap photo or thumb → full-screen lightbox (`object-contain`, prev/next, close)
- Badges **Photo verified**, **Profile screened**, **Horoscope**: solid cream background + gold ring
- Tap a badge → popup explaining that check

## Action bar (fixed bottom)

| Button | Effect |
| --- | --- |
| Skip | Adds id to skipped list, back to `/dashboard` |
| Shortlist | Toggles saved list (`Saved` when on) |
| Connect | Sends interest; label becomes `Sent` |
