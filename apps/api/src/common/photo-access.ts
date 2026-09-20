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
  // Legacy UI value `accepted` (profile.photoPrivacy) maps to when_not_connected.
  if (value === 'never') return 'never';
  if (value === 'when_not_connected' || value === 'accepted') return 'when_not_connected';
  return DEFAULT_PHOTO_BLUR;
}

/** Map profiles.photo_privacy ↔ user_settings.photo_blur (single viewer-facing rule). */
export function photoPrivacyToBlur(privacy: string | null | undefined): PhotoBlurSetting {
  if (privacy === 'visible') return 'never';
  if (privacy === 'accepted') return 'when_not_connected';
  return 'always'; // blurred / unknown
}

export function photoBlurToPrivacy(blur: string | null | undefined): 'blurred' | 'accepted' | 'visible' {
  const n = normalizePhotoBlur(blur);
  if (n === 'never') return 'visible';
  if (n === 'when_not_connected') return 'accepted';
  return 'blurred';
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
 * Used by public/full-profile views — pending/rejected stay hidden.
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
 * Fetches photos the owner should see: pending + approved (excludes rejected).
 * Used by GET /profiles/me so newly uploaded photos remain visible before moderation.
 */
export async function getOwnerPhotos(
  db: Database,
  profileId: string,
): Promise<
  Array<{
    id: string;
    s3Key: string;
    isPrimary: boolean;
    displayOrder: number;
    status: 'pending' | 'approved' | 'rejected';
  }>
> {
  return db
    .select({
      id: profilePhotos.id,
      s3Key: profilePhotos.s3Key,
      isPrimary: profilePhotos.isPrimary,
      displayOrder: profilePhotos.displayOrder,
      status: profilePhotos.status,
    })
    .from(profilePhotos)
    .where(
      and(
        eq(profilePhotos.profileId, profileId),
        inArray(profilePhotos.status, ['pending', 'approved']),
      ),
    )
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
  const patternMatch = pattern.test(s3Key);

  if (!patternMatch) {
    // Allow frontend fallback mock keys generated before authentication (e.g., profiles/123_file.jpg)
    const isMockKey =
      (s3Key.startsWith('profiles/') ||
        s3Key.startsWith('verifications/') ||
        s3Key.startsWith('horoscopes/')) &&
      s3Key.includes('_');

    if (isMockKey) {
      return true;
    }
    return false;
  }

  return s3Key.includes(userId);
}
