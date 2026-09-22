import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNVERIFIED_KEY = 'allow_unverified';

/**
 * Marks a route as usable by authenticated members whose profile exists
 * but is not yet admin-verified.
 *
 * `VerificationGuard` reads this metadata and skips the verified check.
 * Use on browse / self-service endpoints (search, matches, shortlist,
 * profile edit, GET interests) so the teaser UX can render. Interaction
 * endpoints (send interest, chat send, unlock contact) stay gated.
 */
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);
