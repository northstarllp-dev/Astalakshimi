import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  adminCreateProfileSchema,
  adminAttachPhotosSchema,
  presignedUploadSchema,
  type AdminCreateProfileInput,
  type AdminAttachPhotosInput,
  type PresignedUploadInput,
} from '@astalakshimi/validation';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Patch('verifications/:profileId')
  updateVerificationStatus(
    @Param('profileId') profileId: string,
    @Body() body: { status: 'verified' | 'rejected', rejectionReason?: string },
  ) {
    return this.adminService.updateVerificationStatus(profileId, body.status, body.rejectionReason);
  }

  @Get('profiles')
  getAllProfiles() {
    return this.adminService.getAllProfiles();
  }

  @Post('profiles')
  createProfile(
    @Body(new ZodValidationPipe(adminCreateProfileSchema)) body: AdminCreateProfileInput,
  ) {
    return this.adminService.createProfile(body);
  }

  @Post('profiles/:profileId/upload-url')
  getPhotoUploadUrl(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(presignedUploadSchema)) body: PresignedUploadInput,
  ) {
    return this.adminService.getPhotoUploadUrl(profileId, body.contentType, body.fileSize);
  }

  @Post('profiles/:profileId/photos')
  attachPhotos(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(adminAttachPhotosSchema)) body: AdminAttachPhotosInput,
  ) {
    return this.adminService.attachPhotos(profileId, body.s3Keys);
  }

  @Get('profiles/:profileId')
  getProfile(@Param('profileId') profileId: string) {
    return this.adminService.getProfile(profileId);
  }

  @Delete('profiles/:profileId')
  deleteProfile(@Param('profileId') profileId: string) {
    return this.adminService.deleteProfile(profileId);
  }
}
