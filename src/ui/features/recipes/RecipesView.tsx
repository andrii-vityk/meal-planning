import { useState } from "react";
import type { RecipeInput } from "@/application/recipes";
import { goBack, navigate } from "@/ui/navigation/router";
import type { Route, RecipeScreen } from "@/ui/navigation/routes";
import { RecipeDetail } from "./RecipeDetail";
import { RecipeForm } from "./RecipeForm";
import { RecipeImport } from "./RecipeImport";
import { RecipeList } from "./RecipeList";

const recipesRoute = (screen: RecipeScreen): Route => ({ section: "recipes", screen });
const list = recipesRoute({ kind: "list" });
const detail = (recipeId: string) => recipesRoute({ kind: "detail", recipeId });

/**
 * Which screen is shown comes from the address (see navigation/routes.ts),
 * so Back and links work. Only what cannot live in an address stays in
 * state here: the AI draft handed from the import screen to the form.
 */
export function RecipesView({ screen }: { screen: RecipeScreen }) {
  const [draft, setDraft] = useState<RecipeInput | undefined>(undefined);

  switch (screen.kind) {
    case "list":
      return (
        <RecipeList
          onOpen={(recipeId) => navigate(detail(recipeId))}
          onCreate={() => {
            setDraft(undefined);
            navigate(recipesRoute({ kind: "create" }));
          }}
          onImport={() => navigate(recipesRoute({ kind: "import" }))}
        />
      );
    case "detail":
      return (
        <RecipeDetail
          recipeId={screen.recipeId}
          onBack={() => goBack(list)}
          onEdit={() => navigate(recipesRoute({ kind: "edit", recipeId: screen.recipeId }))}
        />
      );
    case "create":
      return (
        <RecipeForm
          {...(draft && { initial: draft })}
          onCancel={() => goBack(list)}
          // The form screen is replaced by the saved recipe: Back from it
          // returns to the list, not to an empty form.
          onSaved={(recipeId) => navigate(detail(recipeId), { replace: true })}
        />
      );
    case "edit":
      return (
        <RecipeForm
          key={screen.recipeId}
          recipeId={screen.recipeId}
          onCancel={() => goBack(detail(screen.recipeId))}
          onSaved={() => goBack(detail(screen.recipeId))}
        />
      );
    case "import":
      return (
        <RecipeImport
          onCancel={() => goBack(list)}
          onDraft={(next) => {
            setDraft(next);
            navigate(recipesRoute({ kind: "create" }), { replace: true });
          }}
        />
      );
  }
}
