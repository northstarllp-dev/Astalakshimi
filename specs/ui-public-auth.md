# Public and auth UI

## Landing `/`

File: [`apps/web/src/app/(public)/page.tsx`](../apps/web/src/app/(public)/page.tsx)

| Section | Behaviour |
| --- | --- |
| Hero (mobile) | Full-bleed wedding photo, Namaste, “Find a match across India”, register card below |
| Hero (desktop) | Same photo with cinematic maroon wash; copy left, [`HeroRegisterCard`](../apps/web/src/components/landing/hero-register-card.tsx) right |
| Offer bar | Slim maroon strip under header: “3 months free from 14 Sep 2026 · Nd Nh Nm left” ([`hero-free-search-countdown.tsx`](../apps/web/src/components/landing/hero-free-search-countdown.tsx)) |
| Stats | 25+ years, 10L+ profiles, 12 hr photo SLA, 100% screened |
| Assisted service | Brokers, referrals, lower cost vs typical portals; Know more → `#pricing` |
| Membership | Cards from [`lib/plans.ts`](../apps/web/src/lib/plans.ts)  Free / Silver ₹499 / Gold ₹999 / Platinum ₹1,499 (3 months). Free for 3 months from 14 Sep 2026. Choose Plan → `/register` |
| Trust / stories / communities | Success stories, language/community chips, pan-India copy |
| Sticky mobile CTA | Bottom bar on small screens |

Countdown: [`hero-free-search-countdown.tsx`](../apps/web/src/components/landing/hero-free-search-countdown.tsx)  window through **2026-12-14**.

## Login `/login`

File: [`apps/web/src/app/(auth)/login/page.tsx`](../apps/web/src/app/(auth)/login/page.tsx)

- Desktop: full-bleed split  temple-lamps photo (maroon wash, gold rule) + cream OTP form
- Mobile: compact photo banner, then the same form card
- Phone (+91) → OTP send → 30s resend → continue to `/home` (or `/register` if no profile)
- No password. Photos-private copy on the photo panel.

## Register `/register`

File: [`apps/web/src/app/(auth)/register/page.tsx`](../apps/web/src/app/(auth)/register/page.tsx)

Five steps, progress bar, saves to `sessionStorage` via `saveProfile()`. Kept short so the profile is about **25%** complete after submit:

1. Profile for + mobile + terms
2. Identity  name, gender, DOB, marital status, city
3. Community  religion, caste, mother tongue, family type/status, **brothers count**, **sisters count**
4. Photos, selfie or govt ID, optional horoscope PDF  [`step-verify.tsx`](../apps/web/src/components/signup/step-verify.tsx)
5. OTP

After submit: verification pending, then `/home`. Photos stay “private until approval” (12-hour SLA copy). Discover and Interests stay in the nav but show **Complete your profile** until verified **and** the profile is ≥ 80% complete.

Siblings fields are also shown on `/profile` and editable on `/profile/edit`.
