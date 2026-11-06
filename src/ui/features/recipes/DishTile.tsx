import styles from "./recipes.module.css";

/** Placeholder picture for a dish without a photo: its initial on a muted tile. */
export function DishTile({ title, large = false }: { title: string; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={large ? `${styles.tile} ${styles.tileLarge}` : styles.tile}
    >
      {title.trim().charAt(0).toLocaleUpperCase("uk")}
    </span>
  );
}
