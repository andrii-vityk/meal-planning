import type { Quantity } from "./quantity";
import { scaleQuantity } from "./quantity";

export interface RecipeIngredient {
  readonly productId: string;
  /** Absent for "to taste" ingredients. */
  readonly quantity?: Quantity;
  /** Free-text detail, e.g. "or chicken thighs". */
  readonly note?: string;
}

export interface Recipe {
  readonly id: string;
  readonly title: string;
  readonly servings: number;
  readonly ingredients: readonly RecipeIngredient[];
  readonly steps: readonly string[];
  readonly tags: readonly string[];
  readonly kidFriendly: boolean;
  readonly timeMinutes?: number;
  readonly sourceUrl?: string;
  readonly photoAssetId?: string;
  readonly notes?: string;
}

export type RecipeLookup = ReadonlyMap<string, Recipe>;

/** Ingredients for a different number of servings than the recipe states. */
export function scaleIngredients(recipe: Recipe, servings: number): RecipeIngredient[] {
  if (!(servings > 0)) {
    throw new RangeError(`Servings must be positive, got ${servings}`);
  }
  const factor = servings / recipe.servings;
  return recipe.ingredients.map((ingredient) =>
    ingredient.quantity
      ? { ...ingredient, quantity: scaleQuantity(ingredient.quantity, factor) }
      : ingredient,
  );
}
