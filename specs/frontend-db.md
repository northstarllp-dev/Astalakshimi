# How the frontend reaches the database

The web app never opens a Postgres connection. The browser talks to Next.js, Next.js forwards to NestJS, and **only NestJS** talks to the database through Drizzle.

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React)                                                │
│  Pages / forms  →  TanStack Query  →  apiClient                 │
│  Optional cache: sessionStorage / localStorage (profile UI)     │
└───────────────────────────────┬─────────────────────────────────┘
                                │  fetch('/api/proxy/...')
                                │  cookies sent automatically
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Next.js BFF   apps/web                                         │
│  /api/auth/login     → Nest /auth/verify-otp, set HTTP-only JWT │
│  /api/auth/logout    → clear cookies                            │
│  /api/proxy/[...path]→ Nest /api/{path}, attach Bearer token    │
└───────────────────────────────┬─────────────────────────────────┘
                                │  HTTP  http://localhost:4000/api/...
                                │  Authorization: Bearer <jwt>
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  NestJS API   apps/api   (port 4000, prefix /api)               │
│  Controller → Guard/JWT → Service → Drizzle (DB_CLIENT)         │
└───────────────────────────────┬─────────────────────────────────┘
                                │  DATABASE_URL
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PostgreSQL  (local or AWS RDS)                                 │
│  Schema + migrations: packages/database                         │
└─────────────────────────────────────────────────────────────────┘
```

Photos are the one exception to “everything goes through Nest then Postgres”: Nest issues an S3 presigned URL, then the **browser uploads the file straight to S3**. Postgres only stores the S3 key / metadata.

---

## Why this shape

| Rule | Meaning |
| --- | --- |
| Frontend never talks to RDS | No `DATABASE_URL` in the Next.js app. No Drizzle in `apps/web`. |
| Nest is the only DB client | Privacy, entitlements, OTP, and verification live in API services. |
| Next `app/api` is a thin BFF | Cookie/JWT handling and proxy only. No domain SQL. |
| Shared contracts | Types in `packages/types`, Zod in `packages/validation`. |

---

## Layer by layer

### 1. UI  `apps/web`

Screens in `src/app` call hooks in `src/hooks/queries.ts`. Those hooks use **TanStack Query** (`QueryProvider`) so lists, profile, interests, chat, etc. are server state  not Redux.

Typical path for a logged-in page:

1. Component calls `useProfileQuery()` / `apiClient.profiles.getMyProfile()`.
2. `apiClient` (`src/lib/api-client.ts`) `fetch`es `/api/proxy/profiles/me`.
3. Next proxy adds the JWT and forwards to Nest.

Auth is slightly different: OTP verify hits **Next** `/api/auth/login` (not the proxy) so the access/refresh tokens can be stored as **HTTP-only cookies**. The browser never needs to put the JWT in `localStorage` for API calls. `localStorage.is_authenticated` is only a UI flag.

`src/lib/profile-store.ts` still caches signup/profile fields in the browser so the UI can render if the API is slow or down. That cache is **not** the source of truth.

### 2. BFF  Next.js route handlers

| Route | Job |
| --- | --- |
| `src/app/api/auth/login/route.ts` | POST body to Nest `POST /api/auth/verify-otp`. On success, set `astalakshimi.auth_token` and `astalakshimi.refresh_token` cookies. |
| `src/app/api/auth/logout/route.ts` | Clear those cookies. |
| `src/app/api/proxy/[...path]/route.ts` | Copy method/body/query to `NEXT_PUBLIC_API_URL/{path}`. Read the auth cookie and send `Authorization: Bearer …`. On 401, try Nest `POST /api/auth/refresh` and retry. |

Default API origin: `NEXT_PUBLIC_API_URL` or `http://localhost:4000/api`.

Example: browser `GET /api/proxy/profiles/me` becomes Nest `GET http://localhost:4000/api/profiles/me`.

### 3. API  `apps/api`

Nest boots in `main.ts` with global prefix `api` (so routes are `/api/...`). CORS allows the Next origin (`http://localhost:3000` in dev).

`DatabaseModule` is global. It creates one Drizzle client from `DATABASE_URL` and injects it as `DB_CLIENT`. Services do the queries:

```ts
constructor(@Inject(DB_CLIENT) private readonly db: Database) {}
```

Flow inside Nest for a protected call:

```
HTTP request
  → JwtAuthGuard (Bearer token)
  → Controller (thin)
  → Service (rules + Drizzle)
  → PostgreSQL
```

Domain modules today: `auth`, `profiles`, `preferences`, `media`, `search`, `interests`, `shortlists`, `settings`, `plans`, `payments`, `entitlements`, `matches`, `activity`, `notifications`, `chat`, `admin`, `health`.

### 4. Database  `packages/database`

This package is **API-only**. Web must not import it.

| Piece | Role |
| --- | --- |
| `src/schema/*.ts` | Drizzle table definitions |
| `src/client.ts` | `createDbClient()`  `postgres` driver + Drizzle |
| `drizzle.config.ts` | Migrations (`packages/database/migrations`) |
| `DATABASE_URL` | Connection string (root `.env`) |

Tables include: `users`, `profiles`, `family_details`, `lifestyle_interests`, `horoscopes`, `partner_preferences`, `profile_photos`, `verifications`, `interests`, `shortlists`, `plans`, `payments`, `subscriptions`, `user_settings`, `notifications`, `otp_attempts`, `profile_views`, `messages`.

Local default if env is missing: `postgresql://postgres:postgres@localhost:5432/astalakshimi`. Production uses RDS (SSL when the URL is an RDS host or `sslmode=require`).

---

## One request, end to end

**Load my profile**

```
useProfileQuery()
  → apiClient.profiles.getMyProfile()
  → GET /api/proxy/profiles/me
  → Next reads cookie astalakshimi.auth_token
  → GET {API}/profiles/me   Authorization: Bearer <jwt>
  → ProfilesController + JwtAuthGuard
  → ProfilesService selects profiles + related tables
  → JSON FullProfileView back to the hook
  → also written into profile-store for local cache
```

**Login**

```
apiClient.auth.verifyOtp({ phone, otp })
  → POST /api/auth/login
  → Next → POST {API}/auth/verify-otp
  → AuthService checks OTP, issues JWT
  → Next sets HTTP-only cookies (tokens stripped from JSON body)
```

**Photo upload**

```
apiClient.media.getUploadUrl({ contentType, ... })
  → Nest builds S3 (or mock) presigned PUT URL
  → browser PUT file to that URL (not through Nest)
  → apiClient.photos.add(s3Key)
  → Nest inserts profile_photos row
```

---

## What talks to what

```
apps/web          → HTTP only (BFF + S3 uploads)
apps/api          → Drizzle → Postgres; S3 SDK for signed URLs
packages/database → imported by apps/api only
packages/types    → web + api
packages/validation → web forms + Nest Zod pipes
```

---

## Local run

1. Postgres reachable at `DATABASE_URL` (RDS or local).
2. `apps/api` on port **4000**.
3. `apps/web` on port **3000**, with `NEXT_PUBLIC_API_URL=http://localhost:4000/api`.

If the API is down, the proxy returns **502** and some hooks fall back to the browser profile cache.
