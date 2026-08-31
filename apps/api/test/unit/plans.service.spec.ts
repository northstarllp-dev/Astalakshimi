import { PlansService } from '../../src/plans/plans.service';
import { plans } from '@astalakshimi/database';

describe('Feature 4: Plans - PlansService (Unit Tests)', () => {
  let plansService: PlansService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    plansService = new PlansService(mockDb);
  });

  it('should return active plans sorted by displayOrder', async () => {
    const mockPlansList = [
      { id: '1', slug: 'free', name: 'Free', isActive: true, displayOrder: 1 },
      { id: '2', slug: 'silver', name: 'Silver', isActive: true, displayOrder: 2 },
      { id: '3', slug: 'gold', name: 'Gold', isActive: true, displayOrder: 3 },
      { id: '4', slug: 'platinum', name: 'Platinum', isActive: true, displayOrder: 4 },
      { id: '5', slug: 'diamond', name: 'Diamond', isActive: true, displayOrder: 5 },
    ];

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockResolvedValue(mockPlansList),
    });

    const result = await plansService.getActivePlans();

    expect(result).toHaveLength(5);
    expect(result[0].slug).toBe('free');
    expect(result[4].slug).toBe('diamond');
  });

  it('should sync default plans on module init', async () => {
    // Return empty for all 5 checks so it inserts all 5
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });

    const mockValues = jest.fn().mockResolvedValue(undefined);
    mockDb.insert.mockReturnValue({ values: mockValues });

    await plansService.onModuleInit();

    expect(mockDb.insert).toHaveBeenCalledTimes(5);
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'free', pricePaise: 0 })
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'silver', pricePaise: 29900 })
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'gold', pricePaise: 49900 })
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'platinum', pricePaise: 89900 })
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'diamond', pricePaise: 129900 })
    );
  });
});
