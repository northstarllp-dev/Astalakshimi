import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { BlocksModule } from './blocks/blocks.module';
import { ContactsModule } from './contacts/contacts.module';
import { CommonModule } from './common/common.module';
import { EnrollmentGuard } from './common/guards/enrollment.guard';
import { ProfileGuard } from './common/guards/profile.guard';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configs,
      envFilePath: ['../../.env', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    CommonModule,
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
    BlocksModule,
    ContactsModule,
  ],
  providers: [
    // Global rate limiting (per-IP). Auth endpoints apply stricter per-route limits.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global authentication: every HTTP route needs a valid JWT unless @Public().
    // Registered globally (not just per-controller) so authorization guards below
    // always see request.user populated. Order matters: JWT first.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Single uniform authz resolver. Routes that declare @Roles() or
    // @RequireEntitlement() get checked here; everything else is unaffected.
    { provide: APP_GUARD, useClass: EnrollmentGuard },
    // Enrollment gate: authenticated users without a profile can only reach
    // @AllowIncomplete() onboarding routes (or @Roles staff routes). Runs last.
    { provide: APP_GUARD, useClass: ProfileGuard },
  ],
})
export class AppModule {}
