import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AuthService } from '../../src/auth/auth.service';
import { users, profiles, otpAttempts } from '@astalakshimi/database';

describe('Feature 1: Authentication - AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockSms: any;

  beforeEach(() => {
    // Config Service Mock
    mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'auth.otpTtlSeconds':
            return 300;
          default:
            return null;
        }
      }),
    };

    // JWT Service Mock
    mockJwtService = {
      sign: jest.fn((payload: any, options?: any) => {
        if (options?.expiresIn) {
          return `mock_refresh_token_${payload.sub}`;
        }
        return `mock_access_token_${payload.sub}`;
      }),
      verify: jest.fn((token: string) => {
        if (token === 'valid_refresh_token') {
          return { sub: 'user-uuid-1', type: 'refresh' };
        }
        if (token === 'invalid_type_token') {
          return { sub: 'user-uuid-1', type: 'access' };
        }
        throw new Error('jwt expired or invalid');
      }),
    };

    // Database Mock (Fluent interface for Drizzle queries)
    mockDb = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    mockSms = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
    };

    authService = new AuthService(mockDb, mockJwtService, mockConfigService, mockSms as any);
  });

  describe('sendOtp', () => {
    // select() (users lookup) ends with .limit(1);
    // select({ count }) (rate-limit query) has no .limit — .where resolves directly.
    const selectMock = () =>
      jest.fn((...args: any[]) => {
        if (args.length > 0) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue([]),
          };
        }
        return {
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue([]),
        };
      });

    it('should generate a random 6-digit OTP, store its hash, and send it via SMS', async () => {
      mockDb.select.mockImplementation(selectMock());
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });

      const result = await authService.sendOtp({
        phone: '9876543210',
        consentAccepted: true,
        referredBy: 'REF123',
      });

      expect(mockDb.insert).toHaveBeenCalledWith(otpAttempts);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '9876543210',
          otpHash: expect.stringMatching(/^[a-f0-9]{64}$/), // sha256 hex of the random OTP
          consentAccepted: true,
          referredBy: 'REF123',
        })
      );
      expect(mockSms.sendOtp).toHaveBeenCalledWith(
        '9876543210',
        expect.stringMatching(/^\d{6}$/),
      );
      expect(result).toEqual({
        message: 'OTP sent successfully to 9876543210',
      });
    });

    it('should strip spaces from the phone number before storing', async () => {
      mockDb.select.mockImplementation(selectMock());
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });

      await authService.sendOtp({
        phone: '+91 98765 43210',
        consentAccepted: true,
      });

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+919876543210',
        })
      );
      expect(mockSms.sendOtp).toHaveBeenCalledWith('+919876543210', expect.any(String));
    });

    it('should fail closed when SMS delivery fails', async () => {
      mockDb.select.mockImplementation(selectMock());
      const mockValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: mockValues });
      mockSms.sendOtp.mockRejectedValue(new Error('SMS delivery failed'));

      await expect(
        authService.sendOtp({
          phone: '9876543210',
          consentAccepted: true,
        }),
      ).rejects.toThrow('Failed to send OTP. Please try again shortly.');
    });

    it('should reject login OTP when the phone is not registered', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(
        authService.sendOtp({
          phone: '9876543210',
          consentAccepted: true,
          type: 'login',
        }),
      ).rejects.toThrow('This mobile number is not registered. Please sign up.');

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('checkPhone', () => {
    const userRow = (rows: any[]) => ({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
    });
    const profileRows = (rows: any[]) => ({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(rows),
        }),
      }),
    });

    it('should return exists:false for an unknown number without touching OTP or SMS', async () => {
      mockDb.select.mockReturnValueOnce(userRow([]));

      await expect(authService.checkPhone({ phone: '9876543210' })).resolves.toEqual({
        exists: false,
        hasProfile: false,
      });

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockSms.sendOtp).not.toHaveBeenCalled();
    });

    it('should return exists:true, hasProfile:false for an incomplete member', async () => {
      mockDb.select
        .mockReturnValueOnce(userRow([{ id: 'user-1' }]))
        .mockReturnValueOnce(profileRows([]));

      await expect(authService.checkPhone({ phone: '9876543210' })).resolves.toEqual({
        exists: true,
        hasProfile: false,
      });

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockSms.sendOtp).not.toHaveBeenCalled();
    });

    it('should return exists:true, hasProfile:true for a fully enrolled member', async () => {
      mockDb.select
        .mockReturnValueOnce(userRow([{ id: 'user-1' }]))
        .mockReturnValueOnce(profileRows([{ id: 'profile-1' }]));

      await expect(authService.checkPhone({ phone: '9876543210' })).resolves.toEqual({
        exists: true,
        hasProfile: true,
      });

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(mockSms.sendOtp).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw BadRequestException when no pending OTP attempt is found', async () => {
      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockChain);

      await expect(
        authService.verifyOtp({ phone: '9876543210', otp: '123456' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when OTP is expired', async () => {
      const expiredAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 0,
        expiresAt: new Date(Date.now() - 10000), // in the past
        verified: false,
      };

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([expiredAttempt]),
      };
      mockDb.select.mockReturnValue(mockChain);

      await expect(
        authService.verifyOtp({ phone: '9876543210', otp: '123456' })
      ).rejects.toThrow('OTP has expired or already used');
    });

    it('should throw BadRequestException when OTP was already verified/used', async () => {
      const usedAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
        verified: true, // already used
      };

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([usedAttempt]),
      };
      mockDb.select.mockReturnValue(mockChain);

      await expect(
        authService.verifyOtp({ phone: '9876543210', otp: '123456' })
      ).rejects.toThrow('OTP has expired or already used');
    });

    it('should throw BadRequestException when max attempts (5) reached', async () => {
      const maxedAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 5,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
      };

      const mockChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([maxedAttempt]),
      };
      mockDb.select.mockReturnValue(mockChain);

      await expect(
        authService.verifyOtp({ phone: '9876543210', otp: '123456' })
      ).rejects.toThrow('Maximum attempts reached');
    });

    it('should increment attempts and throw BadRequestException when OTP is incorrect', async () => {
      const pendingAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 2,
        maxAttempts: 5,
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
      };

      const mockSelectChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([pendingAttempt]),
      };
      mockDb.select.mockReturnValue(mockSelectChain);

      // Atomic increment: update(...).set(...).where(...).returning(...)
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ attempts: 3 }]),
      });
      mockDb.update.mockReturnValue({ set: mockSet, where: mockWhere });

      await expect(
        authService.verifyOtp({ phone: '9876543210', otp: '999999' })
      ).rejects.toThrow('Invalid OTP. Please check and try again.');

      expect(mockDb.update).toHaveBeenCalledWith(otpAttempts);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ attempts: expect.anything() })
      );
    });

    it('should successfully verify a new user, create user record, and return auth tokens', async () => {
      const pendingAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 0,
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
        consentAccepted: true,
        referredBy: 'FRIEND_REF',
      };

      const createdUser = {
        id: 'new-user-123',
        phone: '9876543210',
        role: 'member',
        status: 'active',
        isPhoneVerified: true,
        consentAccepted: true,
      };

      // 1st select: otpAttempts -> [pendingAttempt]
      // 2nd select: users -> [] (no existing user)
      // 3rd select: profiles -> [] (no existing profile)
      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([pendingAttempt]),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      // Update otpAttempts to verified
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      });

      // Insert new user
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([createdUser]),
        }),
      });

      const response = await authService.verifyOtp({
        phone: '9876543210',
        otp: '123456',
      });

      expect(response.isNewUser).toBe(true);
      expect(response.hasProfile).toBe(false);
      expect(response.accessToken).toBe('mock_access_token_new-user-123');
      expect(response.refreshToken).toBe('mock_refresh_token_new-user-123');
      expect(response.user).toEqual(createdUser);
    });

    it('should successfully verify an existing user with profile and return tokens', async () => {
      const pendingAttempt = {
        id: 'otp-1',
        phone: '9876543210',
        otpHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
        attempts: 1,
        expiresAt: new Date(Date.now() + 60000),
        verified: false,
      };

      const existingUser = {
        id: 'existing-user-456',
        phone: '9876543210',
        role: 'member',
        status: 'active',
        isPhoneVerified: true,
      };

      const existingProfile = {
        id: 'profile-uuid-789',
      };

      let selectCallCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([pendingAttempt]),
          };
        } else if (selectCallCount === 2) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([existingUser]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([existingProfile]),
          };
        }
      });

      let updateCallCount = 0;
      mockDb.update.mockImplementation(() => {
        updateCallCount++;
        if (updateCallCount === 1) {
          return {
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockResolvedValue(undefined),
          };
        } else {
          return {
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValue([existingUser]),
            }),
          };
        }
      });

      const response = await authService.verifyOtp({
        phone: '9876543210',
        otp: '123456',
      });

      expect(response.isNewUser).toBe(false);
      expect(response.hasProfile).toBe(true);
      expect(response.accessToken).toBe('mock_access_token_existing-user-456');
    });
  });

  describe('getMe', () => {
    it('should return user details and hasProfile flag', async () => {
      const mockUser = {
        id: 'user-123',
        phone: '9876543210',
        role: 'member',
        status: 'active',
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockUser]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([{ id: 'profile-1' }]),
          };
        }
      });

      const result = await authService.getMe('user-123');
      expect(result.user).toEqual(mockUser);
      expect(result.hasProfile).toBe(true);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await expect(authService.getMe('non-existent')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('refreshToken', () => {
    it('should successfully issue new tokens when given a valid refresh token', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        phone: '9876543210',
        role: 'member',
        status: 'active',
        refreshTokenHash: createHash('sha256').update('valid_refresh_token').digest('hex'),
      };

      let selectCount = 0;
      mockDb.select.mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([mockUser]),
          };
        } else {
          return {
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
          };
        }
      });

      // Refresh rotation persists the new token hash
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockSet, where: mockWhere });

      const result = await authService.refreshToken('valid_refresh_token');

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid_refresh_token');
      expect(result.accessToken).toBe('mock_access_token_user-uuid-1');
      expect(result.refreshToken).toBe('mock_refresh_token_user-uuid-1');
      expect(result.isNewUser).toBe(false);
      expect(result.hasProfile).toBe(false);
      expect(mockDb.update).toHaveBeenCalledWith(users);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: expect.any(String) })
      );
    });

    it('should throw UnauthorizedException when token type is not "refresh"', async () => {
      await expect(
        authService.refreshToken('invalid_type_token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when token is expired or invalid signature', async () => {
      await expect(
        authService.refreshToken('bad_token')
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should detect refresh-token reuse, clear the stored hash, and reject', async () => {
      const staleUser = {
        id: 'user-uuid-1',
        phone: '9876543210',
        role: 'member',
        status: 'active',
        // Stored hash belongs to an older rotated token, not the presented one
        refreshTokenHash: createHash('sha256').update('some-older-token').digest('hex'),
      };

      mockJwtService.verify.mockReturnValueOnce({ sub: 'user-uuid-1', type: 'refresh' });
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([staleUser]),
      });

      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockSet, where: mockWhere });

      await expect(
        authService.refreshToken('valid_refresh_token'),
      ).rejects.toThrow('Session expired or revoked');

      // Reuse clears the hash so the whole token family is revoked
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });
  });

  describe('adminLogin', () => {
    const adminLoginSelect = (rows: any[]) => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(rows),
      });
    };

    it('should reject a member account even with a matching password hash', async () => {
      const member = {
        id: 'member-1',
        phone: '9876543210',
        role: 'member',
        status: 'active',
        passwordHash: createHash('sha256').update('secret123').digest('hex'),
      };
      adminLoginSelect([member]);

      await expect(
        authService.adminLogin({ email: 'member@example.com', password: 'secret123' }),
      ).rejects.toThrow('Access denied');
    });

    it('should reject unknown staff emails without revealing which check failed', async () => {
      adminLoginSelect([]);

      await expect(
        authService.adminLogin({ email: 'nobody@example.com', password: 'secret123' }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject a wrong password for a real admin', async () => {
      const admin = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: 'admin',
        status: 'active',
        passwordHash: createHash('sha256').update('correct-horse').digest('hex'),
      };
      adminLoginSelect([admin]);

      await expect(
        authService.adminLogin({ email: 'admin@example.com', password: 'wrong-pass' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should clear the stored refresh-token hash', async () => {
      const mockSet = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.update.mockReturnValue({ set: mockSet, where: mockWhere });

      const result = await authService.logout('user-uuid-1');

      expect(result).toEqual({ success: true });
      expect(mockDb.update).toHaveBeenCalledWith(users);
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });
  });
});
