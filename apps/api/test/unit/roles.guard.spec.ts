import { RolesGuard } from '../../src/common/guards/roles.guard';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('RolesGuard (Unit Tests)', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: any) => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as any;
  };

  it('should allow access if no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if empty roles array is required', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext(undefined); // No user
    
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('User is not authenticated');
  });

  it('should throw ForbiddenException if user lacks required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ role: 'member' });
    
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('Access denied');
  });

  it('should allow access if user has the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin']);
    const context = createMockContext({ role: 'admin' });
    
    expect(guard.canActivate(context)).toBe(true);
  });
});
