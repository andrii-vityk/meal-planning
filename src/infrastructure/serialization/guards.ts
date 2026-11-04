/**
 * Small type guards for reading untrusted JSON (database documents written
 * by any client or an external writer, AI answers).
 */
export type Json = Record<string, unknown>;

export const isRecord = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === "string";

export const isNonEmptyString = (value: unknown): value is string => isString(value) && value.trim() !== "";

export const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";

/** Keeps only the string items of an array; anything else becomes []. */
export const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter(isString) : [];

export function oneOf<T extends string>(allowed: readonly T[], value: unknown): value is T {
  return isString(value) && (allowed as readonly string[]).includes(value);
}

/** Maps an array with a parser that may reject items, dropping the rejected ones. */
export function parseArray<T>(value: unknown, parse: (item: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = parse(item);
    return parsed === null ? [] : [parsed];
  });
}
