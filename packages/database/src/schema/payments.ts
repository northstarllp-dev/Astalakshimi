import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  text,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { plans } from './plans';

export const paymentProviderEnum = pgEnum('payment_provider', ['razorpay', 'phonepe']);
export const paymentStatusEnum = pgEnum('payment_status', [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
]);

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  planId: uuid('plan_id')
    .references(() => plans.id, { onDelete: 'cascade' }),
  amountPaise: integer('amount_paise').notNull(),
  currency: varchar('currency', { length: 3 }).default('INR').notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  providerOrderId: varchar('provider_order_id', { length: 100 }).unique(),
  providerPaymentId: varchar('provider_payment_id', { length: 100 }).unique(),
  providerSignature: varchar('provider_signature', { length: 500 }),
  status: paymentStatusEnum('status').default('created').notNull(),
  failureReason: text('failure_reason'),
  webhookEventId: varchar('webhook_event_id', { length: 100 }).unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
