import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { BadRequestException } from '@nestjs/common';
import type { UserSession } from '@astalakshimi/types';

describe('Feature 1: Authentication - AuthController (Integration Tests)', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockAuthService = {
      sendOtp: jest.fn(),
      verifyOtp: jest.fn(),
      adminLogin: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
      getMe: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('POST /auth/send-otp', () => {
    it('should forward valid payload to AuthService.sendOtp', async () => {
      const input = { phone: '9876543210', consentAccepted: true, referredBy: 'CODE1' };
      const expectedResponse = { message: 'OTP sent successfully to 9876543210' };

      authService.sendOtp.mockResolvedValue(expectedResponse);

      const result = await controller.sendOtp(input);

      expect(authService.sendOtp).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('should forward valid OTP payload to AuthService.verifyOtp and return tokens', async () => {
      const input = { phone: '9876543210', otp: '123456' };
      const expectedResponse = {
        accessToken: 'access_jwt_xyz',
        refreshToken: 'refresh_jwt_xyz',
        user: {
          id: 'user-1',
          phone: '9876543210',
          role: 'member' as const,
          status: 'active' as const,
          isPhoneVerified: true,
          consentAccepted: true,
          consentTimestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isNewUser: true,
        hasProfile: false,
      };

      authService.verifyOtp.mockResolvedValue(expectedResponse);

      const result = await controller.verifyOtp(input);

      expect(authService.verifyOtp).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should throw BadRequestException if refreshToken is missing in body', async () => {
      await expect(controller.refresh('')).rejects.toThrow(
        new BadRequestException('Refresh token is required')
      );
    });

    it('should forward refreshToken to AuthService.refreshToken', async () => {
      const expectedResponse = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        user: {
          id: 'user-1',
          phone: '9876543210',
          role: 'member' as const,
          status: 'active' as const,
          isPhoneVerified: true,
          consentAccepted: true,
          consentTimestamp: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        isNewUser: false,
        hasProfile: true,
      };

      authService.refreshToken.mockResolvedValue(expectedResponse);

      const result = await controller.refresh('valid_refresh_token_123');

      expect(authService.refreshToken).toHaveBeenCalledWith('valid_refresh_token_123');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /auth/me', () => {
    it('should fetch user and profile status for authenticated user', async () => {
      const mockSession: UserSession = {
        userId: 'user-1',
        phone: '9876543210',
        role: 'member',
      };

      const expectedResponse = {
        user: {
          id: 'user-1',
          phone: '9876543210',
          role: 'member' as const,
          status: 'active' as const,
          isPhoneVerified: true,
          consentAccepted: true,
          consentTimestamp: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        hasProfile: true,
      };

      authService.getMe.mockResolvedValue(expectedResponse);

      const result = await controller.getMe(mockSession);

      expect(authService.getMe).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke the session for the authenticated user', async () => {
      const mockSession: UserSession = {
        userId: 'user-1',
        phone: '9876543210',
        role: 'member',
      };
      authService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout(mockSession);

      expect(authService.logout).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('POST /auth/admin-login', () => {
    it('should forward staff credentials to AuthService.adminLogin', async () => {
      const input = { email: 'admin@example.com', password: 'secret123' };
      const expectedResponse = { accessToken: 'a', refreshToken: 'r', hasProfile: false } as any;
      authService.adminLogin.mockResolvedValue(expectedResponse);

      const result = await controller.adminLogin(input);

      expect(authService.adminLogin).toHaveBeenCalledWith(input);
      expect(result).toEqual(expectedResponse);
    });

    it('should propagate service errors (unknown email / wrong password)', async () => {
      authService.adminLogin.mockRejectedValue(new BadRequestException('Invalid credentials'));

      await expect(
        controller.adminLogin({ email: 'nobody@example.com', password: 'x' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('POST /auth/refresh hardening', () => {
    it('should reject a short (non-token) refresh value without calling the service', async () => {
      await expect(controller.refresh('short')).rejects.toThrow(
        new BadRequestException('Refresh token is required'),
      );
      expect(authService.refreshToken).not.toHaveBeenCalled();
    });
  });

  describe('route security metadata', () => {
    it('keeps OTP + refresh endpoints public and session endpoints guarded', async () => {
      const { Reflector } = await import('@nestjs/core');
      const { IS_PUBLIC_KEY } = await import(
        '../../src/common/decorators/public.decorator'
      );
      const { ALLOW_INCOMPLETE_KEY } = await import(
        '../../src/common/decorators/allow-incomplete.decorator'
      );
      const reflector = new Reflector();
      const proto = AuthController.prototype as any;

      for (const method of ['sendOtp', 'verifyOtp', 'adminLogin', 'refresh']) {
        expect(
          reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [proto[method], AuthController]),
        ).toBe(true);
      }

      for (const method of ['logout', 'getMe']) {
        expect(
          reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [proto[method], AuthController]),
        ).toBeFalsy();
        expect(
          reflector.getAllAndOverride<boolean>(ALLOW_INCOMPLETE_KEY, [
            proto[method],
            AuthController,
          ]),
        ).toBe(true);
      }
    });
  });
});
