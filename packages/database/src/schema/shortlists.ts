import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const shortlists = pgTable(
  'shortlists',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    targetProfileId: uuid('target_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('shortlists_profile_target_idx').on(table.profileId, table.targetProfileId),
  ]
);

export type Shortlist = typeof shortlists.$inferSelect;
export type NewShortlist = typeof shortlists.$inferInsert;
