# Public and auth UI

## Landing `/`

File: [`apps/web/src/app/(public)/page.tsx`](../apps/web/src/app/(public)/page.tsx)

| Section | Behaviour |
| --- | --- |
| Hero (mobile) | Full-bleed wedding photo, Namaste, “Find a match across India”, compact free-search countdown, register card below |
| Hero (desktop) | Same photo with cinematic maroon wash; copy left, [`HeroRegisterCard`](../apps/web/src/components/landing/hero-register-card.tsx) right |
| Stats | 25+ years, 10L+ profiles, 12 hr photo SLA, 100% screened |
| Assisted service | Brokers, referrals, lower cost vs typical portals; Know more → `#pricing` |
| Membership | Cards from [`lib/plans.ts`](../apps/web/src/lib/plans.ts) — Free / Silver ₹499 / Gold ₹999 / Platinum ₹1,499 (3 months). Free for 3 months from 14 Sep 2026. Choose Plan → `/register` |
| Trust / stories / communities | Success stories, language/community chips, pan-India copy |
| Sticky mobile CTA | Bottom bar on small screens |

Countdown: [`hero-free-search-countdown.tsx`](../apps/web/src/components/landing/hero-free-search-countdown.tsx) — window through **2026-12-14**.

## Login `/login`

File: [`apps/web/src/app/(auth)/login/page.tsx`](../apps/web/src/app/(auth)/login/page.tsx)

- Desktop: temple-lamps image + “Your matches are waiting”
- Phone (+91) → mock OTP send → 30s resend → continue to `/dashboard`
- No real SMS; frontend-only

## Register `/register`

File: [`apps/web/src/app/(auth)/register/page.tsx`](../apps/web/src/app/(auth)/register/page.tsx)

Six steps, progress bar, saves to `sessionStorage` via `saveProfile()`:

1. Phone + OTP
2. Profile for (Myself / Son / Daughter / …) + name, gender, DOB, marital status
3. Community — religion, caste, mother tongue, **brothers count**, **sisters count** (summary via `formatSiblings()`)
4. Education, occupation, company, income, city
5. Partner age range + religions
6. Photos, selfie or govt ID, optional horoscope PDF — [`step-verify.tsx`](../apps/web/src/components/signup/step-verify.tsx)

After submit: verification pending, then `/dashboard`. Photos stay “private until approval” (12-hour SLA copy).

Siblings fields are also shown on `/profile` and editable on `/profile/edit`.
