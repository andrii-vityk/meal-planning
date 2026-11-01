import { useState } from "react";
import type { IsoDate } from "@/domain/calendar";
import { startOfWeek, weekDates } from "@/domain/calendar";
import { nutritionCoverage } from "@/domain/nutritionCoverage";
import type { Meal, MealSlot } from "@/domain/plan";
import { meals } from "@/domain/plan";
import { nutrients } from "@/domain/product";
import { weekPlan } from "@/domain/weekPlanning";
import { WeekSwitcher } from "@/ui/components/WeekSwitcher";
import { formatDayMonth, formatWeekday, todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { dishTitle } from "@/ui/dishTitle";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { PlanEntryForm } from "./PlanEntryForm";
import styles from "./plan.module.css";

type Editor = { readonly entryId: string } | { readonly slot: MealSlot } | null;

export function PlanView() {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const entries = useCollection(dependencies.planEntries).items;

  // A function initializer, so "today" is computed once, not on every render.
  const [weekStart, setWeekStart] = useState<IsoDate>(() => startOfWeek(todayIso()));
  const [editor, setEditor] = useState<Editor>(null);

  const plan = weekPlan(weekStart, entries.values());
  const coverage = nutritionCoverage(plan, { products, recipes, frameworks });

  const entriesAt = (date: IsoDate, meal: Meal) =>
    plan.entries.flatMap((entry) => {
      const index = entry.slots.findIndex((slot) => slot.date === date && slot.meal === meal);
      return index === -1 ? [] : [{ entry, isLeftover: index > 0 }];
    });

  return (
    <section className={styles.section} aria-labelledby="plan-heading">
      <div className={styles.toolbar}>
        <h2 id="plan-heading" className={styles.heading}>
          {strings.plan.heading}
        </h2>
        <WeekSwitcher
          weekStart={weekStart}
          onChange={(next) => {
            setWeekStart(next);
            setEditor(null);
          }}
        />
      </div>

      {editor && (
        <PlanEntryForm
          key={"entryId" in editor ? editor.entryId : `${editor.slot.date}-${editor.slot.meal}`}
          weekStart={weekStart}
          {...("entryId" in editor ? { entryId: editor.entryId } : { initialSlot: editor.slot })}
          onDone={() => setEditor(null)}
        />
      )}

      <ol className={styles.days}>
        {weekDates(weekStart).map((date, dayIndex) => (
          <li key={date} className={styles.day}>
            <div className={styles.dayHeader}>
              <h3 className={styles.dayTitle}>
                {formatWeekday(date)}, {formatDayMonth(date)}
              </h3>
              <ul className={styles.coverage} aria-label={strings.plan.coverage}>
                {nutrients.map((nutrient) => {
                  const covered = coverage[dayIndex]?.nutrients[nutrient] ?? false;
                  const label = strings.products.nutrition[nutrient];
                  return (
                    <li
                      key={nutrient}
                      className={covered ? styles.covered : styles.notCovered}
                      aria-label={covered ? strings.plan.covered(label) : strings.plan.notCovered(label)}
                    >
                      {covered ? "✓" : "·"} {label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <dl className={styles.meals}>
              {meals.map((meal) => (
                <div key={meal} className={styles.meal}>
                  <dt className={styles.mealName}>{strings.meals[meal]}</dt>
                  <dd className={styles.mealEntries}>
                    {entriesAt(date, meal).map(({ entry, isLeftover }) => {
                      const title = dishTitle(entry.dish, recipes, frameworks);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={styles.entry}
                          aria-label={strings.plan.editEntry(title)}
                          onClick={() => setEditor({ entryId: entry.id })}
                        >
                          {title}
                          {isLeftover && <span className={styles.leftover}> · {strings.plan.leftovers}</span>}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.add}
                      aria-label={strings.plan.add(strings.meals[meal], formatWeekday(date))}
                      onClick={() => setEditor({ slot: { date, meal } })}
                    >
                      +
                    </button>
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
