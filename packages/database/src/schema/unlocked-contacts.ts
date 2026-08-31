import {
  pgTable,
  uuid,
  timestamp,
  index,
  varchar,
} from 'drizzle-orm/pg-core';
import { profiles } from './profiles';
import { payments } from './payments';

export const unlockedContacts = pgTable(
  'unlocked_contacts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    unlockerProfileId: uuid('unlocker_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    unlockedProfileId: uuid('unlocked_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    paymentId: uuid('payment_id')
      .references(() => payments.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('unlocked_contacts_profiles_idx').on(table.unlockerProfileId, table.unlockedProfileId),
  ]
);

export type UnlockedContact = typeof unlockedContacts.$inferSelect;
export type NewUnlockedContact = typeof unlockedContacts.$inferInsert;
