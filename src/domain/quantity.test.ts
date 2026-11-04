import { scaleQuantity, sumQuantities } from "./quantity";

describe("quantity", () => {
  it("scales without floating-point noise", () => {
    expect(scaleQuantity({ amount: 0.1, unit: "kg" }, 3)).toEqual({ amount: 0.3, unit: "kg" });
  });

  it("merges convertible units and keeps the others apart", () => {
    expect(
      sumQuantities([
        { amount: 200, unit: "g" },
        { amount: 0.5, unit: "kg" },
        { amount: 2, unit: "piece" },
        { amount: 1, unit: "piece" },
        { amount: 1, unit: "l" },
      ]),
    ).toEqual([
      { amount: 700, unit: "g" },
      { amount: 3, unit: "piece" },
      { amount: 1000, unit: "ml" },
    ]);
  });

  it("returns nothing for nothing", () => {
    expect(sumQuantities([])).toEqual([]);
  });
});
