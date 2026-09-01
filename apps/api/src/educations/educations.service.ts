import { Injectable, Inject } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { educationAliases, educationLevels, specializations } from '@astalakshimi/database';
import type { EducationLevelOption, ResolvedEducation, SpecializationOption } from '@astalakshimi/types';
import { DB_CLIENT } from '../database/database.constants';

function normalizeEducationText(value: string) {
  return value
    .toLowerCase()
    .replace(/[.\s/_-]+/g, '')
    .trim();
}

@Injectable()
export class EducationsService {
  constructor(@Inject(DB_CLIENT) private readonly db: PostgresJsDatabase) {}

  async listLevels(): Promise<EducationLevelOption[]> {
    return this.db
      .select({
        id: educationLevels.id,
        name: educationLevels.name,
      })
      .from(educationLevels)
      .orderBy(educationLevels.displayOrder, educationLevels.name);
  }

  async listSpecializations(educationId: number): Promise<SpecializationOption[]> {
    return this.db
      .select({
        id: specializations.id,
        name: specializations.name,
        educationId: specializations.educationId,
      })
      .from(specializations)
      .where(eq(specializations.educationId, educationId))
      .orderBy(specializations.displayOrder, specializations.name);
  }

  async resolveEducation(query: string): Promise<ResolvedEducation | null> {
    const trimmed = query.trim();
    const normalized = normalizeEducationText(trimmed);
    if (!normalized) return null;

    const [aliasMatch] = await this.db
      .select({
        id: educationLevels.id,
        name: educationLevels.name,
      })
      .from(educationAliases)
      .innerJoin(educationLevels, eq(educationAliases.educationId, educationLevels.id))
      .where(eq(educationAliases.normalizedAlias, normalized))
      .limit(1);

    if (aliasMatch) return aliasMatch;

    const [exactMatch] = await this.db
      .select({
        id: educationLevels.id,
        name: educationLevels.name,
      })
      .from(educationLevels)
      .where(sql`lower(${educationLevels.name}) = lower(${trimmed})`)
      .limit(1);

    return exactMatch ?? null;
  }

  async getLevelName(educationId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ name: educationLevels.name })
      .from(educationLevels)
      .where(eq(educationLevels.id, educationId))
      .limit(1);
    return row?.name ?? null;
  }

  async getSpecializationName(specializationId: number): Promise<string | null> {
    const [row] = await this.db
      .select({ name: specializations.name })
      .from(specializations)
      .where(eq(specializations.id, specializationId))
      .limit(1);
    return row?.name ?? null;
  }
}
