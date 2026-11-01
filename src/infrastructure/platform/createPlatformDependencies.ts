import type { AppDependencies } from "@/application/dependencies";
import type { ManualShoppingItem, ShoppingCheck, WeekPlanEntry } from "@/domain/weekPlanning";
import {
  parseFramework,
  parseProduct,
  parseRecipe,
  serializeFramework,
  serializeProduct,
  serializeRecipe,
} from "@/infrastructure/serialization/entities";
import {
  parsePlanEntry,
  parseShoppingCheck,
  parseShoppingItem,
  serializeWeekRecord,
} from "@/infrastructure/serialization/weekRecords";
import { PlatformAi } from "./platformAi";
import { PlatformRepository } from "./platformRepository";
import type { PlatformCapabilities } from "./runtime";

/** Collection names in the host database. Part of the stored data contract. */
export const collections = {
  products: "products",
  recipes: "recipes",
  frameworks: "frameworks",
  planEntries: "planEntries",
  shoppingItems: "shoppingItems",
  shoppingChecks: "shoppingChecks",
} as const;

export function createPlatformDependencies(platform: PlatformCapabilities): AppDependencies {
  return {
    products: new PlatformRepository(platform.db, collections.products, {
      parse: parseProduct,
      serialize: serializeProduct,
    }),
    recipes: new PlatformRepository(platform.db, collections.recipes, {
      parse: parseRecipe,
      serialize: serializeRecipe,
    }),
    frameworks: new PlatformRepository(platform.db, collections.frameworks, {
      parse: parseFramework,
      serialize: serializeFramework,
    }),
    planEntries: new PlatformRepository<WeekPlanEntry>(platform.db, collections.planEntries, {
      parse: parsePlanEntry,
      serialize: serializeWeekRecord,
    }),
    shoppingItems: new PlatformRepository<ManualShoppingItem>(platform.db, collections.shoppingItems, {
      parse: parseShoppingItem,
      serialize: serializeWeekRecord,
    }),
    shoppingChecks: new PlatformRepository<ShoppingCheck>(platform.db, collections.shoppingChecks, {
      parse: parseShoppingCheck,
      serialize: serializeWeekRecord,
    }),
    ai: new PlatformAi(platform.sample),
  };
}
