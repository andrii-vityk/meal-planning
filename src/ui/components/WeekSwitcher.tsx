import type { IsoDate } from "@/domain/calendar";
import { addDays } from "@/domain/calendar";
import { formatWeekRange } from "@/ui/dates";
import { strings } from "@/ui/strings/uk";
import styles from "./WeekSwitcher.module.css";

interface WeekSwitcherProps {
  weekStart: IsoDate;
  onChange: (weekStart: IsoDate) => void;
}

/** A controlled component: it shows the week it is given and asks the parent to change it. */
export function WeekSwitcher({ weekStart, onChange }: WeekSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <button
        type="button"
        className="button button-secondary"
        aria-label={strings.week.previous}
        onClick={() => onChange(addDays(weekStart, -7))}
      >
        ‹
      </button>
      <span className={styles.label} aria-live="polite">
        {formatWeekRange(weekStart)}
      </span>
      <button
        type="button"
        className="button button-secondary"
        aria-label={strings.week.next}
        onClick={() => onChange(addDays(weekStart, 7))}
      >
        ›
      </button>
    </div>
  );
}
