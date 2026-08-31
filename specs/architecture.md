# Architecture

Target layout for Astalakshimi: web + future mobile, with a NestJS API on AWS between clients and the database.

## Request flow

```
Web (Next.js)  ──┐
                 ├──►  NestJS API  ──►  RDS Postgres
Mobile (later) ──┘         │
                           ├──►  S3 (photos / docs)
                           └──►  SNS / SQS (OTP, jobs)
```

**Rule:** the frontend never connects to the database.

## Target repository layout

```
matrimony-app/
├── apps/
│   ├── web/                              # Next.js frontend (current app moves here)
│   └── api/                              # NestJS backend
├── packages/
│   ├── database/                         # Drizzle schema + migrations
│   ├── types/                            # Shared TypeScript types
│   ├── validation/                       # Shared Zod schemas
│   ├── api-client/                       # HTTP client used by web (and later mobile)
│   └── config/                           # Shared constants / enums
├── infrastructure/
│   ├── docker/
│   └── docker-compose/
├── docs/
├── specs/                                 # These files  read before implementing
├── scripts/
├── .github/workflows/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

### `apps/web` (Next.js)

Use App Router route groups:

```
apps/web/src/app/
├── (public)/          # landing, about, contact, terms, privacy
├── (auth)/            # login, register, verify-otp, forgot-password
├── (dashboard)/       # authenticated: dashboard, search, interests, shortlist,
│                      # messages, notifications, subscriptions, settings
├── profiles/[profileId]/
├── checkout/
├── admin/             # operations console (separate staff auth)
├── layout.tsx
├── loading.tsx
├── error.tsx
├── not-found.tsx
└── globals.css
```

Web-local folders:

```
apps/web/src/
├── components/
│   ├── ui/            # shadcn/ui only
│   ├── layout/
│   ├── profile/
│   ├── search/
│   ├── interests/
│   └── ...
├── hooks/             # useAuth, useProfile, useSearch, ...
├── providers/         # QueryClientProvider, auth
├── lib/               # wraps packages/api-client
└── types/             # web-only types if needed
```

Do **not** add a parallel `features/` tree unless the app is large enough that components + hooks are hard to find.

### `apps/api` (NestJS)

Module-per-domain:

- `auth`, `users`, `profiles`, `search`, `preferences`, `media`
- later: `horoscope`, `interests`, `shortlists`, `messaging`, `subscriptions`, `payments`, `notifications`, `moderation`, `admin`, `jobs`, `health`

Each module: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`, `dto/`.

Cross-cutting: `common/guards`, `common/decorators`, `config/`.

### Shared packages

| Package | Owns | Used by |
| --- | --- | --- |
| `packages/types` | User, Profile, Search, Interest, … | web, api, mobile |
| `packages/validation` | Zod schemas | web forms + Nest DTOs |
| `packages/api-client` | Typed HTTP calls | web, later mobile |
| `packages/database` | Drizzle schema, migrations, client | **api only** |
| `packages/config` | Enums, limits, plan names | web, api |

**Do not create `packages/ui`.** shadcn stays in `apps/web`. A future Expo app will not reuse those components.

## AWS

| Concern | Service |
| --- | --- |
| API compute | ECS Fargate or App Runner |
| Database | RDS PostgreSQL |
| Photos / PDFs | S3 + CloudFront |
| OTP / SMS | SNS |
| Background work | SQS + worker (later) |
| Web hosting | Vercel, or CloudFront in front of the Next app |

RDS is private. Only the API security group can reach it.

## What to implement now vs later

Today this repo is a **single Next.js app** with mock profiles and `localStorage`. Do not empty-scaffold the full tree.

### Phase 1  keep shipping UI, introduce the split

1. Move the current Next.js app to `apps/web` (same screens, same theme).
2. Add `apps/api` with health + auth + users + profiles only.
3. Add `packages/database` with `users`, `profiles`, `profile-photos`, `preferences`.
4. Add `packages/types`, `packages/validation`, `packages/api-client`.
5. Wire web forms to React Hook Form + Zod; load matches with TanStack Query against the API.

### Phase 2  product

Interests, shortlist, search filters, media upload to S3, verification workflow.

### Phase 3  money and ops

Subscriptions, Razorpay/PhonePe, entitlements, admin, jobs, docker-compose, CI.

### Phase 4  mobile

`apps/mobile` using the same API client and Zod schemas.

## Implementation constraints

- One API. Web and mobile never get a second backend.
- Photo privacy and verification rules live in the API, not in React.
- Next `app/api` is not the domain API.
- Cognito is optional. Prefer Nest-issued JWT + OTP first; add Cognito only if AWS identity federation is required.
- Folder names in this spec are the source of truth when creating new modules.
