import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { ContactGuardService } from './guard/contact-guard.service';
import { MessageService } from './message.service';
import { ChatGateway } from './chat.gateway';

import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, EntitlementsModule, BlocksModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ContactGuardService, MessageService],
  exports: [ChatService, MessageService],
})
export class ChatModule {}
