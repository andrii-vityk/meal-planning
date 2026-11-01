import type { FrameworkLookup } from "./framework";
import type { Dish } from "./plan";
import type { Quantity } from "./quantity";
import type { RecipeLookup } from "./recipe";
import { scaleIngredients } from "./recipe";

export interface IngredientNeed {
  readonly productId: string;
  /** Absent when the amount is unknown: "to taste", or a framework option. */
  readonly quantity?: Quantity;
}

export interface DishSources {
  readonly recipes: RecipeLookup;
  readonly frameworks: FrameworkLookup;
}

/**
 * Products a dish needs for the given number of servings.
 *
 * A dish that refers to a recipe or framework that no longer exists needs
 * nothing: plans may outlive the recipes they mention.
 */
export function dishIngredients(dish: Dish, servings: number, sources: DishSources): IngredientNeed[] {
  switch (dish.kind) {
    case "recipe": {
      const recipe = sources.recipes.get(dish.recipeId);
      if (!recipe) return [];
      return scaleIngredients(recipe, servings).map(({ productId, quantity }) =>
        quantity ? { productId, quantity } : { productId },
      );
    }
    case "framework": {
      const framework = sources.frameworks.get(dish.frameworkId);
      if (!framework) return [];
      return framework.slots.flatMap((slot) => {
        const option = slot.options.find((candidate) => candidate.id === dish.choices[slot.id]);
        return option?.kind === "product" ? [{ productId: option.productId }] : [];
      });
    }
    case "text":
      return [];
  }
}
