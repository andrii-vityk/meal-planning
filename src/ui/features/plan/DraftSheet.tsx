import { useEffect, useRef, useState, useTransition } from "react";
import type { WeekDraftOptions } from "@/application/weekDraft";
import { draftWeek } from "@/application/weekDraft";
import type { IsoDate } from "@/domain/calendar";
import type { MealSlot } from "@/domain/plan";
import type { DraftEntry } from "@/domain/weekDraft";
import { defaultDraftSlots, openSlots, slotKey } from "@/domain/weekDraft";
import { aiErrorMessage, isCancellation } from "@/ui/aiErrors";
import { Sheet } from "@/ui/components/Sheet";
import { todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { strings } from "@/ui/strings/uk";
import { SlotGrid } from "./PlanEntryPanel";
import styles from "./planPanel.module.css";

interface DraftSheetProps {
  weekStart: IsoDate;
  /** Slots already planned: shown, but not offered for the draft. */
  occupied: readonly MealSlot[];
  onClose: () => void;
  onDrafted: (entries: DraftEntry[], options: WeekDraftOptions) => void;
}

/** What to fill and any wishes; then one AI request for the whole week. */
export function DraftSheet({ weekStart, occupied, onClose, onDrafted }: DraftSheetProps) {
  const dependencies = useDependencies();
  const [selected, setSelected] = useState<readonly MealSlot[]>(() =>
    defaultDraftSlots(weekStart, occupied, todayIso()),
  );
  const [wishes, setWishes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDrafting, startDrafting] = useTransition();
  const controller = useRef<AbortController | null>(null);

  // Closing the sheet (or leaving the section) cancels a request in flight.
  useEffect(() => () => controller.current?.abort(), []);

  const taken = new Set(occupied.map(slotKey));
  const chosen = new Set(selected.map(slotKey));

  const toggle = (slot: MealSlot) =>
    setSelected((current) =>
      chosen.has(slotKey(slot)) ? current.filter((item) => slotKey(item) !== slotKey(slot)) : [...current, slot],
    );

  const generate = () => {
    if (selected.length === 0) {
      setError(strings.draft.nothingOpen);
      return;
    }
    setError(null);
    controller.current?.abort();
    controller.current = new AbortController();
    const { signal } = controller.current;
    // Everything open that the user unticked is excluded.
    const excluded = openSlots(weekStart, occupied).filter((slot) => !chosen.has(slotKey(slot)));
    const options: WeekDraftOptions = { weekStart, excluded, wishes };
    startDrafting(async () => {
      try {
        const entries = await draftWeek(dependencies, options, signal);
        if (entries.length === 0) setError(strings.draft.empty);
        else onDrafted(entries, options);
      } catch (caught) {
        if (!isCancellation(caught)) setError(aiErrorMessage(caught));
      }
    });
  };

  return (
    <Sheet labelledBy="draft-heading" onClose={onClose}>
      <div className={styles.panel}>
        <h2 id="draft-heading" className={styles.heading}>
          {strings.draft.heading}
        </h2>
        <p className="hint">{strings.draft.intro}</p>

        <fieldset className={styles.when} disabled={isDrafting}>
          <legend className="label">{strings.draft.slots}</legend>
          <p className="hint">{strings.draft.slotsHint}</p>
          <SlotGrid weekStart={weekStart} selected={selected} onToggle={toggle} disabled={taken} />
        </fieldset>

        <label className="field">
          <span className="label">{strings.draft.wishes}</span>
          <textarea
            id="draft-wishes"
            className="input"
            rows={2}
            placeholder={strings.draft.wishesPlaceholder}
            value={wishes}
            disabled={isDrafting}
            onChange={(event) => setWishes(event.target.value)}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className="button" onClick={generate} disabled={isDrafting}>
            {isDrafting ? strings.draft.generating : strings.draft.generate}
          </button>
          <button type="button" className="button button-secondary" onClick={onClose}>
            {strings.common.cancel}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
