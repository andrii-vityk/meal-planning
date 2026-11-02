import { useState } from "react";
import type { SlotOption } from "@/domain/framework";
import { DishPhoto } from "@/ui/features/recipes/DishPhoto";
import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./frameworks.module.css";

interface FrameworkDetailProps {
  frameworkId: string;
  onBack: () => void;
  onEdit: () => void;
}

/** A framework to read before cooking or planning; editing is one step further. */
export function FrameworkDetail({ frameworkId, onBack, onEdit }: FrameworkDetailProps) {
  const { frameworks, products } = useDependencies();
  const framework = useCollection(frameworks).items.get(frameworkId);
  const productItems = useCollection(products).items;
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const backButton = (
    <div>
      <button type="button" className="button button-secondary" onClick={onBack}>
        {strings.common.back}
      </button>
    </div>
  );

  if (!framework) {
    // Another client may have deleted it while it was open.
    return (
      <section className={styles.section}>
        <p className="hint">{strings.frameworks.notFound}</p>
        {backButton}
      </section>
    );
  }

  const optionName = (option: SlotOption) =>
    option.kind === "product" ? (productItems.get(option.productId)?.name ?? strings.recipes.unknownProduct) : option.text;

  const remove = async () => {
    await frameworks.remove(framework.id);
    onBack();
  };

  return (
    <article className={styles.section} aria-labelledby="framework-title">
      {backButton}

      <header className={styles.detailHeader}>
        <DishPhoto title={framework.title} large />
        <div className={styles.detailTitle}>
          <h2 id="framework-title" className={styles.heading}>
            {framework.title}
          </h2>
          <span className={styles.meta}>
            <span className={styles.chip}>{strings.dishes.kind.framework}</span>
            {framework.kidFriendly && <span className={styles.chip}>{strings.recipes.kidFriendly}</span>}
          </span>
        </div>
      </header>

      {framework.description && <p className={styles.description}>{framework.description}</p>}

      <section className={styles.section} aria-labelledby="framework-parts">
        <h3 id="framework-parts" className={styles.groupHeading}>
          {strings.frameworks.slots}
        </h3>
        <ul className={styles.parts}>
          {framework.slots.map((slot) => (
            <li key={slot.id} className={styles.part}>
              <h4 className={styles.partName}>
                {slot.name}
                {!slot.required && <span className={styles.optional}> · {strings.frameworks.optional}</span>}
              </h4>
              <ul className={styles.options} aria-label={`${strings.frameworks.options}: ${slot.name}`}>
                {slot.options.map((option) => (
                  <li key={option.id} className={styles.option}>
                    {optionName(option)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {framework.notes && (
        <section className={styles.section} aria-labelledby="framework-notes">
          <h3 id="framework-notes" className={styles.groupHeading}>
            {strings.frameworks.notes}
          </h3>
          <p className={styles.notes}>{framework.notes}</p>
        </section>
      )}

      <div className={styles.actions}>
        <button type="button" className="button button-secondary" onClick={onEdit}>
          {strings.common.edit}
        </button>
        {confirmingDelete ? (
          <>
            <span className="hint">{strings.frameworks.deleteQuestion}</span>
            <button type="button" className="button button-danger" onClick={() => void remove()}>
              {strings.common.confirmDelete}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirmingDelete(false)}>
              {strings.common.cancel}
            </button>
          </>
        ) : (
          <button type="button" className="button button-danger" onClick={() => setConfirmingDelete(true)}>
            {strings.common.delete}
          </button>
        )}
      </div>
    </article>
  );
}
