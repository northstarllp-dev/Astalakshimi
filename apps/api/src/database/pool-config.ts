const DEFAULT_POOL_MAX = 20;
const MAX_POOL = 100;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;
const MAX_STATEMENT_TIMEOUT_MS = 120_000;

/**
 * Search and match pages each hold several queries at once. A pool of 10
 * only fits one of those pages plus a little headroom, so concurrent users
 * queue on the client before Postgres is busy. 20 leaves room for a few
 * overlapping requests on one task without approaching a small RDS
 * max_connections when several tasks are running. Override with
 * DATABASE_POOL_MAX.
 */
export function resolveDbPoolMax(raw = process.env.DATABASE_POOL_MAX): number {
  if (raw == null || raw === '') return DEFAULT_POOL_MAX;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_POOL_MAX;
  return Math.min(Math.floor(n), MAX_POOL);
}

/** 0 disables the server-side statement timeout. */
export function resolveStatementTimeoutMs(
  raw = process.env.DATABASE_STATEMENT_TIMEOUT_MS,
): number {
  if (raw == null || raw === '') return DEFAULT_STATEMENT_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_STATEMENT_TIMEOUT_MS;
  return Math.min(Math.floor(n), MAX_STATEMENT_TIMEOUT_MS);
}
