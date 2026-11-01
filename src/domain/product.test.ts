import { productList } from "@/domain/__fixtures__/catalog";
import type { Product } from "./product";
import { findProductByName } from "./product";

describe("findProductByName", () => {
  it("matches names and aliases ignoring case and surrounding spaces", () => {
    const chicken: Product = {
      id: "chicken",
      name: "Курка",
      aliases: ["Куряче філе"],
      category: "meat",
      nutrition: { protein: true, fiber: false, healthyFat: false },
      isStaple: false,
    };

    expect(findProductByName(productList, "  броколі ")?.id).toBe("broccoli");
    expect(findProductByName([chicken], "куряче філе")?.id).toBe("chicken");
  });

  it("finds nothing for unknown or empty names", () => {
    expect(findProductByName(productList, "лайм")).toBeUndefined();
    expect(findProductByName(productList, " ")).toBeUndefined();
  });
});
