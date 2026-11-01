import { frameworks, products, recipes } from "@/domain/__fixtures__/catalog";
import { nutritionCoverage } from "./nutritionCoverage";
import type { WeekPlan } from "./plan";

const sources = { products, recipes, frameworks };

describe("nutritionCoverage", () => {
  it("counts a dish on every day it is eaten and ignores slots outside the week", () => {
    const plan: WeekPlan = {
      weekStart: "2026-11-02",
      entries: [
        {
          id: "e1",
          dish: { kind: "recipe", recipeId: "stirFry" },
          servings: 4,
          slots: [
            { date: "2026-11-02", meal: "dinner" },
            { date: "2026-11-03", meal: "lunch" },
            { date: "2026-11-09", meal: "lunch" },
          ],
        },
        {
          id: "e2",
          dish: { kind: "framework", frameworkId: "bowl", choices: { protein: "protein-salmon", veg: "veg-avocado" } },
          servings: 2,
          slots: [{ date: "2026-11-03", meal: "dinner" }],
        },
        {
          id: "e3",
          dish: { kind: "text", text: "Піца в гостях" },
          servings: 1,
          slots: [{ date: "2026-11-04", meal: "dinner" }],
        },
      ],
    };

    const coverage = nutritionCoverage(plan, sources);

    expect(coverage).toHaveLength(7);
    expect(coverage[0]).toEqual({ date: "2026-11-02", nutrients: { protein: true, fiber: true, healthyFat: false } });
    expect(coverage[1]).toEqual({ date: "2026-11-03", nutrients: { protein: true, fiber: true, healthyFat: true } });
    // a free-text dish tells us nothing about nutrients
    expect(coverage[2]).toEqual({ date: "2026-11-04", nutrients: { protein: false, fiber: false, healthyFat: false } });
  });
});
