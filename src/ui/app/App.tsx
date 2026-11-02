import { Activity, useState } from "react";
import { CookView } from "@/ui/features/cook/CookView";
import { PantryView } from "@/ui/features/pantry/PantryView";
import { PlanView } from "@/ui/features/plan/PlanView";
import { RecipesView } from "@/ui/features/recipes/RecipesView";
import { ShoppingView } from "@/ui/features/shopping/ShoppingView";
import { Navigation } from "@/ui/navigation/Navigation";
import { useRoute } from "@/ui/navigation/router";
import type { Route, Section } from "@/ui/navigation/routes";
import { sections } from "@/ui/navigation/routes";
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
    case "recipes":
      return <RecipesView screen={route.screen} />;
    case "pantry":
      return <PantryView screen={route.screen} />;
  }
}

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
        <h1 className={styles.title}>{strings.app.title}</h1>
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
