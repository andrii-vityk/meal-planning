import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { newId } from "@/application/ids";
import type { IsoDate } from "@/domain/calendar";
import { weekDates } from "@/domain/calendar";
import type { Framework } from "@/domain/framework";
import type { Dish, MealSlot } from "@/domain/plan";
import { meals } from "@/domain/plan";
import { slotKey } from "@/domain/weekDraft";
import type { WeekPlanEntry } from "@/domain/weekPlanning";
import { Sheet } from "@/ui/components/Sheet";
import { WeekSwitcher } from "@/ui/components/WeekSwitcher";
import { formatWeekday } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { dishTitle } from "@/ui/dishTitle";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./planPanel.module.css";

/** What a saved entry looked like, for the confirmation shown by the caller. */
export interface SavedEntry {
  readonly title: string;
}

export interface PlanEntryPanelProps {
  /** The week shown first. */
  weekStart: IsoDate;
  /** Edit this existing entry. */
  entryId?: string;
  /** Start with this dish chosen (opened from a dish page or a match). */
  initialDish?: Dish;
  /** Start with this cell chosen (opened from a cell of the plan). */
  initialSlot?: MealSlot;
  onClose: () => void;
  onSaved: (saved: SavedEntry) => void;
}

/** First option of every slot: a sensible starting point the user can change. */
export const defaultChoices = (framework: Framework | undefined): Record<string, string> =>
  Object.fromEntries(
    (framework?.slots ?? []).flatMap((slot) => (slot.options[0] ? [[slot.id, slot.options[0].id]] : [])),
  );

interface DishOption {
  readonly key: string;
  readonly kind: "recipe" | "framework";
  readonly title: string;
  readonly dish: Dish;
}

const resultLimit = 8;

/**
 * Adding a dish to the plan, or changing one already there, in one panel:
 * choose the dish, tap the meals it covers (several taps = leftovers),
 * set servings.
 */
export function PlanEntryPanel({
  weekStart: initialWeek,
  entryId,
  initialDish,
  initialSlot,
  onClose,
  onSaved,
}: PlanEntryPanelProps) {
  const dependencies = useDependencies();
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const products = useCollection(dependencies.products).items;
  const existing = useCollection(dependencies.planEntries).items.get(entryId ?? "");

  const startDish = existing?.dish ?? initialDish ?? null;
  const [dish, setDish] = useState<Dish | null>(startDish);
  const [query, setQuery] = useState("");
  const [weekStart, setWeekStart] = useState<IsoDate>(existing?.weekStart ?? initialWeek);
  const [slots, setSlots] = useState<readonly MealSlot[]>(existing?.slots ?? (initialSlot ? [initialSlot] : []));
  const [servings, setServings] = useState(
    String(existing?.servings ?? (startDish?.kind === "recipe" ? recipes.get(startDish.recipeId)?.servings : undefined) ?? 2),
  );
  const [invalid, setInvalid] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const chooseDish = (next: Dish) => {
    setDish(next);
    setQuery("");
    if (next.kind === "recipe") {
      const recipe = recipes.get(next.recipeId);
      if (recipe) setServings(String(recipe.servings));
    }
  };

  const toggleSlot = (slot: MealSlot) =>
    setSlots((current) =>
      current.some((item) => slotKey(item) === slotKey(slot))
        ? current.filter((item) => slotKey(item) !== slotKey(slot))
        : [...current, slot],
    );

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const count = Number(servings);
    if (!dish || !(count > 0) || slots.length === 0) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    setFailed(false);
    // Chronological order: the first slot is when the dish is cooked,
    // later ones are leftovers.
    const ordered = slots.toSorted(
      (a, b) => a.date.localeCompare(b.date) || meals.indexOf(a.meal) - meals.indexOf(b.meal),
    );
    const entry: WeekPlanEntry = { id: entryId ?? newId(), weekStart, dish, servings: count, slots: ordered };
    startSaving(async () => {
      try {
        await dependencies.planEntries.save(entry);
        onSaved({ title: dishTitle(dish, recipes, frameworks) });
      } catch {
        setFailed(true);
      }
    });
  };

  const remove = () => {
    if (!entryId) return;
    setFailed(false);
    startSaving(async () => {
      try {
        await dependencies.planEntries.remove(entryId);
        onClose();
      } catch {
        setFailed(true);
      }
    });
  };

  const needle = query.trim().toLocaleLowerCase("uk");
  const candidates: readonly DishOption[] = [
    ...[...recipes.values()].map((recipe): DishOption => ({
      key: `recipe-${recipe.id}`,
      kind: "recipe",
      title: recipe.title,
      dish: { kind: "recipe", recipeId: recipe.id },
    })),
    ...[...frameworks.values()].map((item): DishOption => ({
      key: `framework-${item.id}`,
      kind: "framework",
      title: item.title,
      dish: { kind: "framework", frameworkId: item.id, choices: defaultChoices(item) },
    })),
  ];
  const results =
    needle === ""
      ? []
      : candidates
          .filter((item) => item.title.toLocaleLowerCase("uk").includes(needle))
          .toSorted((a, b) => a.title.localeCompare(b.title, "uk"))
          .slice(0, resultLimit);

  const framework = dish?.kind === "framework" ? frameworks.get(dish.frameworkId) : undefined;

  return (
    <Sheet labelledBy="plan-panel-heading" onClose={onClose}>
      <form className={styles.panel} onSubmit={submit} noValidate>
        <h2 id="plan-panel-heading" className={styles.heading}>
          {entryId ? strings.plan.editHeading : strings.plan.newEntry}
        </h2>

        <div className="field">
          <span className="label">{strings.plan.dish}</span>
          {dish ? (
            <div className={styles.chosen}>
              <strong className={styles.chosenTitle}>{dishTitle(dish, recipes, frameworks)}</strong>
              <button type="button" className="button button-secondary" onClick={() => setDish(null)}>
                {strings.plan.changeDish}
              </button>
            </div>
          ) : (
            <div className={styles.picker}>
              <input
                id="plan-dish-search"
                type="search"
                className="input"
                aria-label={strings.plan.dishSearch}
                placeholder={strings.plan.dishSearchPlaceholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.trim() !== "" && (
                <ul className={styles.results} aria-label={strings.plan.dishResults}>
                  {results.map((item) => (
                    <li key={item.key}>
                      <button type="button" className={styles.result} onClick={() => chooseDish(item.dish)}>
                        <span>{item.title}</span>
                        <span className={styles.resultKind}>{strings.dishes.kind[item.kind]}</span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className={styles.result}
                      onClick={() => chooseDish({ kind: "text", text: query.trim() })}
                    >
                      <span>{strings.plan.asText(query.trim())}</span>
                    </button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>

        {dish?.kind === "framework" &&
          framework?.slots.map((slot) => (
            <label key={slot.id} className="field">
              <span className="label">{slot.name}</span>
              <select
                className="input"
                value={dish.choices[slot.id] ?? ""}
                onChange={(event) =>
                  setDish({ ...dish, choices: { ...dish.choices, [slot.id]: event.target.value } })
                }
              >
                {!slot.required && <option value="">—</option>}
                {slot.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.kind === "product" ? (products.get(option.productId)?.name ?? "?") : option.text}
                  </option>
                ))}
              </select>
            </label>
          ))}

        <fieldset className={styles.when}>
          <legend className="label">{strings.plan.slots}</legend>
          <p className="hint">{strings.plan.slotsHint}</p>
          <WeekSwitcher
            weekStart={weekStart}
            onChange={(next) => {
              setWeekStart(next);
              setSlots([]);
            }}
          />
          <SlotGrid weekStart={weekStart} selected={slots} onToggle={toggleSlot} />
        </fieldset>

        <label className={`field ${styles.servings}`}>
          <span className="label">{strings.plan.servings}</span>
          <input
            id="plan-servings"
            className="input"
            inputMode="numeric"
            value={servings}
            onChange={(event) => setServings(event.target.value)}
          />
        </label>

        {invalid && (
          <p className="error" role="alert">
            {strings.plan.invalid}
          </p>
        )}
        {failed && (
          <p className="error" role="alert">
            {strings.plan.saveFailed}
          </p>
        )}

        <div className={styles.actions}>
          <button type="submit" className="button" disabled={isSaving}>
            {isSaving ? strings.common.saving : strings.common.save}
          </button>
          <button type="button" className="button button-secondary" onClick={onClose} disabled={isSaving}>
            {strings.common.cancel}
          </button>
          {entryId && (
            <button type="button" className="button button-danger" onClick={remove} disabled={isSaving}>
              {strings.plan.removeEntry}
            </button>
          )}
        </div>
      </form>
    </Sheet>
  );
}

interface SlotGridProps {
  weekStart: IsoDate;
  selected: readonly MealSlot[];
  onToggle: (slot: MealSlot) => void;
  /** Slots that cannot be chosen, by `slotKey`. */
  disabled?: ReadonlySet<string>;
  /** Slots already planned, by `slotKey`: marked, and chosen only to plan them again. */
  occupied?: ReadonlySet<string>;
}

/** Days across, meals down: one tap per meal the dish covers. */
export function SlotGrid({ weekStart, selected, onToggle, disabled, occupied }: SlotGridProps) {
  const chosen = new Set(selected.map(slotKey));
  const dates = weekDates(weekStart);
  return (
    <div className={styles.gridScroll}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">{strings.plan.mealColumn}</span>
            </th>
            {dates.map((date) => (
              <th key={date} scope="col" className={styles.dayHead}>
                {formatWeekday(date).slice(0, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meals.map((meal) => (
            <tr key={meal}>
              <th scope="row" className={styles.mealHead}>
                {strings.meals[meal]}
              </th>
              {dates.map((date) => {
                const slot = { date, meal };
                const isOn = chosen.has(slotKey(slot));
                const isOccupied = occupied?.has(slotKey(slot)) ?? false;
                return (
                  <td key={date}>
                    <button
                      type="button"
                      className={isOccupied ? `${styles.cell} ${styles.occupied}` : styles.cell}
                      aria-pressed={isOn}
                      disabled={disabled?.has(slotKey(slot))}
                      aria-label={
                        isOccupied
                          ? strings.plan.cellOccupied(formatWeekday(date), strings.meals[meal])
                          : strings.plan.cell(formatWeekday(date), strings.meals[meal])
                      }
                      onClick={() => onToggle(slot)}
                    >
                      {isOn ? (isOccupied ? "↻" : "✓") : isOccupied ? "•" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
