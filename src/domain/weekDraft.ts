/**
 * Rules for an AI-drafted week plan (FR-14). The model proposes; these pure
 * functions decide what of the proposal is kept, so the rules hold however
 * the model answers.
 */
import type { IsoDate } from "./calendar";
import { addDays, weekDates } from "./calendar";
import type { Framework, FrameworkLookup, SlotOption } from "./framework";
import type { Dish, MealSlot } from "./plan";
import { meals } from "./plan";
import type { RecipeLookup } from "./recipe";
import type { WeekPlanEntry } from "./weekPlanning";

/** How many weeks before the planned one a recipe must not have been planned. */
export const recentWeeks = 2;

/** New dishes (not saved recipes or frameworks) a full-week draft may suggest. */
export const maxIdeasPerWeek = 2;

/** One dish of a draft: cooked once, eaten in one or more slots. */
export interface DraftEntry {
  readonly dish: Dish;
  readonly servings: number;
  /** The first slot is when it is cooked; later ones are leftovers. */
  readonly slots: readonly MealSlot[];
}

export const slotKey = (slot: MealSlot): string => `${slot.date}|${slot.meal}`;

/** Chronological: by date, then breakfast → lunch → dinner → snack. */
export const compareSlots = (a: MealSlot, b: MealSlot): number =>
  a.date.localeCompare(b.date) || meals.indexOf(a.meal) - meals.indexOf(b.meal);

/** Entries in the order they are cooked. */
export function compareEntries(a: DraftEntry, b: DraftEntry): number {
  const [first] = a.slots;
  const [second] = b.slots;
  if (!first || !second) return a.slots.length - b.slots.length;
  return compareSlots(first, second);
}

/** Every slot of the week that nothing occupies and the user did not exclude. */
export function openSlots(
  weekStart: IsoDate,
  occupied: Iterable<MealSlot>,
  excluded: Iterable<MealSlot> = [],
): MealSlot[] {
  const taken = new Set([...occupied, ...excluded].map(slotKey));
  return weekDates(weekStart)
    .flatMap((date) => meals.map((meal) => ({ date, meal })))
    .filter((slot) => !taken.has(slotKey(slot)));
}

/**
 * The open slots a new draft fills unless the user changes the choice:
 * those from today on. Days already past stay open but are not ticked.
 */
export function defaultDraftSlots(weekStart: IsoDate, occupied: Iterable<MealSlot>, today: IsoDate): MealSlot[] {
  return openSlots(weekStart, occupied).filter((slot) => slot.date >= today);
}

/** Recipes planned in the weeks just before this one. */
export function recentRecipeIds(entries: Iterable<WeekPlanEntry>, weekStart: IsoDate): Set<string> {
  const from = addDays(weekStart, -7 * recentWeeks);
  const ids = new Set<string>();
  for (const entry of entries) {
    if (entry.dish.kind === "recipe" && entry.weekStart >= from && entry.weekStart < weekStart) {
      ids.add(entry.dish.recipeId);
    }
  }
  return ids;
}

/** A text dish eaten only as snacks is a snack, not a new-dish idea. */
export function isIdea(entry: DraftEntry): boolean {
  return entry.dish.kind === "text" && entry.slots.some((slot) => slot.meal !== "snack");
}

/**
 * What the user asked to leave out of this draft ("без грибів", "прибери
 * боул"). It holds until the draft is accepted or discarded.
 */
export interface DraftExclusions {
  readonly productIds: ReadonlySet<string>;
  readonly recipeIds: ReadonlySet<string>;
  readonly frameworkIds: ReadonlySet<string>;
}

export const noExclusions: DraftExclusions = { productIds: new Set(), recipeIds: new Set(), frameworkIds: new Set() };

export function mergeExclusions(a: DraftExclusions, b: DraftExclusions): DraftExclusions {
  return {
    productIds: new Set([...a.productIds, ...b.productIds]),
    recipeIds: new Set([...a.recipeIds, ...b.recipeIds]),
    frameworkIds: new Set([...a.frameworkIds, ...b.frameworkIds]),
  };
}

export interface DraftRules {
  readonly open: readonly MealSlot[];
  readonly recipes: RecipeLookup;
  readonly frameworks: FrameworkLookup;
  /** Recipes that must not appear: recent weeks and recipes already planned this week. */
  readonly avoidRecipeIds: ReadonlySet<string>;
  readonly maxIdeas: number;
  readonly exclusions?: DraftExclusions;
}

const optionAllowed = (option: SlotOption, excludedProducts: ReadonlySet<string>) =>
  option.kind !== "product" || !excludedProducts.has(option.productId);

/** A recipe is excluded when it is excluded itself or uses an excluded product. */
export function recipeExcluded(recipeId: string, recipes: RecipeLookup, exclusions: DraftExclusions): boolean {
  if (exclusions.recipeIds.has(recipeId)) return true;
  const recipe = recipes.get(recipeId);
  return recipe?.ingredients.some((ingredient) => exclusions.productIds.has(ingredient.productId)) ?? false;
}

/**
 * Valid choices for a framework: known, allowed options only; a required
 * slot left empty (or holding an excluded product) gets its first allowed
 * option. Null when a required slot has no allowed option at all.
 */
export function normalizeChoices(
  framework: Framework,
  choices: Readonly<Record<string, string>>,
  excludedProducts: ReadonlySet<string> = new Set(),
): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const slot of framework.slots) {
    const allowed = slot.options.filter((option) => optionAllowed(option, excludedProducts));
    const chosen = allowed.find((option) => option.id === choices[slot.id]);
    const option = chosen ?? (slot.required ? allowed[0] : undefined);
    if (option) result[slot.id] = option.id;
    else if (slot.required) return null;
  }
  return result;
}

function normalizeDish(dish: Dish, rules: DraftRules): Dish | null {
  const exclusions = rules.exclusions ?? noExclusions;
  switch (dish.kind) {
    case "recipe":
      return rules.recipes.has(dish.recipeId) &&
        !rules.avoidRecipeIds.has(dish.recipeId) &&
        !recipeExcluded(dish.recipeId, rules.recipes, exclusions)
        ? dish
        : null;
    case "framework": {
      const framework = rules.frameworks.get(dish.frameworkId);
      if (!framework || exclusions.frameworkIds.has(framework.id)) return null;
      const choices = normalizeChoices(framework, dish.choices, exclusions.productIds);
      return choices ? { ...dish, choices } : null;
    }
    case "text": {
      const text = dish.text.trim();
      return text === "" ? null : { kind: "text", text };
    }
  }
}

/**
 * Keeps the part of a proposal that follows the rules: only open slots,
 * each slot at most once, known dishes, no avoided or repeated recipe,
 * a limited number of new-dish ideas, positive servings.
 */
export function acceptDraft(proposal: readonly DraftEntry[], rules: DraftRules): DraftEntry[] {
  const free = new Set(rules.open.map(slotKey));
  const usedRecipes = new Set<string>();
  let ideas = 0;
  const kept: DraftEntry[] = [];

  for (const candidate of proposal) {
    const dish = normalizeDish(candidate.dish, rules);
    if (!dish) continue;
    if (dish.kind === "recipe" && usedRecipes.has(dish.recipeId)) continue;

    const slots = [...new Map(candidate.slots.map((slot) => [slotKey(slot), slot])).values()]
      .filter((slot) => free.has(slotKey(slot)))
      .toSorted(compareSlots);
    if (slots.length === 0) continue;

    const servings =
      Number.isFinite(candidate.servings) && candidate.servings > 0
        ? Math.round(candidate.servings)
        : dish.kind === "recipe"
          ? (rules.recipes.get(dish.recipeId)?.servings ?? 2)
          : 2;
    const entry: DraftEntry = { dish, servings, slots };

    if (isIdea(entry)) {
      if (ideas >= rules.maxIdeas) continue;
      ideas += 1;
    }
    if (dish.kind === "recipe") usedRecipes.add(dish.recipeId);
    for (const slot of slots) free.delete(slotKey(slot));
    kept.push(entry);
  }

  return kept.toSorted(compareEntries);
}

export interface ExclusionResult {
  /** Entries the exclusions do not touch, and frameworks fixed by switching an option. */
  readonly kept: readonly DraftEntry[];
  /** Frameworks whose options were switched: shown as changed. */
  readonly adjusted: readonly DraftEntry[];
  /** Entries that have to be replaced with another dish. */
  readonly removed: readonly DraftEntry[];
}

/**
 * Applies exclusions to a draft without the model: which dishes use an
 * excluded product is known from the recipes and the product directory.
 * A framework keeps its place when another option of the same slot fits.
 */
export function applyExclusions(
  draft: readonly DraftEntry[],
  exclusions: DraftExclusions,
  sources: { readonly recipes: RecipeLookup; readonly frameworks: FrameworkLookup },
): ExclusionResult {
  const kept: DraftEntry[] = [];
  const adjusted: DraftEntry[] = [];
  const removed: DraftEntry[] = [];

  for (const entry of draft) {
    const { dish } = entry;
    if (dish.kind === "recipe") {
      (recipeExcluded(dish.recipeId, sources.recipes, exclusions) ? removed : kept).push(entry);
      continue;
    }
    if (dish.kind === "text") {
      kept.push(entry);
      continue;
    }
    const framework = sources.frameworks.get(dish.frameworkId);
    if (!framework || exclusions.frameworkIds.has(dish.frameworkId)) {
      removed.push(entry);
      continue;
    }
    const choices = normalizeChoices(framework, dish.choices, exclusions.productIds);
    if (!choices) {
      removed.push(entry);
    } else if (framework.slots.some((slot) => choices[slot.id] !== dish.choices[slot.id])) {
      const fixed: DraftEntry = { ...entry, dish: { ...dish, choices } };
      kept.push(fixed);
      adjusted.push(fixed);
    } else {
      kept.push(entry);
    }
  }
  return { kept, adjusted, removed };
}
