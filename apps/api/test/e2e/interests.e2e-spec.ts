import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { InterestsController } from '../../src/interests/interests.controller';
import { InterestsService } from '../../src/interests/interests.service';
import { JwtAuthGuard } from '../../src/common/guards/auth.guard';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_PROFILE_ID = '22222222-2222-4222-8222-222222222222';
const INTEREST_ID = '33333333-3333-4333-8333-333333333333';

const authGuardStub: CanActivate = {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: USER_ID, phone: '9876543210', role: 'member' };
    return true;
  },
};

describe('Interests HTTP e2e (validation + routing)', () => {
  let app: INestApplication;
  let interestsService: jest.Mocked<InterestsService>;

  beforeAll(async () => {
    const mockInterestsService = {
      sendInterest: jest.fn(),
      getUsage: jest.fn(),
      getSummary: jest.fn(),
      getReceivedInterests: jest.fn(),
      getSentInterests: jest.fn(),
      getMutualInterests: jest.fn(),
      acceptInterest: jest.fn(),
      declineInterest: jest.fn(),
      withdrawInterest: jest.fn(),
      updateInterestStatus: jest.fn(),
      acceptByProfileId: jest.fn(),
      declineByProfileId: jest.fn(),
      withdrawByProfileId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterestsController],
      providers: [{ provide: InterestsService, useValue: mockInterestsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardStub)
      .compile();

    app = module.createNestApplication();
    await app.init();
    interestsService = module.get(InterestsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /interests forwards a valid payload', async () => {
    interestsService.sendInterest.mockResolvedValue({
      id: INTEREST_ID,
      status: 'pending',
      isMutual: false,
    } as any);

    const res = await request(app.getHttpServer())
      .post('/interests')
      .send({ targetProfileId: TARGET_PROFILE_ID, message: 'Hello' })
      .expect(201);

    expect(interestsService.sendInterest).toHaveBeenCalledWith(USER_ID, {
      targetProfileId: TARGET_PROFILE_ID,
      message: 'Hello',
    });
    expect(res.body.status).toBe('pending');
  });

  it('POST /interests rejects a body with no target identifier (400)', async () => {
    await request(app.getHttpServer()).post('/interests').send({ message: 'Hi' }).expect(400);
    expect(interestsService.sendInterest).not.toHaveBeenCalled();
  });

  it('POST /interests rejects a non-UUID targetProfileId (400)', async () => {
    await request(app.getHttpServer())
      .post('/interests')
      .send({ targetProfileId: 'not-a-uuid' })
      .expect(400);
    expect(interestsService.sendInterest).not.toHaveBeenCalled();
  });

  it('GET /interests/summary and /usage forward to the service', async () => {
    interestsService.getSummary.mockResolvedValue({ pendingCount: 1 } as any);
    interestsService.getUsage.mockResolvedValue({ used: 1, limit: 30, remaining: 29 } as any);

    await request(app.getHttpServer()).get('/interests/summary').expect(200);
    await request(app.getHttpServer()).get('/interests/usage').expect(200);

    expect(interestsService.getSummary).toHaveBeenCalledWith(USER_ID);
    expect(interestsService.getUsage).toHaveBeenCalledWith(USER_ID);
  });

  it('GET /interests/received forwards an optional status filter', async () => {
    interestsService.getReceivedInterests.mockResolvedValue([]);

    await request(app.getHttpServer()).get('/interests/received?status=pending').expect(200);

    expect(interestsService.getReceivedInterests).toHaveBeenCalledWith(USER_ID, 'pending');
  });

  it('GET /interests/received rejects an invalid status filter (400)', async () => {
    await request(app.getHttpServer()).get('/interests/received?status=blocked').expect(400);
    expect(interestsService.getReceivedInterests).not.toHaveBeenCalled();
  });

  it('PATCH accept/decline/withdraw require a UUID id', async () => {
    await request(app.getHttpServer()).patch('/interests/not-a-uuid/accept').expect(400);
    await request(app.getHttpServer()).patch('/interests/not-a-uuid/decline').expect(400);
    await request(app.getHttpServer()).patch('/interests/not-a-uuid/withdraw').expect(400);
  });

  it('PATCH accept/decline/withdraw forward valid UUID ids', async () => {
    interestsService.acceptInterest.mockResolvedValue({ status: 'accepted' } as any);
    interestsService.declineInterest.mockResolvedValue({ status: 'declined' } as any);
    interestsService.withdrawInterest.mockResolvedValue({ status: 'withdrawn' } as any);

    await request(app.getHttpServer()).patch(`/interests/${INTEREST_ID}/accept`).expect(200);
    await request(app.getHttpServer()).patch(`/interests/${INTEREST_ID}/decline`).expect(200);
    await request(app.getHttpServer()).patch(`/interests/${INTEREST_ID}/withdraw`).expect(200);

    expect(interestsService.acceptInterest).toHaveBeenCalledWith(USER_ID, INTEREST_ID);
    expect(interestsService.declineInterest).toHaveBeenCalledWith(USER_ID, INTEREST_ID);
    expect(interestsService.withdrawInterest).toHaveBeenCalledWith(USER_ID, INTEREST_ID);
  });

  it('PUT and PATCH /interests/:id/status both forward a valid status body', async () => {
    interestsService.updateInterestStatus.mockResolvedValue({ status: 'accepted' } as any);

    await request(app.getHttpServer())
      .put(`/interests/${INTEREST_ID}/status`)
      .send({ status: 'accepted' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/interests/${INTEREST_ID}/status`)
      .send({ status: 'accepted' })
      .expect(200);

    expect(interestsService.updateInterestStatus).toHaveBeenCalledTimes(2);
    expect(interestsService.updateInterestStatus).toHaveBeenCalledWith(
      USER_ID,
      INTEREST_ID,
      'accepted',
    );
  });

  it('PUT /interests/:id/status rejects invalid status values (400)', async () => {
    await request(app.getHttpServer())
      .put(`/interests/${INTEREST_ID}/status`)
      .send({ status: 'pending' })
      .expect(400);
    expect(interestsService.updateInterestStatus).not.toHaveBeenCalled();
  });

  it('POST /interests/profile/:profileId/* forwards profile-scoped actions', async () => {
    interestsService.acceptByProfileId.mockResolvedValue({ status: 'accepted' } as any);
    interestsService.declineByProfileId.mockResolvedValue({ status: 'declined' } as any);
    interestsService.withdrawByProfileId.mockResolvedValue({ status: 'withdrawn' } as any);

    await request(app.getHttpServer())
      .post(`/interests/profile/${TARGET_PROFILE_ID}/accept`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/interests/profile/${TARGET_PROFILE_ID}/decline`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/interests/profile/${TARGET_PROFILE_ID}/withdraw`)
      .expect(201);

    expect(interestsService.acceptByProfileId).toHaveBeenCalledWith(USER_ID, TARGET_PROFILE_ID);
    expect(interestsService.declineByProfileId).toHaveBeenCalledWith(USER_ID, TARGET_PROFILE_ID);
    expect(interestsService.withdrawByProfileId).toHaveBeenCalledWith(USER_ID, TARGET_PROFILE_ID);
  });
});
