import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const sql = postgres(process.env.DATABASE_URL);

try {
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name LIKE '%education%' OR table_name LIKE '%special%')
    ORDER BY 1
  `;
  console.log('tables:', tables);

  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'profiles'
      AND (
        column_name LIKE '%education%'
        OR column_name LIKE '%degree%'
        OR column_name LIKE '%special%'
      )
    ORDER BY 1
  `;
  console.log('profile cols:', cols);
} finally {
  await sql.end();
}
