import type { AppDependencies } from "@/application/dependencies";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { addProduct, deleteProduct, ProductInUseError, saveFramework } from "./catalog";

describe("catalog use cases", () => {
  let deps: AppDependencies;

  beforeEach(() => {
    deps = createInMemoryDependencies({ withSampleData: true });
  });

  it("adds a product once, matching existing names", async () => {
    const first = await addProduct(deps, "Тахіні");
    const second = await addProduct(deps, "тахіні");

    expect(second.id).toBe(first.id);
  });

  it("refuses to delete a product that a recipe uses", async () => {
    await expect(deleteProduct(deps, "chicken")).rejects.toBeInstanceOf(ProductInUseError);
    expect(deps.products.getSnapshot().items.has("chicken")).toBe(true);
  });

  it("deletes an unused product", async () => {
    await deleteProduct(deps, "eggs");
    expect(deps.products.getSnapshot().items.has("eggs")).toBe(false);
  });

  it("saves a framework, creating products named by its options", async () => {
    const framework = await saveFramework(deps, {
      title: "Паста",
      kidFriendly: true,
      slots: [
        {
          name: "Основа",
          required: true,
          options: [
            { kind: "product", productName: "Спагеті", kidFriendly: true },
            { kind: "text", text: "Будь-яка коротка паста", kidFriendly: true },
          ],
        },
        { name: " ", required: false, options: [] },
      ],
    });

    expect(framework.slots).toHaveLength(1);
    const [spaghetti, text] = framework.slots[0]?.options ?? [];
    expect(text).toMatchObject({ kind: "text", text: "Будь-яка коротка паста" });
    expect(spaghetti?.kind === "product" && deps.products.getSnapshot().items.get(spaghetti.productId)?.name).toBe("Спагеті");
  });
});
