import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { plans } from '@astalakshimi/database';
import { eq, asc } from 'drizzle-orm';

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async onModuleInit() {
    await this.seedPlansIfEmpty();
  }

  async getActivePlans() {
    return this.db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.displayOrder));
  }

  private async seedPlansIfEmpty() {
    const [existing] = await this.db.select().from(plans).limit(1);
    
    if (existing) {
      return; // Already seeded
    }

    const defaultPlans = [
      {
        slug: 'free',
        name: 'Free Basic',
        pricePaise: 0,
        durationDays: 365,
        periodLabel: 'Forever',
        interestQuota: 5,
        contactUnlocks: 0,
        hasAdvancedFilters: false,
        hasPriorityListing: false,
        badge: null,
        tagline: 'Get started for free',
        isActive: true,
        displayOrder: 1,
      },
      {
        slug: 'silver',
        name: 'Silver',
        pricePaise: 99900, // ₹999
        durationDays: 30,
        periodLabel: '1 Month',
        interestQuota: 20,
        contactUnlocks: 5,
        hasAdvancedFilters: true,
        hasPriorityListing: false,
        badge: null,
        tagline: 'Perfect for starters',
        isActive: true,
        displayOrder: 2,
      },
      {
        slug: 'gold',
        name: 'Gold',
        pricePaise: 249900, // ₹2499
        durationDays: 90,
        periodLabel: '3 Months',
        interestQuota: 100,
        contactUnlocks: 20,
        hasAdvancedFilters: true,
        hasPriorityListing: true,
        badge: 'Popular',
        tagline: 'Best value for money',
        isActive: true,
        displayOrder: 3,
      },
      {
        slug: 'diamond',
        name: 'Diamond',
        pricePaise: 499900, // ₹4999
        durationDays: 180,
        periodLabel: '6 Months',
        interestQuota: null, // unlimited
        contactUnlocks: 50,
        hasAdvancedFilters: true,
        hasPriorityListing: true,
        badge: 'Premium',
        tagline: 'Maximum visibility & matches',
        isActive: true,
        displayOrder: 4,
      }
    ];

    await this.db.insert(plans).values(defaultPlans);
    console.log('Seeded default subscription plans');
  }
}

