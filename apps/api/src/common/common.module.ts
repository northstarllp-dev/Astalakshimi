import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { EnrollmentGuard } from './guards/enrollment.guard';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { MetricsModule } from './metrics/metrics.module';
import { MetricsMiddleware } from './metrics/metrics.middleware';

@Module({
  imports: [EntitlementsModule, MetricsModule],
  providers: [EnrollmentGuard, MetricsMiddleware],
  exports: [EnrollmentGuard],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, MetricsMiddleware).forRoutes('*');
  }
}
