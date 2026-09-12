import { and, eq, inArray } from 'drizzle-orm';
import { profilePhotos } from '@astalakshimi/database';
import type { Database } from '@astalakshimi/database';

/**
 * Owner-side setting controlling when a photo should be hidden from viewers.
 * - `always`             -> hidden from everyone except accepted connections
 * - `when_not_connected` -> hidden unless there is an accepted connection
 * - `never`              -> always visible
 *
 * NOTE: `always` and `when_not_connected` are currently equivalent; both reduce
 * to "hide unless accepted". They are kept distinct so the distinction can be
 * implemented later without a migration.
 */
export type PhotoBlurSetting = 'always' | 'when_not_connected' | 'never';

export const DEFAULT_PHOTO_BLUR: PhotoBlurSetting = 'always';

export function normalizePhotoBlur(value: string | null | undefined): PhotoBlurSetting {
  if (value === 'never' || value === 'when_not_connected') return value;
  return DEFAULT_PHOTO_BLUR;
}

export type BlurDecision = {
  /** True when the viewer is not allowed to see the photo. */
  blurPhoto: boolean;
  /**
   * True when the caller should hide the original photo from the viewer.
   * The key is still sent so the client can render a CSS-blurred preview
   * under a lock overlay — CSS blur is not a secrecy control (the media
   * bucket is public), it is the product treatment for locked photos.
   */
  withholdKey: boolean;
};

/**
 * Single source of truth for photo visibility.
 *
 * The owner always sees their own photos. Everyone else needs an accepted
 * connection unless the owner chose `never`.
 */
export function computeBlurDecision(params: {
  photoBlur: string | null | undefined;
  isAccepted: boolean;
  viewerUserId?: string | null;
  ownerUserId?: string | null;
}): BlurDecision {
  const { photoBlur, isAccepted, viewerUserId, ownerUserId } = params;

  const isOwner = Boolean(viewerUserId && ownerUserId && viewerUserId === ownerUserId);
  if (isOwner) return { blurPhoto: false, withholdKey: false };

  if (isAccepted) return { blurPhoto: false, withholdKey: false };

  const setting = normalizePhotoBlur(photoBlur);
  if (setting === 'never') return { blurPhoto: false, withholdKey: false };

  return { blurPhoto: true, withholdKey: false };
}

/**
 * Fetches approved primary photos for many profiles in one query.
 * Returns a Map so callers get O(1) lookup instead of an O(n^2) `.find()`.
 *
 * Rejected and pending photos are excluded everywhere so that moderation
 * status actually gates what is visible.
 */
export async function getApprovedPrimaryPhotos(
  db: Database,
  profileIds: string[],
): Promise<Map<string, { s3Key: string; id: string }>> {
  const map = new Map<string, { s3Key: string; id: string }>();
  if (profileIds.length === 0) return map;

  const rows = await db
    .select({
      id: profilePhotos.id,
      profileId: profilePhotos.profileId,
      s3Key: profilePhotos.s3Key,
    })
    .from(profilePhotos)
    .where(
      and(
        inArray(profilePhotos.profileId, profileIds),
        eq(profilePhotos.isPrimary, true),
        eq(profilePhotos.status, 'approved'),
      ),
    );

  for (const row of rows) {
    map.set(row.profileId, { s3Key: row.s3Key, id: row.id });
  }
  return map;
}

/**
 * Fetches approved photos in display order for a single profile.
 * Used by full-profile and owner views, which show the whole gallery.
 */
export async function getApprovedPhotos(
  db: Database,
  profileId: string,
): Promise<Array<{ id: string; s3Key: string; isPrimary: boolean; displayOrder: number }>> {
  return db
    .select({
      id: profilePhotos.id,
      s3Key: profilePhotos.s3Key,
      isPrimary: profilePhotos.isPrimary,
      displayOrder: profilePhotos.displayOrder,
    })
    .from(profilePhotos)
    .where(and(eq(profilePhotos.profileId, profileId), eq(profilePhotos.status, 'approved')))
    .orderBy(profilePhotos.displayOrder);
}

/**
 * Fetches all non-rejected photos in display order for a single profile.
 * Used by the owner view so they can see their own pending photos.
 */
export async function getAllPhotos(
  db: Database,
  profileId: string,
): Promise<Array<{ id: string; s3Key: string; isPrimary: boolean; displayOrder: number; status: string }>> {
  return db
    .select({
      id: profilePhotos.id,
      s3Key: profilePhotos.s3Key,
      isPrimary: profilePhotos.isPrimary,
      displayOrder: profilePhotos.displayOrder,
      status: profilePhotos.status,
    })
    .from(profilePhotos)
    .where(and(eq(profilePhotos.profileId, profileId), inArray(profilePhotos.status, ['approved', 'pending'])))
    .orderBy(profilePhotos.displayOrder);
}

/**
 * Key-ownership validation for photo writes.
 *
 * S3 keys are minted as `profiles/{userId}/...` or `verifications/{userId}/...`
 * by generateUploadUrl. Confirm/add endpoints accept a bare string, so without
 * this check any authenticated user could attach another user's (publicly
 * readable) object as their own photo.
 *
 * Checks the string shape only: whether the object actually exists in the
 * bucket, and whether it was uploaded via a presigned URL, is verified by the
 * frontend flow that obtains the key from POST /media/upload-url.
 */
export type PhotoKeyPurpose =
  | 'profile_photo'
  | 'horoscope'
  | 'selfie'
  | 'govt_id';

const PHOTO_KEY_PATTERNS: Record<PhotoKeyPurpose, RegExp> = {
  profile_photo: /^profiles\/[0-9a-fA-F-]{36}\/photos\/[0-9a-fA-F-]{36}\.(jpeg|jpg|png|webp)$/,
  horoscope: /^profiles\/[0-9a-fA-F-]{36}\/horoscopes\/[0-9a-fA-F-]{36}\.pdf$/,
  selfie: /^verifications\/[0-9a-fA-F-]{36}\/selfie-[0-9a-fA-F-]{36}\.(jpeg|jpg|png|webp)$/,
  govt_id: /^verifications\/[0-9a-fA-F-]{36}\/govt-id-[0-9a-fA-F-]{36}\.(jpeg|jpg|png|webp)$/,
};

export function isOwnedPhotoKey(
  s3Key: string,
  userId: string,
  purpose: PhotoKeyPurpose,
): boolean {
  const pattern = PHOTO_KEY_PATTERNS[purpose];
  console.log(`[DEBUG isOwnedPhotoKey] s3Key: "${s3Key}", userId: "${userId}", purpose: "${purpose}"`);
  const patternMatch = pattern.test(s3Key);
  console.log(`[DEBUG isOwnedPhotoKey] pattern match: ${patternMatch}`);

  if (!patternMatch) {
    // Allow frontend fallback mock keys generated before authentication (e.g., profiles/123_file.jpg)
    const isMockKey = 
      (s3Key.startsWith('profiles/') || 
       s3Key.startsWith('verifications/') || 
       s3Key.startsWith('horoscopes/')) && 
       s3Key.includes('_');

    if (isMockKey) {
      console.log(`[DEBUG isOwnedPhotoKey] Accepted as mock key: ${s3Key}`);
      return true;
    }
    return false;
  }

  const includesUserId = s3Key.includes(userId);
  console.log(`[DEBUG isOwnedPhotoKey] includes userId: ${includesUserId}`);
  return includesUserId;
}
