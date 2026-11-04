import type { ReactNode } from "react";
import { createContext, use } from "react";
import type { AppDependencies } from "@/application/dependencies";

const DependenciesContext = createContext<AppDependencies | null>(null);

/** Makes the adapters built in the composition root available to every component below. */
export function DependenciesProvider({ value, children }: { value: AppDependencies; children: ReactNode }) {
  return <DependenciesContext value={value}>{children}</DependenciesContext>;
}

export function useDependencies(): AppDependencies {
  const dependencies = use(DependenciesContext);
  if (!dependencies) {
    throw new Error("useDependencies must be used inside <DependenciesProvider>");
  }
  return dependencies;
}
