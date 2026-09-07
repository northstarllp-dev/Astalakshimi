import { Controller, Get, Post, Patch, Delete, Param, Body, UseInterceptors, UploadedFile, BadRequestException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { z } from 'zod';
import {
  adminCreateProfileSchema,
  adminAttachPhotosSchema,
  type AdminCreateProfileInput,
  type AdminAttachPhotosInput,
} from '@astalakshimi/validation';

const updatePhotoStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().min(1).max(500).optional(),
});

const updateVerificationStatusSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  rejectionReason: z.string().min(1).max(500).optional(),
});

// RolesGuard is kept here alongside JwtAuthGuard so it runs after JWT user
// is populated. (The global EnrollmentGuard reads @Roles metadata and would
// also work — RolesGuard is retained for explicit clarity on admin routes.)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'moderator')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('photos/pending')
  getPendingPhotos() {
    return this.adminService.getPendingPhotos();
  }

  @Patch('photos/:photoId')
  updatePhotoStatus(
    @Param('photoId', UuidValidationPipe) photoId: string,
    @Body(new ZodValidationPipe(updatePhotoStatusSchema)) body: z.infer<typeof updatePhotoStatusSchema>,
  ) {
    return this.adminService.updatePhotoStatus(photoId, body.status, body.rejectionReason);
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Patch('verifications/:profileId')
  updateVerificationStatus(
    @Param('profileId', UuidValidationPipe) profileId: string,
    @Body(new ZodValidationPipe(updateVerificationStatusSchema))
    body: z.infer<typeof updateVerificationStatusSchema>,
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
    @Param('profileId', UuidValidationPipe) profileId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.adminService.uploadAdminPhoto(profileId, file.buffer, file.mimetype, file.size);
  }

  @Post('profiles/:profileId/photos')
  attachPhotos(
    @Param('profileId', UuidValidationPipe) profileId: string,
    @Body(new ZodValidationPipe(adminAttachPhotosSchema)) body: AdminAttachPhotosInput,
  ) {
    return this.adminService.attachPhotos(profileId, body.s3Keys);
  }

  @Get('profiles/:profileId')
  getProfile(@Param('profileId', UuidValidationPipe) profileId: string) {
    return this.adminService.getProfile(profileId);
  }

  @Delete('profiles/:profileId')
  deleteProfile(@Param('profileId', UuidValidationPipe) profileId: string) {
    return this.adminService.deleteProfile(profileId);
  }
}
