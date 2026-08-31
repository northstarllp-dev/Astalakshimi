import { pgTable, uuid, integer, varchar, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const partnerPreferences = pgTable('partner_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),

  // Basic Filters
  prefAgeMin: integer('pref_age_min').default(21).notNull(),
  prefAgeMax: integer('pref_age_max').default(32).notNull(),
  prefHeightMinCm: integer('pref_height_min_cm').default(140).notNull(), // e.g. 4'8" (140 cm)
  prefHeightMaxCm: integer('pref_height_max_cm').default(200).notNull(), // e.g. 6'6" (200 cm)

  // Status Filters
  prefMaritalStatuses: jsonb('pref_marital_statuses').$type<string[]>().default(['Never Married']).notNull(),

  // Background Filters (Auto-filled to match user's values, but editable)
  prefReligions: jsonb('pref_religions').$type<string[]>().default(['Hindu']).notNull(),
  prefCastes: jsonb('pref_castes').$type<string[]>().default([]).notNull(),
  prefMotherTongues: jsonb('pref_mother_tongues').$type<string[]>().default([]).notNull(),

  // Professional Filters
  prefMinEducation: varchar('pref_min_education', { length: 50 }), // e.g. "Bachelors"
  prefAcceptableIncomes: jsonb('pref_acceptable_incomes').$type<string[]>().default([]).notNull(),

  // Location Filters (Captured from Landing Page / in-app preferences)
  prefLocations: jsonb('pref_locations').$type<string[]>().default([]).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PartnerPreference = typeof partnerPreferences.$inferSelect;
export type NewPartnerPreference = typeof partnerPreferences.$inferInsert;
