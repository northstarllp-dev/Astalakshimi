import { pgTable, uuid, jsonb, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const dietEnum = pgEnum('diet', ['Vegetarian', 'Non-vegetarian', 'Eggetarian', 'Jain', 'Vegan']);
export const habitFrequencyEnum = pgEnum('habit_frequency', ['Never', 'Occasionally', 'Regularly', 'Planning to quit']);

export const lifestyleInterests = pgTable('lifestyle_interests', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),

  diet: dietEnum('diet').notNull(),
  smoking: habitFrequencyEnum('smoking').default('Never').notNull(),
  alcohol: habitFrequencyEnum('alcohol').default('Never').notNull(),

  // Curated tag cloud (e.g., ["✈️ Travel", "📚 Reading", "🍳 Cooking", "🐕 Pets", "🏏 Cricket"])
  interests: jsonb('interests').$type<string[]>().default([]).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type LifestyleInterests = typeof lifestyleInterests.$inferSelect;
export type NewLifestyleInterests = typeof lifestyleInterests.$inferInsert;
