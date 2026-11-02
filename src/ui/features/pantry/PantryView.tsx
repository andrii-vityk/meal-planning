import { DataPanel } from "@/ui/features/data/DataPanel";
import { goBack, navigate } from "@/ui/navigation/router";
import type { PantryScreen, PantryTab, Route } from "@/ui/navigation/routes";
import { pantryTabs } from "@/ui/navigation/routes";
import { strings } from "@/ui/strings/uk";
import { FrameworkForm } from "./FrameworkForm";
import { FrameworksPanel } from "./FrameworksPanel";
import { ProductsPanel } from "./ProductsPanel";
import styles from "./pantry.module.css";

const pantryRoute = (screen: PantryScreen): Route => ({ section: "pantry", screen });
const tabRoute = (tab: PantryTab) => pantryRoute({ kind: "tab", tab });

export function PantryView({ screen }: { screen: PantryScreen }) {
  if (screen.kind === "frameworkEdit") {
    return (
      <FrameworkForm
        key={screen.frameworkId ?? "new"}
        {...(screen.frameworkId && { frameworkId: screen.frameworkId })}
        onDone={() => goBack(tabRoute("frameworks"))}
      />
    );
  }

  const { tab } = screen;
  return (
    <div className={styles.view}>
      <div role="tablist" aria-label={strings.pantry.tabsLabel} className={styles.tabs}>
        {pantryTabs.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`pantry-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`pantry-panel-${value}`}
            className={styles.tab}
            // Switching tabs replaces the entry: Back leaves the section
            // instead of stepping through every tab that was looked at.
            onClick={() => navigate(tabRoute(value), { replace: true })}
          >
            {strings.pantry[value]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pantry-panel-${tab}`} aria-labelledby={`pantry-tab-${tab}`}>
        {tab === "products" ? (
          <ProductsPanel />
        ) : tab === "frameworks" ? (
          <FrameworksPanel
            onCreate={() => navigate(pantryRoute({ kind: "frameworkEdit" }))}
            onEdit={(frameworkId) => navigate(pantryRoute({ kind: "frameworkEdit", frameworkId }))}
          />
        ) : (
          <DataPanel />
        )}
      </div>
    </div>
  );
}
