/**
 * Week-level records as they are stored: one record per plan entry and
 * per shopping item, so that people editing the same week at the same
 * time change different records instead of overwriting one shared
 * document.
 */
import type { IsoDate } from "./calendar";
import type { PlanEntry, WeekPlan } from "./plan";

export interface WeekPlanEntry extends PlanEntry {
  /** Monday of the week the entry belongs to. */
  readonly weekStart: IsoDate;
}

/** An item added to the shopping list by hand. */
export interface ManualShoppingItem {
  readonly id: string;
  readonly weekStart: IsoDate;
  readonly text: string;
  readonly checked: boolean;
}

/**
 * What happened to a generated shopping line: bought, or not needed
 * because it is already at home. No record = still to buy.
 */
export type ShoppingStatus = "bought" | "atHome";

export const shoppingStatuses: readonly ShoppingStatus[] = ["bought", "atHome"];

export interface ShoppingCheck {
  readonly id: string;
  readonly weekStart: IsoDate;
  readonly productId: string;
  readonly status: ShoppingStatus;
}

export function shoppingCheckId(weekStart: IsoDate, productId: string): string {
  return `${weekStart}~${productId}`;
}

export function weekPlan(weekStart: IsoDate, entries: Iterable<WeekPlanEntry>): WeekPlan {
  return { weekStart, entries: [...entries].filter((entry) => entry.weekStart === weekStart) };
}
