import { INestApplication, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { SearchController } from '../../src/search/search.controller';
import { SearchService } from '../../src/search/search.service';
import { JwtAuthGuard } from '../../src/common/guards/auth.guard';

const USER_ID = 'user1';

const authGuardStub: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication required. Please log in.');
    }
    req.user = { userId: USER_ID, phone: '1234567890', role: 'member' };
    return true;
  },
};

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let searchService: jest.Mocked<SearchService>;

  beforeAll(async () => {
    const mockSearchService = {
      searchProfiles: jest.fn().mockResolvedValue({ profiles: [{ id: 'match1' }], total: 1 }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [{ provide: SearchService, useValue: mockSearchService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardStub)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    searchService = moduleFixture.get(SearchService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/search (GET) should require authentication', () => {
    return request(app.getHttpServer()).get('/search').expect(401);
  });

  it('/search (GET) should return 200 with valid token and query params', async () => {
    await request(app.getHttpServer())
      .get('/search?page=1&limit=10&city=Chennai')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(searchService.searchProfiles).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ page: 1, limit: 10, city: 'Chennai' }),
    );
  });
});
