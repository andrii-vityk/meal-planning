import { useState } from "react";
import { deleteProduct, ProductInUseError } from "@/application/catalog";
import type { Nutrient, Product } from "@/domain/product";
import { nutrients, productCategories } from "@/domain/product";
import { useDependencies } from "@/ui/dependencies";
import { strings } from "@/ui/strings/uk";
import styles from "./pantry.module.css";

interface Draft {
  readonly name: string;
  readonly aliases: string;
  readonly category: Product["category"];
}

/**
 * One product. Toggles save immediately; renaming opens an inline editor
 * with its own draft state, so typing does not write on every keystroke.
 */
export function ProductRow({ product }: { product: Product }) {
  const dependencies = useDependencies();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = (patch: Partial<Product>) => dependencies.products.save({ ...product, ...patch });

  const toggleNutrient = (nutrient: Nutrient) =>
    save({ nutrition: { ...product.nutrition, [nutrient]: !product.nutrition[nutrient] } });

  const remove = async () => {
    try {
      await deleteProduct(dependencies, product.id);
    } catch (error) {
      setMessage(
        error instanceof ProductInUseError
          ? strings.products.inUse(error.recipeCount, error.frameworkCount)
          : strings.common.unexpectedError,
      );
    }
  };

  if (draft) {
    return (
      <li className={styles.item}>
        <form
          className={styles.editor}
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.name.trim() === "") return;
            void save({
              name: draft.name.trim(),
              aliases: draft.aliases.split(",").map((alias) => alias.trim()).filter(Boolean),
              category: draft.category,
            });
            setDraft(null);
          }}
        >
          <label className="field">
            <span className="label">{strings.products.name}</span>
            <input
              className="input"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">{strings.products.aliases}</span>
            <input
              className="input"
              value={draft.aliases}
              onChange={(event) => setDraft({ ...draft, aliases: event.target.value })}
            />
          </label>
          <label className="field">
            <span className="label">{strings.products.category}</span>
            <select
              className="input"
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: productCategories.find((c) => c === event.target.value) ?? "other" })
              }
            >
              {productCategories.map((category) => (
                <option key={category} value={category}>
                  {strings.categories[category]}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button type="submit" className="button">
              {strings.common.save}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setDraft(null)}>
              {strings.common.cancel}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={styles.item}>
      <div className={styles.itemMain}>
        <span className={styles.itemName}>{product.name}</span>
        {product.aliases.length > 0 && <span className="hint">{product.aliases.join(", ")}</span>}
      </div>
      <div className={styles.controls}>
        {nutrients.map((nutrient) => (
          <button
            key={nutrient}
            type="button"
            className={styles.toggle}
            aria-pressed={product.nutrition[nutrient]}
            aria-label={`${strings.products.nutrition[nutrient]}: ${product.name}`}
            onClick={() => void toggleNutrient(nutrient)}
          >
            {strings.products.nutrition[nutrient]}
          </button>
        ))}
        <label className={styles.staple}>
          <input
            type="checkbox"
            checked={product.isStaple}
            aria-label={`${strings.products.staple}: ${product.name}`}
            onChange={(event) => void save({ isStaple: event.target.checked })}
          />
          <span>{strings.products.staple}</span>
        </label>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            setMessage(null);
            setDraft({ name: product.name, aliases: product.aliases.join(", "), category: product.category });
          }}
        >
          {strings.common.edit}
        </button>
        <button type="button" className="button button-danger" onClick={() => void remove()}>
          {strings.common.delete}
        </button>
      </div>
      {message && (
        <p className="error" role="alert">
          {message}
        </p>
      )}
    </li>
  );
}
