import type { Recipe } from "@/domain/recipe";
import { parseFramework, parseProduct, parseRecipe, SCHEMA_VERSION, serializeRecipe } from "./entities";

describe("entity serialization", () => {
  it("round-trips a recipe and stores the schema version without the id", () => {
    const recipe: Recipe = {
      id: "r1",
      title: "Сочевичний суп",
      servings: 4,
      ingredients: [{ productId: "lentils", quantity: { amount: 300, unit: "g" } }, { productId: "salt" }],
      steps: ["Варити 25 хв"],
      tags: [],
      kidFriendly: true,
      timeMinutes: 40,
    };

    const document = serializeRecipe(recipe);

    expect(document).not.toHaveProperty("id");
    expect(document.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parseRecipe("r1", document)).toEqual(recipe);
  });

  it("rejects documents without required fields", () => {
    expect(parseRecipe("r1", { title: "Без порцій" })).toBeNull();
    expect(parseProduct("p1", { name: "   " })).toBeNull();
    expect(parseFramework("f1", null)).toBeNull();
  });

  it("drops invalid parts instead of failing the whole document", () => {
    const product = parseProduct("p1", { name: "Нут", category: "unknown", nutrition: { protein: "yes" }, aliases: [1, "турецький горох"] });

    expect(product).toEqual({
      id: "p1",
      name: "Нут",
      aliases: ["турецький горох"],
      category: "other",
      nutrition: { protein: false, fiber: false, healthyFat: false },
      isStaple: false,
    });

    const recipe = parseRecipe("r1", {
      title: "Тест",
      servings: 2,
      ingredients: [{ productId: "a", quantity: { amount: -1, unit: "g" } }, { quantity: { amount: 1, unit: "g" } }],
    });
    expect(recipe?.ingredients).toEqual([{ productId: "a" }]);
  });

  it("reads framework options of both kinds and skips malformed ones", () => {
    const framework = parseFramework("f1", {
      title: "Боул",
      slots: [
        {
          id: "s1",
          name: "Білок",
          options: [
            { id: "o1", kind: "product", productId: "chicken" },
            { id: "o2", kind: "text", text: "Тофу" },
            { id: "o3", kind: "product" },
          ],
        },
      ],
    });

    expect(framework?.slots[0]).toEqual({
      id: "s1",
      name: "Білок",
      required: true,
      options: [
        { id: "o1", kind: "product", productId: "chicken", kidFriendly: false },
        { id: "o2", kind: "text", text: "Тофу", kidFriendly: false },
      ],
    });
  });
});
