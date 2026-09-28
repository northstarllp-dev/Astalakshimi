import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  text,
  pgEnum,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { plans } from './plans';
import { profiles } from './profiles';

export const paymentProviderEnum = pgEnum('payment_provider', ['cashfree']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
]);
export const verifiedByEnum = pgEnum('verified_by', [
  'client_callback',
  'webhook',
  'reconciliation',
]);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plans.id, { onDelete: 'cascade' }),
    targetProfileId: uuid('target_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    amountPaise: integer('amount_paise').notNull(),
    currency: varchar('currency', { length: 3 }).default('INR').notNull(),
    provider: paymentProviderEnum('provider').default('cashfree').notNull(),
    providerOrderId: varchar('provider_order_id', { length: 100 }).unique(),
    providerSessionId: varchar('provider_session_id', { length: 255 }).unique(),
    providerPaymentId: varchar('provider_payment_id', { length: 100 }).unique(),
    providerStatus: varchar('provider_status', { length: 50 }),
    providerSignature: varchar('provider_signature', { length: 500 }),
    webhookEventId: varchar('webhook_event_id', { length: 100 }).unique(),
    verifiedBy: verifiedByEnum('verified_by'),
    failureReason: text('failure_reason'),
    providerMetadata: jsonb('provider_metadata').$type<Record<string, unknown> | null>(),
    status: paymentStatusEnum('status').default('created').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusCreatedIdx: index('idx_payments_status_created').on(table.status, table.createdAt),
    userStatusIdx: index('idx_payments_user_status').on(table.userId, table.status),
  }),
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
