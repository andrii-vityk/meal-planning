import { useState } from "react";
import { strings } from "@/ui/strings/uk";
import { FrameworksPanel } from "./FrameworksPanel";
import { ProductsPanel } from "./ProductsPanel";
import styles from "./pantry.module.css";

type Tab = "products" | "frameworks";
const tabs: readonly Tab[] = ["products", "frameworks"];

export function PantryView() {
  const [tab, setTab] = useState<Tab>("products");

  return (
    <div className={styles.view}>
      <div role="tablist" aria-label={strings.pantry.tabsLabel} className={styles.tabs}>
        {tabs.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`pantry-tab-${value}`}
            aria-selected={tab === value}
            aria-controls={`pantry-panel-${value}`}
            className={styles.tab}
            onClick={() => setTab(value)}
          >
            {strings.pantry[value]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pantry-panel-${tab}`} aria-labelledby={`pantry-tab-${tab}`}>
        {tab === "products" ? <ProductsPanel /> : <FrameworksPanel />}
      </div>
    </div>
  );
}
