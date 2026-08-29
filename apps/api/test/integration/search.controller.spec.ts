import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '../../src/search/search.controller';
import { SearchService } from '../../src/search/search.service';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 6: Search & Filtering - SearchController (Integration Tests)', () => {
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  const mockUserSession: UserSession = {
    userId: 'user-uuid-1',
    phone: '9876543210',
    role: 'member',
  };

  beforeEach(async () => {
    const mockSearchService = {
      searchProfiles: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService);
  });

  describe('GET /search', () => {
    it('should pass user ID and query parameters to search service', async () => {
      const mockQuery = { ageMin: '25', ageMax: '30', city: 'Chennai' };
      const expectedResponse = {
        totalCount: 2,
        profiles: [
          { id: 'prof-1', fullName: 'Alice' },
          { id: 'prof-2', fullName: 'Bob' },
        ],
      };

      searchService.searchProfiles.mockResolvedValue(expectedResponse as any);

      const result = await controller.searchProfiles(mockUserSession, mockQuery);

      expect(searchService.searchProfiles).toHaveBeenCalledWith(
        mockUserSession.userId,
        mockQuery
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle advanced queries with JSON strings', async () => {
      const mockQuery = { advanced: JSON.stringify({ heights: ['170', '180'] }) };
      const expectedResponse = {
        totalCount: 1,
        profiles: [{ id: 'prof-1' }],
      };

      searchService.searchProfiles.mockResolvedValue(expectedResponse as any);

      const result = await controller.searchProfiles(mockUserSession, mockQuery);

      expect(searchService.searchProfiles).toHaveBeenCalledWith(
        mockUserSession.userId,
        mockQuery
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
