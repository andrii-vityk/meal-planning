import { useSyncExternalStore } from "react";
import type { Route } from "./routes";
import { formatRoute, parseRoute } from "./routes";

/*
 * The URL hash is state that lives outside React. Components read it
 * through useSyncExternalStore and change it only through navigate() and
 * goBack(), so the browser history stays the single source of truth and
 * the system Back button walks the same screens the app showed.
 */

let cached: { readonly hash: string; readonly route: Route } | null = null;

/** Same hash, same object: useSyncExternalStore requires a stable snapshot. */
function getSnapshot(): Route {
  const hash = window.location.hash.slice(1);
  if (cached?.hash !== hash) cached = { hash, route: parseRoute(hash) };
  return cached.route;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * How many screens the app itself has opened before the current one in
 * this tab. Stored in the history entry, so it is right again after Back
 * and Forward. Zero means the screen was opened from a link or a reload.
 */
function appDepth(): number {
  const state: unknown = window.history.state;
  if (typeof state === "object" && state !== null && "appDepth" in state && typeof state.appDepth === "number") {
    return state.appDepth;
  }
  return 0;
}

interface NavigateOptions {
  /** Replace the current history entry instead of adding one (tabs, "saved, now show it"). */
  readonly replace?: boolean;
}

export function navigate(route: Route, { replace = false }: NavigateOptions = {}): void {
  const hash = `#${formatRoute(route)}`;
  if (hash === window.location.hash) return;
  const depth = replace ? appDepth() : appDepth() + 1;
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
  // Same URL, so only the new entry's state changes; no extra entry is added.
  window.history.replaceState({ appDepth: depth }, "");
  if (!replace) window.scrollTo(0, 0);
}

/**
 * The on-screen Back button: the same step as the system one when the app
 * opened this screen itself, otherwise (a screen opened from a link) a
 * jump to the given parent screen.
 */
export function goBack(fallback: Route): void {
  if (appDepth() > 0) window.history.back();
  else navigate(fallback, { replace: true });
}
