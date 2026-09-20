import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [DatabaseModule, NotificationsModule, MediaModule, ProfilesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
