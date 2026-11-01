import { act, fireEvent, screen } from "@testing-library/react";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { ShoppingView } from "./ShoppingView";

describe("ShoppingView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists what the week's plan needs, without staples, and remembers what was bought", async () => {
    const dependencies = createInMemoryDependencies({ withSampleData: true });
    await dependencies.planEntries.save({
      id: "e1",
      weekStart: "2026-11-02",
      dish: { kind: "recipe", recipeId: "teriyakiChicken" },
      servings: 2,
      slots: [{ date: "2026-11-02", meal: "dinner" }],
    });
    renderWithDependencies(<ShoppingView />, { dependencies });

    expect(screen.getByText("Курка")).toBeInTheDocument();
    expect(screen.getByText("400 г")).toBeInTheDocument();
    expect(screen.getByText(strings.shopping.asNeeded)).toBeInTheDocument();
    expect(screen.queryByText("Соєвий соус")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(strings.shopping.bought("Курка")));
      await Promise.resolve();
    });

    expect(dependencies.shoppingChecks.getSnapshot().items.has("2026-11-02~chicken")).toBe(true);
    expect(screen.getByLabelText(strings.shopping.bought("Курка"))).toBeChecked();
  });

  it("adds items by hand", async () => {
    renderWithDependencies(<ShoppingView />);

    fireEvent.change(screen.getByLabelText(strings.shopping.addLabel), { target: { value: "Серветки" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: strings.shopping.add }));
      await Promise.resolve();
    });

    expect(screen.getByText("Серветки")).toBeInTheDocument();
  });
});
