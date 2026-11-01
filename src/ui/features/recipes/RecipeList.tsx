import { useState } from "react";
import type { Recipe } from "@/domain/recipe";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { DishPhoto } from "./DishPhoto";
import styles from "./recipes.module.css";

interface RecipeListProps {
  onOpen: (recipeId: string) => void;
  onCreate: () => void;
  onImport: () => void;
}

function matches(recipe: Recipe, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("uk");
  if (needle === "") return true;
  return [recipe.title, ...recipe.tags].some((text) => text.toLocaleLowerCase("uk").includes(needle));
}

export function RecipeList({ onOpen, onCreate, onImport }: RecipeListProps) {
  const { recipes } = useDependencies();
  const snapshot = useCollection(recipes);
  const [query, setQuery] = useState("");

  // Derived during render, not stored: the filtered list is always in
  // sync with both the query and the collection.
  const visible = [...snapshot.items.values()]
    .filter((recipe) => matches(recipe, query))
    .toSorted((a, b) => a.title.localeCompare(b.title, "uk"));

  return (
    <section className={styles.section} aria-labelledby="recipes-heading">
      <div className={styles.toolbar}>
        <h2 id="recipes-heading" className={styles.heading}>
          {strings.recipes.heading}
        </h2>
        <div className={styles.actions}>
          <button type="button" className="button button-secondary" onClick={onImport}>
            {strings.recipes.import}
          </button>
          <button type="button" className="button" onClick={onCreate}>
            {strings.recipes.create}
          </button>
        </div>
      </div>

      {snapshot.items.size > 0 && (
        <input
          id="recipe-search"
          type="search"
          className="input"
          placeholder={strings.recipes.search}
          aria-label={strings.recipes.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}

      {snapshot.status === "loading" && snapshot.items.size === 0 ? (
        <p className="hint">{strings.data.loading}</p>
      ) : snapshot.items.size === 0 ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyHeading}>{strings.recipes.emptyHeading}</h3>
          <p className="hint">{strings.recipes.emptyBody}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">{strings.recipes.noMatches}</p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((recipe) => (
            <li key={recipe.id}>
              <button type="button" className={styles.card} onClick={() => onOpen(recipe.id)}>
                <DishPhoto title={recipe.title} photoId={recipe.photoAssetId} />
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>{recipe.title}</span>
                  <span className={styles.meta}>
                    {recipe.timeMinutes !== undefined && <span>{strings.common.minutes(recipe.timeMinutes)}</span>}
                    {recipe.kidFriendly && <span className={styles.chip}>{strings.recipes.kidFriendly}</span>}
                    {recipe.tags.map((tag) => (
                      <span key={tag} className={styles.chip}>
                        {tag}
                      </span>
                    ))}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
