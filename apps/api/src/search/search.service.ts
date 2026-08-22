import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, profilePhotos, userSettings, interests } from '@astalakshimi/database';
import { eq, and, ne, inArray, gte, lte, or } from 'drizzle-orm';

@Injectable()
export class SearchService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async searchProfiles(userId: string, filters: any) {
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

    if (filters.ageMin) {
       const minDob = new Date();
       minDob.setFullYear(minDob.getFullYear() - parseInt(filters.ageMin, 10));
       conditions.push(lte(profiles.dob, minDob.toISOString().split('T')[0]));
    }
    if (filters.ageMax) {
       const maxDob = new Date();
       maxDob.setFullYear(maxDob.getFullYear() - parseInt(filters.ageMax, 10) - 1); // up to end of age year
       conditions.push(gte(profiles.dob, maxDob.toISOString().split('T')[0]));
    }
    if (filters.city) {
      conditions.push(eq(profiles.city, filters.city));
    }
    if (filters.community) {
      conditions.push(eq(profiles.caste, filters.community));
    }
    
    // pagination
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const offset = (page - 1) * limit;

    const result = await this.db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        fullName: profiles.fullName,
        gender: profiles.gender,
        dob: profiles.dob,
        religion: profiles.religion,
        caste: profiles.caste,
        maritalStatus: profiles.maritalStatus,
        heightCm: profiles.heightCm,
        educationLevel: profiles.educationLevel,
        profession: profiles.profession,
        city: profiles.city,
        state: profiles.state,
        country: profiles.country,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);

    // Get total count
    // (A real app would use a more efficient count query)
    const countResult = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(...conditions));
    const totalCount = countResult.length;

    const profileIds = result.map((p) => p.id);
    const userIds = result.map((p) => p.userId);
    
    let photos: any[] = [];
    let settings: any[] = [];
    let connections: any[] = [];

    if (profileIds.length > 0) {
      photos = await this.db
        .select()
        .from(profilePhotos)
        .where(
          and(
            inArray(profilePhotos.profileId, profileIds),
            eq(profilePhotos.isPrimary, true)
          )
        );

      settings = await this.db
        .select()
        .from(userSettings)
        .where(inArray(userSettings.userId, userIds));

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
    }

    const mappedResult = result.map((profile) => {
      const primaryPhoto = photos.find((photo) => photo.profileId === profile.id);
      const setting = settings.find((s) => s.userId === profile.userId);
      const isAccepted = connections.some(
        (c) => c.senderProfileId === profile.id || c.receiverProfileId === profile.id
      );

      // Determine blur logic:
      // 'always': means always blur (until accepted, which overrides it conceptually)
      // 'when_not_connected': blur if not accepted
      // 'never': never blur
      // Default interpretation: if it's 'never', it's visible. Otherwise, require accepted connection.
      const photoBlurSetting = setting?.photoBlur || 'always';
      const blurPhoto = photoBlurSetting !== 'never' && !isAccepted;

      return {
        ...profile,
        // map for frontend component compatibility
        age: profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 25,
        photos: primaryPhoto ? [primaryPhoto.s3Key] : [], 
        blurPhoto,
      };
    });

    return {
      profiles: mappedResult,
      totalCount: totalCount,
    };
  }
}
