/**
 * Validation of model answers. The model is asked for an exact JSON shape,
 * but its answers are still untrusted: anything unexpected is dropped, and
 * an answer with nothing usable is an AiError("invalidResponse").
 */
import type { DraftChange, IngredientDraft, ProductClassification, ProductMatch, RecipeDraft, Substitution } from "@/application/ports/ai";
import { AiError } from "@/application/ports/ai";
import { isIsoDate } from "@/domain/calendar";
import type { Dish, MealSlot } from "@/domain/plan";
import { meals } from "@/domain/plan";
import { productCategories } from "@/domain/product";
import type { DraftEntry } from "@/domain/weekDraft";
import { isNonEmptyString, isPositiveNumber, isRecord, oneOf, parseArray, stringArray } from "@/infrastructure/serialization/guards";
import { parseQuantity } from "@/infrastructure/serialization/entities";

const invalid = (what: string) => new AiError("invalidResponse", `Unexpected ${what} answer`);

export function readProductMatch(answer: unknown, knownIds: ReadonlySet<string>): ProductMatch {
  if (!isRecord(answer)) throw invalid("product match");
  return {
    productIds: [...new Set(stringArray(answer.productIds).filter((id) => knownIds.has(id)))],
    unknownNames: stringArray(answer.unknown).filter((name) => name.trim() !== ""),
  };
}

export function readClassification(answer: unknown): ProductClassification {
  if (!isRecord(answer)) throw invalid("classification");
  return {
    category: oneOf(productCategories, answer.category) ? answer.category : "other",
    nutrition: {
      protein: answer.protein === true,
      fiber: answer.fiber === true,
      healthyFat: answer.healthyFat === true,
    },
  };
}

function readIngredient(value: unknown, knownIds: ReadonlySet<string>): IngredientDraft | null {
  if (!isRecord(value) || !isNonEmptyString(value.productName)) return null;
  const quantity = parseQuantity(value.quantity);
  return {
    productName: value.productName.trim(),
    ...(isNonEmptyString(value.productId) && knownIds.has(value.productId) && { productId: value.productId }),
    ...(quantity && { quantity }),
    ...(isNonEmptyString(value.note) && { note: value.note }),
  };
}

export function readRecipeDraft(answer: unknown, knownIds: ReadonlySet<string>): RecipeDraft {
  if (!isRecord(answer) || !isNonEmptyString(answer.title)) throw invalid("recipe");
  return {
    title: answer.title.trim(),
    servings: isPositiveNumber(answer.servings) ? Math.round(answer.servings) : 2,
    ingredients: parseArray(answer.ingredients, (item) => readIngredient(item, knownIds)),
    steps: stringArray(answer.steps).filter((step) => step.trim() !== ""),
    tags: stringArray(answer.tags),
    ...(isPositiveNumber(answer.timeMinutes) && { timeMinutes: Math.round(answer.timeMinutes) }),
  };
}

export function readSubstitutions(answer: unknown, missingIds: ReadonlySet<string>): Substitution[] {
  if (!isRecord(answer)) throw invalid("substitutions");
  return parseArray(answer.substitutions, (item) =>
    isRecord(item) && isNonEmptyString(item.productId) && missingIds.has(item.productId) && isNonEmptyString(item.suggestion)
      ? { productId: item.productId, suggestion: item.suggestion.trim() }
      : null,
  );
}

function readSlot(value: unknown): MealSlot | null {
  if (!isRecord(value) || !isNonEmptyString(value.date) || !isIsoDate(value.date) || !oneOf(meals, value.meal)) return null;
  return { date: value.date, meal: value.meal };
}

function readChoices(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((pair): pair is [string, string] => isNonEmptyString(pair[1])));
}

function readDraftDish(value: Record<string, unknown>): Dish | null {
  if (isNonEmptyString(value.recipeId)) return { kind: "recipe", recipeId: value.recipeId };
  if (isNonEmptyString(value.frameworkId)) {
    return { kind: "framework", frameworkId: value.frameworkId, choices: readChoices(value.choices) };
  }
  if (isNonEmptyString(value.text)) return { kind: "text", text: value.text.trim() };
  return null;
}

/** The shape only; whether the dishes and slots are allowed is decided by the draft rules. */
export function readWeekDraft(answer: unknown): DraftEntry[] {
  if (!isRecord(answer) || !Array.isArray(answer.entries)) throw invalid("week draft");
  return parseArray(answer.entries, (item) => {
    if (!isRecord(item)) return null;
    const dish = readDraftDish(item);
    const slots = parseArray(item.slots, readSlot);
    if (!dish || slots.length === 0) return null;
    return { dish, servings: isPositiveNumber(item.servings) ? item.servings : 0, slots };
  });
}

export function readDraftChange(answer: unknown, entryCount: number): DraftChange {
  if (!isRecord(answer)) throw invalid("draft change");
  const indexes = Array.isArray(answer.replaceEntries) ? answer.replaceEntries : [];
  return {
    excludeProductIds: stringArray(answer.excludeProductIds),
    excludeRecipeIds: stringArray(answer.excludeRecipeIds),
    excludeFrameworkIds: stringArray(answer.excludeFrameworkIds),
    replaceEntries: [
      ...new Set(
        indexes.filter((value): value is number => Number.isInteger(value) && value >= 0 && value < entryCount),
      ),
    ],
    note: isNonEmptyString(answer.note) ? answer.note.trim() : "",
  };
}
