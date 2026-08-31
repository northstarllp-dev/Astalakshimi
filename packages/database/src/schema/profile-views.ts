import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const profileViews = pgTable(
  'profile_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    viewerProfileId: uuid('viewer_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    targetProfileId: uuid('target_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Unique index for the day could be useful, but let's just index on viewer and target for now
    uniqueIndex('profile_views_viewer_target_idx').on(table.viewerProfileId, table.targetProfileId),
  ]
);

export type ProfileView = typeof profileViews.$inferSelect;
export type NewProfileView = typeof profileViews.$inferInsert;
