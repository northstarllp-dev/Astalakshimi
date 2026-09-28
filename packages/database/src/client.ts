import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

const DEFAULT_POOL_MAX = 20;
const MAX_POOL = 100;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;

type SqlClient = ReturnType<typeof postgres>;

const openClients: SqlClient[] = [];

export type DbClientOptions = {
  max?: number;
  statementTimeoutMs?: number;
};

function boundedPoolMax(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw < 1) {
    const fromEnv = Number(process.env.DATABASE_POOL_MAX ?? DEFAULT_POOL_MAX);
    if (!Number.isFinite(fromEnv) || fromEnv < 1) return DEFAULT_POOL_MAX;
    return Math.min(Math.floor(fromEnv), MAX_POOL);
  }
  return Math.min(Math.floor(raw), MAX_POOL);
}

function statementTimeout(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw) || raw < 0) {
    const fromEnv = Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? DEFAULT_STATEMENT_TIMEOUT_MS);
    if (!Number.isFinite(fromEnv) || fromEnv < 0) return DEFAULT_STATEMENT_TIMEOUT_MS;
    return Math.min(Math.floor(fromEnv), 120_000);
  }
  return Math.min(Math.floor(raw), 120_000);
}

export function createDbClient(connectionString?: string, options?: DbClientOptions) {
  const url = connectionString || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DATABASE_URL is required to create a database client.');
  }

  const isSsl =
    url.includes('rds.amazonaws.com') ||
    url.includes('sslmode=require') ||
    process.env.DATABASE_SSL === 'true';

  const timeoutMs = statementTimeout(options?.statementTimeoutMs);
  const client = postgres(url, {
    max: boundedPoolMax(options?.max),
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
    ssl: isSsl ? 'require' : undefined,
    connection: {
      application_name: 'astalakshimi-api',
      ...(timeoutMs > 0 ? { statement_timeout: timeoutMs } : {}),
    },
  });
  openClients.push(client);

  return drizzle(client, { schema });
}

/** Close every pool opened in this process. Used on shutdown so Fargate can drain. */
export async function closeDbClients(): Promise<void> {
  const pending = openClients.splice(0);
  await Promise.all(pending.map((client) => client.end({ timeout: 5 })));
}

export type Database = ReturnType<typeof createDbClient>;
