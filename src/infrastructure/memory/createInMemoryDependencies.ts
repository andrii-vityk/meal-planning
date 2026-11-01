import type { AppDependencies } from "@/application/dependencies";
import type { Framework } from "@/domain/framework";
import type { Product } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";
import { InMemoryRepository } from "./inMemoryRepository";
import { LocalAi } from "./localAi";
import { sampleFrameworks, sampleProducts, sampleRecipes } from "./sampleData";

export interface InMemoryOptions {
  /** Start with invented example data instead of empty collections. */
  readonly withSampleData?: boolean;
}

export function createInMemoryDependencies({ withSampleData = false }: InMemoryOptions = {}): AppDependencies {
  return {
    products: new InMemoryRepository<Product>(withSampleData ? sampleProducts : []),
    recipes: new InMemoryRepository<Recipe>(withSampleData ? sampleRecipes : []),
    frameworks: new InMemoryRepository<Framework>(withSampleData ? sampleFrameworks : []),
    ai: new LocalAi(),
  };
}
