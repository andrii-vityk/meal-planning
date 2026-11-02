import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addProduct } from "@/application/catalog";
import { startOfWeek } from "@/domain/calendar";
import type { DishMatch } from "@/domain/dishMatching";
import { matchDishes } from "@/domain/dishMatching";
import type { Dish } from "@/domain/plan";
import { findProductByName } from "@/domain/product";
import { aiErrorMessage, isCancellation } from "@/ui/aiErrors";
import { todayIso } from "@/ui/dates";
import { PlanEntryPanel } from "@/ui/features/plan/PlanEntryPanel";
import { useBackClosable } from "@/ui/hooks/useBackClosable";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import { MatchCard } from "./MatchCard";
import styles from "./cook.module.css";

const missingLimits = [0, 1, 2, 3] as const;

/** A match as a plan dish: a framework keeps the options chosen for what is at home. */
const dishOf = (match: DishMatch): Dish =>
  match.kind === "recipe"
    ? { kind: "recipe", recipeId: match.recipe.id }
    : { kind: "framework", frameworkId: match.framework.id, choices: match.choices };

export function CookView() {
  const dependencies = useDependencies();
  const products = useCollection(dependencies.products).items;
  const recipes = useCollection(dependencies.recipes).items;
  const frameworks = useCollection(dependencies.frameworks).items;
  const productListId = useId();

  const [text, setText] = useState("");
  const [available, setAvailable] = useState<ReadonlySet<string>>(new Set());
  const [unknownNames, setUnknownNames] = useState<readonly string[]>([]);
  const [manualName, setManualName] = useState("");
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState(false);
  const [maxMissing, setMaxMissing] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [isRecognizing, startRecognizing] = useTransition();
  const controller = useRef<AbortController | null>(null);
  const [planned, openPlanPanel, closePlanPanel] = useBackClosable<Dish>();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const recognize = () => {
    setError(null);
    controller.current?.abort();
    controller.current = new AbortController();
    const { signal } = controller.current;
    startRecognizing(async () => {
      try {
        const result = await dependencies.ai.matchProducts(text, [...products.values()], signal);
        setAvailable(new Set(result.productIds));
        setUnknownNames(result.unknownNames);
      } catch (caught) {
        if (!isCancellation(caught)) setError(aiErrorMessage(caught));
      }
    });
  };

  const include = (productId: string) => setAvailable((current) => new Set([...current, productId]));
  const exclude = (productId: string) =>
    setAvailable((current) => new Set([...current].filter((id) => id !== productId)));

  const addUnknown = async (name: string) => {
    const product = await addProduct(dependencies, name);
    include(product.id);
    setUnknownNames((current) => current.filter((item) => item !== name));
  };

  const addManual = () => {
    const product = findProductByName(products.values(), manualName);
    if (product) {
      include(product.id);
      setManualName("");
    } else if (manualName.trim() !== "") {
      void addUnknown(manualName.trim()).then(() => setManualName(""));
    }
  };

  // Recomputed on every render from the current inputs and collections:
  // a recipe added in another tab shows up here without any extra code.
  const matches =
    available.size > 0
      ? matchDishes(
          { available, products, recipes: recipes.values(), frameworks: frameworks.values() },
          { maxMissing, kidFriendlyOnly },
        )
      : [];

  const availableProducts = [...available].flatMap((id) => {
    const product = products.get(id);
    return product ? [product] : [];
  });

  return (
    <section className={styles.section} aria-labelledby="cook-heading">
      <h2 id="cook-heading" className={styles.heading}>
        {strings.cook.heading}
      </h2>
      <p className="hint">{strings.cook.intro}</p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          recognize();
        }}
      >
        <label className="field">
          <span className="label">{strings.cook.available}</span>
          <textarea
            id="cook-available"
            className="input"
            rows={3}
            placeholder={strings.cook.placeholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className={styles.actions}>
          <button type="submit" className="button" disabled={isRecognizing || text.trim() === ""}>
            {isRecognizing ? strings.cook.finding : strings.cook.find}
          </button>
        </div>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.block}>
        <h3 className={styles.subheading}>{strings.cook.recognized}</h3>
        {availableProducts.length > 0 && (
          <ul className={styles.chips}>
            {availableProducts.map((product) => (
              <li key={product.id} className={styles.chip}>
                <span>{product.name}</span>
                <button
                  type="button"
                  className={styles.chipRemove}
                  aria-label={strings.cook.removeProduct(product.name)}
                  onClick={() => exclude(product.id)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        {unknownNames.length > 0 && (
          <div className={styles.unknown}>
            <span className="hint">{strings.cook.unknown}:</span>
            {unknownNames.map((name) => (
              <button key={name} type="button" className="button button-secondary" onClick={() => void addUnknown(name)}>
                {strings.cook.addUnknown(name)}
              </button>
            ))}
          </div>
        )}
        <form
          className={styles.manual}
          onSubmit={(event) => {
            event.preventDefault();
            addManual();
          }}
        >
          <datalist id={productListId}>
            {[...products.values()].map((product) => (
              <option key={product.id} value={product.name} />
            ))}
          </datalist>
          <input
            id="cook-manual"
            className="input"
            list={productListId}
            aria-label={strings.cook.addManually}
            placeholder={strings.cook.addManually}
            value={manualName}
            onChange={(event) => setManualName(event.target.value)}
          />
          <button type="submit" className="button button-secondary" disabled={manualName.trim() === ""}>
            {strings.cook.addManuallyAction}
          </button>
        </form>
      </div>

      <div className={styles.filters}>
        <label className={styles.inline}>
          <input
            id="cook-kid-friendly"
            type="checkbox"
            checked={kidFriendlyOnly}
            onChange={(event) => setKidFriendlyOnly(event.target.checked)}
          />
          <span>{strings.cook.kidFriendlyOnly}</span>
        </label>
        <label className={styles.inline}>
          <span>{strings.cook.maxMissing}</span>
          <select
            id="cook-max-missing"
            className="input"
            value={maxMissing}
            onChange={(event) => setMaxMissing(Number(event.target.value))}
          >
            {missingLimits.map((count) => (
              <option key={count} value={count}>
                {strings.cook.maxMissingOption(count)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}

      <section className={styles.block} aria-labelledby="cook-results">
        <h3 id="cook-results" className={styles.subheading}>
          {strings.cook.results}
        </h3>
        {available.size === 0 ? (
          <p className="hint">{strings.cook.nothingYet}</p>
        ) : matches.length === 0 ? (
          <p className="hint">{strings.cook.noResults}</p>
        ) : (
          <ul className={styles.results}>
            {matches.map((match) => (
              <MatchCard
                key={match.kind === "recipe" ? `r-${match.recipe.id}` : `f-${match.framework.id}`}
                match={match}
                available={availableProducts}
                onAddToPlan={() => openPlanPanel(dishOf(match))}
              />
            ))}
          </ul>
        )}
      </section>
      {planned && (
        <PlanEntryPanel
          weekStart={startOfWeek(todayIso())}
          initialDish={planned}
          onClose={closePlanPanel}
          onSaved={({ title }) => {
            setNotice(strings.plan.saved(title));
            closePlanPanel();
          }}
        />
      )}
    </section>
  );
}
