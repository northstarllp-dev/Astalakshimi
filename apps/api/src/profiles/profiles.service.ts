import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import {
  profiles,
  familyDetails,
  lifestyleInterests,
  horoscopes,
  partnerPreferences,
  profilePhotos,
  verifications,
} from '@astalakshimi/database';
import { eq, asc } from 'drizzle-orm';
import type { CompleteRegistrationPayload, FullProfileView } from '@astalakshimi/types';

@Injectable()
export class ProfilesService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

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
      await tx
        .insert(verifications)
        .values({
          profileId,
          method: payload.verificationMethod,
          selfieS3Key: payload.selfieS3Key ?? null,
          govtIdType: payload.govtIdType ?? null,
          govtIdS3Key: payload.govtIdS3Key ?? null,
          status: 'pending',
        })
        .onConflictDoUpdate({
          target: verifications.profileId,
          set: {
            method: payload.verificationMethod,
            selfieS3Key: payload.selfieS3Key ?? null,
            govtIdType: payload.govtIdType ?? null,
            govtIdS3Key: payload.govtIdS3Key ?? null,
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

  async getProfileById(profileId: string): Promise<FullProfileView> {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
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
}
