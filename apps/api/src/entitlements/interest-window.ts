export const FREE_INTEREST_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

export const PLAN_TIER: Record<string, number> = {
  free: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

export type InterestWindow = {
  start: Date | null;
  end: Date | null;
  label: string;
};

export function currentFreeCycle(profileCreatedAt: Date, now = new Date()) {
  const origin = profileCreatedAt.getTime();
  const elapsed = Math.max(0, now.getTime() - origin);
  const cycleIndex = Math.floor(elapsed / FREE_INTEREST_CYCLE_MS);
  const start = new Date(origin + cycleIndex * FREE_INTEREST_CYCLE_MS);
  const end = new Date(origin + (cycleIndex + 1) * FREE_INTEREST_CYCLE_MS);
  return { start, end };
}

export function resolveInterestWindow(input: {
  slug: string;
  interestQuota: number | null | undefined;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  profileCreatedAt: Date;
  lastEndedAt?: Date | null;
  now?: Date;
}): InterestWindow {
  if (input.interestQuota == null) {
    return { start: null, end: null, label: 'unlimited' };
  }

  const now = input.now ?? new Date();
  const isPaidQuotaPlan = input.slug === 'silver' || input.slug === 'gold';

  if (isPaidQuotaPlan && input.startsAt) {
    return {
      start: input.startsAt,
      end: input.expiresAt ?? null,
      label: input.slug === 'silver' ? 'this Silver plan' : 'this Gold plan',
    };
  }

  const cycle = currentFreeCycle(input.profileCreatedAt, now);
  let start = cycle.start;
  if (
    input.lastEndedAt &&
    input.lastEndedAt.getTime() > start.getTime() &&
    input.lastEndedAt.getTime() <= now.getTime()
  ) {
    start = input.lastEndedAt;
  }

  return {
    start,
    end: cycle.end,
    label: 'this 30 days',
  };
}

export function isPlanDowngrade(currentSlug: string, targetSlug: string): boolean {
  const from = PLAN_TIER[currentSlug] ?? 0;
  const to = PLAN_TIER[targetSlug] ?? 0;
  return to < from;
}
