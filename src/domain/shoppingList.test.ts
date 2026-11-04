import { frameworks, products, recipes } from "@/domain/__fixtures__/catalog";
import type { WeekPlan } from "./plan";
import type { ShoppingGroup } from "./shoppingList";
import { arrangeShoppingList, buildShoppingList } from "./shoppingList";
import type { ShoppingStatus } from "./weekPlanning";

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

  const ordinary = (groups: readonly ShoppingGroup[]) =>
    groups
      .map((group) => ({ ...group, lines: group.lines.filter((line) => !line.isStaple) }))
      .filter((group) => group.lines.length > 0);

  it("buys a dish once however many slots it covers", () => {
    const list = buildShoppingList(plan, sources);

    expect(ordinary(list)).toEqual([
      {
        category: "vegetables",
        lines: [
          { productId: "broccoli", name: "Броколі", quantities: [{ amount: 600, unit: "g" }], hasUnquantifiedUse: false, isStaple: false },
          { productId: "onion", name: "Цибуля", quantities: [{ amount: 0.5, unit: "piece" }], hasUnquantifiedUse: false, isStaple: false },
        ],
      },
      {
        category: "meat",
        lines: [{ productId: "chicken", name: "Курка", quantities: [{ amount: 800, unit: "g" }], hasUnquantifiedUse: false, isStaple: false }],
      },
      {
        category: "grains",
        lines: [{ productId: "rice", name: "Рис", quantities: [{ amount: 400, unit: "g" }], hasUnquantifiedUse: false, isStaple: false }],
      },
      {
        category: "legumes",
        lines: [{ productId: "lentils", name: "Сочевиця", quantities: [{ amount: 150, unit: "g" }], hasUnquantifiedUse: false, isStaple: false }],
      },
    ]);
  });

  it("includes staples, flagged, with their amounts", () => {
    const staples = buildShoppingList(plan, sources)
      .flatMap((group) => group.lines)
      .filter((line) => line.isStaple)
      .map((line) => [line.productId, line.quantities]);

    expect(staples).toEqual([
      ["garlic", [{ amount: 4, unit: "clove" }]],
      ["soySauce", [{ amount: 4, unit: "tbsp" }]],
      ["oliveOil", [{ amount: 1, unit: "tbsp" }]],
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
      { productId: "salmon", name: "Лосось", quantities: [], hasUnquantifiedUse: true, isStaple: false },
      { productId: "rice", name: "Рис", quantities: [], hasUnquantifiedUse: true, isStaple: false },
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

describe("arrangeShoppingList", () => {
  const line = (productId: string, isStaple: boolean) => ({
    productId,
    name: productId,
    quantities: [],
    hasUnquantifiedUse: true,
    isStaple,
  });
  const groups: ShoppingGroup[] = [
    { category: "vegetables", lines: [line("broccoli", false), line("garlic", true)] },
    { category: "meat", lines: [line("chicken", false)] },
    { category: "oils", lines: [line("oil", true)] },
  ];
  const arrange = (statuses: Record<string, ShoppingStatus>) =>
    arrangeShoppingList(groups, new Map(Object.entries(statuses)));
  const ids = (lines: readonly { productId: string }[]) => lines.map((item) => item.productId);

  it("keeps staples out of the list by default", () => {
    const arranged = arrange({});

    expect(arranged.toBuy.map((group) => ids(group.lines))).toEqual([["broccoli"], ["chicken"]]);
    expect(ids(arranged.staples)).toEqual(["garlic", "oil"]);
    expect(arranged.atHome).toEqual([]);
  });

  it("moves a staple to the list when it is needed, and keeps it there once bought", () => {
    const arranged = arrange({ garlic: "needed", oil: "bought" });

    expect(arranged.toBuy.map((group) => ids(group.lines))).toEqual([["broccoli", "garlic"], ["chicken"], ["oil"]]);
    expect(arranged.staples).toEqual([]);
  });

  it("moves an ordinary line that is at home out of the list", () => {
    const arranged = arrange({ chicken: "atHome", broccoli: "bought" });

    expect(arranged.toBuy.map((group) => ids(group.lines))).toEqual([["broccoli"]]);
    expect(ids(arranged.atHome)).toEqual(["chicken"]);
  });
});
