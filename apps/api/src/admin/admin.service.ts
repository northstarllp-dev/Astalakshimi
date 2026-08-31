import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import {
  profiles,
  users,
  subscriptions,
  verifications,
  profilePhotos,
  familyDetails,
  lifestyleInterests,
  horoscopes,
  partnerPreferences,
  userSettings,
} from '@astalakshimi/database';
import { eq, inArray, and, sql } from 'drizzle-orm';
import type { AdminCreateProfileInput } from '@astalakshimi/validation';
import { NotificationsService } from '../notifications/notifications.service';
import { S3Provider } from '../media/providers/s3.provider';
import { calculateProfileCompleteness } from './profile-completeness';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly notificationsService: NotificationsService,
    private readonly s3Provider: S3Provider,
  ) {}

  async getStats() {
    const totalUsers = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    const totalProfiles = await this.db.select({ count: sql<number>`count(*)` }).from(profiles);
    const activeSubscriptions = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'));
    const pendingVerifications = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(verifications)
      .where(eq(verifications.status, 'pending'));

    return {
      totalUsers: totalUsers[0]?.count || 0,
      totalProfiles: totalProfiles[0]?.count || 0,
      activeSubscriptions: activeSubscriptions[0]?.count || 0,
      pendingVerifications: pendingVerifications[0]?.count || 0,
    };
  }

  async getPendingVerifications() {
    return this.db
      .select({
        id: verifications.id,
        profileId: verifications.profileId,
        method: verifications.method,
        selfieS3Key: verifications.selfieS3Key,
        govtIdType: verifications.govtIdType,
        govtIdS3Key: verifications.govtIdS3Key,
        submittedAt: verifications.updatedAt,
        fullName: profiles.fullName,
        city: profiles.city,
        phone: users.phone,
      })
      .from(verifications)
      .innerJoin(profiles, eq(verifications.profileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .where(eq(verifications.status, 'pending'));
  }

  async updateVerificationStatus(profileId: string, status: 'verified' | 'rejected', rejectionReason?: string) {
    let [updated] = await this.db
      .update(verifications)
      .set({ status, rejectionReason })
      .where(eq(verifications.profileId, profileId))
      .returning();

    if (!updated) {
      const [inserted] = await this.db.insert(verifications).values({
        profileId,
        status,
        rejectionReason,
        method: 'govt_id',
      }).returning();
      updated = inserted;
    }

    const [profile] = await this.db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.id, profileId));

    if (profile) {
      await this.notificationsService.createNotification({
        userId: profile.userId,
        title: status === 'verified' ? 'Profile Verified!' : 'Verification Rejected',
        body: status === 'verified' 
          ? 'Your profile has been approved and is now live.' 
          : `Your profile verification was rejected. Reason: ${rejectionReason || 'Please contact support.'}`,
        category: 'account',
        kind: 'verification',
        href: '/profile/edit',
      });
    }

    return updated;
  }

  async getAllProfiles() {
    const records = await this.db
      .select({
        profile: profiles,
        phone: users.phone,
        accountStatus: users.status,
        verificationStatus: verifications.status,
        submittedAt: verifications.updatedAt,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(verifications, eq(profiles.id, verifications.profileId))
      .orderBy(sql`"profiles"."created_at" DESC`);

    if (!records.length) return [];

    const profileIds = records.map((r) => r.profile.id);

    const [dbPhotos, dbHoroscopes, dbFamily, dbLifestyle, dbPreferences, activeSubs] = await Promise.all([
      this.db
        .select()
        .from(profilePhotos)
        .where(inArray(profilePhotos.profileId, profileIds)),
      this.db
        .select()
        .from(horoscopes)
        .where(inArray(horoscopes.profileId, profileIds)),
      this.db
        .select()
        .from(familyDetails)
        .where(inArray(familyDetails.profileId, profileIds)),
      this.db
        .select()
        .from(lifestyleInterests)
        .where(inArray(lifestyleInterests.profileId, profileIds)),
      this.db
        .select()
        .from(partnerPreferences)
        .where(inArray(partnerPreferences.profileId, profileIds)),
      this.db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active')),
    ]);

    const photosByProfile = new Map<string, typeof dbPhotos>();
    for (const photo of dbPhotos) {
      const list = photosByProfile.get(photo.profileId) ?? [];
      list.push(photo);
      photosByProfile.set(photo.profileId, list);
    }

    const horoscopeByProfile = new Map(dbHoroscopes.map((h) => [h.profileId, h]));
    const familyByProfile = new Map(dbFamily.map((f) => [f.profileId, f]));
    const lifestyleByProfile = new Map(dbLifestyle.map((l) => [l.profileId, l]));
    const prefByProfile = new Map(dbPreferences.map((p) => [p.profileId, p]));
    const activeUserIds = new Set(activeSubs.map((s) => s.userId));

    return records.map((r) => {
      const p = r.profile;
      const profilePhotosList = (photosByProfile.get(p.id) ?? []).sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      const horoscope = horoscopeByProfile.get(p.id);
      const verificationStatus = r.verificationStatus || 'idle';

      return {
        id: p.id,
        fullName: p.fullName,
        gender: p.gender,
        city: p.city,
        phone: r.phone,
        verificationStatus,
        accountStatus: r.accountStatus,
        createdBy: 'self' as const,
        submittedAt: r.submittedAt || p.createdAt,
        activeSubscription: activeUserIds.has(p.userId),
        completeness: calculateProfileCompleteness({
          profile: p,
          userPhone: r.phone,
          family: familyByProfile.get(p.id),
          lifestyle: lifestyleByProfile.get(p.id),
          horoscope: horoscope,
          preferences: prefByProfile.get(p.id),
          photoCount: profilePhotosList.length,
          verificationStatus,
          submittedAt: r.submittedAt || p.createdAt,
        }),
        photos: profilePhotosList.map((ph) => ({
          id: ph.id,
          s3Key: ph.s3Key,
          isPrimary: ph.isPrimary,
          status: ph.status,
        })),
      };
    });
  }

  async getProfile(profileId: string) {
    const profileRecords = await this.db.select().from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');
    const p = profileRecords[0];

    const userRecords = await this.db.select().from(users).where(eq(users.id, p.userId));
    const u = userRecords[0];

    const verificationRecords = await this.db.select().from(verifications).where(eq(verifications.profileId, profileId));
    const v = verificationRecords[0];

    const [dbPhotos, horoscopeRecords, familyRecords, lifestyleRecords, prefRecords, activeSub] = await Promise.all([
      this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId)),
      this.db.select().from(horoscopes).where(eq(horoscopes.profileId, profileId)),
      this.db.select().from(familyDetails).where(eq(familyDetails.profileId, profileId)),
      this.db.select().from(lifestyleInterests).where(eq(lifestyleInterests.profileId, profileId)),
      this.db.select().from(partnerPreferences).where(eq(partnerPreferences.profileId, profileId)),
      this.db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, p.userId), eq(subscriptions.status, 'active')))
        .limit(1),
    ]);

    const mappedPhotos = dbPhotos
      .map((ph) => ({
        id: ph.id,
        s3Key: ph.s3Key,
        isPrimary: ph.isPrimary,
        displayOrder: ph.displayOrder,
        status: ph.status,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const h = horoscopeRecords[0];
    const fam = familyRecords[0];
    const ls = lifestyleRecords[0];
    const pref = prefRecords[0];
    
    const dobParts = p.dob ? String(p.dob).split('-') : [];
    const verificationStatus = v?.status || 'idle';

    return {
      id: p.id,
      phone: u.phone,
      profileFor: p.profileFor,
      fullName: p.fullName,
      gender: p.gender,
      city: p.city,
      state: p.state,
      religion: p.religion,
      caste: p.caste,
      motherTongue: p.motherTongue,
      dobDay: dobParts[2] || '01',
      dobMonth: dobParts[1] || '01',
      dobYear: dobParts[0] || '2000',
      maritalStatus: p.maritalStatus,
      brothersCount: fam?.brothersCount || 0,
      sistersCount: fam?.sistersCount || 0,
      aboutMe: p.aboutMe,
      completeness: calculateProfileCompleteness({
        profile: p,
        userPhone: u.phone,
        family: fam,
        lifestyle: ls,
        horoscope: h,
        preferences: pref,
        photoCount: mappedPhotos.length,
        verificationStatus,
        submittedAt: v?.updatedAt || p.createdAt,
      }),
      createdBy: 'self' as const,
      accountStatus: u.status,
      verificationStatus,
      submittedAt: v?.updatedAt || p.createdAt,
      activeSubscription: activeSub.length > 0,
    };
  }

  async createProfile(input: AdminCreateProfileInput) {
    const phone = input.phone.replace(/\s+/g, '');
    const [existingUser] = await this.db.select().from(users).where(eq(users.phone, phone)).limit(1);

    if (existingUser) {
      const [existingProfile] = await this.db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, existingUser.id))
        .limit(1);
      if (existingProfile) {
        throw new ConflictException('This mobile number is already registered.');
      }
    }

    const month = input.dobMonth.padStart(2, '0');
    const day = input.dobDay.padStart(2, '0');
    const dobStr = `${input.dobYear}-${month}-${day}`;
    const heightCm = input.gender === 'Male' ? 172 : 160;
    const now = new Date();

    const profileId = await this.db.transaction(async (tx) => {
      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        await tx
          .update(users)
          .set({
            isPhoneVerified: true,
            consentAccepted: true,
            consentTimestamp: now,
            status: 'active',
            updatedAt: now,
          })
          .where(eq(users.id, userId));
      } else {
        const [newUser] = await tx
          .insert(users)
          .values({
            phone,
            isPhoneVerified: true,
            consentAccepted: true,
            consentTimestamp: now,
            role: 'member',
            status: 'active',
          })
          .returning();
        userId = newUser.id;
      }

      const [newProfile] = await tx
        .insert(profiles)
        .values({
          userId,
          profileFor: input.profileFor,
          fullName: input.fullName.trim(),
          gender: input.gender,
          dob: dobStr,
          maritalStatus: input.maritalStatus,
          heightCm,
          aboutMe: input.aboutMe?.trim() || 'Profile created by staff on behalf of the family.',
          city: input.city.trim(),
          state: input.state?.trim() || 'Tamil Nadu',
          country: 'India',
          religion: input.religion,
          caste: input.caste.trim(),
          motherTongue: input.motherTongue,
          educationLevel: 'Bachelors',
          degree: 'Not specified',
          employmentStatus: 'Employed',
          profession: 'Not specified',
          annualIncome: 'Prefer not to say',
          photoPrivacy: 'visible',
        })
        .returning();

      const id = newProfile.id;

      await tx.insert(familyDetails).values({
        profileId: id,
        familyValues: 'Moderate',
        familyType: 'Nuclear',
        fatherOccupation: 'Employed',
        motherOccupation: 'Homemaker',
        brothersCount: input.brothersCount,
        sistersCount: input.sistersCount,
      });

      await tx.insert(lifestyleInterests).values({
        profileId: id,
        diet: 'Vegetarian',
        smoking: 'Never',
        alcohol: 'Never',
        interests: [],
      });

      await tx.insert(horoscopes).values({
        profileId: id,
        manglik: "Don't Know",
      });

      await tx.insert(partnerPreferences).values({
        profileId: id,
        prefReligions: [input.religion],
        prefCastes: [input.caste.trim()],
        prefMotherTongues: [input.motherTongue],
        prefLocations: [input.city.trim()],
      });

      await tx.insert(userSettings).values({ userId }).onConflictDoNothing();

      await tx.insert(verifications).values({
        profileId: id,
        method: 'selfie',
        status: 'verified',
        reviewedAt: now,
      });

      return id;
    });

    return this.getProfile(profileId);
  }

  async uploadAdminPhoto(profileId: string, buffer: Buffer, contentType: string, fileSize: number) {
    const [profile] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    const { s3Key, bucket } = await this.s3Provider.generateUploadUrl(
      profile.userId,
      'profile_photo',
      contentType,
      fileSize
    );

    await this.s3Provider.putObject(s3Key, buffer, contentType, bucket);
    
    return { s3Key };
  }

  async attachPhotos(profileId: string, s3Keys: string[]) {
    const [profile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId)).limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    const existing = await this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId));
    const startOrder = existing.length;

    await this.db.insert(profilePhotos).values(
      s3Keys.map((s3Key, index) => ({
        profileId,
        s3Key,
        isPrimary: existing.length === 0 && index === 0,
        displayOrder: startOrder + index,
        status: 'approved' as const,
      })),
    );

    return this.getProfile(profileId);
  }

  async deleteProfile(profileId: string) {
    const profileRecords = await this.db.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');
    
    const userId = profileRecords[0].userId;
    
    // Delete the user, which should cascade and delete the profile, photos, verifications, etc.
    await this.db.delete(users).where(eq(users.id, userId));
    return { success: true };
  }
}
