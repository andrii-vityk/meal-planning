import type { FrameworkLookup } from "@/domain/framework";
import type { Dish } from "@/domain/plan";
import type { RecipeLookup } from "@/domain/recipe";
import { strings } from "@/ui/strings/uk";

export function dishTitle(dish: Dish, recipes: RecipeLookup, frameworks: FrameworkLookup): string {
  switch (dish.kind) {
    case "recipe":
      return recipes.get(dish.recipeId)?.title ?? strings.plan.missingDish;
    case "framework":
      return frameworks.get(dish.frameworkId)?.title ?? strings.plan.missingDish;
    case "text":
      return dish.text;
  }
}
