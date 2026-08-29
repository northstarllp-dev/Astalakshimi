# Specs  read before implementing

Any engineer or agent working on Astalakshimi must read these files **before** changing architecture, adding packages, or scaffolding folders.

## Reading order

1. [tech-stack.md](./tech-stack.md)  required technologies. Do not substitute without updating this file.
2. [architecture.md](./architecture.md)  target monorepo, AWS layout, and what to build now vs later.
3. [frontend-db.md](./frontend-db.md)  how the Next.js UI reaches Postgres (BFF → Nest → Drizzle).
4. [ui-overview.md](./ui-overview.md)  current frontend screens (start here for UI work).
5. [ui-changes.md](./ui-changes.md)  change log (Home hub, portal gating, Discover, notifications).
6. [ui-ux.md](./ui-ux.md)  colour codes, type, radius, motion, button variants, UX rules.
7. [ui-theme.md](./ui-theme.md)  short theme recap (logo, chrome, imagery).
8. [ui-public-auth.md](./ui-public-auth.md)  landing, login, register.
9. [ui-dashboard.md](./ui-dashboard.md)  logged-in user area.
10. [ui-admin.md](./ui-admin.md)  staff operations console.
11. [ui-profile-view.md](./ui-profile-view.md)  other-member profile page.

## Rules

- The web app never talks to the database. All data goes through the API.
- Do not invent a parallel stack (Redux, MUI, Pages Router, Prisma, etc.) unless the spec is updated first.
- Do not scaffold every folder in the target tree on day one. Follow the phased plan in `architecture.md`.
- If a change conflicts with these specs, update the spec first, then implement.
