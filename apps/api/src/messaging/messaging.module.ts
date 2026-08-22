import { Module } from '@nestjs/common';
import { MessagingController, ChatController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [MessagingController, ChatController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
