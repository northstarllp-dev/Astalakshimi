import { pgTable, uuid, timestamp, varchar, integer, text, jsonb } from 'drizzle-orm/pg-core';
import { payments } from './payments';

export const paymentDiscrepancies = pgTable('payment_discrepancies', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  reason: text('reason').notNull(),
  providerStatus: varchar('provider_status', { length: 50 }),
  expectedAmountPaise: integer('expected_amount_paise'),
  actualAmountPaise: integer('actual_amount_paise'),
  payloadSnapshot: jsonb('payload_snapshot').$type<unknown>(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: varchar('resolved_by', { length: 100 }),
});

export type PaymentDiscrepancy = typeof paymentDiscrepancies.$inferSelect;
export type NewPaymentDiscrepancy = typeof paymentDiscrepancies.$inferInsert;
