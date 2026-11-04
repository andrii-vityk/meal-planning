import type { AiService } from "@/application/ports/ai";
import { AiError } from "@/application/ports/ai";
import type { AiLogEntry } from "@/application/ports/aiLog";
import { InMemoryRepository } from "@/infrastructure/memory/inMemoryRepository";
import { LocalAi } from "@/infrastructure/memory/localAi";
import { parseAiLogEntry, serializeAiLogEntry } from "@/infrastructure/serialization/aiLog";
import { LoggingAi } from "./loggingAi";

const setVisibility = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
};

const entries = (log: InMemoryRepository<AiLogEntry>) => [...log.getSnapshot().items.values()];

describe("LoggingAi", () => {
  afterEach(() => setVisibility("visible"));

  it("records a successful call and returns its result unchanged", async () => {
    const log = new InMemoryRepository<AiLogEntry>();
    const ai = new LoggingAi(new LocalAi(), log, () => "l1");

    const result = await ai.classifyProduct("Тофу");

    expect(result.category).toBe("other");
    expect(entries(log)).toEqual([
      expect.objectContaining({ id: "l1", operation: "classifyProduct", outcome: "ok", hiddenDuring: false }),
    ]);
  });

  it("records a failure with its code and whether the page was hidden meanwhile", async () => {
    const log = new InMemoryRepository<AiLogEntry>();
    let fail: (error: unknown) => void = () => undefined;
    const inner: Partial<AiService> = {
      classifyProduct: () =>
        new Promise((_, reject) => {
          fail = reject;
        }),
    };
    const ai = new LoggingAi(inner as AiService, log, () => "l2");

    const call = ai.classifyProduct("Тофу");
    setVisibility("hidden");
    setVisibility("visible");
    fail(new AiError("failed", "network_error"));

    await expect(call).rejects.toThrow(AiError);
    expect(entries(log)).toEqual([
      expect.objectContaining({
        outcome: "error",
        errorCode: "failed",
        detail: "network_error",
        hiddenAtStart: false,
        hiddenDuring: true,
        hiddenAtEnd: false,
      }),
    ]);
  });

  it("stores entries in a form it can read back", async () => {
    const log = new InMemoryRepository<AiLogEntry>();
    await new LoggingAi(new LocalAi(), log, () => "l3").matchProducts("рис", []);
    const [entry] = entries(log);
    if (!entry) throw new Error("no entry");

    expect(parseAiLogEntry(entry.id, serializeAiLogEntry(entry))).toEqual(entry);
    expect(parseAiLogEntry("x", { startedAt: "2026-11-04T10:00:00Z", operation: "hack", outcome: "ok" })).toBeNull();
  });
});
