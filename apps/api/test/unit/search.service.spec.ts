import { SearchService } from '../../src/search/search.service';
import { profiles, profilePhotos, userSettings, interests } from '@astalakshimi/database';

describe('Feature 6: Search & Filtering - SearchService (Unit Tests)', () => {
  let searchService: SearchService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    searchService = new SearchService(mockDb);
  });

  it('should return matching profiles with basic filters (opposite gender)', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', fullName: 'Alice', gender: 'Female' };

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          // Promise resolution mock
          if (currentCall === 1) resolve([mockCurrentUser]); // currentUser
          else if (currentCall === 2) resolve([mockResultProfile]); // query
          else if (currentCall === 3) resolve([{ count: 1 }]); // countQuery
          else if (currentCall === 4) resolve([]); // photos
          else if (currentCall === 5) resolve([]); // settings
          else if (currentCall === 6) resolve([]); // connections
          else resolve([]);
        }),
      };
    });

    const result = await searchService.searchProfiles('curr-user-id', {});

    expect(result.totalCount).toBe(1);
    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0].id).toBe('prof-target');
    expect(result.profiles[0].blurPhoto).toBe(true); // Default without settings/connections
  });

  it('should apply pagination and return empty results if no profiles match', async () => {
    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          if (currentCall === 1) resolve([{ id: 'curr', gender: 'Female' }]); // currentUser
          else if (currentCall === 2) resolve([]); // query
          else if (currentCall === 3) resolve([{ count: 0 }]); // countQuery
          else resolve([]);
        }),
      };
    });

    const result = await searchService.searchProfiles('curr-user-id', { page: '2', limit: '20' });

    expect(result.totalCount).toBe(0);
    expect(result.profiles).toHaveLength(0);
  });

  it('should not blur photo if setting is never', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', fullName: 'Alice' };
    const mockSettings = [{ userId: 'user-target', photoBlur: 'never' }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          if (currentCall === 1) resolve([mockCurrentUser]); // currentUser
          else if (currentCall === 2) resolve([mockResultProfile]); // query
          else if (currentCall === 3) resolve([{ count: 1 }]); // countQuery
          else if (currentCall === 4) resolve([]); // photos
          else if (currentCall === 5) resolve(mockSettings); // settings
          else if (currentCall === 6) resolve([]); // connections
          else resolve([]);
        }),
      };
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false);
  });

  it('should not blur photo if connection is accepted', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target', fullName: 'Alice' };
    const mockSettings = [{ userId: 'user-target', photoBlur: 'when_not_connected' }];
    const mockConnections = [{ senderProfileId: 'prof-curr', receiverProfileId: 'prof-target', status: 'accepted' }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          if (currentCall === 1) resolve([mockCurrentUser]); // currentUser
          else if (currentCall === 2) resolve([mockResultProfile]); // query
          else if (currentCall === 3) resolve([{ count: 1 }]); // countQuery
          else if (currentCall === 4) resolve([]); // photos
          else if (currentCall === 5) resolve(mockSettings); // settings
          else if (currentCall === 6) resolve(mockConnections); // connections
          else resolve([]);
        }),
      };
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].blurPhoto).toBe(false); // Should not blur because connection is accepted
  });

  it('should include primary photo URL in the response', async () => {
    const mockCurrentUser = { id: 'prof-curr', gender: 'Male' };
    const mockResultProfile = { id: 'prof-target', userId: 'user-target' };
    const mockPhotos = [{ profileId: 'prof-target', s3Key: 'photo-key-123.jpg', isPrimary: true }];

    let selectCallCount = 0;
    mockDb.select.mockImplementation(() => {
      selectCallCount++;
      const currentCall = selectCallCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => {
          if (currentCall === 1) resolve([mockCurrentUser]); // currentUser
          else if (currentCall === 2) resolve([mockResultProfile]); // query
          else if (currentCall === 3) resolve([{ count: 1 }]); // countQuery
          else if (currentCall === 4) resolve(mockPhotos); // photos
          else if (currentCall === 5) resolve([]); // settings
          else if (currentCall === 6) resolve([]); // connections
          else resolve([]);
        }),
      };
    });

    const result = await searchService.searchProfiles('curr-user-id', {});
    expect(result.profiles[0].photos).toEqual(['photo-key-123.jpg']);
  });
});
