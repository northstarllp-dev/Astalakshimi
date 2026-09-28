import { contactMonthWindow } from '../../src/entitlements/contact-month';

describe('contactMonthWindow', () => {
  it('keeps 23:30 IST on the last day inside that month', () => {
    const lastEvening = new Date('2026-09-30T18:00:00.000Z');
    const window = contactMonthWindow(lastEvening);

    expect(window.label).toBe('this month');
    expect(window.start.toISOString()).toBe('2026-08-31T18:30:00.000Z');
    expect(window.end.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(lastEvening.getTime()).toBeGreaterThanOrEqual(window.start.getTime());
    expect(lastEvening.getTime()).toBeLessThan(window.end.getTime());
  });

  it('starts the next month at 00:30 IST on the 1st', () => {
    const justAfterMidnight = new Date('2026-09-30T19:00:00.000Z');
    const window = contactMonthWindow(justAfterMidnight);

    expect(window.start.toISOString()).toBe('2026-09-30T18:30:00.000Z');
    expect(window.end.toISOString()).toBe('2026-10-31T18:30:00.000Z');
    expect(justAfterMidnight.getTime()).toBeGreaterThanOrEqual(window.start.getTime());
    expect(justAfterMidnight.getTime()).toBeLessThan(window.end.getTime());
  });
});
