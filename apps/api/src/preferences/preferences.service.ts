import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, partnerPreferences } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import type { PartnerPreferencesInput } from '@astalakshimi/validation';

@Injectable()
export class PreferencesService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getMyPreferences(userId: string) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    const [prefs] = await this.db
      .select()
      .from(partnerPreferences)
      .where(eq(partnerPreferences.profileId, profile.id))
      .limit(1);

    if (!prefs) {
      throw new NotFoundException('Preferences not set yet');
    }

    return prefs;
  }

  async updateMyPreferences(userId: string, input: PartnerPreferencesInput) {
    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found for this user');
    }

    const [updated] = await this.db
      .insert(partnerPreferences)
      .values({
        profileId: profile.id,
        prefAgeMin: input.prefAgeMin,
        prefAgeMax: input.prefAgeMax,
        prefHeightMinCm: input.prefHeightMinCm,
        prefHeightMaxCm: input.prefHeightMaxCm,
        prefMaritalStatuses: input.prefMaritalStatuses,
        prefReligions: input.prefReligions,
        prefCastes: input.prefCastes,
        prefMotherTongues: input.prefMotherTongues,
        prefMinEducation: input.prefMinEducation,
        prefAcceptableIncomes: input.prefAcceptableIncomes,
        prefLocations: input.prefLocations,
      })
      .onConflictDoUpdate({
        target: partnerPreferences.profileId,
        set: {
          prefAgeMin: input.prefAgeMin,
          prefAgeMax: input.prefAgeMax,
          prefHeightMinCm: input.prefHeightMinCm,
          prefHeightMaxCm: input.prefHeightMaxCm,
          prefMaritalStatuses: input.prefMaritalStatuses,
          prefReligions: input.prefReligions,
          prefCastes: input.prefCastes,
          prefMotherTongues: input.prefMotherTongues,
          prefMinEducation: input.prefMinEducation,
          prefAcceptableIncomes: input.prefAcceptableIncomes,
          prefLocations: input.prefLocations,
          updatedAt: new Date(),
        },
      })
      .returning();

    return updated;
  }
}
