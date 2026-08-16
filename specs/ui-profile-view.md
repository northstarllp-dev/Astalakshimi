# Match profile view UI

Route: `/profiles/[profileId]`  
Files: [`page.tsx`](../apps/web/src/app/profiles/[profileId]/page.tsx), [`profile-gallery.tsx`](../apps/web/src/components/profile/profile-gallery.tsx), [`profile-action-bar.tsx`](../apps/web/src/components/profile/profile-action-bar.tsx)

This is **another member’s** profile (not `/profile`). Data from `getMatchById()` in [`matches.ts`](../apps/web/src/lib/matches.ts).

## Laptop (lg+)

Two columns. The **page does not scroll**; only the right column does.

| Side | Behaviour |
| --- | --- |
| Left | Photo column, `overflow-hidden`, sits under the header and **above** Skip / Shortlist / Connect |
| Right | About chips, About her/him, Education & career, Lifestyle, Family, Partner preferences — `overflow-y-auto` |

## Mobile

Photo is a rounded card **between** the header and the action bar (`max-h` capped so name + extra thumbs stay on screen). Details stack below and the page scrolls.

## Photo gallery

- Main photo + extra thumbs **next to the name**
- Cream **left / right** chevrons cycle photos (arrow keys too)
- Tap photo or thumb → full-screen lightbox (`object-contain`, prev/next, close)
- Badges **Photo verified**, **Profile screened**, **Horoscope**: solid cream background + gold ring (readable on the photo)
- Tap a badge → popup explaining that check

## Action bar (fixed bottom)

| Button | Effect |
| --- | --- |
| Skip | Adds id to skipped list, back to `/dashboard` |
| Shortlist | Toggles saved list (`Saved` when on) |
| Connect | Sends interest; label becomes `Sent` |

## Header

Back to `/dashboard`, logo, match-percent pill.
