import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, userSettings, interests, verifications } from '@astalakshimi/database';
import { eq, ne, and, inArray, or, desc, gte, lte, sql } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';
import {
  passesHardFilters,
  scoreCandidate,
  type BasicPrefs,
} from './match-scoring';
import { cleanList, dobBoundsForAgeWindow, loadViewerContext } from './viewer-context';

const POOL_LIMIT = 200;
const TOP_N = 8;

@Injectable()
export class MatchesService {
  // Short-lived per-user cache. Absorbs double-tap / refresh / poll loads
  // without re-running the pool query + scoring fan-out.
  // Single-instance only; staleness is fine here.
  private cache = new Map<string, { ts: number; value: unknown }>();
  private readonly cacheTtlMs = 15_000;

  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getTopMatches(userId: string) {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return cached.value as ReturnType<MatchesService['computeTopMatches']>;
    }

    const result = await this.computeTopMatches(userId);

    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(userId, { ts: Date.now(), value: result });
    return result;
  }

  private async computeTopMatches(userId: string) {
    // 1. Fetch current user's profile + partner preferences
    const viewer = await loadViewerContext(this.db, userId);
    if (!viewer) return [];

    const prefs: BasicPrefs = viewer.prefs;

    // 2. Candidate pool: opposite gender, not self. Hard filters (age window,
    //    religion, marital status) are pushed into SQL so we rank the best of
    //    the catalog instead of an arbitrary slice; the Node-side hard filter
    //    below stays as the exact boundary authority. Hidden profiles never
    //    enter the pool.
    const conditions: any[] = [ne(profiles.userId, userId)];
    if (viewer.gender) {
      const targetGender = viewer.gender === 'Male' ? 'Female' : 'Male';
      conditions.push(eq(profiles.gender, targetGender));
    }

    const { dobUpper, dobLower } = dobBoundsForAgeWindow(prefs);
    conditions.push(lte(profiles.dob, dobUpper));
    conditions.push(gte(profiles.dob, dobLower));

    const religions = cleanList(prefs.prefReligions);
    if (religions.length > 0) conditions.push(inArray(profiles.religion, religions));

    const maritalStatuses: any[] = cleanList(prefs.prefMaritalStatuses);
    if (maritalStatuses.length > 0) {
      conditions.push(inArray(profiles.maritalStatus, maritalStatuses));
    }

    conditions.push(
      sql`NOT EXISTS (
        SELECT 1 FROM user_settings
        WHERE user_settings.user_id = ${profiles.userId}
          AND (user_settings.hide_profile = true OR user_settings.profile_visibility = 'hidden')
      )`,
    );

    const pool = await this.db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        fullName: profiles.fullName,
        dob: profiles.dob,
        heightCm: profiles.heightCm,
        city: profiles.city,
        state: profiles.state,
        religion: profiles.religion,
        caste: profiles.caste,
        motherTongue: profiles.motherTongue,
        maritalStatus: profiles.maritalStatus,
        educationLevel: profiles.educationLevel,
        degree: profiles.degree,
        profession: profiles.profession,
        companyName: profiles.companyName,
        annualIncome: profiles.annualIncome,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(and(...conditions))
      .orderBy(desc(profiles.createdAt))
      .limit(POOL_LIMIT);

    // 3. Hard filters + soft score, best first; recency breaks score ties.
    const ranked = pool
      .filter((p) => passesHardFilters(p as any, prefs).ok)
      .map((p) => ({ profile: p, score: scoreCandidate(p as any, prefs) }))
      .sort(
        (a, b) =>
          b.score.percent - a.score.percent ||
          new Date(b.profile.createdAt).getTime() - new Date(a.profile.createdAt).getTime(),
      )
      .slice(0, TOP_N);

    const topProfiles = ranked.map((r) => r.profile);
    if (topProfiles.length === 0) return [];

    // 4. Fetch their primary photos, user settings, and connection status
    const profileIds = topProfiles.map((p) => p.id);
    const userIds = topProfiles.map((p) => p.userId);

    const photos = await getApprovedPrimaryPhotos(this.db, profileIds);

    const settings = await this.db
      .select()
      .from(userSettings)
      .where(inArray(userSettings.userId, userIds));

    let connections: any[] = [];
    connections = await this.db
      .select()
      .from(interests)
      .where(
        and(
          or(eq(interests.senderProfileId, viewer.profileId), eq(interests.receiverProfileId, viewer.profileId)),
          or(inArray(interests.senderProfileId, profileIds), inArray(interests.receiverProfileId, profileIds)),
          eq(interests.status, 'accepted'),
        ),
      );

    // Real verification state, so the badge reflects an actual review.
    const verificationRows = await this.db
      .select({ profileId: verifications.profileId, status: verifications.status })
      .from(verifications)
      .where(inArray(verifications.profileId, profileIds));
    const verificationByProfile = new Map(verificationRows.map((v) => [v.profileId, v.status]));
    const scoreByProfile = new Map(ranked.map((r) => [r.profile.id, r.score]));

    // 5. Map photos back to profiles
    return topProfiles.map((p) => {
      const primaryPhoto = photos.get(p.id);
      const setting = settings.find((s) => s.userId === p.userId);
      const isAccepted = connections.some(
        (c) => c.senderProfileId === p.id || c.receiverProfileId === p.id,
      );

      const { blurPhoto, withholdKey } = computeBlurDecision({
        photoBlur: setting?.photoBlur,
        isAccepted,
        viewerUserId: userId,
        ownerUserId: p.userId,
      });

      const verificationStatus = verificationByProfile.get(p.id) ?? 'idle';
      const isVerified = verificationStatus === 'verified';
      const score = scoreByProfile.get(p.id);

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
        matchPercent: score?.percent ?? 40,
        matchReasons: score?.reasons ?? [],
      };
    });
  }
}
