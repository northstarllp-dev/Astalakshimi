import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { notifications, profiles } from '@astalakshimi/database';
import { eq, desc, and } from 'drizzle-orm';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body?: string;
  category: 'interests' | 'messages' | 'profile' | 'account';
  kind: string;
  href: string;
  paidOnly?: boolean;
  actorProfileId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async createNotification(dto: CreateNotificationDto) {
    // Prevent self-notifications: if the actor profile belongs to the recipient user, do not notify
    if (dto.actorProfileId) {
      const [actorProf] = await this.db
        .select({ userId: profiles.userId })
        .from(profiles)
        .where(eq(profiles.id, dto.actorProfileId))
        .limit(1);

      if (actorProf && actorProf.userId === dto.userId) {
        return null;
      }
    }

    const [item] = await this.db
      .insert(notifications)
      .values({
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        category: dto.category,
        kind: dto.kind,
        href: dto.href,
        paidOnly: dto.paidOnly ?? false,
        actorProfileId: dto.actorProfileId,
      })
      .returning();

    return item;
  }

  async getUserNotifications(userId: string) {
    const items = await this.db
      .select({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        body: notifications.body,
        category: notifications.category,
        kind: notifications.kind,
        href: notifications.href,
        isRead: notifications.isRead,
        paidOnly: notifications.paidOnly,
        actorProfileId: notifications.actorProfileId,
        createdAt: notifications.createdAt,
        actorName: profiles.fullName,
        actorUserId: profiles.userId,
      })
      .from(notifications)
      .leftJoin(profiles, eq(notifications.actorProfileId, profiles.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    // Filter out any accidental self-notifications
    return items
      .filter((item) => !item.actorUserId || item.actorUserId !== userId)
      .map((item) => ({

      id: item.id,
      title: item.title,
      body: item.body,
      category: item.category,
      kind: item.kind,
      href: item.href,
      unread: !item.isRead,
      paidOnly: item.paidOnly,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : Date.now(),
      time: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now',
    }));
  }

  async markAsRead(userId: string, notificationId: string) {
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Notification not found');
    }

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    return { success: true };
  }

  async clearAll(userId: string) {
    await this.db
      .delete(notifications)
      .where(eq(notifications.userId, userId));

    return { success: true };
  }
}
