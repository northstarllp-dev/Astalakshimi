import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../../src/chat/chat.service';
import { messages, profiles, profilePhotos, interests } from '@astalakshimi/database';

describe('Feature 5: Chat - ChatService (Unit Tests)', () => {
  let chatService: ChatService;
  let mockDb: any;
  let mockNotificationsService: any;

  const senderProfile = {
    id: 'sender-prof-id',
    userId: 'sender-user-id',
    fullName: 'Karthik Loganathan',
  };

  const partnerProfile = {
    id: 'partner-prof-id',
    userId: 'partner-user-id',
    fullName: 'Ananya Sharma',
    dob: '1998-05-15',
    city: 'Chennai',
  };

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    chatService = new ChatService(mockDb, mockNotificationsService);
  });

  describe('sendMessage', () => {
    it('should throw BadRequestException if message text is empty or only whitespace', async () => {
      await expect(
        chatService.sendMessage('sender-user-id', 'thread-1', { text: '   ' })
      ).rejects.toThrow('Message text cannot be empty');
    });

    it('should throw NotFoundException if sender does not have a profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        chatService.sendMessage('sender-user-id', 'thread-1', { text: 'Hello' })
      ).rejects.toThrow('User profile not found. Please complete your profile.');
    });

    it('should throw BadRequestException if user attempts to message themselves', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        // 1st: sender profile
        // 2nd: target profile lookup
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([senderProfile]),
        };
      });

      await expect(
        chatService.sendMessage('sender-user-id', senderProfile.id, {
          text: 'Hello self',
          receiverProfileId: senderProfile.id,
        })
      ).rejects.toThrow('Target recipient profile required');
    });

    it('should throw NotFoundException if recipient profile does not exist', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // sender profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else {
          // target profile lookup by direct profile id -> not found
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      await expect(
        chatService.sendMessage('sender-user-id', 'non-existent-profile', {
          text: 'Hello',
          receiverProfileId: 'non-existent-profile',
        })
      ).rejects.toThrow('Target recipient profile not found');
    });

    it('should successfully save message, notify recipient only, and return message with isSelf: true', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // sender profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          // target profile resolution by direct ID
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([partnerProfile]),
          };
        } else if (selectCount === 3) {
          // interest lookup between sender and partner
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'interest-123' }]),
          };
        } else {
          // targetProfile fetch
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([partnerProfile]),
          };
        }
      });

      const insertedMessage = {
        id: 'msg-uuid-1',
        threadId: 'interest-123',
        senderProfileId: senderProfile.id,
        receiverProfileId: partnerProfile.id,
        text: 'Hello Ananya!',
        isRead: false,
        createdAt: new Date('2026-03-01T12:00:00Z'),
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([insertedMessage]),
        }),
      });

      const result = await chatService.sendMessage('sender-user-id', 'partner-prof-id', {
        text: 'Hello Ananya!',
        receiverProfileId: 'partner-prof-id',
      });

      expect(result.id).toBe('msg-uuid-1');
      expect(result.text).toBe('Hello Ananya!');
      expect(result.isSelf).toBe(true);
      expect(result.senderName).toBe('Karthik Loganathan');

      // Verify recipient was notified
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: partnerProfile.userId,
          title: 'New message from Karthik Loganathan',
          category: 'messages',
        })
      );
    });
  });

  describe('getMessages', () => {
    it('should fetch all messages in thread and mark incoming unread messages as read', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          threadId: 'int-1',
          senderProfileId: partnerProfile.id,
          receiverProfileId: senderProfile.id,
          text: 'Hi Karthik',
          isRead: false,
          createdAt: new Date('2026-03-01T10:00:00Z'),
          senderName: 'Ananya Sharma',
        },
        {
          id: 'msg-2',
          threadId: 'int-1',
          senderProfileId: senderProfile.id,
          receiverProfileId: partnerProfile.id,
          text: 'Hi Ananya, nice to meet you!',
          isRead: true,
          createdAt: new Date('2026-03-01T10:05:00Z'),
          senderName: 'Karthik Loganathan',
        },
      ];

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // sender profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          // partner profile resolution
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([partnerProfile]),
          };
        } else if (selectCount === 3) {
          // interest resolution
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'int-1' }]),
          };
        } else {
          // messages query
          return {
            from: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue(mockMessages),
          };
        }
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await chatService.getMessages('sender-user-id', partnerProfile.id);

      expect(result).toHaveLength(2);
      expect(result[0].isSelf).toBe(false);
      expect(result[1].isSelf).toBe(true);

      // Verify unread messages marked as read
      expect(mockDb.update).toHaveBeenCalledWith(messages);
    });
  });

  describe('getThreads', () => {
    it('should return active chat threads with last message and unread count', async () => {
      const acceptedInterests = [
        {
          interest: { id: 'int-1' },
          otherProfile: partnerProfile,
        },
      ];

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // user profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          // accepted interests
          return {
            from: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockResolvedValue(acceptedInterests),
          };
        } else if (selectCount === 3) {
          // photos
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ profileId: partnerProfile.id, s3Key: 'photo1.jpg' }]),
          };
        } else if (selectCount === 4) {
          // last message
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ text: 'Latest message text', createdAt: new Date() }]),
          };
        } else {
          // unread count
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 2 }]),
          };
        }
      });

      const threads = await chatService.getThreads('sender-user-id');

      expect(threads).toHaveLength(1);
      expect(threads[0].profile.fullName).toBe('Ananya Sharma');
      expect(threads[0].lastMessage).toBe('Latest message text');
      expect(threads[0].unreadCount).toBe(2);
      expect(threads[0].profile.photo).toBe('photo1.jpg');
    });
  });

  describe('markThreadRead', () => {
    it('should mark all messages from thread as read', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([senderProfile]),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      const result = await chatService.markThreadRead('sender-user-id', partnerProfile.id);

      expect(mockDb.update).toHaveBeenCalledWith(messages);
      expect(result).toEqual({ success: true });
    });
  });
});
