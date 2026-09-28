# Comprehensive Test Suite — Vitest + Playwright

**Created:** 2026-09-20
**Goal:** Leave no surface untouched. Properly test the app end-to-end.

## Current state
- API (`apps/api`): 41 Jest suites, ~346 cases. 6 suites failing from stale mocks.
- Web (`apps/web`): 50 routes, 36 lib files, 116 components, 2 hooks files — **0 tests**.
- Packages (`reference`, `validation`, `types`, `database`): **0 tests**.
- Browser e2e: **none**.

## Tooling
| Layer | Tool | Runner |
|---|---|---|
| Web unit/component | Vitest + jsdom + @testing-library/react | `apps/web` |
| Package unit | Vitest (per-package) | each `packages/*` |
| Browser e2e | Playwright | repo root |
| API | Keep Jest (fix 6 failing suites) | `apps/api` |

## Phases
1. **Tooling setup** — Vitest in web + packages, Playwright at root, configs, scripts, tsconfig paths.
2. **Package tests** — `reference` (catalog search, slug/label lookups, edge cases), `validation` (every Zod schema accept/reject).
3. **Web lib pure-function tests** — input-units, profile-completeness, validation, identity-fields, community-data, connect-status, chat-utils, discover, plans, razorpay (mocked), file-hash, images, portal-access, api-config, profile-store, admin-store.
4. **API fixes** — fix 6 failing Jest suites (constructor arg drift, contacts unlock, search query type, admin verification fields).
5. **Web component tests** — searchable-select, city-autocomplete, community-fields, children-fields, education-fields, occupation-select, multi-select, date-of-birth-picker, input-with-unit, completeness-ring, profile-gallery, profile-action-bar, connect-button, match-list-card, match-snap-feed, plan-compare, step-verify, otp-boxes, auth-split, contact-unlock-modal, complete-profile-gate, require-full-portal, mobile-bottom-nav, dashboard-shell.
6. **Middleware + API route tests** — middleware redirect logic, `/api/auth/*`, `/api/proxy/[...path]`.
7. **Playwright e2e** — critical paths: signup→register→/home, profile edit+save, search→filter→interest→shortlist, checkout (Razorpay mocked), chat, auth guards, mobile viewport smoke.

## Acceptance
- `pnpm test` (root) runs API Jest + web Vitest + package Vitest, all green.
- `pnpm test:e2e` runs Playwright, all green.
- Web lib + packages at >90% line coverage on pure functions.
- 6 previously-failing API suites fixed.

## Status (2026-09-20) — ALL GREEN
| Suite | Tool | Result |
|---|---|---|
| API unit + integration | Jest | 39 suites, 331 tests |
| API e2e | Jest + Supertest | 2 suites, 28 tests |
| Web lib + middleware + components | Vitest | 12 files, 178 tests |
| Reference package | Vitest | 1 file, 29 tests |
| Validation package | Vitest | 1 file, 21 tests |
| Browser e2e | Playwright | 2 files, 27 tests (chromium/mobile/webkit) |
| **Total** | | **~614 tests, 0 failing** |

## MCP servers
`.cursor/mcp.json` configured with `@playwright/mcp` and `chrome-devtools-mcp`
(restart Cursor / reopen chat to load them for interactive browser-driven dev).
