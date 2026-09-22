import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VerificationGuard } from '../../src/common/guards/verification.guard';
import { ALLOW_UNVERIFIED_KEY } from '../../src/common/decorators/allow-unverified.decorator';
import { ALLOW_INCOMPLETE_KEY } from '../../src/common/decorators/allow-incomplete.decorator';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';

describe('VerificationGuard', () => {
  let guard: VerificationGuard;
  let reflector: Reflector;
  let db: any;

  const makeContext = (user?: { userId: string }, extras: Record<string, unknown> = {}) => {
    const req: any = { user, ...extras };
    return {
      getType: () => 'http',
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
      __req: req,
    } as any;
  };

  beforeEach(() => {
    reflector = new Reflector();
    db = {
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ status: 'verified' }]),
            }),
          }),
        }),
      }),
    };
    guard = new VerificationGuard(reflector, db);
  });

  it('allows @Public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => key === IS_PUBLIC_KEY);
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it('allows @AllowIncomplete routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => key === ALLOW_INCOMPLETE_KEY);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('allows @AllowUnverified routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => key === ALLOW_UNVERIFIED_KEY);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('allows @Roles staff routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) =>
      key === ROLES_KEY ? (['admin'] as any) : false,
    );
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('allows verified members', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).resolves.toBe(true);
  });

  it('rejects unverified members on interaction routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    db.select = jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ status: 'pending' }]),
          }),
        }),
      }),
    });
    guard = new VerificationGuard(reflector, db);

    await expect(guard.canActivate(makeContext({ userId: 'u1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
