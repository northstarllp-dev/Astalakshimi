import { createDbClient } from '../../packages/database/src/client';
import { users } from '../../packages/database/src/schema/users';
import { profiles } from '../../packages/database/src/schema/profiles';
import { notifications } from '../../packages/database/src/schema/notifications';
import { eq } from 'drizzle-orm';

async function main() {
  const db = createDbClient(process.env.DATABASE_URL);
  
  // Find a test profile to try deleting
  const testProfiles = await db.select().from(profiles).limit(1);
  if (!testProfiles.length) {
    console.log("No profiles found");
    process.exit(0);
  }
  const profileId = testProfiles[0].id;
  const userId = testProfiles[0].userId;
  console.log(`Trying to delete profile: ${profileId}, user: ${userId}`);
  
  try {
     // Run the EXACT same logic as the service
     await db.delete(notifications).where(eq(notifications.actorProfileId, profileId));
     await db.delete(users).where(eq(users.id, userId));
     console.log("Delete successful!");
  } catch (e) {
     console.error("Delete failed:", e);
  }
  process.exit(0);
}
main();
