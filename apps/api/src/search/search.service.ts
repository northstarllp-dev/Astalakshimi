import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, profilePhotos, userSettings, interests, subscriptions, plans, verifications } from '@astalakshimi/database';
import { eq, and, ne, inArray, gte, lte, or, desc, sql, isNotNull, gt } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';
import { loadViewerContext } from '../matches/viewer-context';
import { scoreCandidate } from '../matches/match-scoring';
import { EntitlementsService } from '../entitlements/entitlements.service';

// Hard cap for the score-ranked default tab: we fetch + score the whole
// filtered candidate set in Node (bounded), rank, then paginate in memory.
const SCORE_POOL_CAP = 2000;

@Injectable()
export class SearchService {
  // Short-lived per-user search cache. Absorbs double-tap / refresh / bot loads
  // without burning DB round trips on a fan-out of 5 sequential queries.
  // Single-instance only; staleness is fine here.
  private cache = new Map<string, { ts: number; value: unknown }>();
  private readonly cacheTtlMs = 15_000;

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  private cacheKey(userId: string, filters: any): string {
    // Stable stringify (sorted keys) so equivalent filters share a key.
    const ordered: Record<string, unknown> = {};
    for (const k of Object.keys(filters).sort()) ordered[k] = filters[k];
    return `${userId}:${JSON.stringify(ordered)}`;
  }

  async searchProfiles(userId: string, filters: any) {
    // Cache check
    const key = this.cacheKey(userId, filters);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.cacheTtlMs) {
      return cached.value as ReturnType<typeof this.executeSearch>;
    }

    const result = await this.executeSearch(userId, filters);

    // Evict oldest when the cache grows too large (simple LRU-by-insertion)
    if (this.cache.size > 200) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) this.cache.delete(firstKey);
    }
    this.cache.set(key, { ts: Date.now(), value: result });
    return result;
  }

  private async executeSearch(userId: string, filters: any): Promise<{
    profiles: Array<Record<string, unknown>>;
    totalCount: number;
  }> {
    // Viewer profile + partner preferences — powers gender targeting,
    // connection lookups, and compatibility scoring in one load.
    const viewer = await loadViewerContext(this.db, userId);
    const currentUser = viewer ? { id: viewer.profileId, gender: viewer.gender } : undefined;

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
    
    // advanced filters (paid entitlement). The Discover client always sends
    // its advanced object, even when every filter is empty — only enforce the
    // entitlement (and apply filters) when something is actually set.
    if (filters.advanced) {
      // Only swallow JSON.parse failures. Validation throws (BadRequestException)
      // must propagate so the client gets a real 400 instead of a silent pass.
      let adv: any;
      try {
        adv =
          typeof filters.advanced === 'string' ? JSON.parse(filters.advanced) : filters.advanced;
      } catch {
        throw new BadRequestException('Invalid "advanced" payload (must be JSON)');
      }

      const hasAnyAdvancedFilter =
        adv &&
        Object.values(adv).some(
          (v) => (Array.isArray(v) && v.length > 0) || (!Array.isArray(v) && v != null && v !== ''),
        );

      if (hasAnyAdvancedFilter) {
        const hasAdvanced = await this.entitlementsService.checkEntitlement(userId, 'advanced_filters');
        if (!hasAdvanced) {
          throw new ForbiddenException('Advanced filters require a paid plan. Please upgrade your plan.');
        }
      }

      if (adv.heights && adv.heights.length > 0) {
        // Reject the request when any height is unparseable — silently rewriting
        // input to 165cm returned wrong matches without telling the caller.
        const heights = adv.heights.map((h: string) => {
          const n = parseInt(h, 10);
          if (!Number.isFinite(n) || n < 100 || n > 250) {
            throw new BadRequestException(`Invalid height value: ${h}`);
          }
          return n;
        });
        conditions.push(inArray(profiles.heightCm, heights));
      }
      if (adv.educations && adv.educations.length > 0) conditions.push(inArray(profiles.educationLevel, adv.educations));
      if (adv.incomes && adv.incomes.length > 0) conditions.push(inArray(profiles.annualIncome, adv.incomes));
      if (adv.occupations && adv.occupations.length > 0) conditions.push(inArray(profiles.profession, adv.occupations));
    }

    // pagination
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const offset = (page - 1) * limit;

    const isScoreRanked = filters.tab !== 'new';

    const selectFields = {
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
    };

    let result: Array<any>;
    let totalCount: number;

    if (isScoreRanked) {
      // Default tab: rank the whole (bounded) filtered set by compatibility,
      // then paginate in memory. Newest first breaks score ties.
      const candidates = await this.db
        .select(selectFields)
        .from(profiles)
        .where(and(...conditions))
        .orderBy(desc(profiles.createdAt))
        .limit(SCORE_POOL_CAP);

      const scored = candidates.map((p) => ({
        p,
        score: viewer ? scoreCandidate(p as any, viewer.prefs) : null,
      }));
      scored.sort(
        (a, b) =>
          (b.score?.percent ?? 0) - (a.score?.percent ?? 0) ||
          new Date(b.p.createdAt).getTime() - new Date(a.p.createdAt).getTime(),
      );
      totalCount = scored.length;
      result = scored.slice(offset, offset + limit).map((s) => ({ ...s.p, score: s.score }));
    } else {
      // "New" tab: SQL ordering + pagination as-is, score the returned page.
      let query: any = this.db
        .select(selectFields)
        .from(profiles)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset);

      query = query.orderBy(desc(profiles.createdAt));

      const countQuery = this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(profiles)
        .where(and(...conditions));

      const [rows, countResult] = await Promise.all([query, countQuery]);
      totalCount = countResult[0]?.count ?? 0;
      result = rows.map((p: any) => ({
        ...p,
        score: viewer ? scoreCandidate(p as any, viewer.prefs) : null,
      }));
    }

    const profileIds = result.map((p) => p.id);
    const userIds = result.map((p) => p.userId);
    
    let photos: Map<string, { s3Key: string; id: string }> = new Map();
    let settings: any[] = [];
    let connections: any[] = [];
    let activeSubs: any[] = [];
    let verificationRows: any[] = [];

    if (profileIds.length > 0) {
      // Run all five lookups concurrently — they are independent and the
      // sequential await chain was the dominant cost on the hot path.
      const photosPromise = getApprovedPrimaryPhotos(this.db, profileIds);
      const settingsPromise = this.db
        .select({
          userId: userSettings.userId,
          photoBlur: userSettings.photoBlur,
        })
        .from(userSettings)
        .where(inArray(userSettings.userId, userIds));
      const subsPromise = this.db
        .select({
          userId: subscriptions.userId,
          planSlug: plans.slug,
          planName: plans.name,
        })
        .from(subscriptions)
        .innerJoin(plans, eq(subscriptions.planId, plans.id))
        .where(
          and(
            inArray(subscriptions.userId, userIds),
            eq(subscriptions.status, 'active'),
            gt(subscriptions.expiresAt, new Date()),
          ),
        );
      const connectionsPromise = currentUser
        ? this.db
            .select({
              senderProfileId: interests.senderProfileId,
              receiverProfileId: interests.receiverProfileId,
            })
            .from(interests)
            .where(
              and(
                eq(interests.status, 'accepted'),
                // (viewer is sender OR viewer is receiver) AND (other party is in result set)
                or(
                  and(
                    eq(interests.senderProfileId, currentUser.id),
                    inArray(interests.receiverProfileId, profileIds),
                  ),
                  and(
                    eq(interests.receiverProfileId, currentUser.id),
                    inArray(interests.senderProfileId, profileIds),
                  ),
                ),
              ),
            )
        : Promise.resolve([] as Array<{ senderProfileId: string; receiverProfileId: string }>);
      const verificationPromise = this.db
        .select({ profileId: verifications.profileId, status: verifications.status })
        .from(verifications)
        .where(inArray(verifications.profileId, profileIds));

      try {
        const [photosRes, settingsRes, subsRes, connectionsRes, verificationRes] =
          await Promise.all([
            photosPromise,
            settingsPromise,
            subsPromise,
            connectionsPromise.catch(() => []),
            verificationPromise,
          ]);
        photos = photosRes;
        settings = settingsRes;
        activeSubs = subsRes;
        connections = connectionsRes;
        verificationRows = verificationRes;
      } catch (err) {
        // subscriptions table may be empty in some setups; keep going with what we have
        photos = await photosPromise.catch(() => new Map());
        settings = await settingsPromise.catch(() => []);
        activeSubs = [];
        connections = [];
        verificationRows = await verificationPromise.catch(() => []);
      }
    }

    const verificationByProfile = new Map(
      verificationRows.map((v: any) => [v.profileId, v.status]),
    );

    const mappedResult = result.map(({ score, ...profile }: any) => {
      const primaryPhoto = photos.get(profile.id);
      const setting = settings.find((s) => s.userId === profile.userId);
      const userSub = activeSubs.find((s) => s.userId === profile.userId);
      const isAccepted = connections.some(
        (c) => c.senderProfileId === profile.id || c.receiverProfileId === profile.id
      );

      const { blurPhoto, withholdKey } = computeBlurDecision({
        photoBlur: setting?.photoBlur,
        isAccepted,
        viewerUserId: userId,
        ownerUserId: profile.userId,
      });

      const verificationStatus = verificationByProfile.get(profile.id) ?? 'idle';
      const isVerified = verificationStatus === 'verified';

      return {
        ...profile,
        // map for frontend component compatibility
        age: profile.dob ? new Date().getFullYear() - new Date(profile.dob).getFullYear() : 25,
        // Key is withheld when blurred — the bucket is public, so sending it
        // would let anyone view the photo regardless of the blur flag.
        photos: withholdKey || !primaryPhoto ? [] : [primaryPhoto.s3Key],
        blurPhoto,
        photoVerified: isVerified,
        isVerified,
        planSlug: userSub?.planSlug || 'free',
        planName: userSub?.planName || 'Free',
        education: profile.educationLevel || 'Not specified',
        occupation: profile.profession || 'Not specified',
        company: profile.companyName || 'Not specified',
        income: profile.annualIncome || 'Not specified',
        motherTongue: profile.motherTongue || 'Not specified',
        about: profile.aboutMe || '',
        lastActive: 'Online now',
        community: profile.caste || 'Unknown',
        height: profile.heightCm ? `${profile.heightCm} cm` : 'Unknown',
        matchPercent: score?.percent ?? null,
        matchReasons: score?.reasons ?? [],
      };
    });

    return {
      profiles: mappedResult,
      totalCount: totalCount,
    };
  }
}
