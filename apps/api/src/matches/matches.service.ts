import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, userSettings, interests, verifications } from '@astalakshimi/database';
import { eq, ne, and, inArray, or } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';

@Injectable()
export class MatchesService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getTopMatches(userId: string) {
    // 1. Fetch current user's gender
    const [currentUser] = await this.db
      .select({ id: profiles.id, gender: profiles.gender })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const conditions: any[] = [ne(profiles.userId, userId)];
    
    if (currentUser && currentUser.gender) {
      const targetGender = currentUser.gender === 'Male' ? 'Female' : 'Male';
      conditions.push(eq(profiles.gender, targetGender));
    }

    const topProfiles = await this.db
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(8);

    if (topProfiles.length === 0) return [];

    // 3. Fetch their primary photos, user settings, and connection status
    const profileIds = topProfiles.map((p) => p.id);
    const userIds = topProfiles.map((p) => p.userId);

    const photos = await getApprovedPrimaryPhotos(this.db, profileIds);

    const settings = await this.db
      .select()
      .from(userSettings)
      .where(inArray(userSettings.userId, userIds));

    let connections: any[] = [];
    if (currentUser) {
      connections = await this.db
        .select()
        .from(interests)
        .where(
          and(
            or(eq(interests.senderProfileId, currentUser.id), eq(interests.receiverProfileId, currentUser.id)),
            or(inArray(interests.senderProfileId, profileIds), inArray(interests.receiverProfileId, profileIds)),
            eq(interests.status, 'accepted')
          )
        );
    }

    // Real verification state, so the badge reflects an actual review.
    const verificationRows = await this.db
      .select({ profileId: verifications.profileId, status: verifications.status })
      .from(verifications)
      .where(inArray(verifications.profileId, profileIds));
    const verificationByProfile = new Map(verificationRows.map((v) => [v.profileId, v.status]));

    // 4. Map photos back to profiles
    return topProfiles.map((p) => {
      const primaryPhoto = photos.get(p.id);
      const setting = settings.find((s) => s.userId === p.userId);
      const isAccepted = connections.some(
        (c) => c.senderProfileId === p.id || c.receiverProfileId === p.id
      );

      const { blurPhoto, withholdKey } = computeBlurDecision({
        photoBlur: setting?.photoBlur,
        isAccepted,
        viewerUserId: userId,
        ownerUserId: p.userId,
      });

      const verificationStatus = verificationByProfile.get(p.id) ?? 'idle';
      const isVerified = verificationStatus === 'verified';

      return {
        id: p.id,
        fullName: p.fullName,
        age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 25,
        heightCm: p.heightCm,
        city: p.city,
        state: p.state,
        religion: p.religion,
        caste: p.caste,
        motherTongue: p.motherTongue,
        maritalStatus: p.maritalStatus,
        educationLevel: p.educationLevel,
        degree: p.degree,
        profession: p.profession,
        occupation: p.profession,
        companyName: p.companyName,
        annualIncome: p.annualIncome,
        // Key is withheld when blurred — the bucket is public, so sending it
        // would let anyone view the photo regardless of the blur flag.
        photos: withholdKey || !primaryPhoto ? [] : [primaryPhoto.s3Key],
        photoVerified: isVerified,
        isPremium: false,
        isVerified,
        blurPhoto,
        matchPercent: 78 + (p.fullName.length % 15),
      };
    });
  }
}
