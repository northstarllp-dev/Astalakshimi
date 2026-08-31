import { pgTable, uuid, varchar, boolean, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const photoStatusEnum = pgEnum('photo_status', ['pending', 'approved', 'rejected']);

export const profilePhotos = pgTable('profile_photos', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),

  s3Key: varchar('s3_key', { length: 500 }).notNull(), // profiles/{userId}/photos/{uuid}.webp
  isPrimary: boolean('is_primary').default(false).notNull(),
  displayOrder: integer('display_order').default(0).notNull(), // 0 = primary, 1-4 = additional
  status: photoStatusEnum('status').default('pending').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  profilePhotoIdx: index('profile_photos_profile_idx').on(table.profileId, table.displayOrder),
}));

export type ProfilePhoto = typeof profilePhotos.$inferSelect;
export type NewProfilePhoto = typeof profilePhotos.$inferInsert;
