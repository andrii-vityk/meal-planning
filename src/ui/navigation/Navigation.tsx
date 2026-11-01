import { strings } from "@/ui/strings/uk";
import type { Route } from "./useHashRoute";
import { routes } from "./useHashRoute";
import styles from "./Navigation.module.css";

export function Navigation({ current }: { current: Route }) {
  return (
    <nav aria-label={strings.navigation.label} className={styles.nav}>
      <ul className={styles.list}>
        {routes.map((route) => (
          <li key={route}>
            <a
              href={`#${route}`}
              className={styles.link}
              aria-current={route === current ? "page" : undefined}
            >
              {strings.navigation[route]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
