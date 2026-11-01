import type { CSSProperties } from "react";
import styles from "./recipes.module.css";

const hues = [28, 95, 150, 200, 255, 330];

/** Stable hue for a title, so a dish keeps its color between visits. */
function hueFor(title: string): number {
  let hash = 0;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hues[hash % hues.length] ?? hues[0] ?? 0;
}

/** Placeholder picture for a dish without a photo: its initial on a tinted tile. */
export function DishTile({ title, large = false }: { title: string; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={large ? `${styles.tile} ${styles.tileLarge}` : styles.tile}
      style={{ "--tile-hue": hueFor(title) } as CSSProperties}
    >
      {title.trim().charAt(0).toLocaleUpperCase("uk")}
    </span>
  );
}
