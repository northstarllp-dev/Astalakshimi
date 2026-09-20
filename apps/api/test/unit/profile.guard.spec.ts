import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfileGuard } from '../../src/common/guards/profile.guard';
import { IS_PUBLIC_KEY } from '../../src/common/decorators/public.decorator';
import { ALLOW_INCOMPLETE_KEY } from '../../src/common/decorators/allow-incomplete.decorator';
import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';

describe('ProfileGuard (Unit Tests)', () => {
  let guard: ProfileGuard;
  let reflector: jest.Mocked<Reflector>;
  let authService: { userHasProfile: jest.Mock };
  let metadata: Record<string, unknown>;

  const createMockContext = (options?: { user?: any; type?: string; request?: any }) => {
    const req = options?.request ?? { user: options?.user };
    return {
      getType: jest.fn().mockReturnValue(options?.type ?? 'http'),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue(req) }),
      __req: req,
    } as any;
  };

  beforeEach(() => {
    metadata = {};
    reflector = {
      getAllAndOverride: jest.fn((key: string) => metadata[key]),
    } as any;
    authService = { userHasProfile: jest.fn() };
    guard = new ProfileGuard(reflector, authService as any);
  });

  it('allows @Public routes without any user and without a DB lookup', async () => {
    metadata[IS_PUBLIC_KEY] = true;
    const context = createMockContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('allows @AllowIncomplete routes for a user without a profile', async () => {
    metadata[ALLOW_INCOMPLETE_KEY] = true;
    const context = createMockContext({ user: { userId: 'u-incomplete', role: 'member' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('allows @Roles staff routes without a profile lookup', async () => {
    metadata[ROLES_KEY] = ['admin', 'moderator'];
    const context = createMockContext({ user: { userId: 'admin-1', role: 'admin' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('defers to JwtAuthGuard when no user is present (does not 403)', async () => {
    const context = createMockContext({ user: undefined });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('allows a member with a profile', async () => {
    authService.userHasProfile.mockResolvedValue(true);
    const context = createMockContext({ user: { userId: 'u-1', role: 'member' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).toHaveBeenCalledWith('u-1');
  });

  it('throws 403 for a member without a profile on protected routes', async () => {
    authService.userHasProfile.mockResolvedValue(false);
    const context = createMockContext({ user: { userId: 'u-new', role: 'member' } });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'Please complete your registration to continue.',
    );
  });

  it('memoizes the profile lookup on the request object', async () => {
    authService.userHasProfile.mockResolvedValue(true);
    const req = { user: { userId: 'u-1', role: 'member' }, __hasProfile: true };
    const context = createMockContext({ request: req });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });

  it('skips non-HTTP contexts (websocket handshake does its own auth)', async () => {
    const context = createMockContext({ type: 'ws' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.userHasProfile).not.toHaveBeenCalled();
  });
});
