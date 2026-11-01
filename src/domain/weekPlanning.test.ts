import type { WeekPlanEntry } from "./weekPlanning";
import { shoppingCheckId, weekPlan } from "./weekPlanning";

const entry = (id: string, weekStart: string): WeekPlanEntry => ({
  id,
  weekStart,
  dish: { kind: "text", text: id },
  servings: 2,
  slots: [{ date: weekStart, meal: "dinner" }],
});

describe("weekPlanning", () => {
  it("collects the entries of one week", () => {
    const plan = weekPlan("2026-11-02", [entry("a", "2026-11-02"), entry("b", "2026-11-09"), entry("c", "2026-11-02")]);

    expect(plan.entries.map((item) => item.id)).toEqual(["a", "c"]);
  });

  it("builds check ids that are valid database document ids", () => {
    expect(shoppingCheckId("2026-11-02", "rice")).toMatch(/^[A-Za-z0-9_\-.~:@+]+$/);
  });
});
