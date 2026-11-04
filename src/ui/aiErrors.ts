import { AiError } from "@/application/ports/ai";
import { strings } from "@/ui/strings/uk";

/** A message for the user explaining why an AI request did not work. */
export function aiErrorMessage(error: unknown): string {
  if (!(error instanceof AiError)) return strings.common.unexpectedError;
  // The host's own code, so a screenshot or the AI log says what happened.
  const detail = error.code === "failed" || error.code === "unavailable" || error.code === "invalidResponse";
  return detail ? `${strings.aiErrors[error.code]} (${error.message})` : strings.aiErrors[error.code];
}

export const isCancellation = (error: unknown) => error instanceof AiError && error.code === "cancelled";
