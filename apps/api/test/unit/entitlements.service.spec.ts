import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EntitlementsService } from '../../src/entitlements/entitlements.service';

describe('Feature 4: Entitlements - EntitlementsService (Unit Tests)', () => {
  let entitlementsService: EntitlementsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
    };

    entitlementsService = new EntitlementsService(mockDb);
  });

  describe('getUserPlan', () => {
    it('should return default free plan rules if user has no active paid subscription', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const plan = await entitlementsService.getUserPlan('user-1');

      expect(plan.slug).toBe('free');
      expect(plan.interestQuota).toBe(30);
      expect(plan.contactUnlocks).toBe(3);
      expect(plan.hasAdvancedFilters).toBe(false);
    });

    it('should return paid plan rules when user has an active subscription', async () => {
      const activeGoldPlan = {
        slug: 'gold',
        interestQuota: 500,
        contactUnlocks: null,
        hasAdvancedFilters: true,
        hasPriorityListing: true,
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ plan: activeGoldPlan }]),
      });

      const plan = await entitlementsService.getUserPlan('user-1');

      expect(plan.slug).toBe('gold');
      expect(plan.hasAdvancedFilters).toBe(true);
      expect(plan.contactUnlocks).toBeNull();
    });
  });

  describe('checkEntitlement', () => {
    it('should correctly allow/block features according to plan', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'free',
        hasAdvancedFilters: false,
        hasPriorityListing: false,
      } as any);

      expect(await entitlementsService.checkEntitlement('user-1', 'advanced_filters')).toBe(false);
      expect(await entitlementsService.checkEntitlement('user-1', 'priority_listing')).toBe(false);
      expect(await entitlementsService.checkEntitlement('user-1', 'premium_matches')).toBe(false);

      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'gold',
        hasAdvancedFilters: true,
        hasPriorityListing: true,
      } as any);

      expect(await entitlementsService.checkEntitlement('user-1', 'advanced_filters')).toBe(true);
      expect(await entitlementsService.checkEntitlement('user-1', 'priority_listing')).toBe(true);
      expect(await entitlementsService.checkEntitlement('user-1', 'premium_matches')).toBe(true);
    });
  });

  describe('getContactUnlockStatus', () => {
    it('should not auto-show contact for free plan even when mutual', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'free',
        contactUnlocks: 3,
      } as any);
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(1);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'viewer-1', userId: 'user-1' }]),
      });

      const status = await entitlementsService.getContactUnlockStatus('user-1', 'target-1', true);

      expect(status.canView).toBe(false);
      expect(status.isMutualBenefit).toBe(false);
      expect(status.remaining).toBe(2);
      expect(status.canUnlockWithQuota).toBe(true);
    });

    it('should show contact for silver plan when mutual', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'silver',
        contactUnlocks: 10,
      } as any);
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(0);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'viewer-1', userId: 'user-1' }]),
      });

      const status = await entitlementsService.getContactUnlockStatus('user-1', 'target-1', true);

      expect(status.canView).toBe(true);
      expect(status.isMutualBenefit).toBe(true);
    });

    it('should allow extra pay when monthly quota is exhausted', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'free',
        contactUnlocks: 3,
      } as any);
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(3);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'viewer-1', userId: 'user-1' }]),
      });

      const status = await entitlementsService.getContactUnlockStatus('user-1', 'target-1', false);

      expect(status.canUnlockWithQuota).toBe(false);
      expect(status.canPayExtra).toBe(true);
      expect(status.remaining).toBe(0);
    });
  });

  describe('unlockContactWithQuota', () => {
    it('should insert an unlocked contact when quota remains', async () => {
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getContactUnlockStatus').mockResolvedValue({
        canUnlockWithQuota: true,
        remaining: 2,
        canPayExtra: false,
        limit: 3,
      } as any);

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'viewer-1' }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'target-1', userId: 'owner-1' }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ phone: '9876543210' }]),
        });

      mockDb.insert.mockReturnValue({ values: jest.fn().mockResolvedValue(undefined) });

      const result = await entitlementsService.unlockContactWithQuota('user-1', 'target-1');

      expect(result.success).toBe(true);
      expect(result.contactPhone).toBe('9876543210');
      expect(result.remaining).toBe(1);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when quota is exhausted', async () => {
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getContactUnlockStatus').mockResolvedValue({
        canUnlockWithQuota: false,
        canPayExtra: true,
        remaining: 0,
        limit: 3,
      } as any);

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'viewer-1' }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'target-1', userId: 'owner-1' }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ phone: '9876543210' }]),
        });

      await expect(
        entitlementsService.unlockContactWithQuota('user-1', 'target-1')
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when viewer has no profile', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(
        entitlementsService.unlockContactWithQuota('user-1', 'target-1')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when unlocking own profile', async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'same-id' }]),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([{ id: 'same-id', userId: 'user-1' }]),
        });

      await expect(
        entitlementsService.unlockContactWithQuota('user-1', 'same-id')
      ).rejects.toThrow(BadRequestException);
    });
  });
});
