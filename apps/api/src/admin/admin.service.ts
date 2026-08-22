import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, users, subscriptions, verifications } from '@astalakshimi/database';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class AdminService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

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
        submittedAt: verifications.createdAt,
      })
      .from(verifications)
      .where(eq(verifications.status, 'pending'));
  }

  async updateVerificationStatus(profileId: string, status: 'verified' | 'rejected') {
    const [updated] = await this.db
      .update(verifications)
      .set({ status })
      .where(eq(verifications.profileId, profileId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Verification request not found for this profile');
    }

    return updated;
  }
}
