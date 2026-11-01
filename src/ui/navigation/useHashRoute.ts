import { useSyncExternalStore } from "react";

/** Top-level sections, addressed as #name in the page URL. */
export const routes = ["recipes", "cook", "plan", "shopping", "pantry"] as const;

export type Route = (typeof routes)[number];

const defaultRoute: Route = "recipes";

function isRoute(value: string): value is Route {
  return (routes as readonly string[]).includes(value);
}

function readRoute(): Route {
  const hash = window.location.hash.slice(1);
  return isRoute(hash) ? hash : defaultRoute;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * The current section. The URL hash is state that lives outside React,
 * so it is read with the same useSyncExternalStore bridge as the repositories.
 */
export function useHashRoute(): Route {
  return useSyncExternalStore(subscribe, readRoute);
}
