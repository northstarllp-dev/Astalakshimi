import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const interestStatusEnum = pgEnum('interest_status', [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
]);

export const interests = pgTable(
  'interests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    senderProfileId: uuid('sender_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    receiverProfileId: uuid('receiver_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: interestStatusEnum('status').default('pending').notNull(),
    message: text('message'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('interests_sender_receiver_idx').on(
      table.senderProfileId,
      table.receiverProfileId
    ),
  ]
);

export type Interest = typeof interests.$inferSelect;
export type NewInterest = typeof interests.$inferInsert;
