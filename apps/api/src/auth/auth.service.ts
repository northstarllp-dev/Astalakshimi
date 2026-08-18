import { Injectable, BadRequestException, UnauthorizedException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { users, profiles } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import type { SendOtpInput, VerifyOtpInput } from '@astalakshimi/validation';
import type { AuthResponse, User } from '@astalakshimi/types';

interface PendingOtp {
  otp: string;
  expiresAt: number;
  consentAccepted: boolean;
  referredBy?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpCache = new Map<string, PendingOtp>();

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
    const expiresAt = Date.now() + ttlSeconds * 1000;

    this.otpCache.set(formattedPhone, {
      otp,
      expiresAt,
      consentAccepted: input.consentAccepted,
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
    const pending = this.otpCache.get(formattedPhone);

    if (!pending) {
      throw new BadRequestException('No pending OTP request found for this mobile number. Please request a new OTP.');
    }

    if (Date.now() > pending.expiresAt) {
      this.otpCache.delete(formattedPhone);
      throw new BadRequestException('OTP has expired. Please request a new OTP.');
    }

    if (pending.otp !== input.otp) {
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // OTP is valid - clear cache
    this.otpCache.delete(formattedPhone);

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

    return {
      accessToken,
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
}
