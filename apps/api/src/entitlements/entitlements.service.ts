import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { subscriptions, plans, profiles, users, unlockedContacts, chatSessions } from '@astalakshimi/database';
import { eq, and, gt, gte, isNull, sql } from 'drizzle-orm';

export const EXTRA_CONTACT_FEE_PAISE = 2900;

export type ContactAccess = {
  canView: boolean;
  isUnlocked: boolean;
  isMutualBenefit: boolean;
  limit: number | null;
  usedThisMonth: number;
  remaining: number | null;
  canUnlockWithQuota: boolean;
  canPayExtra: boolean;
  extraContactFeePaise: number;
  planSlug: string;
};

@Injectable()
export class EntitlementsService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getUserPlan(userId: string) {
    const activeSub = await this.db
      .select({
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, 'active'),
          gt(subscriptions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (activeSub.length === 0) {
      return {
        slug: 'free',
        interestQuota: 30,
        contactUnlocks: 3,
        hasAdvancedFilters: false,
        hasPriorityListing: false,
      };
    }

    return activeSub[0].plan;
  }

  hasMutualContactBenefit(plan: { slug?: string | null }) {
    return Boolean(plan.slug && plan.slug !== 'free');
  }

  async checkEntitlement(userId: string, feature: 'advanced_filters' | 'priority_listing' | 'premium_matches') {
    const plan = await this.getUserPlan(userId);

    switch (feature) {
      case 'advanced_filters':
        return plan.hasAdvancedFilters;
      case 'priority_listing':
        return plan.hasPriorityListing;
      case 'premium_matches':
        return plan.slug !== 'free';
      default:
        return false;
    }
  }

  async isContactUnlocked(unlockerProfileId: string, unlockedProfileId: string): Promise<boolean> {
    const records = await this.db
      .select()
      .from(unlockedContacts)
      .where(
        and(
          eq(unlockedContacts.unlockerProfileId, unlockerProfileId),
          eq(unlockedContacts.unlockedProfileId, unlockedProfileId)
        )
      )
      .limit(1);

    return records.length > 0;
  }

  async getMonthlyContactUnlockCount(unlockerProfileId: string): Promise<number> {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [row] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(unlockedContacts)
      .where(
        and(
          eq(unlockedContacts.unlockerProfileId, unlockerProfileId),
          isNull(unlockedContacts.paymentId),
          gte(unlockedContacts.createdAt, monthStart)
        )
      );

    return Number(row?.count ?? 0);
  }

  async getContactUnlockStatus(
    userId: string,
    targetProfileId: string,
    isMutualConnect = false,
  ): Promise<ContactAccess> {
    const plan = await this.getUserPlan(userId);
    const limit = plan.contactUnlocks ?? null;
    const isMutualBenefit = this.hasMutualContactBenefit(plan);

    const [viewerProfile] = await this.db
      .select({ id: profiles.id, userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!viewerProfile) {
      return {
        canView: false,
        isUnlocked: false,
        isMutualBenefit,
        limit,
        usedThisMonth: 0,
        remaining: limit,
        canUnlockWithQuota: false,
        canPayExtra: false,
        extraContactFeePaise: EXTRA_CONTACT_FEE_PAISE,
        planSlug: plan.slug,
      };
    }

    const isUnlocked = await this.isContactUnlocked(viewerProfile.id, targetProfileId);
    const usedThisMonth = await this.getMonthlyContactUnlockCount(viewerProfile.id);
    const remaining = limit === null ? null : Math.max(0, limit - usedThisMonth);
    const canUnlockWithQuota = !isUnlocked && (limit === null || (remaining !== null && remaining > 0));
    const canPayExtra = !isUnlocked && !canUnlockWithQuota && limit !== null;
    const canView = isUnlocked || (isMutualConnect && isMutualBenefit);

    return {
      canView,
      isUnlocked,
      isMutualBenefit,
      limit,
      usedThisMonth,
      remaining,
      canUnlockWithQuota,
      canPayExtra,
      extraContactFeePaise: EXTRA_CONTACT_FEE_PAISE,
      planSlug: plan.slug,
    };
  }

  async getUsage(userId: string) {
    const plan = await this.getUserPlan(userId);
    const limit = plan.contactUnlocks ?? null;

    const [viewerProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const usedThisMonth = viewerProfile
      ? await this.getMonthlyContactUnlockCount(viewerProfile.id)
      : 0;
    const remaining = limit === null ? null : Math.max(0, limit - usedThisMonth);

    return {
      planSlug: plan.slug,
      limit,
      usedThisMonth,
      remaining,
      extraContactFeePaise: EXTRA_CONTACT_FEE_PAISE,
      canPayExtra: limit !== null && remaining === 0,
    };
  }

  async unlockContactWithQuota(userId: string, targetProfileId: string) {
    const [viewerProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!viewerProfile) {
      throw new NotFoundException('Your profile was not found. Complete registration first.');
    }

    const [target] = await this.db
      .select({ id: profiles.id, userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, targetProfileId))
      .limit(1);

    if (!target) {
      throw new NotFoundException('Profile not found');
    }

    if (target.id === viewerProfile.id) {
      throw new BadRequestException('You cannot unlock your own contact.');
    }

    const already = await this.isContactUnlocked(viewerProfile.id, target.id);
    const [owner] = await this.db
      .select({ phone: users.phone })
      .from(users)
      .where(eq(users.id, target.userId))
      .limit(1);

    if (already) {
      const status = await this.getContactUnlockStatus(userId, target.id, false);
      return {
        success: true,
        alreadyUnlocked: true,
        contactPhone: owner?.phone ?? null,
        remaining: status.remaining,
      };
    }

    const status = await this.getContactUnlockStatus(userId, target.id, false);
    if (!status.canUnlockWithQuota) {
      throw new ForbiddenException(
        status.canPayExtra
          ? `You have used all ${status.limit} contact unlocks this month. Pay ₹${EXTRA_CONTACT_FEE_PAISE / 100} to unlock this contact or upgrade your plan.`
          : 'You cannot unlock this contact on your current plan.',
      );
    }

    await this.db.insert(unlockedContacts).values({
      unlockerProfileId: viewerProfile.id,
      unlockedProfileId: target.id,
    });

    const remaining =
      status.remaining === null ? null : Math.max(0, status.remaining - 1);

    return {
      success: true,
      alreadyUnlocked: false,
      contactPhone: owner?.phone ?? null,
      remaining,
    };
  }

  async isChatBlocked(profile1Id: string, profile2Id: string): Promise<boolean> {
    const sessions = await this.db
      .select()
      .from(chatSessions)
      .where(
        and(
          eq(chatSessions.profile1Id, profile1Id),
          eq(chatSessions.profile2Id, profile2Id)
        )
      )
      .limit(1);

    if (sessions.length === 0) return false;
    return sessions[0].isBlocked;
  }
}
