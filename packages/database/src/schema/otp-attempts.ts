import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  boolean,
} from 'drizzle-orm/pg-core';

export const otpAttempts = pgTable('otp_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  phone: varchar('phone', { length: 15 }).notNull(),
  otpHash: varchar('otp_hash', { length: 100 }).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  maxAttempts: integer('max_attempts').default(5).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  verified: boolean('verified').default(false).notNull(),
  consentAccepted: boolean('consent_accepted').default(false).notNull(),
  referredBy: varchar('referred_by', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type OtpAttempt = typeof otpAttempts.$inferSelect;
export type NewOtpAttempt = typeof otpAttempts.$inferInsert;
