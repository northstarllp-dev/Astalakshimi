import { Controller, Post, Get, Patch, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowIncomplete } from '../common/decorators/allow-incomplete.decorator';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { z } from 'zod';
import { completeRegistrationSchema, updateProfileSchema } from '@astalakshimi/validation';
import type { UserSession, CompleteRegistrationPayload } from '@astalakshimi/types';

const addPhotoSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required').max(500),
  contentHash: z.string().length(64).optional(),
});

const reorderPhotosSchema = z.object({
  photoIds: z
    .array(z.string().uuid('Each photo id must be a UUID'))
    .min(1, 'At least one photo id is required')
    .max(5, 'At most 5 photos can be ordered'),
});

const partialProfileSchema = updateProfileSchema;

@UseGuards(JwtAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @AllowIncomplete()
  @Post('complete-registration')
  async completeRegistration(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(completeRegistrationSchema)) payload: CompleteRegistrationPayload,
  ) {
    return this.profilesService.completeRegistration(user.userId, payload);
  }

  @AllowIncomplete()
  @Get('me')
  async getMyProfile(@CurrentUser() user: UserSession) {
    return this.profilesService.getMyProfile(user.userId);
  }

  @AllowIncomplete()
  @Post('me/submit-verification')
  async submitVerification(@CurrentUser() user: UserSession) {
    return this.profilesService.submitVerification(user.userId);
  }

  @AllowUnverified()
  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Patch('me/basic')
  async updateBasicDetails(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Patch('me/education')
  async updateEducationCareer(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Patch('me/family')
  async updateFamilyDetails(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Patch('me/lifestyle')
  async updateLifestyleAstrology(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Patch('me/preferences')
  async updatePartnerPreferences(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partialProfileSchema)) payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @AllowUnverified()
  @Post('me/photos')
  async addPhoto(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(addPhotoSchema)) payload: { s3Key: string; contentHash?: string },
  ) {
    return this.profilesService.addPhoto(user.userId, payload.s3Key, payload.contentHash);
  }

  @AllowUnverified()
  @Delete('me/photos/:photoId')
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('photoId', UuidValidationPipe) photoId: string,
  ) {
    return this.profilesService.deletePhoto(user.userId, photoId);
  }

  @AllowUnverified()
  @Put('me/photos/order')
  async reorderPhotos(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(reorderPhotosSchema)) payload: { photoIds: string[] },
  ) {
    return this.profilesService.reorderPhotos(user.userId, payload.photoIds);
  }

  @AllowUnverified()
  @Get(':id')
  async getProfileById(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: UserSession,
  ) {
    return this.profilesService.getProfileById(id, user.userId);
  }

  /** Record visit is an interaction signal — requires verified. */
  @Post(':id/visit')
  async recordVisit(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentUser() user: UserSession,
  ) {
    await this.profilesService.recordVisit(id, user.userId);
    return { success: true };
  }
}
