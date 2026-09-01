import { Injectable, Inject } from '@nestjs/common';
import { sql, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cities, cityAliases, states } from '@astalakshimi/database';
import type { CityAutocompleteResult, ResolvedCity, StateOption } from '@astalakshimi/types';
import { DB_CLIENT } from '../database/database.constants';
import { normalizeLocationText } from './locations.util';
import { dedupeCityResults, searchPlacesWithNominatim } from './geocoding.provider';

@Injectable()
export class LocationsService {
  constructor(@Inject(DB_CLIENT) private readonly db: PostgresJsDatabase) {}

  async listStates(): Promise<StateOption[]> {
    const rows = await this.db
      .select({
        id: states.id,
        name: states.name,
        country: states.country,
      })
      .from(states)
      .orderBy(states.name);

    return rows;
  }

  async autocompleteCities(
    query: string,
    state?: string,
    limit = 10,
  ): Promise<CityAutocompleteResult[]> {
    const trimmed = query.trim();
    const normalized = normalizeLocationText(trimmed);
    if (normalized.length < 2) return [];

    const pattern = `%${trimmed}%`;
    const normalizedPattern = `%${normalized}%`;

    const rows = await this.db.execute<{
      id: number;
      name: string;
      state: string;
      country: string;
    }>(sql`
      SELECT c.id, c.name, s.name AS state, s.country
      FROM cities c
      INNER JOIN states s ON s.id = c.state_id
      LEFT JOIN city_aliases a ON a.city_id = c.id
      WHERE (
        c.name ILIKE ${pattern}
        OR a.alias ILIKE ${pattern}
        OR a.normalized_alias ILIKE ${normalizedPattern}
      )
      ${state ? sql`AND s.name = ${state}` : sql``}
      GROUP BY c.id, c.name, s.name, s.country
      ORDER BY
        MIN(
          CASE
            WHEN lower(c.name) = lower(${trimmed}) THEN 0
            WHEN a.normalized_alias = ${normalized} THEN 1
            WHEN c.name ILIKE ${`${trimmed}%`} THEN 2
            ELSE 3
          END
        ),
        c.name
      LIMIT ${limit}
    `);

    const localRows = rows.map((row) => ({
      id: row.id,
      name: row.name,
      state: row.state,
      country: row.country,
      label: `${row.name}, ${row.state}`,
    }));

    if (localRows.length >= limit) {
      return localRows.slice(0, limit);
    }

    try {
      const geocoded = await searchPlacesWithNominatim(trimmed, limit);
      return dedupeCityResults([...localRows, ...geocoded]).slice(0, limit);
    } catch {
      return localRows;
    }
  }

  async resolveCity(query: string): Promise<ResolvedCity | null> {
    const trimmed = query.trim();
    const normalized = normalizeLocationText(trimmed);
    if (normalized.length < 2) return null;

    const [exactAlias] = await this.db.execute<{
      id: number;
      name: string;
      state: string;
      country: string;
    }>(sql`
      SELECT c.id, c.name, s.name AS state, s.country
      FROM city_aliases a
      INNER JOIN cities c ON c.id = a.city_id
      INNER JOIN states s ON s.id = c.state_id
      WHERE a.normalized_alias = ${normalized}
      LIMIT 1
    `);

    if (exactAlias) {
      return exactAlias;
    }

    const [exactCity] = await this.db
      .select({
        id: cities.id,
        name: cities.name,
        state: states.name,
        country: states.country,
      })
      .from(cities)
      .innerJoin(states, eq(cities.stateId, states.id))
      .where(sql`lower(${cities.name}) = lower(${trimmed})`)
      .limit(1);

    return exactCity ?? (await this.resolveCityFromGeocoder(trimmed));
  }

  private async resolveCityFromGeocoder(query: string): Promise<ResolvedCity | null> {
    try {
      const [match] = await searchPlacesWithNominatim(query, 1);
      if (!match) return null;
      return {
        id: match.id,
        name: match.name,
        state: match.state,
        country: match.country,
      };
    } catch {
      return null;
    }
  }
}
