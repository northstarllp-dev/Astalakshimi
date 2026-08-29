import { Test, TestingModule } from '@nestjs/testing';
import { MatchesController } from '../../src/matches/matches.controller';
import { MatchesService } from '../../src/matches/matches.service';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 15/Matches - MatchesController (Integration Tests)', () => {
  let controller: MatchesController;
  let matchesService: jest.Mocked<MatchesService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockMatchesService = {
      getTopMatches: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [
        {
          provide: MatchesService,
          useValue: mockMatchesService,
        },
      ],
    }).compile();

    controller = module.get<MatchesController>(MatchesController);
    matchesService = module.get(MatchesService);
  });

  describe('GET /matches/top', () => {
    it('should delegate to service.getTopMatches', async () => {
      const mockResponse = [{ id: 'match-1' }];
      matchesService.getTopMatches.mockResolvedValue(mockResponse as any);

      const result = await controller.getTopMatches(mockUserSession);

      expect(matchesService.getTopMatches).toHaveBeenCalledWith(mockUserSession.userId);
      expect(result).toEqual(mockResponse);
    });
  });
});
