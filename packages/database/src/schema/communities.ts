import {
  pgTable,
  serial,
  varchar,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const communities = pgTable(
  'communities',
  {
    id: serial('id').primaryKey(),
    religion: varchar('religion', { length: 50 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
  },
  (table) => ({
    religionNameIdx: uniqueIndex('communities_religion_name_idx').on(table.religion, table.name),
    slugIdx: uniqueIndex('communities_slug_idx').on(table.slug),
    religionIdx: index('communities_religion_idx').on(table.religion),
  }),
);

export const communityAliases = pgTable(
  'community_aliases',
  {
    id: serial('id').primaryKey(),
    communityId: integer('community_id')
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 100 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 100 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('community_aliases_normalized_idx').on(table.normalizedAlias),
    communityAliasIdx: uniqueIndex('community_aliases_community_normalized_idx').on(
      table.communityId,
      table.normalizedAlias,
    ),
  }),
);

export const subcastes = pgTable(
  'subcastes',
  {
    id: serial('id').primaryKey(),
    communityId: integer('community_id')
      .references(() => communities.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 100 }).notNull(),
  },
  (table) => ({
    communityNameIdx: uniqueIndex('subcastes_community_name_idx').on(table.communityId, table.name),
    communityIdx: index('subcastes_community_id_idx').on(table.communityId),
  }),
);

export const subcasteAliases = pgTable(
  'subcaste_aliases',
  {
    id: serial('id').primaryKey(),
    subcasteId: integer('subcaste_id')
      .references(() => subcastes.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 100 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 100 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('subcaste_aliases_normalized_idx').on(table.normalizedAlias),
    subcasteAliasIdx: uniqueIndex('subcaste_aliases_subcaste_normalized_idx').on(
      table.subcasteId,
      table.normalizedAlias,
    ),
  }),
);

export const gotras = pgTable(
  'gotras',
  {
    id: serial('id').primaryKey(),
    religion: varchar('religion', { length: 50 }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 120 }).notNull(),
  },
  (table) => ({
    nameIdx: uniqueIndex('gotras_name_idx').on(table.name),
    slugIdx: uniqueIndex('gotras_slug_idx').on(table.slug),
    religionIdx: index('gotras_religion_idx').on(table.religion),
  }),
);

export const gotraAliases = pgTable(
  'gotra_aliases',
  {
    id: serial('id').primaryKey(),
    gotraId: integer('gotra_id')
      .references(() => gotras.id, { onDelete: 'cascade' })
      .notNull(),
    alias: varchar('alias', { length: 100 }).notNull(),
    normalizedAlias: varchar('normalized_alias', { length: 100 }).notNull(),
  },
  (table) => ({
    normalizedIdx: index('gotra_aliases_normalized_idx').on(table.normalizedAlias),
    gotraAliasIdx: uniqueIndex('gotra_aliases_gotra_normalized_idx').on(
      table.gotraId,
      table.normalizedAlias,
    ),
  }),
);
