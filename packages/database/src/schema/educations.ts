import {
  pgTable,
  serial,
  varchar,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const educationLevels = pgTable(
  'education_levels',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    displayOrder: integer('display_order').notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('education_levels_name_idx').on(table.name),
    orderIdx: index('education_levels_display_order_idx').on(table.displayOrder),
  }),
);

export const specializations = pgTable(
  'specializations',
  {
    id: serial('id').primaryKey(),
    educationId: integer('education_id')
      .references(() => educationLevels.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 150 }).notNull(),
    displayOrder: integer('display_order').default(0).notNull(),
  },
  (table) => ({
    eduNameIdx: uniqueIndex('specializations_education_name_idx').on(table.educationId, table.name),
    eduIdx: index('specializations_education_id_idx').on(table.educationId),
  }),
);

export const educationAliases = pgTable(
  'education_aliases',
  {
    id: serial('id').primaryKey(),
    educationId: integer('education_id')
      .references(() => educationLevels.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 100 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 100 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('education_aliases_normalized_idx').on(table.normalizedAlias),
    eduAliasIdx: uniqueIndex('education_aliases_education_normalized_idx').on(
      table.educationId,
      table.normalizedAlias,
    ),
  }),
);

export type EducationLevel = typeof educationLevels.$inferSelect;
export type Specialization = typeof specializations.$inferSelect;
