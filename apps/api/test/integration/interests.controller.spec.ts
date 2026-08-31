import { Test, TestingModule } from '@nestjs/testing';
import { InterestsController } from '../../src/interests/interests.controller';
import { InterestsService } from '../../src/interests/interests.service';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 3: Interest System - InterestsController (Integration Tests)', () => {
  let controller: InterestsController;
  let interestsService: jest.Mocked<InterestsService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockInterestsService = {
      sendInterest: jest.fn(),
      getSummary: jest.fn(),
      getReceivedInterests: jest.fn(),
      getSentInterests: jest.fn(),
      getMutualInterests: jest.fn(),
      acceptInterest: jest.fn(),
      declineInterest: jest.fn(),
      withdrawInterest: jest.fn(),
      updateInterestStatus: jest.fn(),
      acceptByProfileId: jest.fn(),
      declineByProfileId: jest.fn(),
      withdrawByProfileId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestsController],
      providers: [
        {
          provide: InterestsService,
          useValue: mockInterestsService,
        },
      ],
    }).compile();

    controller = module.get<InterestsController>(InterestsController);
    interestsService = module.get(InterestsService);
  });

  describe('POST /interests', () => {
    it('should forward interest creation payload to service', async () => {
      const input = {
        targetProfileId: 'target-uuid-1',
        message: 'Hi there',
      };
      const expected = { id: 'int-1', status: 'pending' as const, isMutual: false };

      interestsService.sendInterest.mockResolvedValue(expected as any);

      const result = await controller.sendInterest(mockUserSession, input);

      expect(interestsService.sendInterest).toHaveBeenCalledWith(mockUserSession.userId, input);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /interests/summary', () => {
    it('should return interest summary', async () => {
      const expected = {
        received: [],
        sent: [],
        mutual: [],
        pendingCount: 0,
        shortlisted: [],
        blocked: [],
        notes: {},
      };

      interestsService.getSummary.mockResolvedValue(expected);

      const result = await controller.getSummary(mockUserSession);

      expect(interestsService.getSummary).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(expected);
    });
  });

  describe('GET /interests/received, /sent, /mutual', () => {
    it('should get received interests with status filter', async () => {
      interestsService.getReceivedInterests.mockResolvedValue([]);

      await controller.getReceivedInterests(mockUserSession, 'pending');

      expect(interestsService.getReceivedInterests).toHaveBeenCalledWith(
        mockUserSession.userId,
        'pending'
      );
    });

    it('should get sent interests', async () => {
      interestsService.getSentInterests.mockResolvedValue([]);

      await controller.getSentInterests(mockUserSession);

      expect(interestsService.getSentInterests).toHaveBeenCalledWith(mockUserSession.userId);
    });

    it('should get mutual interests', async () => {
      interestsService.getMutualInterests.mockResolvedValue([]);

      await controller.getMutualInterests(mockUserSession);

      expect(interestsService.getMutualInterests).toHaveBeenCalledWith(mockUserSession.userId);
    });
  });

  describe('PATCH /interests/:id/accept, /decline, /withdraw', () => {
    it('should accept interest by ID', async () => {
      interestsService.acceptInterest.mockResolvedValue({ status: 'accepted' } as any);

      const result = await controller.patchAccept(mockUserSession, 'int-123');

      expect(interestsService.acceptInterest).toHaveBeenCalledWith(
        mockUserSession.userId,
        'int-123'
      );
      expect(result).toEqual({ status: 'accepted' });
    });

    it('should decline interest by ID', async () => {
      interestsService.declineInterest.mockResolvedValue({ status: 'declined' } as any);

      const result = await controller.patchDecline(mockUserSession, 'int-123');

      expect(interestsService.declineInterest).toHaveBeenCalledWith(
        mockUserSession.userId,
        'int-123'
      );
      expect(result).toEqual({ status: 'declined' });
    });

    it('should withdraw interest by ID', async () => {
      interestsService.withdrawInterest.mockResolvedValue({ status: 'withdrawn' } as any);

      const result = await controller.patchWithdraw(mockUserSession, 'int-123');

      expect(interestsService.withdrawInterest).toHaveBeenCalledWith(
        mockUserSession.userId,
        'int-123'
      );
      expect(result).toEqual({ status: 'withdrawn' });
    });
  });

  describe('POST /interests/profile/:profileId/accept, /decline, /withdraw', () => {
    it('should accept by target profile ID', async () => {
      interestsService.acceptByProfileId.mockResolvedValue({ status: 'accepted' } as any);

      await controller.acceptByProfileId(mockUserSession, 'prof-target');

      expect(interestsService.acceptByProfileId).toHaveBeenCalledWith(
        mockUserSession.userId,
        'prof-target'
      );
    });

    it('should decline by target profile ID', async () => {
      interestsService.declineByProfileId.mockResolvedValue({ status: 'declined' } as any);

      await controller.declineByProfileId(mockUserSession, 'prof-target');

      expect(interestsService.declineByProfileId).toHaveBeenCalledWith(
        mockUserSession.userId,
        'prof-target'
      );
    });

    it('should withdraw by target profile ID', async () => {
      interestsService.withdrawByProfileId.mockResolvedValue({ status: 'withdrawn' } as any);

      await controller.withdrawByProfileId(mockUserSession, 'prof-target');

      expect(interestsService.withdrawByProfileId).toHaveBeenCalledWith(
        mockUserSession.userId,
        'prof-target'
      );
    });
  });
});
