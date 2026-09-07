import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';
import type { UserSession } from '@astalakshimi/types';

const updateSettingsSchema = z
  .object({
    photoBlur: z.enum(['always', 'when_not_connected', 'never']).optional(),
    profileVisibility: z.string().max(40).optional(),
    hidePhone: z.boolean().optional(),
    hideProfile: z.boolean().optional(),
    showLastSeen: z.boolean().optional(),
    notifyEmail: z.boolean().optional(),
    notifySms: z.boolean().optional(),
    notifyPush: z.boolean().optional(),
    hideFromUsers: z.array(z.string().uuid()).max(500).optional(),
    hideFromCities: z.array(z.string().uuid()).max(500).optional(),
  })
  .passthrough()
  .strict();

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
    @Body(new ZodValidationPipe(updateSettingsSchema)) data: Record<string, unknown>,
  ) {
    return this.settingsService.updateSettings(user.userId, data);
  }
}
