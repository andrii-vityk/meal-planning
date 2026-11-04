import type { WeekPlanEntry } from "./weekPlanning";
import { dayMenu, shoppingCheckId, weekPlan } from "./weekPlanning";

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

describe("dayMenu", () => {
  const planned = (id: string, slots: { date: string; meal: "breakfast" | "lunch" | "dinner" | "snack" }[]) => ({
    id,
    dish: { kind: "text" as const, text: id },
    servings: 2,
    slots,
  });

  it("lists one day's meals in meal order and marks leftovers", () => {
    const soup = planned("soup", [
      { date: "2026-11-03", meal: "dinner" },
      { date: "2026-11-04", meal: "lunch" },
    ]);
    const porridge = planned("porridge", [{ date: "2026-11-04", meal: "breakfast" }]);
    const other = planned("other", [{ date: "2026-11-05", meal: "dinner" }]);

    expect(dayMenu([soup, other, porridge], "2026-11-04")).toEqual([
      { meal: "breakfast", entry: porridge, isLeftover: false },
      { meal: "lunch", entry: soup, isLeftover: true },
    ]);
  });
});
