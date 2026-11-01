import { lentilSoup, stirFry } from "@/domain/__fixtures__/catalog";
import type { Recipe } from "./recipe";
import { scaleIngredients } from "./recipe";

describe("scaleIngredients", () => {
  it("scales every quantity by the ratio of servings", () => {
    const scaled = scaleIngredients(lentilSoup, 2);

    expect(scaled.map((ingredient) => ingredient.quantity)).toEqual([
      { amount: 150, unit: "g" },
      { amount: 0.5, unit: "piece" },
      { amount: 1, unit: "tbsp" },
    ]);
  });

  it("leaves 'to taste' ingredients without a quantity", () => {
    const recipe: Recipe = { ...stirFry, ingredients: [{ productId: "garlic", note: "за смаком" }] };

    expect(scaleIngredients(recipe, 4)).toEqual([{ productId: "garlic", note: "за смаком" }]);
  });

  it("rejects non-positive servings", () => {
    expect(() => scaleIngredients(stirFry, 0)).toThrow(RangeError);
  });
});
