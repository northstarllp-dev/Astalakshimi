import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LocationsService } from './locations.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import {
  cityAutocompleteQuerySchema,
  resolveCityQuerySchema,
  type CityAutocompleteQuery,
  type ResolveCityQuery,
} from '@astalakshimi/validation';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('states')
  listStates() {
    return this.locationsService.listStates();
  }

  @Get('cities/autocomplete')
  autocompleteCities(
    @Query(new ZodValidationPipe(cityAutocompleteQuerySchema)) query: CityAutocompleteQuery,
  ) {
    return this.locationsService.autocompleteCities(query.q, query.state, query.limit);
  }

  @Get('cities/resolve')
  resolveCity(@Query(new ZodValidationPipe(resolveCityQuerySchema)) query: ResolveCityQuery) {
    return this.locationsService.resolveCity(query.q);
  }
}
