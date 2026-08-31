import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ShortlistsService } from './shortlists.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { shortlistSchema, type ShortlistInput } from '@astalakshimi/validation';


@UseGuards(JwtAuthGuard)
@Controller('shortlists')
export class ShortlistsController {
  constructor(private readonly shortlistsService: ShortlistsService) {}

  @Get()
  getShortlists(@CurrentUser() user: UserSession) {
    return this.shortlistsService.getShortlists(user.userId);
  }

  @Get('ids')
  getShortlistIds(@CurrentUser() user: UserSession) {
    return this.shortlistsService.getShortlistIds(user.userId);
  }

  @Post()
  addShortlist(
    @CurrentUser() user: UserSession,
    @Body(new ZodValidationPipe(shortlistSchema)) body: ShortlistInput,
  ) {
    const targetId = body.targetProfileId || body.profileId;
    return this.shortlistsService.addShortlist(user.userId, targetId!);
  }

  @Delete(':targetProfileId')
  removeShortlist(
    @CurrentUser() user: UserSession,
    @Param('targetProfileId') targetProfileId: string,
  ) {
    return this.shortlistsService.removeShortlist(user.userId, targetProfileId);
  }
}


