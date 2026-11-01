import type { IsoDate } from "./calendar";

export const meals = ["breakfast", "lunch", "dinner", "snack"] as const;

export type Meal = (typeof meals)[number];

export interface MealSlot {
  readonly date: IsoDate;
  readonly meal: Meal;
}

/** What is eaten in a plan entry. */
export type Dish =
  | { readonly kind: "recipe"; readonly recipeId: string }
  | {
      readonly kind: "framework";
      readonly frameworkId: string;
      /** Chosen option id per slot id. */
      readonly choices: Readonly<Record<string, string>>;
    }
  | { readonly kind: "text"; readonly text: string };

/**
 * One cooked dish. It may cover several slots: cooked for dinner and eaten
 * again as leftovers the next day. It is cooked (and bought for) once.
 */
export interface PlanEntry {
  readonly id: string;
  readonly dish: Dish;
  readonly servings: number;
  readonly slots: readonly MealSlot[];
}

export interface WeekPlan {
  /** Monday of the planned week. */
  readonly weekStart: IsoDate;
  readonly entries: readonly PlanEntry[];
}
