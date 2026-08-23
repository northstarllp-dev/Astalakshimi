import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { plans } from '@astalakshimi/database';
import { eq, asc } from 'drizzle-orm';

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async onModuleInit() {
    await this.syncPlans();
  }

  async getActivePlans() {
    return this.db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.displayOrder));
  }

  private async syncPlans() {
    const defaultPlans = [
      {
        slug: 'free',
        name: 'Free',
        pricePaise: 0,
        durationDays: 36500,
        periodLabel: 'Forever',
        interestQuota: 30,
        contactUnlocks: 3,
        hasAdvancedFilters: false,
        hasPriorityListing: false,
        badge: null,
        tagline: 'Browse matches and send a few interests to get started.',
        isActive: true,
        displayOrder: 1,
      },
      {
        slug: 'silver',
        name: 'Silver',
        pricePaise: 29900, // ₹299
        durationDays: 90,
        periodLabel: '3 Months',
        interestQuota: 100,
        contactUnlocks: 10,
        hasAdvancedFilters: false,
        hasPriorityListing: false,
        badge: null,
        tagline: 'More interests, monthly contacts, and mutual details.',
        isActive: true,
        displayOrder: 2,
      },
      {
        slug: 'gold',
        name: 'Gold',
        pricePaise: 49900, // ₹499
        durationDays: 180,
        periodLabel: '6 Months',
        interestQuota: 500,
        contactUnlocks: 50,
        hasAdvancedFilters: true,
        hasPriorityListing: true,
        badge: 'Most popular',
        tagline: 'Advanced filters and priority listing for serious matching.',
        isActive: true,
        displayOrder: 3,
      },
      {
        slug: 'platinum',
        name: 'Platinum',
        pricePaise: 89900, // ₹899
        durationDays: 365,
        periodLabel: '12 Months',
        interestQuota: null, // unlimited
        contactUnlocks: null, // unlimited
        hasAdvancedFilters: true,
        hasPriorityListing: true,
        badge: 'Best value',
        tagline: 'Unlimited interests for a full year.',
        isActive: true,
        displayOrder: 4,
      },
      {
        slug: 'diamond',
        name: 'Diamond',
        pricePaise: 129900, // ₹1299
        durationDays: 36500,
        periodLabel: 'Until marriage',
        interestQuota: null, // unlimited
        contactUnlocks: null, // unlimited
        hasAdvancedFilters: true,
        hasPriorityListing: true,
        badge: 'Until you marry',
        tagline: 'Stay on the highest plan until you find your match.',
        isActive: true,
        displayOrder: 5,
      },
    ];

    for (const plan of defaultPlans) {
      const [existing] = await this.db.select().from(plans).where(eq(plans.slug, plan.slug)).limit(1);
      if (existing) {
        await this.db
          .update(plans)
          .set({
            name: plan.name,
            pricePaise: plan.pricePaise,
            durationDays: plan.durationDays,
            periodLabel: plan.periodLabel,
            interestQuota: plan.interestQuota,
            contactUnlocks: plan.contactUnlocks,
            hasAdvancedFilters: plan.hasAdvancedFilters,
            hasPriorityListing: plan.hasPriorityListing,
            badge: plan.badge,
            tagline: plan.tagline,
            isActive: plan.isActive,
            displayOrder: plan.displayOrder,
            updatedAt: new Date(),
          })
          .where(eq(plans.id, existing.id));
      } else {
        await this.db.insert(plans).values(plan);
      }
    }
  }
}

