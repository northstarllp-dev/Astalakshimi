import { createDbClient } from '../../packages/database/src/client';
import { notifications } from '../../packages/database/src/schema/notifications';
import { profiles } from '../../packages/database/src/schema/profiles';

async function main() {
  const db = createDbClient(process.env.DATABASE_URL);
  
  const allNotifs = await db.select().from(notifications);
  
  const allProfiles = await db.select({ id: profiles.id }).from(profiles);
  const profileIds = new Set(allProfiles.map(p => p.id));
  
  const orphaned = allNotifs.filter(n => n.actorProfileId && !profileIds.has(n.actorProfileId));
  console.log("Orphaned notifications count:", orphaned.length);
  
  process.exit(0);
}
main();
