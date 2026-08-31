import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { notifications } from '@astalakshimi/database';

describe('Feature 11: Notifications - NotificationsService (Unit Tests)', () => {
  let notificationsService: NotificationsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    notificationsService = new NotificationsService(mockDb);
  });

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('createNotification', () => {
    it('should create and return a notification', async () => {
      const dto = {
        userId: 'target-user',
        title: 'New match!',
        category: 'interests' as const,
        kind: 'match',
        href: '/matches',
        actorProfileId: 'actor-prof-1',
      };

      const mockActorProfile = { userId: 'different-user' };
      const expectedNotification = { id: 'notif-1', ...dto };

      mockDb.select = mockQueryBuilder([[mockActorProfile]]);
      mockDb.insert = mockQueryBuilder([[expectedNotification]]);

      const result = await notificationsService.createNotification(dto);
      expect(result).toEqual(expectedNotification);
    });

    it('should prevent self-notification', async () => {
      const dto = {
        userId: 'same-user',
        title: 'Self ping',
        category: 'interests' as const,
        kind: 'match',
        href: '/matches',
        actorProfileId: 'actor-prof-1',
      };

      const mockActorProfile = { userId: 'same-user' }; // Actor is the same as the target user

      mockDb.select = mockQueryBuilder([[mockActorProfile]]);
      mockDb.insert = mockQueryBuilder([[]]);

      const result = await notificationsService.createNotification(dto);
      expect(result).toBeNull();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch and map notifications, filtering out self-notifications', async () => {
      const dbRows = [
        {
          id: 'notif-1',
          userId: 'user-1',
          title: 'Valid notification',
          actorUserId: 'user-2', // different user
          isRead: false,
          createdAt: new Date('2026-05-10T12:00:00Z'),
        },
        {
          id: 'notif-2',
          userId: 'user-1',
          title: 'Self notification (should be filtered)',
          actorUserId: 'user-1', // same user
          isRead: false,
        },
      ];

      mockDb.select = mockQueryBuilder([dbRows]);

      const result = await notificationsService.getUserNotifications('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].unread).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockDb.update = mockQueryBuilder([[{ id: 'notif-1', isRead: true }]]);

      const result = await notificationsService.markAsRead('user-1', 'notif-1');
      expect(result).toEqual({ id: 'notif-1', isRead: true });
    });

    it('should throw NotFoundException if notification does not exist or belong to user', async () => {
      mockDb.update = mockQueryBuilder([[]]);

      await expect(notificationsService.markAsRead('user-1', 'notif-missing')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should update all notifications to read', async () => {
      mockDb.update = mockQueryBuilder([[]]);
      const result = await notificationsService.markAllAsRead('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('clearAll', () => {
    it('should delete all user notifications', async () => {
      mockDb.delete = mockQueryBuilder([[]]);
      const result = await notificationsService.clearAll('user-1');
      expect(result).toEqual({ success: true });
    });
  });
});
