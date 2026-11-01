import type { FormEvent } from "react";
import { useId, useState, useTransition } from "react";
import type { RecipeInput } from "@/application/recipes";
import { saveRecipe } from "@/application/recipes";
import { units } from "@/domain/quantity";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import type { FormErrors, IngredientRow, RecipeFormState } from "./recipeFormState";
import { emptyRow, fromFormState, recipeToInput, toFormState } from "./recipeFormState";
import styles from "./recipes.module.css";

interface RecipeFormProps {
  /** Edit this existing recipe. */
  recipeId?: string;
  /** Or start a new recipe from these values (e.g. an AI draft). */
  initial?: RecipeInput;
  onCancel: () => void;
  onSaved: (recipeId: string) => void;
}

export function RecipeForm({ recipeId, initial, onCancel, onSaved }: RecipeFormProps) {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const existing = useCollection(dependencies.recipes).items.get(recipeId ?? "");
  const productListId = useId();

  // The initializer runs once: later changes to the stored recipe do not
  // overwrite what the user is typing.
  const [form, setForm] = useState<RecipeFormState>(() =>
    toFormState(existing ? recipeToInput(existing) : initial, (productId) => products.get(productId)?.name),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveError, setSaveError] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const update = (patch: Partial<RecipeFormState>) => setForm((current) => ({ ...current, ...patch }));

  const updateRow = (key: string, patch: Partial<IngredientRow>) =>
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if (patch.productName === undefined) return next;
        // A renamed ingredient no longer refers to the product it pointed at.
        return { key: next.key, productName: next.productName, amount: next.amount, unit: next.unit, note: next.note };
      }),
    }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = fromFormState(form, recipeId, existing?.photoAssetId);
    if ("errors" in result) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSaveError(false);
    startSaving(async () => {
      try {
        const recipe = await saveRecipe(dependencies, result.input);
        onSaved(recipe.id);
      } catch {
        setSaveError(true);
      }
    });
  };

  return (
    <form className={styles.section} onSubmit={submit} noValidate aria-labelledby="recipe-form-heading">
      <h2 id="recipe-form-heading" className={styles.heading}>
        {recipeId ? strings.recipeForm.editHeading : strings.recipeForm.newHeading}
      </h2>

      <label className="field">
        <span className="label">{strings.recipeForm.title}</span>
        <input
          id="recipe-title-input"
          className="input"
          value={form.title}
          onChange={(event) => update({ title: event.target.value })}
          aria-invalid={errors.title ? true : undefined}
        />
        {errors.title && <span className="error">{strings.recipeForm.titleRequired}</span>}
      </label>

      <div className={styles.row}>
        <label className="field">
          <span className="label">{strings.recipeForm.servings}</span>
          <input
            id="recipe-servings-input"
            className="input"
            inputMode="numeric"
            value={form.servings}
            onChange={(event) => update({ servings: event.target.value })}
            aria-invalid={errors.servings ? true : undefined}
          />
          {errors.servings && <span className="error">{strings.recipeForm.servingsInvalid}</span>}
        </label>
        <label className="field">
          <span className="label">{strings.recipeForm.time}</span>
          <input
            id="recipe-time-input"
            className="input"
            inputMode="numeric"
            value={form.timeMinutes}
            onChange={(event) => update({ timeMinutes: event.target.value })}
          />
        </label>
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.subheading}>{strings.recipeForm.ingredients}</legend>
        <datalist id={productListId}>
          {[...products.values()].map((product) => (
            <option key={product.id} value={product.name} />
          ))}
        </datalist>
        {form.ingredients.map((row, index) => (
          <div key={row.key} className={styles.ingredientRow}>
            <input
              className="input"
              list={productListId}
              placeholder={strings.recipeForm.productName}
              aria-label={`${strings.recipeForm.productName} ${index + 1}`}
              value={row.productName}
              onChange={(event) => updateRow(row.key, { productName: event.target.value })}
            />
            <input
              className="input"
              inputMode="decimal"
              placeholder={strings.recipeForm.amount}
              aria-label={`${strings.recipeForm.amount} ${index + 1}`}
              value={row.amount}
              onChange={(event) => updateRow(row.key, { amount: event.target.value })}
            />
            <select
              className="input"
              aria-label={`${strings.recipeForm.unit} ${index + 1}`}
              value={row.unit}
              onChange={(event) => updateRow(row.key, { unit: units.find((unit) => unit === event.target.value) ?? "" })}
            >
              <option value="">{strings.recipeForm.noUnit}</option>
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {strings.units[unit]}
                </option>
              ))}
            </select>
            <input
              className="input"
              placeholder={strings.recipeForm.note}
              aria-label={`${strings.recipeForm.note} ${index + 1}`}
              value={row.note}
              onChange={(event) => updateRow(row.key, { note: event.target.value })}
            />
            <button
              type="button"
              className="button button-secondary"
              onClick={() => update({ ingredients: form.ingredients.filter((item) => item.key !== row.key) })}
            >
              {strings.common.remove}
            </button>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => update({ ingredients: [...form.ingredients, emptyRow()] })}
          >
            {strings.recipeForm.addIngredient}
          </button>
        </div>
        <p className="hint">{strings.recipeForm.newProductsHint}</p>
      </fieldset>

      <label className="field">
        <span className="label">{strings.recipeForm.steps}</span>
        <textarea
          id="recipe-steps-input"
          className="input"
          rows={6}
          value={form.steps}
          onChange={(event) => update({ steps: event.target.value })}
        />
      </label>

      <label className="field">
        <span className="label">{strings.recipeForm.tags}</span>
        <input id="recipe-tags-input" className="input" value={form.tags} onChange={(event) => update({ tags: event.target.value })} />
      </label>

      <label className={styles.checkbox}>
        <input
          id="recipe-kid-friendly-input"
          type="checkbox"
          checked={form.kidFriendly}
          onChange={(event) => update({ kidFriendly: event.target.checked })}
        />
        <span>{strings.recipeForm.kidFriendly}</span>
      </label>

      <label className="field">
        <span className="label">{strings.recipeForm.sourceUrl}</span>
        <input
          id="recipe-source-input"
          className="input"
          type="url"
          value={form.sourceUrl}
          onChange={(event) => update({ sourceUrl: event.target.value })}
        />
      </label>

      <label className="field">
        <span className="label">{strings.recipeForm.notes}</span>
        <textarea id="recipe-notes-input" className="input" rows={3} value={form.notes} onChange={(event) => update({ notes: event.target.value })} />
      </label>

      {saveError && <p className="error" role="alert">{strings.common.unexpectedError}</p>}

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
