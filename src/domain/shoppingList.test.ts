import { frameworks, products, recipes } from "@/domain/__fixtures__/catalog";
import type { WeekPlan } from "./plan";
import { buildShoppingList } from "./shoppingList";

const sources = { products, recipes, frameworks };

describe("buildShoppingList", () => {
  const plan: WeekPlan = {
    weekStart: "2026-11-02",
    entries: [
      {
        id: "e1",
        dish: { kind: "recipe", recipeId: "stirFry" },
        servings: 4,
        // cooked once, eaten twice
        slots: [
          { date: "2026-11-02", meal: "dinner" },
          { date: "2026-11-03", meal: "lunch" },
        ],
      },
      {
        id: "e2",
        dish: { kind: "recipe", recipeId: "lentilSoup" },
        servings: 2,
        slots: [{ date: "2026-11-04", meal: "lunch" }],
      },
    ],
  };

  it("buys a dish once however many slots it covers, and skips staples", () => {
    const list = buildShoppingList(plan, sources);

    expect(list).toEqual([
      {
        category: "vegetables",
        lines: [
          { productId: "broccoli", name: "Броколі", quantities: [{ amount: 600, unit: "g" }], hasUnquantifiedUse: false },
          { productId: "onion", name: "Цибуля", quantities: [{ amount: 0.5, unit: "piece" }], hasUnquantifiedUse: false },
        ],
      },
      {
        category: "meat",
        lines: [{ productId: "chicken", name: "Курка", quantities: [{ amount: 800, unit: "g" }], hasUnquantifiedUse: false }],
      },
      {
        category: "grains",
        lines: [{ productId: "rice", name: "Рис", quantities: [{ amount: 400, unit: "g" }], hasUnquantifiedUse: false }],
      },
      {
        category: "legumes",
        lines: [{ productId: "lentils", name: "Сочевиця", quantities: [{ amount: 150, unit: "g" }], hasUnquantifiedUse: false }],
      },
    ]);
  });

  it("marks products from framework dishes as having no known amount", () => {
    const list = buildShoppingList(
      {
        weekStart: "2026-11-02",
        entries: [
          {
            id: "e3",
            dish: { kind: "framework", frameworkId: "bowl", choices: { base: "base-rice", protein: "protein-salmon" } },
            servings: 2,
            slots: [{ date: "2026-11-05", meal: "dinner" }],
          },
        ],
      },
      sources,
    );

    expect(list.flatMap((group) => group.lines)).toEqual([
      { productId: "salmon", name: "Лосось", quantities: [], hasUnquantifiedUse: true },
      { productId: "rice", name: "Рис", quantities: [], hasUnquantifiedUse: true },
    ]);
  });

  it("ignores dishes whose recipe no longer exists", () => {
    const list = buildShoppingList(
      {
        weekStart: "2026-11-02",
        entries: [{ id: "e4", dish: { kind: "recipe", recipeId: "deleted" }, servings: 2, slots: [] }],
      },
      sources,
    );

    expect(list).toEqual([]);
  });
});
