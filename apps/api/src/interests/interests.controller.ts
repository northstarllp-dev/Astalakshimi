import { Controller, Get, Post, Put, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InterestsService } from './interests.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { 
  sendInterestSchema, 
  updateInterestStatusSchema, 
  type SendInterestInput, 
  type UpdateInterestStatusInput 
} from '@astalakshimi/validation';


@UseGuards(JwtAuthGuard)
@Controller('interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Post()
  sendInterest(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(sendInterestSchema)) body: SendInterestInput,
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
    @Body(new ZodValidationPipe(updateInterestStatusSchema)) body: UpdateInterestStatusInput,
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


