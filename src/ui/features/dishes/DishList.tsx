import { useState } from "react";
import type { Framework } from "@/domain/framework";
import type { Recipe } from "@/domain/recipe";
import { DishPhoto } from "@/ui/features/recipes/DishPhoto";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./dishes.module.css";

export type DishKind = "recipe" | "framework";

/** Recipes and frameworks side by side: one list, one shape per item. */
type Dish =
  | { readonly kind: "recipe"; readonly recipe: Recipe }
  | { readonly kind: "framework"; readonly framework: Framework };

type Filter = "all" | "recipes" | "frameworks";
const filters: readonly Filter[] = ["all", "recipes", "frameworks"];

interface DishListProps {
  onOpen: (kind: DishKind, id: string) => void;
  onCreateRecipe: () => void;
  onCreateFramework: () => void;
  onImport: () => void;
}

const titleOf = (dish: Dish) => (dish.kind === "recipe" ? dish.recipe.title : dish.framework.title);
const idOf = (dish: Dish) => (dish.kind === "recipe" ? dish.recipe.id : dish.framework.id);
const isKidFriendly = (dish: Dish) => (dish.kind === "recipe" ? dish.recipe.kidFriendly : dish.framework.kidFriendly);

function searchableText(dish: Dish): readonly string[] {
  if (dish.kind === "recipe") return [dish.recipe.title, ...dish.recipe.tags];
  return [dish.framework.title, dish.framework.description ?? "", ...dish.framework.slots.map((slot) => slot.name)];
}

function matchesQuery(dish: Dish, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("uk");
  return needle === "" || searchableText(dish).some((text) => text.toLocaleLowerCase("uk").includes(needle));
}

function matchesFilter(dish: Dish, filter: Filter): boolean {
  return filter === "all" || (filter === "recipes" ? dish.kind === "recipe" : dish.kind === "framework");
}

export function DishList({ onOpen, onCreateRecipe, onCreateFramework, onImport }: DishListProps) {
  const dependencies = useDependencies();
  const recipes = useCollection(dependencies.recipes);
  const frameworks = useCollection(dependencies.frameworks);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const all: readonly Dish[] = [
    ...[...recipes.items.values()].map((recipe): Dish => ({ kind: "recipe", recipe })),
    ...[...frameworks.items.values()].map((framework): Dish => ({ kind: "framework", framework })),
  ];
  const visible = all
    .filter((dish) => matchesFilter(dish, filter) && matchesQuery(dish, query) && (!kidFriendlyOnly || isKidFriendly(dish)))
    .toSorted((a, b) => titleOf(a).localeCompare(titleOf(b), "uk"));

  const isLoading = (recipes.status === "loading" || frameworks.status === "loading") && all.length === 0;

  const add = (action: () => void) => {
    setIsAddOpen(false);
    action();
  };

  return (
    <section className={styles.section} aria-labelledby="dishes-heading">
      <div className={styles.toolbar}>
        <h2 id="dishes-heading" className={styles.heading}>
          {strings.dishes.heading}
        </h2>
        <div className={styles.addMenu}>
          <button
            type="button"
            className="button"
            aria-expanded={isAddOpen}
            aria-controls="dishes-add-options"
            onClick={() => setIsAddOpen(!isAddOpen)}
          >
            {strings.dishes.add}
          </button>
          {isAddOpen && (
            <ul id="dishes-add-options" className={styles.addOptions}>
              <li>
                <button type="button" className={styles.addOption} onClick={() => add(onCreateRecipe)}>
                  {strings.dishes.addRecipe}
                </button>
              </li>
              <li>
                <button type="button" className={styles.addOption} onClick={() => add(onCreateFramework)}>
                  {strings.dishes.addFramework}
                </button>
              </li>
              <li>
                <button type="button" className={styles.addOption} onClick={() => add(onImport)}>
                  {strings.dishes.addImport}
                </button>
              </li>
            </ul>
          )}
        </div>
      </div>

      {all.length > 0 && (
        <>
          <input
            id="dish-search"
            type="search"
            className="input"
            placeholder={strings.dishes.search}
            aria-label={strings.dishes.search}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className={styles.filters}>
            <div role="group" aria-label={strings.dishes.filterLabel} className={styles.segmented}>
              {filters.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={styles.segment}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {strings.dishes.filters[value]}
                </button>
              ))}
            </div>
            <label className={styles.inline}>
              <input
                id="dish-kid-friendly"
                type="checkbox"
                checked={kidFriendlyOnly}
                onChange={(event) => setKidFriendlyOnly(event.target.checked)}
              />
              <span>{strings.dishes.kidFriendlyOnly}</span>
            </label>
          </div>
        </>
      )}

      {isLoading ? (
        <p className="hint">{strings.data.loading}</p>
      ) : all.length === 0 ? (
        <div className={styles.empty}>
          <h3 className={styles.emptyHeading}>{strings.dishes.emptyHeading}</h3>
          <p className="hint">{strings.dishes.emptyBody}</p>
        </div>
      ) : visible.length === 0 ? (
        <p className="hint">{strings.dishes.noMatches}</p>
      ) : (
        <ul className={styles.grid}>
          {visible.map((dish) => (
            <li key={`${dish.kind}-${idOf(dish)}`}>
              <button type="button" className={styles.card} onClick={() => onOpen(dish.kind, idOf(dish))}>
                <DishPhoto
                  title={titleOf(dish)}
                  photoId={dish.kind === "recipe" ? dish.recipe.photoAssetId : undefined}
                />
                <span className={styles.cardBody}>
                  <span className={styles.kind}>{strings.dishes.kind[dish.kind]}</span>
                  <span className={styles.cardTitle}>{titleOf(dish)}</span>
                  <span className={styles.meta}>
                    {dish.kind === "recipe" && dish.recipe.timeMinutes !== undefined && (
                      <span>{strings.common.minutes(dish.recipe.timeMinutes)}</span>
                    )}
                    {dish.kind === "framework" && <span>{strings.dishes.partsCount(dish.framework.slots.length)}</span>}
                    {isKidFriendly(dish) && <span className={styles.chip}>{strings.recipes.kidFriendly}</span>}
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
