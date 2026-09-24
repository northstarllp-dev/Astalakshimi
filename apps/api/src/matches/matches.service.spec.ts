import { Test, TestingModule } from '@nestjs/testing';
import { MatchesService } from './matches.service';
import { DB_CLIENT } from '../database/database.constants';

// Mock the imported functions
jest.mock('./viewer-context', () => ({
  loadViewerContext: jest.fn(),
  dobBoundsForAgeWindow: jest.fn(),
  cleanList: jest.fn(),
  lowerIn: jest.fn(),
  visibilitySql: jest.fn(),
}));

jest.mock('./match-scoring', () => ({
  targetGenders: jest.fn(),
  hasRequiredPartnerPrefs: jest.fn(),
  passesHardFilters: jest.fn(),
  scoreCandidate: jest.fn(),
  candidateAge: jest.fn(),
}));

jest.mock('../common/photo-access', () => ({
  getApprovedPrimaryPhotos: jest.fn(),
  computeBlurDecision: jest.fn(),
}));

import { loadViewerContext, dobBoundsForAgeWindow } from './viewer-context';
import { targetGenders, hasRequiredPartnerPrefs, passesHardFilters, scoreCandidate, candidateAge } from './match-scoring';
import { getApprovedPrimaryPhotos, computeBlurDecision } from '../common/photo-access';

describe('MatchesService', () => {
  let service: MatchesService;
  let dbMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
      innerJoin: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatchesService,
        { provide: DB_CLIENT, useValue: dbMock },
      ],
    }).compile();

    service = module.get<MatchesService>(MatchesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTopMatches', () => {
    it('returns empty array if required prefs are missing', async () => {
      (loadViewerContext as jest.Mock).mockResolvedValue({ prefs: {} });
      (hasRequiredPartnerPrefs as jest.Mock).mockReturnValue(false);

      const result = await service.getTopMatches('user1');
      expect(result).toEqual([]);
    });

    it('computes scored pool and returns top matches', async () => {
      (loadViewerContext as jest.Mock).mockResolvedValue({
        profileId: 'viewer_profile',
        gender: 'Male',
        viewerIsPaid: true,
        prefs: { prefAgeMin: 20, prefAgeMax: 30 }
      });
      (hasRequiredPartnerPrefs as jest.Mock).mockReturnValue(true);
      (targetGenders as jest.Mock).mockReturnValue(['Female']);
      (dobBoundsForAgeWindow as jest.Mock).mockReturnValue({ dobUpper: new Date(), dobLower: new Date() });
      
      const mockProfiles = [
        { id: 'profile1', userId: 'user2', createdAt: new Date() },
        { id: 'profile2', userId: 'user3', createdAt: new Date() },
      ];
      
      dbMock.limit.mockResolvedValueOnce(mockProfiles); // pool query
      
      (passesHardFilters as jest.Mock).mockReturnValue({ ok: true });
      (scoreCandidate as jest.Mock).mockImplementation((p) => ({ points: p.id === 'profile1' ? 10 : 5, breakdown: [] }));

      (getApprovedPrimaryPhotos as jest.Mock).mockResolvedValue(new Map());
      (computeBlurDecision as jest.Mock).mockReturnValue({ blurPhoto: false, withholdKey: false });
      (candidateAge as jest.Mock).mockReturnValue(25);
      
      // enrichMatches queries

      dbMock.where.mockReturnValue(dbMock);
      dbMock.limit.mockReturnValue(dbMock);
      dbMock.then = jest.fn()
        .mockImplementationOnce((res) => res(mockProfiles)) // limit pool
        .mockImplementationOnce((res) => res([])) // settings
        .mockImplementationOnce((res) => res([])) // activeSubs
        .mockImplementationOnce((res) => res([])) // connections
        .mockImplementationOnce((res) => res([])); // verifications
      
      const result = await service.getTopMatches('user1');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('profile1'); // Higher score
      expect(result[1].id).toBe('profile2');
    });
  });
});
