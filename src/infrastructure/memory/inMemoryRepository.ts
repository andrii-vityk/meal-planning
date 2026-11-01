import type { CollectionSnapshot, Repository } from "@/application/ports/repository";

/**
 * Repository kept in memory. Used in tests and for local development,
 * where the platform database is not available.
 */
export class InMemoryRepository<T extends { readonly id: string }> implements Repository<T> {
  private snapshot: CollectionSnapshot<T>;
  private readonly listeners = new Set<() => void>();

  constructor(initial: readonly T[] = []) {
    this.snapshot = { status: "ready", items: new Map(initial.map((item) => [item.id, item])) };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): CollectionSnapshot<T> {
    return this.snapshot;
  }

  save(item: T): Promise<void> {
    const items = new Map(this.snapshot.items);
    items.set(item.id, item);
    this.replace(items);
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    if (!this.snapshot.items.has(id)) return Promise.resolve();
    const items = new Map(this.snapshot.items);
    items.delete(id);
    this.replace(items);
    return Promise.resolve();
  }

  private replace(items: ReadonlyMap<string, T>): void {
    // A new snapshot object on every change: that is how subscribers notice it.
    this.snapshot = { status: "ready", items };
    for (const listener of this.listeners) listener();
  }
}
