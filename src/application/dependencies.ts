import type { AiService } from "@/application/ports/ai";
import type { Repository } from "@/application/ports/repository";
import type { Framework } from "@/domain/framework";
import type { Product } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";
import type { ManualShoppingItem, ShoppingCheck, WeekPlanEntry } from "@/domain/weekPlanning";

/**
 * Everything the app needs from the outside world. The composition root
 * builds one implementation (platform or in-memory) and hands it to the UI.
 */
export interface AppDependencies {
  readonly products: Repository<Product>;
  readonly recipes: Repository<Recipe>;
  readonly frameworks: Repository<Framework>;
  readonly planEntries: Repository<WeekPlanEntry>;
  readonly shoppingItems: Repository<ManualShoppingItem>;
  readonly shoppingChecks: Repository<ShoppingCheck>;
  readonly ai: AiService;
}
