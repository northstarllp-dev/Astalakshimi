import { SetMetadata } from '@nestjs/common';

export const ALLOW_INCOMPLETE_KEY = 'allow_incomplete';

/**
 * Marks a route as usable by authenticated users who have not finished
 * registration yet (JWT valid, but no profile row).
 *
 * `ProfileGuard` reads this metadata and skips the has-profile check.
 * Use this on onboarding endpoints: `POST /profiles/complete-registration`,
 * the media upload/confirm endpoints used during signup, and `GET /auth/me`.
 *
 * Contrast with `@Public()`, which skips authentication entirely.
 */
export const AllowIncomplete = () => SetMetadata(ALLOW_INCOMPLETE_KEY, true);
