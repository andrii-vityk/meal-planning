import { addDays, isIsoDate, startOfWeek, weekDates } from "./calendar";

describe("calendar", () => {
  it("recognises valid calendar dates only", () => {
    expect(isIsoDate("2026-11-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-11-2")).toBe(false);
  });

  it("adds days across month boundaries and daylight-saving changes", () => {
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("finds the Monday of a week, treating Sunday as the last day", () => {
    expect(startOfWeek("2026-11-04")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26");
  });

  it("lists the seven dates of a week", () => {
    expect(weekDates("2026-11-02")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });

  it("rejects malformed input instead of producing a wrong date", () => {
    expect(() => addDays("02.11.2026", 1)).toThrow(RangeError);
  });
});
