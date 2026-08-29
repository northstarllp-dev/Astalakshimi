import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from '../../src/chat/chat.controller';
import { ChatService } from '../../src/chat/chat.service';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 5: Chat - ChatController (Integration Tests)', () => {
  let controller: ChatController;
  let chatService: jest.Mocked<ChatService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockChatService = {
      getThreads: jest.fn(),
      getMessages: jest.fn(),
      sendMessage: jest.fn(),
      markThreadRead: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get(ChatService);
  });

  describe('GET /chat/threads', () => {
    it('should return thread list for authenticated user', async () => {
      const expected = [
        {
          threadId: 'prof-2',
          profile: { fullName: 'Ananya Sharma' },
          lastMessage: 'Hi',
          unreadCount: 0,
        },
      ];

      chatService.getThreads.mockResolvedValue(expected as any);

      const result = await controller.getThreads(mockUserSession);

      expect(chatService.getThreads).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /chat/:threadId/messages', () => {
    it('should fetch messages for specified thread', async () => {
      const expected = [
        {
          id: 'msg-1',
          text: 'Hello',
          isSelf: true,
        },
      ];

      chatService.getMessages.mockResolvedValue(expected as any);

      const result = await controller.getMessages(mockUserSession, 'thread-123');

      expect(chatService.getMessages).toHaveBeenCalledWith(
        mockUserSession.userId,
        'thread-123'
      );
      expect(result).toEqual(expected);
    });
  });

  describe('POST /chat/:threadId/messages', () => {
    it('should send message to recipient in specified thread', async () => {
      const body = {
        text: 'Hello there!',
        receiverProfileId: '123e4567-e89b-12d3-a456-426614174000',
      };
      const expected = {
        id: 'msg-1',
        text: 'Hello there!',
        isSelf: true,
      };

      chatService.sendMessage.mockResolvedValue(expected as any);

      const result = await controller.sendMessage(mockUserSession, 'thread-123', body);

      expect(chatService.sendMessage).toHaveBeenCalledWith(
        mockUserSession.userId,
        'thread-123',
        body
      );
      expect(result).toEqual(expected);
    });
  });

  describe('PATCH /chat/:threadId/read', () => {
    it('should mark thread as read', async () => {
      chatService.markThreadRead.mockResolvedValue({ success: true });

      const result = await controller.markRead(mockUserSession, 'thread-123');

      expect(chatService.markThreadRead).toHaveBeenCalledWith(
        mockUserSession.userId,
        'thread-123'
      );
      expect(result).toEqual({ success: true });
    });
  });
});
