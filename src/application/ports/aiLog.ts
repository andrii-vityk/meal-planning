import type { AiErrorCode, AiService } from "./ai";

/** Which AI call a log entry is about. */
export type AiOperation = keyof AiService;

/**
 * One AI request, as recorded for diagnosing failures. Holds no request
 * content and nothing about who made it: only timing, outcome and the
 * state of the page while the request ran.
 */
export interface AiLogEntry {
  readonly id: string;
  /** When the request started, ISO 8601. */
  readonly startedAt: string;
  readonly operation: AiOperation;
  readonly durationMs: number;
  readonly outcome: "ok" | "error";
  readonly errorCode?: AiErrorCode;
  /** The host's own error code or message, when there was one. */
  readonly detail?: string;
  /** Page visibility: hidden at the start, at any moment during, at the end. */
  readonly hiddenAtStart: boolean;
  readonly hiddenDuring: boolean;
  readonly hiddenAtEnd: boolean;
  /** The browser's own idea of being online when the request ended. */
  readonly online: boolean;
  /** Narrow screen with a touch pointer: most likely a phone. */
  readonly mobile: boolean;
}
