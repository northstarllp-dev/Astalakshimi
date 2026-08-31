import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { blockedProfiles, profiles, profilePhotos } from '@astalakshimi/database';
import { eq, and, or, desc, inArray } from 'drizzle-orm';

@Injectable()
export class BlocksService {
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

  async getBlockedProfiles(userId: string) {
    const profileId = await this.getProfileId(userId);

    const blocks = await this.db
      .select({
        id: blockedProfiles.id,
        targetProfileId: blockedProfiles.blockedId,
        createdAt: blockedProfiles.createdAt,
        targetProfile: profiles,
      })
      .from(blockedProfiles)
      .innerJoin(profiles, eq(blockedProfiles.blockedId, profiles.id))
      .where(eq(blockedProfiles.blockerId, profileId))
      .orderBy(desc(blockedProfiles.createdAt));

    if (blocks.length === 0) return [];

    const targetProfileIds = blocks.map((b) => b.targetProfileId);

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

    return blocks.map((item) => {
      const p = item.targetProfile;
      const primaryPhoto = photoMap.get(p.id);
      const age = p.dob
        ? Math.floor((new Date().getTime() - new Date(p.dob).getTime()) / 31557600000)
        : 25;

      return {
        id: p.id,
        blockedId: item.id,
        profileId: p.id,
        fullName: p.fullName,
        age,
        city: p.city || 'Unknown',
        caste: p.caste || 'Unknown',
        photo: primaryPhoto || null,
        createdAt: item.createdAt,
      };
    });
  }

  async blockProfile(userId: string, targetProfileId: string) {
    const profileId = await this.getProfileId(userId);

    if (profileId === targetProfileId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const [existing] = await this.db
      .select()
      .from(blockedProfiles)
      .where(
        and(
          eq(blockedProfiles.blockerId, profileId),
          eq(blockedProfiles.blockedId, targetProfileId)
        )
      )
      .limit(1);

    if (existing) {
      return existing; // Already blocked
    }

    const [newBlock] = await this.db
      .insert(blockedProfiles)
      .values({
        blockerId: profileId,
        blockedId: targetProfileId,
      })
      .returning();

    return newBlock;
  }

  async unblockProfile(userId: string, targetProfileId: string) {
    const profileId = await this.getProfileId(userId);

    await this.db
      .delete(blockedProfiles)
      .where(
        and(
          eq(blockedProfiles.blockerId, profileId),
          eq(blockedProfiles.blockedId, targetProfileId)
        )
      );

    return { success: true };
  }

  async isBlocked(profile1Id: string, profile2Id: string): Promise<boolean> {
    const [block] = await this.db
      .select({ id: blockedProfiles.id })
      .from(blockedProfiles)
      .where(
        or(
          and(eq(blockedProfiles.blockerId, profile1Id), eq(blockedProfiles.blockedId, profile2Id)),
          and(eq(blockedProfiles.blockerId, profile2Id), eq(blockedProfiles.blockedId, profile1Id))
        )
      )
      .limit(1);

    return !!block;
  }
}
