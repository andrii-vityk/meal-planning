/**
 * Test helper: renders the whole app at the given address, as if the page
 * had been opened from a link ending in `#<address>`.
 */
import type { InMemoryOptions } from "@/infrastructure/memory/createInMemoryDependencies";
import { App } from "@/ui/app/App";
import { renderWithDependencies } from "./renderWithDependencies";

export function renderApp(address: string, options: InMemoryOptions = {}) {
  // replaceState changes the URL without a hashchange event, so the app
  // reads this address on its first render, like after a page load.
  window.history.replaceState(null, "", address === "" ? window.location.pathname : `#${address}`);
  return renderWithDependencies(<App />, options);
}
