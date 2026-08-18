import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { users } from './users';

export const verificationMethodEnum = pgEnum('verification_method', ['selfie', 'govt_id']);
export const verificationStatusEnum = pgEnum('verification_status', ['idle', 'pending', 'verified', 'rejected']);
export const govtIdTypeEnum = pgEnum('govt_id_type', ['Aadhaar', 'PAN card', 'Passport', 'Driving licence', 'Voter ID']);

export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull().unique(),

  method: verificationMethodEnum('method').notNull(), // 'selfie' or 'govt_id'

  // Live Selfie
  selfieS3Key: varchar('selfie_s3_key', { length: 500 }), // In private S3 bucket

  // Govt ID Document
  govtIdType: govtIdTypeEnum('govt_id_type'),
  govtIdS3Key: varchar('govt_id_s3_key', { length: 500 }), // In private S3 bucket

  // Review & Moderation (12-Hour SLA)
  status: verificationStatusEnum('status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
