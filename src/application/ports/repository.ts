export type LoadStatus = "loading" | "ready" | "error";

/**
 * An immutable picture of a collection at one moment. A new object is
 * produced on every change, so consumers can compare snapshots by reference.
 */
export interface CollectionSnapshot<T> {
  readonly status: LoadStatus;
  readonly items: ReadonlyMap<string, T>;
  readonly errorMessage?: string;
}

/**
 * A live collection of entities.
 *
 * The shape (subscribe + getSnapshot) is deliberately the one React's
 * useSyncExternalStore expects, so any implementation plugs into the UI
 * without adapters. Changes may come from anywhere: this client, another
 * client editing at the same time, or an external writer.
 */
export interface Repository<T extends { readonly id: string }> {
  /** Calls the listener after every change; returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Must return the same object until something changes. */
  getSnapshot(): CollectionSnapshot<T>;
  save(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}
