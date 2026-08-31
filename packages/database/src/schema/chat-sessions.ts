import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    profile1Id: uuid('profile1_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    profile2Id: uuid('profile2_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    isBlocked: boolean('is_blocked').default(false).notNull(),
    blockedReason: varchar('blocked_reason', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('chat_sessions_profiles_idx').on(table.profile1Id, table.profile2Id),
  ]
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
