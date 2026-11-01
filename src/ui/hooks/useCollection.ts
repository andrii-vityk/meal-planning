import { useSyncExternalStore } from "react";
import type { CollectionSnapshot, Repository } from "@/application/ports/repository";

/**
 * Subscribes a component to a repository. The component re-renders whenever
 * the collection changes, whoever changed it.
 *
 * useSyncExternalStore is React's built-in bridge to state that lives
 * outside React: no useEffect, no copying into useState.
 */
export function useCollection<T extends { readonly id: string }>(repository: Repository<T>): CollectionSnapshot<T> {
  return useSyncExternalStore(
    (onChange) => repository.subscribe(onChange),
    () => repository.getSnapshot(),
  );
}
