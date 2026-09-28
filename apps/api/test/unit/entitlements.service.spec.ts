import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EntitlementsService } from '../../src/entitlements/entitlements.service';
import { contactMonthWindow } from '../../src/entitlements/contact-month';

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
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      const plan = await entitlementsService.getUserPlan('user-1');

      expect(plan.slug).toBe('free');
      expect(plan.interestQuota).toBe(30);
      expect(plan.contactUnlocks).toBe(3);
      expect(plan.hasAdvancedFilters).toBe(false);
      expect(plan.startsAt).toBeNull();
      expect(plan.expiresAt).toBeNull();
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
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{
          plan: activeGoldPlan,
          startsAt: new Date('2026-09-01T00:00:00.000Z'),
          expiresAt: new Date('2027-03-01T00:00:00.000Z'),
        }]),
      });

      const plan = await entitlementsService.getUserPlan('user-1');

      expect(plan.slug).toBe('gold');
      expect(plan.hasAdvancedFilters).toBe(true);
      expect(plan.contactUnlocks).toBeNull();
      expect(plan.startsAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
      expect(plan.expiresAt).toEqual(new Date('2027-03-01T00:00:00.000Z'));
    });
  });

  describe('getLastEndedSubscriptionAt', () => {
    it('returns the latest subscription end that is already in the past', async () => {
      const ended = new Date('2026-08-01T00:00:00.000Z');
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ expiresAt: ended }]),
      });

      await expect(entitlementsService.getLastEndedSubscriptionAt('user-1')).resolves.toEqual(ended);
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

    it('does not reveal a silver contact on mutual match until an unlock is used', async () => {
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

      expect(status.canView).toBe(false);
      expect(status.isUnlocked).toBe(false);
      expect(status.isMutualBenefit).toBe(true);
      expect(status.canUnlockWithQuota).toBe(true);
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

    it('should prompt payment for silver plan when 10 contacts limit is reached', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'silver',
        contactUnlocks: 10,
      } as any);
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(10);

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'viewer-1', userId: 'user-1' }]),
      });

      const status = await entitlementsService.getContactUnlockStatus('user-1', 'target-1', true);

      expect(status.canUnlockWithQuota).toBe(false);
      expect(status.canPayExtra).toBe(true);
      expect(status.remaining).toBe(0);
      expect(status.extraContactFeePaise).toBe(2900);
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
      ).rejects.toThrow('You have used all 3 contact unlocks this month');
    });

    it('should throw when a Silver member has used all 10 contact unlocks', async () => {
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
      jest.spyOn(entitlementsService, 'getContactUnlockStatus').mockResolvedValue({
        canUnlockWithQuota: false,
        canPayExtra: true,
        remaining: 0,
        limit: 10,
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
      ).rejects.toThrow('You have used all 10 contact unlocks this month');
    });

    it('returns the phone without inserting when the contact is already unlocked', async () => {
      jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(true);
      jest.spyOn(entitlementsService, 'getContactUnlockStatus').mockResolvedValue({
        remaining: 2,
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

      const result = await entitlementsService.unlockContactWithQuota('user-1', 'target-1');

      expect(result.alreadyUnlocked).toBe(true);
      expect(result.contactPhone).toBe('9876543210');
      expect(result.remaining).toBe(2);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it.each(['gold', 'platinum', 'diamond'])(
      'unlocks without a cap on %s',
      async (slug) => {
        jest.spyOn(entitlementsService, 'isContactUnlocked').mockResolvedValue(false);
        jest.spyOn(entitlementsService, 'getContactUnlockStatus').mockResolvedValue({
          canUnlockWithQuota: true,
          remaining: null,
          canPayExtra: false,
          limit: null,
          planSlug: slug,
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
        expect(result.remaining).toBeNull();
        expect(mockDb.insert).toHaveBeenCalled();
      },
    );

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

  describe('getUsage', () => {
    const profileSelect = () => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ id: 'viewer-1' }]),
    });

    it('returns remaining 0 when Free has used all 3', async () => {
      const window = contactMonthWindow();
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'free',
        contactUnlocks: 3,
      } as any);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(3);
      mockDb.select.mockReturnValue(profileSelect());

      await expect(entitlementsService.getUsage('user-1')).resolves.toMatchObject({
        planSlug: 'free',
        limit: 3,
        usedThisMonth: 3,
        remaining: 0,
        canPayExtra: true,
        periodLabel: 'this month',
        periodStart: window.start.toISOString(),
        periodEnd: window.end.toISOString(),
      });
    });

    it('returns remaining 0 when Silver has used all 10', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'silver',
        contactUnlocks: 10,
      } as any);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(10);
      mockDb.select.mockReturnValue(profileSelect());

      await expect(entitlementsService.getUsage('user-1')).resolves.toMatchObject({
        planSlug: 'silver',
        limit: 10,
        usedThisMonth: 10,
        remaining: 0,
        canPayExtra: true,
        periodLabel: 'this month',
      });
    });

    it('keeps this month’s Free unlocks after an upgrade to Silver', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'silver',
        contactUnlocks: 10,
      } as any);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(3);
      mockDb.select.mockReturnValue(profileSelect());

      await expect(entitlementsService.getUsage('user-1')).resolves.toMatchObject({
        planSlug: 'silver',
        limit: 10,
        usedThisMonth: 3,
        remaining: 7,
        canPayExtra: false,
      });
    });

    it('blocks Free quota unlocks after expiry when four contacts were already used', async () => {
      jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
        slug: 'free',
        contactUnlocks: 3,
      } as any);
      jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(4);
      mockDb.select.mockReturnValue(profileSelect());

      await expect(entitlementsService.getUsage('user-1')).resolves.toMatchObject({
        planSlug: 'free',
        limit: 3,
        usedThisMonth: 4,
        remaining: 0,
        canPayExtra: true,
      });
    });

    it.each(['gold', 'platinum', 'diamond'])(
      'returns unlimited remaining on %s',
      async (slug) => {
        jest.spyOn(entitlementsService, 'getUserPlan').mockResolvedValue({
          slug,
          contactUnlocks: null,
        } as any);
        jest.spyOn(entitlementsService, 'getMonthlyContactUnlockCount').mockResolvedValue(12);
        mockDb.select.mockReturnValue(profileSelect());

        await expect(entitlementsService.getUsage('user-1')).resolves.toMatchObject({
          planSlug: slug,
          limit: null,
          usedThisMonth: 12,
          remaining: null,
          canPayExtra: false,
          periodLabel: 'this month',
        });
      },
    );
  });
});
