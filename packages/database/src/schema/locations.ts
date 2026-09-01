import {
  pgTable,
  serial,
  varchar,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const states = pgTable(
  'states',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    country: varchar('country', { length: 100 }).default('India').notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('states_name_country_idx').on(table.name, table.country),
    slugIdx: uniqueIndex('states_slug_idx').on(table.slug),
  }),
);

export const cities = pgTable(
  'cities',
  {
    id: serial('id').primaryKey(),
    stateId: integer('state_id')
      .references(() => states.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
    district: varchar('district', { length: 100 }),
  },
  (table) => ({
    stateNameIdx: uniqueIndex('cities_state_name_idx').on(table.stateId, table.name),
    slugIdx: uniqueIndex('cities_slug_idx').on(table.slug),
    stateIdx: index('cities_state_id_idx').on(table.stateId),
  }),
);

export const cityAliases = pgTable(
  'city_aliases',
  {
    id: serial('id').primaryKey(),
    cityId: integer('city_id')
      .references(() => cities.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 100 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 100 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('city_aliases_normalized_idx').on(table.normalizedAlias),
    cityAliasIdx: uniqueIndex('city_aliases_city_normalized_idx').on(
      table.cityId,
      table.normalizedAlias,
    ),
  }),
);
