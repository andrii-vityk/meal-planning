import type { IsoDate } from "./calendar";
import { weekDates } from "./calendar";
import type { DishSources } from "./dishIngredients";
import { dishIngredients } from "./dishIngredients";
import type { WeekPlan } from "./plan";
import type { Nutrient, NutritionFlags, ProductLookup } from "./product";
import { nutrients } from "./product";

export interface DayCoverage {
  readonly date: IsoDate;
  readonly nutrients: NutritionFlags;
}

export interface CoverageSources extends DishSources {
  readonly products: ProductLookup;
}

const none = (): Record<Nutrient, boolean> => ({ protein: false, fiber: false, healthyFat: false });

/**
 * For each day of the week: is there at least one source of protein, fiber
 * and healthy fat among the dishes eaten that day?
 *
 * Unlike shopping, leftovers count on every day they are eaten.
 */
export function nutritionCoverage(plan: WeekPlan, sources: CoverageSources): DayCoverage[] {
  const days = new Map(weekDates(plan.weekStart).map((date) => [date, none()]));

  for (const entry of plan.entries) {
    const dishFlags = none();
    for (const need of dishIngredients(entry.dish, entry.servings, sources)) {
      const product = sources.products.get(need.productId);
      if (!product) continue;
      for (const nutrient of nutrients) {
        dishFlags[nutrient] ||= product.nutrition[nutrient];
      }
    }

    for (const slot of entry.slots) {
      const day = days.get(slot.date);
      if (!day) continue; // slot outside this week
      for (const nutrient of nutrients) {
        day[nutrient] ||= dishFlags[nutrient];
      }
    }
  }

  return [...days].map(([date, flags]) => ({ date, nutrients: flags }));
}
