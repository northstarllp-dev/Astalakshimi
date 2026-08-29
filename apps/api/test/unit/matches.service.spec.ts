import { MatchesService } from '../../src/matches/matches.service';

describe('Feature 15/Matches - MatchesService (Unit Tests)', () => {
  let matchesService: MatchesService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
    };
    matchesService = new MatchesService(mockDb);
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
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('getTopMatches', () => {
    it('should return empty array if no matches found', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'curr-1', gender: 'Male' }], // current user
        [], // matches
      ]);

      const result = await matchesService.getTopMatches('user-1');
      expect(result).toEqual([]);
    });

    it('should return matches with correct opposite gender', async () => {
      const mockMatches = [
        { id: 'match-1', userId: 'm-user-1', gender: 'Female', fullName: 'Match 1', dob: '1995-01-01' },
      ];
      
      mockDb.select = mockQueryBuilder([
        [{ id: 'curr-1', gender: 'Male' }], // current user
        mockMatches, // topProfiles
        [], // photos
        [], // settings
        [], // connections
      ]);

      const result = await matchesService.getTopMatches('user-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('match-1');
      expect(result[0].blurPhoto).toBe(true); // default blur setting is true if not connected
    });

    it('should not blur photo if connection is accepted', async () => {
      const mockMatches = [
        { id: 'match-1', userId: 'm-user-1', gender: 'Female', fullName: 'Match 1', dob: '1995-01-01' },
      ];
      const mockSettings = [{ userId: 'm-user-1', photoBlur: 'always' }];
      const mockConnections = [{ senderProfileId: 'curr-1', receiverProfileId: 'match-1', status: 'accepted' }];
      
      mockDb.select = mockQueryBuilder([
        [{ id: 'curr-1', gender: 'Male' }], // current user
        mockMatches, // topProfiles
        [], // photos
        mockSettings, // settings
        mockConnections, // connections
      ]);

      const result = await matchesService.getTopMatches('user-1');
      
      expect(result).toHaveLength(1);
      expect(result[0].blurPhoto).toBe(false); // Should be false because connected
    });
  });
});
