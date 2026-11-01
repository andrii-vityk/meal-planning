import { useEffect, useRef, useState, useTransition } from "react";
import type { RecipeInput } from "@/application/recipes";
import { aiErrorMessage, isCancellation } from "@/ui/aiErrors";
import { useDependencies } from "@/ui/dependencies";
import { resizeImage } from "@/ui/images";
import { strings } from "@/ui/strings/uk";
import styles from "./recipes.module.css";

interface RecipeImportProps {
  onCancel: () => void;
  onDraft: (draft: RecipeInput) => void;
}

export function RecipeImport({ onCancel, onDraft }: RecipeImportProps) {
  const { ai, products } = useDependencies();
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [isParsing, startParsing] = useTransition();
  // A ref, not state: changing the controller must not re-render anything.
  const controller = useRef<AbortController | null>(null);

  // Leaving the screen aborts a request still in flight. Cleaning up an
  // external resource is exactly what effects are for.
  useEffect(() => () => controller.current?.abort(), []);

  const parse = () => {
    setError(null);
    controller.current = new AbortController();
    const { signal } = controller.current;
    startParsing(async () => {
      try {
        const source = image ? { text, image: await resizeImage(image) } : { text };
        const draft = await ai.parseRecipe(source, [...products.getSnapshot().items.values()], signal);
        onDraft({
          ...draft,
          kidFriendly: false,
          ...(sourceUrl.trim() && { sourceUrl: sourceUrl.trim() }),
        });
      } catch (caught) {
        if (!isCancellation(caught)) setError(aiErrorMessage(caught));
      }
    });
  };

  const cancel = () => {
    controller.current?.abort();
    onCancel();
  };

  return (
    <section className={styles.section} aria-labelledby="import-heading">
      <h2 id="import-heading" className={styles.heading}>
        {strings.recipeImport.heading}
      </h2>
      <p className="hint">{strings.recipeImport.hint}</p>

      <label className="field">
        <span className="label">{strings.recipeImport.text}</span>
        <textarea
          id="recipe-import-text"
          className="input"
          rows={10}
          placeholder={strings.recipeImport.placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isParsing}
        />
      </label>

      <label className="field">
        <span className="label">{strings.recipeImport.image}</span>
        <input
          id="recipe-import-image"
          type="file"
          accept="image/*"
          disabled={isParsing}
          onChange={(event) => setImage(event.target.files?.[0] ?? null)}
        />
        {image && <span className="hint">{strings.recipeImport.imageChosen(image.name)}</span>}
      </label>

      <label className="field">
        <span className="label">{strings.recipeImport.sourceUrl}</span>
        <input
          id="recipe-import-source"
          className="input"
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
          disabled={isParsing}
        />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className={styles.actions}>
        <button type="button" className="button" onClick={parse} disabled={isParsing || (text.trim() === "" && !image)}>
          {isParsing ? strings.recipeImport.parsing : strings.recipeImport.parse}
        </button>
        <button type="button" className="button button-secondary" onClick={cancel}>
          {strings.common.cancel}
        </button>
      </div>
    </section>
  );
}
