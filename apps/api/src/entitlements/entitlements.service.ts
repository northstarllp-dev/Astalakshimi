import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { subscriptions, plans } from '@astalakshimi/database';
import { eq, and, gt } from 'drizzle-orm';
import { unlockedContacts, chatSessions } from '@astalakshimi/database';
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
      // Return free plan rules
      return {
        slug: 'free',
        interestQuota: 30, // 30 interests / month
        contactUnlocks: 3,  // 3 contact unlocks
        hasAdvancedFilters: false,
        hasPriorityListing: false,
      };
    }

    return activeSub[0].plan;
  }

  async checkEntitlement(userId: string, feature: 'advanced_filters' | 'priority_listing' | 'premium_matches') {
    const plan = await this.getUserPlan(userId);

    switch (feature) {
      case 'advanced_filters':
        return plan.hasAdvancedFilters;
      case 'priority_listing':
        return plan.hasPriorityListing;
      case 'premium_matches':
        return plan.slug !== 'free'; // any paid plan
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
