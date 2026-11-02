import { useDependencies } from "@/ui/dependencies";
import { useCollection } from "@/ui/hooks/useCollection";
import { strings } from "@/ui/strings/uk";
import styles from "./pantry.module.css";

interface FrameworksPanelProps {
  onCreate: () => void;
  onEdit: (frameworkId: string) => void;
}

export function FrameworksPanel({ onCreate, onEdit }: FrameworksPanelProps) {
  const { frameworks, products } = useDependencies();
  const snapshot = useCollection(frameworks);
  const productItems = useCollection(products).items;

  const list = [...snapshot.items.values()].toSorted((a, b) => a.title.localeCompare(b.title, "uk"));

  return (
    <section className={styles.section} aria-labelledby="frameworks-heading">
      <div className={styles.toolbar}>
        <h2 id="frameworks-heading" className={styles.heading}>
          {strings.frameworks.heading}
        </h2>
        <button type="button" className="button" onClick={onCreate}>
          {strings.frameworks.create}
        </button>
      </div>
      <p className="hint">{strings.frameworks.intro}</p>

      {list.length === 0 ? (
        <p className="hint">{snapshot.status === "loading" ? strings.data.loading : strings.frameworks.empty}</p>
      ) : (
        <ul className={styles.list}>
          {list.map((framework) => (
            <li key={framework.id}>
              <button
                type="button"
                className={styles.frameworkCard}
                onClick={() => onEdit(framework.id)}
              >
                <span className={styles.itemName}>{framework.title}</span>
                {framework.description && <span className="hint">{framework.description}</span>}
                <span className={styles.slots}>
                  {framework.slots.map((slot) => (
                    <span key={slot.id} className={styles.slotSummary}>
                      <strong>
                        {slot.name}
                        {!slot.required && ` (${strings.frameworks.optional})`}:
                      </strong>{" "}
                      {slot.options
                        .map((option) =>
                          option.kind === "product" ? (productItems.get(option.productId)?.name ?? "?") : option.text,
                        )
                        .join(", ")}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
