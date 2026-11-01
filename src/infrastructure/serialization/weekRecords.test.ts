import type { WeekPlanEntry } from "@/domain/weekPlanning";
import { parsePlanEntry, parseShoppingItem, serializeWeekRecord } from "./weekRecords";

describe("week record serialization", () => {
  it("round-trips a plan entry with a framework dish", () => {
    const entry: WeekPlanEntry = {
      id: "e1",
      weekStart: "2026-11-02",
      dish: { kind: "framework", frameworkId: "bowl", choices: { base: "base-rice" } },
      servings: 3,
      slots: [
        { date: "2026-11-02", meal: "dinner" },
        { date: "2026-11-03", meal: "lunch" },
      ],
    };

    expect(parsePlanEntry("e1", serializeWeekRecord(entry))).toEqual(entry);
  });

  it("rejects entries without a valid slot or dish", () => {
    expect(
      parsePlanEntry("e1", { weekStart: "2026-11-02", servings: 2, dish: { kind: "text", text: "Піца" }, slots: [{ date: "2026-13-01", meal: "dinner" }] }),
    ).toBeNull();
    expect(parsePlanEntry("e1", { weekStart: "2026-11-02", servings: 2, dish: { kind: "recipe" }, slots: [{ date: "2026-11-02", meal: "dinner" }] })).toBeNull();
  });

  it("reads manual shopping items", () => {
    expect(parseShoppingItem("m1", { weekStart: "2026-11-02", text: "Серветки" })).toEqual({
      id: "m1",
      weekStart: "2026-11-02",
      text: "Серветки",
      checked: false,
    });
  });
});
