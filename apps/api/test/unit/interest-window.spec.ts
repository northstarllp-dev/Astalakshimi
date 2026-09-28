import {
  currentFreeCycle,
  FREE_INTEREST_CYCLE_MS,
  isPlanDowngrade,
  resolveInterestWindow,
} from '../../src/entitlements/interest-window';

describe('interest-window', () => {
  const profileCreatedAt = new Date('2026-01-10T15:30:00.000Z');

  describe('currentFreeCycle', () => {
    it('starts the first cycle at profile creation', () => {
      const now = new Date('2026-01-20T15:30:00.000Z');
      const cycle = currentFreeCycle(profileCreatedAt, now);
      expect(cycle.start).toEqual(profileCreatedAt);
      expect(cycle.end.getTime() - cycle.start.getTime()).toBe(FREE_INTEREST_CYCLE_MS);
    });

    it('rolls to the next 30-day cycle at the same time of day', () => {
      const now = new Date(profileCreatedAt.getTime() + FREE_INTEREST_CYCLE_MS);
      const cycle = currentFreeCycle(profileCreatedAt, now);
      expect(cycle.start.getTime()).toBe(profileCreatedAt.getTime() + FREE_INTEREST_CYCLE_MS);
    });
  });

  describe('resolveInterestWindow', () => {
    it('does not count Platinum or Diamond', () => {
      expect(
        resolveInterestWindow({
          slug: 'platinum',
          interestQuota: null,
          profileCreatedAt,
        }),
      ).toEqual({ start: null, end: null, label: 'unlimited' });
    });

    it('uses the Silver subscription term, ignoring earlier Free sends', () => {
      const startsAt = new Date('2026-09-01T08:00:00.000Z');
      const expiresAt = new Date('2026-11-30T08:00:00.000Z');
      const window = resolveInterestWindow({
        slug: 'silver',
        interestQuota: 100,
        startsAt,
        expiresAt,
        profileCreatedAt,
      });
      expect(window).toEqual({
        start: startsAt,
        end: expiresAt,
        label: 'this Silver plan',
      });
    });

    it('uses the Gold subscription term', () => {
      const startsAt = new Date('2026-09-01T08:00:00.000Z');
      const expiresAt = new Date('2027-03-01T08:00:00.000Z');
      const window = resolveInterestWindow({
        slug: 'gold',
        interestQuota: 500,
        startsAt,
        expiresAt,
        profileCreatedAt,
      });
      expect(window.label).toBe('this Gold plan');
      expect(window.start).toEqual(startsAt);
    });

    it('clamps Free to the later of the cycle start and a paid plan that already ended', () => {
      const now = new Date('2026-03-01T15:30:00.000Z');
      const lastEndedAt = new Date('2026-02-20T12:00:00.000Z');
      const cycle = currentFreeCycle(profileCreatedAt, now);
      const window = resolveInterestWindow({
        slug: 'free',
        interestQuota: 30,
        profileCreatedAt,
        lastEndedAt,
        now,
      });
      expect(window.start).toEqual(lastEndedAt);
      expect(window.end).toEqual(cycle.end);
      expect(window.label).toBe('this 30 days');
    });

    it('does not use a lastEndedAt that is before the current Free cycle', () => {
      const now = new Date(profileCreatedAt.getTime() + FREE_INTEREST_CYCLE_MS + 86_400_000);
      const lastEndedAt = profileCreatedAt;
      const cycle = currentFreeCycle(profileCreatedAt, now);
      const window = resolveInterestWindow({
        slug: 'free',
        interestQuota: 30,
        profileCreatedAt,
        lastEndedAt,
        now,
      });
      expect(window.start).toEqual(cycle.start);
    });
  });

  describe('isPlanDowngrade', () => {
    it('rejects Gold to Silver and allows Silver renewal', () => {
      expect(isPlanDowngrade('gold', 'silver')).toBe(true);
      expect(isPlanDowngrade('silver', 'silver')).toBe(false);
      expect(isPlanDowngrade('silver', 'gold')).toBe(false);
      expect(isPlanDowngrade('free', 'silver')).toBe(false);
    });
  });
});
