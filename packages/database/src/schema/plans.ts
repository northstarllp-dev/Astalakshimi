import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  boolean,
  text,
} from 'drizzle-orm/pg-core';

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 20 }).notNull().unique(), // free, silver, gold, platinum, diamond
  name: varchar('name', { length: 50 }).notNull(),
  pricePaise: integer('price_paise').notNull(),
  durationDays: integer('duration_days').notNull(),
  periodLabel: varchar('period_label', { length: 50 }).notNull(),
  interestQuota: integer('interest_quota'), // null = unlimited
  contactUnlocks: integer('contact_unlocks'), // null = unlimited
  hasAdvancedFilters: boolean('has_advanced_filters').default(false).notNull(),
  hasPriorityListing: boolean('has_priority_listing').default(false).notNull(),
  badge: varchar('badge', { length: 50 }),
  tagline: text('tagline').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Plan = typeof plans.$inferSelect;
export type NewPlan = typeof plans.$inferInsert;
