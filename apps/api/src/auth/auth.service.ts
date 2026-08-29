import * as crypto from 'crypto';
import { Injectable, BadRequestException, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { users, profiles, otpAttempts } from '@astalakshimi/database';
import { eq, desc } from 'drizzle-orm';
import type { SendOtpInput, VerifyOtpInput } from '@astalakshimi/validation';
import type { AuthResponse, User } from '@astalakshimi/types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(input: SendOtpInput): Promise<{ message: string; mockOtp?: string }> {
    const formattedPhone = input.phone.replace(/\s+/g, '');
    const mockEnabled = this.configService.get<boolean>('auth.mockOtpEnabled');
    const defaultMockOtp = this.configService.get<string>('auth.defaultMockOtp') || '123456';
    const ttlSeconds = this.configService.get<number>('auth.otpTtlSeconds') || 300;

    // Generate 6 digit OTP (mock or random)
    const otp = mockEnabled ? defaultMockOtp : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    await this.db.insert(otpAttempts).values({
      phone: formattedPhone,
      otpHash: hashedOtp, 
      expiresAt,
      consentAccepted: input.consentAccepted ?? false,
      referredBy: input.referredBy,
    });

    this.logger.log(`[OTP] Generated OTP for ${formattedPhone}: ${mockEnabled ? otp : '******'} (expires in ${ttlSeconds}s)`);

    return {
      message: `OTP sent successfully to ${formattedPhone}`,
      ...(mockEnabled && { mockOtp: otp }),
    };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
    const formattedPhone = input.phone.replace(/\s+/g, '');
    const [pending] = await this.db
      .select()
      .from(otpAttempts)
      .where(eq(otpAttempts.phone, formattedPhone))
      .orderBy(desc(otpAttempts.createdAt))
      .limit(1);

    if (!pending) {
      throw new BadRequestException('No pending OTP request found for this mobile number. Please request a new OTP.');
    }

    if (new Date() > pending.expiresAt || pending.verified) {
      throw new BadRequestException('OTP has expired or already used. Please request a new OTP.');
    }

    if (pending.attempts >= 5) {
      throw new BadRequestException('Maximum attempts reached. Please request a new OTP.');
    }

    const hashedInput = crypto.createHash('sha256').update(input.otp).digest('hex');

    if (pending.otpHash !== hashedInput) {
      // Increment attempts
      await this.db.update(otpAttempts)
        .set({ attempts: pending.attempts + 1 })
        .where(eq(otpAttempts.id, pending.id));
        
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // OTP is valid - mark as verified
    await this.db.update(otpAttempts)
      .set({ verified: true })
      .where(eq(otpAttempts.id, pending.id));

    // Look up or create user
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, formattedPhone))
      .limit(1);

    let user: User;
    let isNewUser = false;

    if (!existingUser) {
      isNewUser = true;
      const [newUser] = await this.db
        .insert(users)
        .values({
          phone: formattedPhone,
          isPhoneVerified: true,
          consentAccepted: pending.consentAccepted,
          consentTimestamp: new Date(),
          referredBy: pending.referredBy,
          role: 'member',
          status: 'active',
        })
        .returning();
      user = newUser as unknown as User;
    } else {
      const [updated] = await this.db
        .update(users)
        .set({
          isPhoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      user = updated as unknown as User;
    }

    // Check if user has an existing profile
    const [existingProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    const hasProfile = Boolean(existingProfile);

    // Issue JWT Access Token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    // Issue JWT Refresh Token
    const refreshToken = this.jwtService.sign({
      sub: user.id,
      type: 'refresh',
    }, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user,
      isNewUser,
      hasProfile,
    };
  }

  async getMe(userId: string): Promise<{ user: User; hasProfile: boolean }> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const [existingProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    return {
      user: user as unknown as User,
      hasProfile: Boolean(existingProfile),
    };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const [existingProfile] = await this.db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      const accessToken = this.jwtService.sign({
        sub: user.id,
        phone: user.phone,
        role: user.role,
      });

      const refreshToken = this.jwtService.sign({
        sub: user.id,
        type: 'refresh',
      }, { expiresIn: '7d' });

      return {
        accessToken,
        refreshToken,
        user: user as unknown as User,
        isNewUser: false,
        hasProfile: Boolean(existingProfile),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
