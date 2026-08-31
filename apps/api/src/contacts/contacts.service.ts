import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { unlockedContacts, profiles, users, profilePhotos } from '@astalakshimi/database';
import { eq, desc, and } from 'drizzle-orm';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class ContactsService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly entitlementsService: EntitlementsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  getUsage(userId: string) {
    return this.entitlementsService.getUsage(userId);
  }

  unlock(userId: string, targetProfileId: string) {
    return this.entitlementsService.unlockContactWithQuota(userId, targetProfileId);
  }

  createPaidUnlockOrder(userId: string, targetProfileId: string) {
    return this.paymentsService.createContactUnlockOrder(userId, targetProfileId);
  }

  verifyPaidUnlock(
    userId: string,
    targetProfileId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ) {
    return this.paymentsService.verifyContactUnlockPayment(
      userId,
      targetProfileId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
  }

  async listUnlocked(userId: string) {
    const [viewer] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!viewer) {
      throw new NotFoundException('Profile not found');
    }

    const rows = await this.db
      .select({
        unlockedAt: unlockedContacts.createdAt,
        profile: profiles,
        phone: users.phone,
        photo: profilePhotos.s3Key,
      })
      .from(unlockedContacts)
      .innerJoin(profiles, eq(unlockedContacts.unlockedProfileId, profiles.id))
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(
        profilePhotos,
        and(eq(profilePhotos.profileId, profiles.id), eq(profilePhotos.isPrimary, true)),
      )
      .where(eq(unlockedContacts.unlockerProfileId, viewer.id))
      .orderBy(desc(unlockedContacts.createdAt));

    return rows.map((row) => {
      const dob = row.profile.dob ? new Date(row.profile.dob) : null;
      const age = dob
        ? Math.floor((Date.now() - dob.getTime()) / 31557600000)
        : null;

      return {
        profileId: row.profile.id,
        fullName: row.profile.fullName,
        age,
        city: row.profile.city,
        state: row.profile.state,
        caste: row.profile.caste,
        educationLevel: row.profile.educationLevel,
        profession: row.profile.profession,
        photo: row.photo,
        phone: row.phone,
        unlockedAt: row.unlockedAt,
      };
    });
  }
}
