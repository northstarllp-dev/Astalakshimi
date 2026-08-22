import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ENTITLEMENT_KEY = 'require_entitlement';

export type EntitlementFeature = 'advanced_filters' | 'priority_listing' | 'premium_matches';

export const RequireEntitlement = (feature: EntitlementFeature) =>
  SetMetadata(REQUIRE_ENTITLEMENT_KEY, feature);
