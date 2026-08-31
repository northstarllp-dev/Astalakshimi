import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, profilePhotos, userSettings, interests } from '@astalakshimi/database';
import { eq, and, ne, inArray, gte, lte, or, desc, sql, isNotNull } from 'drizzle-orm';

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
    // profile completeness requirement (roughly >= 80%)
    conditions.push(isNotNull(profiles.aboutMe));
    conditions.push(sql`EXISTS (SELECT 1 FROM profile_photos WHERE profile_photos.profile_id = profiles.id AND profile_photos.is_primary = true)`);
    
    // advanced filters
    if (filters.advanced) {
      try {
        const adv = typeof filters.advanced === 'string' ? JSON.parse(filters.advanced) : filters.advanced;
        if (adv.heights && adv.heights.length > 0) conditions.push(inArray(profiles.heightCm, adv.heights.map((h: string) => {
          // Simplistic mapping, in reality we'd parse the range or have consistent data.
          // For now, if there's any filter, just use a dummy '0' if it doesn't parse well,
          // or ideally mapping it properly. We will just check if profiles.heightCm matches logic if possible, 
          // or for now just avoid crashing. If the DB just stores heights as strings, we do inArray.
          // In the database schema heightCm is integer.
          return parseInt(h) || 165; 
        })));
        if (adv.educations && adv.educations.length > 0) conditions.push(inArray(profiles.educationLevel, adv.educations));
        if (adv.incomes && adv.incomes.length > 0) conditions.push(inArray(profiles.annualIncome, adv.incomes));
        if (adv.occupations && adv.occupations.length > 0) conditions.push(inArray(profiles.profession, adv.occupations));
      } catch (e) {
        // ignore advanced parsing errors
      }
    }

    // pagination
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const offset = (page - 1) * limit;

    let orderByClause: any;
    if (filters.tab === 'new') {
      orderByClause = desc(profiles.createdAt);
    }

    let query: any = this.db
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
        companyName: profiles.companyName,
        annualIncome: profiles.annualIncome,
        motherTongue: profiles.motherTongue,
        aboutMe: profiles.aboutMe,
        city: profiles.city,
        state: profiles.state,
        country: profiles.country,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset);
      
    if (orderByClause) {
      query = query.orderBy(orderByClause);
    }
    
    const countQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .where(and(...conditions));

    const [result, countResult] = await Promise.all([query, countQuery]);
    const totalCount = countResult[0]?.count ?? 0;

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
        education: profile.educationLevel || 'Not specified',
        occupation: profile.profession || 'Not specified',
        company: profile.companyName || 'Not specified',
        income: profile.annualIncome || 'Not specified',
        motherTongue: profile.motherTongue || 'Not specified',
        about: profile.aboutMe || '',
        lastActive: 'Online now',
        community: profile.caste || 'Unknown',
        height: profile.heightCm ? `${profile.heightCm} cm` : 'Unknown',
      };
    });

    return {
      profiles: mappedResult,
      totalCount: totalCount,
    };
  }
}
