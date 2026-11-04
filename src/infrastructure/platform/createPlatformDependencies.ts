import type { AppDependencies } from "@/application/dependencies";
import {
  parseFramework,
  parseProduct,
  parseRecipe,
  serializeFramework,
  serializeProduct,
  serializeRecipe,
} from "@/infrastructure/serialization/entities";
import { PlatformAi } from "./platformAi";
import { PlatformRepository } from "./platformRepository";
import type { PlatformCapabilities } from "./runtime";

/** Collection names in the host database. Part of the stored data contract. */
export const collections = {
  products: "products",
  recipes: "recipes",
  frameworks: "frameworks",
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
    ai: new PlatformAi(platform.sample),
  };
}
