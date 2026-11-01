import type { DishSources } from "./dishIngredients";
import { dishIngredients } from "./dishIngredients";
import type { WeekPlan } from "./plan";
import type { ProductCategory, ProductLookup } from "./product";
import { productCategories } from "./product";
import type { Quantity } from "./quantity";
import { sumQuantities } from "./quantity";

export interface ShoppingLine {
  readonly productId: string;
  readonly name: string;
  /** Summed amounts, one per unit family: [700 g, 2 piece]. */
  readonly quantities: readonly Quantity[];
  /** Some uses have no amount ("to taste", framework options). */
  readonly hasUnquantifiedUse: boolean;
}

export interface ShoppingGroup {
  readonly category: ProductCategory;
  readonly lines: readonly ShoppingLine[];
}

export interface ShoppingSources extends DishSources {
  readonly products: ProductLookup;
}

/**
 * Generated part of the week's shopping list.
 *
 * Each plan entry is counted once however many slots it covers (leftovers
 * are not bought twice). Staples and unknown products are left out.
 * Groups follow the category order; lines within a group are sorted by name.
 */
export function buildShoppingList(plan: WeekPlan, sources: ShoppingSources): ShoppingGroup[] {
  const uses = new Map<string, { quantities: Quantity[]; hasUnquantifiedUse: boolean }>();

  for (const entry of plan.entries) {
    for (const need of dishIngredients(entry.dish, entry.servings, sources)) {
      const product = sources.products.get(need.productId);
      if (!product || product.isStaple) continue;

      const use = uses.get(need.productId) ?? { quantities: [], hasUnquantifiedUse: false };
      if (need.quantity) use.quantities.push(need.quantity);
      else use.hasUnquantifiedUse = true;
      uses.set(need.productId, use);
    }
  }

  const byCategory = new Map<ProductCategory, ShoppingLine[]>();
  for (const [productId, use] of uses) {
    const product = sources.products.get(productId);
    if (!product) continue;
    const lines = byCategory.get(product.category) ?? [];
    lines.push({
      productId,
      name: product.name,
      quantities: sumQuantities(use.quantities),
      hasUnquantifiedUse: use.hasUnquantifiedUse,
    });
    byCategory.set(product.category, lines);
  }

  return productCategories.flatMap((category) => {
    const lines = byCategory.get(category);
    if (!lines) return [];
    return [{ category, lines: lines.toSorted((a, b) => a.name.localeCompare(b.name, "uk")) }];
  });
}
