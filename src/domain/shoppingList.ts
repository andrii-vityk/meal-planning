import type { DishSources } from "./dishIngredients";
import { dishIngredients } from "./dishIngredients";
import type { WeekPlan } from "./plan";
import type { ProductCategory, ProductLookup } from "./product";
import { productCategories } from "./product";
import type { Quantity } from "./quantity";
import { sumQuantities } from "./quantity";
import type { ShoppingStatus } from "./weekPlanning";

export interface ShoppingLine {
  readonly productId: string;
  readonly name: string;
  /** Summed amounts, one per unit family: [700 g, 2 piece]. */
  readonly quantities: readonly Quantity[];
  /** Some uses have no amount ("to taste", framework options). */
  readonly hasUnquantifiedUse: boolean;
  /** A staple is usually at home: it is not bought unless someone asks for it. */
  readonly isStaple: boolean;
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
 * are not bought twice). Staples are included and flagged; unknown products
 * are left out.
 * Groups follow the category order; lines within a group are sorted by name.
 */
export function buildShoppingList(plan: WeekPlan, sources: ShoppingSources): ShoppingGroup[] {
  const uses = new Map<string, { quantities: Quantity[]; hasUnquantifiedUse: boolean }>();

  for (const entry of plan.entries) {
    for (const need of dishIngredients(entry.dish, entry.servings, sources)) {
      const product = sources.products.get(need.productId);
      if (!product) continue;

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
      isStaple: product.isStaple,
    });
    byCategory.set(product.category, lines);
  }

  return productCategories.flatMap((category) => {
    const lines = byCategory.get(category);
    if (!lines) return [];
    return [{ category, lines: lines.toSorted((a, b) => a.name.localeCompare(b.name, "uk")) }];
  });
}

export interface ArrangedShoppingList {
  /** Lines to buy (or already bought), grouped by category. */
  readonly toBuy: readonly ShoppingGroup[];
  /** Ordinary lines marked as already at home. */
  readonly atHome: readonly ShoppingLine[];
  /** Staples nobody asked to buy this week. */
  readonly staples: readonly ShoppingLine[];
}

/**
 * Splits the generated list by each line's status for the week.
 *
 * An ordinary line is to buy unless it is at home. A staple is the other way
 * round: it stays among the staples unless it was asked for ("needed") or
 * already bought.
 */
export function arrangeShoppingList(
  groups: readonly ShoppingGroup[],
  statuses: ReadonlyMap<string, ShoppingStatus>,
): ArrangedShoppingList {
  const isToBuy = (line: ShoppingLine) => {
    const status = statuses.get(line.productId);
    return line.isStaple ? status === "needed" || status === "bought" : status !== "atHome";
  };
  const lines = groups.flatMap((group) => group.lines);

  return {
    toBuy: groups
      .map((group) => ({ ...group, lines: group.lines.filter(isToBuy) }))
      .filter((group) => group.lines.length > 0),
    atHome: lines.filter((line) => !line.isStaple && !isToBuy(line)),
    staples: lines.filter((line) => line.isStaple && !isToBuy(line)).toSorted((a, b) => a.name.localeCompare(b.name, "uk")),
  };
}
