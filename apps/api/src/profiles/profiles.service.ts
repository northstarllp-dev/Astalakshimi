import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
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
} from '@astalakshimi/database';
import { eq, asc, and, or } from 'drizzle-orm';
import type { CompleteRegistrationPayload, FullProfileView } from '@astalakshimi/types';

@Injectable()
export class ProfilesService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly blocksService: BlocksService,
    private readonly entitlementsService: EntitlementsService,
  ) {}

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
    return this.db.transaction(async (tx) => {
      // 1. Format DOB as YYYY-MM-DD
      const month = payload.dobMonth.padStart(2, '0');
      const day = payload.dobDay.padStart(2, '0');
      const dobStr = `${payload.dobYear}-${month}-${day}`;

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
            profileFor: payload.profileFor,
            fullName: payload.fullName,
            gender: payload.gender,
            dob: dobStr,
            maritalStatus: payload.maritalStatus,
            hasChildren: payload.hasChildren ?? false,
            childrenCount: payload.childrenCount ?? 0,
            childrenLivingWithMe: payload.childrenLivingWithMe ?? null,
            heightCm: payload.heightCm,
            aboutMe: payload.aboutMe ?? null,
            city: payload.city,
            state: payload.state,
            country: payload.country || 'India',
            religion: payload.religion,
            caste: payload.caste,
            subcaste: payload.subcaste ?? null,
            gotra: payload.gotra ?? null,
            motherTongue: payload.motherTongue,
            educationLevel: payload.educationLevel,
            degree: payload.degree,
            collegeName: payload.collegeName ?? null,
            employmentStatus: payload.employmentStatus,
            profession: payload.profession,
            companyName: payload.companyName ?? null,
            companySector: payload.companySector ?? null,
            annualIncome: payload.annualIncome,
            photoPrivacy: payload.photoPrivacy || 'blurred',
            updatedAt: new Date(),
          })
          .where(eq(profiles.id, profileId));
      } else {
        const [newProfile] = await tx
          .insert(profiles)
          .values({
            userId,
            profileFor: payload.profileFor,
            fullName: payload.fullName,
            gender: payload.gender,
            dob: dobStr,
            maritalStatus: payload.maritalStatus,
            hasChildren: payload.hasChildren ?? false,
            childrenCount: payload.childrenCount ?? 0,
            childrenLivingWithMe: payload.childrenLivingWithMe ?? null,
            heightCm: payload.heightCm,
            aboutMe: payload.aboutMe ?? null,
            city: payload.city,
            state: payload.state,
            country: payload.country || 'India',
            religion: payload.religion,
            caste: payload.caste,
            subcaste: payload.subcaste ?? null,
            gotra: payload.gotra ?? null,
            motherTongue: payload.motherTongue,
            educationLevel: payload.educationLevel,
            degree: payload.degree,
            collegeName: payload.collegeName ?? null,
            employmentStatus: payload.employmentStatus,
            profession: payload.profession,
            companyName: payload.companyName ?? null,
            companySector: payload.companySector ?? null,
            annualIncome: payload.annualIncome,
            photoPrivacy: payload.photoPrivacy || 'blurred',
          })
          .returning();
        profileId = newProfile.id;
      }

      // 3. Upsert Family Details
      await tx
        .insert(familyDetails)
        .values({
          profileId,
          familyValues: payload.familyValues,
          familyType: payload.familyType,
          fatherOccupation: payload.fatherOccupation,
          motherOccupation: payload.motherOccupation,
          brothersCount: payload.brothersCount,
          sistersCount: payload.sistersCount,
        })
        .onConflictDoUpdate({
          target: familyDetails.profileId,
          set: {
            familyValues: payload.familyValues,
            familyType: payload.familyType,
            fatherOccupation: payload.fatherOccupation,
            motherOccupation: payload.motherOccupation,
            brothersCount: payload.brothersCount,
            sistersCount: payload.sistersCount,
            updatedAt: new Date(),
          },
        });

      // 4. Upsert Lifestyle & Interests
      await tx
        .insert(lifestyleInterests)
        .values({
          profileId,
          diet: payload.diet,
          smoking: payload.smoking || 'Never',
          alcohol: payload.alcohol || 'Never',
          interests: payload.interests || [],
        })
        .onConflictDoUpdate({
          target: lifestyleInterests.profileId,
          set: {
            diet: payload.diet,
            smoking: payload.smoking || 'Never',
            alcohol: payload.alcohol || 'Never',
            interests: payload.interests || [],
            updatedAt: new Date(),
          },
        });

      // 5. Upsert Horoscope
      await tx
        .insert(horoscopes)
        .values({
          profileId,
          birthTime: payload.birthTime ?? null,
          birthPlace: payload.birthPlace ?? null,
          manglik: payload.manglik || "Don't Know",
          rashi: payload.rashi ?? null,
          nakshatra: payload.nakshatra ?? null,
          horoscopeS3Key: payload.horoscopeS3Key ?? null,
          horoscopeFileName: payload.horoscopeFileName ?? null,
          horoscopeFileSizeBytes: payload.horoscopeFileSizeBytes ?? null,
        })
        .onConflictDoUpdate({
          target: horoscopes.profileId,
          set: {
            birthTime: payload.birthTime ?? null,
            birthPlace: payload.birthPlace ?? null,
            manglik: payload.manglik || "Don't Know",
            rashi: payload.rashi ?? null,
            nakshatra: payload.nakshatra ?? null,
            horoscopeS3Key: payload.horoscopeS3Key ?? null,
            horoscopeFileName: payload.horoscopeFileName ?? null,
            horoscopeFileSizeBytes: payload.horoscopeFileSizeBytes ?? null,
            updatedAt: new Date(),
          },
        });

      // 6. Upsert Partner Preferences
      await tx
        .insert(partnerPreferences)
        .values({
          profileId,
          prefAgeMin: payload.prefAgeMin,
          prefAgeMax: payload.prefAgeMax,
          prefHeightMinCm: payload.prefHeightMinCm || 140,
          prefHeightMaxCm: payload.prefHeightMaxCm || 200,
          prefMaritalStatuses: payload.prefMaritalStatuses || ['Never Married'],
          prefReligions: payload.prefReligions.length > 0 ? payload.prefReligions : ['Hindu'],
          prefCastes: payload.prefCastes || [],
          prefMotherTongues: payload.prefMotherTongues || [],
          prefMinEducation: payload.prefMinEducation ?? null,
          prefAcceptableIncomes: payload.prefAcceptableIncomes || [],
          prefLocations: payload.prefLocations || [],
        })
        .onConflictDoUpdate({
          target: partnerPreferences.profileId,
          set: {
            prefAgeMin: payload.prefAgeMin,
            prefAgeMax: payload.prefAgeMax,
            prefHeightMinCm: payload.prefHeightMinCm || 140,
            prefHeightMaxCm: payload.prefHeightMaxCm || 200,
            prefMaritalStatuses: payload.prefMaritalStatuses || ['Never Married'],
            prefReligions: payload.prefReligions.length > 0 ? payload.prefReligions : ['Hindu'],
            prefCastes: payload.prefCastes || [],
            prefMotherTongues: payload.prefMotherTongues || [],
            prefMinEducation: payload.prefMinEducation ?? null,
            prefAcceptableIncomes: payload.prefAcceptableIncomes || [],
            prefLocations: payload.prefLocations || [],
            updatedAt: new Date(),
          },
        });

      // 7. Insert Photos
      if (payload.photoS3Keys && payload.photoS3Keys.length > 0) {
        // Clear previous photos if updating
        await tx.delete(profilePhotos).where(eq(profilePhotos.profileId, profileId));

        const photoRecords = payload.photoS3Keys.map((s3Key, index) => ({
          profileId,
          s3Key,
          isPrimary: index === 0,
          displayOrder: index,
          status: 'pending' as const,
        }));
        await tx.insert(profilePhotos).values(photoRecords);
      }

      // 8. Upsert Verification
      const method = payload.verificationMethod || 'selfie';
      const selfieS3Key = payload.selfieS3Key && payload.selfieS3Key.trim() !== '' ? payload.selfieS3Key : null;
      const govtIdType = payload.govtIdType && payload.govtIdType.trim() !== '' ? (payload.govtIdType as any) : null;
      const govtIdS3Key = payload.govtIdS3Key && payload.govtIdS3Key.trim() !== '' ? payload.govtIdS3Key : null;

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

      return {
        success: true,
        message: 'Profile registration completed successfully',
        profileId,
      };
    });
  }

  async updateMyProfile(userId: string, payload: Partial<CompleteRegistrationPayload>) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    const profileId = profile.id;

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
      if (payload.aboutMe !== undefined) profilesUpdate.aboutMe = payload.aboutMe;
      if (payload.city !== undefined) profilesUpdate.city = payload.city;
      if (payload.state !== undefined) profilesUpdate.state = payload.state;
      if (payload.country !== undefined) profilesUpdate.country = payload.country;
      if (payload.religion !== undefined) profilesUpdate.religion = payload.religion;
      if (payload.caste !== undefined) profilesUpdate.caste = payload.caste;
      if (payload.subcaste !== undefined) profilesUpdate.subcaste = payload.subcaste;
      if (payload.gotra !== undefined) profilesUpdate.gotra = payload.gotra;
      if (payload.motherTongue !== undefined) profilesUpdate.motherTongue = payload.motherTongue;
      if (payload.educationLevel !== undefined) profilesUpdate.educationLevel = payload.educationLevel;
      if (payload.degree !== undefined) profilesUpdate.degree = payload.degree;
      if (payload.collegeName !== undefined) profilesUpdate.collegeName = payload.collegeName;
      if (payload.employmentStatus !== undefined) profilesUpdate.employmentStatus = payload.employmentStatus;
      if (payload.profession !== undefined) profilesUpdate.profession = payload.profession;
      if (payload.companyName !== undefined) profilesUpdate.companyName = payload.companyName;
      if (payload.companySector !== undefined) profilesUpdate.companySector = payload.companySector;
      if (payload.annualIncome !== undefined) profilesUpdate.annualIncome = payload.annualIncome;
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

  async addPhoto(userId: string, s3Key: string) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, userId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');
    const profileId = profile.id;

    const existingPhotos = await this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId)).orderBy(asc(profilePhotos.displayOrder));
    const isPrimary = existingPhotos.length === 0;
    const maxOrder = existingPhotos.length > 0 ? existingPhotos[existingPhotos.length - 1].displayOrder + 1 : 0;

    await this.db.insert(profilePhotos).values({
      profileId,
      s3Key,
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

    return this.db.transaction(async (tx) => {
      for (let i = 0; i < photoIds.length; i++) {
        await tx.update(profilePhotos)
          .set({ displayOrder: i, isPrimary: i === 0 })
          .where(eq(profilePhotos.id, photoIds[i]));
      }
      return this.getMyProfile(userId);
    });
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

    const [family] = await this.db
      .select()
      .from(familyDetails)
      .where(eq(familyDetails.profileId, profile.id))
      .limit(1);

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

    const [verification] = await this.db
      .select()
      .from(verifications)
      .where(eq(verifications.profileId, profile.id))
      .limit(1);

    const photos = await this.db
      .select({
        id: profilePhotos.id,
        s3Key: profilePhotos.s3Key,
        isPrimary: profilePhotos.isPrimary,
        displayOrder: profilePhotos.displayOrder,
      })
      .from(profilePhotos)
      .where(eq(profilePhotos.profileId, profile.id))
      .orderBy(asc(profilePhotos.displayOrder));

    return {
      profile: profile as any,
      family: (family as any) || null,
      lifestyle: (lifestyle as any) || null,
      horoscope: (horoscope as any) || null,
      photos,
      verificationStatus: verification?.status || 'idle',
    };
  }

  async getProfileById(profileId: string, viewerUserId?: string): Promise<FullProfileView> {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    if (viewerUserId) {
      // Find viewer's profile id
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

    const [family] = await this.db
      .select()
      .from(familyDetails)
      .where(eq(familyDetails.profileId, profile.id))
      .limit(1);

    const [lifestyle] = await this.db
      .select()
      .from(lifestyleInterests)
      .where(eq(lifestyleInterests.profileId, profile.id))
      .limit(1);

    const [horoscopeRow] = await this.db
      .select()
      .from(horoscopes)
      .where(eq(horoscopes.profileId, profile.id))
      .limit(1);

    const [verification] = await this.db
      .select()
      .from(verifications)
      .where(eq(verifications.profileId, profile.id))
      .limit(1);

    const photos = await this.db
      .select({
        id: profilePhotos.id,
        s3Key: profilePhotos.s3Key,
        isPrimary: profilePhotos.isPrimary,
        displayOrder: profilePhotos.displayOrder,
      })
      .from(profilePhotos)
      .where(eq(profilePhotos.profileId, profile.id))
      .orderBy(asc(profilePhotos.displayOrder));

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

    let blurPhoto = false;

    // Only fetch blur settings and compute connection if viewer is not the profile owner
    if (viewerUserId && viewerUserId !== profile.userId) {
      const [setting] = await this.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, profile.userId))
        .limit(1);

      const photoBlurSetting = setting?.photoBlur || 'always';

      if (photoBlurSetting !== 'never') {
        blurPhoto = !isMutualConnect;
      }
    }

    const canViewHoroscope = isOwnProfile || (isMutualConnect && contactAccess.isMutualBenefit);

    const horoscopePayload =
      horoscopeRow && canViewHoroscope
        ? (horoscopeRow as any)
        : horoscopeRow
          ? {
              ...(horoscopeRow as any),
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
      profile: profile as any,
      family: (family as any) || null,
      lifestyle: (lifestyle as any) || null,
      horoscope: horoscopePayload,
      photos,
      verificationStatus: verification?.status || 'idle',
      blurPhoto,
      isMutualConnect,
      contactPhone: visiblePhone,
      hasHoroscope: Boolean(horoscopeRow?.horoscopeS3Key),
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
