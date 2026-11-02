import type { Framework } from "./framework";
import type { Recipe } from "./recipe";
import type { DraftEntry, DraftRules } from "./weekDraft";
import { acceptDraft, isIdea, openSlots, recentRecipeIds } from "./weekDraft";
import type { WeekPlanEntry } from "./weekPlanning";

const recipe = (id: string, servings = 4): Recipe => ({
  id,
  title: id,
  servings,
  ingredients: [],
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
