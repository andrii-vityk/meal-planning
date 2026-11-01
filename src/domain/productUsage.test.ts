import { frameworks, recipes } from "@/domain/__fixtures__/catalog";
import { isUsed, productUsage } from "./productUsage";

describe("productUsage", () => {
  it("finds recipes and frameworks that mention a product", () => {
    const usage = productUsage("chicken", recipes.values(), frameworks.values());

    expect(usage).toEqual({ recipeIds: ["stirFry"], frameworkIds: ["bowl"] });
    expect(isUsed(usage)).toBe(true);
  });

  it("reports an unused product", () => {
    expect(isUsed(productUsage("egg", recipes.values(), frameworks.values()))).toBe(false);
  });
});
