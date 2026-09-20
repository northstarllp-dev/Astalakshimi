import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { userSettings, profiles } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import { normalizePhotoBlur, photoBlurToPrivacy } from '../common/photo-access';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly profilesService: ProfilesService,
  ) {}

  async getSettings(userId: string) {
    const [settings] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      const [newSettings] = await this.db
        .insert(userSettings)
        .values({ userId })
        .returning();
      return newSettings;
    }

    return settings;
  }

  async updateSettings(userId: string, data: Partial<typeof userSettings.$inferInsert>) {
    const patch: Partial<typeof userSettings.$inferInsert> = { ...data, updatedAt: new Date() };
    if (data.photoBlur !== undefined) {
      patch.photoBlur = normalizePhotoBlur(data.photoBlur as string);
    }

    let updated = (
      await this.db
        .update(userSettings)
        .set(patch)
        .where(eq(userSettings.userId, userId))
        .returning()
    )[0];

    if (!updated) {
      const [created] = await this.db
        .insert(userSettings)
        .values({ userId, ...patch })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: patch,
        })
        .returning();
      updated = created;
    }

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    // Keep profiles.photo_privacy in sync so edit UI + settings stay consistent.
    if (data.photoBlur !== undefined) {
      await this.db
        .update(profiles)
        .set({
          photoPrivacy: photoBlurToPrivacy(updated.photoBlur),
          updatedAt: new Date(),
        })
        .where(eq(profiles.userId, userId));
      await this.profilesService.invalidateProfileCacheForUser(userId);
    }

    return updated;
  }
}
