import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ShortlistsService } from './shortlists.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

export class ShortlistDto {
  targetProfileId?: string;
  profileId?: string;
}

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
    @Body() body: ShortlistDto,
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

// Controller alias for shortlist singular route
@UseGuards(JwtAuthGuard)
@Controller('shortlist')
export class ShortlistController {
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
    @Body() body: ShortlistDto,
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

