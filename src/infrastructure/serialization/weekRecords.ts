/**
 * Stored form of week-level records: plan entries and shopping list state.
 * Same rules as entities.ts: untrusted on read, schemaVersion on write.
 */
import { isIsoDate } from "@/domain/calendar";
import type { Dish, MealSlot } from "@/domain/plan";
import { meals } from "@/domain/plan";
import type { ManualShoppingItem, ShoppingCheck, WeekPlanEntry } from "@/domain/weekPlanning";
import { shoppingStatuses } from "@/domain/weekPlanning";
import type { Json } from "./guards";
import { isNonEmptyString, isPositiveNumber, isRecord, isString, oneOf, parseArray } from "./guards";
import { toDocument } from "./entities";

const isDate = (value: unknown): value is string => isString(value) && isIsoDate(value);

function parseSlot(value: unknown): MealSlot | null {
  if (!isRecord(value) || !isDate(value.date) || !oneOf(meals, value.meal)) return null;
  return { date: value.date, meal: value.meal };
}

function parseDish(value: unknown): Dish | null {
  if (!isRecord(value)) return null;
  if (value.kind === "recipe" && isNonEmptyString(value.recipeId)) return { kind: "recipe", recipeId: value.recipeId };
  if (value.kind === "text" && isNonEmptyString(value.text)) return { kind: "text", text: value.text };
  if (value.kind === "framework" && isNonEmptyString(value.frameworkId)) {
    const raw = isRecord(value.choices) ? value.choices : {};
    const choices = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => isString(entry[1])));
    return { kind: "framework", frameworkId: value.frameworkId, choices };
  }
  return null;
}

export function parsePlanEntry(id: string, raw: unknown): WeekPlanEntry | null {
  if (!isRecord(raw) || !isDate(raw.weekStart) || !isPositiveNumber(raw.servings)) return null;
  const dish = parseDish(raw.dish);
  const slots = parseArray(raw.slots, parseSlot);
  if (!dish || slots.length === 0) return null;
  return { id, weekStart: raw.weekStart, dish, servings: raw.servings, slots };
}

export function parseShoppingItem(id: string, raw: unknown): ManualShoppingItem | null {
  if (!isRecord(raw) || !isDate(raw.weekStart) || !isNonEmptyString(raw.text)) return null;
  return { id, weekStart: raw.weekStart, text: raw.text, checked: raw.checked === true };
}

export function parseShoppingCheck(id: string, raw: unknown): ShoppingCheck | null {
  if (!isRecord(raw) || !isDate(raw.weekStart) || !isNonEmptyString(raw.productId)) return null;
  // Records written before the status existed meant "bought".
  const status = oneOf(shoppingStatuses, raw.status) ? raw.status : "bought";
  return { id, weekStart: raw.weekStart, productId: raw.productId, status };
}

export const serializeWeekRecord = (record: { readonly id: string }): Json => toDocument(record);
