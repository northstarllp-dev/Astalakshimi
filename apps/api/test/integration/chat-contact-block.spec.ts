import { Test, TestingModule } from '@nestjs/testing';
import { DB_CLIENT } from '../../src/database/database.constants';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { EntitlementsService } from '../../src/entitlements/entitlements.service';
import { BlocksService } from '../../src/blocks/blocks.service';
import {
  ALLOWED_CHAT_MESSAGES,
  BLOCKED_CONTACT_MESSAGES,
} from '../fixtures/contact-sharing.cases';

const senderProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  userId: 'sender-user-id',
  fullName: 'Karthik Loganathan',
};

const partnerProfile = {
  id: '22222222-2222-2222-2222-222222222222',
  userId: 'partner-user-id',
  fullName: 'Ananya Sharma',
};

/**
 * HTTP send and the websocket processor both have to refuse contact sharing
 * and must not insert the message.
 */
describe('Chat contact sharing — send paths (integration)', () => {
  let moduleRef: TestingModule;
  let chatService: { sendMessage: (userId: string, threadId: string, dto: { text: string; receiverProfileId?: string }) => Promise<unknown> };
  let messageService: {
    processMessage: (
      senderProfileId: string,
      receiverProfileId: string,
      text: string,
      threadId: string,
    ) => Promise<unknown>;
  };
  let inserted: Array<{ text: string }>;
  let selectQueue: unknown[][];

  function query(rows: unknown[]) {
    const chain: Record<string, unknown> = {};
    const self = () => chain;
    chain.from = self;
    chain.where = self;
    chain.innerJoin = self;
    chain.leftJoin = self;
    chain.orderBy = () => ({
      limit: () => Promise.resolve(rows),
    });
    chain.limit = () => Promise.resolve(rows);
    return chain;
  }

  function queueSuccessfulSendLookups(recentMessages: Array<{ text: string }> = []) {
    selectQueue.push(
      [senderProfile],
      [partnerProfile],
      [{ id: 'interest-1' }],
      [partnerProfile],
      [{ id: 'interest-1' }],
      recentMessages,
    );
  }

  beforeAll(async () => {
    inserted = [];
    selectQueue = [];

    const mockDb = {
      select: jest.fn(() => query(selectQueue.shift() ?? [])),
      insert: jest.fn(() => ({
        values: (value: { text: string }) => {
          inserted.push(value);
          return {
            returning: () =>
              Promise.resolve([
                {
                  id: 'msg-1',
                  threadId: 'interest-1',
                  senderProfileId: senderProfile.id,
                  receiverProfileId: partnerProfile.id,
                  text: value.text,
                  isRead: false,
                  createdAt: new Date('2026-03-01T12:00:00Z'),
                },
              ]),
          };
        },
      })),
      update: jest.fn(),
    };

    const { ChatService } = await import('../../src/chat/chat.service');
    const { MessageService } = await import('../../src/chat/message.service');
    const { ContactGuardService } = await import('../../src/chat/guard/contact-guard.service');

    moduleRef = await Test.createTestingModule({
      providers: [
        ChatService,
        MessageService,
        ContactGuardService,
        { provide: DB_CLIENT, useValue: mockDb },
        { provide: NotificationsService, useValue: { createNotification: jest.fn().mockResolvedValue({}) } },
        {
          provide: EntitlementsService,
          useValue: { isChatBlocked: jest.fn().mockResolvedValue(false), getUserPlan: jest.fn() },
        },
        { provide: BlocksService, useValue: { isBlocked: jest.fn().mockResolvedValue(false) } },
      ],
    }).compile();

    chatService = moduleRef.get(ChatService);
    messageService = moduleRef.get(MessageService);
  });

  afterAll(async () => {
    await moduleRef?.close();
  });

  beforeEach(() => {
    inserted = [];
    selectQueue = [];
  });

  it.each(BLOCKED_CONTACT_MESSAGES)(
    'HTTP send does not store $label',
    async ({ text }) => {
      queueSuccessfulSendLookups();
      const result = (await chatService.sendMessage('sender-user-id', partnerProfile.id, {
        text,
        receiverProfileId: partnerProfile.id,
      })) as { status?: string };

      expect(result.status).toBe('BLOCKED');
      expect(inserted).toHaveLength(0);
    },
  );

  it.each(BLOCKED_CONTACT_MESSAGES)(
    'websocket send does not store $label',
    async ({ text }) => {
      selectQueue.push([{ id: 'interest-1' }], []);
      const result = (await messageService.processMessage(
        senderProfile.id,
        partnerProfile.id,
        text,
        'interest-1',
      )) as { status?: string };

      expect(result.status).toBe('BLOCKED');
      expect(inserted).toHaveLength(0);
    },
  );

  it('HTTP send still stores an ordinary greeting', async () => {
    queueSuccessfulSendLookups();
    const text = ALLOWED_CHAT_MESSAGES[0].text;
    const result = (await chatService.sendMessage('sender-user-id', partnerProfile.id, {
      text,
      receiverProfileId: partnerProfile.id,
    })) as { text?: string; status?: string };

    expect(result.status).toBeUndefined();
    expect(result.text).toBe(text);
    expect(inserted.map((row) => row.text)).toEqual([text]);
  });

  it('websocket send still stores an ordinary greeting', async () => {
    selectQueue.push([{ id: 'interest-1' }], []);
    const text = ALLOWED_CHAT_MESSAGES[1].text;
    const result = (await messageService.processMessage(
      senderProfile.id,
      partnerProfile.id,
      text,
      'interest-1',
    )) as { status?: string; message?: { text: string } };

    expect(result.status).toBe('ALLOW');
    expect(result.message?.text).toBe(text);
    expect(inserted.map((row) => row.text)).toEqual([text]);
  });

  it('HTTP send blocks a phone split across prior digit-only messages', async () => {
    queueSuccessfulSendLookups([{ text: '98765' }]);
    const result = (await chatService.sendMessage('sender-user-id', partnerProfile.id, {
      text: '43210',
      receiverProfileId: partnerProfile.id,
    })) as { status?: string };

    expect(result.status).toBe('BLOCKED');
    expect(inserted).toHaveLength(0);
  });

  it('websocket send blocks a phone sent one digit at a time', async () => {
    selectQueue.push(
      [{ id: 'interest-1' }],
      [{ text: '1' }, { text: '2' }, { text: '3' }, { text: '4' }, { text: '5' }, { text: '6' }, { text: '7' }, { text: '8' }, { text: '9' }],
    );
    const result = (await messageService.processMessage(
      senderProfile.id,
      partnerProfile.id,
      '0',
      'interest-1',
    )) as { status?: string };

    expect(result.status).toBe('BLOCKED');
    expect(inserted).toHaveLength(0);
  });
});
