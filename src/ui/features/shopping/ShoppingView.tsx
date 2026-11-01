import { useState } from "react";
import { addShoppingItem, setBought } from "@/application/planning";
import type { IsoDate } from "@/domain/calendar";
import { startOfWeek } from "@/domain/calendar";
import type { ShoppingLine } from "@/domain/shoppingList";
import { buildShoppingList } from "@/domain/shoppingList";
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

  const groups = buildShoppingList(weekPlan(weekStart, entries.values()), { products, recipes, frameworks });
  const bought = new Set(
    [...checks.values()].filter((check) => check.weekStart === weekStart).map((check) => check.productId),
  );
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

      {groups.map((group) => (
        <section key={group.category} className={styles.group} aria-labelledby={`shopping-${group.category}`}>
          <h3 id={`shopping-${group.category}`} className={styles.groupHeading}>
            {strings.categories[group.category]}
          </h3>
          <ul className={styles.list}>
            {group.lines.map((line) => {
              const isBought = bought.has(line.productId);
              return (
                <li key={line.productId}>
                  <label className={isBought ? `${styles.line} ${styles.done}` : styles.line}>
                    <input
                      type="checkbox"
                      checked={isBought}
                      aria-label={strings.shopping.bought(line.name)}
                      onChange={(event) => void setBought(dependencies, weekStart, line.productId, event.target.checked)}
                    />
                    <span className={styles.name}>{line.name}</span>
                    <span className={styles.amount}>{describe(line)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

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
                    onChange={(event) => void dependencies.shoppingItems.save({ ...item, checked: event.target.checked })}
                  />
                  <span className={styles.name}>{item.text}</span>
                </label>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => void dependencies.shoppingItems.remove(item.id)}
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
            void addShoppingItem(dependencies, weekStart, newItem);
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
