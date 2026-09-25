import { db } from '@astalakshimi/database';
import { profiles } from '@astalakshimi/database';

async function check() {
  const allProfiles = await db.select({ profession: profiles.profession, gender: profiles.gender, name: profiles.fullName }).from(profiles).limit(50);
  console.log(allProfiles);
  process.exit(0);
}

check().catch(console.error);
