import { db } from './packages/database/src/client';
import { verifications } from './packages/database/src/schema/verifications';

async function test() {
  try {
    const res = await db.insert(verifications).values({
      profileId: '711c7d68-5b6b-4de3-989f-1e0a2aca1800',
      method: 'selfie',
      selfieS3Key: 'test',
      status: 'pending',
    }).onConflictDoUpdate({
      target: verifications.profileId,
      set: {
        status: 'pending',
        updatedAt: new Date(),
      }
    }).returning();
    console.log('Success:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
