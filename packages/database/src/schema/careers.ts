import {
  pgTable,
  serial,
  varchar,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const occupations = pgTable(
  'occupations',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    category: varchar('category', { length: 80 }),
    displayOrder: integer('display_order').notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('occupations_name_idx').on(table.name),
    orderIdx: index('occupations_display_order_idx').on(table.displayOrder),
    categoryIdx: index('occupations_category_idx').on(table.category),
  }),
);

export const occupationAliases = pgTable(
  'occupation_aliases',
  {
    id: serial('id').primaryKey(),
    occupationId: integer('occupation_id')
      .references(() => occupations.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 150 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 150 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('occupation_aliases_normalized_idx').on(table.normalizedAlias),
    occupationAliasIdx: uniqueIndex('occupation_aliases_occupation_normalized_idx').on(
      table.occupationId,
      table.normalizedAlias,
    ),
  }),
);

export const companies = pgTable(
  'companies',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    sector: varchar('sector', { length: 80 }),
    displayOrder: integer('display_order').default(0).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('companies_name_idx').on(table.name),
    sectorIdx: index('companies_sector_idx').on(table.sector),
  }),
);

export const companyAliases = pgTable(
  'company_aliases',
  {
    id: serial('id').primaryKey(),
    companyId: integer('company_id')
      .references(() => companies.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 200 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 200 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('company_aliases_normalized_idx').on(table.normalizedAlias),
    companyAliasIdx: uniqueIndex('company_aliases_company_normalized_idx').on(
      table.companyId,
      table.normalizedAlias,
    ),
  }),
);

export type Occupation = typeof occupations.$inferSelect;
export type Company = typeof companies.$inferSelect;
