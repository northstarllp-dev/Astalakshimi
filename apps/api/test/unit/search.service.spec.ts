import { SearchService } from '../../src/search/search.service';
import { profiles, profilePhotos, userSettings, interests } from '@astalakshimi/database';

/**
 * Build a query-chain mock backed by a real resolved Promise so both
 * `await chain` and `chain.catch(() => fallback)` work (the service calls
 * `.catch` on the connections/settings promises).
 *
 * Call order for the default (score-ranked) tab:
 *   1. loadViewerContext: viewer profile
 *   2. loadViewerContext: partner preferences
 *   3. candidate pool (scored + ranked, paginated in Node)
 *   4. photos, 5. settings, 6. subs, 7. connections, 8. verifications
 */
function mockChain(value: any) {
  const p = Promise.resolve(value);
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    then: (resolve: any, reject: any) => p.then(resolve, reject),
    catch: (handler: any) => p.catch(handler),
  };
  return chain;
}

describe('Feature 6: Search & Filtering - SearchService (Unit Tests)', () => {
  let searchService: SearchService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    const mockEntitlementsService = {
      getUserPlan: jest.fn().mockResolvedValue({ slug: 'free' }),
    } as any;
    searchService = new SearchService(mockDb, mockEntitlementsService);
  });

  it('should return matching profiles with basic filters (opposite gender)', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = {
      id: 'prof-target',
      userId: 'user-target',
      fullName: 'Alice',
      gender: 'Female',
      createdAt: new Date(),
    };

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      const value =
        currentCall === 1 ? [mockCurrentUser] // viewer profile
        : currentCall === 2 ? [] // viewer preferences
        : currentCall === 3 ? [mockResultProfile] // candidate pool
        : currentCall === 4 ? [] // photos
        : currentCall === 5 ? [] // settings
        : currentCall === 6 ? [] // subs
        : currentCall === 7 ? [] // connections
        : [];
      return mockChain(value);
    });

    const result = await searchService.searchProfiles('curr-user-id', {});

    expect(result.totalCount).toBe(1);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].id).toBe('prof-target');
    expect(result.profiles[0].blurPhoto).toBe(true); // Default without settings/connections
    // Real score: base 40, no matching dimensions with unset prefs.
    expect(result.profiles[0].matchPercent).toBe(40);
    expect(result.profiles[0].matchReasons).toEqual([]);
  });

  it('should apply pagination and return empty results if no profiles match', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      const value =
        currentCall === 1 ? [{ id: 'curr', gender: 'Female' }]
        : currentCall === 2 ? []
        : [];
      return mockChain(value);
    });

    const result = await searchService.searchProfiles('curr-user-id', { page: '2', limit: '20' });

    expect(result.totalCount).toBe(0);
    expect(result.profiles).toHaveLength(0);
  });

  it('should not blur photo if setting is never', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', fullName: 'Alice', createdAt: new Date() };
    const mockSettings = [{ userId: 'user-target', photoBlur: 'never' }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      const value =
        currentCall === 1 ? [mockCurrentUser]
        : currentCall === 2 ? []
        : currentCall === 3 ? [mockResultProfile]
        : currentCall === 4 ? [] // photos
        : currentCall === 5 ? mockSettings
        : currentCall === 6 ? [] // subs
        : currentCall === 7 ? [] // connections
        : [];
      return mockChain(value);
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false);
  });

  it('should not blur photo if connection is accepted', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', fullName: 'Alice', createdAt: new Date() };
    const mockSettings = [{ userId: 'user-target', photoBlur: 'when_not_connected' }];
    const mockConnections = [{ senderProfileId: 'prof-curr', receiverProfileId: 'prof-target', status: 'accepted' }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      const value =
        currentCall === 1 ? [mockCurrentUser]
        : currentCall === 2 ? []
        : currentCall === 3 ? [mockResultProfile]
        : currentCall === 4 ? [] // photos
        : currentCall === 5 ? mockSettings
        : currentCall === 6 ? [] // subs
        : currentCall === 7 ? mockConnections
        : [];
      return mockChain(value);
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false); // Should not blur because connection is accepted
  });

  it('should include primary photo URL in the response', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', createdAt: new Date() };
    const mockPhotos = [{ profileId: 'prof-target', s3Key: 'photo-key-123.jpg', isPrimary: true }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      const value =
        currentCall === 1 ? [mockCurrentUser]
        : currentCall === 2 ? []
        : currentCall === 3 ? [mockResultProfile]
        : currentCall === 4 ? mockPhotos
        : currentCall === 5 ? [] // settings
        : currentCall === 6 ? [] // subs
        : currentCall === 7 ? [] // connections
        : [];
      return mockChain(value);
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].photos).toEqual(['photo-key-123.jpg']);
  });
});
