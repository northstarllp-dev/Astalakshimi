import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('users/me/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: UserSession) {
    return this.settingsService.getSettings(user.userId);
  }

  @Patch()
  updateSettings(
    @CurrentUser() user: UserSession,
    @Body() data: any, // In a real app we'd use a DTO here
  ) {
    return this.settingsService.updateSettings(user.userId, data);
  }
}


