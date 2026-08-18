import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export function createDbClient(connectionString?: string) {
  const url =
    connectionString ||
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/astalakshimi';

  const client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDbClient>;
