import { PlatformRepository } from "./platformRepository";
import type { PlatformCollection, PlatformDb, PlatformError, PlatformQuerySnapshot } from "./runtime";

interface Item {
  readonly id: string;
  readonly name: string;
}

/** A fake host database collection that lets the test push snapshots. */
function fakeDb() {
  let push: ((snapshot: PlatformQuerySnapshot) => void) | null = null;
  let fail: ((error: PlatformError) => void) | null = null;
  const written: Record<string, unknown> = {};
  const unsubscribe = vi.fn();

  const collection: PlatformCollection = {
    doc: (id) => ({
      set: (data) => {
        written[id] = data;
        return Promise.resolve();
      },
      delete: () => {
        written[id] = undefined;
        return Promise.resolve();
      },
    }),
    onSnapshot: (next, error) => {
      push = next;
      fail = error ?? null;
      return unsubscribe;
    },
  };
  const db: PlatformDb = { collection: () => collection };

  const emit = (docs: Record<string, unknown>, fromCache = false) =>
    push?.({
      docs: Object.entries(docs).map(([id, data]) => ({ id, data: () => data as Record<string, unknown> })),
      metadata: { fromCache },
    });

  return { db, emit, fail: (error: PlatformError) => fail?.(error), written, unsubscribe };
}

const codec = {
  parse: (id: string, raw: unknown): Item | null =>
    typeof raw === "object" && raw !== null && "name" in raw && typeof raw.name === "string" ? { id, name: raw.name } : null,
  serialize: (item: Item) => ({ name: item.name }),
};

describe("PlatformRepository", () => {
  it("is loading until the store answers, then exposes the valid documents", () => {
    const { db, emit } = fakeDb();
    const repository = new PlatformRepository(db, "items", codec);
    repository.subscribe(() => undefined);

    expect(repository.getSnapshot().status).toBe("loading");

    emit({ a: { name: "Перший" }, broken: { title: "без назви" } });

    expect(repository.getSnapshot().status).toBe("ready");
    expect([...repository.getSnapshot().items.values()]).toEqual([{ id: "a", name: "Перший" }]);
  });

  it("treats a cached copy as still loading", () => {
    const { db, emit } = fakeDb();
    const repository = new PlatformRepository(db, "items", codec);
    repository.subscribe(() => undefined);

    emit({ a: { name: "З кешу" } }, true);

    expect(repository.getSnapshot()).toMatchObject({ status: "loading" });
    expect(repository.getSnapshot().items.size).toBe(1);
  });

  it("reports store errors and closes the subscription when the last listener leaves", () => {
    const { db, fail, unsubscribe } = fakeDb();
    const repository = new PlatformRepository(db, "items", codec);
    const stop = repository.subscribe(() => undefined);

    fail({ code: "revoked", message: "access withdrawn" });
    expect(repository.getSnapshot()).toMatchObject({ status: "error", errorMessage: "revoked" });

    stop();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("writes documents through the codec", async () => {
    const { db, written } = fakeDb();
    const repository = new PlatformRepository(db, "items", codec);

    await repository.save({ id: "a", name: "Новий" });

    expect(written.a).toEqual({ name: "Новий" });
  });
});
