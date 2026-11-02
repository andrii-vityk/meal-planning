/**
 * Use cases for the AI week draft (FR-14): build the request from what is
 * stored, ask the model, keep only what follows the rules, and save an
 * accepted draft as ordinary plan entries.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { DraftFrameworkOption, DraftRecipeOption } from "@/application/ports/ai";
import type { IsoDate } from "@/domain/calendar";
import { dishIngredients } from "@/domain/dishIngredients";
import type { Dish, MealSlot } from "@/domain/plan";
import type { NutritionFlags, ProductLookup } from "@/domain/product";
import { nutrients } from "@/domain/product";
import type { DraftEntry } from "@/domain/weekDraft";
import { acceptDraft, maxIdeasPerWeek, openSlots, recentRecipeIds } from "@/domain/weekDraft";
import { weekPlan } from "@/domain/weekPlanning";

type DraftDeps = Pick<AppDependencies, "ai" | "products" | "recipes" | "frameworks" | "planEntries">;

export interface WeekDraftOptions {
  readonly weekStart: IsoDate;
  /** Slots the user does not want filled. */
  readonly excluded: readonly MealSlot[];
  readonly wishes: string;
}

const noNutrition = (): Record<keyof NutritionFlags, boolean> => ({ protein: false, fiber: false, healthyFat: false });

function nutritionOf(productIds: Iterable<string>, products: ProductLookup): NutritionFlags {
  const flags = noNutrition();
  for (const id of productIds) {
    const product = products.get(id);
    if (!product) continue;
    for (const nutrient of nutrients) flags[nutrient] ||= product.nutrition[nutrient];
  }
  return flags;
}

function snapshot(deps: DraftDeps) {
  return {
    products: deps.products.getSnapshot().items,
    recipes: deps.recipes.getSnapshot().items,
    frameworks: deps.frameworks.getSnapshot().items,
    entries: [...deps.planEntries.getSnapshot().items.values()],
  };
}

function titleOf(dish: Dish, data: ReturnType<typeof snapshot>): string {
  switch (dish.kind) {
    case "recipe":
      return data.recipes.get(dish.recipeId)?.title ?? "";
    case "framework":
      return data.frameworks.get(dish.frameworkId)?.title ?? "";
    case "text":
      return dish.text;
  }
}

/**
 * Drafts dishes for the open slots of a week.
 *
 * `draft` holds the entries already drafted and kept: they count as
 * planned. To replace one drafted entry, pass it as `replacing`: only its
 * slots are filled again, with a different dish.
 */
export async function draftWeek(
  deps: DraftDeps,
  options: WeekDraftOptions & { readonly draft?: readonly DraftEntry[]; readonly replacing?: DraftEntry },
  signal?: AbortSignal,
): Promise<DraftEntry[]> {
  const data = snapshot(deps);
  const sources = { recipes: data.recipes, frameworks: data.frameworks };
  const week = weekPlan(options.weekStart, data.entries);
  const kept = (options.draft ?? []).filter((entry) => entry !== options.replacing);

  const planned = [...week.entries, ...kept];
  const occupied = planned.flatMap((entry) => entry.slots);
  const open = options.replacing
    ? options.replacing.slots
    : openSlots(options.weekStart, occupied, options.excluded);
  if (open.length === 0) return [];

  const avoid = recentRecipeIds(data.entries, options.weekStart);
  for (const entry of planned) if (entry.dish.kind === "recipe") avoid.add(entry.dish.recipeId);
  if (options.replacing?.dish.kind === "recipe") avoid.add(options.replacing.dish.recipeId);

  const recipes: DraftRecipeOption[] = [...data.recipes.values()].map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    tags: recipe.tags,
    servings: recipe.servings,
    nutrition: nutritionOf(
      dishIngredients({ kind: "recipe", recipeId: recipe.id }, recipe.servings, sources).map((need) => need.productId),
      data.products,
    ),
  }));
  const frameworks: DraftFrameworkOption[] = [...data.frameworks.values()].map((framework) => ({
    id: framework.id,
    title: framework.title,
    slots: framework.slots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      required: slot.required,
      options: slot.options.map((option) =>
        option.kind === "product"
          ? {
              id: option.id,
              name: data.products.get(option.productId)?.name ?? option.productId,
              nutrition: nutritionOf([option.productId], data.products),
            }
          : { id: option.id, name: option.text, nutrition: noNutrition() },
      ),
    })),
  }));

  const ideasLeft = maxIdeasPerWeek - kept.filter((entry) => entry.dish.kind === "text" && entry.slots.some((slot) => slot.meal !== "snack")).length;
  const maxIdeas = options.replacing ? Math.max(1, ideasLeft) : Math.max(0, ideasLeft);

  const proposal = await deps.ai.draftWeek(
    {
      weekStart: options.weekStart,
      open,
      planned: planned.map((entry) => ({ title: titleOf(entry.dish, data), slots: entry.slots })),
      recipes,
      frameworks,
      avoidRecipeIds: [...avoid],
      avoidTitles: options.replacing ? [titleOf(options.replacing.dish, data)] : [],
      maxIdeas,
      wishes: options.wishes.trim(),
    },
    signal,
  );

  return acceptDraft(proposal, {
    open,
    recipes: data.recipes,
    frameworks: data.frameworks,
    avoidRecipeIds: avoid,
    maxIdeas,
  });
}

/** Saves accepted draft entries as plan entries of the week. */
export async function saveDraft(
  deps: Pick<AppDependencies, "planEntries">,
  weekStart: IsoDate,
  draft: readonly DraftEntry[],
): Promise<void> {
  await Promise.all(
    draft.map((entry) =>
      deps.planEntries.save({ id: newId(), weekStart, dish: entry.dish, servings: entry.servings, slots: entry.slots }),
    ),
  );
}
