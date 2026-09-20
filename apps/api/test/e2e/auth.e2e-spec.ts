import {
  Controller,
  Get,
  INestApplication,
  UnauthorizedException,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { EnrollmentGuard } from '../../src/common/guards/enrollment.guard';
import { ProfileGuard } from '../../src/common/guards/profile.guard';
import { Public } from '../../src/common/decorators/public.decorator';
import { AllowIncomplete } from '../../src/common/decorators/allow-incomplete.decorator';
import { Roles } from '../../src/common/decorators/roles.decorator';
import { AuthService } from '../../src/auth/auth.service';
import { EntitlementsService } from '../../src/entitlements/entitlements.service';

/**
 * Fixture routes mirroring the app's real metadata combinations:
 * public (health, OTP), onboarding-allowlisted (complete-registration),
 * plain protected (search, matches, profile views), staff-only (admin).
 * Authentication comes from the global stub guard below (same as prod wiring).
 */
@Controller('t')
class FixtureController {
  @Public()
  @Get('public')
  pub() {
    return { ok: true };
  }

  @AllowIncomplete()
  @Get('onboarding')
  onboarding() {
    return { ok: true };
  }

  @Get('locked')
  locked() {
    return { ok: true };
  }

  @Roles('admin')
  @Get('staff')
  staff() {
    return { ok: true };
  }
}

/** Simulates JwtStrategy + the @Public bypass of the real JwtAuthGuard. */
const stubReflector = new Reflector();
const jwtStubInstance: CanActivate = {
  canActivate(context: ExecutionContext) {
    const isPublic = stubReflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest();
    const auth = req.headers?.authorization as string | undefined;
    if (auth === 'Bearer member') {
      req.user = { userId: 'user-1', phone: '9876543210', role: 'member' };
      return true;
    }
    if (auth === 'Bearer incomplete') {
      req.user = { userId: 'user-new', phone: '9876543211', role: 'member' };
      return true;
    }
    if (auth === 'Bearer admin') {
      req.user = { userId: 'admin-1', phone: '9000000001', role: 'admin' };
      return true;
    }
    throw new UnauthorizedException('Authentication required. Please log in.');
  },
};

describe('Auth + enrollment HTTP e2e (guards)', () => {
  let app: INestApplication;
  let authService: { userHasProfile: jest.Mock };

  beforeAll(async () => {
    authService = { userHasProfile: jest.fn(async (userId: string) => userId === 'user-1') };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FixtureController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: EntitlementsService,
          useValue: { checkEntitlement: jest.fn().mockResolvedValue(true) },
        },
        // Same global chain as AppModule: JWT first, then roles, then enrollment.
        { provide: APP_GUARD, useValue: jwtStubInstance },
        { provide: APP_GUARD, useClass: EnrollmentGuard },
        { provide: APP_GUARD, useClass: ProfileGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /t/public is reachable without a token', async () => {
    await request(app.getHttpServer()).get('/t/public').expect(200);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('GET /t/locked without a token is 401', async () => {
    await request(app.getHttpServer()).get('/t/locked').expect(401);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('GET /t/locked with a garbage token is 401', async () => {
    await request(app.getHttpServer())
      .get('/t/locked')
      .set('Authorization', 'Bearer garbage')
      .expect(401);
  });

  it('GET /t/locked with an enrolled member token is 200', async () => {
    await request(app.getHttpServer())
      .get('/t/locked')
      .set('Authorization', 'Bearer member')
      .expect(200);
    expect(authService.userHasProfile).toHaveBeenCalledWith('user-1');
  });

  it('GET /t/locked with a profile-less member token is 403', async () => {
    const res = await request(app.getHttpServer())
      .get('/t/locked')
      .set('Authorization', 'Bearer incomplete')
      .expect(403);

    expect(res.body.message).toContain('complete your registration');
    expect(authService.userHasProfile).toHaveBeenCalledWith('user-new');
  });

  it('GET /t/onboarding with a profile-less token is 200 (allowlisted)', async () => {
    await request(app.getHttpServer())
      .get('/t/onboarding')
      .set('Authorization', 'Bearer incomplete')
      .expect(200);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('GET /t/onboarding without a token is still 401 (JWT required)', async () => {
    await request(app.getHttpServer()).get('/t/onboarding').expect(401);
  });

  it('GET /t/staff with a member token is 403 (roles)', async () => {
    await request(app.getHttpServer())
      .get('/t/staff')
      .set('Authorization', 'Bearer member')
      .expect(403);
  });

  it('GET /t/staff with an admin token is 200 without a profile lookup', async () => {
    await request(app.getHttpServer())
      .get('/t/staff')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });
});
