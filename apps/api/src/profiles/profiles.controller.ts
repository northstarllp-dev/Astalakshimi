import { Controller, Post, Get, Patch, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard, OptionalJwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession, CompleteRegistrationPayload } from '@astalakshimi/types';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post('complete-registration')
  @UseGuards(JwtAuthGuard)
  async completeRegistration(
    @CurrentUser() user: UserSession,
    @Body() payload: CompleteRegistrationPayload,
  ) {
    return this.profilesService.completeRegistration(user.userId, payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: UserSession) {
    return this.profilesService.getMyProfile(user.userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: UserSession,
    @Body() payload: Partial<CompleteRegistrationPayload>,
  ) {
    return this.profilesService.updateMyProfile(user.userId, payload);
  }

  @Post('me/photos')
  @UseGuards(JwtAuthGuard)
  async addPhoto(
    @CurrentUser() user: UserSession,
    @Body() payload: { s3Key: string },
  ) {
    return this.profilesService.addPhoto(user.userId, payload.s3Key);
  }

  @Delete('me/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  async deletePhoto(
    @CurrentUser() user: UserSession,
    @Param('photoId') photoId: string,
  ) {
    return this.profilesService.deletePhoto(user.userId, photoId);
  }

  @Put('me/photos/order')
  @UseGuards(JwtAuthGuard)
  async reorderPhotos(
    @CurrentUser() user: UserSession,
    @Body() payload: { photoIds: string[] },
  ) {
    return this.profilesService.reorderPhotos(user.userId, payload.photoIds);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getProfileById(
    @Param('id') id: string,
    @CurrentUser() user: UserSession | null
  ) {
    return this.profilesService.getProfileById(id, user?.userId);
  }

  @Post(':id/visit')
  @UseGuards(JwtAuthGuard)
  async recordVisit(
    @Param('id') id: string,
    @CurrentUser() user: UserSession
  ) {
    await this.profilesService.recordVisit(id, user.userId);
    return { success: true };
  }
}
