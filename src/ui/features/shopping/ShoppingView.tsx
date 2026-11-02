import { useState } from "react";
import { addShoppingItem, setShoppingStatus } from "@/application/planning";
import type { IsoDate } from "@/domain/calendar";
import { startOfWeek } from "@/domain/calendar";
import type { ShoppingLine } from "@/domain/shoppingList";
import { buildShoppingList } from "@/domain/shoppingList";
import type { ShoppingStatus } from "@/domain/weekPlanning";
import { weekPlan } from "@/domain/weekPlanning";
import { WeekSwitcher } from "@/ui/components/WeekSwitcher";
import { todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { formatQuantity } from "@/ui/format";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./shopping.module.css";

function describe(line: ShoppingLine): string {
  const parts = line.quantities.map(formatQuantity);
  if (line.hasUnquantifiedUse) parts.push(strings.shopping.asNeeded);
  return parts.join(" + ");
}

export function ShoppingView() {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const entries = useCollection(dependencies.planEntries).items;
  const checks = useCollection(dependencies.shoppingChecks).items;
  const manualItems = useCollection(dependencies.shoppingItems).items;

  const [weekStart, setWeekStart] = useState<IsoDate>(() => startOfWeek(todayIso()));
  const [newItem, setNewItem] = useState("");
  const [failed, setFailed] = useState(false);

  // Every change is a write to the shared base; a failed one is reported, not swallowed.
  const run = (write: Promise<unknown>) => {
    setFailed(false);
    write.catch(() => setFailed(true));
  };
  const setStatus = (productId: string, status: ShoppingStatus | null) =>
    run(setShoppingStatus(dependencies, weekStart, productId, status));

  const groups = buildShoppingList(weekPlan(weekStart, entries.values()), { products, recipes, frameworks });
  const statuses = new Map(
    [...checks.values()].filter((check) => check.weekStart === weekStart).map((check) => [check.productId, check.status]),
  );
  // Lines already at home leave the list and are collected at the bottom.
  const toBuy = groups
    .map((group) => ({ ...group, lines: group.lines.filter((line) => statuses.get(line.productId) !== "atHome") }))
    .filter((group) => group.lines.length > 0);
  const atHome = groups.flatMap((group) => group.lines.filter((line) => statuses.get(line.productId) === "atHome"));
  const manual = [...manualItems.values()].filter((item) => item.weekStart === weekStart);

  return (
    <section className={styles.section} aria-labelledby="shopping-heading">
      <div className={styles.toolbar}>
        <h2 id="shopping-heading" className={styles.heading}>
          {strings.shopping.heading}
        </h2>
        <WeekSwitcher weekStart={weekStart} onChange={setWeekStart} />
      </div>
      <p className="hint">{strings.shopping.stapleNote}</p>

      {groups.length === 0 && manual.length === 0 && <p className="hint">{strings.shopping.empty}</p>}

      {failed && (
        <p className="error" role="alert">
          {strings.shopping.saveFailed}
        </p>
      )}

      {toBuy.map((group) => (
        <section key={group.category} className={styles.group} aria-labelledby={`shopping-${group.category}`}>
          <h3 id={`shopping-${group.category}`} className={styles.groupHeading}>
            {strings.categories[group.category]}
          </h3>
          <ul className={styles.list}>
            {group.lines.map((line) => {
              const isBought = statuses.get(line.productId) === "bought";
              return (
                <li key={line.productId} className={styles.manualRow}>
                  <label className={isBought ? `${styles.line} ${styles.done}` : styles.line}>
                    <input
                      type="checkbox"
                      checked={isBought}
                      aria-label={strings.shopping.bought(line.name)}
                      onChange={(event) => setStatus(line.productId, event.target.checked ? "bought" : null)}
                    />
                    <span className={styles.name}>{line.name}</span>
                    <span className={styles.amount}>{describe(line)}</span>
                  </label>
                  {!isBought && (
                    <button
                      type="button"
                      className={styles.atHome}
                      aria-label={strings.shopping.markAtHome(line.name)}
                      onClick={() => setStatus(line.productId, "atHome")}
                    >
                      {strings.shopping.atHome}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {atHome.length > 0 && (
        <section className={styles.group} aria-labelledby="shopping-at-home">
          <h3 id="shopping-at-home" className={styles.groupHeading}>
            {strings.shopping.atHomeGroup}
          </h3>
          <ul className={styles.list}>
            {atHome.map((line) => (
              <li key={line.productId} className={`${styles.manualRow} ${styles.homeRow}`}>
                <span className={styles.name}>{line.name}</span>
                <button
                  type="button"
                  className={styles.atHome}
                  aria-label={strings.shopping.backToList(line.name)}
                  onClick={() => setStatus(line.productId, null)}
                >
                  {strings.shopping.backToListShort}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.group} aria-labelledby="shopping-manual">
        <h3 id="shopping-manual" className={styles.groupHeading}>
          {strings.shopping.manual}
        </h3>
        {manual.length > 0 && (
          <ul className={styles.list}>
            {manual.map((item) => (
              <li key={item.id} className={styles.manualRow}>
                <label className={item.checked ? `${styles.line} ${styles.done}` : styles.line}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    aria-label={strings.shopping.bought(item.text)}
                    onChange={(event) => run(dependencies.shoppingItems.save({ ...item, checked: event.target.checked }))}
                  />
                  <span className={styles.name}>{item.text}</span>
                </label>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => run(dependencies.shoppingItems.remove(item.id))}
                >
                  {strings.common.remove}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className={styles.addRow}
          onSubmit={(event) => {
            event.preventDefault();
            run(addShoppingItem(dependencies, weekStart, newItem));
            setNewItem("");
          }}
        >
          <input
            id="shopping-new-item"
            className="input"
            aria-label={strings.shopping.addLabel}
            placeholder={strings.shopping.addPlaceholder}
            value={newItem}
            onChange={(event) => setNewItem(event.target.value)}
          />
          <button type="submit" className="button button-secondary" disabled={newItem.trim() === ""}>
            {strings.shopping.add}
          </button>
        </form>
      </section>
    </section>
  );
}
