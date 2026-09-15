import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { BlocksService } from '../blocks/blocks.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { EducationsService } from '../educations/educations.service';
import { CareersService } from '../careers/careers.service';
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
  specializations,
} from '@astalakshimi/database';
import { eq, asc, and, or, inArray, sql } from 'drizzle-orm';
import type { CompleteRegistrationPayload, FullProfileView } from '@astalakshimi/types';
import { getApprovedPhotos, getAllPhotos, computeBlurDecision, isOwnedPhotoKey } from '../common/photo-access';
import { LruCache } from '../common/cache/lru-cache';

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
    private readonly educationsService: EducationsService,
    private readonly careersService: CareersService,
  ) {}

  private invalidateProfileCache(profileId: string) {
    this.profileViewCache.delete(`base:${profileId}`);
    this.profileViewCache.delete(`stats:${profileId}`);
  }

  /** Treat blank strings as missing so Postgres enums/varchars never get "". */
  private emptyToNull(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = String(value).trim();
    return trimmed === '' ? null : trimmed;
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
      ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce'] as const,
      'maritalStatus',
    );
    const familyValues = this.requireEnum(
      payload.familyValues,
      ['Traditional', 'Moderate', 'Liberal'] as const,
      'familyValues',
      'Moderate',
    );
    const familyType = this.requireEnum(
      payload.familyType,
      ['Nuclear', 'Joint', 'Extended'] as const,
      'familyType',
      'Nuclear',
    );
    const fatherOccupation = this.requireEnum(
      payload.fatherOccupation,
      ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
      'fatherOccupation',
      'Employed',
    );
    const motherOccupation = this.requireEnum(
      payload.motherOccupation,
      ['Employed', 'Business', 'Retired', 'Homemaker', 'Passed Away'] as const,
      'motherOccupation',
      'Homemaker',
    );
    const diet = this.requireEnum(
      payload.diet,
      ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan'] as const,
      'diet',
      'Vegetarian',
    );
    const smoking = this.requireEnum(
      payload.smoking,
      ['Never', 'Occasionally', 'Regularly', 'Planning to quit'] as const,
      'smoking',
      'Never',
    );
    const alcohol = this.requireEnum(
      payload.alcohol,
      ['Never', 'Occasionally', 'Regularly', 'Planning to quit'] as const,
      'alcohol',
      'Never',
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
      profileFor: this.emptyToNull(payload.profileFor) || 'Myself',
      fullName: this.emptyToNull(payload.fullName) || payload.fullName,
      gender,
      maritalStatus,
      aboutMe: this.emptyToNull(payload.aboutMe) ?? undefined,
      city: this.emptyToNull(payload.city) || payload.city,
      state: this.emptyToNull(payload.state) || payload.state,
      country: this.emptyToNull(payload.country) || 'India',
      religion: this.emptyToNull(payload.religion) || payload.religion,
      caste: this.emptyToNull(payload.caste) || payload.caste,
      subcaste: this.emptyToNull(payload.subcaste) ?? undefined,
      gotra: this.emptyToNull(payload.gotra) ?? undefined,
      motherTongue: this.emptyToNull(payload.motherTongue) || payload.motherTongue,
      educationLevel: this.optionalEnum(
        payload.educationLevel,
        ['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School'] as const,
      ) ?? undefined,
      degree: this.emptyToNull(payload.degree) ?? undefined,
      collegeName: this.emptyToNull(payload.collegeName) ?? undefined,
      employmentStatus: this.optionalEnum(
        payload.employmentStatus,
        ['Employed', 'Business Owner', 'Freelancer', 'Not Working'] as const,
      ) ?? undefined,
      profession: this.emptyToNull(payload.profession) ?? undefined,
      companyName: this.emptyToNull(payload.companyName) ?? undefined,
      companySector: this.normalizeCompanySector(payload.companySector) ?? undefined,
      annualIncome: this.emptyToNull(payload.annualIncome) ?? undefined,
      familyValues,
      familyType,
      fatherOccupation,
      motherOccupation,
      diet,
      smoking,
      alcohol,
      interests: payload.interests ?? [],
      birthTime: this.emptyToNull(payload.birthTime) ?? undefined,
      birthPlace: this.emptyToNull(payload.birthPlace) ?? undefined,
      manglik,
      rashi: this.emptyToNull(payload.rashi) ?? undefined,
      nakshatra: this.emptyToNull(payload.nakshatra) ?? undefined,
      prefReligions: payload.prefReligions?.length ? payload.prefReligions : ['Hindu'],
      prefCastes: payload.prefCastes ?? [],
      prefMotherTongues: payload.prefMotherTongues ?? [],
      prefMaritalStatuses: payload.prefMaritalStatuses?.length
        ? payload.prefMaritalStatuses
        : ['Never Married'],
      prefAcceptableIncomes: payload.prefAcceptableIncomes ?? [],
      prefLocations: payload.prefLocations ?? [],
      prefMinEducation: this.emptyToNull(payload.prefMinEducation) ?? undefined,
      photoS3Keys: payload.photoS3Keys ?? [],
      photoPrivacy,
      verificationMethod,
      selfieS3Key: this.emptyToNull(payload.selfieS3Key) ?? undefined,
      govtIdType: this.optionalEnum(
        payload.govtIdType,
        ['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID'] as const,
      ) ?? undefined,
      govtIdS3Key: this.emptyToNull(payload.govtIdS3Key) ?? undefined,
      horoscopeS3Key: this.emptyToNull(payload.horoscopeS3Key) ?? undefined,
      horoscopeFileName: this.emptyToNull(payload.horoscopeFileName) ?? undefined,
    };
  }

  private async buildEducationUpdate(
    payload: Partial<CompleteRegistrationPayload>,
    existingEducationId?: number | null,
  ) {
    const update: {
      educationId?: number | null;
      specializationId?: number | null;
      degree?: string | null;
    } = {};

    const nextEducationId =
      payload.educationId !== undefined ? payload.educationId : existingEducationId ?? null;

    if (payload.educationId !== undefined) {
      if (payload.educationId === null) {
        update.educationId = null;
        update.specializationId = null;
        update.degree = null;
        return update;
      }

      const levelName = await this.educationsService.getLevelName(payload.educationId);
      if (!levelName) {
        throw new BadRequestException('Invalid education level');
      }

      update.educationId = payload.educationId;
      update.degree = payload.degree || levelName;
      if (payload.specializationId === undefined) {
        update.specializationId = null;
      }
    }

    if (payload.specializationId !== undefined) {
      if (payload.specializationId === null) {
        update.specializationId = null;
        if (payload.degree) {
          update.degree = payload.degree;
        }
        return update;
      }

      const [spec] = await this.db
        .select({
          id: specializations.id,
          educationId: specializations.educationId,
        })
        .from(specializations)
        .where(eq(specializations.id, payload.specializationId))
        .limit(1);

      if (!spec) {
        throw new BadRequestException('Invalid specialization');
      }
      if (nextEducationId && spec.educationId !== nextEducationId) {
        throw new BadRequestException('Specialization does not match selected education');
      }

      update.specializationId = payload.specializationId;
    }

    return update;
  }

  private async enrichProfileEducation<T extends { educationId?: number | null; specializationId?: number | null; degree?: string | null }>(
    profile: T,
  ) {
    const degree =
      profile.degree ??
      (profile.educationId ? await this.educationsService.getLevelName(profile.educationId) : null);

    const specializationName = profile.specializationId
      ? await this.educationsService.getSpecializationName(profile.specializationId)
      : null;

    return {
      ...profile,
      degree: degree ?? profile.degree,
      specializationName,
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

  private async buildCareerUpdate(payload: Partial<CompleteRegistrationPayload>) {
    const update: {
      occupationId?: number | null;
      profession?: string | null;
      companyId?: number | null;
      companyName?: string | null;
      companySector?: 'Private' | 'Govt' | 'MNC' | 'Startup' | 'Business';
    } = {};

    if (payload.occupationId !== undefined && payload.occupationId !== null) {
      const occupationName = await this.careersService.getOccupationName(payload.occupationId);
      if (!occupationName) {
        throw new BadRequestException('Invalid occupation');
      }
      update.occupationId = payload.occupationId;
      update.profession = occupationName;
    } else if (payload.profession) {
      const resolved = await this.careersService.resolveOccupation(payload.profession);
      if (resolved) {
        update.occupationId = resolved.id;
        update.profession = resolved.name;
      } else {
        update.occupationId = null;
        update.profession = payload.profession;
      }
    } else if (payload.occupationId === null) {
      update.occupationId = null;
      update.profession = null;
    }

    if (payload.companyId !== undefined && payload.companyId !== null) {
      const companyName = await this.careersService.getCompanyName(payload.companyId);
      if (!companyName) {
        throw new BadRequestException('Invalid company');
      }
      const resolved = await this.careersService.resolveCompany(companyName);
      update.companyId = payload.companyId;
      update.companyName = companyName;
      const sector = this.mapCompanySector(resolved?.sector);
      if (sector) update.companySector = sector;
    } else if (payload.companyName !== undefined) {
      const trimmed = payload.companyName ? payload.companyName.trim() : '';
      if (!trimmed) {
        update.companyId = null;
        update.companyName = null;
      } else {
        const resolved = await this.careersService.resolveCompany(trimmed);
        if (resolved) {
          update.companyId = resolved.id;
          update.companyName = resolved.name;
          const sector = this.mapCompanySector(resolved.sector);
          if (sector) update.companySector = sector;
        } else {
          update.companyId = null;
          update.companyName = trimmed;
        }
      }
    } else if (payload.companyId === null) {
      update.companyId = null;
    }

    if (payload.profession !== undefined && update.profession === undefined && !payload.occupationId) {
      update.profession = payload.profession;
    }

    return update;
  }

  private async enrichProfileCareer<T extends {
    occupationId?: number | null;
    profession?: string | null;
    companyId?: number | null;
    companyName?: string | null;
  }>(profile: T) {
    const profession =
      profile.profession ??
      (profile.occupationId ? await this.careersService.getOccupationName(profile.occupationId) : null);

    const companyName =
      profile.companyName ??
      (profile.companyId ? await this.careersService.getCompanyName(profile.companyId) : null);

    return {
      ...profile,
      profession: profession ?? profile.profession,
      companyName: companyName ?? profile.companyName,
    };
  }

  private async enrichProfileDetails<T extends Record<string, unknown>>(profile: T) {
    const withEducation = await this.enrichProfileEducation(profile as any);
    return this.enrichProfileCareer(withEducation);
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

  async completeRegistration(userId: string, payload: CompleteRegistrationPayload) {
    const data = this.sanitizeRegistrationPayload(payload);
    const educationFields = await this.buildEducationUpdate(data);
    const careerFields = await this.buildCareerUpdate(data);

    return this.db.transaction(async (tx) => {
      // 1. Format DOB as YYYY-MM-DD
      const month = data.dobMonth.padStart(2, '0');
      const day = data.dobDay.padStart(2, '0');
      const dobStr = `${data.dobYear}-${month}-${day}`;

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
            hasChildren: data.hasChildren ?? false,
            childrenCount: data.childrenCount ?? 0,
            childrenLivingWithMe: data.childrenLivingWithMe ?? null,
            heightCm: data.heightCm,
            aboutMe: data.aboutMe ?? null,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            religion: data.religion,
            caste: data.caste,
            subcaste: data.subcaste ?? null,
            gotra: data.gotra ?? null,
            motherTongue: data.motherTongue,
            educationId: educationFields.educationId ?? data.educationId ?? null,
            specializationId: educationFields.specializationId ?? data.specializationId ?? null,
            educationLevel: data.educationLevel ?? null,
            degree: educationFields.degree ?? data.degree ?? null,
            collegeName: data.collegeName ?? null,
            employmentStatus: data.employmentStatus ?? null,
            occupationId: careerFields.occupationId ?? data.occupationId ?? null,
            profession: careerFields.profession ?? data.profession ?? null,
            companyId: careerFields.companyId ?? data.companyId ?? null,
            companyName: careerFields.companyName ?? data.companyName ?? null,
            companySector:
              careerFields.companySector ?? this.normalizeCompanySector(data.companySector),
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
            profileFor: data.profileFor,
            fullName: data.fullName,
            gender: data.gender,
            dob: dobStr,
            maritalStatus: data.maritalStatus,
            hasChildren: data.hasChildren ?? false,
            childrenCount: data.childrenCount ?? 0,
            childrenLivingWithMe: data.childrenLivingWithMe ?? null,
            heightCm: data.heightCm,
            aboutMe: data.aboutMe ?? null,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            religion: data.religion,
            caste: data.caste,
            subcaste: data.subcaste ?? null,
            gotra: data.gotra ?? null,
            motherTongue: data.motherTongue,
            educationId: educationFields.educationId ?? data.educationId ?? null,
            specializationId: educationFields.specializationId ?? data.specializationId ?? null,
            educationLevel: data.educationLevel ?? null,
            degree: educationFields.degree ?? data.degree ?? null,
            collegeName: data.collegeName ?? null,
            employmentStatus: data.employmentStatus ?? null,
            occupationId: careerFields.occupationId ?? data.occupationId ?? null,
            profession: careerFields.profession ?? data.profession ?? null,
            companyId: careerFields.companyId ?? data.companyId ?? null,
            companyName: careerFields.companyName ?? data.companyName ?? null,
            companySector:
              careerFields.companySector ?? this.normalizeCompanySector(data.companySector),
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
          familyValues: data.familyValues,
          familyType: data.familyType,
          fatherOccupation: data.fatherOccupation,
          motherOccupation: data.motherOccupation,
          brothersCount: data.brothersCount ?? 0,
          sistersCount: data.sistersCount ?? 0,
        })
        .onConflictDoUpdate({
          target: familyDetails.profileId,
          set: {
            familyValues: data.familyValues,
            familyType: data.familyType,
            fatherOccupation: data.fatherOccupation,
            motherOccupation: data.motherOccupation,
            brothersCount: data.brothersCount ?? 0,
            sistersCount: data.sistersCount ?? 0,
            updatedAt: new Date(),
          },
        });

      // 4. Upsert Lifestyle & Interests
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
            smoking: data.smoking || 'Never',
            alcohol: data.alcohol || 'Never',
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
          prefAgeMin: data.prefAgeMin ?? null,
          prefAgeMax: data.prefAgeMax ?? null,
          prefHeightMinCm: data.prefHeightMinCm ?? null,
          prefHeightMaxCm: data.prefHeightMaxCm ?? null,
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
            prefAgeMin: data.prefAgeMin ?? null,
            prefAgeMax: data.prefAgeMax ?? null,
            prefHeightMinCm: data.prefHeightMinCm ?? null,
            prefHeightMaxCm: data.prefHeightMaxCm ?? null,
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
          isPrimary: index === 0,
          displayOrder: index,
          status: 'pending' as const,
        }));
        await tx.insert(profilePhotos).values(photoRecords);
      }

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
  }

  async updateMyProfile(userId: string, payload: Partial<CompleteRegistrationPayload>) {
    const [profile] = await this.db
      .select({
        id: profiles.id,
        educationId: profiles.educationId,
        occupationId: profiles.occupationId,
        companyId: profiles.companyId,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    const profileId = profile.id;
    this.invalidateProfileCache(profileId);
    const educationFields = await this.buildEducationUpdate(payload, profile.educationId);
    const careerFields = await this.buildCareerUpdate(payload);

    return this.db.transaction(async (tx) => {
      // Check if any fields belong to profiles
      const profilesUpdate: any = {};
      if (payload.profileFor !== undefined) profilesUpdate.profileFor = payload.profileFor;
      if (payload.fullName !== undefined) profilesUpdate.fullName = payload.fullName;
      if (payload.gender !== undefined) profilesUpdate.gender = payload.gender;
      if (payload.maritalStatus !== undefined) profilesUpdate.maritalStatus = payload.maritalStatus;
      if (payload.hasChildren !== undefined) profilesUpdate.hasChildren = payload.hasChildren;
      if (payload.childrenCount !== undefined) profilesUpdate.childrenCount = payload.childrenCount;
      if (payload.childrenLivingWithMe !== undefined) profilesUpdate.childrenLivingWithMe = payload.childrenLivingWithMe;
      if (payload.heightCm !== undefined) profilesUpdate.heightCm = payload.heightCm;
      if (payload.weight !== undefined) profilesUpdate.weight = this.emptyToNull(payload.weight);
      if (payload.complexion !== undefined) profilesUpdate.complexion = this.emptyToNull(payload.complexion);
      if (payload.disability !== undefined) profilesUpdate.disability = this.emptyToNull(payload.disability);
      if (payload.willingToRelocate !== undefined) profilesUpdate.willingToRelocate = this.emptyToNull(payload.willingToRelocate);
      if (payload.aboutMe !== undefined) profilesUpdate.aboutMe = payload.aboutMe;
      if (payload.city !== undefined) profilesUpdate.city = payload.city;
      if (payload.state !== undefined) profilesUpdate.state = payload.state;
      if (payload.country !== undefined) profilesUpdate.country = payload.country;
      if (payload.religion !== undefined) profilesUpdate.religion = payload.religion;
      if (payload.caste !== undefined) profilesUpdate.caste = payload.caste;
      if (payload.subcaste !== undefined) profilesUpdate.subcaste = this.emptyToNull(payload.subcaste);
      if (payload.gotra !== undefined) profilesUpdate.gotra = this.emptyToNull(payload.gotra);
      if (payload.motherTongue !== undefined) profilesUpdate.motherTongue = payload.motherTongue;
      Object.assign(profilesUpdate, educationFields);
      Object.assign(profilesUpdate, careerFields);
      if (payload.educationLevel !== undefined) {
        profilesUpdate.educationLevel = this.optionalEnum(
          payload.educationLevel,
          ['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School'] as const,
        );
      }
      if (payload.degree !== undefined && educationFields.degree === undefined) {
        profilesUpdate.degree = this.emptyToNull(payload.degree);
      }
      if (payload.collegeName !== undefined) profilesUpdate.collegeName = this.emptyToNull(payload.collegeName);
      if (payload.employmentStatus !== undefined) {
        profilesUpdate.employmentStatus = this.optionalEnum(
          payload.employmentStatus,
          ['Employed', 'Business Owner', 'Freelancer', 'Not Working'] as const,
        );
      }
      if (payload.profession !== undefined && careerFields.profession === undefined) {
        profilesUpdate.profession = this.emptyToNull(payload.profession);
      }
      if (payload.companyName !== undefined && careerFields.companyName === undefined) {
        profilesUpdate.companyName = this.emptyToNull(payload.companyName);
      }
      if (payload.companySector !== undefined && careerFields.companySector === undefined) {
        profilesUpdate.companySector = this.normalizeCompanySector(payload.companySector);
      }
      if (payload.annualIncome !== undefined) {
        profilesUpdate.annualIncome = this.emptyToNull(payload.annualIncome);
      }
      if (payload.photoPrivacy !== undefined) profilesUpdate.photoPrivacy = payload.photoPrivacy;
      // Special handling for DOB
      if (payload.dobYear !== undefined && payload.dobMonth !== undefined && payload.dobDay !== undefined) {
        profilesUpdate.dob = `${payload.dobYear}-${payload.dobMonth.padStart(2, '0')}-${payload.dobDay.padStart(2, '0')}`;
      }
      if (Object.keys(profilesUpdate).length > 0) {
        profilesUpdate.updatedAt = new Date();
        await tx.update(profiles).set(profilesUpdate).where(eq(profiles.id, profileId));
      }

      // Check if any fields belong to familyDetails
      const familyDetailsUpdate: any = {};
      if (payload.familyValues !== undefined) familyDetailsUpdate.familyValues = payload.familyValues;
      if (payload.familyType !== undefined) familyDetailsUpdate.familyType = payload.familyType;
      if (payload.familyStatus !== undefined) familyDetailsUpdate.familyStatus = payload.familyStatus;
      if (payload.fatherOccupation !== undefined) familyDetailsUpdate.fatherOccupation = payload.fatherOccupation;
      if (payload.motherOccupation !== undefined) familyDetailsUpdate.motherOccupation = payload.motherOccupation;
      if (payload.brothersCount !== undefined) familyDetailsUpdate.brothersCount = payload.brothersCount;
      if (payload.sistersCount !== undefined) familyDetailsUpdate.sistersCount = payload.sistersCount;
      if (Object.keys(familyDetailsUpdate).length > 0) {
        familyDetailsUpdate.updatedAt = new Date();
        await tx.update(familyDetails).set(familyDetailsUpdate).where(eq(familyDetails.profileId, profileId));
      }

      // Check if any fields belong to lifestyleInterests
      const lifestyleInterestsUpdate: any = {};
      if (payload.diet !== undefined) lifestyleInterestsUpdate.diet = payload.diet;
      if (payload.smoking !== undefined) lifestyleInterestsUpdate.smoking = payload.smoking;
      if (payload.alcohol !== undefined) lifestyleInterestsUpdate.alcohol = payload.alcohol;
      if (payload.interests !== undefined) lifestyleInterestsUpdate.interests = payload.interests;
      if (Object.keys(lifestyleInterestsUpdate).length > 0) {
        lifestyleInterestsUpdate.updatedAt = new Date();
        await tx.update(lifestyleInterests).set(lifestyleInterestsUpdate).where(eq(lifestyleInterests.profileId, profileId));
      }

      // Check if any fields belong to horoscopes
      const horoscopesUpdate: any = {};
      if (payload.birthTime !== undefined) horoscopesUpdate.birthTime = payload.birthTime;
      if (payload.birthPlace !== undefined) horoscopesUpdate.birthPlace = payload.birthPlace;
      if (payload.manglik !== undefined) horoscopesUpdate.manglik = payload.manglik;
      if (payload.rashi !== undefined) horoscopesUpdate.rashi = payload.rashi;
      if (payload.nakshatra !== undefined) horoscopesUpdate.nakshatra = payload.nakshatra;
      if (payload.horoscopeS3Key !== undefined) horoscopesUpdate.horoscopeS3Key = payload.horoscopeS3Key;
      if (payload.horoscopeFileName !== undefined) horoscopesUpdate.horoscopeFileName = payload.horoscopeFileName;
      if (payload.horoscopeFileSizeBytes !== undefined) horoscopesUpdate.horoscopeFileSizeBytes = payload.horoscopeFileSizeBytes;
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
      if (payload.prefMinEducation !== undefined) partnerPreferencesUpdate.prefMinEducation = payload.prefMinEducation;
      if (payload.prefAcceptableIncomes !== undefined) partnerPreferencesUpdate.prefAcceptableIncomes = payload.prefAcceptableIncomes;
      if (payload.prefLocations !== undefined) partnerPreferencesUpdate.prefLocations = payload.prefLocations;
      if (Object.keys(partnerPreferencesUpdate).length > 0) {
        partnerPreferencesUpdate.updatedAt = new Date();
        await tx.update(partnerPreferences).set(partnerPreferencesUpdate).where(eq(partnerPreferences.profileId, profileId));
      }

      return this.getMyProfile(userId);
    });
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

    return this.getMyProfile(userId);
  }

  async deletePhoto(userId: string, photoId: string) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    
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

    return { success: true };
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
    const orderPairs = photoIds.map((id, i) => ({ id, order: i }));
    const idsSql = sql.join(
      orderPairs.map((p) => sql`${p.id}::uuid`),
      sql`, `,
    );
    const caseSql = sql.join(
      orderPairs.map((p) => sql`WHEN id = ${p.id}::uuid THEN ${p.order}`),
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

    const [family, lifestyle, horoscope, verificationRes, prefRes, photos] = await Promise.all([
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
      getAllPhotos(this.db, profile.id),
    ]);

    const familyObj = Array.isArray(family) ? family[0] : family;
    const lifestyleObj = Array.isArray(lifestyle) ? lifestyle[0] : lifestyle;
    const horoscopeObj = Array.isArray(horoscope) ? horoscope[0] : horoscope;
    const verification = Array.isArray(verificationRes) ? verificationRes[0] : verificationRes;
    const partnerPreferencesObj = Array.isArray(prefRes) ? prefRes[0] : prefRes;

    return {
      profile: await this.enrichProfileDetails(profile as any),
      family: (familyObj as any) || null,
      lifestyle: (lifestyleObj as any) || null,
      horoscope: (horoscopeObj as any) || null,
      partnerPreferences: (partnerPreferencesObj as any) || null,
      verification: verification || null,
      photos,
      verificationStatus: verification?.status || 'idle',
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
      photos = c.photos;
    } else {
      [profile] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, profileId))
        .limit(1);

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      [family, lifestyle, horoscopeRow, verification, partnerPrefs, photos] = await Promise.all([
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
        this.db
          .select({
            id: profilePhotos.id,
            s3Key: profilePhotos.s3Key,
            isPrimary: profilePhotos.isPrimary,
            displayOrder: profilePhotos.displayOrder,
          })
          .from(profilePhotos)
          .where(eq(profilePhotos.profileId, profile.id))
          .orderBy(asc(profilePhotos.displayOrder)),
      ]);

      this.profileViewCache.set(`base:${profileId}`, {
        profile,
        family,
        lifestyle,
        horoscopeRow,
        verification,
        partnerPreferences: partnerPrefs,
        photos,
        setting: null, // fetched fresh on every read; cheap single-row lookup
      } as unknown as FullProfileView);
    }

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (viewerUserId) {
      // Find viewer's profile id (also cached implicitly by the early-return).
      const [viewerProfile] = await this.db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, viewerUserId))
        .limit(1);

      if (viewerProfile) {
        const isBlocked = await this.blocksService.isBlocked(viewerProfile.id, profile.id);
        if (isBlocked) {
          throw new ForbiddenException('Profile not found or unavailable');
        }
      }

      // Don't log if viewing own profile
      if (viewerProfile && viewerProfile.id !== profile.id) {
        // Use a dynamic import or require for profileViews to avoid changing too many imports at top
        const { profileViews } = require('@astalakshimi/database');
        await this.db.insert(profileViews).values({
          viewerProfileId: viewerProfile.id,
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
      partnerPreferences: partnerPrefsObj || null,
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
