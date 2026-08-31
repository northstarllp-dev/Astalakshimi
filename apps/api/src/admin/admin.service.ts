import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, subscriptions, verifications, profilePhotos } from '@astalakshimi/database';
import { eq, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly notificationsService: NotificationsService
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
    const [updated] = await this.db
      .update(verifications)
      .set({ status, rejectionReason })
      .where(eq(verifications.profileId, profileId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Verification request not found for this profile');
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
        id: profiles.id,
        fullName: profiles.fullName,
        city: profiles.city,
        phone: users.phone,
        status: verifications.status,
        submittedAt: profiles.createdAt,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(verifications, eq(profiles.id, verifications.profileId));

    return records.map(r => ({
      ...r,
      verificationStatus: r.status || 'idle',
      activeSubscription: false,
      completeness: 80,
      photos: [],
    }));
  }

  async getProfile(profileId: string) {
    const profileRecords = await this.db.select().from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');
    const p = profileRecords[0];

    const userRecords = await this.db.select().from(users).where(eq(users.id, p.userId));
    const u = userRecords[0];

    const verificationRecords = await this.db.select().from(verifications).where(eq(verifications.profileId, profileId));
    const v = verificationRecords[0] || {};
    
    const dbPhotos = await this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId));
    const mappedPhotos = dbPhotos.map(ph => ({
      id: ph.id,
      s3Key: ph.s3Key,
      isPrimary: ph.isPrimary,
      displayOrder: ph.displayOrder,
      status: ph.status,
    })).sort((a, b) => a.displayOrder - b.displayOrder);
    
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
      dobDay: '01', dobMonth: '01', dobYear: '2000',
      maritalStatus: p.maritalStatus,
      brothersCount: 0, sistersCount: 0,
      aboutMe: p.aboutMe || '',
      verificationMethod: v.method || '',
      verificationStatus: v.status || 'pending',
      selfieS3Key: v.selfieS3Key,
      govtIdType: v.govtIdType,
      govtIdS3Key: v.govtIdS3Key,
      horoscopeName: '', birthTime: '', birthPlace: '', rashi: '', star: '', manglik: '',
      photos: mappedPhotos,
      completeness: 80,
      createdBy: 'self',
      accountStatus: u.status,
      submittedAt: v.updatedAt || p.createdAt,
      activeSubscription: false
    };
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
