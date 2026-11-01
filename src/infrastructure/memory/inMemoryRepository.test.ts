import { InMemoryRepository } from "./inMemoryRepository";

interface Item {
  readonly id: string;
  readonly value: number;
}

describe("InMemoryRepository", () => {
  it("produces a new snapshot and notifies listeners on every change", async () => {
    const repository = new InMemoryRepository<Item>([{ id: "a", value: 1 }]);
    const listener = vi.fn();
    repository.subscribe(listener);
    const before = repository.getSnapshot();

    await repository.save({ id: "b", value: 2 });

    const after = repository.getSnapshot();
    expect(after).not.toBe(before);
    expect([...after.items.keys()]).toEqual(["a", "b"]);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("returns the same snapshot while nothing changes", () => {
    const repository = new InMemoryRepository<Item>();
    expect(repository.getSnapshot()).toBe(repository.getSnapshot());
  });

  it("stops notifying after unsubscribe and ignores removing unknown ids", async () => {
    const repository = new InMemoryRepository<Item>([{ id: "a", value: 1 }]);
    const listener = vi.fn();
    const unsubscribe = repository.subscribe(listener);

    await repository.remove("missing");
    unsubscribe();
    await repository.remove("a");

    expect(listener).not.toHaveBeenCalled();
    expect(repository.getSnapshot().items.size).toBe(0);
  });
});
