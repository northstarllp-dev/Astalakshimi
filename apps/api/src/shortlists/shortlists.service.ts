import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { shortlists, profiles, userSettings, interests, verifications } from '@astalakshimi/database';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';
import { loadViewerContext } from '../matches/viewer-context';
import { scoreCandidate } from '../matches/match-scoring';

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

    // Viewer prefs power real compatibility scores for the shortlisted rows.
    const viewer = await loadViewerContext(this.db, userId);

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

    const photos = await getApprovedPrimaryPhotos(this.db, targetProfileIds);

    // Shortlisting is one-directional, so shortlisting someone does not grant
    // photo access — we still honour their blur preference.
    const settings = await this.db
      .select({ userId: userSettings.userId, photoBlur: userSettings.photoBlur })
      .from(userSettings)
      .where(inArray(userSettings.userId, userShortlists.map((s) => s.targetProfile.userId)));
    const blurByUser = new Map(settings.map((s) => [s.userId, s.photoBlur]));

    // Shortlisting is not a connection, but an accepted interest may exist
    // either way (viewer→target OR target→viewer).
    const accepted = await this.db
      .select({ senderProfileId: interests.senderProfileId, receiverProfileId: interests.receiverProfileId })
      .from(interests)
      .where(
        and(
          eq(interests.status, 'accepted'),
          or(
            and(
              inArray(interests.senderProfileId, targetProfileIds),
              eq(interests.receiverProfileId, profileId),
            ),
            and(
              inArray(interests.receiverProfileId, targetProfileIds),
              eq(interests.senderProfileId, profileId),
            ),
          ),
        ),
      );
    const acceptedIds = new Set<string>();
    for (const row of accepted) {
      acceptedIds.add(row.senderProfileId);
      acceptedIds.add(row.receiverProfileId);
    }

    const verificationRows = await this.db
      .select({ profileId: verifications.profileId, status: verifications.status })
      .from(verifications)
      .where(inArray(verifications.profileId, targetProfileIds));
    const verificationByProfile = new Map(verificationRows.map((v) => [v.profileId, v.status]));

    return userShortlists.map((item) => {
      const p = item.targetProfile;
      const primaryPhoto = photos.get(p.id);
      const age = p.dob
        ? Math.floor((new Date().getTime() - new Date(p.dob).getTime()) / 31557600000)
        : 25;

      const { blurPhoto, withholdKey } = computeBlurDecision({
        photoBlur: blurByUser.get(p.userId),
        isAccepted: acceptedIds.has(p.id),
        viewerUserId: userId,
        ownerUserId: p.userId,
      });
      const visibleKey = withholdKey ? null : (primaryPhoto?.s3Key ?? null);
      const isVerified = verificationByProfile.get(p.id) === 'verified';
      const score = viewer ? scoreCandidate(p as any, viewer.prefs) : null;

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
        photos: visibleKey ? [visibleKey] : [],
        photo: visibleKey,
        matchPercent: score?.percent ?? null,
        matchReasons: score?.reasons ?? [],
        photoVerified: isVerified,
        isVerified,
        blurPhoto,
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
          // Always expose the S3 key string — never the photo row object.
          photo: visibleKey,
          photos: visibleKey ? [visibleKey] : [],
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

