import { useState } from "react";
import type { ReactNode } from "react";
import type { RecipeInput } from "@/application/recipes";
import { startOfWeek } from "@/domain/calendar";
import type { Dish } from "@/domain/plan";
import { todayIso } from "@/ui/dates";
import { useDependencies } from "@/ui/dependencies";
import { FrameworkDetail } from "@/ui/features/frameworks/FrameworkDetail";
import { FrameworkForm } from "@/ui/features/frameworks/FrameworkForm";
import { defaultChoices, PlanEntryPanel } from "@/ui/features/plan/PlanEntryPanel";
import { RecipeDetail } from "@/ui/features/recipes/RecipeDetail";
import { RecipeForm } from "@/ui/features/recipes/RecipeForm";
import { RecipeImport } from "@/ui/features/recipes/RecipeImport";
import { useBackClosable } from "@/ui/hooks/useBackClosable";
import { goBack, navigate } from "@/ui/navigation/router";
import type { DishScreen } from "@/ui/navigation/routes";
import { dishRoute, formatRoute } from "@/ui/navigation/routes";
import { strings } from "@/ui/strings/uk";
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
  const { frameworks } = useDependencies();
  const [draft, setDraft] = useState<RecipeInput | undefined>(undefined);
  const [planned, openPlanPanel, closePlanPanel] = useBackClosable<Dish>();
  // A confirmation belongs to the screen it was shown on.
  const [notice, setNotice] = useState<{ readonly address: string; readonly text: string } | null>(null);
  const address = formatRoute(dishRoute(screen));

  return (
    <>
      {notice?.address === address && (
        <p className="notice" role="status">
          {notice.text}
        </p>
      )}
      {screenContent(screen, {
        draft,
        setDraft,
        addToPlan: (dish) => openPlanPanel(dish),
        frameworkChoices: (frameworkId) => defaultChoices(frameworks.getSnapshot().items.get(frameworkId)),
      })}
      {planned && (
        <PlanEntryPanel
          weekStart={startOfWeek(todayIso())}
          initialDish={planned}
          onClose={closePlanPanel}
          onSaved={({ title }) => {
            setNotice({ address, text: strings.plan.saved(title) });
            closePlanPanel();
          }}
        />
      )}
    </>
  );
}

interface ScreenTools {
  readonly draft: RecipeInput | undefined;
  readonly setDraft: (draft: RecipeInput | undefined) => void;
  readonly addToPlan: (dish: Dish) => void;
  readonly frameworkChoices: (frameworkId: string) => Record<string, string>;
}

function screenContent(screen: DishScreen, { draft, setDraft, addToPlan, frameworkChoices }: ScreenTools): ReactNode {
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
          onAddToPlan={() => addToPlan({ kind: "recipe", recipeId: screen.recipeId })}
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
          onAddToPlan={() =>
            addToPlan({
              kind: "framework",
              frameworkId: screen.frameworkId,
              choices: frameworkChoices(screen.frameworkId),
            })
          }
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
