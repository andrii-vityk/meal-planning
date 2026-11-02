import type { FormEvent } from "react";
import { useId, useState, useTransition } from "react";
import { saveFramework } from "@/application/catalog";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import type { FrameworkFormState, OptionRow, SlotRow } from "./frameworkFormState";
import { emptyOption, emptySlot, fromFrameworkFormState, toFrameworkFormState } from "./frameworkFormState";
import styles from "./frameworks.module.css";

interface FrameworkFormProps {
  /** Edit this existing framework; without it the form creates a new one. */
  frameworkId?: string;
  onCancel: () => void;
  onSaved: (frameworkId: string) => void;
}

export function FrameworkForm({ frameworkId, onCancel, onSaved }: FrameworkFormProps) {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const existing = useCollection(dependencies.frameworks).items.get(frameworkId ?? "");
  const productListId = useId();

  const [form, setForm] = useState<FrameworkFormState>(() =>
    toFrameworkFormState(existing, (productId) => products.get(productId)?.name),
  );
  const [titleError, setTitleError] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const updateSlot = (key: string, patch: Partial<SlotRow>) =>
    setForm((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    }));

  const updateOption = (slot: SlotRow, key: string, patch: Partial<OptionRow>) =>
    updateSlot(slot.key, {
      options: slot.options.map((option) => {
        if (option.key !== key) return option;
        const next = { ...option, ...patch };
        if (patch.name === undefined) return next;
        // A renamed option no longer refers to the product it pointed at.
        return { key: next.key, name: next.name, textOnly: next.textOnly, kidFriendly: next.kidFriendly, ...(next.id && { id: next.id }) };
      }),
    });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = fromFrameworkFormState(form, frameworkId);
    if ("errors" in result) {
      setTitleError(true);
      return;
    }
    setTitleError(false);
    setFailed(false);
    startSaving(async () => {
      try {
        const framework = await saveFramework(dependencies, result.input);
        onSaved(framework.id);
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <form className={styles.section} onSubmit={submit} noValidate aria-labelledby="framework-form-heading">
      <h2 id="framework-form-heading" className={styles.heading}>
        {frameworkId ? strings.frameworks.editHeading : strings.frameworks.newHeading}
      </h2>

      <label className="field">
        <span className="label">{strings.frameworks.title}</span>
        <input
          id="framework-title"
          className="input"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          aria-invalid={titleError ? true : undefined}
        />
        {titleError && <span className="error">{strings.frameworks.titleRequired}</span>}
      </label>

      <label className="field">
        <span className="label">{strings.frameworks.description}</span>
        <input
          id="framework-description"
          className="input"
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
        />
      </label>

      <label className={styles.staple}>
        <input
          id="framework-kid-friendly"
          type="checkbox"
          checked={form.kidFriendly}
          onChange={(event) => setForm({ ...form, kidFriendly: event.target.checked })}
        />
        <span>{strings.frameworks.kidFriendly}</span>
      </label>

      <datalist id={productListId}>
        {[...products.values()].map((product) => (
          <option key={product.id} value={product.name} />
        ))}
      </datalist>

      <h3 className={styles.groupHeading}>{strings.frameworks.slots}</h3>
      {form.slots.map((slot, slotIndex) => (
        <fieldset key={slot.key} className={styles.slotEditor}>
          <legend className="label">
            {strings.frameworks.slotName} {slotIndex + 1}
          </legend>
          <div className={styles.slotHeader}>
            <input
              className="input"
              aria-label={`${strings.frameworks.slotName} ${slotIndex + 1}`}
              value={slot.name}
              onChange={(event) => updateSlot(slot.key, { name: event.target.value })}
            />
            <label className={styles.staple}>
              <input
                type="checkbox"
                checked={slot.required}
                onChange={(event) => updateSlot(slot.key, { required: event.target.checked })}
              />
              <span>{strings.frameworks.required}</span>
            </label>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setForm({ ...form, slots: form.slots.filter((item) => item.key !== slot.key) })}
            >
              {strings.frameworks.removeSlot}
            </button>
          </div>

          {slot.options.map((option, optionIndex) => (
            <div key={option.key} className={styles.optionRow}>
              <input
                className="input"
                list={option.textOnly ? undefined : productListId}
                aria-label={`${strings.frameworks.optionName} ${slotIndex + 1}.${optionIndex + 1}`}
                value={option.name}
                onChange={(event) => updateOption(slot, option.key, { name: event.target.value })}
              />
              <label className={styles.staple}>
                <input
                  type="checkbox"
                  checked={option.textOnly}
                  onChange={(event) => updateOption(slot, option.key, { textOnly: event.target.checked })}
                />
                <span>{strings.frameworks.textOnly}</span>
              </label>
              <label className={styles.staple}>
                <input
                  type="checkbox"
                  checked={option.kidFriendly}
                  onChange={(event) => updateOption(slot, option.key, { kidFriendly: event.target.checked })}
                />
                <span>{strings.frameworks.kidFriendly}</span>
              </label>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => updateSlot(slot.key, { options: slot.options.filter((item) => item.key !== option.key) })}
              >
                {strings.common.remove}
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => updateSlot(slot.key, { options: [...slot.options, emptyOption()] })}
            >
              {strings.frameworks.addOption}
            </button>
          </div>
        </fieldset>
      ))}
      <div>
        <button type="button" className="button button-secondary" onClick={() => setForm({ ...form, slots: [...form.slots, emptySlot()] })}>
          {strings.frameworks.addSlot}
        </button>
      </div>

      <label className="field">
        <span className="label">{strings.frameworks.notes}</span>
        <textarea
          id="framework-notes"
          className="input"
          rows={3}
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
        />
      </label>

      {failed && (
        <p className="error" role="alert">
          {strings.common.unexpectedError}
        </p>
      )}

      <div className={styles.actions}>
        <button type="submit" className="button" disabled={isSaving}>
          {isSaving ? strings.common.saving : strings.common.save}
        </button>
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={isSaving}>
          {strings.common.cancel}
        </button>
      </div>
    </form>
  );
}
