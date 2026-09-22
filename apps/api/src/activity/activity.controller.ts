import { Controller, Get, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @AllowUnverified()
  @Get('summary')
  getSummary(@CurrentUser() user: UserSession) {
    return this.activityService.getSummary(user.userId);
  }
}
