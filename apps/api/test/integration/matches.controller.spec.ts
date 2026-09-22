import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { MatchesController } from '../../src/matches/matches.controller';
import { MatchesService } from '../../src/matches/matches.service';
import { ALLOW_UNVERIFIED_KEY } from '../../src/common/decorators/allow-unverified.decorator';
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
      getPaginatedMatches: jest.fn(),
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

  describe('GET /matches', () => {
    it('should delegate to service.getPaginatedMatches with page + limit', async () => {
      const mockResponse = { matches: [{ id: 'match-1' }], totalCount: 1 };
      matchesService.getPaginatedMatches.mockResolvedValue(mockResponse as any);

      const result = await controller.getPaginatedMatches(mockUserSession, {
        page: 2,
        limit: 5,
      });

      expect(matchesService.getPaginatedMatches).toHaveBeenCalledWith(mockUserSession.userId, {
        page: 2,
        limit: 5,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('route security metadata', () => {
    it('allows unverified members on GET /matches', () => {
      const reflector = new Reflector();
      expect(
        reflector.get<boolean>(ALLOW_UNVERIFIED_KEY, controller.getPaginatedMatches),
      ).toBe(true);
    });

    it('allows unverified members on GET /matches/top', () => {
      const reflector = new Reflector();
      expect(reflector.get<boolean>(ALLOW_UNVERIFIED_KEY, controller.getTopMatches)).toBe(true);
    });
  });
});
