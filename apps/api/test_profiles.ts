import { createDbClient } from '../../packages/database/src/client';
import { profiles } from '../../packages/database/src/schema/profiles';
import { ilike } from 'drizzle-orm';

async function main() {
  const db = createDbClient(process.env.DATABASE_URL);
  
  const mahas = await db.select().from(profiles).where(ilike(profiles.fullName, '%Maha%'));
  console.log("Found Mahas:", mahas.length);
  for (const m of mahas) {
    console.log(`ID: ${m.id}, Name: ${m.fullName}`);
  }
  process.exit(0);
}
main();
