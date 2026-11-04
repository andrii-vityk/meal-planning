import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { AiLogEntry } from "@/application/ports/aiLog";
import type { Framework } from "@/domain/framework";
import type { Product } from "@/domain/product";
import type { Recipe } from "@/domain/recipe";
import type { ManualShoppingItem, ShoppingCheck, WeekPlanEntry } from "@/domain/weekPlanning";
import { LoggingAi } from "@/infrastructure/ai/loggingAi";
import { JsonBackupCodec } from "@/infrastructure/serialization/backupCodec";
import { InMemoryRepository } from "./inMemoryRepository";
import { LocalAi } from "./localAi";
import { BrowserFileSaver, MemoryPhotoStorage } from "./memoryFiles";
import { sampleFrameworks, sampleProducts, sampleRecipes } from "./sampleData";

export interface InMemoryOptions {
  /** Start with invented example data instead of empty collections. */
  readonly withSampleData?: boolean;
}

export function createInMemoryDependencies({ withSampleData = false }: InMemoryOptions = {}): AppDependencies {
  const aiLog = new InMemoryRepository<AiLogEntry>();
  return {
    products: new InMemoryRepository<Product>(withSampleData ? sampleProducts : []),
    recipes: new InMemoryRepository<Recipe>(withSampleData ? sampleRecipes : []),
    frameworks: new InMemoryRepository<Framework>(withSampleData ? sampleFrameworks : []),
    planEntries: new InMemoryRepository<WeekPlanEntry>(),
    shoppingItems: new InMemoryRepository<ManualShoppingItem>(),
    shoppingChecks: new InMemoryRepository<ShoppingCheck>(),
    ai: new LoggingAi(new LocalAi(), aiLog, newId),
    aiLog,
    photos: new MemoryPhotoStorage(),
    files: new BrowserFileSaver(),
    backup: new JsonBackupCodec(),
  };
}
