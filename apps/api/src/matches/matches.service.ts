import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, profilePhotos, userSettings, interests } from '@astalakshimi/database';
import { eq, ne, and, inArray, or } from 'drizzle-orm';

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

    // 2. Fetch 4 random compatible profiles other than the user
    const topProfiles = await this.db
      .select()
      .from(profiles)
      .where(and(...conditions))
      .limit(4);

    if (topProfiles.length === 0) return [];

    // 3. Fetch their primary photos, user settings, and connection status
    const profileIds = topProfiles.map((p) => p.id);
    const userIds = topProfiles.map((p) => p.userId);

    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, profileIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

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

    // 4. Map photos back to profiles
    return topProfiles.map((p) => {
      const primaryPhoto = photos.find((photo) => photo.profileId === p.id);
      const setting = settings.find((s) => s.userId === p.userId);
      const isAccepted = connections.some(
        (c) => c.senderProfileId === p.id || c.receiverProfileId === p.id
      );

      const photoBlurSetting = setting?.photoBlur || 'always';
      const blurPhoto = photoBlurSetting !== 'never' && !isAccepted;

      return {
        id: p.id,
        fullName: p.fullName,
        age: p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 25,
        city: p.city,
        state: p.state,
        profession: p.profession,
        photos: primaryPhoto ? [primaryPhoto.s3Key] : [],
        isPremium: false,
        isVerified: true,
        blurPhoto,
      };
    });
  }
}
