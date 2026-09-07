import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { blockedProfiles, profiles, userSettings, interests } from '@astalakshimi/database';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';

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

    const photos = await getApprovedPrimaryPhotos(this.db, targetProfileIds);

    // Blocking someone does not grant photo access, so their blur preference
    // still applies on this management list.
    const settings = await this.db
      .select({ userId: userSettings.userId, photoBlur: userSettings.photoBlur })
      .from(userSettings)
      .where(inArray(userSettings.userId, blocks.map((b) => b.targetProfile.userId)));
    const blurByUser = new Map(settings.map((s) => [s.userId, s.photoBlur]));

    const accepted = await this.db
      .select({ senderProfileId: interests.senderProfileId, receiverProfileId: interests.receiverProfileId })
      .from(interests)
      .where(and(inArray(interests.senderProfileId, targetProfileIds), eq(interests.status, 'accepted')));
    const acceptedIds = new Set<string>();
    for (const row of accepted) {
      acceptedIds.add(row.senderProfileId);
      acceptedIds.add(row.receiverProfileId);
    }

    return blocks.map((item) => {
      const p = item.targetProfile;
      const age = p.dob
        ? Math.floor((new Date().getTime() - new Date(p.dob).getTime()) / 31557600000)
        : 25;

      // A block and an accepted connection can coexist, so check rather than assume.
      const isAccepted = acceptedIds.has(p.id);
      const { withholdKey } = computeBlurDecision({
        photoBlur: blurByUser.get(p.userId),
        isAccepted,
        ownerUserId: p.userId,
      });
      const visiblePhoto = withholdKey ? null : (photos.get(p.id)?.s3Key ?? null);

      return {
        id: p.id,
        blockedId: item.id,
        profileId: p.id,
        fullName: p.fullName,
        age,
        city: p.city || 'Unknown',
        caste: p.caste || 'Unknown',
        photo: visiblePhoto,
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
