import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { sendOtpSchema, verifyOtpSchema, adminLoginSchema, type SendOtpInput, type VerifyOtpInput, type AdminLoginInput } from '@astalakshimi/validation';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-otp')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async sendOtp(@Body(new ZodValidationPipe(sendOtpSchema)) input: SendOtpInput) {
    return this.authService.sendOtp(input);
  }

  @Public()
  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput) {
    return this.authService.verifyOtp(input);
  }

  @Public()
  @Post('admin-login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async adminLogin(@Body(new ZodValidationPipe(adminLoginSchema)) input: AdminLoginInput) {
    return this.authService.adminLogin(input);
  }

  @Public()
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(@Body('refreshToken') token: string) {
    if (!token || typeof token !== 'string' || token.length < 20) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshToken(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: UserSession) {
    return this.authService.logout(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: UserSession) {
    return this.authService.getMe(user.userId);
  }
}


