import type { CollectionSnapshot, Repository } from "@/application/ports/repository";
import type { PlatformCollection, PlatformDb, PlatformQuerySnapshot } from "./runtime";

export interface DocumentCodec<T> {
  /** Returns null for documents that are not valid entities. */
  parse(id: string, raw: unknown): T | null;
  serialize(item: T): Record<string, unknown>;
}

/** How long to wait for the first answer before reporting a problem. */
const LOAD_TIMEOUT_MS = 10_000;

/**
 * Repository backed by one collection of the host database.
 *
 * The database subscription opens when the first listener subscribes and
 * closes when the last one leaves. Every change, including writes from
 * other clients, produces a new snapshot.
 */
export class PlatformRepository<T extends { readonly id: string }> implements Repository<T> {
  private readonly collection: PlatformCollection;
  private snapshot: CollectionSnapshot<T> = { status: "loading", items: new Map() };
  private readonly listeners = new Set<() => void>();
  private unsubscribeFromDb: (() => void) | null = null;
  private loadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    db: PlatformDb,
    path: string,
    private readonly codec: DocumentCodec<T>,
  ) {
    this.collection = db.collection(path);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) this.open();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.close();
    };
  }

  getSnapshot(): CollectionSnapshot<T> {
    return this.snapshot;
  }

  async save(item: T): Promise<void> {
    await this.collection.doc(item.id).set(this.codec.serialize(item));
  }

  async remove(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  private open(): void {
    this.loadTimer = setTimeout(() => {
      if (this.snapshot.status === "loading") {
        this.publish({ status: "error", items: this.snapshot.items, errorMessage: "timeout" });
      }
    }, LOAD_TIMEOUT_MS);

    this.unsubscribeFromDb = this.collection.onSnapshot(
      (result) => this.receive(result),
      (error) => {
        this.clearTimer();
        this.publish({ status: "error", items: this.snapshot.items, errorMessage: error.code });
      },
    );
  }

  private close(): void {
    this.clearTimer();
    this.unsubscribeFromDb?.();
    this.unsubscribeFromDb = null;
  }

  private receive(result: PlatformQuerySnapshot): void {
    const items = new Map<string, T>();
    for (const document of result.docs) {
      const item = this.codec.parse(document.id, document.data());
      if (item) items.set(item.id, item);
    }
    // A cached copy is shown at once but the collection only counts as
    // loaded when the store itself has answered.
    if (!result.metadata.fromCache) this.clearTimer();
    const status = result.metadata.fromCache && this.snapshot.status !== "ready" ? "loading" : "ready";
    this.publish({ status, items });
  }

  private publish(snapshot: CollectionSnapshot<T>): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  private clearTimer(): void {
    if (this.loadTimer) clearTimeout(this.loadTimer);
    this.loadTimer = null;
  }
}
