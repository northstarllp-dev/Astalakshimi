import { Module } from '@nestjs/common';
import { InterestsController, InteractionsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { DatabaseModule } from '../database/database.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, EntitlementsModule, NotificationsModule],
  controllers: [InterestsController, InteractionsController],
  providers: [InterestsService],
  exports: [InterestsService],
})
export class InterestsModule {}
