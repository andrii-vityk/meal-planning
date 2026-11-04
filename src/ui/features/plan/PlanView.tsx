import { useEffect, useRef, useState, useTransition } from "react";
import type { WeekDraftOptions } from "@/application/weekDraft";
import { draftWeek, reviseDraft, saveDraft } from "@/application/weekDraft";
import type { IsoDate } from "@/domain/calendar";
import { startOfWeek, weekDates } from "@/domain/calendar";
import { nutritionCoverage } from "@/domain/nutritionCoverage";
import type { Meal, MealSlot, PlanEntry } from "@/domain/plan";
import { meals } from "@/domain/plan";
import { nutrients } from "@/domain/product";
import type { DraftEntry } from "@/domain/weekDraft";
import { compareEntries, isIdea } from "@/domain/weekDraft";
import { weekPlan } from "@/domain/weekPlanning";
import { aiErrorMessage, isCancellation } from "@/ui/aiErrors";
import { WeekSwitcher } from "@/ui/components/WeekSwitcher";
import { formatDayMonth, formatWeekday, todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { dishTitle } from "@/ui/dishTitle";
import { useBackClosable } from "@/ui/hooks/useBackClosable";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { DraftSheet } from "./DraftSheet";
import { PlanEntryPanel } from "./PlanEntryPanel";
import styles from "./plan.module.css";

/** What is open over the plan. */
type Layer =
  | { readonly kind: "entry"; readonly entryId: string }
  | { readonly kind: "cell"; readonly slot: MealSlot }
  | { readonly kind: "draft" };

/** A draft lives only here, in memory, until it is accepted. */
interface Draft {
  readonly options: WeekDraftOptions;
  readonly entries: readonly DraftEntry[];
  /** Entries the last change put in: highlighted until the next one. */
  readonly changed?: ReadonlySet<DraftEntry>;
}

const occurs = (slots: readonly MealSlot[], date: IsoDate, meal: Meal) =>
  slots.findIndex((slot) => slot.date === date && slot.meal === meal);

export function PlanView() {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const entries = useCollection(dependencies.planEntries).items;

  // A function initializer, so "today" is computed once, not on every render.
  const [weekStart, setWeekStart] = useState<IsoDate>(() => startOfWeek(todayIso()));
  const [layer, openLayer, closeLayer] = useBackClosable<Layer>();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<DraftEntry | null>(null);
  const [instruction, setInstruction] = useState("");
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [isDrafting, startDraftWork] = useTransition();
  const [isAccepting, startAccepting] = useTransition();
  const isDraftBusy = isDrafting || isAccepting;
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const plan = weekPlan(weekStart, entries.values());
  const weekDraft = draft?.options.weekStart === weekStart ? draft : null;
  const draftEntries = weekDraft?.entries ?? [];

  // Coverage previews the draft together with what is already planned.
  const preview: PlanEntry[] = [
    ...plan.entries,
    ...draftEntries.map((entry, index) => ({ id: `draft-${index}`, ...entry })),
  ];
  const coverage = nutritionCoverage({ weekStart, entries: preview }, { products, recipes, frameworks });
  const titleOf = (entry: { readonly dish: PlanEntry["dish"] }) => dishTitle(entry.dish, recipes, frameworks);

  const runDraftWork = (work: (signal: AbortSignal) => Promise<void>) => {
    setDraftError(null);
    controller.current?.abort();
    controller.current = new AbortController();
    const { signal } = controller.current;
    startDraftWork(async () => {
      try {
        await work(signal);
      } catch (caught) {
        if (!isCancellation(caught)) setDraftError(aiErrorMessage(caught));
      }
    });
  };

  const replace = (entry: DraftEntry) => {
    if (!weekDraft) return;
    setReplacing(entry);
    runDraftWork(async (signal) => {
      try {
        const options = { ...weekDraft.options, draft: weekDraft.entries, replacing: [entry] };
        const alternatives = await draftWeek(dependencies, options, signal);
        if (alternatives.length === 0) {
          setDraftError(strings.draft.noAlternative);
          return;
        }
        setDraft({
          options: weekDraft.options,
          entries: [...weekDraft.entries.filter((item) => item !== entry), ...alternatives].toSorted(compareEntries),
          changed: new Set(alternatives),
        });
      } finally {
        setReplacing(null);
      }
    });
  };

  const revise = () => {
    const text = instruction.trim();
    if (!weekDraft || text === "") return;
    setDraftNotice(null);
    setIsRevising(true);
    runDraftWork(async (signal) => {
      try {
        const revision = await reviseDraft(dependencies, weekDraft.options, weekDraft.entries, text, signal);
        setDraft({ options: revision.options, entries: revision.entries, changed: new Set(revision.changed) });
        setInstruction("");
        setDraftNotice(
          revision.changed.length > 0
            ? strings.draft.changedCount(revision.changed.length)
            : revision.entries.length < weekDraft.entries.length
              ? strings.draft.removedOnly
              : strings.draft.nothingChanged,
        );
      } finally {
        setIsRevising(false);
      }
    });
  };

  const regenerate = () => {
    if (!weekDraft) return;
    runDraftWork(async (signal) => {
      const next = await draftWeek(dependencies, weekDraft.options, signal);
      if (next.length === 0) setDraftError(strings.draft.empty);
      else setDraft({ options: weekDraft.options, entries: next });
    });
  };

  const accept = () => {
    if (!weekDraft) return;
    setDraftError(null);
    startAccepting(async () => {
      try {
        await saveDraft(dependencies, weekStart, weekDraft.entries);
        setDraft(null);
      } catch {
        setDraftError(strings.draft.acceptFailed);
      }
    });
  };

  const removeFromDraft = (entry: DraftEntry) => {
    if (!weekDraft) return;
    const rest = weekDraft.entries.filter((item) => item !== entry);
    setDraft(rest.length > 0 ? { options: weekDraft.options, entries: rest } : null);
  };

  return (
    <section className={styles.section} aria-labelledby="plan-heading">
      <div className={styles.toolbar}>
        <h2 id="plan-heading" className={styles.heading}>
          {strings.plan.heading}
        </h2>
        <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />
      </div>

      {weekDraft ? (
        <div className={styles.draftBar} role="region" aria-label={strings.draft.heading}>
          <p className={styles.draftSummary}>{strings.draft.summary(weekDraft.entries.length)}</p>
          <div className={styles.actions}>
            <button type="button" className="button" onClick={accept} disabled={isDraftBusy}>
              {isAccepting ? strings.common.saving : strings.draft.accept}
            </button>
            <button type="button" className="button button-secondary" onClick={regenerate} disabled={isDraftBusy}>
              {strings.draft.regenerate}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => {
                controller.current?.abort();
                setDraft(null);
                setDraftError(null);
                setDraftNotice(null);
              }}
            >
              {strings.draft.discard}
            </button>
          </div>
          <form
            className={styles.revise}
            onSubmit={(event) => {
              event.preventDefault();
              revise();
            }}
          >
            <input
              id="draft-instruction"
              className="input"
              aria-label={strings.draft.changeLabel}
              placeholder={strings.draft.changePlaceholder}
              value={instruction}
              disabled={isDraftBusy}
              onChange={(event) => setInstruction(event.target.value)}
            />
            <button
              type="submit"
              className="button button-secondary"
              disabled={isDraftBusy || instruction.trim() === ""}
            >
              {isRevising ? strings.draft.changing : strings.draft.change}
            </button>
          </form>
          {draftNotice && (
            <p className="hint" role="status">
              {draftNotice}
            </p>
          )}
        </div>
      ) : (
        <div>
          <button type="button" className="button" onClick={() => openLayer({ kind: "draft" })}>
            {strings.draft.open}
          </button>
        </div>
      )}
      {draftError && (
        <p className="error" role="alert">
          {draftError}
        </p>
      )}

      {layer?.kind === "entry" && (
        <PlanEntryPanel weekStart={weekStart} entryId={layer.entryId} onClose={closeLayer} onSaved={closeLayer} />
      )}
      {layer?.kind === "cell" && (
        <PlanEntryPanel weekStart={weekStart} initialSlot={layer.slot} onClose={closeLayer} onSaved={closeLayer} />
      )}
      {layer?.kind === "draft" && (
        <DraftSheet
          weekStart={weekStart}
          occupied={plan.entries.flatMap((entry) => entry.slots)}
          onClose={closeLayer}
          onDrafted={(drafted, options) => {
            setDraft({ options, entries: drafted });
            closeLayer();
          }}
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
                    {plan.entries.map((entry) => {
                      const index = occurs(entry.slots, date, meal);
                      if (index === -1) return null;
                      const title = titleOf(entry);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          className={styles.entry}
                          aria-label={strings.plan.editEntry(title)}
                          onClick={() => openLayer({ kind: "entry", entryId: entry.id })}
                        >
                          {title}
                          {index > 0 && <span className={styles.leftover}> · {strings.plan.leftovers}</span>}
                        </button>
                      );
                    })}
                    {draftEntries.map((entry, entryIndex) => {
                      const index = occurs(entry.slots, date, meal);
                      if (index === -1) return null;
                      const title = titleOf(entry);
                      const isBusy = replacing === entry;
                      return (
                        <span
                          key={`draft-${entryIndex}`}
                          className={
                            weekDraft?.changed?.has(entry) ? `${styles.draftEntry} ${styles.draftChanged}` : styles.draftEntry
                          }
                        >
                          <span>
                            {title}
                            <span className={styles.leftover}>
                              {" "}
                              · {index > 0 ? strings.plan.leftovers : isIdea(entry) ? strings.draft.idea : strings.draft.label}
                            </span>
                          </span>
                          {index === 0 && (
                            <>
                              <button
                                type="button"
                                className={styles.draftAction}
                                aria-label={strings.draft.replace(title)}
                                disabled={isDraftBusy}
                                onClick={() => replace(entry)}
                              >
                                {isBusy ? "…" : "↻"}
                              </button>
                              <button
                                type="button"
                                className={styles.draftAction}
                                aria-label={strings.draft.remove(title)}
                                disabled={isDraftBusy}
                                onClick={() => removeFromDraft(entry)}
                              >
                                ×
                              </button>
                            </>
                          )}
                        </span>
                      );
                    })}
                    <button
                      type="button"
                      className={styles.add}
                      aria-label={strings.plan.add(strings.meals[meal], formatWeekday(date))}
                      onClick={() => openLayer({ kind: "cell", slot: { date, meal } })}
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
