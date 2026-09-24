import { SearchService } from '../../src/search/search.service';

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

function isCountSelect(fields: any) {
  return fields && typeof fields === 'object' && 'count' in fields && Object.keys(fields).length === 1;
}

/** Viewer context is 3 sequential selects; pool + count run in parallel after that. */
function installSearchMock(
  mockDb: any,
  opts: {
    viewer: any;
    pool: any[];
    photos?: any[];
    settings?: any[];
    connections?: any[];
    prefs?: any[];
    paid?: any[];
  },
) {
  let ctx = 0;
  mockDb.select.mockImplementation((fields?: any) => {
    if (isCountSelect(fields)) {
      return mockChain([{ count: opts.pool.length }]);
    }
    ctx += 1;
    if (ctx === 1) return mockChain([opts.viewer]);
    if (ctx === 2) return mockChain(opts.prefs ?? []);
    if (ctx === 3) return mockChain(opts.paid ?? []);
    if (ctx === 4) return mockChain(opts.pool);
    if (ctx === 5) return mockChain(opts.photos ?? []);
    if (ctx === 6) return mockChain(opts.settings ?? []);
    if (ctx === 7) return mockChain([]); // candidate subs
    if (ctx === 8) return mockChain(opts.connections ?? []);
    return mockChain([]);
  });
}

describe('Feature 6: Search & Filtering - SearchService (Unit Tests)', () => {
  let searchService: SearchService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = { select: jest.fn() };
    const mockEntitlementsService = {
      getUserPlan: jest.fn().mockResolvedValue({ slug: 'free' }),
      checkEntitlement: jest.fn().mockResolvedValue(false),
    } as any;
    searchService = new SearchService(mockDb, mockEntitlementsService);
  });

  it('returns matching profiles without a match percent', async () => {
    const mockResultProfile = {
      id: 'prof-target',
      userId: 'user-target',
      fullName: 'Alice',
      gender: 'Female',
      createdAt: new Date(),
    };
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male' },
      pool: [mockResultProfile],
    });

    const result = await searchService.searchProfiles('curr-user-id', {});

    expect(result.totalCount).toBe(1);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].id).toBe('prof-target');
    expect(result.profiles[0].blurPhoto).toBe(true);
    expect((result.profiles[0] as { matchPercent?: number }).matchPercent).toBeUndefined();
    expect(result.profiles[0].matchReasons).toBeUndefined();
  });

  it('should apply pagination and return empty results if no profiles match', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'curr', gender: 'Female' },
      pool: [],
    });

    const result = await searchService.searchProfiles('curr-user-id', { page: '2', limit: '20' });
    expect(result.totalCount).toBe(0);
    expect(result.profiles).toHaveLength(0);
  });

  it('should not blur photo if setting is never', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male' },
      pool: [{ id: 'prof-target', userId: 'user-target', fullName: 'Alice', createdAt: new Date() }],
      settings: [{ userId: 'user-target', photoBlur: 'never' }],
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false);
  });

  it('should not blur photo if connection is accepted', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male' },
      pool: [{ id: 'prof-target', userId: 'user-target', fullName: 'Alice', createdAt: new Date() }],
      settings: [{ userId: 'user-target', photoBlur: 'when_not_connected' }],
      connections: [{ senderProfileId: 'prof-curr', receiverProfileId: 'prof-target', status: 'accepted' }],
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false);
  });

  it('should include primary photo URL in the response', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male' },
      pool: [{ id: 'prof-target', userId: 'user-target', createdAt: new Date() }],
      photos: [{ profileId: 'prof-target', s3Key: 'photo-key-123.jpg', isPrimary: true }],
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].photos).toEqual(['photo-key-123.jpg']);
  });

  it('unfiltered search still returns the opposite-gender pool', async () => {
    const pool = [
      { id: 'p1', userId: 'u1', fullName: 'A', gender: 'Female', createdAt: new Date() },
      { id: 'p2', userId: 'u2', fullName: 'B', gender: 'Female', createdAt: new Date() },
    ];
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male', city: 'Chennai', state: 'Tamil Nadu' },
      pool,
    });

    const result = await searchService.searchProfiles('curr-user-id', { tab: 'all' });
    expect(result.totalCount).toBe(2);
    expect(result.profiles.map((p: { id: string }) => p.id)).toEqual(['p1', 'p2']);
  });

  it('verified browse tab returns profiles newest-first with no percent', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male', city: 'Chennai', state: 'Tamil Nadu' },
      pool: [
        {
          id: 'prof-verified',
          userId: 'user-v',
          fullName: 'Verified Alice',
          gender: 'Female',
          createdAt: new Date(),
        },
      ],
    });

    const result = await searchService.searchProfiles('curr-user-id', { tab: 'verified' });
    expect(result.totalCount).toBe(1);
    expect(result.profiles[0].id).toBe('prof-verified');
    expect((result.profiles[0] as { matchPercent?: number }).matchPercent).toBeUndefined();
  });

  it('nearby browse tab uses the viewer city without requiring age filters', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male', city: 'Chennai', state: 'Tamil Nadu' },
      pool: [
        {
          id: 'prof-near',
          userId: 'user-n',
          fullName: 'Nearby Priya',
          gender: 'Female',
          city: 'Chennai',
          createdAt: new Date(),
        },
      ],
    });

    const result = await searchService.searchProfiles('curr-user-id', { tab: 'nearby' });
    expect(result.totalCount).toBe(1);
    expect(result.profiles[0].id).toBe('prof-near');
  });

  it('unfiltered browse still returns a profile that would fail For you religion', async () => {
    installSearchMock(mockDb, {
      viewer: { id: 'prof-curr', gender: 'Male' },
      prefs: [
        {
          prefAgeMin: 25,
          prefAgeMax: 32,
          prefReligions: ['Hindu'],
          prefMaritalStatuses: ['Never Married'],
        },
      ],
      pool: [
        {
          id: 'prof-muslim',
          userId: 'user-m',
          fullName: 'Muslim Priya',
          gender: 'Female',
          religion: 'Muslim',
          createdAt: new Date(),
        },
      ],
    });

    const result = await searchService.searchProfiles('curr-user-id', { tab: 'all' });
    expect(result.profiles.map((p: { id: string }) => p.id)).toEqual(['prof-muslim']);
    expect((result.profiles[0] as { matchPercent?: number }).matchPercent).toBeUndefined();
  });

  it('still returns profiles when the viewer is on a paid plan', async () => {
    let ctx = 0;
    mockDb.select.mockImplementation((fields?: any) => {
      if (isCountSelect(fields)) {
        return mockChain([{ count: 1 }]);
      }
      ctx += 1;
      if (ctx === 1) return mockChain([{ id: 'prof-curr', gender: 'Male' }]);
      if (ctx === 2) return mockChain([]);
      if (ctx === 3) return mockChain([{ slug: 'gold' }]);
      if (ctx === 4) {
        return mockChain([
          { id: 'prof-premium-only', userId: 'user-p', fullName: 'Premium', gender: 'Female', createdAt: new Date() },
        ]);
      }
      return mockChain([]);
    });

    const result = await searchService.searchProfiles('paid-user', { tab: 'all' });
    expect(result.totalCount).toBe(1);
    expect(result.profiles[0].id).toBe('prof-premium-only');
  });
});
