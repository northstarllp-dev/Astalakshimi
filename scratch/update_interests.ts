import { createDbClient } from '../packages/database/src/client';
import { profiles, interests } from '../packages/database/src/schema';
import { eq, ilike } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const db = createDbClient();

  try {
    // 1. Find Mahalakshmi
    const mahaProfiles = await db.select().from(profiles).where(ilike(profiles.fullName, '%Mahalakshmi%'));
    if (mahaProfiles.length === 0) {
      console.log("Mahalakshmi profile not found!");
      process.exit(1);
    }
    const maha = mahaProfiles[0];
    console.log(`Found Mahalakshmi: ${maha.id} (${maha.fullName})`);

    // 2. Find 10 Male profiles
    const maleProfiles = await db.select().from(profiles).where(eq(profiles.gender, 'Male')).limit(10);
    if (maleProfiles.length < 10) {
      console.log(`Found only ${maleProfiles.length} male profiles. Needed 10.`);
      process.exit(1);
    }
    console.log(`Found 10 male profiles.`);

    // 3. Set up 5 where Mahalakshmi sent to Male, and Male accepted
    const group1 = maleProfiles.slice(0, 5);
    for (const p of group1) {
      await db.insert(interests).values({
        senderProfileId: maha.id,
        receiverProfileId: p.id,
        status: 'accepted',
        respondedAt: new Date()
      }).onConflictDoUpdate({
        target: [interests.senderProfileId, interests.receiverProfileId],
        set: { status: 'accepted', respondedAt: new Date(), updatedAt: new Date() }
      });
      console.log(`Male ${p.fullName} (${p.id}) accepted interest from Mahalakshmi.`);
    }

    // 4. Set up 5 where Male sent to Mahalakshmi, and status is pending
    const group2 = maleProfiles.slice(5, 10);
    for (const p of group2) {
      await db.insert(interests).values({
        senderProfileId: p.id,
        receiverProfileId: maha.id,
        status: 'pending'
      }).onConflictDoUpdate({
        target: [interests.senderProfileId, interests.receiverProfileId],
        set: { status: 'pending', updatedAt: new Date() }
      });
      console.log(`Male ${p.fullName} (${p.id}) sent interest to Mahalakshmi.`);
    }

    console.log("Done updating interests.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
