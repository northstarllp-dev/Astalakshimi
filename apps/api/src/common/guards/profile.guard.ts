import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_INCOMPLETE_KEY } from '../decorators/allow-incomplete.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthService } from '../../auth/auth.service';
import type { UserRole, UserSession } from '@astalakshimi/types';

/**
 * API-level enrollment gate. Runs globally (after `JwtAuthGuard`) and
 * requires every authenticated caller to have a profile, unless the route
 * opts out.
 *
 * Skip conditions (checked in order):
 *   1. Non-HTTP context (websockets do their own handshake auth).
 *   2. `@Public()` — no authentication at all (health, OTP endpoints).
 *   3. `@AllowIncomplete()` — onboarding endpoints (complete-registration,
 *      signup media upload, `GET /auth/me`).
 *   4. `@Roles(...)` — staff routes; admins/moderators may not have profiles.
 *   5. No `request.user` — `JwtAuthGuard` rejects with 401, so defer to it.
 *
 * The profile lookup is memoized on the request object so multiple guards
 * and interceptors in the same request share one DB query.
 */
@Injectable()
export class ProfileGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;

    const handler = context.getHandler();
    const targetClass = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, targetClass]);
    if (isPublic) return true;

    const allowIncomplete = this.reflector.getAllAndOverride<boolean>(ALLOW_INCOMPLETE_KEY, [
      handler,
      targetClass,
    ]);
    if (allowIncomplete) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      handler,
      targetClass,
    ]);
    if (requiredRoles && requiredRoles.length > 0) return true;

    const req = context.switchToHttp().getRequest() as {
      user?: UserSession;
      __hasProfile?: boolean;
    };
    const user = req.user;
    if (!user) return true; // JwtAuthGuard will reject with 401

    if (typeof req.__hasProfile !== 'boolean') {
      req.__hasProfile = await this.authService.userHasProfile(user.userId);
    }

    if (!req.__hasProfile) {
      throw new ForbiddenException('Please complete your registration to continue.');
    }

    return true;
  }
}
