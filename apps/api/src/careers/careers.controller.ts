import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CareersService } from './careers.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import {
  companySearchQuerySchema,
  resolveCompanyQuerySchema,
  resolveOccupationQuerySchema,
  type CompanySearchQuery,
  type ResolveCompanyQuery,
  type ResolveOccupationQuery,
} from '@astalakshimi/validation';

@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('careers')
export class CareersController {
  constructor(private readonly careersService: CareersService) {}

  @Get('occupations')
  listOccupations() {
    return this.careersService.listOccupations();
  }

  @Get('occupations/resolve')
  resolveOccupation(
    @Query(new ZodValidationPipe(resolveOccupationQuerySchema)) query: ResolveOccupationQuery,
  ) {
    return this.careersService.resolveOccupation(query.q);
  }

  @Get('companies/search')
  searchCompanies(
    @Query(new ZodValidationPipe(companySearchQuerySchema)) query: CompanySearchQuery,
  ) {
    return this.careersService.searchCompanies(query.q, query.limit);
  }

  @Get('companies/resolve')
  resolveCompany(
    @Query(new ZodValidationPipe(resolveCompanyQuerySchema)) query: ResolveCompanyQuery,
  ) {
    return this.careersService.resolveCompany(query.q);
  }
}
