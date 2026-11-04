import { Activity, useState } from "react";
import { CookView } from "@/ui/features/cook/CookView";
import { AiLogPanel } from "@/ui/features/data/AiLogPanel";
import { DataPanel } from "@/ui/features/data/DataPanel";
import { DishesView } from "@/ui/features/dishes/DishesView";
import { PlanView } from "@/ui/features/plan/PlanView";
import { ProductsPanel } from "@/ui/features/products/ProductsPanel";
import { ShoppingView } from "@/ui/features/shopping/ShoppingView";
import { Navigation } from "@/ui/navigation/Navigation";
import { navigate, useRoute } from "@/ui/navigation/router";
import type { Route, Section } from "@/ui/navigation/routes";
import { formatRoute, sectionRoot, sections } from "@/ui/navigation/routes";
import { strings } from "@/ui/strings/uk";
import styles from "./App.module.css";

function SectionContent({ route }: { route: Route }) {
  switch (route.section) {
    case "plan":
      return <PlanView />;
    case "cook":
      return <CookView />;
    case "shopping":
      return <ShoppingView />;
    case "dishes":
      return <DishesView screen={route.screen} />;
    case "products":
      return <ProductsPanel />;
    case "backup":
      return (
        <>
          <DataPanel />
          <AiLogPanel />
        </>
      );
  }
}

const backupRoute = sectionRoot("backup");

type LastRoutes = Readonly<Partial<Record<Section, Route>>>;

export function App() {
  const route = useRoute();

  // The last screen seen in each visited section. Updated during render
  // when the route changes ("storing information from previous renders"),
  // so there is no extra render with stale data, as an effect would cause.
  const [lastRoutes, setLastRoutes] = useState<LastRoutes>(() => ({ [route.section]: route }));
  if (lastRoutes[route.section] !== route) {
    setLastRoutes({ ...lastRoutes, [route.section]: route });
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{strings.app.title}</h1>
          <a
            href={`#${formatRoute(backupRoute)}`}
            className={styles.secondaryLink}
            aria-current={route.section === "backup" ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              navigate(backupRoute);
            }}
          >
            {strings.navigation.backup}
          </a>
        </div>
        <Navigation current={route.section} lastRoutes={lastRoutes} />
      </header>
      <main className={styles.main}>
        {/*
          Every visited section stays mounted inside <Activity>. A hidden
          section keeps its state (typed text, open screen, chosen week) but
          does not run effects or take part in layout until shown again.
        */}
        {sections.map((section) => {
          const sectionRoute = lastRoutes[section];
          if (!sectionRoute) return null;
          return (
            <Activity key={section} mode={section === route.section ? "visible" : "hidden"}>
              <SectionContent route={sectionRoute} />
            </Activity>
          );
        })}
      </main>
    </div>
  );
}
