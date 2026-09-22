import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';

@UseGuards(JwtAuthGuard)
@AllowUnverified()
@Throttle({ default: { limit: 120, ttl: 60_000 } })
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  getActivePlans() {
    return this.plansService.getActivePlans();
  }
}
