import { useState } from "react";
import type { RecipeInput } from "@/application/recipes";
import { RecipeDetail } from "./RecipeDetail";
import { RecipeForm } from "./RecipeForm";
import { RecipeImport } from "./RecipeImport";
import { RecipeList } from "./RecipeList";

/**
 * What the recipes section shows right now. A union of the possible
 * screens instead of several booleans: impossible combinations
 * ("editing and importing at once") cannot be expressed.
 */
type Screen =
  | { readonly kind: "list" }
  | { readonly kind: "detail"; readonly recipeId: string }
  | { readonly kind: "create"; readonly draft?: RecipeInput }
  | { readonly kind: "edit"; readonly recipeId: string }
  | { readonly kind: "import" };

export function RecipesView() {
  const [screen, setScreen] = useState<Screen>({ kind: "list" });
  const showList = () => setScreen({ kind: "list" });
  const showDetail = (recipeId: string) => setScreen({ kind: "detail", recipeId });

  switch (screen.kind) {
    case "list":
      return (
        <RecipeList
          onOpen={showDetail}
          onCreate={() => setScreen({ kind: "create" })}
          onImport={() => setScreen({ kind: "import" })}
        />
      );
    case "detail":
      return (
        <RecipeDetail
          recipeId={screen.recipeId}
          onBack={showList}
          onEdit={() => setScreen({ kind: "edit", recipeId: screen.recipeId })}
        />
      );
    case "create":
      return <RecipeForm {...(screen.draft && { initial: screen.draft })} onCancel={showList} onSaved={showDetail} />;
    case "edit":
      return (
        <RecipeForm
          recipeId={screen.recipeId}
          onCancel={() => showDetail(screen.recipeId)}
          onSaved={showDetail}
        />
      );
    case "import":
      return <RecipeImport onCancel={showList} onDraft={(draft) => setScreen({ kind: "create", draft })} />;
  }
}
