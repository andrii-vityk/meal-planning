import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { addShoppingItem, setBought } from "./planning";

describe("planning use cases", () => {
  it("stores a bought line as a record and removes it when unchecked", async () => {
    const deps = createInMemoryDependencies();

    await setBought(deps, "2026-11-02", "rice", true);
    expect([...deps.shoppingChecks.getSnapshot().items.values()]).toEqual([
      { id: "2026-11-02~rice", weekStart: "2026-11-02", productId: "rice" },
    ]);

    await setBought(deps, "2026-11-02", "rice", false);
    expect(deps.shoppingChecks.getSnapshot().items.size).toBe(0);
  });

  it("ignores empty manual items", async () => {
    const deps = createInMemoryDependencies();

    await addShoppingItem(deps, "2026-11-02", "  ");
    await addShoppingItem(deps, "2026-11-02", " Серветки ");

    expect([...deps.shoppingItems.getSnapshot().items.values()].map((item) => item.text)).toEqual(["Серветки"]);
  });
});
