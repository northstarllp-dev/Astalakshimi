import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index';

export function createDbClient(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/astalakshimi';

  const isSsl = url.includes('rds.amazonaws.com') || url.includes('sslmode=require') || process.env.DATABASE_SSL === 'true';

  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isSsl ? 'require' : undefined,
  });

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDbClient>;
