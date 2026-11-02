import { BackupFormatError } from "@/application/ports/backup";
import { sampleFrameworks, sampleProducts, sampleRecipes } from "@/infrastructure/memory/sampleData";
import { JsonBackupCodec } from "./backupCodec";

describe("JsonBackupCodec", () => {
  const codec = new JsonBackupCodec();

  it("round-trips every kind of record", () => {
    const data = {
      products: sampleProducts,
      recipes: sampleRecipes,
      frameworks: sampleFrameworks,
      planEntries: [
        {
          id: "e1",
          weekStart: "2026-11-02",
          dish: { kind: "recipe" as const, recipeId: "teriyakiChicken" },
          servings: 2,
          slots: [{ date: "2026-11-02", meal: "dinner" as const }],
        },
      ],
      shoppingItems: [{ id: "m1", weekStart: "2026-11-02", text: "Серветки", checked: true }],
      shoppingChecks: [{ id: "2026-11-02~rice", weekStart: "2026-11-02", productId: "rice", status: "atHome" }],
    };

    expect(codec.decode(codec.encode(data))).toEqual(data);
  });

  it("rejects text that is not a backup of this app", () => {
    expect(() => codec.decode("not json")).toThrow(BackupFormatError);
    expect(() => codec.decode(JSON.stringify({ app: "something-else" }))).toThrow(BackupFormatError);
  });

  it("skips invalid records instead of failing the whole import", () => {
    const decoded = codec.decode(
      JSON.stringify({ app: "meal-planning", products: [{ id: "p1", name: "Нут" }, { name: "без id" }, { id: "p2" }] }),
    );

    expect(decoded.products.map((product) => product.id)).toEqual(["p1"]);
    expect(decoded.recipes).toEqual([]);
  });
});
