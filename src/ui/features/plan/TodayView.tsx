import type { IsoDate } from "@/domain/calendar";
import type { Dish } from "@/domain/plan";
import type { DayMeal } from "@/domain/weekPlanning";
import { formatDayMonth, formatWeekday } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { dishTitle } from "@/ui/dishTitle";
import { useCollection } from "@/ui/hooks/useCollection";
import { navigate } from "@/ui/navigation/router";
import type { Route } from "@/ui/navigation/routes";
import { dishRoute } from "@/ui/navigation/routes";
import { strings } from "@/ui/strings/uk";
import styles from "./today.module.css";

/** Where a planned dish opens: its recipe or constructor; a dish in own words has no screen. */
function dishScreen(dish: Dish): Route | null {
  switch (dish.kind) {
    case "recipe":
      return dishRoute({ kind: "recipe", recipeId: dish.recipeId });
    case "framework":
      return dishRoute({ kind: "framework", frameworkId: dish.frameworkId });
    case "text":
      return null;
  }
}

interface TodayViewProps {
  date: IsoDate;
  /** Today's planned meals; never empty here. */
  meals: readonly DayMeal[];
  onWholeWeek: () => void;
}

export function TodayView({ date, meals, onWholeWeek }: TodayViewProps) {
  const dependencies = useDependencies();
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;

  return (
    <section className={styles.section} aria-labelledby="today-heading">
      <div className={styles.toolbar}>
        <div className={styles.titles}>
          <h2 id="today-heading" className={styles.heading}>
            {strings.today.heading}
          </h2>
          <p className={styles.date}>{strings.today.date(formatWeekday(date), formatDayMonth(date))}</p>
        </div>
        <button type="button" className="button button-secondary" onClick={onWholeWeek}>
          {strings.today.wholeWeek}
        </button>
      </div>

      <ul className={styles.meals}>
        {meals.map(({ meal, entry, isLeftover }) => {
          const title = dishTitle(entry.dish, recipes, frameworks);
          const target = dishScreen(entry.dish);
          const note = isLeftover ? <span className={styles.note}> · {strings.plan.leftovers}</span> : null;
          return (
            <li key={`${meal}-${entry.id}`} className={styles.meal}>
              <span className={styles.mealName}>{strings.meals[meal]}</span>
              {target ? (
                <button
                  type="button"
                  className={styles.dish}
                  aria-label={strings.today.openDish(title)}
                  onClick={() => navigate(target)}
                >
                  {title}
                  {note}
                </button>
              ) : (
                <span className={styles.dishText}>
                  {title}
                  {note}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
