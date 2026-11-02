import { useState, useTransition } from "react";
import { addProduct } from "@/application/catalog";
import type { Product } from "@/domain/product";
import { productCategories } from "@/domain/product";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { ProductRow } from "./ProductRow";
import styles from "./products.module.css";

function matches(product: Product, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("uk");
  return needle === "" || [product.name, ...product.aliases].some((name) => name.toLocaleLowerCase("uk").includes(needle));
}

export function ProductsPanel() {
  const dependencies = useDependencies();
  const snapshot = useCollection(dependencies.products);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);
  const [isAdding, startAdding] = useTransition();

  const add = () => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    setFailed(false);
    startAdding(async () => {
      try {
        await addProduct(dependencies, trimmed);
        setName("");
      } catch {
        setFailed(true);
      }
    });
  };

  const visible = [...snapshot.items.values()].filter((product) => matches(product, query));
  const groups = productCategories
    .map((category) => ({
      category,
      products: visible
        .filter((product) => product.category === category)
        .toSorted((a, b) => a.name.localeCompare(b.name, "uk")),
    }))
    .filter((group) => group.products.length > 0);

  return (
    <section className={styles.section} aria-labelledby="products-heading">
      <h2 id="products-heading" className={styles.heading}>
        {strings.products.heading}
      </h2>

      <form
        className={styles.addRow}
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <input
          id="new-product-name"
          className="input"
          placeholder={strings.products.addPlaceholder}
          aria-label={strings.products.addLabel}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isAdding}
        />
        <button type="submit" className="button" disabled={isAdding || name.trim() === ""}>
          {isAdding ? strings.products.adding : strings.products.add}
        </button>
      </form>
      <p className="hint">{strings.products.addHint}</p>
      {failed && (
        <p className="error" role="alert">
          {strings.common.unexpectedError}
        </p>
      )}
      <p className="hint">{strings.products.stapleHint}</p>

      {snapshot.items.size === 0 ? (
        <p className="hint">{snapshot.status === "loading" ? strings.data.loading : strings.products.empty}</p>
      ) : (
        <>
          <input
            id="product-filter"
            type="search"
            className="input"
            placeholder={strings.products.filter}
            aria-label={strings.products.filter}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {groups.map((group) => (
            <section key={group.category} className={styles.group} aria-labelledby={`category-${group.category}`}>
              <h3 id={`category-${group.category}`} className={styles.groupHeading}>
                {strings.categories[group.category]}
              </h3>
              <ul className={styles.list}>
                {group.products.map((product) => (
                  <ProductRow key={product.id} product={product} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
