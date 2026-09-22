import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_INCOMPLETE_KEY } from '../decorators/allow-incomplete.decorator';
import { ALLOW_UNVERIFIED_KEY } from '../decorators/allow-unverified.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DB_CLIENT } from '../../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, verifications } from '@astalakshimi/database';
import { eq } from 'drizzle-orm';
import type { UserRole, UserSession } from '@astalakshimi/types';

/**
 * API-level verification gate. Runs globally (after `ProfileGuard`) and
 * requires every authenticated member to be admin-verified, unless the
 * route opts out.
 *
 * Skip conditions (checked in order):
 *   1. Non-HTTP context
 *   2. `@Public()`
 *   3. `@AllowIncomplete()` — onboarding (no profile yet / signup media)
 *   4. `@AllowUnverified()` — browse / self-service teaser endpoints
 *   5. `@Roles(...)` — staff routes
 *   6. No `request.user` — defer to JwtAuthGuard
 *
 * Verification status is memoized on the request so multiple guards in
 * the same request share one DB query.
 */
@Injectable()
export class VerificationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(DB_CLIENT) private readonly db: Database,
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

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_KEY, [
      handler,
      targetClass,
    ]);
    if (allowUnverified) return true;

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      handler,
      targetClass,
    ]);
    if (requiredRoles && requiredRoles.length > 0) return true;

    const req = context.switchToHttp().getRequest() as {
      user?: UserSession;
      __verificationStatus?: string | null;
    };
    const user = req.user;
    if (!user) return true;

    if (typeof req.__verificationStatus === 'undefined') {
      req.__verificationStatus = await this.loadVerificationStatus(user.userId);
    }

    if (req.__verificationStatus !== 'verified') {
      throw new ForbiddenException(
        'Profile verification pending — you can browse, but interactions unlock after admin verification.',
      );
    }

    return true;
  }

  private async loadVerificationStatus(userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ status: verifications.status })
      .from(verifications)
      .innerJoin(profiles, eq(verifications.profileId, profiles.id))
      .where(eq(profiles.userId, userId))
      .limit(1);

    return row?.status ?? null;
  }
}
