import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { DB_CLIENT } from '../database/database.constants';
import { loadViewerContext, dobBoundsForAgeWindow } from '../matches/viewer-context';
import { targetGenders } from '../matches/match-scoring';

jest.mock('../matches/viewer-context', () => ({
  loadViewerContext: jest.fn(),
  dobBoundsForAgeWindow: jest.fn(),
  visibilitySql: jest.fn(),
}));

jest.mock('../matches/match-scoring', () => ({
  targetGenders: jest.fn(),
  candidateAge: jest.fn().mockReturnValue(25),
}));

jest.mock('../common/photo-access', () => ({
  getApprovedPrimaryPhotos: jest.fn(),
  computeBlurDecision: jest.fn().mockReturnValue({ blurPhoto: false, withholdKey: false }),
}));

describe('SearchService', () => {
  let service: SearchService;
  let dbMock: any;
  let entitlementsServiceMock: any;

  beforeEach(async () => {
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      catch: jest.fn().mockReturnThis(),
    };

    entitlementsServiceMock = {
      checkEntitlement: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: DB_CLIENT, useValue: dbMock },
        { provide: EntitlementsService, useValue: entitlementsServiceMock },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
    
    // Default mocks for external services returning Promises
    const { getApprovedPrimaryPhotos } = require('../common/photo-access');
    getApprovedPrimaryPhotos.mockResolvedValue(new Map());
  });

  describe('searchProfiles', () => {
    it('returns empty array if no target genders', async () => {
      (loadViewerContext as jest.Mock).mockResolvedValue({ gender: 'Male' });
      (targetGenders as jest.Mock).mockReturnValue([]);

      const result = await service.searchProfiles('user1', {});
      expect(result.profiles).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('applies basic filters properly', async () => {
      (loadViewerContext as jest.Mock).mockResolvedValue({
        profileId: 'profile1',
        gender: 'Male',
        viewerIsPaid: false,
      });
      (targetGenders as jest.Mock).mockReturnValue(['Female']);
      (dobBoundsForAgeWindow as jest.Mock).mockReturnValue({ dobUpper: new Date(), dobLower: new Date() });

      // For enrichMatches inside searchProfiles
      // It executes: photos, settings, subs, connections, verifications
      dbMock.where.mockReturnValue(dbMock);
      dbMock.offset.mockReturnValue(dbMock);
      dbMock.then = jest.fn()
        .mockImplementationOnce((res) => res([{ id: 'match1', userId: 'u1' }])) // query rows
        .mockImplementationOnce((res) => res([{ count: 1 }])) // count query
        .mockImplementationOnce((res) => res([])) // settings
        .mockImplementationOnce((res) => res([])) // activeSubs
        .mockImplementationOnce((res) => res([])) // connections
        .mockImplementationOnce((res) => res([])); // verifications

      const filters = {
        ageMin: 20,
        ageMax: 25,
        city: 'Chennai',
        community: 'Brahmin',
        tab: 'all',
      };

      const result = await service.searchProfiles('user1', filters);
      
      expect(result.totalCount).toBe(1);
      expect(result.profiles[0].id).toBe('match1');
    });

    it('rejects advanced filters if not entitled', async () => {
      (loadViewerContext as jest.Mock).mockResolvedValue({
        profileId: 'profile1',
        gender: 'Male',
      });
      (targetGenders as jest.Mock).mockReturnValue(['Female']);
      
      entitlementsServiceMock.checkEntitlement.mockResolvedValue(false);

      const filters = {
        advanced: { heights: [160, 165] },
      };

      await expect(service.searchProfiles('user1', filters)).rejects.toThrow('Advanced filters require a paid plan');
    });
  });
});
