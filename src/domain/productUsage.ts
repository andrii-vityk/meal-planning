import type { Framework } from "./framework";
import type { Recipe } from "./recipe";

export interface ProductUsage {
  readonly recipeIds: readonly string[];
  readonly frameworkIds: readonly string[];
}

/** Recipes and frameworks that refer to a product. */
export function productUsage(productId: string, recipes: Iterable<Recipe>, frameworks: Iterable<Framework>): ProductUsage {
  return {
    recipeIds: [...recipes]
      .filter((recipe) => recipe.ingredients.some((ingredient) => ingredient.productId === productId))
      .map((recipe) => recipe.id),
    frameworkIds: [...frameworks]
      .filter((framework) =>
        framework.slots.some((slot) =>
          slot.options.some((option) => option.kind === "product" && option.productId === productId),
        ),
      )
      .map((framework) => framework.id),
  };
}

export const isUsed = (usage: ProductUsage) => usage.recipeIds.length > 0 || usage.frameworkIds.length > 0;
