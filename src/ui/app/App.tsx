import { strings } from "@/ui/strings/uk";
import styles from "./App.module.css";

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <h1 className={styles.title}>{strings.app.title}</h1>
        <p className={styles.tagline}>{strings.app.tagline}</p>
      </header>
      <main className={styles.main}>
        <section className={styles.empty} aria-labelledby="empty-heading">
          <h2 id="empty-heading" className={styles.emptyHeading}>
            {strings.emptyState.heading}
          </h2>
          <p className={styles.emptyBody}>{strings.emptyState.body}</p>
        </section>
      </main>
    </div>
  );
}
