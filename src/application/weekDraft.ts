/**
 * Use cases for the AI week draft (FR-14): build the request from what is
 * stored, ask the model, keep only what follows the rules, and save an
 * accepted draft as ordinary plan entries.
 */
import type { AppDependencies } from "@/application/dependencies";
import { newId } from "@/application/ids";
import type { DraftEntrySummary, DraftFrameworkOption, DraftRecipeOption } from "@/application/ports/ai";
import type { IsoDate } from "@/domain/calendar";
import { dishIngredients } from "@/domain/dishIngredients";
import type { Dish, MealSlot } from "@/domain/plan";
import type { NutritionFlags, ProductLookup } from "@/domain/product";
import { nutrients } from "@/domain/product";
import type { DraftEntry, DraftExclusions } from "@/domain/weekDraft";
import {
  acceptDraft,
  applyExclusions,
  compareEntries,
  maxIdeasPerWeek,
  mergeExclusions,
  noExclusions,
  openSlots,
  recentRecipeIds,
  recipeExcluded,
} from "@/domain/weekDraft";
import { weekPlan } from "@/domain/weekPlanning";

type DraftDeps = Pick<AppDependencies, "ai" | "products" | "recipes" | "frameworks" | "planEntries">;

export interface WeekDraftOptions {
  readonly weekStart: IsoDate;
  /** Slots the user does not want filled. */
  readonly excluded: readonly MealSlot[];
  readonly wishes: string;
  /** Left out of this draft on the user's request. */
  readonly exclusions?: DraftExclusions;
  /** Earlier change requests, kept as wishes for later replacements. */
  readonly notes?: readonly string[];
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
 * planned. To replace drafted entries, pass them as `replacing`: only
 * their slots are filled again, with different dishes.
 */
export async function draftWeek(
  deps: DraftDeps,
  options: WeekDraftOptions & {
    readonly draft?: readonly DraftEntry[];
    readonly replacing?: readonly DraftEntry[];
  },
  signal?: AbortSignal,
): Promise<DraftEntry[]> {
  const data = snapshot(deps);
  const sources = { recipes: data.recipes, frameworks: data.frameworks };
  const exclusions = options.exclusions ?? noExclusions;
  const replacing = options.replacing ?? [];
  const week = weekPlan(options.weekStart, data.entries);
  const kept = (options.draft ?? []).filter((entry) => !replacing.includes(entry));

  const planned = [...week.entries, ...kept];
  const occupied = planned.flatMap((entry) => entry.slots);
  const open =
    replacing.length > 0
      ? replacing.flatMap((entry) => entry.slots)
      : openSlots(options.weekStart, occupied, options.excluded);
  if (open.length === 0) return [];

  const avoid = recentRecipeIds(data.entries, options.weekStart);
  for (const entry of [...planned, ...replacing]) if (entry.dish.kind === "recipe") avoid.add(entry.dish.recipeId);

  // Excluded dishes and options are not offered to the model at all.
  const recipes: DraftRecipeOption[] = [...data.recipes.values()]
    .filter((recipe) => !recipeExcluded(recipe.id, data.recipes, exclusions))
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      tags: recipe.tags,
      servings: recipe.servings,
      nutrition: nutritionOf(
        dishIngredients({ kind: "recipe", recipeId: recipe.id }, recipe.servings, sources).map((need) => need.productId),
        data.products,
      ),
    }));
  const frameworks: DraftFrameworkOption[] = [...data.frameworks.values()]
    .filter((framework) => !exclusions.frameworkIds.has(framework.id))
    .map((framework) => ({
      id: framework.id,
      title: framework.title,
      slots: framework.slots.map((slot) => ({
        id: slot.id,
        name: slot.name,
        required: slot.required,
        options: slot.options.flatMap((option) => {
          if (option.kind === "text") return [{ id: option.id, name: option.text, nutrition: noNutrition() }];
          if (exclusions.productIds.has(option.productId)) return [];
          return [
            {
              id: option.id,
              name: data.products.get(option.productId)?.name ?? option.productId,
              nutrition: nutritionOf([option.productId], data.products),
            },
          ];
        }),
      })),
    }))
    .filter((framework) => framework.slots.every((slot) => !slot.required || slot.options.length > 0));

  const ideasLeft =
    maxIdeasPerWeek -
    kept.filter((entry) => entry.dish.kind === "text" && entry.slots.some((slot) => slot.meal !== "snack")).length;
  const maxIdeas = replacing.length > 0 ? Math.max(1, ideasLeft) : Math.max(0, ideasLeft);
  const wishes = [options.wishes.trim(), ...(options.notes ?? [])].filter(Boolean).join("; ");

  const proposal = await deps.ai.draftWeek(
    {
      weekStart: options.weekStart,
      open,
      planned: planned.map((entry) => ({ title: titleOf(entry.dish, data), slots: entry.slots })),
      recipes,
      frameworks,
      avoidRecipeIds: [...avoid],
      avoidTitles: replacing.map((entry) => titleOf(entry.dish, data)),
      maxIdeas,
      wishes,
    },
    signal,
  );

  return acceptDraft(proposal, {
    open,
    recipes: data.recipes,
    frameworks: data.frameworks,
    avoidRecipeIds: avoid,
    maxIdeas,
    exclusions,
  });
}

export interface DraftRevision {
  readonly entries: DraftEntry[];
  /** New or adjusted entries, to highlight. */
  readonly changed: readonly DraftEntry[];
  /** The draft's options with this request's exclusions and note added. */
  readonly options: WeekDraftOptions;
}

/**
 * Applies a free-text change request to a draft: the model reads the
 * request, the domain finds every dish it touches (an excluded product is
 * looked up in recipes, not guessed), frameworks switch an option where
 * they can, and only the remaining touched dishes are drafted again.
 */
export async function reviseDraft(
  deps: DraftDeps,
  options: WeekDraftOptions,
  draft: readonly DraftEntry[],
  instruction: string,
  signal?: AbortSignal,
): Promise<DraftRevision> {
  const data = snapshot(deps);
  const sources = { recipes: data.recipes, frameworks: data.frameworks };
  const productName = (id: string) => data.products.get(id)?.name ?? id;

  const summaries: DraftEntrySummary[] = draft.map((entry, index) => ({
    index,
    title: titleOf(entry.dish, data),
    slots: entry.slots,
    ...(entry.dish.kind === "recipe" && { recipeId: entry.dish.recipeId }),
    ...(entry.dish.kind === "framework" && { frameworkId: entry.dish.frameworkId }),
    ingredients: dishIngredients(entry.dish, entry.servings, sources).map((need) => productName(need.productId)),
  }));

  const change = await deps.ai.interpretDraftChange(
    {
      instruction,
      entries: summaries,
      products: [...data.products.values()],
      recipes: [...data.recipes.values()].map((recipe) => ({ id: recipe.id, title: recipe.title })),
      frameworks: [...data.frameworks.values()].map((framework) => ({ id: framework.id, title: framework.title })),
    },
    signal,
  );

  const exclusions = mergeExclusions(options.exclusions ?? noExclusions, {
    productIds: new Set(change.excludeProductIds.filter((id) => data.products.has(id))),
    recipeIds: new Set(change.excludeRecipeIds.filter((id) => data.recipes.has(id))),
    frameworkIds: new Set(change.excludeFrameworkIds.filter((id) => data.frameworks.has(id))),
  });
  const notes = [...(options.notes ?? []), change.note.trim()].filter(Boolean);
  const revised: WeekDraftOptions = { ...options, exclusions, notes };

  const named = new Set(
    change.replaceEntries.flatMap((index) => {
      const entry = draft[index];
      return entry ? [entry] : [];
    }),
  );
  const { kept, adjusted, removed } = applyExclusions(
    draft.filter((entry) => !named.has(entry)),
    exclusions,
    sources,
  );
  const toReplace = [...named, ...removed];
  if (toReplace.length === 0) return { entries: [...kept], changed: adjusted, options: revised };

  const replacements = await draftWeek(deps, { ...revised, draft: [...kept, ...toReplace], replacing: toReplace }, signal);
  return {
    entries: [...kept, ...replacements].toSorted(compareEntries),
    changed: [...adjusted, ...replacements],
    options: revised,
  };
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
