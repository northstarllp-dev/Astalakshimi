import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configs } from './config/index';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PreferencesModule } from './preferences/preferences.module';
import { MediaModule } from './media/media.module';
import { SearchModule } from './search/search.module';
import { InterestsModule } from './interests/interests.module';
import { ShortlistsModule } from './shortlists/shortlists.module';
import { SettingsModule } from './settings/settings.module';
import { PlansModule } from './plans/plans.module';
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { MatchesModule } from './matches/matches.module';
import { ActivityModule } from './activity/activity.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    ProfilesModule,
    PreferencesModule,
    MediaModule,
    SettingsModule,
    SearchModule,
    InterestsModule,
    ShortlistsModule,
    PlansModule,
    AdminModule,
    PaymentsModule,
    EntitlementsModule,
    MatchesModule,
    ActivityModule,
    NotificationsModule,
    ChatModule,
  ],
})
export class AppModule {}

