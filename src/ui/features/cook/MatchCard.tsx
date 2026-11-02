import { useState, useTransition } from "react";
import type { Substitution } from "@/application/ports/ai";
import type { DishMatch } from "@/domain/dishMatching";
import type { Product } from "@/domain/product";
import { aiErrorMessage } from "@/ui/aiErrors";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./cook.module.css";

interface MatchCardProps {
  match: DishMatch;
  available: readonly Product[];
  onAddToPlan: () => void;
}

export function MatchCard({ match, available, onAddToPlan }: MatchCardProps) {
  const { ai, products } = useDependencies();
  const productItems = useCollection(products).items;
  const [substitutions, setSubstitutions] = useState<readonly Substitution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuggesting, startSuggesting] = useTransition();

  const nameOf = (productId: string) => productItems.get(productId)?.name ?? "?";

  const missingProducts =
    match.kind === "recipe"
      ? match.missingProductIds.flatMap((id) => {
          const product = productItems.get(id);
          return product ? [product] : [];
        })
      : [];

  const suggest = () => {
    setError(null);
    startSuggesting(async () => {
      try {
        setSubstitutions(await ai.suggestSubstitutions(missingProducts, available));
      } catch (caught) {
        setError(aiErrorMessage(caught));
      }
    });
  };

  const title = match.kind === "recipe" ? match.recipe.title : match.framework.title;

  return (
    <li className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.kind}>{match.kind === "recipe" ? strings.cook.recipe : strings.cook.framework}</span>
      </div>

      {match.kind === "recipe" ? (
        match.missingProductIds.length === 0 ? (
          <span className={styles.ok}>{strings.cook.allThere}</span>
        ) : (
          <span>
            {strings.cook.missing}: {match.missingProductIds.map(nameOf).join(", ")}
          </span>
        )
      ) : (
        <>
          <ul className={styles.choices}>
            {match.framework.slots.flatMap((slot) => {
              const option = slot.options.find((candidate) => candidate.id === match.choices[slot.id]);
              if (!option) return [];
              return [
                <li key={slot.id}>
                  <strong>{slot.name}:</strong> {option.kind === "product" ? nameOf(option.productId) : option.text}
                </li>,
              ];
            })}
          </ul>
          {match.missingSlotIds.length > 0 ? (
            <span>
              {strings.cook.missingSlots}:{" "}
              {match.missingSlotIds
                .map((slotId) => match.framework.slots.find((slot) => slot.id === slotId)?.name ?? "?")
                .join(", ")}
            </span>
          ) : (
            <span className={styles.ok}>{strings.cook.allThere}</span>
          )}
        </>
      )}

      <div className={styles.cardActions}>
        <button type="button" className="button" onClick={onAddToPlan}>
          {strings.plan.addToPlan}
        </button>
        {missingProducts.length > 0 && substitutions === null && (
          <button type="button" className="button button-secondary" onClick={suggest} disabled={isSuggesting}>
            {isSuggesting ? strings.cook.suggesting : strings.cook.suggest}
          </button>
        )}
      </div>
      {substitutions !== null &&
        (substitutions.length === 0 ? (
          <p className="hint">{strings.cook.noSubstitutions}</p>
        ) : (
          <ul className={styles.substitutions}>
            {substitutions.map((item) => (
              <li key={item.productId}>{strings.cook.substitute(nameOf(item.productId), item.suggestion)}</li>
            ))}
          </ul>
        ))}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </li>
  );
}
