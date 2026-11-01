import type { IsoDate } from "@/domain/calendar";
import { addDays } from "@/domain/calendar";

/** Today's date in the viewer's own time zone. */
export function todayIso(): IsoDate {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Dates are calendar days, so they are formatted in UTC to avoid shifting.
const dayMonth = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("uk-UA", { weekday: "long", timeZone: "UTC" });
const shortDay = new Intl.DateTimeFormat("uk-UA", { weekday: "short", day: "numeric", timeZone: "UTC" });

const asDate = (value: IsoDate) => new Date(`${value}T00:00:00Z`);

export const formatDayMonth = (value: IsoDate) => dayMonth.format(asDate(value));
export const formatWeekday = (value: IsoDate) => weekday.format(asDate(value));
export const formatShortDay = (value: IsoDate) => shortDay.format(asDate(value));

export function formatWeekRange(weekStart: IsoDate): string {
  return `${formatDayMonth(weekStart)} — ${formatDayMonth(addDays(weekStart, 6))}`;
}
