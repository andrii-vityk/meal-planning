import type { FormEvent } from "react";
import { useState } from "react";
import { newId } from "@/application/ids";
import type { IsoDate } from "@/domain/calendar";
import { weekDates } from "@/domain/calendar";
import type { Framework } from "@/domain/framework";
import type { Dish, Meal, MealSlot } from "@/domain/plan";
import { meals } from "@/domain/plan";
import type { WeekPlanEntry } from "@/domain/weekPlanning";
import { formatShortDay } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./plan.module.css";

type DishKind = Dish["kind"];
const dishKinds: readonly DishKind[] = ["recipe", "framework", "text"];

interface PlanEntryFormProps {
  weekStart: IsoDate;
  entryId?: string;
  initialSlot?: MealSlot;
  onDone: () => void;
}

/** First option of every slot: a sensible starting point the user can change. */
const defaultChoices = (framework: Framework | undefined): Record<string, string> =>
  Object.fromEntries(
    (framework?.slots ?? []).flatMap((slot) => (slot.options[0] ? [[slot.id, slot.options[0].id]] : [])),
  );

const slotKey = (slot: MealSlot) => `${slot.date}|${slot.meal}`;

export function PlanEntryForm({ weekStart, entryId, initialSlot, onDone }: PlanEntryFormProps) {
  const dependencies = useDependencies();
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const products = useCollection(dependencies.products).items;
  const existing = useCollection(dependencies.planEntries).items.get(entryId ?? "");

  const recipeList = [...recipes.values()].toSorted((a, b) => a.title.localeCompare(b.title, "uk"));
  const frameworkList = [...frameworks.values()].toSorted((a, b) => a.title.localeCompare(b.title, "uk"));
  const dish = existing?.dish;

  const [kind, setKind] = useState<DishKind>(dish?.kind ?? (recipeList.length > 0 ? "recipe" : "text"));
  const [recipeId, setRecipeId] = useState(dish?.kind === "recipe" ? dish.recipeId : (recipeList[0]?.id ?? ""));
  const [frameworkId, setFrameworkId] = useState(
    dish?.kind === "framework" ? dish.frameworkId : (frameworkList[0]?.id ?? ""),
  );
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    dish?.kind === "framework" ? { ...dish.choices } : defaultChoices(frameworkList[0]),
  );
  const [text, setText] = useState(dish?.kind === "text" ? dish.text : "");
  const [servings, setServings] = useState(String(existing?.servings ?? recipes.get(recipeId)?.servings ?? 2));
  const [slots, setSlots] = useState<readonly MealSlot[]>(existing?.slots ?? (initialSlot ? [initialSlot] : []));
  const [newSlotDate, setNewSlotDate] = useState<IsoDate>(initialSlot?.date ?? weekStart);
  const [newSlotMeal, setNewSlotMeal] = useState<Meal>("lunch");
  const [invalid, setInvalid] = useState(false);

  const framework = frameworks.get(frameworkId);

  const buildDish = (): Dish | null => {
    if (kind === "recipe") return recipes.has(recipeId) ? { kind, recipeId } : null;
    if (kind === "framework") return framework ? { kind, frameworkId, choices } : null;
    return text.trim() ? { kind, text: text.trim() } : null;
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = buildDish();
    const count = Number(servings);
    if (!chosen || !(count > 0) || slots.length === 0) {
      setInvalid(true);
      return;
    }
    const entry: WeekPlanEntry = { id: entryId ?? newId(), weekStart, dish: chosen, servings: count, slots };
    void dependencies.planEntries.save(entry);
    onDone();
  };

  const remove = () => {
    if (entryId) void dependencies.planEntries.remove(entryId);
    onDone();
  };

  const addSlot = () => {
    const slot = { date: newSlotDate, meal: newSlotMeal };
    if (slots.some((existingSlot) => slotKey(existingSlot) === slotKey(slot))) return;
    setSlots([...slots, slot]);
  };

  return (
    <form className={styles.editor} onSubmit={submit} noValidate aria-labelledby="plan-entry-heading">
      <h3 id="plan-entry-heading" className={styles.dayTitle}>
        {entryId ? strings.plan.editHeading : strings.plan.newEntry}
      </h3>

      <fieldset className={styles.kinds}>
        <legend className="label">{strings.plan.dishKind}</legend>
        {dishKinds.map((value) => (
          <label key={value} className={styles.inline}>
            <input type="radio" name="dish-kind" value={value} checked={kind === value} onChange={() => setKind(value)} />
            <span>{strings.plan.kinds[value]}</span>
          </label>
        ))}
      </fieldset>

      {kind === "recipe" &&
        (recipeList.length === 0 ? (
          <p className="hint">{strings.plan.noRecipes}</p>
        ) : (
          <label className="field">
            <span className="label">{strings.plan.recipe}</span>
            <select
              id="plan-recipe"
              className="input"
              value={recipeId}
              onChange={(event) => {
                setRecipeId(event.target.value);
                setServings(String(recipes.get(event.target.value)?.servings ?? servings));
              }}
            >
              {recipeList.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </option>
              ))}
            </select>
          </label>
        ))}

      {kind === "framework" &&
        (frameworkList.length === 0 ? (
          <p className="hint">{strings.plan.noFrameworks}</p>
        ) : (
          <>
            <label className="field">
              <span className="label">{strings.plan.framework}</span>
              <select
                id="plan-framework"
                className="input"
                value={frameworkId}
                onChange={(event) => {
                  setFrameworkId(event.target.value);
                  setChoices(defaultChoices(frameworks.get(event.target.value)));
                }}
              >
                {frameworkList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            {framework?.slots.map((slot) => (
              <label key={slot.id} className="field">
                <span className="label">{slot.name}</span>
                <select
                  className="input"
                  value={choices[slot.id] ?? ""}
                  onChange={(event) => setChoices({ ...choices, [slot.id]: event.target.value })}
                >
                  {!slot.required && <option value="">—</option>}
                  {slot.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.kind === "product"
                        ? (products.get(option.productId)?.name ?? "?")
                        : option.text}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </>
        ))}

      {kind === "text" && (
        <label className="field">
          <span className="label">{strings.plan.text}</span>
          <input id="plan-text" className="input" value={text} onChange={(event) => setText(event.target.value)} />
        </label>
      )}

      <label className="field">
        <span className="label">{strings.plan.servings}</span>
        <input
          id="plan-servings"
          className="input"
          inputMode="numeric"
          value={servings}
          onChange={(event) => setServings(event.target.value)}
        />
      </label>

      <div className="field">
        <span className="label">{strings.plan.slots}</span>
        <ul className={styles.slotChips}>
          {slots.map((slot) => {
            const label = `${formatShortDay(slot.date)}, ${strings.meals[slot.meal].toLocaleLowerCase("uk")}`;
            return (
              <li key={slotKey(slot)} className={styles.slotChip}>
                <span>{label}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={strings.plan.removeSlot(label)}
                  onClick={() => setSlots(slots.filter((item) => slotKey(item) !== slotKey(slot)))}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        <div className={styles.slotPicker}>
          <select
            className="input"
            aria-label={strings.plan.slotDay}
            value={newSlotDate}
            onChange={(event) => setNewSlotDate(event.target.value)}
          >
            {weekDates(weekStart).map((date) => (
              <option key={date} value={date}>
                {formatShortDay(date)}
              </option>
            ))}
          </select>
          <select
            className="input"
            aria-label={strings.plan.slotMeal}
            value={newSlotMeal}
            onChange={(event) => setNewSlotMeal(meals.find((meal) => meal === event.target.value) ?? "lunch")}
          >
            {meals.map((meal) => (
              <option key={meal} value={meal}>
                {strings.meals[meal]}
              </option>
            ))}
          </select>
          <button type="button" className="button button-secondary" onClick={addSlot}>
            {strings.plan.addSlot}
          </button>
        </div>
      </div>

      {invalid && (
        <p className="error" role="alert">
          {strings.plan.invalid}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className="button">
          {strings.common.save}
        </button>
        <button type="button" className="button button-secondary" onClick={onDone}>
          {strings.common.cancel}
        </button>
        {entryId && (
          <button type="button" className="button button-danger" onClick={remove}>
            {strings.common.delete}
          </button>
        )}
      </div>
    </form>
  );
}
