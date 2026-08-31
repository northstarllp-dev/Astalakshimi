import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntitlementsService } from './entitlements.service';
import { REQUIRE_ENTITLEMENT_KEY, EntitlementFeature } from './require-entitlement.decorator';
import type { UserSession } from '@astalakshimi/types';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlementsService: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.getAllAndOverride<EntitlementFeature>(
      REQUIRE_ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as UserSession | undefined;

    if (!user) {
      throw new ForbiddenException('Authentication required for this feature');
    }

    const hasAccess = await this.entitlementsService.checkEntitlement(user.userId, requiredFeature);

    if (!hasAccess) {
      throw new ForbiddenException(`Your current plan does not include access to ${requiredFeature}. Please upgrade your plan.`);
    }

    return true;
  }
}
