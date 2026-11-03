import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { addShoppingItem, setShoppingStatus } from "./planning";

describe("planning use cases", () => {
  it("stores a line's status as a record and removes it when the line is to buy again", async () => {
    const deps = createInMemoryDependencies();

    await setShoppingStatus(deps, "2026-11-02", "rice", "bought");
    expect([...deps.shoppingChecks.getSnapshot().items.values()]).toEqual([
      { id: "2026-11-02~rice", weekStart: "2026-11-02", productId: "rice", status: "bought" },
    ]);

    await setShoppingStatus(deps, "2026-11-02", "rice", "atHome");
    expect(deps.shoppingChecks.getSnapshot().items.get("2026-11-02~rice")?.status).toBe("atHome");

    await setShoppingStatus(deps, "2026-11-02", "rice", null);
    expect(deps.shoppingChecks.getSnapshot().items.size).toBe(0);
  });

  it("ignores empty manual items", async () => {
    const deps = createInMemoryDependencies();

    await addShoppingItem(deps, "2026-11-02", "  ");
    await addShoppingItem(deps, "2026-11-02", " Серветки ");

    expect([...deps.shoppingItems.getSnapshot().items.values()].map((item) => item.text)).toEqual(["Серветки"]);
  });
});
