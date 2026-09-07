import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { EnrollmentGuard } from './guards/enrollment.guard';
import { RequestIdMiddleware } from './middleware/request-id.middleware';

@Module({
  imports: [EntitlementsModule],
  providers: [EnrollmentGuard],
  exports: [EnrollmentGuard],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
