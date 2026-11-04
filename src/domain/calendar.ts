/**
 * Calendar dates as "YYYY-MM-DD" strings.
 *
 * Plans are about days, not instants, so dates carry no time or time zone.
 * All arithmetic is done in UTC to avoid daylight-saving shifts.
 */
export type IsoDate = string;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): value is IsoDate {
  if (!ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function toDate(value: IsoDate): Date {
  if (!isIsoDate(value)) {
    throw new RangeError(`Not a calendar date: "${value}"`);
  }
  return new Date(`${value}T00:00:00Z`);
}

function fromDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: IsoDate, days: number): IsoDate {
  const date = toDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return fromDate(date);
}

/** Monday of the week that contains the given date. */
export function startOfWeek(value: IsoDate): IsoDate {
  const date = toDate(value);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return addDays(value, -daysSinceMonday);
}

/** The seven dates of the week starting at the given Monday. */
export function weekDates(weekStart: IsoDate): IsoDate[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}
