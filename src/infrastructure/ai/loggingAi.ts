import type {
  AiService,
  DraftChangeRequest,
  RecipeSource,
  WeekDraftRequest,
} from "@/application/ports/ai";
import { AiError } from "@/application/ports/ai";
import type { AiLogEntry, AiOperation } from "@/application/ports/aiLog";
import type { Repository } from "@/application/ports/repository";
import type { Product } from "@/domain/product";

const isHidden = () => typeof document !== "undefined" && document.visibilityState === "hidden";
const isOnline = () => typeof navigator === "undefined" || navigator.onLine;
const isMobile = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches;

/**
 * Decorator: the same AiService, with every call recorded in a log.
 * Logging never changes what the caller gets back, and a failed log write
 * is ignored, so diagnostics cannot break the feature they observe.
 */
export class LoggingAi implements AiService {
  constructor(
    private readonly inner: AiService,
    private readonly log: Repository<AiLogEntry>,
    private readonly newId: () => string,
  ) {}

  private async track<T>(operation: AiOperation, call: () => Promise<T>): Promise<T> {
    const started = Date.now();
    const hiddenAtStart = isHidden();
    let hiddenDuring = hiddenAtStart;
    const onVisibility = () => {
      if (isHidden()) hiddenDuring = true;
    };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", onVisibility);

    const record = (outcome: AiLogEntry["outcome"], error?: unknown) => {
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", onVisibility);
      const entry: AiLogEntry = {
        id: this.newId(),
        startedAt: new Date(started).toISOString(),
        operation,
        durationMs: Date.now() - started,
        outcome,
        ...(error instanceof AiError && { errorCode: error.code, detail: error.message }),
        ...(error !== undefined && !(error instanceof AiError) && { detail: String(error) }),
        hiddenAtStart,
        hiddenDuring,
        hiddenAtEnd: isHidden(),
        online: isOnline(),
        mobile: isMobile(),
      };
      this.log.save(entry).catch(() => undefined);
    };

    try {
      const result = await call();
      record("ok");
      return result;
    } catch (error) {
      record("error", error);
      throw error;
    }
  }

  matchProducts(text: string, products: readonly Product[], signal?: AbortSignal) {
    return this.track("matchProducts", () => this.inner.matchProducts(text, products, signal));
  }

  classifyProduct(name: string, signal?: AbortSignal) {
    return this.track("classifyProduct", () => this.inner.classifyProduct(name, signal));
  }

  parseRecipe(source: RecipeSource, products: readonly Product[], signal?: AbortSignal) {
    return this.track("parseRecipe", () => this.inner.parseRecipe(source, products, signal));
  }

  suggestSubstitutions(missing: readonly Product[], available: readonly Product[], signal?: AbortSignal) {
    return this.track("suggestSubstitutions", () => this.inner.suggestSubstitutions(missing, available, signal));
  }

  draftWeek(request: WeekDraftRequest, signal?: AbortSignal) {
    return this.track("draftWeek", () => this.inner.draftWeek(request, signal));
  }

  interpretDraftChange(request: DraftChangeRequest, signal?: AbortSignal) {
    return this.track("interpretDraftChange", () => this.inner.interpretDraftChange(request, signal));
  }
}
