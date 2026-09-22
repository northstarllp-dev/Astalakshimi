import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
@AllowUnverified()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  async getBlockedProfiles(@CurrentUser() user: UserSession) {
    return this.blocksService.getBlockedProfiles(user.userId);
  }

  @Post(':profileId')
  async blockProfile(
    @CurrentUser() user: UserSession,
    @Param('profileId', UuidValidationPipe) targetProfileId: string,
  ) {
    return this.blocksService.blockProfile(user.userId, targetProfileId);
  }

  @Delete(':profileId')
  async unblockProfile(
    @CurrentUser() user: UserSession,
    @Param('profileId', UuidValidationPipe) targetProfileId: string,
  ) {
    return this.blocksService.unblockProfile(user.userId, targetProfileId);
  }
}
