/**
 * Composition root.
 *
 * The only module allowed to know every layer: it decides which adapters
 * the app runs on and hands them to the UI.
 */
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import type { AppDependencies } from "@/application/dependencies";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { createPlatformDependencies } from "@/infrastructure/platform/createPlatformDependencies";
import { connectPlatform } from "@/infrastructure/platform/runtime";
import { AppRoot } from "@/ui/app/AppRoot";
import { BootScreen } from "@/ui/app/BootScreen";
import "@/ui/styles/global.css";

async function createDependencies(): Promise<AppDependencies> {
  const platform = await connectPlatform();
  // Outside the artifact host (local development) the app runs on
  // in-memory adapters with invented example data.
  return platform ? createPlatformDependencies(platform) : createInMemoryDependencies({ withSampleData: true });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root is missing from index.html");
}

// Created once, outside React, so re-renders never start a second connection.
const dependencies = createDependencies();

createRoot(container).render(
  <StrictMode>
    <Suspense fallback={<BootScreen />}>
      <AppRoot dependencies={dependencies} />
    </Suspense>
  </StrictMode>,
);
