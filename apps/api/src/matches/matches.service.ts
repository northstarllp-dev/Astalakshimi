import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import {
  profiles,
  userSettings,
  interests,
  verifications,
  subscriptions,
  plans,
} from '@astalakshimi/database';
import { eq, ne, and, inArray, or, desc, gte, lte, gt, sql } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';
import {
  candidateAge,
  hasRequiredPartnerPrefs,
  passesHardFilters,
  scoreCandidate,
  targetGenders,
  type BasicPrefs,
  type MatchScore,
} from './match-scoring';
import {
  cleanList,
  dobBoundsForAgeWindow,
  loadViewerContext,
  lowerIn,
  visibilitySql,
  type ViewerContext,
} from './viewer-context';

const POOL_LIMIT = 200;
const TOP_N = 8;

type ScoredRow = { profile: any; score: MatchScore };
type ScoredPool = { viewer: ViewerContext; ranked: ScoredRow[] };

@Injectable()
export class MatchesService {
  // Short-lived per-user cache for the scored candidate pool (viewer context +
  // ranked rows), shared by the top-N and paginated read paths. Absorbs
  // double-tap / refresh / poll loads without re-running the pool query +
  // scoring fan-out. Single-instance only; staleness is fine here.
  private cache = new Map<string, { ts: number; value: unknown }>();
  private readonly cacheTtlMs = 15_000;

  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getTopMatches(userId: string) {
    const pool = await this.getScoredPool(userId);
    if (!pool) return [];
    return this.enrichMatches(pool.ranked.slice(0, TOP_N), pool.viewer, userId);
  }

  async getPaginatedMatches(userId: string, { page, limit }: { page: number; limit: number }) {
    const pool = await this.getScoredPool(userId);
    if (!pool) return { matches: [], totalCount: 0 };

    const offset = (page - 1) * limit;
    const matches = await this.enrichMatches(
      pool.ranked.slice(offset, offset + limit),
      pool.viewer,
      userId,
    );
    return { matches, totalCount: pool.ranked.length };
  }

  private async getScoredPool(userId: string): Promise<ScoredPool | null> {
    const cached = this.cache.get(userId);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return cached.value as ScoredPool | null;
    }

    const result = await this.computeScoredPool(userId);

    // Evict oldest when the cache grows too large (simple LRU-by-insertion)
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(userId, { ts: Date.now(), value: result });
    return result;
  }

  private async computeScoredPool(userId: string): Promise<ScoredPool | null> {
    // 1. Fetch current user's profile + partner preferences
    const viewer = await loadViewerContext(this.db, userId);
    if (!viewer) return null;

    const prefs: BasicPrefs = viewer.prefs;
    if (!hasRequiredPartnerPrefs(prefs)) {
      return { viewer, ranked: [] };
    }

    const genders = targetGenders(viewer.gender);
    if (genders.length === 0) {
      return { viewer, ranked: [] };
    }

    const ageBounds = dobBoundsForAgeWindow(prefs);
    if (!ageBounds) {
      return { viewer, ranked: [] };
    }

    const religions = cleanList(prefs.prefReligions);
    const maritalStatuses = cleanList(prefs.prefMaritalStatuses);

    // 2. Candidate pool: opposite gender, not self. Hard filters (age window,
    //    religion any-of, marital any-of) are pushed into SQL so we rank the
    //    best of the catalog instead of an arbitrary slice; the Node-side hard
    //    filter below stays as the exact boundary authority. Hidden / premium-
    //    gated profiles never enter the pool.
    const conditions: any[] = [
      ne(profiles.userId, userId),
      inArray(profiles.gender, genders as Array<'Male' | 'Female'>),
      lte(profiles.dob, ageBounds.dobUpper),
      gte(profiles.dob, ageBounds.dobLower),
      eq(profiles.requiredComplete, true),
      sql`EXISTS (
        SELECT 1 FROM profile_photos
        WHERE profile_photos.profile_id = profiles.id
          AND profile_photos.is_primary = true
      )`,
      lowerIn(profiles.religion, religions),
      lowerIn(profiles.maritalStatus, maritalStatuses),
      visibilitySql(viewer.viewerIsPaid),
    ];

    const pool = await this.db
      .select({
        id: profiles.id,
        userId: profiles.userId,
        fullName: profiles.fullName,
        gender: profiles.gender,
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
        aboutMe: profiles.aboutMe,
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
          b.score.points - a.score.points ||
          new Date(b.profile.createdAt).getTime() - new Date(a.profile.createdAt).getTime(),
      );

    return { viewer, ranked };
  }

  /** Fetch photos, settings, plans, connections + verification for a set of scored rows. */
  private async enrichMatches(ranked: ScoredRow[], viewer: ViewerContext, userId: string) {
    const scoredProfiles = ranked.map((r) => r.profile);
    if (scoredProfiles.length === 0) return [];

    const profileIds = scoredProfiles.map((p) => p.id);
    const userIds = scoredProfiles.map((p) => p.userId);

    const photos = await getApprovedPrimaryPhotos(this.db, profileIds);

    const settings = await this.db
      .select({ userId: userSettings.userId, photoBlur: userSettings.photoBlur })
      .from(userSettings)
      .where(inArray(userSettings.userId, userIds));

    const activeSubs = await this.db
      .select({ userId: subscriptions.userId, planSlug: plans.slug, planName: plans.name })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          inArray(subscriptions.userId, userIds),
          eq(subscriptions.status, 'active'),
          gt(subscriptions.expiresAt, new Date()),
        ),
      );

    const connections = await this.db
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

    return ranked.map(({ profile: p, score }) => {
      const primaryPhoto = photos.get(p.id);
      const setting = settings.find((s) => s.userId === p.userId);
      const userSub = activeSubs.find((s) => s.userId === p.userId);
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

      return {
        id: p.id,
        fullName: p.fullName,
        gender: p.gender,
        age: candidateAge(p.dob) ?? 0,
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
        companyName: p.companyName,
        annualIncome: p.annualIncome,
        // Key is withheld when blurred — the bucket is public, so sending it
        // would let anyone view the photo regardless of the blur flag.
        photos: withholdKey || !primaryPhoto ? [] : [primaryPhoto.s3Key],
        photoVerified: isVerified,
        isPremium: false,
        isVerified,
        blurPhoto,
        // Display-ready fields — same shape as GET /search so MatchListCard
        // renders identically in both Discover panels.
        planSlug: userSub?.planSlug ?? 'free',
        planName: userSub?.planName ?? 'Free',
        education: p.educationLevel || 'Not specified',
        occupation: p.profession || 'Not specified',
        company: p.companyName || 'Not specified',
        income: p.annualIncome || 'Not specified',
        about: p.aboutMe || '',
        lastActive: 'Online now',
        community: p.caste || 'Unknown',
        height: p.heightCm ? `${p.heightCm} cm` : 'Unknown',
        matchReasons: score?.reasons ?? [],
      };
    });
  }
}
