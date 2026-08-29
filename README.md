# Astalakshimi

South Indian matrimony platform. **Frontend-only for now**  the Next.js app lives in `apps/web`.

## Specs (read first)

1. [`specs/tech-stack.md`](./specs/tech-stack.md)
2. [`specs/architecture.md`](./specs/architecture.md)
3. [`specs/ui-overview.md`](./specs/ui-overview.md)  current screens
4. [`specs/ui-changes.md`](./specs/ui-changes.md)  recent UI change log
5. [`specs/ui-ux.md`](./specs/ui-ux.md)  colour codes and UI/UX tokens

API, database, and shared packages are reserved in the tree but have **no implementation yet**.

## Structure

```
apps/web          Next.js App Router UI  ← work here
apps/api          reserved (empty)
packages/         reserved (empty)
specs/
```

## Setup

From the repo root:

```bash
pnpm install
pnpm dev
```

Or from `apps/web`:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Path | Group |
| --- | --- |
| `/` | `(public)` landing |
| `/login`, `/register` | `(auth)` |
| `/dashboard` | Discover  search & browse |
| `/search` | search + filters |
| `/inbox`, `/inbox/[threadId]` | interests + mock chat |
| `/plans`, `/checkout` | Membership  Free/Silver/Gold/Platinum, Razorpay demo, invoices, refer & earn |
| `/profile`, `/profile/edit` | my profile |
| `/settings` | privacy + alerts |
| `/shortlist` | saved matches |
| `/notifications` | alerts with deep links + filters |
| `/profiles/[profileId]` | view another member |
