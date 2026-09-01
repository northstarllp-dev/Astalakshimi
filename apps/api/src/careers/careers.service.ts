import { Injectable, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  companies,
  companyAliases,
  occupationAliases,
  occupations,
} from '@astalakshimi/database';
import type {
  CompanySearchResult,
  OccupationOption,
  ResolvedCompany,
  ResolvedOccupation,
} from '@astalakshimi/types';
import { DB_CLIENT } from '../database/database.constants';

function normalizeCareerText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.\s/_&-]+/g, '')
    .trim();
}

@Injectable()
export class CareersService {
  constructor(@Inject(DB_CLIENT) private readonly db: PostgresJsDatabase) {}

  async listOccupations(): Promise<OccupationOption[]> {
    return this.db
      .select({
        id: occupations.id,
        name: occupations.name,
        category: occupations.category,
      })
      .from(occupations)
      .orderBy(occupations.displayOrder, occupations.name);
  }

  async resolveOccupation(query: string): Promise<ResolvedOccupation | null> {
    const trimmed = query.trim();
    const normalized = normalizeCareerText(trimmed);
    if (!normalized) return null;

    const [aliasMatch] = await this.db
      .select({
        id: occupations.id,
        name: occupations.name,
      })
      .from(occupationAliases)
      .innerJoin(occupations, eq(occupationAliases.occupationId, occupations.id))
      .where(eq(occupationAliases.normalizedAlias, normalized))
      .limit(1);

    if (aliasMatch) return aliasMatch;

    const [exactMatch] = await this.db
      .select({
        id: occupations.id,
        name: occupations.name,
      })
      .from(occupations)
      .where(sql`lower(${occupations.name}) = lower(${trimmed})`)
      .limit(1);

    return exactMatch ?? null;
  }

  async searchCompanies(query: string, limit = 10): Promise<CompanySearchResult[]> {
    const trimmed = query.trim();
    const normalized = normalizeCareerText(trimmed);
    if (normalized.length < 2) return [];

    const pattern = `%${trimmed}%`;
    const normalizedPattern = `%${normalized}%`;

    const rows = await this.db.execute<{
      id: number;
      name: string;
      sector: string | null;
    }>(sql`
      SELECT c.id, c.name, c.sector
      FROM companies c
      LEFT JOIN company_aliases a ON a.company_id = c.id
      WHERE (
        c.name ILIKE ${pattern}
        OR a.alias ILIKE ${pattern}
        OR a.normalized_alias ILIKE ${normalizedPattern}
      )
      GROUP BY c.id, c.name, c.sector, c.display_order
      ORDER BY
        MIN(
          CASE
            WHEN lower(c.name) = lower(${trimmed}) THEN 0
            WHEN a.normalized_alias = ${normalized} THEN 1
            WHEN c.name ILIKE ${`${trimmed}%`} THEN 2
            ELSE 3
          END
        ),
        c.display_order,
        c.name
      LIMIT ${limit}
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sector: row.sector,
      label: row.sector ? `${row.name} · ${row.sector}` : row.name,
    }));
  }

  async resolveCompany(query: string): Promise<ResolvedCompany | null> {
    const trimmed = query.trim();
    const normalized = normalizeCareerText(trimmed);
    if (!normalized) return null;

    const [aliasMatch] = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        sector: companies.sector,
      })
      .from(companyAliases)
      .innerJoin(companies, eq(companyAliases.companyId, companies.id))
      .where(eq(companyAliases.normalizedAlias, normalized))
      .limit(1);

    if (aliasMatch) return aliasMatch;

    const [exactMatch] = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        sector: companies.sector,
      })
      .from(companies)
      .where(sql`lower(${companies.name}) = lower(${trimmed})`)
      .limit(1);

    return exactMatch ?? null;
  }

  async getOccupationName(occupationId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ name: occupations.name })
      .from(occupations)
      .where(eq(occupations.id, occupationId))
      .limit(1);
    return row?.name ?? null;
  }

  async getCompanyName(companyId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    return row?.name ?? null;
  }
}
