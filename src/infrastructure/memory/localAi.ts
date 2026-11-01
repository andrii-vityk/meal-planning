import type { AiService, ProductClassification, ProductMatch, RecipeDraft, RecipeSource, Substitution } from "@/application/ports/ai";
import type { Product } from "@/domain/product";

const normalize = (text: string) => text.toLowerCase().replaceAll("ё", "е").replaceAll("ʼ", "'");

/**
 * Crude stand-in for the AI, used in local development and tests.
 * Matches products when the text contains the first letters of a name or
 * alias (enough to survive most Ukrainian case endings). Never fails.
 */
export class LocalAi implements AiService {
  matchProducts(text: string, products: readonly Product[]): Promise<ProductMatch> {
    const haystack = normalize(text);
    const productIds = products
      .filter((product) =>
        [product.name, ...product.aliases].some((name) => {
          const stem = normalize(name).slice(0, Math.max(3, name.length - 2));
          return haystack.includes(stem);
        }),
      )
      .map((product) => product.id);
    return Promise.resolve({ productIds, unknownNames: [] });
  }

  classifyProduct(): Promise<ProductClassification> {
    return Promise.resolve({ category: "other", nutrition: { protein: false, fiber: false, healthyFat: false } });
  }

  parseRecipe(source: RecipeSource): Promise<RecipeDraft> {
    const [title = "Новий рецепт", ...rest] = source.text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return Promise.resolve({ title, servings: 2, ingredients: [], steps: rest, tags: [] });
  }

  suggestSubstitutions(): Promise<readonly Substitution[]> {
    return Promise.resolve([]);
  }
}
