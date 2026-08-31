import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { sendOtpSchema, verifyOtpSchema, type SendOtpInput, type VerifyOtpInput } from '@astalakshimi/validation';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body(new ZodValidationPipe(sendOtpSchema)) input: SendOtpInput) {
    return this.authService.sendOtp(input);
  }

  @Post('verify-otp')
  async verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) input: VerifyOtpInput) {
    return this.authService.verifyOtp(input);
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') token: string) {
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshToken(token);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: UserSession) {
    return this.authService.getMe(user.userId);
  }
}
