import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { z } from 'zod';
import {
  sendInterestSchema,
  updateInterestStatusSchema,
  type SendInterestInput,
  type UpdateInterestStatusInput,
} from '@astalakshimi/validation';

const statusQuerySchema = z.enum(['pending', 'accepted', 'declined', 'withdrawn']).optional();


@UseGuards(JwtAuthGuard)
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  /** Send interest — requires verified (VerificationGuard). */
  @Post()
  sendInterest(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(sendInterestSchema)) body: SendInterestInput,
  ) {
    return this.interestsService.sendInterest(user.userId, body);
  }

  @AllowUnverified()
  @Get('usage')
  getUsage(@CurrentUser() user: UserSession) {
    return this.interestsService.getUsage(user.userId);
  }

  @AllowUnverified()
  @Get('summary')
  getSummary(@CurrentUser() user: UserSession) {
    return this.interestsService.getSummary(user.userId);
  }

  @AllowUnverified()
  @Get('received')
  getReceivedInterests(
    @CurrentUser() user: UserSession,
    @Query('status', new ZodValidationPipe(statusQuerySchema)) status?: z.infer<typeof statusQuerySchema>,
  ) {
    return this.interestsService.getReceivedInterests(user.userId, status);
  }

  @AllowUnverified()
  @Get('sent')
  getSentInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getSentInterests(user.userId);
  }

  @AllowUnverified()
  @Get('mutual')
  getMutualInterests(@CurrentUser() user: UserSession) {
    return this.interestsService.getMutualInterests(user.userId);
  }

  @Patch(':id/accept')
  patchAccept(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.interestsService.acceptInterest(user.userId, id);
  }

  @Patch(':id/decline')
  patchDecline(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.interestsService.declineInterest(user.userId, id);
  }

  @Patch(':id/withdraw')
  patchWithdraw(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) id: string,
  ) {
    return this.interestsService.withdrawInterest(user.userId, id);
  }

  @Put(':id/status')
  @Patch(':id/status')
  updateInterestStatus(
    @CurrentUser() user: UserSession,
    @Param('id', UuidValidationPipe) interestId: string,
    @Body(new ZodValidationPipe(updateInterestStatusSchema)) body: UpdateInterestStatusInput,
  ) {
    return this.interestsService.updateInterestStatus(user.userId, interestId, body.status);
  }

  @Post('profile/:profileId/accept')
  acceptByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId', UuidValidationPipe) profileId: string,
  ) {
    return this.interestsService.acceptByProfileId(user.userId, profileId);
  }

  @Post('profile/:profileId/decline')
  declineByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId', UuidValidationPipe) profileId: string,
  ) {
    return this.interestsService.declineByProfileId(user.userId, profileId);
  }

  @Post('profile/:profileId/withdraw')
  withdrawByProfileId(
    @CurrentUser() user: UserSession,
    @Param('profileId', UuidValidationPipe) profileId: string,
  ) {
    return this.interestsService.withdrawByProfileId(user.userId, profileId);
  }
}
