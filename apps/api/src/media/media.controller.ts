import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Get,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { Public } from '../common/decorators/public.decorator';
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
import { demoUploadStore } from './demo-upload.store';

type UploadedMediaFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  async getUploadUrl(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(presignedUploadSchema)) input: PresignedUploadInput,
  ) {
    return this.mediaService.getUploadUrl(user.userId, input);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
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

    const contentType =
      file.mimetype === 'image/jpg'
        ? 'image/jpeg'
        : file.mimetype || (parsedPurpose.data === 'horoscope' ? 'application/pdf' : 'image/jpeg');

    const input = presignedUploadSchema.parse({
      purpose: parsedPurpose.data,
      contentType,
      fileSize: file.size,
    });

    return this.mediaService.uploadFileBuffer(user.userId, file.buffer, input);
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

  @Public()
  @Get('demo-upload/*')
  getDemoUpload(@Param('0') path: string, @Res() res: Response) {
    const file = demoUploadStore.get(path);
    if (!file) {
      throw new NotFoundException('Mock upload not found');
    }
    res.setHeader('Content-Type', file.contentType);
    res.send(file.buffer);
  }

  @Delete('photos/:id')
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) photoId: string,
  ) {
    return this.mediaService.deletePhoto(user.userId, photoId);
  }
}
