import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  text,
  boolean,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { profiles } from './profiles';

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  body: text('body'),
  category: varchar('category', { length: 20 }).notNull(), // interests, messages, profile, account
  kind: varchar('kind', { length: 30 }).notNull(), // interest_received, interest_accepted, etc.
  href: varchar('href', { length: 300 }).notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  paidOnly: boolean('paid_only').default(false).notNull(),
  actorProfileId: uuid('actor_profile_id')
    .references(() => profiles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
