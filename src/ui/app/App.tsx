import { CookView } from "@/ui/features/cook/CookView";
import { PantryView } from "@/ui/features/pantry/PantryView";
import { RecipesView } from "@/ui/features/recipes/RecipesView";
import { Navigation } from "@/ui/navigation/Navigation";
import type { Route } from "@/ui/navigation/useHashRoute";
import { useHashRoute } from "@/ui/navigation/useHashRoute";
import { strings } from "@/ui/strings/uk";
import styles from "./App.module.css";

function Section({ route }: { route: Route }) {
  switch (route) {
    case "recipes":
      return <RecipesView />;
    case "cook":
      return <CookView />;
    case "pantry":
      return <PantryView />;
  }
}

export function App() {
  const route = useHashRoute();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{strings.app.title}</h1>
        <Navigation current={route} />
      </header>
      <main className={styles.main}>
        {/* key: switching sections starts the new one from its first screen */}
        <Section key={route} route={route} />
      </main>
    </div>
  );
}
