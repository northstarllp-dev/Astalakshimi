import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { partnerPreferencesSchema, type PartnerPreferencesInput } from '@astalakshimi/validation';
import type { UserSession } from '@astalakshimi/types';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get('me')
  async getMyPreferences(@CurrentUser() user: UserSession) {
    return this.preferencesService.getMyPreferences(user.userId);
  }

  @Put('me')
  async updateMyPreferences(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(partnerPreferencesSchema)) input: PartnerPreferencesInput,
  ) {
    return this.preferencesService.updateMyPreferences(user.userId, input);
  }
}
