import type { Framework, SlotOption } from "./framework";
import type { ProductLookup } from "./product";
import type { Recipe } from "./recipe";

export type DishMatch =
  | {
      readonly kind: "recipe";
      readonly recipe: Recipe;
      readonly missingProductIds: readonly string[];
    }
  | {
      readonly kind: "framework";
      readonly framework: Framework;
      /** Suggested option id per slot id, for slots that can be filled. */
      readonly choices: Readonly<Record<string, string>>;
      readonly missingSlotIds: readonly string[];
    };

export interface MatchInput {
  /** Products the user says they have right now. */
  readonly available: ReadonlySet<string>;
  readonly products: ProductLookup;
  readonly recipes: Iterable<Recipe>;
  readonly frameworks: Iterable<Framework>;
}

export interface MatchOptions {
  /** Dishes missing more than this many products or slots are dropped. */
  readonly maxMissing?: number;
  readonly kidFriendlyOnly?: boolean;
}

export function missingCount(match: DishMatch): number {
  return match.kind === "recipe" ? match.missingProductIds.length : match.missingSlotIds.length;
}

function titleOf(match: DishMatch): string {
  return match.kind === "recipe" ? match.recipe.title : match.framework.title;
}

/**
 * Dishes that can be cooked from what is available plus staples, ranked by
 * how little is missing. Substitutions are not considered here: they need
 * judgement and are suggested by the AI layer on top of this list.
 */
export function matchDishes(input: MatchInput, options: MatchOptions = {}): DishMatch[] {
  const { maxMissing = 2, kidFriendlyOnly = false } = options;
  const has = (productId: string) =>
    input.available.has(productId) || input.products.get(productId)?.isStaple === true;

  const matches: DishMatch[] = [];

  for (const recipe of input.recipes) {
    if (kidFriendlyOnly && !recipe.kidFriendly) continue;
    const needed = new Set(recipe.ingredients.map((ingredient) => ingredient.productId));
    const missingProductIds = [...needed].filter((productId) => !has(productId));
    matches.push({ kind: "recipe", recipe, missingProductIds });
  }

  for (const framework of input.frameworks) {
    if (kidFriendlyOnly && !framework.kidFriendly) continue;
    const choices: Record<string, string> = {};
    const missingSlotIds: string[] = [];
    for (const slot of framework.slots) {
      const usable = (option: SlotOption) =>
        option.kind === "product" && has(option.productId) && (!kidFriendlyOnly || option.kidFriendly);
      const option = slot.options.find(usable);
      if (option) choices[slot.id] = option.id;
      else if (slot.required) missingSlotIds.push(slot.id);
    }
    matches.push({ kind: "framework", framework, choices, missingSlotIds });
  }

  return matches
    .filter((match) => missingCount(match) <= maxMissing)
    .toSorted(
      (a, b) => missingCount(a) - missingCount(b) || titleOf(a).localeCompare(titleOf(b), "uk"),
    );
}
