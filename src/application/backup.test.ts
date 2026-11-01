import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { collectBackup, importBackup } from "./backup";

describe("backup use cases", () => {
  it("restores everything exported from another store, merging by id", async () => {
    const source = createInMemoryDependencies({ withSampleData: true });
    const text = source.backup.encode(collectBackup(source));

    const target = createInMemoryDependencies();
    await target.products.save({
      id: "own",
      name: "Власний продукт",
      aliases: [],
      category: "other",
      nutrition: { protein: false, fiber: false, healthyFat: false },
      isStaple: false,
    });

    const summary = await importBackup(target, text);

    expect(summary.records).toBeGreaterThan(0);
    expect(target.recipes.getSnapshot().items.get("teriyakiChicken")?.title).toBe("Курка теріякі з рисом");
    // nothing is deleted on import
    expect(target.products.getSnapshot().items.has("own")).toBe(true);
  });
});
