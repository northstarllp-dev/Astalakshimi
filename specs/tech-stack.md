# Tech stack

Use this stack. Do not replace a layer without updating this file.

## Web application

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web | Next.js (App Router) | Main web application |
| UI | React | Component-based UI |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS | Styling system |
| Components | shadcn/ui | Reusable UI components |
| Forms | React Hook Form | Form management |
| Validation | Zod | Schema validation |
| Server state | TanStack Query | API / server-state management |

### Frontend conventions

- App Router only (`src/app`). No Pages Router.
- TypeScript strict. Shared types live in `packages/types` once the monorepo exists.
- Tailwind + shadcn/ui for UI. Keep shadcn components in the web app (`apps/web/src/components/ui`), not a shared UI package.
- All forms (login, register, search filters, profile edit, checkout) use **React Hook Form** with **Zod** resolvers. Current web schemas live in [`apps/web/src/lib/validation.ts`](../apps/web/src/lib/validation.ts) until `packages/validation` exists.
- Browser server-state (profiles, search, interests, shortlist, messages, notifications) uses **TanStack Query** via [`apps/web/src/hooks/queries.ts`](../apps/web/src/hooks/queries.ts) and [`QueryProvider`](../apps/web/src/providers/query-provider.tsx). Query functions still read mock `sessionStorage` until the Nest API is wired.
- Auth session on web: HTTP-only cookies via the API, or a thin Next.js BFF. Do not put access tokens in `localStorage`.

## Backend and data (target)

The current repo is still a Next.js UI with mock data. The target backend is a separate NestJS API.

| Layer | Technology | Purpose |
| --- | --- | --- |
| API | NestJS | Business logic between clients and DB |
| Language | TypeScript | Same language as web |
| ORM / schema | Drizzle | Postgres schema, migrations, queries |
| Database | AWS RDS (PostgreSQL) | Source of truth |
| Object storage | AWS S3 + CloudFront | Profile photos, IDs, horoscope PDFs |
| Auth (target) | Nest JWT + OTP (SNS/SMS); Cognito optional later | Login / register / verify |
| Payments (later) | Razorpay and/or PhonePe | Subscriptions |
| Jobs (later) | SQS + worker | Notifications, media, cleanup |

### Backend conventions

- NestJS is the only service that talks to Postgres.
- Next.js route handlers (`app/api`) stay thin: cookie/BFF, webhook proxy. No domain logic there.
- Repositories sit next to Nest modules. Controllers stay thin; services own rules (entitlements, photo privacy, verification).
- Validate request bodies with the same Zod schemas as the web app.

## Clients

| Client | Stack | How it talks to data |
| --- | --- | --- |
| Web | Next.js + React | `packages/api-client` → NestJS |
| Future mobile | Expo / React Native (later) | Same API client / same API |

Mobile does **not** reuse Next/Tailwind/shadcn components. It reuses types, Zod schemas, and API contracts.

## Tooling (when the monorepo is created)

| Tool | Purpose |
| --- | --- |
| pnpm workspaces | Package manager |
| Turborepo | Task running (`dev`, `build`, `lint`, `test`) |
| ESLint + Prettier | Lint / format |
| GitHub Actions | CI |

## Do not use (unless the spec is changed)

- Redux / Zustand as the primary server-state layer (TanStack Query owns that)
- MUI, Chakra, Ant Design
- Prisma (Drizzle is the schema layer)
- Next.js talking directly to RDS
- `packages/ui` shared with mobile
