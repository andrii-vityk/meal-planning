/** A new random identifier for an entity. */
export function newId(): string {
  return crypto.randomUUID();
}
