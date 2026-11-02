import { useState } from "react";
import { scaleIngredients } from "@/domain/recipe";
import { useDependencies } from "@/ui/dependencies";
import { formatQuantity } from "@/ui/format";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { DishPhoto } from "./DishPhoto";
import styles from "./recipes.module.css";

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
  onEdit: () => void;
  onAddToPlan: () => void;
}

export function RecipeDetail({ recipeId, onBack, onEdit, onAddToPlan }: RecipeDetailProps) {
  const { recipes, products } = useDependencies();
  const recipe = useCollection(recipes).items.get(recipeId);
  const productItems = useCollection(products).items;
  // null = "as the recipe says"; a number once the user changes it.
  const [servingsOverride, setServingsOverride] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!recipe) {
    // Another client may have deleted it while it was open.
    return (
      <section className={styles.section}>
        <p className="hint">{strings.recipes.notFound}</p>
        <div>
          <button type="button" className="button button-secondary" onClick={onBack}>
            {strings.common.back}
          </button>
        </div>
      </section>
    );
  }

  const servings = servingsOverride ?? recipe.servings;
  const ingredients = scaleIngredients(recipe, servings);

  const remove = async () => {
    await recipes.remove(recipe.id);
    onBack();
  };

  return (
    <article className={styles.section} aria-labelledby="recipe-title">
      <div>
        <button type="button" className="button button-secondary" onClick={onBack}>
          {strings.common.back}
        </button>
      </div>

      <header className={styles.detailHeader}>
        <DishPhoto title={recipe.title} photoId={recipe.photoAssetId} large />
        <div className={styles.detailTitle}>
          <h2 id="recipe-title" className={styles.heading}>
            {recipe.title}
          </h2>
          <span className={styles.meta}>
            {recipe.timeMinutes !== undefined && <span>{strings.common.minutes(recipe.timeMinutes)}</span>}
            {recipe.kidFriendly && <span className={styles.chip}>{strings.recipes.kidFriendly}</span>}
            {recipe.tags.map((tag) => (
              <span key={tag} className={styles.chip}>
                {tag}
              </span>
            ))}
          </span>
        </div>
      </header>

      <section className={styles.block} aria-labelledby="ingredients-heading">
        <div className={styles.toolbar}>
          <h3 id="ingredients-heading" className={styles.subheading}>
            {strings.recipes.ingredients}
          </h3>
          <label className={styles.servings}>
            <span className="label">{strings.recipes.servings}</span>
            <input
              id="recipe-servings"
              type="number"
              min={1}
              className={`input ${styles.servingsInput}`}
              value={servings}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value > 0) setServingsOverride(value);
              }}
            />
          </label>
        </div>
        <ul className={styles.ingredients}>
          {ingredients.map((ingredient, index) => (
            <li key={`${ingredient.productId}-${index}`}>
              <span>{productItems.get(ingredient.productId)?.name ?? strings.recipes.unknownProduct}</span>
              <span className={styles.amount}>
                {ingredient.quantity ? formatQuantity(ingredient.quantity) : strings.recipes.toTaste}
                {ingredient.note && ` · ${ingredient.note}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps.length > 0 && (
        <section className={styles.block} aria-labelledby="steps-heading">
          <h3 id="steps-heading" className={styles.subheading}>
            {strings.recipes.steps}
          </h3>
          <ol className={styles.steps}>
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className={styles.block}>
          <h3 className={styles.subheading}>{strings.recipes.notes}</h3>
          <p className={styles.notes}>{recipe.notes}</p>
        </section>
      )}

      {recipe.sourceUrl && (
        <p>
          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
            {strings.recipes.source}
          </a>
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className="button" onClick={onAddToPlan}>
          {strings.plan.addToPlan}
        </button>
        <button type="button" className="button button-secondary" onClick={onEdit}>
          {strings.common.edit}
        </button>
        {confirmingDelete ? (
          <>
            <span className="hint">{strings.recipes.deleteQuestion}</span>
            <button type="button" className="button button-danger" onClick={() => void remove()}>
              {strings.common.confirmDelete}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirmingDelete(false)}>
              {strings.common.cancel}
            </button>
          </>
        ) : (
          <button type="button" className="button button-danger" onClick={() => setConfirmingDelete(true)}>
            {strings.common.delete}
          </button>
        )}
      </div>
    </article>
  );
}
