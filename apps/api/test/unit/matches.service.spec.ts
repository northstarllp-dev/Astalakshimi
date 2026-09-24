import { MatchesService } from '../../src/matches/matches.service';

describe('MatchesService.getTopMatches (prefs-based basic matching)', () => {
  let matchesService: MatchesService;
  let mockDb: any;

  const requiredPrefs = {
    prefAgeMin: 25,
    prefAgeMax: 35,
    prefHeightMinCm: null,
    prefHeightMaxCm: null,
    prefMaritalStatuses: ['Never Married'],
    prefReligions: ['Hindu'],
    prefCastes: [],
    prefMotherTongues: [],
    prefMinEducation: null,
    prefLocations: [],
  };

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  const viewer = { id: 'curr-1', gender: 'Male' };
  const candidate = {
    id: 'match-1',
    userId: 'm-user-1',
    fullName: 'Match 1',
    gender: 'Female',
    dob: '1996-03-12', // 30 y/o
    heightCm: 168,
    city: 'Chennai',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    motherTongue: 'Tamil',
    maritalStatus: 'Never Married',
    educationLevel: 'Bachelors',
    degree: null,
    profession: null,
    companyName: null,
    annualIncome: null,
    aboutMe: 'Hello there',
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(() => {
    mockDb = { select: jest.fn() };
    matchesService = new MatchesService(mockDb);
  });

  it('returns [] when the viewer has no profile', async () => {
    mockDb.select = mockQueryBuilder([[]]);
    await expect(matchesService.getTopMatches('user-1')).resolves.toEqual([]);
  });

  it('returns [] when the pool is empty', async () => {
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], []]);
    await expect(matchesService.getTopMatches('user-2')).resolves.toEqual([]);
  });

  it('returns reasons without a match percent and blurs by default', async () => {
    mockDb.select = mockQueryBuilder([
      [viewer],
      [requiredPrefs],
      [], // paid
      [candidate],
      [], // photos
      [], // settings
      [], // subscriptions
      [], // connections
      [], // verifications
    ]);

    const result = await matchesService.getTopMatches('user-3');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('match-1');
    expect(result[0].blurPhoto).toBe(true);
    expect((result[0] as { matchPercent?: number }).matchPercent).toBeUndefined();
    expect(result[0].matchReasons).toEqual(expect.any(Array));
  });

  it('adds display-ready fields matching the search response shape', async () => {
    mockDb.select = mockQueryBuilder([
      [viewer],
      [requiredPrefs],
      [],
      [candidate],
      [],
      [],
      [],
      [],
      [],
    ]);

    const result = await matchesService.getTopMatches('user-display');
    expect(result[0]).toMatchObject({
      gender: 'Female',
      education: 'Bachelors',
      occupation: 'Not specified',
      company: 'Not specified',
      income: 'Not specified',
      about: 'Hello there',
      community: 'Brahmin',
      height: '168 cm',
      planSlug: 'free',
      planName: 'Free',
      lastActive: 'Online now',
    });
  });

  it('caches the scored pool per user (second call skips the pool query, only re-enriches)', async () => {
    mockDb.select = mockQueryBuilder([
      [viewer],
      [requiredPrefs],
      [],
      [candidate],
      [],
      [],
      [],
      [],
      [],
    ]);

    const first = await matchesService.getTopMatches('user-4');
    expect(first).toHaveLength(1);

    const selectAfterFirst = mockDb.select.mock.calls.length;
    const second = await matchesService.getTopMatches('user-4');
    expect(second).toEqual(first);

    // The pool query + scoring fan-out is cached; only the 5 enrichment
    // lookups (photos, settings, subscriptions, connections, verifications)
    // re-run on a cache hit.
    expect(mockDb.select.mock.calls.length - selectAfterFirst).toBe(5);
  });

  it('caps the top list at 8 even when more candidates pass', async () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      ...candidate,
      id: `match-${i}`,
      createdAt: new Date(2026, 0, i + 1),
    }));
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], many, [], [], [], [], []]);

    const result = await matchesService.getTopMatches('user-cap');
    expect(result).toHaveLength(8);
  });

  it('returns [] when required partner prefs are missing', async () => {
    const emptyMarital = { ...requiredPrefs, prefMaritalStatuses: [] };
    mockDb.select = mockQueryBuilder([[viewer], [emptyMarital], []]);
    await expect(matchesService.getTopMatches('user-empty-prefs')).resolves.toEqual([]);
  });

  it('hard-filters candidates outside the saved age window and religion', async () => {
    const prefs = {
      prefAgeMin: 25,
      prefAgeMax: 30,
      prefHeightMinCm: null,
      prefHeightMaxCm: null,
      prefMaritalStatuses: ['Never Married'],
      prefReligions: ['Hindu'],
      prefCastes: [],
      prefMotherTongues: [],
      prefMinEducation: null,
      prefLocations: [],
    };
    const tooOld = { ...candidate, id: 'old-1', dob: '1970-01-01', createdAt: new Date('2026-01-02') };
    const otherFaith = { ...candidate, id: 'faith-1', religion: 'Christian', createdAt: new Date('2026-01-03') };

    mockDb.select = mockQueryBuilder([
      [viewer],
      [prefs],
      [],
      [candidate, tooOld, otherFaith],
      [],
      [],
      [],
      [],
      [],
    ]);

    const result = await matchesService.getTopMatches('user-5');
    expect(result.map((r) => r.id)).toEqual(['match-1']);
  });

  it('hard-filters marital status that is not in the selected list', async () => {
    const prefs = {
      ...requiredPrefs,
      prefMaritalStatuses: ['Never Married', 'Divorced'],
    };
    const widowed = {
      ...candidate,
      id: 'wid-1',
      maritalStatus: 'Widowed',
      createdAt: new Date('2026-01-04'),
    };

    mockDb.select = mockQueryBuilder([
      [viewer],
      [prefs],
      [],
      [candidate, widowed],
      [],
      [],
      [],
      [],
      [],
    ]);

    const result = await matchesService.getTopMatches('user-marital');
    expect(result.map((r) => r.id)).toEqual(['match-1']);
  });

  it('breaks score ties by recency (newest first)', async () => {
    const newer = { ...candidate, id: 'match-newer', fullName: 'Newer', createdAt: new Date('2026-06-01') };
    const older = { ...candidate, id: 'match-older', fullName: 'Older', createdAt: new Date('2025-06-01') };

    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], [older, newer], [], [], [], [], []]);

    const result = await matchesService.getTopMatches('user-6');
    expect(result.map((r) => r.id)).toEqual(['match-newer', 'match-older']);
  });

  it('does not blur the photo when an accepted connection exists', async () => {
    const mockSettings = [{ userId: 'm-user-1', photoBlur: 'always' }];
    const mockConnections = [{ senderProfileId: 'curr-1', receiverProfileId: 'match-1', status: 'accepted' }];

    mockDb.select = mockQueryBuilder([
      [viewer],
      [requiredPrefs],
      [],
      [candidate],
      [],
      mockSettings,
      [], // subscriptions
      mockConnections,
      [],
    ]);

    const result = await matchesService.getTopMatches('user-7');
    expect(result).toHaveLength(1);
    expect(result[0].blurPhoto).toBe(false);
  });
});

describe('MatchesService.getPaginatedMatches (preference-gated pagination)', () => {
  let matchesService: MatchesService;
  let mockDb: any;

  const requiredPrefs = {
    prefAgeMin: 25,
    prefAgeMax: 35,
    prefHeightMinCm: null,
    prefHeightMaxCm: null,
    prefMaritalStatuses: ['Never Married'],
    prefReligions: ['Hindu'],
    prefCastes: [],
    prefMotherTongues: [],
    prefMinEducation: null,
    prefLocations: [],
  };

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  const viewer = { id: 'curr-1', gender: 'Male' };
  const makeCandidate = (i: number) => ({
    id: `match-${i}`,
    userId: `m-user-${i}`,
    fullName: `Match ${i}`,
    gender: 'Female',
    dob: '1996-03-12',
    heightCm: 168,
    city: 'Chennai',
    state: 'Tamil Nadu',
    religion: 'Hindu',
    caste: 'Brahmin',
    motherTongue: 'Tamil',
    maritalStatus: 'Never Married',
    educationLevel: 'Bachelors',
    degree: null,
    profession: null,
    companyName: null,
    annualIncome: null,
    aboutMe: null,
    createdAt: new Date(2026, 0, i + 1),
  });

  beforeEach(() => {
    mockDb = { select: jest.fn() };
    matchesService = new MatchesService(mockDb);
  });

  it('returns the requested page slice with the full pool length as totalCount', async () => {
    const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3)];
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], candidates, [], [], [], [], []]);

    const result = await matchesService.getPaginatedMatches('page-user-1', { page: 1, limit: 2 });
    expect(result.totalCount).toBe(3);
    expect(result.matches).toHaveLength(2);
  });

  it('returns the second page slice', async () => {
    const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3)];
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], candidates, [], [], [], [], []]);

    const result = await matchesService.getPaginatedMatches('page-user-2', { page: 2, limit: 2 });
    expect(result.totalCount).toBe(3);
    expect(result.matches).toHaveLength(1);
  });

  it('returns an empty page with totalCount 0 when the pool is empty', async () => {
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], []]);

    const result = await matchesService.getPaginatedMatches('page-user-3', { page: 1, limit: 10 });
    expect(result).toEqual({ matches: [], totalCount: 0 });
  });

  it('returns an empty page when the viewer has no profile', async () => {
    mockDb.select = mockQueryBuilder([[]]);

    const result = await matchesService.getPaginatedMatches('page-user-4', { page: 1, limit: 10 });
    expect(result).toEqual({ matches: [], totalCount: 0 });
  });

  it('reuses the cached pool across pages of the same user', async () => {
    const candidates = [makeCandidate(1), makeCandidate(2), makeCandidate(3)];
    mockDb.select = mockQueryBuilder([[viewer], [requiredPrefs], [], candidates, [], [], [], [], []]);

    await matchesService.getPaginatedMatches('page-user-5', { page: 1, limit: 2 });
    const callsAfterFirst = mockDb.select.mock.calls.length;
    const second = await matchesService.getPaginatedMatches('page-user-5', { page: 2, limit: 2 });

    expect(second.matches).toHaveLength(1);
    // Only the enrichment queries for page 2 run; the pool query is cached.
    expect(mockDb.select.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    expect(mockDb.select.mock.calls.length).toBeLessThan(callsAfterFirst + 8);
  });
});
