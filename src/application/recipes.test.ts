import type { AppDependencies } from "@/application/dependencies";
import { AiError } from "@/application/ports/ai";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { saveRecipe, ValidationError } from "./recipes";

describe("saveRecipe", () => {
  let deps: AppDependencies;

  beforeEach(() => {
    deps = createInMemoryDependencies({ withSampleData: true });
  });

  it("reuses existing products by name and creates the missing ones", async () => {
    vi.spyOn(deps.ai, "classifyProduct").mockResolvedValue({
      category: "fruits",
      nutrition: { protein: false, fiber: true, healthyFat: false },
    });

    const recipe = await saveRecipe(deps, {
      title: "Салат",
      servings: 2,
      ingredients: [
        { productName: "броколі", quantity: { amount: 200, unit: "g" } },
        { productName: "Лайм", note: "сік" },
      ],
      steps: [],
      tags: [],
      kidFriendly: false,
    });

    const products = deps.products.getSnapshot().items;
    const lime = [...products.values()].find((product) => product.name === "Лайм");
    expect(lime).toMatchObject({ category: "fruits", nutrition: { fiber: true } });
    expect(recipe.ingredients).toEqual([
      { productId: "broccoli", quantity: { amount: 200, unit: "g" } },
      { productId: lime?.id, note: "сік" },
    ]);
    expect(deps.recipes.getSnapshot().items.get(recipe.id)).toEqual(recipe);
  });

  it("still saves when the AI cannot classify a new product", async () => {
    vi.spyOn(deps.ai, "classifyProduct").mockRejectedValue(new AiError("unavailable", "no"));

    await saveRecipe(deps, { title: "Тест", servings: 1, ingredients: [{ productName: "Тахіні" }], steps: [], tags: [], kidFriendly: false });

    const tahini = [...deps.products.getSnapshot().items.values()].find((product) => product.name === "Тахіні");
    expect(tahini?.category).toBe("other");
  });

  it("rejects a recipe without a title", async () => {
    await expect(
      saveRecipe(deps, { title: " ", servings: 2, ingredients: [], steps: [], tags: [], kidFriendly: false }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
