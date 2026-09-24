import { Injectable, Inject, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, profilePhotos, userSettings, interests, subscriptions, plans, verifications, lifestyleInterests, horoscopes } from '@astalakshimi/database';
import { eq, and, ne, inArray, gte, lte, or, desc, sql, gt, lt, between } from 'drizzle-orm';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';
import { dobBoundsForAgeWindow, loadViewerContext, visibilitySql } from '../matches/viewer-context';
import { candidateAge, targetGenders } from '../matches/match-scoring';
import { EntitlementsService } from '../entitlements/entitlements.service';

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

    const genders = targetGenders(viewer?.gender);
    if (genders.length === 0) {
      return { profiles: [], totalCount: 0 };
    }

    const conditions: any[] = [
      ne(profiles.userId, userId),
      inArray(profiles.gender, genders as Array<'Male' | 'Female'>),
    ];

    const ageMin =
      filters.ageMin != null && filters.ageMin !== ''
        ? parseInt(String(filters.ageMin), 10)
        : null;
    const ageMax =
      filters.ageMax != null && filters.ageMax !== ''
        ? parseInt(String(filters.ageMax), 10)
        : null;
    if (ageMin != null && Number.isFinite(ageMin)) {
      const bounds = dobBoundsForAgeWindow({ prefAgeMin: ageMin, prefAgeMax: ageMin });
      if (bounds) conditions.push(lte(profiles.dob, bounds.dobUpper));
    }
    if (ageMax != null && Number.isFinite(ageMax)) {
      const bounds = dobBoundsForAgeWindow({ prefAgeMin: ageMax, prefAgeMax: ageMax });
      if (bounds) conditions.push(gte(profiles.dob, bounds.dobLower));
    }
    if (filters.city) {
      conditions.push(eq(profiles.city, filters.city));
    }
    if (filters.community) {
      conditions.push(eq(profiles.caste, filters.community));
    }
    // Must have at least a primary photo AND Layer-B required fields filled
    // (denormalized as profiles.required_complete) to appear in Discover.
    conditions.push(sql`EXISTS (SELECT 1 FROM profile_photos WHERE profile_photos.profile_id = profiles.id AND profile_photos.is_primary = true)`);
    conditions.push(eq(profiles.requiredComplete, true));
    conditions.push(visibilitySql(Boolean(viewer?.viewerIsPaid)));

    const tab = String(filters.tab || 'all');
    if (tab === 'nearby' && viewer?.city) {
      const nearby = [eq(profiles.city, viewer.city)];
      if (viewer.state) nearby.push(eq(profiles.state, viewer.state));
      conditions.push(or(...nearby));
    }
    if (tab === 'verified') {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM verifications
        WHERE verifications.profile_id = profiles.id
          AND verifications.status = 'verified'
      )`);
    }
    if (tab === 'premium') {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM subscriptions
        INNER JOIN plans ON plans.id = subscriptions.plan_id
        WHERE subscriptions.user_id = profiles.user_id
          AND subscriptions.status = 'active'
          AND subscriptions.expires_at > NOW()
          AND plans.slug <> 'free'
      )`);
    }
    if (tab === 'active') {
      // Profiles touched in the last 30 days (updated_at). Falls back to created_at.
      conditions.push(sql`COALESCE(profiles.updated_at, profiles.created_at) > NOW() - INTERVAL '30 days'`);
    }
    
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
        const heightConditions = adv.heights.map((h: string) => {
          if (h === "0-164" || h.startsWith("Up to 5'4") || h.startsWith("Up to 164")) return lt(profiles.heightCm, 165);
          if (h === "165-173" || h.startsWith("5'5") || h.startsWith("165 cm")) return between(profiles.heightCm, 165, 173);
          if (h === "174-300" || h.startsWith("5'9") || h.startsWith("174 cm")) return gt(profiles.heightCm, 173);
          const n = parseInt(h, 10);
          if (Number.isFinite(n) && !h.includes("-")) return eq(profiles.heightCm, n);
          return null;
        }).filter(Boolean);
        if (heightConditions.length > 0) {
          conditions.push(or(...heightConditions));
        }
      }
      if (adv.educations && adv.educations.length > 0) conditions.push(inArray(profiles.educationLevel, adv.educations));
      if (adv.incomes && adv.incomes.length > 0) conditions.push(inArray(profiles.annualIncome, adv.incomes));
      if (adv.occupations && adv.occupations.length > 0) conditions.push(inArray(profiles.profession, adv.occupations));
      
      if (adv.diets && adv.diets.length > 0) {
        conditions.push(inArray(profiles.id, this.db.select({ id: lifestyleInterests.profileId }).from(lifestyleInterests).where(inArray(lifestyleInterests.diet, adv.diets))));
      }

      if (adv.smoking && adv.smoking.length > 0) {
        const mapped = adv.smoking.flatMap((s: string) => {
          if (s === 'No') return ['Never'];
          if (s === 'Occasionally') return ['Occasionally'];
          if (s === 'Yes') return ['Regularly', 'Planning to quit'];
          return [];
        });
        if (mapped.length > 0) {
          conditions.push(inArray(profiles.id, this.db.select({ id: lifestyleInterests.profileId }).from(lifestyleInterests).where(inArray(lifestyleInterests.smoking, mapped))));
        }
      }

      if (adv.drinking && adv.drinking.length > 0) {
        const mapped = adv.drinking.flatMap((s: string) => {
          if (s === 'No') return ['Never'];
          if (s === 'Occasionally') return ['Occasionally'];
          if (s === 'Yes') return ['Regularly', 'Planning to quit'];
          return [];
        });
        if (mapped.length > 0) {
          conditions.push(inArray(profiles.id, this.db.select({ id: lifestyleInterests.profileId }).from(lifestyleInterests).where(inArray(lifestyleInterests.alcohol, mapped))));
        }
      }

      if (adv.manglik && adv.manglik.length > 0) {
        const mapped = adv.manglik.map((m: string) => m === "Don't know" ? "Don't Know" : m);
        conditions.push(inArray(profiles.id, this.db.select({ id: horoscopes.profileId }).from(horoscopes).where(inArray(horoscopes.manglik, mapped))));
      }

      if (adv.stars && adv.stars.length > 0) {
        conditions.push(inArray(profiles.id, this.db.select({ id: horoscopes.profileId }).from(horoscopes).where(inArray(horoscopes.nakshatra, adv.stars))));
      }

      if (adv.relocate) {
        conditions.push(eq(profiles.willingToRelocate, adv.relocate === 'yes' ? 'Yes' : 'No'));
      }
    }

    // pagination
    const page = parseInt(filters.page || '1', 10);
    const limit = parseInt(filters.limit || '10', 10);
    const offset = (page - 1) * limit;

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

    const query: any = this.db
      .select(selectFields)
      .from(profiles)
      .where(and(...conditions))
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(profiles)
      .where(and(...conditions));

    const [rows, countResult] = await Promise.all([query, countQuery]);
    totalCount = countResult[0]?.count ?? 0;
    result = rows;

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

    const mappedResult = result.map((profile: any) => {
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
        age: candidateAge(profile.dob) ?? 0,
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
      };
    });

    return {
      profiles: mappedResult,
      totalCount: totalCount,
    };
  }
}
