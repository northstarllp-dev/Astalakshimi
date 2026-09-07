import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/**
 * Marks a route as not requiring authentication.
 *
 * `JwtAuthGuard` reads this metadata and short-circuits to `true`,
 * bypassing the token check. Use this on the auth onboarding endpoints
 * (send-otp, verify-otp, refresh) and on the liveness probe (`/health`).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
