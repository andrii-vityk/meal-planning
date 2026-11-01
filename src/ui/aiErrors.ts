import { AiError } from "@/application/ports/ai";
import { strings } from "@/ui/strings/uk";

/** A message for the user explaining why an AI request did not work. */
export function aiErrorMessage(error: unknown): string {
  return error instanceof AiError ? strings.aiErrors[error.code] : strings.common.unexpectedError;
}

export const isCancellation = (error: unknown) => error instanceof AiError && error.code === "cancelled";
