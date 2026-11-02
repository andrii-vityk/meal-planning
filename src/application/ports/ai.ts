import type { IsoDate } from "@/domain/calendar";
import type { MealSlot } from "@/domain/plan";
import type { NutritionFlags, Product, ProductCategory } from "@/domain/product";
import type { DraftEntry } from "@/domain/weekDraft";
import type { Quantity } from "@/domain/quantity";

export type AiErrorCode =
  /** The AI cannot be used in this session at all. */
  | "unavailable"
  /** Usage limit reached; the user may try again later. */
  | "rateLimited"
  /** The answer could not be understood. */
  | "invalidResponse"
  /** The caller aborted the request. */
  | "cancelled"
  | "failed";

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export interface ProductMatch {
  readonly productIds: readonly string[];
  /** Products named in the text that are not in the directory. */
  readonly unknownNames: readonly string[];
}

export interface ProductClassification {
  readonly category: ProductCategory;
  readonly nutrition: NutritionFlags;
}

export interface IngredientDraft {
  /** Set when the ingredient matched a product in the directory. */
  readonly productId?: string;
  /** The ingredient as named in the source, nominative case. */
  readonly productName: string;
  readonly quantity?: Quantity;
  readonly note?: string;
}

export interface RecipeDraft {
  readonly title: string;
  readonly servings: number;
  readonly ingredients: readonly IngredientDraft[];
  readonly steps: readonly string[];
  readonly tags: readonly string[];
  readonly timeMinutes?: number;
}

export interface RecipeSource {
  readonly text: string;
  readonly image?: Blob;
}

export interface Substitution {
  readonly productId: string;
  /** Free-text suggestion, e.g. "цукор і рисовий оцет". */
  readonly suggestion: string;
}

/** A saved dish as the model sees it when drafting a week. */
export interface DraftRecipeOption {
  readonly id: string;
  readonly title: string;
  readonly tags: readonly string[];
  readonly servings: number;
  readonly nutrition: NutritionFlags;
}

export interface DraftFrameworkOption {
  readonly id: string;
  readonly title: string;
  readonly slots: readonly {
    readonly id: string;
    readonly name: string;
    readonly required: boolean;
    readonly options: readonly { readonly id: string; readonly name: string; readonly nutrition: NutritionFlags }[];
  }[];
}

/** Everything the model needs to fill the open slots of one week. */
export interface WeekDraftRequest {
  readonly weekStart: IsoDate;
  /** Slots to fill; nothing else may be planned. */
  readonly open: readonly MealSlot[];
  /** Dishes already in the week, for variety and nutrition. */
  readonly planned: readonly { readonly title: string; readonly slots: readonly MealSlot[] }[];
  readonly recipes: readonly DraftRecipeOption[];
  readonly frameworks: readonly DraftFrameworkOption[];
  readonly avoidRecipeIds: readonly string[];
  /** Titles of dishes the user asked to replace. */
  readonly avoidTitles: readonly string[];
  readonly maxIdeas: number;
  readonly wishes: string;
}

/**
 * Everything the app asks an AI to do. Each call may be slow (seconds)
 * and may fail with an AiError; all of them accept an AbortSignal.
 */
export interface AiService {
  matchProducts(text: string, products: readonly Product[], signal?: AbortSignal): Promise<ProductMatch>;
  classifyProduct(name: string, signal?: AbortSignal): Promise<ProductClassification>;
  parseRecipe(source: RecipeSource, products: readonly Product[], signal?: AbortSignal): Promise<RecipeDraft>;
  suggestSubstitutions(
    missing: readonly Product[],
    available: readonly Product[],
    signal?: AbortSignal,
  ): Promise<readonly Substitution[]>;
  /** A proposal only: the caller checks it against the draft rules before showing it. */
  draftWeek(request: WeekDraftRequest, signal?: AbortSignal): Promise<readonly DraftEntry[]>;
}
