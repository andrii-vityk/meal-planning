/**
 * Conversion between domain entities and stored documents.
 *
 * Documents may be written by any client or by an external writer, so
 * reading never trusts them: invalid documents are rejected (null) and
 * invalid optional fields are dropped. Every written document carries
 * SCHEMA_VERSION so future changes can migrate old data.
 */
import type { Framework, FrameworkSlot, SlotOption } from "@/domain/framework";
import type { NutritionFlags, Product } from "@/domain/product";
import { productCategories } from "@/domain/product";
import type { Quantity } from "@/domain/quantity";
import { units } from "@/domain/quantity";
import type { Recipe, RecipeIngredient } from "@/domain/recipe";
import type { Json } from "./guards";
import {
  isBoolean,
  isNonEmptyString,
  isPositiveNumber,
  isRecord,
  isString,
  oneOf,
  parseArray,
  stringArray,
} from "./guards";

export const SCHEMA_VERSION = 1;

// ---------- product ----------

function parseNutrition(value: unknown): NutritionFlags {
  const raw = isRecord(value) ? value : {};
  return {
    protein: raw.protein === true,
    fiber: raw.fiber === true,
    healthyFat: raw.healthyFat === true,
  };
}

export function parseProduct(id: string, raw: unknown): Product | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.name)) return null;
  return {
    id,
    name: raw.name.trim(),
    aliases: stringArray(raw.aliases),
    category: oneOf(productCategories, raw.category) ? raw.category : "other",
    nutrition: parseNutrition(raw.nutrition),
    isStaple: raw.isStaple === true,
  };
}

/** Documents are keyed by id, so the id itself is not stored inside them. */
function toDocument(entity: { readonly id: string }): Json {
  const data: Json = { schemaVersion: SCHEMA_VERSION, ...structuredClone(entity) };
  delete data.id;
  return data;
}

export const serializeProduct = (product: Product): Json => toDocument(product);

// ---------- recipe ----------

export function parseQuantity(value: unknown): Quantity | null {
  if (!isRecord(value) || !isPositiveNumber(value.amount) || !oneOf(units, value.unit)) return null;
  return { amount: value.amount, unit: value.unit };
}

function parseIngredient(value: unknown): RecipeIngredient | null {
  if (!isRecord(value) || !isNonEmptyString(value.productId)) return null;
  const quantity = parseQuantity(value.quantity);
  return {
    productId: value.productId,
    ...(quantity && { quantity }),
    ...(isNonEmptyString(value.note) && { note: value.note }),
  };
}

export function parseRecipe(id: string, raw: unknown): Recipe | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.title) || !isPositiveNumber(raw.servings)) return null;
  return {
    id,
    title: raw.title.trim(),
    servings: raw.servings,
    ingredients: parseArray(raw.ingredients, parseIngredient),
    steps: stringArray(raw.steps),
    tags: stringArray(raw.tags),
    kidFriendly: raw.kidFriendly === true,
    ...(isPositiveNumber(raw.timeMinutes) && { timeMinutes: raw.timeMinutes }),
    ...(isNonEmptyString(raw.sourceUrl) && { sourceUrl: raw.sourceUrl }),
    ...(isNonEmptyString(raw.photoAssetId) && { photoAssetId: raw.photoAssetId }),
    ...(isNonEmptyString(raw.notes) && { notes: raw.notes }),
  };
}

export const serializeRecipe = (recipe: Recipe): Json => toDocument(recipe);

// ---------- framework ----------

function parseSlotOption(value: unknown): SlotOption | null {
  if (!isRecord(value) || !isNonEmptyString(value.id)) return null;
  const kidFriendly = value.kidFriendly === true;
  if (value.kind === "product" && isNonEmptyString(value.productId)) {
    return { id: value.id, kind: "product", productId: value.productId, kidFriendly };
  }
  if (value.kind === "text" && isNonEmptyString(value.text)) {
    return { id: value.id, kind: "text", text: value.text, kidFriendly };
  }
  return null;
}

function parseSlot(value: unknown): FrameworkSlot | null {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.name)) return null;
  return {
    id: value.id,
    name: value.name,
    required: isBoolean(value.required) ? value.required : true,
    options: parseArray(value.options, parseSlotOption),
  };
}

export function parseFramework(id: string, raw: unknown): Framework | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.title)) return null;
  return {
    id,
    title: raw.title.trim(),
    slots: parseArray(raw.slots, parseSlot),
    kidFriendly: raw.kidFriendly === true,
    ...(isString(raw.description) && raw.description !== "" && { description: raw.description }),
    ...(isNonEmptyString(raw.notes) && { notes: raw.notes }),
  };
}

export const serializeFramework = (framework: Framework): Json => toDocument(framework);
