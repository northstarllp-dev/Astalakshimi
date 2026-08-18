import { Controller, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  presignedUploadSchema,
  confirmPhotoSchema,
  confirmVerificationSchema,
  confirmHoroscopeSchema,
  type PresignedUploadInput,
  type ConfirmPhotoInput,
  type ConfirmVerificationInput,
  type ConfirmHoroscopeInput,
} from '@astalakshimi/validation';
import type { UserSession } from '@astalakshimi/types';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(presignedUploadSchema)) input: PresignedUploadInput,
  ) {
    return this.mediaService.getUploadUrl(user.userId, input);
  }

  @Post('confirm-photo')
  async confirmPhoto(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmPhotoSchema)) input: ConfirmPhotoInput,
  ) {
    return this.mediaService.confirmPhoto(user.userId, input);
  }

  @Post('confirm-verification')
  async confirmVerification(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmVerificationSchema)) input: ConfirmVerificationInput,
  ) {
    return this.mediaService.confirmVerification(user.userId, input);
  }

  @Post('confirm-horoscope')
  async confirmHoroscope(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmHoroscopeSchema)) input: ConfirmHoroscopeInput,
  ) {
    return this.mediaService.confirmHoroscope(user.userId, input);
  }

  @Delete('photos/:id')
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('id') photoId: string,
  ) {
    return this.mediaService.deletePhoto(user.userId, photoId);
  }
}
