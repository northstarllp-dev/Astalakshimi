import { eq } from 'drizzle-orm';
import {
  profiles,
  lifestyleInterests,
  horoscopes,
  profilePhotos,
  verifications,
} from '@astalakshimi/database';
import type { Database } from '@astalakshimi/database';
import { requiredFieldsComplete } from '@astalakshimi/validation';

/**
 * Recompute `profiles.required_complete` from sibling rows + photo count.
 * For staff-created profiles that become complete, promote verification to
 * `verified` (assisted registration is trusted once mandatory fields are set).
 */
export async function refreshRequiredComplete(
  db: Database,
  profileId: string,
): Promise<boolean> {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile) return false;

  const [lifestyle] = await db
    .select()
    .from(lifestyleInterests)
    .where(eq(lifestyleInterests.profileId, profileId))
    .limit(1);

  const [horoscope] = await db
    .select()
    .from(horoscopes)
    .where(eq(horoscopes.profileId, profileId))
    .limit(1);

  const photoRows = await db
    .select({ id: profilePhotos.id })
    .from(profilePhotos)
    .where(eq(profilePhotos.profileId, profileId));

  const complete = requiredFieldsComplete({
    profile,
    lifestyle,
    horoscope,
    photoCount: photoRows.length,
  });

  if (profile.requiredComplete !== complete) {
    await db
      .update(profiles)
      .set({ requiredComplete: complete, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));
  }

  if (complete && profile.createdBy === 'staff') {
    const [v] = await db
      .select({ status: verifications.status })
      .from(verifications)
      .where(eq(verifications.profileId, profileId))
      .limit(1);

    if (v && v.status !== 'verified') {
      await db
        .update(verifications)
        .set({
          status: 'verified',
          rejectionReason: null,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(verifications.profileId, profileId));
    }
  }

  return complete;
}
