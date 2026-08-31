import { EntitlementsService } from '../../src/entitlements/entitlements.service';

describe('Feature 4: Entitlements - EntitlementsService (Unit Tests)', () => {
  let entitlementsService: EntitlementsService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
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
        contactUnlocks: 50,
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
});
