import type { AiService, DraftChangeRequest, RecipeSource, WeekDraftRequest } from "@/application/ports/ai";
import { AiError } from "@/application/ports/ai";
import type { Product } from "@/domain/product";
import {
  classifyProductPrompt,
  draftChangePrompt,
  matchProductsPrompt,
  parseRecipePrompt,
  substitutionsPrompt,
  weekDraftPrompt,
} from "@/infrastructure/ai/prompts";
import {
  readClassification,
  readDraftChange,
  readProductMatch,
  readRecipeDraft,
  readSubstitutions,
  readWeekDraft,
} from "@/infrastructure/ai/responses";
import type { PlatformSample, PlatformSampleOptions } from "./runtime";

/** Maps the host's error codes to the app's AiError codes. */
function toAiError(error: unknown): AiError {
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  switch (code) {
    case "cancelled":
      return new AiError("cancelled", "Cancelled");
    case "rate_limited":
      return new AiError("rateLimited", "Usage limit reached");
    case "not_granted":
    case "sampling_disabled":
    case "not_declared":
    case "capability_disabled":
    case "capability_removed":
    case "session_expired":
      return new AiError("unavailable", code);
    case "invalid_json":
    case "empty_completion":
      return new AiError("invalidResponse", code);
    default:
      return new AiError("failed", code || "Unknown error");
  }
}

const ids = (products: readonly Product[]) => new Set(products.map((product) => product.id));

/** AiService backed by the host's Claude access (calls use the viewer's own limits). */
export class PlatformAi implements AiService {
  constructor(private readonly sample: PlatformSample | null) {}

  private async ask(prompt: string, options: PlatformSampleOptions): Promise<unknown> {
    if (!this.sample) throw new AiError("unavailable", "Claude is not available on this page");
    try {
      return await this.sample.json(prompt, { cache: false, ...options });
    } catch (error) {
      throw toAiError(error);
    }
  }

  private static signalOption(signal: AbortSignal | undefined): PlatformSampleOptions {
    return signal ? { signal } : {};
  }

  async matchProducts(text: string, products: readonly Product[], signal?: AbortSignal) {
    const answer = await this.ask(matchProductsPrompt(text, products), {
      modelTier: "quick",
      ...PlatformAi.signalOption(signal),
    });
    return readProductMatch(answer, ids(products));
  }

  async classifyProduct(name: string, signal?: AbortSignal) {
    const answer = await this.ask(classifyProductPrompt(name), {
      modelTier: "quick",
      ...PlatformAi.signalOption(signal),
    });
    return readClassification(answer);
  }

  async parseRecipe(source: RecipeSource, products: readonly Product[], signal?: AbortSignal) {
    const answer = await this.ask(parseRecipePrompt(source.text, products, source.image !== undefined), {
      modelTier: "default",
      ...(source.image && { images: [source.image] }),
      ...PlatformAi.signalOption(signal),
    });
    return readRecipeDraft(answer, ids(products));
  }

  async suggestSubstitutions(missing: readonly Product[], available: readonly Product[], signal?: AbortSignal) {
    if (missing.length === 0) return [];
    const answer = await this.ask(substitutionsPrompt(missing, available), {
      modelTier: "quick",
      ...PlatformAi.signalOption(signal),
    });
    return readSubstitutions(answer, ids(missing));
  }

  async draftWeek(request: WeekDraftRequest, signal?: AbortSignal) {
    const answer = await this.ask(weekDraftPrompt(request), {
      modelTier: "default",
      ...PlatformAi.signalOption(signal),
    });
    return readWeekDraft(answer);
  }

  async interpretDraftChange(request: DraftChangeRequest, signal?: AbortSignal) {
    const answer = await this.ask(draftChangePrompt(request), {
      modelTier: "quick",
      ...PlatformAi.signalOption(signal),
    });
    return readDraftChange(answer, request.entries.length);
  }
}
