import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EducationsService } from './educations.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import {
  resolveEducationQuerySchema,
  specializationsQuerySchema,
  type ResolveEducationQuery,
  type SpecializationsQuery,
} from '@astalakshimi/validation';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('educations')
export class EducationsController {
  constructor(private readonly educationsService: EducationsService) {}

  @Get('levels')
  listLevels() {
    return this.educationsService.listLevels();
  }

  @Get('specializations')
  listSpecializations(
    @Query(new ZodValidationPipe(specializationsQuerySchema)) query: SpecializationsQuery,
  ) {
    return this.educationsService.listSpecializations(query.educationId);
  }

  @Get('resolve')
  resolveEducation(
    @Query(new ZodValidationPipe(resolveEducationQuerySchema)) query: ResolveEducationQuery,
  ) {
    return this.educationsService.resolveEducation(query.q);
  }
}
