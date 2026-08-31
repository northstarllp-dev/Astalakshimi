import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  searchProfiles(
    @CurrentUser() user: UserSession,
    @Query() query: any, // In a real app we'd use a DTO
  ) {
    return this.searchService.searchProfiles(user.userId, query);
  }
}
