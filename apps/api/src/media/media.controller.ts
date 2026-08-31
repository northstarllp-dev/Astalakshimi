import {
  Controller,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Get,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
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

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(presignedUploadSchema)) input: PresignedUploadInput,
  ) {
    return this.mediaService.getUploadUrl(user.userId, input);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async confirmPhoto(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmPhotoSchema)) input: ConfirmPhotoInput,
  ) {
    return this.mediaService.confirmPhoto(user.userId, input);
  }

  @Post('confirm-verification')
  @UseGuards(JwtAuthGuard)
  async confirmVerification(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmVerificationSchema)) input: ConfirmVerificationInput,
  ) {
    return this.mediaService.confirmVerification(user.userId, input);
  }

  @Post('confirm-horoscope')
  @UseGuards(JwtAuthGuard)
  async confirmHoroscope(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(confirmHoroscopeSchema)) input: ConfirmHoroscopeInput,
  ) {
    return this.mediaService.confirmHoroscope(user.userId, input);
  }

  @Get('image')
  @UseGuards(OptionalJwtAuthGuard)
  async getMediaImage(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const s3Key = req.query.key as string;
    if (!s3Key) {
      return res.status(400).send('Missing S3 key');
    }

    const demo = this.mediaService.getDemoMedia(s3Key);
    if (demo) {
      res.set('Content-Type', demo.contentType);
      res.set('Cache-Control', 'private, max-age=3600');
      return res.send(demo.buffer);
    }
    
    try {
      const url = await this.mediaService.getSignedMediaUrl(s3Key);
      return res.redirect(url);
    } catch (error) {
      return res.status(404).send('Media not found');
    }
  }

  @Delete('photos/:id')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('id') photoId: string,
  ) {
    return this.mediaService.deletePhoto(user.userId, photoId);
  }
}
