import { ActivityService } from '../../src/activity/activity.service';

describe('Feature 16: Activity Dashboard - ActivityService (Unit Tests)', () => {
  let activityService: ActivityService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    activityService = new ActivityService(mockDb);
  });

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('getSummary', () => {
    it('should return empty arrays if user profile missing', async () => {
      mockDb.select = mockQueryBuilder([[]]);

      const result = await activityService.getSummary('missing-user');
      expect(result).toEqual({
        viewers: [],
        youViewed: [],
        interestsReceived: [],
        shortlistedYou: [],
      });
    });

    it('should map viewers, interests, and shortlists', async () => {
      const mockDate = new Date('2026-06-01T10:00:00Z');
      
      const mockInterests = [
        {
          interest: { createdAt: mockDate },
          sender: { id: 'sender-1', fullName: 'Alice' },
        },
      ];
      const mockShortlists = [
        {
          shortlist: { createdAt: mockDate },
          sender: { id: 'sender-2', fullName: 'Bob' },
        },
      ];
      const mockViews = [
        {
          view: { viewedAt: mockDate },
          viewer: { id: 'viewer-1', fullName: 'Charlie' },
        },
      ];

      mockDb.select = mockQueryBuilder([
        [{ id: 'prof-1' }], // user profile
        mockInterests,      // 1. interests
        mockShortlists,     // 2. shortlists
        mockViews,          // 3. viewers
      ]);

      const result = await activityService.getSummary('user-1');

      expect(result.interestsReceived).toHaveLength(1);
      expect(result.interestsReceived[0].name).toBe('Alice');

      expect(result.shortlistedYou).toHaveLength(1);
      expect(result.shortlistedYou[0].name).toBe('Bob');

      expect(result.viewers).toHaveLength(1);
      expect(result.viewers[0].name).toBe('Charlie');
    });
  });
});
