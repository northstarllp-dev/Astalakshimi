import {
  pgTable,
  uuid,
  timestamp,
  boolean,
  varchar,
  jsonb,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  hideProfile: boolean('hide_profile').default(false).notNull(),
  hidePhone: boolean('hide_phone').default(false).notNull(),
  profileVisibility: varchar('profile_visibility', { length: 20 }).default('all').notNull(), // all, premium, hidden
  showLastSeen: boolean('show_last_seen').default(true).notNull(),
  notifyEmail: boolean('notify_email').default(true).notNull(),
  notifySms: boolean('notify_sms').default(true).notNull(),
  notifyPush: boolean('notify_push').default(true).notNull(),
  photoBlur: varchar('photo_blur', { length: 20 }).default('always').notNull(),
  hideFromUsers: jsonb('hide_from_users').default([]).notNull(),
  hideFromCities: jsonb('hide_from_cities').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
