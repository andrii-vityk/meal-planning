import type { Framework } from "./framework";
import type { Recipe } from "./recipe";
import type { DraftEntry, DraftRules } from "./weekDraft";
import {
  acceptDraft,
  applyExclusions,
  defaultDraftSlots,
  isIdea,
  noExclusions,
  openSlots,
  recentRecipeIds,
} from "./weekDraft";
import type { WeekPlanEntry } from "./weekPlanning";

const recipe = (id: string, servings = 4, productIds: readonly string[] = []): Recipe => ({
  id,
  title: id,
  servings,
  ingredients: productIds.map((productId) => ({ productId })),
  steps: [],
  tags: [],
  kidFriendly: false,
});

const bowl: Framework = {
  id: "bowl",
  title: "Bowl",
  kidFriendly: false,
  slots: [
    {
      id: "base",
      name: "Base",
      required: true,
      options: [
        { id: "rice", kind: "product", productId: "rice", kidFriendly: false },
        { id: "bulgur", kind: "product", productId: "bulgur", kidFriendly: false },
      ],
    },
    { id: "sauce", name: "Sauce", required: false, options: [{ id: "tahini", kind: "text", text: "tahini", kidFriendly: false }] },
  ],
};

const week = "2026-11-02";

const rules = (overrides: Partial<DraftRules> = {}): DraftRules => ({
  open: openSlots(week, []),
  recipes: new Map([
    ["soup", recipe("soup")],
    ["stew", recipe("stew", 6)],
  ]),
  frameworks: new Map([["bowl", bowl]]),
  avoidRecipeIds: new Set(),
  maxIdeas: 2,
  ...overrides,
});

const planned = (weekStart: string, recipeId: string): WeekPlanEntry => ({
  id: `${weekStart}-${recipeId}`,
  weekStart,
  dish: { kind: "recipe", recipeId },
  servings: 2,
  slots: [{ date: weekStart, meal: "dinner" }],
});

describe("defaultDraftSlots", () => {
  it("offers open slots from today on", () => {
    const slots = defaultDraftSlots(week, [{ date: "2026-11-06", meal: "dinner" }], "2026-11-06");

    expect(slots.every((slot) => slot.date >= "2026-11-06")).toBe(true);
    // Friday to Sunday, four meals a day, minus Friday's dinner.
    expect(slots).toHaveLength(11);
  });

  it("offers nothing for a week already past", () => {
    expect(defaultDraftSlots(week, [], "2026-11-20")).toEqual([]);
  });
});

describe("openSlots", () => {
  it("lists every meal of the week except occupied and excluded ones", () => {
    const slots = openSlots(week, [{ date: week, meal: "dinner" }], [{ date: "2026-11-08", meal: "lunch" }]);

    expect(slots).toHaveLength(26);
    expect(slots[0]).toEqual({ date: week, meal: "breakfast" });
    expect(slots).not.toContainEqual({ date: week, meal: "dinner" });
    expect(slots).not.toContainEqual({ date: "2026-11-08", meal: "lunch" });
  });
});

describe("recentRecipeIds", () => {
  it("takes recipes of the two weeks before, not older or later ones", () => {
    const ids = recentRecipeIds(
      [planned("2026-10-12", "old"), planned("2026-10-19", "twoWeeks"), planned("2026-10-26", "lastWeek"), planned(week, "now")],
      week,
    );

    expect([...ids].sort()).toEqual(["lastWeek", "twoWeeks"]);
  });
});

describe("acceptDraft", () => {
  it("keeps open slots only and gives each slot to one dish", () => {
    const proposal: DraftEntry[] = [
      {
        dish: { kind: "recipe", recipeId: "soup" },
        servings: 4,
        slots: [
          { date: week, meal: "dinner" },
          { date: "2026-11-03", meal: "lunch" },
        ],
      },
      { dish: { kind: "recipe", recipeId: "stew" }, servings: 6, slots: [{ date: "2026-11-03", meal: "lunch" }] },
    ];

    const kept = acceptDraft(proposal, rules({ open: openSlots(week, [{ date: week, meal: "dinner" }]) }));

    expect(kept).toEqual([
      { dish: { kind: "recipe", recipeId: "soup" }, servings: 4, slots: [{ date: "2026-11-03", meal: "lunch" }] },
    ]);
  });

  it("drops recent, repeated and unknown recipes", () => {
    const slot = (date: string) => [{ date, meal: "dinner" as const }];
    const kept = acceptDraft(
      [
        { dish: { kind: "recipe", recipeId: "soup" }, servings: 4, slots: slot("2026-11-02") },
        { dish: { kind: "recipe", recipeId: "stew" }, servings: 6, slots: slot("2026-11-03") },
        { dish: { kind: "recipe", recipeId: "stew" }, servings: 6, slots: slot("2026-11-04") },
        { dish: { kind: "recipe", recipeId: "ghost" }, servings: 2, slots: slot("2026-11-05") },
      ],
      rules({ avoidRecipeIds: new Set(["soup"]) }),
    );

    expect(kept.map((entry) => entry.slots[0]?.date)).toEqual(["2026-11-03"]);
  });

  it("repairs framework choices and allows the framework to repeat", () => {
    const kept = acceptDraft(
      [
        {
          dish: { kind: "framework", frameworkId: "bowl", choices: { base: "nonsense", sauce: "tahini" } },
          servings: 2,
          slots: [{ date: week, meal: "lunch" }],
        },
        { dish: { kind: "framework", frameworkId: "bowl", choices: { base: "bulgur" } }, servings: 2, slots: [{ date: "2026-11-03", meal: "lunch" }] },
      ],
      rules(),
    );

    expect(kept.map((entry) => entry.dish)).toEqual([
      { kind: "framework", frameworkId: "bowl", choices: { base: "rice", sauce: "tahini" } },
      { kind: "framework", frameworkId: "bowl", choices: { base: "bulgur" } },
    ]);
  });

  it("limits new-dish ideas but not snacks", () => {
    const text = (value: string, date: string, meal: "dinner" | "snack"): DraftEntry => ({
      dish: { kind: "text", text: value },
      servings: 2,
      slots: [{ date, meal }],
    });
    const kept = acceptDraft(
      [
        text("Idea 1", "2026-11-02", "dinner"),
        text("Idea 2", "2026-11-03", "dinner"),
        text("Idea 3", "2026-11-04", "dinner"),
        text("Apple", "2026-11-04", "snack"),
      ],
      rules(),
    );

    expect(kept.map((entry) => (entry.dish.kind === "text" ? entry.dish.text : ""))).toEqual(["Idea 1", "Idea 2", "Apple"]);
    expect(kept.filter(isIdea)).toHaveLength(2);
  });

  it("falls back to the recipe's servings and sorts by cooking time", () => {
    const kept = acceptDraft(
      [
        { dish: { kind: "recipe", recipeId: "stew" }, servings: 0, slots: [{ date: "2026-11-05", meal: "dinner" }] },
        { dish: { kind: "recipe", recipeId: "soup" }, servings: 3, slots: [{ date: "2026-11-02", meal: "dinner" }] },
      ],
      rules(),
    );

    expect(kept.map((entry) => [entry.dish.kind === "recipe" && entry.dish.recipeId, entry.servings])).toEqual([
      ["soup", 3],
      ["stew", 6],
    ]);
  });
});

describe("applyExclusions", () => {
  const sources = {
    recipes: new Map([
      ["mushroomSoup", recipe("mushroomSoup", 4, ["mushrooms", "potato"])],
      ["stew", recipe("stew", 6, ["beef"])],
    ]),
    frameworks: new Map([["bowl", bowl]]),
  };
  const at = (date: string) => [{ date, meal: "dinner" as const }];
  const soup: DraftEntry = { dish: { kind: "recipe", recipeId: "mushroomSoup" }, servings: 4, slots: at("2026-11-02") };
  const stew: DraftEntry = { dish: { kind: "recipe", recipeId: "stew" }, servings: 6, slots: at("2026-11-03") };
  const riceBowl: DraftEntry = {
    dish: { kind: "framework", frameworkId: "bowl", choices: { base: "rice", sauce: "tahini" } },
    servings: 2,
    slots: at("2026-11-04"),
  };
  const snack: DraftEntry = { dish: { kind: "text", text: "Apple" }, servings: 1, slots: [{ date: week, meal: "snack" }] };
  const draft = [soup, stew, riceBowl, snack];

  it("finds recipes that use an excluded product without asking the model", () => {
    const result = applyExclusions(draft, { ...noExclusions, productIds: new Set(["mushrooms"]) }, sources);

    expect(result.removed).toEqual([soup]);
    expect(result.kept).toEqual([stew, riceBowl, snack]);
    expect(result.adjusted).toEqual([]);
  });

  it("switches a framework to another option instead of removing it", () => {
    const result = applyExclusions(draft, { ...noExclusions, productIds: new Set(["rice"]) }, sources);

    expect(result.removed).toEqual([]);
    expect(result.adjusted).toEqual([{ ...riceBowl, dish: { ...riceBowl.dish, choices: { base: "bulgur", sauce: "tahini" } } }]);
  });

  it("removes a framework when a required part has no allowed option left, or when it is excluded", () => {
    expect(applyExclusions(draft, { ...noExclusions, productIds: new Set(["rice", "bulgur"]) }, sources).removed).toEqual([
      riceBowl,
    ]);
    expect(applyExclusions(draft, { ...noExclusions, frameworkIds: new Set(["bowl"]) }, sources).removed).toEqual([riceBowl]);
    expect(applyExclusions(draft, { ...noExclusions, recipeIds: new Set(["stew"]) }, sources).removed).toEqual([stew]);
  });

  it("keeps excluded dishes out of a new proposal too", () => {
    const kept = acceptDraft([soup, stew, riceBowl], {
      ...rules({ recipes: sources.recipes }),
      exclusions: { ...noExclusions, productIds: new Set(["mushrooms", "rice"]) },
    });

    expect(kept.map((entry) => entry.dish)).toEqual([
      stew.dish,
      { kind: "framework", frameworkId: "bowl", choices: { base: "bulgur", sauce: "tahini" } },
    ]);
  });
});
