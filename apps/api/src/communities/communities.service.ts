import { Injectable, Inject } from '@nestjs/common';
import { eq, sql, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  communities,
  communityAliases,
  subcastes,
  subcasteAliases,
  gotras,
  gotraAliases,
} from '@astalakshimi/database';
import type {
  CommunityAutocompleteResult,
  SubcasteAutocompleteResult,
  GotraAutocompleteResult,
} from '@astalakshimi/types';
import { DB_CLIENT } from '../database/database.constants';
import { normalizeCommunityText } from './communities.util';

@Injectable()
export class CommunitiesService {
  constructor(@Inject(DB_CLIENT) private readonly db: PostgresJsDatabase) {}

  async autocompleteCommunities(
    query: string,
    religion: string,
    limit = 12,
  ): Promise<CommunityAutocompleteResult[]> {
    const trimmed = query.trim();
    const normalized = normalizeCommunityText(trimmed);
    if (!normalized) return [];

    const pattern = `%${trimmed}%`;
    const normalizedPattern = `%${normalized}%`;

    const rows = await this.db.execute<{
      id: number;
      name: string;
      religion: string;
    }>(sql`
      SELECT DISTINCT c.id, c.name, c.religion
      FROM communities c
      LEFT JOIN community_aliases a ON a.community_id = c.id
      WHERE c.religion = ${religion}
        AND (
          c.name ILIKE ${pattern}
          OR a.alias ILIKE ${pattern}
          OR a.normalized_alias ILIKE ${normalizedPattern}
        )
      ORDER BY
        CASE
          WHEN lower(c.name) = lower(${trimmed}) THEN 0
          WHEN a.normalized_alias = ${normalized} THEN 1
          WHEN c.name ILIKE ${`${trimmed}%`} THEN 2
          ELSE 3
        END,
        c.name
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      religion: row.religion,
      label: row.name,
    }));
  }

  async autocompleteSubcastes(
    query: string,
    options: {
      communityId?: number;
      community?: string;
      religion?: string;
      limit?: number;
    },
  ): Promise<SubcasteAutocompleteResult[]> {
    const trimmed = query.trim();
    const normalized = normalizeCommunityText(trimmed);
    if (!normalized) return [];

    const pattern = `%${trimmed}%`;
    const normalizedPattern = `%${normalized}%`;
    const limit = options.limit ?? 12;

    let communityId = options.communityId;
    if (!communityId && options.community) {
      const resolved = await this.resolveCommunity(options.community, options.religion);
      communityId = resolved?.id;
    }
    if (!communityId) return [];

    const rows = await this.db.execute<{
      id: number;
      name: string;
      community_id: number;
      community: string;
    }>(sql`
      SELECT DISTINCT s.id, s.name, s.community_id, c.name AS community
      FROM subcastes s
      INNER JOIN communities c ON c.id = s.community_id
      LEFT JOIN subcaste_aliases a ON a.subcaste_id = s.id
      WHERE s.community_id = ${communityId}
        AND (
          s.name ILIKE ${pattern}
          OR a.alias ILIKE ${pattern}
          OR a.normalized_alias ILIKE ${normalizedPattern}
        )
      ORDER BY
        CASE
          WHEN lower(s.name) = lower(${trimmed}) THEN 0
          WHEN a.normalized_alias = ${normalized} THEN 1
          WHEN s.name ILIKE ${`${trimmed}%`} THEN 2
          ELSE 3
        END,
        s.name
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      communityId: row.community_id,
      community: row.community,
      label: row.name,
    }));
  }

  async autocompleteGotras(
    query: string,
    religion?: string,
    limit = 12,
  ): Promise<GotraAutocompleteResult[]> {
    const trimmed = query.trim();
    const normalized = normalizeCommunityText(trimmed);
    if (!normalized) return [];

    const pattern = `%${trimmed}%`;
    const normalizedPattern = `%${normalized}%`;

    const rows = await this.db.execute<{
      id: number;
      name: string;
      religion: string | null;
    }>(sql`
      SELECT DISTINCT g.id, g.name, g.religion
      FROM gotras g
      LEFT JOIN gotra_aliases a ON a.gotra_id = g.id
      WHERE (
        g.name ILIKE ${pattern}
        OR a.alias ILIKE ${pattern}
        OR a.normalized_alias ILIKE ${normalizedPattern}
      )
      ${religion ? sql`AND (g.religion IS NULL OR g.religion = ${religion})` : sql``}
      ORDER BY
        CASE
          WHEN lower(g.name) = lower(${trimmed}) THEN 0
          WHEN a.normalized_alias = ${normalized} THEN 1
          WHEN g.name ILIKE ${`${trimmed}%`} THEN 2
          ELSE 3
        END,
        g.name
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      religion: row.religion,
      label: row.name,
    }));
  }

  async resolveCommunity(name: string, religion?: string) {
    const trimmed = name.trim();
    const normalized = normalizeCommunityText(trimmed);
    if (!normalized) return null;

    const [aliasMatch] = await this.db.execute<{ id: number; name: string; religion: string }>(sql`
      SELECT c.id, c.name, c.religion
      FROM community_aliases a
      INNER JOIN communities c ON c.id = a.community_id
      WHERE a.normalized_alias = ${normalized}
      ${religion ? sql`AND c.religion = ${religion}` : sql``}
      LIMIT 1
    `);
    if (aliasMatch) return aliasMatch;

    const conditions = [sql`lower(${communities.name}) = lower(${trimmed})`];
    if (religion) conditions.push(eq(communities.religion, religion));

    const [exact] = await this.db
      .select({
        id: communities.id,
        name: communities.name,
        religion: communities.religion,
      })
      .from(communities)
      .where(and(...conditions))
      .limit(1);

    return exact ?? null;
  }
}
