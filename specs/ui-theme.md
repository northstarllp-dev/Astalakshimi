# UI theme

Short recap. **Full colour codes and UX tokens:** [ui-ux.md](./ui-ux.md).

South Indian heritage look: temple maroon, gold, cream, kolam surface. Implemented in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) and [`layout.tsx`](../apps/web/src/app/layout.tsx).

## Colour tokens

| Token | Hex | Use |
| --- | --- | --- |
| `--background` / sandal | `#fdf8f0` | Page |
| `--foreground` | `#1a0e08` | Text |
| `--primary` | `#7c1535` | Maroon CTAs |
| `--secondary` / gold | `#b8901f` | Accents, rings |
| `--card` | `#fffdf8` | Cards |
| `--peacock` | `#0d4f42` | Plan badge strip |
| `--temple` | `#3d120c` | Dark hero washes |

## Type

- UI / body: Outfit (`--font-outfit`)
- Headlines: Cormorant Garamond (`--font-cormorant`)
- Tamil display (where used): Tiro Tamil

## Logo

[`components/ui/logo.tsx`](../apps/web/src/components/ui/logo.tsx)

- Mark: `public/images/logo-lakshmi.png` (Lakshmi temple seal)
- Wordmark: `public/images/logo_123.png` (Sri Ashtalakshmi Matrimony)
- Favicon / app icon: `src/app/icon.png`

## Shared chrome

| Component | Where |
| --- | --- |
| `SiteHeader` / `SiteFooter` | Public landing |
| `DashboardShell` | All `(dashboard)` routes: gold-rule header, desktop links, bell, avatar |
| `MobileBottomNav` | Logged-in, mobile only |
| `Button` variants | `default` maroon, `secondary` gold, `outline`, `ghost`, `soft` |

## Imagery

Under `apps/web/public/images/`:

- Hero wedding: `hero-south-indian-wedding.png`
- Login: `login-temple-lamps.png`
- Stories / cities / silk / profile sets (`profile-priya-*`, `profile-ananya-*`, etc.)

## Layout habits

- Rounded cards (`rounded-2xl` / `rounded-3xl`), gold/maroon borders
- Kolam SVG wash on cream pages (`.kolam-surface`)
- Gold top rule on sticky headers (`.gold-rule`)
- Safe-area: `.safe-top`, `.safe-bottom` for iOS
