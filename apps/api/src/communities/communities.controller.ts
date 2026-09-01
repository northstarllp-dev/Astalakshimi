import { Controller, Get, Query } from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  communityAutocompleteQuerySchema,
  subcasteAutocompleteQuerySchema,
  gotraAutocompleteQuerySchema,
  type CommunityAutocompleteQuery,
  type SubcasteAutocompleteQuery,
  type GotraAutocompleteQuery,
} from '@astalakshimi/validation';

@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  @Get('autocomplete')
  autocompleteCommunities(
    @Query(new ZodValidationPipe(communityAutocompleteQuerySchema)) query: CommunityAutocompleteQuery,
  ) {
    return this.communitiesService.autocompleteCommunities(query.q, query.religion, query.limit);
  }

  @Get('subcastes/autocomplete')
  autocompleteSubcastes(
    @Query(new ZodValidationPipe(subcasteAutocompleteQuerySchema)) query: SubcasteAutocompleteQuery,
  ) {
    return this.communitiesService.autocompleteSubcastes(query.q, {
      communityId: query.communityId,
      community: query.community,
      religion: query.religion,
      limit: query.limit,
    });
  }

  @Get('gotras/autocomplete')
  autocompleteGotras(
    @Query(new ZodValidationPipe(gotraAutocompleteQuerySchema)) query: GotraAutocompleteQuery,
  ) {
    return this.communitiesService.autocompleteGotras(query.q, query.religion, query.limit);
  }
}
