import { useState } from "react";
import type { RecipeInput } from "@/application/recipes";
import { FrameworkDetail } from "@/ui/features/frameworks/FrameworkDetail";
import { FrameworkForm } from "@/ui/features/frameworks/FrameworkForm";
import { RecipeDetail } from "@/ui/features/recipes/RecipeDetail";
import { RecipeForm } from "@/ui/features/recipes/RecipeForm";
import { RecipeImport } from "@/ui/features/recipes/RecipeImport";
import { goBack, navigate } from "@/ui/navigation/router";
import type { DishScreen } from "@/ui/navigation/routes";
import { dishRoute } from "@/ui/navigation/routes";
import { DishList } from "./DishList";

const list = dishRoute({ kind: "list" });
const recipe = (recipeId: string) => dishRoute({ kind: "recipe", recipeId });
const framework = (frameworkId: string) => dishRoute({ kind: "framework", frameworkId });

/**
 * Recipes and frameworks in one section. Which screen is shown comes from
 * the address (see navigation/routes.ts). Only what cannot live in an
 * address stays in state here: the AI draft handed from import to the form.
 */
export function DishesView({ screen }: { screen: DishScreen }) {
  const [draft, setDraft] = useState<RecipeInput | undefined>(undefined);

  switch (screen.kind) {
    case "list":
      return (
        <DishList
          onOpen={(kind, id) => navigate(kind === "recipe" ? recipe(id) : framework(id))}
          onCreateRecipe={() => {
            setDraft(undefined);
            navigate(dishRoute({ kind: "recipeNew" }));
          }}
          onCreateFramework={() => navigate(dishRoute({ kind: "frameworkNew" }))}
          onImport={() => navigate(dishRoute({ kind: "recipeImport" }))}
        />
      );

    case "recipe":
      return (
        <RecipeDetail
          recipeId={screen.recipeId}
          onBack={() => goBack(list)}
          onEdit={() => navigate(dishRoute({ kind: "recipeEdit", recipeId: screen.recipeId }))}
        />
      );
    case "recipeNew":
      return (
        <RecipeForm
          {...(draft && { initial: draft })}
          onCancel={() => goBack(list)}
          // The form is replaced by the saved recipe: Back from it returns
          // to the list, not to an empty form.
          onSaved={(recipeId) => navigate(recipe(recipeId), { replace: true })}
        />
      );
    case "recipeEdit":
      return (
        <RecipeForm
          key={screen.recipeId}
          recipeId={screen.recipeId}
          onCancel={() => goBack(recipe(screen.recipeId))}
          onSaved={() => goBack(recipe(screen.recipeId))}
        />
      );
    case "recipeImport":
      return (
        <RecipeImport
          onCancel={() => goBack(list)}
          onDraft={(next) => {
            setDraft(next);
            navigate(dishRoute({ kind: "recipeNew" }), { replace: true });
          }}
        />
      );

    case "framework":
      return (
        <FrameworkDetail
          frameworkId={screen.frameworkId}
          onBack={() => goBack(list)}
          onEdit={() => navigate(dishRoute({ kind: "frameworkEdit", frameworkId: screen.frameworkId }))}
        />
      );
    case "frameworkNew":
      return (
        <FrameworkForm
          onCancel={() => goBack(list)}
          onSaved={(frameworkId) => navigate(framework(frameworkId), { replace: true })}
        />
      );
    case "frameworkEdit":
      return (
        <FrameworkForm
          key={screen.frameworkId}
          frameworkId={screen.frameworkId}
          onCancel={() => goBack(framework(screen.frameworkId))}
          onSaved={() => goBack(framework(screen.frameworkId))}
        />
      );
  }
}
