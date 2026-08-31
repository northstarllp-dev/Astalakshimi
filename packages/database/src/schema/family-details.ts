import { pgTable, uuid, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const familyValuesEnum = pgEnum('family_values', ['Traditional', 'Moderate', 'Liberal']);
export const familyTypeEnum = pgEnum('family_type', ['Nuclear', 'Joint', 'Extended']);
export const parentOccupationEnum = pgEnum('parent_occupation', [
  'Employed',
  'Business',
  'Retired',
  'Homemaker',
  'Passed Away',
]);

export const familyDetails = pgTable('family_details', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),

  familyValues: familyValuesEnum('family_values').notNull(),
  familyType: familyTypeEnum('family_type').notNull(),

  // Parents' Occupations
  fatherOccupation: parentOccupationEnum('father_occupation').notNull(),
  motherOccupation: parentOccupationEnum('mother_occupation').notNull(),

  // Sibling Counters ([-] N [+])
  brothersCount: integer('brothers_count').default(0).notNull(),
  sistersCount: integer('sisters_count').default(0).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type FamilyDetails = typeof familyDetails.$inferSelect;
export type NewFamilyDetails = typeof familyDetails.$inferInsert;
