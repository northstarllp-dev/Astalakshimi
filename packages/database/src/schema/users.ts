import { pgTable, uuid, varchar, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['member', 'admin', 'moderator']);
export const userStatusEnum = pgEnum('user_status', ['active', 'suspended', 'deactivated']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 15 }).notNull().unique(), // +91XXXXXXXXXX
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  isPhoneVerified: boolean('is_phone_verified').default(false).notNull(),
  consentAccepted: boolean('consent_accepted').default(false).notNull(),
  consentTimestamp: timestamp('consent_timestamp', { withTimezone: true }),
  referredBy: varchar('referred_by', { length: 50 }),
  role: userRoleEnum('role').default('member').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  refreshTokenHash: varchar('refresh_token_hash', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
