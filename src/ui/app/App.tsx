import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./App.module.css";

export function App() {
  const { products, recipes, frameworks } = useDependencies();
  const productSnapshot = useCollection(products);
  const recipeSnapshot = useCollection(recipes);
  const frameworkSnapshot = useCollection(frameworks);

  const snapshots = [productSnapshot, recipeSnapshot, frameworkSnapshot];
  const loading = snapshots.some((snapshot) => snapshot.status === "loading");
  const failed = snapshots.some((snapshot) => snapshot.status === "error");

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{strings.app.title}</h1>
        <p className={styles.tagline}>{strings.app.tagline}</p>
      </header>
      <main className={styles.main}>
        <p className={styles.tagline} role="status">
          {loading
            ? strings.data.loading
            : strings.data.summary(productSnapshot.items.size, recipeSnapshot.items.size, frameworkSnapshot.items.size)}
        </p>
        {failed && <p role="alert">{strings.data.unreachable}</p>}
        {recipeSnapshot.items.size === 0 && !loading && (
          <section className={styles.empty} aria-labelledby="empty-heading">
            <h2 id="empty-heading" className={styles.emptyHeading}>
              {strings.emptyState.heading}
            </h2>
            <p className={styles.emptyBody}>{strings.emptyState.body}</p>
          </section>
        )}
      </main>
    </div>
  );
}
