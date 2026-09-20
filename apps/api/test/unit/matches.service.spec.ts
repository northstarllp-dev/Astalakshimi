import { MatchesService } from '../../src/matches/matches.service';

describe('MatchesService.getTopMatches (prefs-based basic matching)', () => {
  let matchesService: MatchesService;
  let mockDb: any;

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
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
    mockDb.select = mockQueryBuilder([[viewer], [], []]);
    await expect(matchesService.getTopMatches('user-2')).resolves.toEqual([]);
  });

  it('scores a passing candidate with real matchPercent + reasons and blurs by default', async () => {
    mockDb.select = mockQueryBuilder([
      [viewer],
      [], // no saved prefs → defaults (age 21–35, everything else open)
      [candidate],
      [], // photos
      [], // settings
      [], // connections
      [], // verifications
    ]);

    const result = await matchesService.getTopMatches('user-3');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('match-1');
    expect(result[0].blurPhoto).toBe(true);
    expect(result[0].matchPercent).toBeGreaterThan(40);
    expect(result[0].matchReasons).toEqual(expect.any(Array));
  });

  it('caches the result per user (second call does not hit the DB again)', async () => {
    mockDb.select = mockQueryBuilder([
      [viewer],
      [],
      [candidate],
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
    expect(mockDb.select.mock.calls.length).toBe(selectAfterFirst);
  });

  it('hard-filters candidates outside the saved age window and religion', async () => {
    const prefs = {
      prefAgeMin: 25,
      prefAgeMax: 30,
      prefHeightMinCm: null,
      prefHeightMaxCm: null,
      prefMaritalStatuses: [],
      prefReligions: ['Hindu'],
      prefCastes: [],
      prefMotherTongues: [],
      prefMinEducation: null,
      prefLocations: [],
    };
    const tooOld = { ...candidate, id: 'old-1', dob: '1970-01-01', createdAt: new Date('2026-01-02') };
    const otherFaith = { ...candidate, id: 'faith-1', religion: 'Christian', createdAt: new Date('2026-01-03') };

    mockDb.select = mockQueryBuilder([[viewer], [prefs], [candidate, tooOld, otherFaith], [], [], [], []]);

    const result = await matchesService.getTopMatches('user-5');
    expect(result.map((r) => r.id)).toEqual(['match-1']);
  });

  it('breaks score ties by recency (newest first)', async () => {
    const newer = { ...candidate, id: 'match-newer', fullName: 'Newer', createdAt: new Date('2026-06-01') };
    const older = { ...candidate, id: 'match-older', fullName: 'Older', createdAt: new Date('2025-06-01') };

    mockDb.select = mockQueryBuilder([[viewer], [], [older, newer], [], [], [], []]);

    const result = await matchesService.getTopMatches('user-6');
    expect(result.map((r) => r.id)).toEqual(['match-newer', 'match-older']);
  });

  it('does not blur the photo when an accepted connection exists', async () => {
    const mockSettings = [{ userId: 'm-user-1', photoBlur: 'always' }];
    const mockConnections = [{ senderProfileId: 'curr-1', receiverProfileId: 'match-1', status: 'accepted' }];

    mockDb.select = mockQueryBuilder([
      [viewer],
      [],
      [candidate],
      [],
      mockSettings,
      mockConnections,
      [],
    ]);

    const result = await matchesService.getTopMatches('user-7');
    expect(result).toHaveLength(1);
    expect(result[0].blurPhoto).toBe(false);
  });
});
