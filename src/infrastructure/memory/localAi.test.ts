import { sampleProducts } from "./sampleData";
import { LocalAi } from "./localAi";

describe("LocalAi", () => {
  it("matches products through common Ukrainian case endings and aliases", async () => {
    const result = await new LocalAi().matchProducts("Є куряче філе, трохи броколі і сьомга", sampleProducts);

    expect(result.productIds).toEqual(expect.arrayContaining(["chicken", "broccoli", "salmon"]));
  });
});
