import { AiError } from "@/application/ports/ai";
import type { Product } from "@/domain/product";
import { PlatformAi } from "./platformAi";
import type { PlatformSample } from "./runtime";

const rice: Product = {
  id: "rice",
  name: "Рис",
  aliases: [],
  category: "grains",
  nutrition: { protein: false, fiber: false, healthyFat: false },
  isStaple: false,
};

describe("PlatformAi", () => {
  it("asks the quick model and validates the answer", async () => {
    const json = vi.fn().mockResolvedValue({ productIds: ["rice", "nope"], unknown: [] });
    const ai = new PlatformAi({ json } satisfies PlatformSample);

    const result = await ai.matchProducts("півпачки рису", [rice]);

    expect(result).toEqual({ productIds: ["rice"], unknownNames: [] });
    expect(json).toHaveBeenCalledWith(expect.stringContaining("півпачки рису"), expect.objectContaining({ modelTier: "quick", cache: false }));
  });

  it("translates host error codes into AiError codes", async () => {
    const ai = new PlatformAi({ json: vi.fn().mockRejectedValue({ code: "rate_limited", message: "limit" }) });

    await expect(ai.classifyProduct("Нут")).rejects.toMatchObject({ name: "AiError", code: "rateLimited" });
  });

  it("is unavailable when the page cannot call Claude", async () => {
    const ai = new PlatformAi(null);

    await expect(ai.classifyProduct("Нут")).rejects.toBeInstanceOf(AiError);
  });
});
