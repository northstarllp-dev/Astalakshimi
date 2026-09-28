export const CONTACT_MONTH_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export type ContactMonthWindow = {
  start: Date;
  end: Date;
  label: 'this month';
};

/** Midnight at the start of a calendar month in India, as a UTC instant. Month is 1–12. */
function istMonthStartUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - IST_OFFSET_MS);
}

export function contactMonthWindow(now = new Date()): ContactMonthWindow {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONTACT_MONTH_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const start = istMonthStartUtc(year, month);
  const end = month === 12 ? istMonthStartUtc(year + 1, 1) : istMonthStartUtc(year, month + 1);
  return { start, end, label: 'this month' };
}
