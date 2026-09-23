import { ActivityService } from '../../src/activity/activity.service';

jest.mock('../../src/common/photo-access', () => ({
  getApprovedPrimaryPhotos: jest.fn(),
}));

import { getApprovedPrimaryPhotos } from '../../src/common/photo-access';

describe('Feature 16: Activity Dashboard - ActivityService (Unit Tests)', () => {
  let activityService: ActivityService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    activityService = new ActivityService(mockDb);
    jest.mocked(getApprovedPrimaryPhotos).mockReset();
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
      expect(getApprovedPrimaryPhotos).not.toHaveBeenCalled();
    });

    it('should map viewers, interests, and shortlists with primary photos', async () => {
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
        mockInterests, // 1. interests
        mockShortlists, // 2. shortlists
        mockViews, // 3. viewers
      ]);

      jest.mocked(getApprovedPrimaryPhotos).mockResolvedValue(
        new Map([
          ['sender-1', { s3Key: 'profiles/a/1.jpeg', id: 'ph-1' }],
          ['viewer-1', { s3Key: 'profiles/c/1.jpeg', id: 'ph-3' }],
        ]),
      );

      const result = await activityService.getSummary('user-1');

      expect(result.interestsReceived).toHaveLength(1);
      expect(result.interestsReceived[0].name).toBe('Alice');
      expect(result.interestsReceived[0].photo).toBe('profiles/a/1.jpeg');

      expect(result.shortlistedYou).toHaveLength(1);
      expect(result.shortlistedYou[0].name).toBe('Bob');
      expect(result.shortlistedYou[0].photo).toBeNull();

      expect(result.viewers).toHaveLength(1);
      expect(result.viewers[0].name).toBe('Charlie');
      expect(result.viewers[0].photo).toBe('profiles/c/1.jpeg');

      expect(getApprovedPrimaryPhotos).toHaveBeenCalledWith(
        mockDb,
        expect.arrayContaining(['sender-1', 'sender-2', 'viewer-1']),
      );
    });
  });
});
