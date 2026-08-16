# UI / UX tokens

Source of truth for colour, type, spacing, motion, and interaction. Values match [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) and [`layout.tsx`](../apps/web/src/app/layout.tsx).

Do not invent a second palette. If a screen needs a new colour, add a token here and in `globals.css` first.

## Brand palette (hex)

| Name | Hex | CSS token | Tailwind / class | Use |
| --- | --- | --- | --- | --- |
| Sandal / page | `#fdf8f0` | `--background`, `--sandal` | `bg-background` | Page fill, kolam surface |
| Ink | `#1a0e08` | `--foreground` | `text-foreground` | Body text |
| Temple maroon | `#7c1535` | `--primary`, `--ring` | `bg-primary` `text-primary` | Primary buttons, focus ring |
| Maroon on cream | `#fff8ee` | `--primary-foreground` | `text-primary-foreground` | Text on maroon |
| Temple gold | `#b8901f` | `--secondary`, `--gold` | `bg-secondary` `text-gold` | Accents, labels, rings |
| Gold light | `#e8c84a` | `--gold-light` | `text-gold-light` | Shimmer highlight |
| Gold on dark | `#1a0e08` | `--secondary-foreground` | | Text on gold (rare) |
| Muted wash | `#f0e8d8` | `--muted` | `bg-muted` | Chip / field fill |
| Muted text | `#705040` | `--muted-foreground` | `text-muted-foreground` | Captions, placeholders |
| Peacock | `#0d4f42` | `--accent`, `--peacock` | `bg-peacock` | Plan badge strip, accent |
| Peacock on cream | `#fff8ee` | `--accent-foreground` | | Text on peacock |
| Border | `#ddd0b8` | `--border` | `border-border` | Card / hairline borders |
| Input border | `#e8dcc8` | `--input` | `border-input` | Form fields |
| Card | `#fffdf8` | `--card`, `--popover` | `bg-card` | Cards, popovers |
| Card text | `#1a0e08` | `--card-foreground` | | Text on cards |
| Destructive | `#b42318` | `--destructive` | `text-destructive` | Errors, delete |
| Success | `#067647` | `--success` | | Match %, verified green |
| Temple dark | `#3d120c` | `--temple` | | Hero overlays, premium panels |
| Header cream | `#fffbf4` | (literal) | `bg-[#fffbf4]` | Sticky headers, badge chips on photos |
| Hero black | `#1a0608` | (literal) | `from-[#1a0608]` | Landing photo gradients |
| Browser chrome | `#8b1e3f` | viewport `themeColor` | | Mobile browser bar (slightly brighter maroon) |

### Gold metallic (logo wordmark gradient)

`#d4a843` → `#c49732` → `#a07818` → `#b8901f` → `#d4a843` → `#e8c84a` → `#c49732` → `#8a6a12`

Class: `.logo-gold-gradient`

### Status / overlay (not CSS variables)

| Role | Hex / value |
| --- | --- |
| Match score badge | `#10b981` (`bg-emerald-500`) on white text |
| Under review | `#fef3c7` / `#92400e` (amber-50 / amber-800) |
| Photo overlay gradient | `from-black/80` → transparent |
| Overlay badge (legacy, do not use) | `bg-white/15` — too faint; use `#fffbf4` instead |

## Opacity recipes

| Effect | Value |
| --- | --- |
| Focus ring | `rgba(124, 21, 53, 0.12)` |
| Gold border hover | `rgba(184, 144, 31, 0.4)` |
| Temple frame outer | `rgba(184, 144, 31, 0.5)` then `0.2` |
| Card shadow | `rgba(26, 14, 8, 0.04–0.08)` |
| Kolam stroke | gold `#b8901f` at **12%** opacity |
| Glass card | `rgba(255, 253, 248, 0.22)` + blur 18px |

## Typography

| Role | Family | CSS | Weights |
| --- | --- | --- | --- |
| Body / UI | Outfit | `--font-outfit`, `--font-sans` | 400–700 |
| Headlines | Cormorant Garamond | `--font-cormorant`, `--font-serif` | 500, 600, 700 |
| Tamil | Tiro Tamil | `--font-tiro`, `--font-tamil` | 400 |

| Element | Size / tracking |
| --- | --- |
| Page H1 (landing desktop) | ~4rem serif, leading 1.07 |
| Page H1 (mobile) | ~2.6rem serif |
| Section H2 | `text-3xl`–`text-5xl` serif |
| Royal label | `0.65rem`, weight 700, tracking `0.22em`, uppercase, gold |
| Nav / chips | `text-sm` semibold |
| Captions | `text-xs` / `11px` muted |
| Gold shimmer text | `.gold-shimmer` on serif headlines |

Body: antialiased, `-webkit-text-size-adjust: 100%`.

## Shape and spacing

| Token | Value |
| --- | --- |
| `--radius` | `0.875rem` (14px) |
| `--radius-sm` | 50% of radius |
| `--radius-md` | 75% of radius |
| `--radius-lg` | 14px |
| `--radius-xl` | 1.5 × radius |
| Buttons | `rounded-full` |
| Cards | `rounded-2xl` (16px) or `rounded-3xl` (24px) |
| Photo frames | `rounded-3xl` + `.temple-frame` |
| Tap target | `.tap-target` **44 × 44 px** min |
| Header height | `h-14` (56px) mobile, `h-16` desktop |
| Action bar | ~`5.75rem` + `env(safe-area-inset-bottom)` |
| Content max | `max-w-5xl` / `max-w-6xl` |
| Page gutter | `px-3`–`px-4` |

## Motion

| Name | Behaviour |
| --- | --- |
| `fade-up` | 350ms ease-out, 14px rise |
| `shimmer-gold` | 4s linear, background-position ±200% |
| Buttons | `duration-200`, `active:scale-[0.97]` |
| Page | `scroll-behavior: smooth` |
| Register / login steps | Framer Motion fade + 12px x-slide |

## Buttons

[`components/ui/button.tsx`](../apps/web/src/components/ui/button.tsx) — all **pills**.

| Variant | Look |
| --- | --- |
| `default` | Fill `#7c1535`, text `#fff8ee`, maroon shadow |
| `secondary` | Gold → yellow-500 gradient, white text |
| `outline` | Card fill, `#ddd0b8` border 2px |
| `ghost` | No fill, hover muted |
| `soft` | Maroon 10% fill, maroon text, 20% border |

Sizes: `sm` h-9, `default` h-11 px-6, `lg` h-12, `icon` 44×44.

Focus: 2px ring `--ring` (`#7c1535`) + offset.

## Surfaces and chrome

| Class | What |
| --- | --- |
| `.kolam-surface` | Sandal `#fdf8f0` + gold kolam SVG |
| `.gold-rule` | 2px gold gradient line (`#b8901f` / `#e8c84a`) |
| `.royal-card` | Card + soft brown shadow; gold glow on hover |
| `.temple-frame` | Double gold ring around photos |
| `.glass-card` | Frosted cream on dark heroes |
| `.royal-label` | Tiny gold uppercase kicker |
| `.ornament-line` | Gold fade rules with ✦ |
| `.hide-scrollbar` | Filter chip rows |
| `.safe-top` / `.safe-bottom` | iOS insets |

Sticky headers: `bg-[#fffbf4]/90–92` + `backdrop-blur-xl`.

## UX rules

- **Mobile first.** Bottom nav on logged-in routes; public landing has its own sticky CTA.
- **One scroll owner on laptop profile view:** left photo column does not scroll; right details do.
- **44px** minimum hit area for icon buttons.
- **OTP, not passwords** on login/register.
- Photos stay **private until verified** (12-hour SLA copy).
- Badge chips on photos use **solid** `#fffbf4`, not translucent white.
- Do not introduce MUI / Chakra / extra palettes.
- Prefer existing tokens over one-off hex except documented literals (`#fffbf4`, `#1a0608`, `#8b1e3f`).

## Logo assets

| File | Role |
| --- | --- |
| `/images/logo-lakshmi.png` | Circular Lakshmi mark |
| `/images/logo_123.png` | Wordmark |
| `src/app/icon.png` | Favicon / PWA icon |

## Related specs

- Screens: [ui-overview.md](./ui-overview.md)
- Short theme recap: [ui-theme.md](./ui-theme.md)
- Stack: [tech-stack.md](./tech-stack.md)
