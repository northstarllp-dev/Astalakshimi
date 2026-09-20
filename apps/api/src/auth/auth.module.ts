import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsService } from './sms.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { ProfileGuard } from '../common/guards/profile.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtSecret'),
        signOptions: {
          expiresIn: (config.get<string>('auth.jwtExpiresIn') || '1h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SmsService, JwtStrategy, JwtAuthGuard, ProfileGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule, ProfileGuard],
})
export class AuthModule {}
