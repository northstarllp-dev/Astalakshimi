import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { users } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import type { UserSession } from '@astalakshimi/types';

interface JwtPayload {
  sub: string;
  phone: string;
  role: 'member' | 'admin' | 'moderator';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(DB_CLIENT) private readonly db: Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.jwtSecret') || 'astalakshimi-dev-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<UserSession> {
    const [user] = await this.db
      .select({
        id: users.id,
        phone: users.phone,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is not active or no longer exists');
    }

    return {
      userId: user.id,
      phone: user.phone,
      role: user.role,
    };
  }
}
