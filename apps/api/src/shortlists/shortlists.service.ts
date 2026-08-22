import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { shortlists, profiles, profilePhotos } from '@astalakshimi/database';
import { eq, and, desc, inArray } from 'drizzle-orm';

@Injectable()
export class ShortlistsService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  private async getProfileId(userId: string): Promise<string> {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    
    return profile.id;
  }

  async getShortlists(userId: string) {
    const profileId = await this.getProfileId(userId);

    const userShortlists = await this.db
      .select({
        id: shortlists.id,
        targetProfileId: shortlists.targetProfileId,
        createdAt: shortlists.createdAt,
        targetProfile: profiles,
      })
      .from(shortlists)
      .innerJoin(profiles, eq(shortlists.targetProfileId, profiles.id))
      .where(eq(shortlists.profileId, profileId))
      .orderBy(desc(shortlists.createdAt));

    if (userShortlists.length === 0) return [];

    const targetProfileIds = userShortlists.map((s) => s.targetProfileId);

    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, targetProfileIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const photoMap = new Map(photos.map((p) => [p.profileId, p.s3Key]));

    return userShortlists.map((item) => {
      const p = item.targetProfile;
      const primaryPhoto = photoMap.get(p.id);
      const age = p.dob
        ? Math.floor((new Date().getTime() - new Date(p.dob).getTime()) / 31557600000)
        : 25;

      return {
        id: p.id,
        targetProfileId: p.id,
        shortlistId: item.id,
        profileId: p.id,
        fullName: p.fullName,
        age,
        gender: p.gender,
        city: p.city || 'Unknown',
        state: p.state || 'Unknown',
        caste: p.caste || 'Unknown',
        community: p.caste || 'Unknown',
        educationLevel: p.educationLevel || 'Graduate',
        education: p.educationLevel || 'Graduate',
        profession: p.profession || 'Professional',
        occupation: p.profession || 'Professional',
        income: p.annualIncome || 'Not specified',
        annualIncome: p.annualIncome || 'Not specified',
        motherTongue: p.motherTongue || 'Tamil',
        photos: primaryPhoto ? [primaryPhoto] : [],
        photo: primaryPhoto || null,
        matchPercent: 92,
        photoVerified: true,
        blurPhoto: false,
        createdAt: item.createdAt,
        profile: {
          id: p.id,
          fullName: p.fullName,
          age,
          city: p.city || 'Unknown',
          state: p.state || 'Unknown',
          caste: p.caste || 'Unknown',
          community: p.caste || 'Unknown',
          educationLevel: p.educationLevel || 'Graduate',
          profession: p.profession || 'Professional',
          photo: primaryPhoto || null,
          photos: primaryPhoto ? [primaryPhoto] : [],
        },
      };
    });
  }

  async getShortlistIds(userId: string): Promise<string[]> {
    const profileId = await this.getProfileId(userId);

    const userShortlists = await this.db
      .select({ targetProfileId: shortlists.targetProfileId })
      .from(shortlists)
      .where(eq(shortlists.profileId, profileId));

    return userShortlists.map((s) => s.targetProfileId);
  }

  async addShortlist(userId: string, targetProfileId: string) {
    const profileId = await this.getProfileId(userId);

    if (profileId === targetProfileId) {
      throw new BadRequestException('Cannot shortlist yourself');
    }

    const [existing] = await this.db
      .select()
      .from(shortlists)
      .where(
        and(
          eq(shortlists.profileId, profileId),
          eq(shortlists.targetProfileId, targetProfileId)
        )
      )
      .limit(1);

    if (existing) {
      return existing; // Already shortlisted
    }

    const [newShortlist] = await this.db
      .insert(shortlists)
      .values({
        profileId,
        targetProfileId,
      })
      .returning();

    return newShortlist;
  }

  async removeShortlist(userId: string, targetProfileId: string) {
    const profileId = await this.getProfileId(userId);

    await this.db
      .delete(shortlists)
      .where(
        and(
          eq(shortlists.profileId, profileId),
          eq(shortlists.targetProfileId, targetProfileId)
        )
      );

    return { success: true };
  }
}

