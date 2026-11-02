import { useEffect, useState } from "react";

/*
 * A layer over the current screen (a bottom sheet) that the system Back
 * button closes, as people expect on a phone.
 *
 * Opening adds a history entry with the same address and a marker in its
 * state; Back removes that entry, the browser fires popstate, and the layer
 * closes. Closing from a button goes through the same history step, so the
 * entry never stays behind. The entry is added in the event handler, not in
 * an effect, so StrictMode's double effects cannot add it twice.
 */

const marker = "layer";

function isLayerEntry(state: unknown): boolean {
  return typeof state === "object" && state !== null && marker in state;
}

function currentState(): object {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null ? state : {};
}

export function useBackClosable<T>(): readonly [T | null, (value: T) => void, () => void] {
  const [value, setValue] = useState<T | null>(null);

  useEffect(() => {
    if (value === null) return;
    const onPopState = () => {
      if (!isLayerEntry(window.history.state)) setValue(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [value]);

  const open = (next: T) => {
    if (!isLayerEntry(window.history.state)) {
      window.history.pushState({ ...currentState(), [marker]: true }, "");
    }
    setValue(next);
  };

  const close = () => {
    if (isLayerEntry(window.history.state)) window.history.back();
    else setValue(null);
  };

  return [value, open, close] as const;
}
