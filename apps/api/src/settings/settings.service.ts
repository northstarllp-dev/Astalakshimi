import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { userSettings } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';

@Injectable()
export class SettingsService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getSettings(userId: string) {
    const [settings] = await this.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Create default settings if not exists
      const [newSettings] = await this.db
        .insert(userSettings)
        .values({ userId })
        .returning();
      return newSettings;
    }

    return settings;
  }

  async updateSettings(userId: string, data: Partial<typeof userSettings.$inferInsert>) {
    const [updated] = await this.db
      .update(userSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (!updated) {
      throw new NotFoundException('Settings not found');
    }

    return updated;
  }
}

