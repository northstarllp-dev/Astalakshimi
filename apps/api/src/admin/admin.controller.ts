import { Controller, Get, Post, Patch, Delete, Param, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('profiles/:profileId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadAdminPhoto(
    @Param('profileId') profileId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.adminService.uploadAdminPhoto(profileId, file.buffer, file.mimetype, file.size);
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
