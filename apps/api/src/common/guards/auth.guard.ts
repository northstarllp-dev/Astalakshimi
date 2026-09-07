import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const logger = new Logger('JwtAuthGuard');

@Injectable()
export class JwtAuthGuard extends PassportAuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest(err: unknown, user: any, _info: unknown, context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true as any;
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required. Please log in.');
    }
    if (process.env.NODE_ENV !== 'production') {
      logger.debug(`auth ok for handler ${context.getHandler().name}`);
    }
    return user;
  }
}

/**
 * Backwards-compatible optional variant: a route can run with or without
 * a Bearer token. The handler receives `user || null`.
 *
 * Note: use {@link JwtAuthGuard} + `@Public()` instead whenever possible so
 * that the audit trail is consistent.
 */
@Injectable()
export class OptionalJwtAuthGuard extends PassportAuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch {
      // swallow so the handler can branch on user || null
    }
    return true;
  }

  handleRequest(_err: unknown, user: any) {
    return user || null;
  }
}
