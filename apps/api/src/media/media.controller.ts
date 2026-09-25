import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowIncomplete } from '../common/decorators/allow-incomplete.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import {
  presignedUploadSchema,
  uploadPurposeSchema,
  confirmPhotoSchema,
  confirmVerificationSchema,
  confirmHoroscopeSchema,
  type PresignedUploadInput,
  type ConfirmPhotoInput,
  type ConfirmVerificationInput,
  type ConfirmHoroscopeInput,
} from '@astalakshimi/validation';
import type { UserSession } from '@astalakshimi/types';

type UploadedMediaFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

function contentTypeForUpload(file: UploadedMediaFile, purpose: string): string {
  if (file.mimetype === 'image/jpg') return 'image/jpeg';
  if (purpose === 'govt_id') {
    if (file.mimetype && file.mimetype !== 'application/octet-stream') return file.mimetype;
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.png')) return 'image/png';
    if (name.endsWith('.webp')) return 'image/webp';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    return file.mimetype || 'application/octet-stream';
  }
  if (file.mimetype && file.mimetype !== 'application/octet-stream') return file.mimetype;
  if (purpose === 'horoscope') {
    const name = (file.originalname || '').toLowerCase();
    if (name.endsWith('.pdf')) return 'application/pdf';
    if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/pdf';
  }
  return 'image/jpeg';
}

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // Signup flow uploads happen before the profile row exists.
  @AllowIncomplete()
  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(presignedUploadSchema)) input: PresignedUploadInput,
  ) {
    return this.mediaService.getUploadUrl(user.userId, input);
  }

  @AllowIncomplete()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadFile(
    @CurrentUser() user: UserSession,
    @UploadedFile() file: UploadedMediaFile,
    @Body('purpose') purpose: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const parsedPurpose = uploadPurposeSchema.safeParse(purpose);
    if (!parsedPurpose.success) {
      throw new BadRequestException('Invalid upload purpose');
    }

    const contentType = contentTypeForUpload(file, parsedPurpose.data);

    const parsed = presignedUploadSchema.safeParse({
      purpose: parsedPurpose.data,
      contentType,
      fileSize: file.size,
    });
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message || 'This file cannot be uploaded');
    }

    return this.mediaService.uploadFileBuffer(user.userId, file.buffer, parsed.data);
  }

  @AllowIncomplete()
  @Post('confirm-photo')
  async confirmPhoto(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmPhotoSchema)) input: ConfirmPhotoInput,
  ) {
    return this.mediaService.confirmPhoto(user.userId, input);
  }

  @AllowIncomplete()
  @Post('confirm-verification')
  async confirmVerification(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmVerificationSchema)) input: ConfirmVerificationInput,
  ) {
    return this.mediaService.confirmVerification(user.userId, input);
  }

  @AllowIncomplete()
  @Post('confirm-horoscope')
  async confirmHoroscope(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmHoroscopeSchema)) input: ConfirmHoroscopeInput,
  ) {
    return this.mediaService.confirmHoroscope(user.userId, input);
  }

  @AllowIncomplete()
  @Get('verification-preview')
  async verificationPreview(
    @CurrentUser() user: UserSession,
    @Query('purpose') purpose: string,
    @Query('s3Key') s3Key: string,
  ) {
    if (purpose !== 'selfie' && purpose !== 'govt_id') {
      throw new BadRequestException('Preview is only available for a selfie or government ID');
    }
    if (!s3Key) {
      throw new BadRequestException('Missing file location');
    }
    return this.mediaService.getVerificationPreviewUrl(user.userId, purpose, s3Key);
  }

  @AllowIncomplete()
  @Get('horoscope')
  async downloadHoroscope(@CurrentUser() user: UserSession) {
    return this.mediaService.getHoroscopeDownloadUrl(user.userId);
  }

  @AllowIncomplete()
  @Delete('photos/:id')
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) photoId: string,
  ) {
    return this.mediaService.deletePhoto(user.userId, photoId);
  }
}
