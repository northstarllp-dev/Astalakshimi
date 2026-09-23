import * as crypto from 'crypto';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { users, profiles, otpAttempts } from '@astalakshimi/database';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import type { SendOtpInput, VerifyOtpInput, CheckPhoneInput } from '@astalakshimi/validation';
import type { AuthResponse, User } from '@astalakshimi/types';
import { SmsService } from './sms.service';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async sendOtp(input: SendOtpInput): Promise<{ message: string }> {
    const formattedPhone = input.phone.replace(/\s+/g, '');
    
    const [existingUser] = await this.db.select().from(users).where(eq(users.phone, formattedPhone)).limit(1);

    if (input.type === 'login' && !existingUser) {
      throw new BadRequestException('This mobile number is not registered. Please sign up.');
    }
    
    if (input.type === 'register' && existingUser) {
      const [existingProfile] = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.userId, existingUser.id)).limit(1);
      if (existingProfile) {
        throw new BadRequestException('This mobile number is already registered. Please log in instead.');
      }
    }
    
    const ttlSeconds = this.configService.get<number>('auth.otpTtlSeconds') || 300;

    // Per-phone send cap (SMS-pumping protection) independent of per-IP throttling
    const windowSeconds = this.configService.get<number>('auth.otpSendWindowSeconds') || 600;
    const maxPerWindow = this.configService.get<number>('auth.otpMaxPerPhonePerWindow') || 3;
    const [recent] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(otpAttempts)
      .where(
        and(eq(otpAttempts.phone, formattedPhone), gte(otpAttempts.createdAt, new Date(Date.now() - windowSeconds * 1000))),
      );
    if (recent && recent.count >= maxPerWindow) {
      throw new BadRequestException('Too many OTP requests. Please try again in a few minutes.');
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const hashedOtp = sha256(otp);

    await this.db.insert(otpAttempts).values({
      phone: formattedPhone,
      otpHash: hashedOtp,
      expiresAt,
      consentAccepted: input.consentAccepted ?? false,
      referredBy: input.referredBy,
    });

    try {
      await this.smsService.sendOtp(formattedPhone, otp);
    } catch (e) {
      this.logger.error(`[OTP] SMS delivery failed for ${formattedPhone}: ${e instanceof Error ? e.message : e}`);
      throw new InternalServerErrorException('Failed to send OTP. Please try again shortly.');
    }

    return {
      message: `OTP sent successfully to ${formattedPhone}`,
    };
  }

  /**
   * Pre-OTP phone lookup so the login page can route new/incomplete members
   * to registration BEFORE any SMS is sent. Read-only: no OTP row, no user
   * row, no SMS. Same normalization as sendOtp so both agree on identity.
   */
  async checkPhone(input: CheckPhoneInput): Promise<{ exists: boolean; hasProfile: boolean }> {
    const formattedPhone = input.phone.replace(/\s+/g, '');
    const [existingUser] = await this.db.select().from(users).where(eq(users.phone, formattedPhone)).limit(1);
    if (!existingUser) {
      return { exists: false, hasProfile: false };
    }
    return { exists: true, hasProfile: await this.userHasProfile(existingUser.id) };
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

    console.log(`[DEBUG OTP] Phone: ${formattedPhone}`);
    console.log(`[DEBUG OTP] Current Time: ${new Date().toISOString()} (${new Date().getTime()})`);
    console.log(`[DEBUG OTP] Expires At: ${pending.expiresAt.toISOString()} (${pending.expiresAt.getTime()})`);
    console.log(`[DEBUG OTP] Verified: ${pending.verified}`);
    console.log(`[DEBUG OTP] Is Expired?: ${new Date() > pending.expiresAt}`);

    if (new Date() > pending.expiresAt || pending.verified) {
      throw new BadRequestException('OTP has expired or already used. Please request a new OTP.');
    }

    if (pending.attempts >= pending.maxAttempts) {
      throw new BadRequestException('Maximum attempts reached. Please request a new OTP.');
    }

    const hashedInput = sha256(input.otp);

    if (pending.otpHash !== hashedInput) {
      // Atomic increment so parallel guesses cannot exceed the attempt cap
      const [updated] = await this.db
        .update(otpAttempts)
        .set({ attempts: sql`${otpAttempts.attempts} + 1` })
        .where(eq(otpAttempts.id, pending.id))
        .returning({ attempts: otpAttempts.attempts });

      if (updated && updated.attempts >= pending.maxAttempts) {
        throw new BadRequestException('Maximum attempts reached. Please request a new OTP.');
      }
      throw new BadRequestException('Invalid OTP. Please check and try again.');
    }

    // OTP is valid - mark as verified
    await this.db.update(otpAttempts).set({ verified: true }).where(eq(otpAttempts.id, pending.id));

    const { user, isNewUser } = await this.findOrCreateUser(formattedPhone, pending.consentAccepted, pending.referredBy ?? undefined);
    const hasProfile = await this.userHasProfile(user.id);

    const { accessToken, refreshToken } = this.issueTokens(user);

    // Persist the refresh token hash so the token can be rotated and revoked server-side
    await this.db
      .update(users)
      .set({ refreshTokenHash: sha256(refreshToken), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      accessToken,
      refreshToken,
      user,
      isNewUser,
      hasProfile,
    };
  }

  async adminLogin(input: import('@astalakshimi/validation').AdminLoginInput): Promise<AuthResponse> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== 'admin' && user.role !== 'moderator') {
      throw new UnauthorizedException('Access denied');
    }

    const hashedInput = sha256(input.password);
    if (user.passwordHash !== hashedInput) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hasProfile = await this.userHasProfile(user.id);
    const { accessToken, refreshToken } = this.issueTokens(user);

    await this.db
      .update(users)
      .set({ refreshTokenHash: sha256(refreshToken), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      accessToken,
      refreshToken,
      user: user as unknown as User,
      isNewUser: false,
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

    const hasProfile = await this.userHasProfile(userId);

    return {
      user: user as unknown as User,
      hasProfile,
    };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    let payload: { sub: string; type?: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Reuse detection: a rotated or revoked refresh token no longer matches the stored hash
    if (!user.refreshTokenHash || user.refreshTokenHash !== sha256(token)) {
      await this.db.update(users).set({ refreshTokenHash: null }).where(eq(users.id, user.id));
      throw new UnauthorizedException('Session expired or revoked. Please log in again.');
    }

    const hasProfile = await this.userHasProfile(user.id);

    const { accessToken, refreshToken } = this.issueTokens(user);
    await this.db
      .update(users)
      .set({ refreshTokenHash: sha256(refreshToken), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return {
      accessToken,
      refreshToken,
      user: user as unknown as User,
      isNewUser: false,
      hasProfile,
    };
  }

  async logout(userId: string): Promise<{ success: boolean }> {
    await this.db
      .update(users)
      .set({ refreshTokenHash: null, updatedAt: new Date() })
      .where(eq(users.id, userId));
    return { success: true };
  }

  private issueTokens(user: { id: string; phone: string; role: string }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
    });

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        type: 'refresh',
      },
      { expiresIn: (this.configService.get<string>('auth.refreshTokenExpiresIn') || '7d') as any },
    );

    return { accessToken, refreshToken };
  }

  /** Public so ProfileGuard can enforce enrollment without duplicating the query. */
  async userHasProfile(userId: string): Promise<boolean> {
    const [existingProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return Boolean(existingProfile);
  }

  private async findOrCreateUser(
    phone: string,
    consentAccepted: boolean,
    referredBy?: string,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (existingUser) {
      const [updated] = await this.db
        .update(users)
        .set({
          isPhoneVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return { user: updated as unknown as User, isNewUser: false };
    }

    const [newUser] = await this.db
      .insert(users)
      .values({
        phone,
        isPhoneVerified: true,
        consentAccepted,
        consentTimestamp: new Date(),
        referredBy,
        role: 'member',
        status: 'active',
      })
      .returning();
    return { user: newUser as unknown as User, isNewUser: true };
  }
}
