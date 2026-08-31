import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../../src/auth/jwt.strategy';

describe('Feature 1: Authentication - JwtStrategy (Unit Tests)', () => {
  let jwtStrategy: JwtStrategy;
  let mockDb: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    mockDb = {
      select: jest.fn(),
    };

    jwtStrategy = new JwtStrategy(mockConfigService, mockDb);
  });

  it('should return user session when active user is found in database', async () => {
    const activeUser = {
      id: 'user-123',
      phone: '9876543210',
      role: 'member',
      status: 'active',
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([activeUser]),
    });

    const result = await jwtStrategy.validate({
      sub: 'user-123',
      phone: '9876543210',
      role: 'member',
    });

    expect(result).toEqual({
      userId: 'user-123',
      phone: '9876543210',
      role: 'member',
    });
  });

  it('should throw UnauthorizedException if user is not found in database', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });

    await expect(
      jwtStrategy.validate({
        sub: 'non-existent',
        phone: '9876543210',
        role: 'member',
      })
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if user status is suspended', async () => {
    const suspendedUser = {
      id: 'user-123',
      phone: '9876543210',
      role: 'member',
      status: 'suspended',
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([suspendedUser]),
    });

    await expect(
      jwtStrategy.validate({
        sub: 'user-123',
        phone: '9876543210',
        role: 'member',
      })
    ).rejects.toThrow('User account is not active or no longer exists');
  });

  it('should throw UnauthorizedException if user status is deactivated', async () => {
    const deactivatedUser = {
      id: 'user-123',
      phone: '9876543210',
      role: 'member',
      status: 'deactivated',
    };

    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([deactivatedUser]),
    });

    await expect(
      jwtStrategy.validate({
        sub: 'user-123',
        phone: '9876543210',
        role: 'member',
      })
    ).rejects.toThrow('User account is not active or no longer exists');
  });
});
