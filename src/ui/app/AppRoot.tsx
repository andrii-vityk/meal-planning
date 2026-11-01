import { use } from "react";
import type { AppDependencies } from "@/application/dependencies";
import { DependenciesProvider } from "@/ui/dependencies";
import { App } from "./App";

/**
 * Waits for the dependencies, then renders the app with them.
 *
 * `use(promise)` suspends this component until the promise resolves; the
 * nearest <Suspense> boundary (in main.tsx) shows its fallback meanwhile.
 */
export function AppRoot({ dependencies }: { dependencies: Promise<AppDependencies> }) {
  const resolved = use(dependencies);
  return (
    <DependenciesProvider value={resolved}>
      <App />
    </DependenciesProvider>
  );
}
