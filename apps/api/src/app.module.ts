import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configs } from './config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PreferencesModule } from './preferences/preferences.module';
import { MediaModule } from './media/media.module';

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
  ],
})
export class AppModule {}
