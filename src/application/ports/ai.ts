import type { NutritionFlags, Product, ProductCategory } from "@/domain/product";
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
}
