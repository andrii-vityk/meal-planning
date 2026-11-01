/**
 * Test helper: renders a component with in-memory dependencies.
 * Lives outside the layers, like the composition root, because it wires
 * infrastructure into the UI.
 */
import type { RenderResult } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { AppDependencies } from "@/application/dependencies";
import type { InMemoryOptions } from "@/infrastructure/memory/createInMemoryDependencies";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { DependenciesProvider } from "@/ui/dependencies";

export function renderWithDependencies(
  element: ReactElement,
  options: InMemoryOptions & { dependencies?: AppDependencies } = {},
): RenderResult & { dependencies: AppDependencies } {
  const dependencies = options.dependencies ?? createInMemoryDependencies(options);
  const result = render(<DependenciesProvider value={dependencies}>{element}</DependenciesProvider>);
  return { ...result, dependencies };
}
