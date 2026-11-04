import { strings } from "@/ui/strings/uk";
import styles from "./App.module.css";

export function BootScreen() {
  return (
    <div className={styles.shell}>
      <p className={styles.tagline} role="status">
        {strings.app.loading}
      </p>
    </div>
  );
}
