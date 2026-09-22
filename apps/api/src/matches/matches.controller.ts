import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { matchesQuerySchema, type MatchesQuery } from '@astalakshimi/validation';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  // Declared before the base @Get() so /matches/top resolves to this route.
  @AllowUnverified()
  @Get('top')
  getTopMatches(@CurrentUser() user: UserSession) {
    return this.matchesService.getTopMatches(user.userId);
  }

  @AllowUnverified()
  @Get()
  getPaginatedMatches(
    @CurrentUser() user: UserSession,
    @Query(new ZodValidationPipe(matchesQuerySchema)) query: MatchesQuery,
  ) {
    return this.matchesService.getPaginatedMatches(user.userId, {
      page: query.page,
      limit: query.limit,
    });
  }
}
