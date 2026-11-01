import { AiError } from "@/application/ports/ai";
import { readClassification, readProductMatch, readRecipeDraft, readSubstitutions } from "./responses";

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
});
