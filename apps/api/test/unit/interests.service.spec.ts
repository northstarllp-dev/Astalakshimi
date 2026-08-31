import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InterestsService } from '../../src/interests/interests.service';
import { interests, profiles, profilePhotos } from '@astalakshimi/database';

describe('Feature 3: Interest System - InterestsService (Unit Tests)', () => {
  let interestsService: InterestsService;
  let mockDb: any;
  let mockEntitlementsService: any;
  let mockNotificationsService: any;

  const senderProfile = {
    id: 'sender-prof-id',
    userId: 'sender-user-id',
    fullName: 'Karthik Loganathan',
    dob: '1995-06-15',
    city: 'Chennai',
  };

  const targetProfile = {
    id: 'target-prof-id',
    userId: 'target-user-id',
    fullName: 'Ananya Sharma',
    dob: '1998-08-20',
    city: 'Bangalore',
  };

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockEntitlementsService = {
      getUserPlan: jest.fn().mockResolvedValue({
        slug: 'free',
        interestQuota: 30,
      }),
    };

    mockNotificationsService = {
      createNotification: jest.fn().mockResolvedValue({}),
    };

    interestsService = new InterestsService(
      mockDb,
      mockEntitlementsService,
      mockNotificationsService
    );
  });

  describe('sendInterest', () => {
    it('should throw NotFoundException if sender has not created a profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        interestsService.sendInterest('sender-user-id', { targetProfileId: 'target-prof-id' })
      ).rejects.toThrow('User profile not found. Please complete your profile first.');
    });

    it('should throw NotFoundException if target profile does not exist', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      await expect(
        interestsService.sendInterest('sender-user-id', { targetProfileId: 'non-existent' })
      ).rejects.toThrow('Target profile not found');
    });

    it('should throw BadRequestException if sender tries to send interest to themselves', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([senderProfile]),
        };
      });

      await expect(
        interestsService.sendInterest('sender-user-id', { targetProfileId: senderProfile.id })
      ).rejects.toThrow('Cannot send interest to yourself');
    });

    it('should throw ForbiddenException if user has reached their plan interest quota limit', async () => {
      mockEntitlementsService.getUserPlan.mockResolvedValue({
        slug: 'free',
        interestQuota: 5,
      });

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
          // target profile
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else {
          // sent count query -> 5 interests already sent
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 5 }]),
          };
        }
      });

      await expect(
        interestsService.sendInterest('sender-user-id', { targetProfileId: targetProfile.id })
      ).rejects.toThrow('You have reached your interest quota limit of 5');
    });

    it('should auto-accept into mutual match if target user already sent a pending interest', async () => {
      const existingReverseInterest = {
        id: 'rev-interest-1',
        senderProfileId: targetProfile.id,
        receiverProfileId: senderProfile.id,
        status: 'pending',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCount === 3) {
          // quota count -> 0
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          };
        } else {
          // reverse interest lookup -> found pending reverse interest
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([existingReverseInterest]),
          };
        }
      });

      const updatedInterest = {
        ...existingReverseInterest,
        status: 'accepted',
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updatedInterest]),
        }),
      });

      const result = await interestsService.sendInterest('sender-user-id', {
        targetProfileId: targetProfile.id,
      });

      expect(result.status).toBe('accepted');
      expect(result.isMutual).toBe(true);
      expect(result.message).toContain('Mutual match');
      // Should notify both users
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if interest is already sent and pending', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCount === 3) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          };
        } else if (selectCount === 4) {
          // reverse interest -> none
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else {
          // direct interest -> already pending
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ status: 'pending' }]),
          };
        }
      });

      await expect(
        interestsService.sendInterest('sender-user-id', { targetProfileId: targetProfile.id })
      ).rejects.toThrow('Interest already sent and is pending response');
    });

    it('should allow re-sending when previously withdrawn', async () => {
      const existingWithdrawn = {
        id: 'withdrawn-interest-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'withdrawn',
        message: 'Old message',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCount === 3) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          };
        } else if (selectCount === 4) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([existingWithdrawn]),
          };
        }
      });

      const reopened = {
        ...existingWithdrawn,
        status: 'pending',
        message: 'New hello message',
      };

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([reopened]),
        }),
      });

      const result = await interestsService.sendInterest('sender-user-id', {
        targetProfileId: targetProfile.id,
        message: 'New hello message',
      });

      expect(result.status).toBe('pending');
      expect(result.isMutual).toBe(false);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetProfile.userId,
          kind: 'interest_received',
        })
      );
    });

    it('should successfully create a new interest and notify target user', async () => {
      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else if (selectCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCount === 3) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          };
        } else if (selectCount === 4) {
          // reverse interest -> none
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else {
          // direct existing -> none
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      const newInterestRecord = {
        id: 'new-int-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'pending',
        message: 'Hello Ananya',
      };

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([newInterestRecord]),
        }),
      });

      const result = await interestsService.sendInterest('sender-user-id', {
        targetProfileId: targetProfile.id,
        message: 'Hello Ananya',
      });

      expect(result.id).toBe('new-int-1');
      expect(result.status).toBe('pending');
      expect(result.isMutual).toBe(false);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: targetProfile.userId,
          title: 'New Interest Received',
          kind: 'interest_received',
        })
      );
    });
  });

  describe('updateInterestStatus & actions', () => {
    it('should throw NotFoundException if interest record does not exist', async () => {
      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      }));

      await expect(
        interestsService.updateInterestStatus('sender-user-id', 'non-existent', 'accepted')
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent sender from accepting/declining (only receiver can accept/decline)', async () => {
      const interestRow = {
        id: 'int-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'pending',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // current user profile is sender
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([interestRow]),
          };
        }
      });

      await expect(
        interestsService.updateInterestStatus('sender-user-id', 'int-1', 'accepted')
      ).rejects.toThrow('Only receiver can accept/decline interest');
    });

    it('should prevent receiver from withdrawing (only sender can withdraw)', async () => {
      const interestRow = {
        id: 'int-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'pending',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // current user profile is target/receiver
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([interestRow]),
          };
        }
      });

      await expect(
        interestsService.updateInterestStatus('target-user-id', 'int-1', 'withdrawn')
      ).rejects.toThrow('Only sender can withdraw interest');
    });

    it('should allow receiver to accept interest and notify original sender', async () => {
      const interestRow = {
        id: 'int-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'pending',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // targetProfile is receiver
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([targetProfile]),
          };
        } else if (selectCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([interestRow]),
          };
        } else {
          // look up sender for notification
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        }
      });

      const updated = { ...interestRow, status: 'accepted' };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updated]),
        }),
      });

      const result = await interestsService.updateInterestStatus(
        'target-user-id',
        'int-1',
        'accepted'
      );

      expect(result.status).toBe('accepted');
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: senderProfile.userId,
          title: 'Interest Accepted!',
        })
      );
    });

    it('should allow sender to withdraw interest', async () => {
      const interestRow = {
        id: 'int-1',
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        status: 'pending',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([senderProfile]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([interestRow]),
          };
        }
      });

      const updated = { ...interestRow, status: 'withdrawn' };
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updated]),
        }),
      });

      const result = await interestsService.updateInterestStatus(
        'sender-user-id',
        'int-1',
        'withdrawn'
      );

      expect(result.status).toBe('withdrawn');
    });
  });

  describe('getSummary & list methods', () => {
    it('should compute summary with received, sent, mutual counts', async () => {
      jest.spyOn(interestsService, 'getReceivedInterests').mockResolvedValue([
        { id: '1', status: 'pending' } as any,
        { id: '2', status: 'accepted' } as any,
      ]);
      jest.spyOn(interestsService, 'getSentInterests').mockResolvedValue([]);
      jest.spyOn(interestsService, 'getMutualInterests').mockResolvedValue([]);

      const summary = await interestsService.getSummary('sender-user-id');

      expect(summary.pendingCount).toBe(1);
      expect(summary.received.length).toBe(2);
      expect(summary.sent).toEqual([]);
      expect(summary.mutual).toEqual([]);
    });
  });
});
