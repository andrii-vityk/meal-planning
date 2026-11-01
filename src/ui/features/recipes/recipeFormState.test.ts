import type { RecipeFormState } from "./recipeFormState";
import { emptyRow, fromFormState, toFormState } from "./recipeFormState";

const base: RecipeFormState = {
  title: "Омлет",
  servings: "2",
  timeMinutes: "",
  ingredients: [],
  steps: "",
  tags: "",
  kidFriendly: false,
  sourceUrl: "",
  notes: "",
};

describe("recipe form state", () => {
  it("converts strings into a recipe input, skipping empty rows", () => {
    const result = fromFormState(
      {
        ...base,
        timeMinutes: "15",
        ingredients: [
          { ...emptyRow(), productName: " Яйця ", amount: "3", unit: "piece" },
          { ...emptyRow(), productName: "Сіль", amount: "", unit: "", note: "за смаком" },
          { ...emptyRow(), productName: "Молоко", amount: "0,5", unit: "" },
          emptyRow(),
        ],
        steps: "Збити яйця\n\n Смажити ",
        tags: "сніданок, швидко,",
      },
      undefined,
    );

    expect(result).toEqual({
      input: {
        title: "Омлет",
        servings: 2,
        timeMinutes: 15,
        ingredients: [
          { productName: "Яйця", quantity: { amount: 3, unit: "piece" } },
          { productName: "Сіль", note: "за смаком" },
          { productName: "Молоко" },
        ],
        steps: ["Збити яйця", "Смажити"],
        tags: ["сніданок", "швидко"],
        kidFriendly: false,
      },
    });
  });

  it("reports missing title and invalid servings", () => {
    expect(fromFormState({ ...base, title: " ", servings: "0" }, undefined)).toEqual({
      errors: { title: true, servings: true },
    });
  });

  it("fills product names from ids when editing an existing recipe", () => {
    const state = toFormState(
      { title: "Суп", servings: 4, ingredients: [{ productId: "p1", productName: "" }], steps: ["Варити"], tags: [], kidFriendly: true },
      (id) => (id === "p1" ? "Сочевиця" : undefined),
    );

    expect(state.ingredients[0]).toMatchObject({ productId: "p1", productName: "Сочевиця" });
    expect(state.steps).toBe("Варити");
  });
});
