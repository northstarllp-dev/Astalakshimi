import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { searchQuerySchema, type SearchQuery } from '@astalakshimi/validation';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @AllowUnverified()
  @Get()
  searchProfiles(
    @CurrentUser() user: UserSession,
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ) {
    return this.searchService.searchProfiles(user.userId, query as Record<string, unknown>);
  }
}
