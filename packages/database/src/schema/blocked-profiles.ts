import {
  pgTable,
  uuid,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const blockedProfiles = pgTable(
  'blocked_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('blocked_profiles_blocker_blocked_idx').on(table.blockerId, table.blockedId),
  ]
);

export type BlockedProfile = typeof blockedProfiles.$inferSelect;
export type NewBlockedProfile = typeof blockedProfiles.$inferInsert;
