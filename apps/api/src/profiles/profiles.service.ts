import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { BlocksService } from '../blocks/blocks.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import {
  profiles,
  users,
  familyDetails,
  lifestyleInterests,
  horoscopes,
  partnerPreferences,
  profilePhotos,
  verifications,
  userSettings,
  interests,
  plans,
  subscriptions,
} from '@astalakshimi/database';
import { eq, asc, and, or, inArray, sql } from 'drizzle-orm';
import type { CompleteRegistrationPayload, FullProfileView } from '@astalakshimi/types';
import { resolveChildrenFields, maritalAsksChildren, PROFILE_FOR_VALUES, MARITAL_STATUS_VALUES } from '@astalakshimi/validation';
import {
  findCityBySlug,
  findCityByNameState,
  findCommunityBySlug,
  findCommunityByLabel,
  isValidReligion,
  findReligionByLabel,
  isValidMotherTongue,
  findMotherTongueByLabel,
} from '@astalakshimi/reference';
import { getApprovedPhotos, getOwnerPhotos, computeBlurDecision, isOwnedPhotoKey, photoPrivacyToBlur, photoBlurToPrivacy } from '../common/photo-access';
import { LruCache } from '../common/cache/lru-cache';
import { loadViewerContext } from '../matches/viewer-context';
import { requiredFieldsComplete } from './required-fields-complete';
import { refreshRequiredComplete } from './refresh-required-complete';

@Injectable()
export class ProfilesService {
  // Short-lived cache for the assembled profile view. Keyed by profile id;
  // mutated when the profile is updated via the same service. Stale after a
  // restart, bounded by `maxEntries`. Single-instance only.
  private profileViewCache = new LruCache<string, FullProfileView>(500, 60_000);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly blocksService: BlocksService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

  /** Drizzle `.limit(1)` returns an array; API consumers expect a single row or null. */
  private firstRow<T>(rows: T[] | T | null | undefined): T | null {
    if (rows == null) return null;
    if (Array.isArray(rows)) return rows[0] ?? null;
    return rows;
  }

  /** Clear cached public profile base (photos, privacy fields, etc.). */
  invalidateProfileCache(profileId: string) {
    this.profileViewCache.delete(`base:${profileId}`);
    this.profileViewCache.delete(profileId);
  }

  async invalidateProfileCacheForUser(userId: string) {
    const [row] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (row?.id) this.invalidateProfileCache(row.id);
  }

  /** Treat blank strings as missing so Postgres enums/varchars never get "". */
  private emptyToUndef(value?: string | null): string | undefined {
    if (value == null) return undefined;
    const trimmed = String(value).trim();
    return trimmed === '' ? undefined : trimmed;
  }

  private emptyToNull(value?: string | null): string | null {
    return this.emptyToUndef(value) ?? null;
  }

  /** Resolve city/caste/religion/tongue against the shared reference catalog. */
  private resolveCatalogFields(input: {
    city?: string;
    state?: string;
    country?: string;
    citySlug?: string | null;
    religion?: string;
    caste?: string;
    communitySlug?: string | null;
    motherTongue?: string;
    requireLocation?: boolean;
    requireCommunity?: boolean;
  }) {
    const out: {
      city?: string;
      state?: string;
      country?: string;
      citySlug?: string | null;
      religion?: string;
      caste?: string;
      communitySlug?: string | null;
      motherTongue?: string;
    } = {};

    if (input.citySlug || input.city) {
      const bySlug = input.citySlug ? findCityBySlug(input.citySlug) : undefined;
      const byName =
        bySlug ||
        (input.city
          ? findCityByNameState(input.city, input.state) || findCityByNameState(input.city)
          : undefined);
      if (!byName) {
        throw new BadRequestException('City must be selected from the catalog');
      }
      out.city = byName.label;
      out.state = byName.state;
      out.country = byName.country;
      out.citySlug = byName.slug;
    } else if (input.requireLocation) {
      throw new BadRequestException('City is required');
    }

    if (input.religion !== undefined) {
      if (!isValidReligion(input.religion)) {
        throw new BadRequestException('Invalid religion');
      }
      out.religion = findReligionByLabel(input.religion)?.label || input.religion;
    }

    if (input.communitySlug || input.caste) {
      const bySlug = input.communitySlug ? findCommunityBySlug(input.communitySlug) : undefined;
      const byLabel =
        bySlug ||
        (input.caste
          ? findCommunityByLabel(input.caste, out.religion || input.religion)
          : undefined);
      if (!byLabel) {
        throw new BadRequestException('Caste / community must be selected from the catalog');
      }
      if (out.religion && byLabel.religion !== 'Other' && byLabel.religion !== out.religion) {
        throw new BadRequestException('Caste does not match the selected religion');
      }
      out.caste = byLabel.label;
      out.communitySlug = byLabel.slug;
    } else if (input.requireCommunity) {
      throw new BadRequestException('Caste is required');
    }

    if (input.motherTongue !== undefined) {
      if (!isValidMotherTongue(input.motherTongue)) {
        throw new BadRequestException('Invalid mother tongue');
      }
      out.motherTongue =
        findMotherTongueByLabel(input.motherTongue)?.label || input.motherTongue;
    }

    return out;
  }

  private requireEnum<T extends string>(
    value: string | null | undefined,
    allowed: readonly T[],
    field: string,
    fallback?: T,
  ): T {
    const normalized = this.emptyToNull(value);
    if (normalized && (allowed as readonly string[]).includes(normalized)) {
      return normalized as T;
    }
    if (fallback) return fallback;
    throw new BadRequestException(`Invalid or missing ${field}`);
  }

  private optionalEnum<T extends string>(
    value: string | null | undefined,
    allowed: readonly T[],
  ): T | null {
    const normalized = this.emptyToNull(value);
    if (!normalized) return null;
    if ((allowed as readonly string[]).includes(normalized)) return normalized as T;
    throw new BadRequestException(`Invalid value for enum field: ${normalized}`);
  }

  private sanitizeRegistrationPayload(payload: CompleteRegistrationPayload): CompleteRegistrationPayload {
    const gender = this.requireEnum(payload.gender, ['Male', 'Female', 'Other'] as const, 'gender');
    const maritalStatus = this.requireEnum(
      payload.maritalStatus,
      MARITAL_STATUS_VALUES,
      'maritalStatus',
    );
    const familyValues =
      this.optionalEnum(
        payload.familyValues,
        ['Traditional', 'Moderate', 'Liberal'] as const,
      ) ?? undefined;
    const familyType =
      this.optionalEnum(
        payload.familyType,
        ['Nuclear', 'Joint', 'Extended'] as const,
      ) ?? undefined;
    const fatherOccupation =
      this.optionalEnum(
        payload.fatherOccupation,
        ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
      ) ?? undefined;
    const motherOccupation =
      this.optionalEnum(
        payload.motherOccupation,
        ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
      ) ?? undefined;
    // Diet is required at registration; smoking/alcohol are not collected here
    // and default to NULL (nullable columns) — no fabricated 'Never' default.
    const diet = this.requireEnum(
      payload.diet,
      ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan'] as const,
      'diet',
    );
    const smoking = this.optionalEnum(
      payload.smoking,
      ['Never', 'Occasionally', 'Regularly', 'Planning to quit'] as const,
    );
    const alcohol = this.optionalEnum(
      payload.alcohol,
      ['Never', 'Occasionally', 'Regularly', 'Planning to quit'] as const,
    );
    const manglik = this.requireEnum(
      payload.manglik,
      ['Yes', 'No', "Don't Know", 'Both'] as const,
      'manglik',
      "Don't Know",
    );
    const photoPrivacy = this.requireEnum(
      payload.photoPrivacy,
      ['blurred', 'accepted', 'visible'] as const,
      'photoPrivacy',
      'blurred',
    );
    const verificationMethod = this.requireEnum(
      payload.verificationMethod,
      ['selfie', 'govt_id'] as const,
      'verificationMethod',
      'selfie',
    );

    return {
      ...payload,
      profileFor: this.requireEnum(
        payload.profileFor,
        PROFILE_FOR_VALUES,
        'profileFor',
      ),
      fullName: this.emptyToUndef(payload.fullName) || payload.fullName,
      gender,
      maritalStatus,
      aboutMe: this.emptyToUndef(payload.aboutMe),
      city: this.emptyToUndef(payload.city) || payload.city,
      state: this.emptyToUndef(payload.state) || payload.state,
      country: this.emptyToUndef(payload.country) || 'India',
      citySlug: this.emptyToUndef(payload.citySlug as string | undefined),
      willingToRelocate: this.emptyToUndef(payload.willingToRelocate),
      religion: this.emptyToUndef(payload.religion) || payload.religion,
      caste: this.emptyToUndef(payload.caste) || payload.caste,
      communitySlug: this.emptyToUndef(payload.communitySlug as string | undefined),
      subcaste: this.emptyToUndef(payload.subcaste),
      gotra: this.emptyToUndef(payload.gotra),
      motherTongue: this.emptyToUndef(payload.motherTongue) || payload.motherTongue,
      educationLevel: this.optionalEnum(
        payload.educationLevel,
        ['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School'] as const,
      ) ?? undefined,
      degree: this.emptyToUndef(payload.degree),
      collegeName: this.emptyToUndef(payload.collegeName),
      employmentStatus: this.optionalEnum(
        payload.employmentStatus,
        ['Employed', 'Business Owner', 'Freelancer', 'Not Working'] as const,
      ) ?? undefined,
      profession: this.emptyToUndef(payload.profession),
      companyName: this.emptyToUndef(payload.companyName),
      companySector: this.normalizeCompanySector(payload.companySector) ?? undefined,
      annualIncome: this.emptyToUndef(payload.annualIncome),
      familyValues,
      familyType,
      familyStatus: this.emptyToUndef(payload.familyStatus as string | undefined) ?? undefined,
      fatherOccupation,
      motherOccupation,
      diet,
      smoking,
      alcohol,
      interests: payload.interests ?? [],
      birthTime: this.emptyToUndef(payload.birthTime),
      birthPlace: this.emptyToUndef(payload.birthPlace),
      manglik,
      rashi: this.emptyToUndef(payload.rashi),
      nakshatra: this.emptyToUndef(payload.nakshatra),
      // Preferences come from the signup wizard (step 5). Only the optional
      // fields get a fallback here — prefReligions / prefAgeMin / prefAgeMax are
      // required by completeRegistrationSchema, so fabricating them would hide
      // the real matching criteria behind invented defaults.
      prefReligions: payload.prefReligions ?? [],
      prefCastes: payload.prefCastes ?? [],
      prefMotherTongues: payload.prefMotherTongues ?? [],
      prefMaritalStatuses: payload.prefMaritalStatuses ?? [],
      prefAcceptableIncomes: payload.prefAcceptableIncomes ?? [],
      prefLocations: payload.prefLocations ?? [],
      prefMinEducation: this.emptyToUndef(payload.prefMinEducation),
      photoS3Keys: payload.photoS3Keys ?? [],
      photoPrivacy,
      verificationMethod,
      selfieS3Key: this.emptyToUndef(payload.selfieS3Key),
      govtIdType: this.optionalEnum(
        payload.govtIdType,
        ['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID'] as const,
      ) ?? undefined,
      govtIdS3Key: this.emptyToUndef(payload.govtIdS3Key),
      horoscopeS3Key: this.emptyToUndef(payload.horoscopeS3Key),
      horoscopeFileName: this.emptyToUndef(payload.horoscopeFileName),
    };
  }

  private mapCompanySector(sector?: string | null) {
    if (!sector?.trim()) return undefined;
    const value = sector.trim().toLowerCase();
    if (value.includes('government') || value.includes('defense')) return 'Govt';
    if (value.includes('startup')) return 'Startup';
    if (value === 'business') return 'Business';
    return 'Private';
  }

  /** Empty string is invalid for Postgres enums — coerce to null. */
  private normalizeCompanySector(
    sector?: string | null,
  ): 'Private' | 'Govt' | 'MNC' | 'Startup' | 'Business' | null {
    if (sector == null || !String(sector).trim()) return null;
    const trimmed = String(sector).trim();
    const allowed = ['Private', 'Govt', 'MNC', 'Startup', 'Business'] as const;
    if ((allowed as readonly string[]).includes(trimmed)) {
      return trimmed as (typeof allowed)[number];
    }
    return this.mapCompanySector(trimmed) ?? null;
  }

  /**
   * Education & career are now flat columns (enum + free text). No FK
   * enrichment is needed — the stored `educationLevel`/`degree`/`profession`
   * /`companyName`/`companySector`/`annualIncome` values are already human-readable.
   */
  private async enrichProfileDetails<T extends Record<string, unknown>>(profile: T) {
    return profile;
  }

  private async getMutualConnectState(
    viewerUserId: string | undefined,
    targetProfile: { id: string; userId: string },
  ): Promise<{ isMutualConnect: boolean; contactPhone: string | null }> {
    if (!viewerUserId || viewerUserId === targetProfile.userId) {
      return { isMutualConnect: true, contactPhone: null };
    }

    const [viewerProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, viewerUserId))
      .limit(1);

    if (!viewerProfile) {
      return { isMutualConnect: false, contactPhone: null };
    }

    const connections = await this.db
      .select({ id: interests.id })
      .from(interests)
      .where(
        and(
          or(
            eq(interests.senderProfileId, viewerProfile.id),
            eq(interests.receiverProfileId, viewerProfile.id),
          ),
          or(
            eq(interests.senderProfileId, targetProfile.id),
            eq(interests.receiverProfileId, targetProfile.id),
          ),
          eq(interests.status, 'accepted'),
        ),
      )
      .limit(1);

    if (connections.length === 0) {
      return { isMutualConnect: false, contactPhone: null };
    }

    const [owner] = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, targetProfile.userId))
      .limit(1);

    return {
      isMutualConnect: true,
      contactPhone: owner?.phone ?? null,
    };
  }

  /** Gender-aware minimum age for matrimony profiles (Male 21, others 18). */
  private assertDobAge(dobYear: string, dobMonth: string, dobDay: string, gender: string) {
    const year = parseInt(dobYear, 10);
    const month = parseInt(dobMonth, 10) - 1;
    const day = parseInt(dobDay, 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
      throw new BadRequestException('Invalid date of birth');
    }
    const today = new Date();
    let age = today.getFullYear() - year;
    const m = today.getMonth() - month;
    if (m < 0 || (m === 0 && today.getDate() < day)) age--;
    const minAge = gender === 'Male' ? 21 : 18;
    if (age < minAge) {
      throw new BadRequestException(`Must be at least ${minAge} years old (${gender})`);
    }
  }

  async completeRegistration(userId: string, payload: CompleteRegistrationPayload) {
    const data = this.sanitizeRegistrationPayload(payload);
    const catalog = this.resolveCatalogFields({
      city: data.city,
      state: data.state,
      citySlug: data.citySlug,
      religion: data.religion,
      caste: data.caste,
      communitySlug: data.communitySlug,
      motherTongue: data.motherTongue,
      requireLocation: true,
      requireCommunity: true,
    });
    data.city = catalog.city!;
    data.state = catalog.state!;
    data.country = catalog.country || data.country || 'India';
    data.citySlug = catalog.citySlug;
    data.religion = catalog.religion!;
    data.caste = catalog.caste!;
    data.communitySlug = catalog.communitySlug;
    data.motherTongue = catalog.motherTongue!;

    this.assertDobAge(data.dobYear, data.dobMonth, data.dobDay, data.gender);

    const result = await this.db.transaction(async (tx) => {
      // 1. Format DOB as YYYY-MM-DD
      const month = data.dobMonth.padStart(2, '0');
      const day = data.dobDay.padStart(2, '0');
      const dobStr = `${data.dobYear}-${month}-${day}`;
      const children = resolveChildrenFields({
        maritalStatus: data.maritalStatus,
        hasChildren: data.hasChildren,
        childrenCount: data.childrenCount,
        childrenLivingWithMe: data.childrenLivingWithMe,
      });

      // 2. Check if profile already exists for user
      const [existingProfile] = await tx
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, userId))
        .limit(1);

      let profileId: string;

      if (existingProfile) {
        profileId = existingProfile.id;
        await tx
          .update(profiles)
          .set({
            profileFor: data.profileFor,
            fullName: data.fullName,
            gender: data.gender,
            dob: dobStr,
            maritalStatus: data.maritalStatus,
            hasChildren: children.hasChildren,
            childrenCount: children.childrenCount,
            childrenLivingWithMe: children.childrenLivingWithMe,
            heightCm: data.heightCm,
            aboutMe: data.aboutMe ?? null,
            weightKg: data.weightKg ?? null,
            complexion: data.complexion ?? null,
            disability: data.disability ?? null,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            citySlug: data.citySlug ?? null,
            willingToRelocate: data.willingToRelocate ?? null,
            religion: data.religion,
            caste: data.caste,
            communitySlug: data.communitySlug ?? null,
            subcaste: data.subcaste ?? null,
            gotra: data.gotra ?? null,
            motherTongue: data.motherTongue,
            educationLevel: data.educationLevel ?? null,
            degree: data.degree ?? null,
            collegeName: data.collegeName ?? null,
            employmentStatus: data.employmentStatus ?? null,
            profession: data.profession ?? null,
            companyName: data.companyName ?? null,
            companySector: this.normalizeCompanySector(data.companySector),
            annualIncome: data.annualIncome ?? null,
            photoPrivacy: data.photoPrivacy || 'blurred',
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, profileId));
      } else {
        const [newProfile] = await tx
          .insert(profiles)
          .values({
            userId,
            createdBy: 'self',
            profileFor: data.profileFor,
            fullName: data.fullName,
            gender: data.gender,
            dob: dobStr,
            maritalStatus: data.maritalStatus,
            hasChildren: children.hasChildren,
            childrenCount: children.childrenCount,
            childrenLivingWithMe: children.childrenLivingWithMe,
            heightCm: data.heightCm,
            aboutMe: data.aboutMe ?? null,
            weightKg: data.weightKg ?? null,
            complexion: data.complexion ?? null,
            disability: data.disability ?? null,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            citySlug: data.citySlug ?? null,
            willingToRelocate: data.willingToRelocate ?? null,
            religion: data.religion,
            caste: data.caste,
            communitySlug: data.communitySlug ?? null,
            subcaste: data.subcaste ?? null,
            gotra: data.gotra ?? null,
            motherTongue: data.motherTongue,
            educationLevel: data.educationLevel ?? null,
            degree: data.degree ?? null,
            collegeName: data.collegeName ?? null,
            employmentStatus: data.employmentStatus ?? null,
            profession: data.profession ?? null,
            companyName: data.companyName ?? null,
            companySector: this.normalizeCompanySector(data.companySector),
            annualIncome: data.annualIncome ?? null,
            photoPrivacy: data.photoPrivacy || 'blurred',
          })
          .returning();
        profileId = newProfile.id;
      }

      // 3. Upsert Family Details
      await tx
        .insert(familyDetails)
        .values({
          profileId,
          familyValues: data.familyValues ?? null,
          familyType: data.familyType ?? null,
          familyStatus: data.familyStatus ?? null,
          fatherOccupation: data.fatherOccupation ?? null,
          motherOccupation: data.motherOccupation ?? null,
          brothersCount: data.brothersCount ?? 0,
          sistersCount: data.sistersCount ?? 0,
        })
        .onConflictDoUpdate({
          target: familyDetails.profileId,
          set: {
            familyValues: data.familyValues ?? null,
            familyType: data.familyType ?? null,
            familyStatus: data.familyStatus ?? null,
            fatherOccupation: data.fatherOccupation ?? null,
            motherOccupation: data.motherOccupation ?? null,
            brothersCount: data.brothersCount ?? 0,
            sistersCount: data.sistersCount ?? 0,
            updatedAt: new Date(),
          },
        });

      // 4. Upsert Lifestyle & Interests — smoking/alcohol not collected at
      // registration → NULL; diet required; interests default to [].
      await tx
        .insert(lifestyleInterests)
        .values({
          profileId,
          diet: data.diet,
          smoking: data.smoking ?? null,
          alcohol: data.alcohol ?? null,
          interests: data.interests || [],
        })
        .onConflictDoUpdate({
          target: lifestyleInterests.profileId,
          set: {
            diet: data.diet,
            smoking: data.smoking ?? null,
            alcohol: data.alcohol ?? null,
            interests: data.interests || [],
            updatedAt: new Date(),
          },
        });

      // 5. Upsert Horoscope
      await tx
        .insert(horoscopes)
        .values({
          profileId,
          birthTime: data.birthTime ?? null,
          birthPlace: data.birthPlace ?? null,
          manglik: data.manglik || "Don't Know",
          rashi: data.rashi ?? null,
          nakshatra: data.nakshatra ?? null,
          horoscopeS3Key: data.horoscopeS3Key ?? null,
          horoscopeFileName: data.horoscopeFileName ?? null,
          horoscopeFileSizeBytes: data.horoscopeFileSizeBytes ?? null,
        })
        .onConflictDoUpdate({
          target: horoscopes.profileId,
          set: {
            birthTime: data.birthTime ?? null,
            birthPlace: data.birthPlace ?? null,
            manglik: data.manglik || "Don't Know",
            rashi: data.rashi ?? null,
            nakshatra: data.nakshatra ?? null,
            horoscopeS3Key: data.horoscopeS3Key ?? null,
            horoscopeFileName: data.horoscopeFileName ?? null,
            horoscopeFileSizeBytes: data.horoscopeFileSizeBytes ?? null,
            updatedAt: new Date(),
          },
        });

      // 6. Upsert Partner Preferences
      await tx
        .insert(partnerPreferences)
        .values({
          profileId,
          prefAgeMin: data.prefAgeMin,
          prefAgeMax: data.prefAgeMax,
          prefHeightMinCm: data.prefHeightMinCm,
          prefHeightMaxCm: data.prefHeightMaxCm,
          prefMaritalStatuses: data.prefMaritalStatuses || [],
          prefReligions: data.prefReligions || [],
          prefCastes: data.prefCastes || [],
          prefMotherTongues: data.prefMotherTongues || [],
          prefMinEducation: data.prefMinEducation ?? null,
          prefAcceptableIncomes: data.prefAcceptableIncomes || [],
          prefLocations: data.prefLocations || [],
        })
        .onConflictDoUpdate({
          target: partnerPreferences.profileId,
          set: {
            prefAgeMin: data.prefAgeMin,
            prefAgeMax: data.prefAgeMax,
            prefHeightMinCm: data.prefHeightMinCm,
            prefHeightMaxCm: data.prefHeightMaxCm,
            prefMaritalStatuses: data.prefMaritalStatuses || [],
            prefReligions: data.prefReligions || [],
            prefCastes: data.prefCastes || [],
            prefMotherTongues: data.prefMotherTongues || [],
            prefMinEducation: data.prefMinEducation ?? null,
            prefAcceptableIncomes: data.prefAcceptableIncomes || [],
            prefLocations: data.prefLocations || [],
            updatedAt: new Date(),
          },
        });

      // 7. Insert Photos — reject keys not minted for this user via presigned upload.
      if (data.photoS3Keys && data.photoS3Keys.length > 0) {
        const uniqueKeys = [...new Set(data.photoS3Keys)];
        const badPhoto = uniqueKeys.find((key) => !isOwnedPhotoKey(key, userId, 'profile_photo'));
        if (badPhoto) {
          throw new BadRequestException('photoS3Keys must be profile photos uploaded through your own presigned URL');
        }

        // Clear previous photos if updating
        await tx.delete(profilePhotos).where(eq(profilePhotos.profileId, profileId));

        const photoRecords = uniqueKeys.map((s3Key, index) => ({
          profileId,
          s3Key,
          contentHash: Array.isArray((data as any).photoContentHashes)
            ? ((data as any).photoContentHashes[index] as string | undefined) ?? null
            : null,
          isPrimary: index === 0,
          displayOrder: index,
          status: 'pending' as const,
        }));
        await tx.insert(profilePhotos).values(photoRecords);
      }

      // Ensure user_settings exists and photo_blur mirrors profiles.photo_privacy
      // (viewer blur is driven by user_settings.photo_blur, not profiles.photo_privacy).
      const initialBlur = photoPrivacyToBlur(data.photoPrivacy || 'blurred');
      await tx
        .insert(userSettings)
        .values({ userId, photoBlur: initialBlur })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { photoBlur: initialBlur, updatedAt: new Date() },
        });

      // 8. Upsert Verification
      const method = data.verificationMethod || 'selfie';
      const selfieS3Key = data.selfieS3Key ?? null;
      const govtIdType = data.govtIdType ?? null;
      const govtIdS3Key = data.govtIdS3Key ?? null;

      if (selfieS3Key && !isOwnedPhotoKey(selfieS3Key, userId, 'selfie')) {
        throw new BadRequestException('selfieS3Key must be a selfie uploaded through your own presigned URL');
      }

      if (govtIdS3Key && !isOwnedPhotoKey(govtIdS3Key, userId, 'govt_id')) {
        throw new BadRequestException('govtIdS3Key must be an ID uploaded through your own presigned URL');
      }

      if (!selfieS3Key || !govtIdS3Key || !govtIdType) {
        throw new BadRequestException(
          'Upload both a live selfie and a government ID before creating your profile',
        );
      }

      // Store verification docs as `idle` — not yet in the admin review queue.
      // Member must call submitVerification after required fields are complete.
      await tx
        .insert(verifications)
        .values({
          profileId,
          method,
          selfieS3Key,
          govtIdType,
          govtIdS3Key,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: verifications.profileId,
          set: {
            method,
            selfieS3Key,
            govtIdType,
            govtIdS3Key,
            status: 'pending',
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
            updatedAt: new Date(),
          },
        });

      // Launch offer: Give Silver plan if they don't have an active subscription
      const [activeSub] = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
        .limit(1);

      if (!activeSub) {
        const [silverPlan] = await tx
          .select()
          .from(plans)
          .where(eq(plans.slug, 'silver'))
          .limit(1);
        
        const launchOfferEnd = new Date('2026-12-17T23:59:59.999Z');
        const now = new Date();
        
        if (silverPlan && now < launchOfferEnd) {
          await tx.insert(subscriptions).values({
            userId,
            planId: silverPlan.id,
            status: 'active',
            startsAt: now,
            expiresAt: launchOfferEnd,
          });
        }
      }

      return {
        success: true,
        message: 'Profile registration completed successfully',
        profileId,
      };
    });

    // Outside the tx so sibling rows are visible; sets profiles.required_complete.
    await refreshRequiredComplete(this.db, result.profileId);
    return result;
  }

  /**
   * Promote verification from idle/rejected → pending for admin review.
   * Requires every required profile field to be filled (hard gate).
   */
  async submitVerification(userId: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [lifestyle] = await this.db
      .select()
      .from(lifestyleInterests)
      .where(eq(lifestyleInterests.profileId, profile.id))
      .limit(1);

    const [horoscope] = await this.db
      .select()
      .from(horoscopes)
      .where(eq(horoscopes.profileId, profile.id))
      .limit(1);

    const photoRows = await this.db
      .select({ id: profilePhotos.id })
      .from(profilePhotos)
      .where(eq(profilePhotos.profileId, profile.id));

    if (
      !requiredFieldsComplete({
        profile,
        lifestyle,
        horoscope,
        photoCount: photoRows.length,
      })
    ) {
      throw new BadRequestException('Complete your profile before submitting for verification');
    }

    const [existing] = await this.db
      .select()
      .from(verifications)
      .where(eq(verifications.profileId, profile.id))
      .limit(1);

    if (existing?.status === 'verified') {
      throw new ConflictException('Already verified');
    }

    if (existing?.status === 'pending') {
      return {
        success: true,
        message: 'Verification is already pending review',
        status: 'pending' as const,
      };
    }

    if (!existing?.selfieS3Key && !existing?.govtIdS3Key) {
      throw new BadRequestException(
        'Upload a selfie or government ID before submitting for verification',
      );
    }

    const [verification] = existing
      ? await this.db
          .update(verifications)
          .set({
            status: 'pending',
            rejectionReason: null,
            reviewedBy: null,
            reviewedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(verifications.profileId, profile.id))
          .returning()
      : await this.db
          .insert(verifications)
          .values({
            profileId: profile.id,
            method: 'selfie',
            status: 'pending',
          })
          .returning();

    this.invalidateProfileCache(profile.id);

    return {
      success: true,
      message: 'Profile submitted for verification (12-hour SLA)',
      status: verification.status,
    };
  }

  async updateMyProfile(
    userId: string,
    payload: Partial<CompleteRegistrationPayload>,
  ): Promise<FullProfileView> {
    const [profile] = await this.db
      .select({
        id: profiles.id,
        maritalStatus: profiles.maritalStatus,
        gender: profiles.gender,
        city: profiles.city,
        state: profiles.state,
        citySlug: profiles.citySlug,
        religion: profiles.religion,
        caste: profiles.caste,
        communitySlug: profiles.communitySlug,
        motherTongue: profiles.motherTongue,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    const profileId = profile.id;
    this.invalidateProfileCache(profileId);

    await this.db.transaction(async (tx) => {
      // Check if any fields belong to profiles
      const profilesUpdate: any = {};
      if (payload.profileFor !== undefined) {
        profilesUpdate.profileFor = this.requireEnum(
          payload.profileFor,
          PROFILE_FOR_VALUES,
          'profileFor',
        );
      }
      if (payload.fullName !== undefined) profilesUpdate.fullName = payload.fullName;
      if (payload.gender !== undefined) {
        profilesUpdate.gender = this.requireEnum(
          payload.gender,
          ['Male', 'Female', 'Other'] as const,
          'gender',
        );
      }
      if (payload.maritalStatus !== undefined) {
        profilesUpdate.maritalStatus = this.requireEnum(
          payload.maritalStatus,
          MARITAL_STATUS_VALUES,
          'maritalStatus',
        );
      }
      const childrenTouched =
        payload.maritalStatus !== undefined ||
        payload.hasChildren !== undefined ||
        payload.childrenCount !== undefined ||
        payload.childrenLivingWithMe !== undefined;
      if (childrenTouched) {
        const maritalForChildren =
          (profilesUpdate.maritalStatus as string | undefined) ?? profile.maritalStatus;
        // Zod cannot see stored maritalStatus on partial patches — enforce here.
        if (maritalAsksChildren(maritalForChildren) && payload.hasChildren === true) {
          if (payload.childrenCount == null || payload.childrenCount < 1) {
            throw new BadRequestException('Enter how many children');
          }
          if (payload.childrenLivingWithMe === undefined || payload.childrenLivingWithMe === null) {
            throw new BadRequestException('Please say if the children live with you');
          }
        }
        const children = resolveChildrenFields({
          maritalStatus: maritalForChildren,
          hasChildren: payload.hasChildren,
          childrenCount: payload.childrenCount,
          childrenLivingWithMe: payload.childrenLivingWithMe,
        });
        profilesUpdate.hasChildren = children.hasChildren;
        profilesUpdate.childrenCount = children.childrenCount;
        profilesUpdate.childrenLivingWithMe = children.childrenLivingWithMe;
      }
      if (payload.heightCm !== undefined) profilesUpdate.heightCm = payload.heightCm;
      if (payload.complexion !== undefined) profilesUpdate.complexion = this.emptyToNull(payload.complexion);
      if (payload.disability !== undefined) profilesUpdate.disability = this.emptyToNull(payload.disability);
      if (payload.willingToRelocate !== undefined) profilesUpdate.willingToRelocate = this.emptyToNull(payload.willingToRelocate);
      if (payload.aboutMe !== undefined) profilesUpdate.aboutMe = payload.aboutMe;
      if (payload.weightKg !== undefined) profilesUpdate.weightKg = payload.weightKg;
      // complexion/disability already null-coerced above via emptyToNull —
      // do NOT reassign raw payload values here (would store "" instead of null).
      if (payload.subcaste !== undefined) profilesUpdate.subcaste = this.emptyToNull(payload.subcaste);
      if (payload.gotra !== undefined) profilesUpdate.gotra = this.emptyToNull(payload.gotra);

      const locationTouched =
        payload.city !== undefined ||
        payload.state !== undefined ||
        payload.citySlug !== undefined;
      const communityTouched =
        payload.religion !== undefined ||
        payload.caste !== undefined ||
        payload.communitySlug !== undefined;
      const tongueTouched = payload.motherTongue !== undefined;

      if (locationTouched || communityTouched || tongueTouched) {
        const catalog = this.resolveCatalogFields({
          city: locationTouched ? (payload.city ?? profile.city) : undefined,
          state: locationTouched ? (payload.state ?? profile.state) : undefined,
          citySlug: locationTouched
            ? (payload.citySlug !== undefined ? payload.citySlug : profile.citySlug)
            : undefined,
          religion: communityTouched
            ? (payload.religion ?? profile.religion)
            : tongueTouched
              ? profile.religion
              : undefined,
          caste: communityTouched ? (payload.caste ?? profile.caste) : undefined,
          communitySlug: communityTouched
            ? (payload.communitySlug !== undefined
                ? payload.communitySlug
                : profile.communitySlug)
            : undefined,
          motherTongue: tongueTouched ? payload.motherTongue : undefined,
        });
        if (catalog.city !== undefined) profilesUpdate.city = catalog.city;
        if (catalog.state !== undefined) profilesUpdate.state = catalog.state;
        if (catalog.country !== undefined) profilesUpdate.country = catalog.country;
        if (catalog.citySlug !== undefined) profilesUpdate.citySlug = catalog.citySlug;
        if (catalog.religion !== undefined) profilesUpdate.religion = catalog.religion;
        if (catalog.caste !== undefined) profilesUpdate.caste = catalog.caste;
        if (catalog.communitySlug !== undefined) {
          profilesUpdate.communitySlug = catalog.communitySlug;
        }
        if (catalog.motherTongue !== undefined) profilesUpdate.motherTongue = catalog.motherTongue;
      }
      if (payload.educationLevel !== undefined) {
        profilesUpdate.educationLevel = this.optionalEnum(
          payload.educationLevel,
          ['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School'] as const,
        );
      }
      if (payload.degree !== undefined) {
        profilesUpdate.degree = this.emptyToNull(payload.degree);
      }
      if (payload.collegeName !== undefined) profilesUpdate.collegeName = this.emptyToNull(payload.collegeName);
      if (payload.employmentStatus !== undefined) {
        profilesUpdate.employmentStatus = this.optionalEnum(
          payload.employmentStatus,
          ['Employed', 'Business Owner', 'Freelancer', 'Not Working'] as const,
        );
      }
      if (payload.profession !== undefined) {
        profilesUpdate.profession = this.emptyToNull(payload.profession);
      }
      if (payload.companyName !== undefined) {
        profilesUpdate.companyName = this.emptyToNull(payload.companyName);
      }
      if (payload.companySector !== undefined) {
        profilesUpdate.companySector = this.normalizeCompanySector(payload.companySector);
      }
      if (payload.annualIncome !== undefined) {
        profilesUpdate.annualIncome = this.emptyToNull(payload.annualIncome);
      }
      if (payload.photoPrivacy !== undefined) {
        profilesUpdate.photoPrivacy = payload.photoPrivacy;
        // Keep viewer-facing blur setting in sync (settings UI + profile edit).
        await tx
          .insert(userSettings)
          .values({
            userId,
            photoBlur: photoPrivacyToBlur(payload.photoPrivacy as string),
          })
          .onConflictDoUpdate({
            target: userSettings.userId,
            set: {
              photoBlur: photoPrivacyToBlur(payload.photoPrivacy as string),
              updatedAt: new Date(),
            },
          });
      }
      // DOB: all three parts required together; re-check age against payload or stored gender.
      const dobTouched =
        payload.dobYear !== undefined ||
        payload.dobMonth !== undefined ||
        payload.dobDay !== undefined;
      if (dobTouched) {
        if (
          payload.dobYear === undefined ||
          payload.dobMonth === undefined ||
          payload.dobDay === undefined
        ) {
          throw new BadRequestException('Date of birth requires day, month, and year together');
        }
        const genderForAge = profilesUpdate.gender ?? profile.gender;
        this.assertDobAge(payload.dobYear, payload.dobMonth, payload.dobDay, genderForAge);
        profilesUpdate.dob = `${payload.dobYear}-${payload.dobMonth.padStart(2, '0')}-${payload.dobDay.padStart(2, '0')}`;
      }
      if (Object.keys(profilesUpdate).length > 0) {
        profilesUpdate.updatedAt = new Date();
        await tx.update(profiles).set(profilesUpdate).where(eq(profiles.id, profileId));
      }

      // Check if any fields belong to familyDetails
      const familyDetailsUpdate: any = {};
      if (payload.familyValues !== undefined) {
        familyDetailsUpdate.familyValues = this.optionalEnum(
          payload.familyValues,
          ['Traditional', 'Moderate', 'Liberal'] as const,
        );
      }
      if (payload.familyType !== undefined) {
        familyDetailsUpdate.familyType = this.optionalEnum(
          payload.familyType,
          ['Nuclear', 'Joint', 'Extended'] as const,
        );
      }
      if (payload.familyStatus !== undefined) {
        familyDetailsUpdate.familyStatus = this.emptyToNull(payload.familyStatus as string | null);
      }
      if (payload.fatherOccupation !== undefined) {
        familyDetailsUpdate.fatherOccupation = this.optionalEnum(
          payload.fatherOccupation,
          ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
        );
      }
      if (payload.motherOccupation !== undefined) {
        familyDetailsUpdate.motherOccupation = this.optionalEnum(
          payload.motherOccupation,
          ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
        );
      }
      if (payload.brothersCount !== undefined) familyDetailsUpdate.brothersCount = payload.brothersCount;
      if (payload.sistersCount !== undefined) familyDetailsUpdate.sistersCount = payload.sistersCount;
      if (Object.keys(familyDetailsUpdate).length > 0) {
        familyDetailsUpdate.updatedAt = new Date();
        await tx
          .insert(familyDetails)
          .values({
            profileId,
            familyValues: familyDetailsUpdate.familyValues ?? null,
            familyType: familyDetailsUpdate.familyType ?? null,
            familyStatus: familyDetailsUpdate.familyStatus ?? null,
            fatherOccupation: familyDetailsUpdate.fatherOccupation ?? null,
            motherOccupation: familyDetailsUpdate.motherOccupation ?? null,
            brothersCount: familyDetailsUpdate.brothersCount ?? 0,
            sistersCount: familyDetailsUpdate.sistersCount ?? 0,
          })
          .onConflictDoUpdate({
            target: familyDetails.profileId,
            set: familyDetailsUpdate,
          });
      }

      // Check if any fields belong to lifestyleInterests
      const lifestyleInterestsUpdate: any = {};
      if (payload.diet !== undefined) lifestyleInterestsUpdate.diet = payload.diet;
      if (payload.smoking !== undefined) lifestyleInterestsUpdate.smoking = payload.smoking;
      if (payload.alcohol !== undefined) lifestyleInterestsUpdate.alcohol = payload.alcohol;
      if (payload.interests !== undefined) lifestyleInterestsUpdate.interests = payload.interests;
      if (Object.keys(lifestyleInterestsUpdate).length > 0) {
        lifestyleInterestsUpdate.updatedAt = new Date();
        await tx
          .insert(lifestyleInterests)
          .values({
            profileId,
            diet: lifestyleInterestsUpdate.diet ?? null,
            smoking: lifestyleInterestsUpdate.smoking ?? null,
            alcohol: lifestyleInterestsUpdate.alcohol ?? null,
            interests: lifestyleInterestsUpdate.interests ?? [],
          })
          .onConflictDoUpdate({
            target: lifestyleInterests.profileId,
            set: lifestyleInterestsUpdate,
          });
      }

      // Check if any fields belong to horoscopes
      const horoscopesUpdate: any = {};
      if (payload.birthTime !== undefined) {
        horoscopesUpdate.birthTime = this.emptyToNull(payload.birthTime as string | null);
      }
      if (payload.birthPlace !== undefined) {
        horoscopesUpdate.birthPlace = this.emptyToNull(payload.birthPlace as string | null);
      }
      if (payload.manglik !== undefined) horoscopesUpdate.manglik = payload.manglik;
      if (payload.rashi !== undefined) {
        horoscopesUpdate.rashi = this.emptyToNull(payload.rashi as string | null);
      }
      if (payload.nakshatra !== undefined) {
        horoscopesUpdate.nakshatra = this.emptyToNull(payload.nakshatra as string | null);
      }
      if (payload.horoscopeS3Key !== undefined) {
        horoscopesUpdate.horoscopeS3Key = this.emptyToNull(payload.horoscopeS3Key as string | null);
      }
      if (payload.horoscopeFileName !== undefined) {
        horoscopesUpdate.horoscopeFileName = this.emptyToNull(
          payload.horoscopeFileName as string | null,
        );
      }
      if (payload.horoscopeFileSizeBytes !== undefined) {
        horoscopesUpdate.horoscopeFileSizeBytes =
          payload.horoscopeFileSizeBytes == null || payload.horoscopeFileSizeBytes === 0
            ? null
            : payload.horoscopeFileSizeBytes;
      }
      if (Object.keys(horoscopesUpdate).length > 0) {
        horoscopesUpdate.updatedAt = new Date();
        await tx
          .insert(horoscopes)
          .values({
            profileId,
            birthTime: horoscopesUpdate.birthTime ?? null,
            birthPlace: horoscopesUpdate.birthPlace ?? null,
            manglik: horoscopesUpdate.manglik ?? "Don't Know",
            rashi: horoscopesUpdate.rashi ?? null,
            nakshatra: horoscopesUpdate.nakshatra ?? null,
            horoscopeS3Key: horoscopesUpdate.horoscopeS3Key ?? null,
            horoscopeFileName: horoscopesUpdate.horoscopeFileName ?? null,
            horoscopeFileSizeBytes: horoscopesUpdate.horoscopeFileSizeBytes ?? null,
          })
          .onConflictDoUpdate({
            target: horoscopes.profileId,
            set: horoscopesUpdate,
          });
      }

      // Check if any fields belong to partnerPreferences
      const partnerPreferencesUpdate: any = {};
      if (payload.prefAgeMin !== undefined) partnerPreferencesUpdate.prefAgeMin = payload.prefAgeMin;
      if (payload.prefAgeMax !== undefined) partnerPreferencesUpdate.prefAgeMax = payload.prefAgeMax;
      if (payload.prefHeightMinCm !== undefined) partnerPreferencesUpdate.prefHeightMinCm = payload.prefHeightMinCm;
      if (payload.prefHeightMaxCm !== undefined) partnerPreferencesUpdate.prefHeightMaxCm = payload.prefHeightMaxCm;
      if (payload.prefMaritalStatuses !== undefined) partnerPreferencesUpdate.prefMaritalStatuses = payload.prefMaritalStatuses;
      if (payload.prefReligions !== undefined) partnerPreferencesUpdate.prefReligions = payload.prefReligions;
      if (payload.prefCastes !== undefined) partnerPreferencesUpdate.prefCastes = payload.prefCastes;
      if (payload.prefMotherTongues !== undefined) partnerPreferencesUpdate.prefMotherTongues = payload.prefMotherTongues;
      if (payload.prefMinEducation !== undefined) {
        partnerPreferencesUpdate.prefMinEducation = this.emptyToNull(
          payload.prefMinEducation as string | null,
        );
      }
      if (payload.prefAcceptableIncomes !== undefined) partnerPreferencesUpdate.prefAcceptableIncomes = payload.prefAcceptableIncomes;
      if (payload.prefLocations !== undefined) partnerPreferencesUpdate.prefLocations = payload.prefLocations;
      if (Object.keys(partnerPreferencesUpdate).length > 0) {
        partnerPreferencesUpdate.updatedAt = new Date();
        await tx
          .insert(partnerPreferences)
          .values({
            profileId,
            prefAgeMin: partnerPreferencesUpdate.prefAgeMin ?? null,
            prefAgeMax: partnerPreferencesUpdate.prefAgeMax ?? null,
            prefHeightMinCm: partnerPreferencesUpdate.prefHeightMinCm ?? null,
            prefHeightMaxCm: partnerPreferencesUpdate.prefHeightMaxCm ?? null,
            prefMaritalStatuses: partnerPreferencesUpdate.prefMaritalStatuses ?? [],
            prefReligions: partnerPreferencesUpdate.prefReligions ?? [],
            prefCastes: partnerPreferencesUpdate.prefCastes ?? [],
            prefMotherTongues: partnerPreferencesUpdate.prefMotherTongues ?? [],
            prefMinEducation: partnerPreferencesUpdate.prefMinEducation ?? null,
            prefAcceptableIncomes: partnerPreferencesUpdate.prefAcceptableIncomes ?? [],
            prefLocations: partnerPreferencesUpdate.prefLocations ?? [],
          })
          .onConflictDoUpdate({
            target: partnerPreferences.profileId,
            set: partnerPreferencesUpdate,
          });
      }

      return;
    });

    // Read after commit — calling getMyProfile inside the tx callback used a
    // separate pool connection that could not see uncommitted writes.
    await refreshRequiredComplete(this.db, profileId);
    return this.getMyProfile(userId);
  }

  async addPhoto(userId: string, s3Key: string, contentHash?: string) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    const profileId = profile.id;
    this.invalidateProfileCache(profileId);

    if (!isOwnedPhotoKey(s3Key, userId, 'profile_photo')) {
      throw new BadRequestException('s3Key must be a profile photo uploaded through your own presigned URL');
    }

    const existingPhotos = await this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId)).orderBy(asc(profilePhotos.displayOrder));
    if (existingPhotos.some((photo) => photo.s3Key === s3Key)) {
      throw new BadRequestException('This photo is already on your profile.');
    }
    if (contentHash && existingPhotos.some((photo) => photo.contentHash === contentHash)) {
      throw new BadRequestException('This photo is already on your profile.');
    }

    const isPrimary = existingPhotos.length === 0;
    const maxOrder = existingPhotos.length > 0 ? existingPhotos[existingPhotos.length - 1].displayOrder + 1 : 0;

    await this.db.insert(profilePhotos).values({
      profileId,
      s3Key,
      contentHash: contentHash ?? null,
      isPrimary,
      displayOrder: maxOrder,
      status: 'pending' as const,
    });

    await refreshRequiredComplete(this.db, profileId);
    return this.getMyProfile(userId);
  }

  async deletePhoto(userId: string, photoId: string) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    this.invalidateProfileCache(profile.id);
    
    const [photo] = await this.db.select().from(profilePhotos).where(eq(profilePhotos.id, photoId)).limit(1);
    if (!photo || photo.profileId !== profile.id) {
      throw new NotFoundException('Photo not found');
    }

    await this.db.delete(profilePhotos).where(eq(profilePhotos.id, photoId));
    
    if (photo.isPrimary) {
      const remainingPhotos = await this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profile.id)).orderBy(asc(profilePhotos.displayOrder));
      if (remainingPhotos.length > 0) {
        await this.db.update(profilePhotos).set({ isPrimary: true }).where(eq(profilePhotos.id, remainingPhotos[0].id));
      }
    }

    await refreshRequiredComplete(this.db, profile.id);
    // Return the refreshed profile so the client can update avatars immediately.
    return this.getMyProfile(userId);
  }

  async reorderPhotos(userId: string, photoIds: string[]) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    this.invalidateProfileCache(profile.id);

    // Reject foreign keys first so a caller cannot reorder another user's photos.
    const owned = await this.db
      .select({ id: profilePhotos.id })
      .from(profilePhotos)
      .where(
        and(eq(profilePhotos.profileId, profile.id), inArray(profilePhotos.id, photoIds)),
      );
    const ownedIds = new Set(owned.map((p) => p.id));
    if (photoIds.some((id) => !ownedIds.has(id))) {
      throw new ForbiddenException('One or more photos do not belong to your profile');
    }

    // Single batched UPDATE via CASE/VALUES instead of N sequential round trips.
    // CASE maps photo id -> new position; isPrimary follows displayOrder 0.
    // Cast THEN arms to int — postgres.js otherwise binds JS numbers as text and
    // `CASE … END = 0` fails with "operator does not exist: text = integer".
    const orderPairs = photoIds.map((id, i) => ({ id, order: i }));
    const idsSql = sql.join(
      orderPairs.map((p) => sql`${p.id}::uuid`),
      sql`, `,
    );
    const caseSql = sql.join(
      orderPairs.map((p) => sql`WHEN id = ${p.id}::uuid THEN ${p.order}::integer`),
      sql` `,
    );

    await this.db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE profile_photos
        SET display_order = CASE ${caseSql} END,
            is_primary = (CASE ${caseSql} END = 0)
        WHERE profile_id = ${profile.id} AND id IN (${idsSql})
      `);
    });

    // Read on a separate connection after commit — getMyProfile uses this.db.
    return this.getMyProfile(userId);
  }

  async getMyProfile(userId: string): Promise<FullProfileView> {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found for this user. Please complete registration.');
    }

    const [familyRows, lifestyleRows, horoscopeRows, verificationRows, preferenceRows, photos] =
      await Promise.all([
        this.db
          .select()
          .from(familyDetails)
          .where(eq(familyDetails.profileId, profile.id))
          .limit(1),
        this.db
          .select()
          .from(lifestyleInterests)
          .where(eq(lifestyleInterests.profileId, profile.id))
          .limit(1),
        this.db
          .select()
          .from(horoscopes)
          .where(eq(horoscopes.profileId, profile.id))
          .limit(1),
        this.db
          .select()
          .from(verifications)
          .where(eq(verifications.profileId, profile.id))
          .limit(1),
        this.db
          .select()
          .from(partnerPreferences)
          .where(eq(partnerPreferences.profileId, profile.id))
          .limit(1),
        getOwnerPhotos(this.db, profile.id),
      ]);

    const verification = this.firstRow(verificationRows);

    return {
      profile: await this.enrichProfileDetails(profile as any),
      family: this.firstRow(familyRows) as any,
      lifestyle: this.firstRow(lifestyleRows) as any,
      horoscope: this.firstRow(horoscopeRows) as any,
      preferences: this.firstRow(preferenceRows) as any,
      verification: verification || null,
      photos,
      verificationStatus: (verification?.status as FullProfileView['verificationStatus']) || 'idle',
    };
  }

  async getProfileById(profileId: string, viewerUserId?: string): Promise<FullProfileView> {
    // Cache only the viewer-independent parts. Viewer-specific decisions
    // (withholdKey, contactAccess, isMutualConnect) are re-applied per call.
    const cachedBase = this.profileViewCache.get(`base:${profileId}`);

    let profile: typeof profiles.$inferSelect | undefined;
    let family: any = null;
    let lifestyle: any = null;
    let horoscopeRow: any = null;
    let verification: any = null;
    let partnerPrefs: any = null;
    let photos: Array<{ id: string; s3Key: string; isPrimary: boolean; displayOrder: number }> = [];

    if (cachedBase) {
      const c = cachedBase as any;
      profile = c.profile;
      family = c.family;
      lifestyle = c.lifestyle;
      horoscopeRow = c.horoscopeRow;
      verification = c.verification;
      partnerPrefs = c.partnerPreferences;
    } else {
      [profile] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      [family, lifestyle, horoscopeRow, verification, partnerPrefs] = await Promise.all([
        this.db
          .select()
          .from(familyDetails)
          .where(eq(familyDetails.profileId, profile.id))
          .limit(1)
          .then((rows) => this.firstRow(rows)),
        this.db
          .select()
          .from(lifestyleInterests)
          .where(eq(lifestyleInterests.profileId, profile.id))
          .limit(1)
          .then((rows) => this.firstRow(rows)),
        this.db
          .select()
          .from(horoscopes)
          .where(eq(horoscopes.profileId, profile.id))
          .limit(1)
          .then((rows) => this.firstRow(rows)),
        this.db
          .select()
          .from(verifications)
          .where(eq(verifications.profileId, profile.id))
          .limit(1)
          .then((rows) => this.firstRow(rows)),
        this.db
          .select()
          .from(partnerPreferences)
          .where(eq(partnerPreferences.profileId, profile.id))
          .limit(1)
          .then((rows) => this.firstRow(rows)),
      ]);

      this.profileViewCache.set(`base:${profileId}`, {
        profile,
        family,
        lifestyle,
        horoscopeRow,
        verification,
        partnerPreferences: partnerPrefs,
        setting: null, // fetched fresh on every read; cheap single-row lookup
      } as unknown as FullProfileView);
    }

    // Photos are never cached: moderation (approve/reject) can change visibility
    // without touching profiles.*, and SQL/admin paths must take effect immediately.
    if (profile) {
      photos = await getApprovedPhotos(this.db, profile.id);
    }

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    family = this.firstRow(family as any);
    lifestyle = this.firstRow(lifestyle as any);
    horoscopeRow = this.firstRow(horoscopeRow as any);
    verification = this.firstRow(verification as any);

    // Viewer context (profile id + partner preferences) for block checks,
    // view logging, and compatibility scoring — one load, reused below.
    const viewer = viewerUserId ? await loadViewerContext(this.db, viewerUserId) : null;

    if (viewer) {
      const isBlocked = await this.blocksService.isBlocked(viewer.profileId, profile.id);
      if (isBlocked) {
        throw new ForbiddenException('Profile not found or unavailable');
      }

      // Don't log if viewing own profile
      if (viewer.profileId !== profile.id) {
        // Use a dynamic import or require for profileViews to avoid changing too many imports at top
        const { profileViews } = require('@astalakshimi/database');
        await this.db.insert(profileViews).values({
          viewerProfileId: viewer.profileId,
          targetProfileId: profile.id,
        }).onConflictDoNothing(); // If we only want unique views per day, we can tweak this, but unique index handles it.
      }
    }

    // `setting` (photoBlur) is owner-scoped (viewer-independent) so we cache
    // it alongside the rest of the profile data.
    const setting = await this.db
      .select({ photoBlur: userSettings.photoBlur })
      .from(userSettings)
      .where(eq(userSettings.userId, profile.userId))
      .limit(1)
      .then((r) => r[0]);

    const { isMutualConnect, contactPhone } = await this.getMutualConnectState(
      viewerUserId,
      profile,
    );

    const isOwnProfile = Boolean(viewerUserId && viewerUserId === profile.userId);

    const contactAccess = viewerUserId
      ? await this.entitlementsService.getContactUnlockStatus(
          viewerUserId,
          profile.id,
          isMutualConnect,
        )
      : {
          canView: false,
          isUnlocked: false,
          isMutualBenefit: false,
          limit: 3,
          usedThisMonth: 0,
          remaining: 3,
          canUnlockWithQuota: false,
          canPayExtra: false,
          extraContactFeePaise: 2900,
          planSlug: 'free',
        };

    if (isOwnProfile) {
      contactAccess.canView = true;
    }

    const { blurPhoto, withholdKey } = computeBlurDecision({
      photoBlur: setting?.photoBlur,
      isAccepted: isMutualConnect,
      viewerUserId,
      ownerUserId: profile.userId,
    });

    const familyObj = Array.isArray(family) ? family[0] : family;
    const lifestyleObj = Array.isArray(lifestyle) ? lifestyle[0] : lifestyle;
    const horoscopeRowObj = Array.isArray(horoscopeRow) ? horoscopeRow[0] : horoscopeRow;
    const verificationObj = Array.isArray(verification) ? verification[0] : verification;
    const partnerPrefsObj = Array.isArray(partnerPrefs) ? partnerPrefs[0] : partnerPrefs;

    const canViewHoroscope = isOwnProfile || (isMutualConnect && contactAccess.isMutualBenefit);

    const horoscopePayload =
      horoscopeRowObj && canViewHoroscope
        ? (horoscopeRowObj as any)
        : horoscopeRowObj
          ? {
              ...(horoscopeRowObj as any),
              horoscopeS3Key: null,
              horoscopeFileName: null,
              horoscopeFileSizeBytes: null,
            }
          : null;

    const canViewContact = contactAccess.canView;
    let visiblePhone: string | null = null;
    if (canViewContact) {
      visiblePhone = contactPhone;
      if (!visiblePhone) {
        const [owner] = await this.db
          .select({ phone: users.phone })
          .from(users)
          .where(eq(users.id, profile.userId))
          .limit(1);
        visiblePhone = owner?.phone ?? null;
      }
    }

    return {
      profile: await this.enrichProfileDetails(profile as any),
      family: (familyObj as any) || null,
      lifestyle: (lifestyleObj as any) || null,
      horoscope: horoscopePayload,
      // Withhold keys entirely when blurred: the bucket is public, so sending
      // them would let anyone view the photo regardless of the blur flag.
      photos: withholdKey ? [] : photos,
      verificationStatus: verificationObj?.status || 'idle',
      blurPhoto,
      isVerified: verificationObj?.status === 'verified',
      photoVerified: verificationObj?.status === 'verified',
      isMutualConnect,
      contactPhone: visiblePhone,
      hasHoroscope: Boolean(horoscopeRowObj?.horoscopeS3Key),
      contactAccess,
    };
  }

  async recordVisit(profileId: string, viewerUserId: string): Promise<void> {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!profile) return;

    const [viewerProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, viewerUserId))
      .limit(1);

    if (viewerProfile && viewerProfile.id !== profile.id) {
      const { profileViews } = require('@astalakshimi/database');
      await this.db.insert(profileViews).values({
        viewerProfileId: viewerProfile.id,
        targetProfileId: profile.id,
      }).onConflictDoNothing();
    }
  }
}
