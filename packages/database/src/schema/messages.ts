import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: varchar('thread_id', { length: 255 }).notNull(),
    senderProfileId: uuid('sender_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    receiverProfileId: uuid('receiver_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('messages_thread_idx').on(table.threadId),
    index('messages_sender_receiver_idx').on(table.senderProfileId, table.receiverProfileId),
  ]
);

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
