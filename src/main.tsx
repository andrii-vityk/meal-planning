/**
 * Composition root.
 *
 * The only module allowed to know every layer. Later stages create the
 * infrastructure adapters here and hand them to the UI through context.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/ui/app/App";
import "@/ui/styles/global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root is missing from index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
