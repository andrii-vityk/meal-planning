/**
 * Recipe use cases: what happens when the user saves or deletes a recipe.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { Product } from "@/domain/product";
import { findProductByName } from "@/domain/product";
import type { Quantity } from "@/domain/quantity";
import type { Recipe, RecipeIngredient } from "@/domain/recipe";

/** An ingredient as entered: it may name a product that does not exist yet. */
export interface IngredientInput {
  readonly productId?: string;
  readonly productName: string;
  readonly quantity?: Quantity;
  readonly note?: string;
}

export type RecipeInput = Omit<Recipe, "id" | "ingredients"> & {
  readonly id?: string;
  readonly ingredients: readonly IngredientInput[];
};

export class ValidationError extends Error {
  constructor(readonly field: "title" | "servings" | "ingredients") {
    super(`Invalid ${field}`);
    this.name = "ValidationError";
  }
}

type ProductDeps = Pick<AppDependencies, "products" | "ai">;

/**
 * Returns the product with this name, creating it if it does not exist.
 * A new product is classified by the AI; if that fails it is saved as
 * "other" without nutrition flags and can be corrected later.
 */
export async function ensureProduct(deps: ProductDeps, name: string, known: Map<string, Product>): Promise<Product> {
  const existing = findProductByName(known.values(), name);
  if (existing) return existing;

  const classification = await deps.ai.classifyProduct(name).catch(() => null);
  const product: Product = {
    id: newId(),
    name: name.trim(),
    aliases: [],
    category: classification?.category ?? "other",
    nutrition: classification?.nutrition ?? { protein: false, fiber: false, healthyFat: false },
    isStaple: false,
  };
  await deps.products.save(product);
  known.set(product.id, product);
  return product;
}

/** Saves a recipe, creating any products it names that are not in the directory yet. */
export async function saveRecipe(deps: Pick<AppDependencies, "products" | "recipes" | "ai">, input: RecipeInput): Promise<Recipe> {
  if (input.title.trim() === "") throw new ValidationError("title");
  if (!(input.servings > 0)) throw new ValidationError("servings");

  const known = new Map(deps.products.getSnapshot().items);
  const ingredients: RecipeIngredient[] = [];
  for (const ingredient of input.ingredients) {
    if (ingredient.productName.trim() === "" && !ingredient.productId) continue;
    const product =
      (ingredient.productId && known.get(ingredient.productId)) || (await ensureProduct(deps, ingredient.productName, known));
    ingredients.push({
      productId: product.id,
      ...(ingredient.quantity && { quantity: ingredient.quantity }),
      ...(ingredient.note?.trim() && { note: ingredient.note.trim() }),
    });
  }

  const { id, ...rest } = input;
  const recipe: Recipe = { ...rest, id: id ?? newId(), title: input.title.trim(), ingredients };
  await deps.recipes.save(recipe);
  return recipe;
}
