import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
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

  @Get(':id')
  async getProfileById(@Param('id') id: string) {
    return this.profilesService.getProfileById(id);
  }
}
