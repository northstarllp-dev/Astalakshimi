import { pgTable, uuid, timestamp, varchar, integer, text } from 'drizzle-orm/pg-core';
import { payments } from './payments';
import { users } from './users';

export const paymentRefunds = pgTable('payment_refunds', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  refundId: varchar('refund_id', { length: 100 }).notNull().unique(),
  cfRefundId: varchar('cf_refund_id', { length: 100 }),
  refundStatus: varchar('refund_status', { length: 50 }),
  refundAmountPaise: integer('refund_amount_paise').notNull(),
  refundNote: text('refund_note'),
  refundSpeed: varchar('refund_speed', { length: 20 }),
  initiatedBy: uuid('initiated_by').references(() => users.id, { onDelete: 'set null' }),
  initiatedAt: timestamp('initiated_at', { withTimezone: true }).defaultNow().notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }),
});

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type NewPaymentRefund = typeof paymentRefunds.$inferInsert;
