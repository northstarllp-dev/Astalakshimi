import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  REQUIRE_ENTITLEMENT_KEY,
  EntitlementFeature,
} from '../../entitlements/require-entitlement.decorator';
import { EntitlementsService } from '../../entitlements/entitlements.service';
import type { UserRole, UserSession } from '@astalakshimi/types';

/**
 * Single, uniform authorization guard.
 *
 * Reads route metadata in priority order:
 *   1. @Roles(...)       — the caller's user.role must be one of the listed roles.
 *   2. @RequireEntitlement(...) — the caller's plan must grant the feature.
 *
 * If neither is set, the guard is a no-op (just like the previous RolesGuard).
 * When JwtAuthGuard has not yet populated `request.user`, this guard defers to
 * the JWT guard by returning true — the request will be rejected before the
 * handler runs, so returning a non-403 from here is safe.
 */
@Injectable()
export class EnrollmentGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredFeature = this.reflector.getAllAndOverride<EntitlementFeature | undefined>(
      REQUIRE_ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles && !requiredFeature) return true;

    const user = context.switchToHttp().getRequest().user as UserSession | undefined;
    if (!user) return true; // JwtAuthGuard will reject

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(
          `Access denied. Requires one of the following roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    if (requiredFeature) {
      const hasAccess = await this.entitlementsService.checkEntitlement(
        user.userId,
        requiredFeature,
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          `Your current plan does not include access to ${requiredFeature}. Please upgrade your plan.`,
        );
      }
    }

    return true;
  }
}
