import { Controller, Get, Patch, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@AllowUnverified()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getUserNotifications(@CurrentUser() user: UserSession) {
    return this.notificationsService.getUserNotifications(user.userId);
  }

  @Patch('read')
  patchMarkRead(@CurrentUser() user: UserSession) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Patch('read-all')
  patchMarkAllRead(@CurrentUser() user: UserSession) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUser() user: UserSession) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete('clear-all')
  clearAll(@CurrentUser() user: UserSession) {
    return this.notificationsService.clearAll(user.userId);
  }
}

