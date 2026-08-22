import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

export class SendInterestDto {
  targetProfileId?: string;
  profileId?: string;
  targetUserId?: string;
  message?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Post()
  sendInterest(
    @CurrentUser() user: UserSession,
    @Body() body: SendInterestDto,
  ) {
    return this.interestsService.sendInterest(user.userId, body);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: UserSession) {
    return this.interestsService.getSummary(user.userId);
  }

  @Get('received')
  getReceivedInterests(
    @CurrentUser() user: UserSession,
    @Query('status') status?: string,
  ) {
    return this.interestsService.getReceivedInterests(user.userId, status);
  }

  @Get('sent')
  getSentInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getSentInterests(user.userId);
  }

  @Get('mutual')
  getMutualInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getMutualInterests(user.userId);
  }

  @Patch(':id/accept')
  patchAccept(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.acceptInterest(user.userId, id);
  }

  @Patch(':id/decline')
  patchDecline(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.declineInterest(user.userId, id);
  }

  @Patch(':id/withdraw')
  patchWithdraw(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.withdrawInterest(user.userId, id);
  }

  @Put(':id/status')
  @Patch(':id/status')
  updateInterestStatus(
    @CurrentUser() user: UserSession,
    @Param('id') interestId: string,
    @Body() body: { status: 'accepted' | 'declined' | 'withdrawn' },
  ) {
    return this.interestsService.updateInterestStatus(user.userId, interestId, body.status);
  }

  @Post('profile/:profileId/accept')
  acceptByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId') profileId: string,
  ) {
    return this.interestsService.acceptByProfileId(user.userId, profileId);
  }

  @Post('profile/:profileId/decline')
  declineByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId') profileId: string,
  ) {
    return this.interestsService.declineByProfileId(user.userId, profileId);
  }

  @Post('profile/:profileId/withdraw')
  withdrawByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId') profileId: string,
  ) {
    return this.interestsService.withdrawByProfileId(user.userId, profileId);
  }
}

// Controller alias for interactions/interest and interactions workflow endpoints
@UseGuards(JwtAuthGuard)
@Controller('interactions')
export class InteractionsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get('received')
  getReceivedInterests(
    @CurrentUser() user: UserSession,
    @Query('status') status?: string,
  ) {
    return this.interestsService.getReceivedInterests(user.userId, status);
  }

  @Get('sent')
  getSentInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getSentInterests(user.userId);
  }

  @Get('mutual')
  getMutualInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getMutualInterests(user.userId);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: UserSession) {
    return this.interestsService.getSummary(user.userId);
  }

  @Post('interest')
  sendInterest(
    @CurrentUser() user: UserSession,
    @Body() body: SendInterestDto,
  ) {
    return this.interestsService.sendInterest(user.userId, body);
  }

  @Post()
  createInteraction(
    @CurrentUser() user: UserSession,
    @Body() body: SendInterestDto,
  ) {
    return this.interestsService.sendInterest(user.userId, body);
  }

  @Patch(':id/accept')
  acceptInterest(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.acceptInterest(user.userId, id);
  }

  @Patch(':id/decline')
  declineInterest(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.declineInterest(user.userId, id);
  }

  @Patch(':id/withdraw')
  withdrawInterest(
    @CurrentUser() user: UserSession,
    @Param('id') id: string,
  ) {
    return this.interestsService.withdrawInterest(user.userId, id);
  }

  @Patch(':id/status')
  updateInterestStatus(
    @CurrentUser() user: UserSession,
    @Param('id') interestId: string,
    @Body() body: { status: 'accepted' | 'declined' | 'withdrawn' },
  ) {
    return this.interestsService.updateInterestStatus(user.userId, interestId, body.status);
  }
}

