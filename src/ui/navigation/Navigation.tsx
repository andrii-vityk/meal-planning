import type { MouseEvent } from "react";
import { strings } from "@/ui/strings/uk";
import { navigate } from "./router";
import type { Route, Section } from "./routes";
import { formatRoute, sectionRoot, sections } from "./routes";
import styles from "./Navigation.module.css";

interface NavigationProps {
  current: Section;
  lastRoutes: Readonly<Partial<Record<Section, Route>>>;
}

/**
 * A section link returns to the screen last open there; the link of the
 * current section goes back to its first screen.
 */
export function Navigation({ current, lastRoutes }: NavigationProps) {
  return (
    <nav aria-label={strings.navigation.label} className={styles.nav}>
      <ul className={styles.list}>
        {sections.map((section) => {
          const target = section === current ? sectionRoot(section) : (lastRoutes[section] ?? sectionRoot(section));
          const open = (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            navigate(target);
          };
          return (
            <li key={section} className={styles.item}>
              <a
                href={`#${formatRoute(target)}`}
                className={styles.link}
                aria-current={section === current ? "page" : undefined}
                onClick={open}
              >
                {strings.navigation[section]}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
