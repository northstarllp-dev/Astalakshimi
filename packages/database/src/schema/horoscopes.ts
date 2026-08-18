import { pgTable, uuid, varchar, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const manglikStatusEnum = pgEnum('manglik_status', ['Yes', 'No', "Don't Know", 'Both']);

export const horoscopes = pgTable('horoscopes', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),

  // Birth Details
  birthTime: varchar('birth_time', { length: 20 }), // e.g. "10:45 AM"
  birthPlace: varchar('birth_place', { length: 100 }), // City of birth

  // Astrology Attributes
  manglik: manglikStatusEnum('manglik').default("Don't Know").notNull(),
  rashi: varchar('rashi', { length: 50 }),
  nakshatra: varchar('nakshatra', { length: 50 }),

  // Kundli / Horoscope PDF in S3
  horoscopeS3Key: varchar('horoscope_s3_key', { length: 500 }),
  horoscopeFileName: varchar('horoscope_file_name', { length: 255 }),
  horoscopeFileSizeBytes: integer('horoscope_file_size_bytes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Horoscope = typeof horoscopes.$inferSelect;
export type NewHoroscope = typeof horoscopes.$inferInsert;
