import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { MatchesController } from '../../src/matches/matches.controller';
import { MatchesService } from '../../src/matches/matches.service';
import { JwtAuthGuard } from '../../src/common/guards/auth.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';

const authGuardStub: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: USER_ID, phone: '9876543210', role: 'member' };
    return true;
  },
};

describe('Matches HTTP e2e (validation + routing)', () => {
  let app: INestApplication;
  let matchesService: jest.Mocked<MatchesService>;

  beforeAll(async () => {
    const mockMatchesService = {
      getTopMatches: jest.fn(),
      getPaginatedMatches: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchesController],
      providers: [{ provide: MatchesService, useValue: mockMatchesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardStub)
      .compile();

    app = module.createNestApplication();
    await app.init();
    matchesService = module.get(MatchesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /matches returns the paginated payload and forwards page + limit', async () => {
    matchesService.getPaginatedMatches.mockResolvedValue({
      matches: [{ id: 'match-1' }],
      totalCount: 1,
    } as any);

    const res = await request(app.getHttpServer())
      .get('/matches?page=2&limit=5')
      .expect(200);

    expect(matchesService.getPaginatedMatches).toHaveBeenCalledWith(USER_ID, {
      page: 2,
      limit: 5,
    });
    expect(res.body).toEqual({ matches: [{ id: 'match-1' }], totalCount: 1 });
  });

  it('GET /matches applies default page + limit when omitted', async () => {
    matchesService.getPaginatedMatches.mockResolvedValue({ matches: [], totalCount: 0 } as any);

    await request(app.getHttpServer()).get('/matches').expect(200);

    expect(matchesService.getPaginatedMatches).toHaveBeenCalledWith(USER_ID, {
      page: 1,
      limit: 10,
    });
  });

  it('GET /matches with page=0 is rejected by the validation pipe (400)', async () => {
    await request(app.getHttpServer()).get('/matches?page=0').expect(400);
    expect(matchesService.getPaginatedMatches).not.toHaveBeenCalled();
  });

  it('GET /matches with limit=51 is rejected by the validation pipe (400)', async () => {
    await request(app.getHttpServer()).get('/matches?limit=51').expect(400);
    expect(matchesService.getPaginatedMatches).not.toHaveBeenCalled();
  });

  it('GET /matches with a non-numeric page is rejected (400)', async () => {
    await request(app.getHttpServer()).get('/matches?page=abc').expect(400);
    expect(matchesService.getPaginatedMatches).not.toHaveBeenCalled();
  });

  it('GET /matches/top still resolves to the top-matches route', async () => {
    matchesService.getTopMatches.mockResolvedValue([{ id: 'match-1' }] as any);

    const res = await request(app.getHttpServer()).get('/matches/top').expect(200);

    expect(matchesService.getTopMatches).toHaveBeenCalledWith(USER_ID);
    expect(matchesService.getPaginatedMatches).not.toHaveBeenCalled();
    expect(res.body).toEqual([{ id: 'match-1' }]);
  });
});
