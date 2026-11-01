/**
 * The recipe form works with strings (that is what inputs hold); these
 * pure functions convert between that form state and a RecipeInput.
 */
import { newId } from "@/application/ids";
import type { IngredientInput, RecipeInput } from "@/application/recipes";
import type { Unit } from "@/domain/quantity";
import type { Recipe } from "@/domain/recipe";
import { units } from "@/domain/quantity";

export interface IngredientRow {
  /** Stable React key: rows can be added and removed in the middle. */
  readonly key: string;
  /** Kept only while the name still refers to that product. */
  readonly productId?: string;
  readonly productName: string;
  readonly amount: string;
  readonly unit: Unit | "";
  readonly note: string;
}

export interface RecipeFormState {
  readonly title: string;
  readonly servings: string;
  readonly timeMinutes: string;
  readonly ingredients: readonly IngredientRow[];
  readonly steps: string;
  readonly tags: string;
  readonly kidFriendly: boolean;
  readonly sourceUrl: string;
  readonly notes: string;
}

export interface FormErrors {
  readonly title?: true;
  readonly servings?: true;
}

/** A stored recipe as form input: names are filled in from product ids later. */
export function recipeToInput(recipe: Recipe): RecipeInput {
  return { ...recipe, ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient, productName: "" })) };
}

export const emptyRow = (): IngredientRow => ({ key: newId(), productName: "", amount: "", unit: "", note: "" });

function toRow(ingredient: IngredientInput, nameOf: (productId: string) => string | undefined): IngredientRow {
  const productName = ingredient.productName || (ingredient.productId ? (nameOf(ingredient.productId) ?? "") : "");
  return {
    key: newId(),
    ...(ingredient.productId && { productId: ingredient.productId }),
    productName,
    amount: ingredient.quantity ? String(ingredient.quantity.amount) : "",
    unit: ingredient.quantity?.unit ?? "",
    note: ingredient.note ?? "",
  };
}

export function toFormState(
  input: RecipeInput | undefined,
  nameOf: (productId: string) => string | undefined,
): RecipeFormState {
  return {
    title: input?.title ?? "",
    servings: String(input?.servings ?? 2),
    timeMinutes: input?.timeMinutes !== undefined ? String(input.timeMinutes) : "",
    ingredients: input?.ingredients.length ? input.ingredients.map((item) => toRow(item, nameOf)) : [emptyRow()],
    steps: input?.steps.join("\n") ?? "",
    tags: input?.tags.join(", ") ?? "",
    kidFriendly: input?.kidFriendly ?? false,
    sourceUrl: input?.sourceUrl ?? "",
    notes: input?.notes ?? "",
  };
}

const parseNumber = (text: string) => Number(text.trim().replace(",", "."));
const lines = (text: string) => text.split("\n").map((line) => line.trim()).filter(Boolean);

function toIngredient(row: IngredientRow): IngredientInput | null {
  const productName = row.productName.trim();
  if (productName === "") return null;
  const amount = parseNumber(row.amount);
  const unit = units.find((candidate) => candidate === row.unit);
  return {
    productName,
    ...(row.productId && { productId: row.productId }),
    ...(amount > 0 && unit && { quantity: { amount, unit } }),
    ...(row.note.trim() && { note: row.note.trim() }),
  };
}

export function fromFormState(
  state: RecipeFormState,
  id: string | undefined,
  photoAssetId?: string,
): { input: RecipeInput } | { errors: FormErrors } {
  const servings = parseNumber(state.servings);
  const timeMinutes = parseNumber(state.timeMinutes);
  const errors: { title?: true; servings?: true } = {};
  if (state.title.trim() === "") errors.title = true;
  if (!(servings > 0)) errors.servings = true;
  if (errors.title || errors.servings) return { errors };

  return {
    input: {
      ...(id && { id }),
      title: state.title.trim(),
      servings,
      ingredients: state.ingredients.flatMap((row) => {
        const ingredient = toIngredient(row);
        return ingredient ? [ingredient] : [];
      }),
      steps: lines(state.steps),
      tags: state.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      kidFriendly: state.kidFriendly,
      ...(timeMinutes > 0 && { timeMinutes: Math.round(timeMinutes) }),
      ...(state.sourceUrl.trim() && { sourceUrl: state.sourceUrl.trim() }),
      ...(state.notes.trim() && { notes: state.notes.trim() }),
      ...(photoAssetId && { photoAssetId }),
    },
  };
}
