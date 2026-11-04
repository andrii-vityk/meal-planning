/**
 * Stored form of AI log entries. Same rules as entities.ts: untrusted on
 * read, schemaVersion on write.
 */
import type { AiErrorCode } from "@/application/ports/ai";
import type { AiLogEntry, AiOperation } from "@/application/ports/aiLog";
import type { Json } from "./guards";
import { isNonEmptyString, isRecord, oneOf } from "./guards";
import { toDocument } from "./entities";

const operations: readonly AiOperation[] = [
  "matchProducts",
  "classifyProduct",
  "parseRecipe",
  "suggestSubstitutions",
  "draftWeek",
  "interpretDraftChange",
];
const errorCodes: readonly AiErrorCode[] = ["unavailable", "rateLimited", "invalidResponse", "cancelled", "failed"];

export function parseAiLogEntry(id: string, raw: unknown): AiLogEntry | null {
  if (!isRecord(raw) || !isNonEmptyString(raw.startedAt) || !oneOf(operations, raw.operation)) return null;
  if (raw.outcome !== "ok" && raw.outcome !== "error") return null;
  return {
    id,
    startedAt: raw.startedAt,
    operation: raw.operation,
    durationMs: typeof raw.durationMs === "number" && raw.durationMs >= 0 ? raw.durationMs : 0,
    outcome: raw.outcome,
    ...(oneOf(errorCodes, raw.errorCode) && { errorCode: raw.errorCode }),
    ...(isNonEmptyString(raw.detail) && { detail: raw.detail.slice(0, 300) }),
    hiddenAtStart: raw.hiddenAtStart === true,
    hiddenDuring: raw.hiddenDuring === true,
    hiddenAtEnd: raw.hiddenAtEnd === true,
    online: raw.online !== false,
    mobile: raw.mobile === true,
  };
}

export const serializeAiLogEntry = (entry: AiLogEntry): Json => toDocument(entry);
