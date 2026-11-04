import { AiError } from "@/application/ports/ai";
import { readClassification, readProductMatch, readRecipeDraft, readSubstitutions, readWeekDraft, readDraftChange } from "./responses";

describe("AI answer validation", () => {
  it("keeps only known product ids and removes duplicates", () => {
    expect(readProductMatch({ productIds: ["rice", "rice", "invented"], unknown: ["лайм", " "] }, new Set(["rice"]))).toEqual({
      productIds: ["rice"],
      unknownNames: ["лайм"],
    });
  });

  it("falls back to safe defaults in a classification", () => {
    expect(readClassification({ category: "drinks", protein: "так", fiber: true })).toEqual({
      category: "other",
      nutrition: { protein: false, fiber: true, healthyFat: false },
    });
  });

  it("reads a recipe draft and drops unusable ingredients", () => {
    const draft = readRecipeDraft(
      {
        title: " Омлет ",
        servings: 1.6,
        timeMinutes: null,
        steps: ["Збити яйця", ""],
        ingredients: [
          { productId: "eggs", productName: "яйця", quantity: { amount: 3, unit: "piece" } },
          { productId: "ghost", productName: "сіль" },
          { quantity: { amount: 1, unit: "g" } },
        ],
      },
      new Set(["eggs"]),
    );

    expect(draft).toEqual({
      title: "Омлет",
      servings: 2,
      steps: ["Збити яйця"],
      tags: [],
      ingredients: [
        { productId: "eggs", productName: "яйця", quantity: { amount: 3, unit: "piece" } },
        { productName: "сіль" },
      ],
    });
  });

  it("rejects answers with nothing usable", () => {
    expect(() => readRecipeDraft({ servings: 2 }, new Set())).toThrow(AiError);
    expect(() => readProductMatch("not json", new Set())).toThrow(AiError);
  });

  it("keeps substitutions only for products that are actually missing", () => {
    expect(
      readSubstitutions(
        { substitutions: [{ productId: "mirin", suggestion: "цукор + рисовий оцет" }, { productId: "rice", suggestion: "булгур" }] },
        new Set(["mirin"]),
      ),
    ).toEqual([{ productId: "mirin", suggestion: "цукор + рисовий оцет" }]);
  });

  it("reads the shape of a week draft and drops malformed entries", () => {
    const draft = readWeekDraft({
      entries: [
        { recipeId: "soup", servings: 4, slots: [{ date: "2026-11-02", meal: "dinner" }, { date: "2026-11-03", meal: "brunch" }] },
        { frameworkId: "bowl", choices: { base: "rice", sauce: 3 }, slots: [{ date: "2026-11-04", meal: "lunch" }] },
        { text: " Яблуко ", servings: 1, slots: [{ date: "2026-11-04", meal: "snack" }] },
        { recipeId: "stew", slots: [] },
        { servings: 2, slots: [{ date: "2026-11-05", meal: "dinner" }] },
      ],
    });

    expect(draft).toEqual([
      { dish: { kind: "recipe", recipeId: "soup" }, servings: 4, slots: [{ date: "2026-11-02", meal: "dinner" }] },
      { dish: { kind: "framework", frameworkId: "bowl", choices: { base: "rice" } }, servings: 0, slots: [{ date: "2026-11-04", meal: "lunch" }] },
      { dish: { kind: "text", text: "Яблуко" }, servings: 1, slots: [{ date: "2026-11-04", meal: "snack" }] },
    ]);
    expect(() => readWeekDraft({ plan: [] })).toThrow();
  });

  it("reads a draft change request and keeps only valid entry numbers", () => {
    expect(
      readDraftChange(
        { excludeProductIds: ["mushrooms", 4], replaceEntries: [0, 2, 2, 9, -1, 1.5, "1"], note: " щось м'ясне " },
        3,
      ),
    ).toEqual({
      excludeProductIds: ["mushrooms"],
      excludeRecipeIds: [],
      excludeFrameworkIds: [],
      replaceEntries: [0, 2],
      note: "щось м'ясне",
    });
    expect(() => readDraftChange("no", 3)).toThrow();
  });
});
