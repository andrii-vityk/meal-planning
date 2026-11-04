import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { App } from "@/ui/app/App";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";

describe("today screen", () => {
  beforeEach(() => {
    // "Today" is Wednesday 4 November 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12));
    window.history.replaceState(null, "", "#plan");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const withTodayPlanned = async () => {
    const dependencies = createInMemoryDependencies({ withSampleData: true });
    await dependencies.planEntries.save({
      id: "e1",
      weekStart: "2026-11-02",
      dish: { kind: "recipe", recipeId: "teriyakiChicken" },
      servings: 2,
      slots: [
        { date: "2026-11-03", meal: "dinner" },
        { date: "2026-11-04", meal: "lunch" },
      ],
    });
    await dependencies.planEntries.save({
      id: "e2",
      weekStart: "2026-11-02",
      dish: { kind: "text", text: "Яблука й горіхи" },
      servings: 2,
      slots: [{ date: "2026-11-04", meal: "snack" }],
    });
    return dependencies;
  };

  it("opens on today's meals when today is planned, and switches to the week", async () => {
    renderWithDependencies(<App />, { dependencies: await withTodayPlanned() });

    expect(screen.getByRole("heading", { level: 2, name: strings.today.heading })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.today.openDish("Курка теріякі з рисом") })).toHaveTextContent(
      strings.plan.leftovers,
    );
    // The week stays mounted but hidden, so look inside the today screen only.
    expect(within(screen.getByRole("region", { name: strings.today.heading })).getByText("Яблука й горіхи")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: strings.plan.heading })).not.toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole("button", { name: strings.today.wholeWeek })));

    expect(window.location.hash).toBe("#week");
    // The hashchange event arrives asynchronously, as in a browser.
    expect(await screen.findByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: strings.today.backToToday }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 2, name: strings.today.heading })).toBeInTheDocument(),
    );
  });

  it("opens a planned recipe", async () => {
    renderWithDependencies(<App />, { dependencies: await withTodayPlanned() });

    act(() => fireEvent.click(screen.getByRole("button", { name: strings.today.openDish("Курка теріякі з рисом") })));

    expect(window.location.hash).toBe("#recipe-teriyakiChicken");
  });

  it("after returning from a dish opened here, the dishes link opens the list", async () => {
    renderWithDependencies(<App />, { dependencies: await withTodayPlanned() });

    act(() => fireEvent.click(screen.getByRole("button", { name: strings.today.openDish("Курка теріякі з рисом") })));
    expect(await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ })).toBeInTheDocument();

    act(() => window.history.back());
    expect(await screen.findByRole("heading", { level: 2, name: strings.today.heading })).toBeInTheDocument();

    act(() => fireEvent.click(screen.getByRole("link", { name: strings.navigation.dishes })));
    expect(await screen.findByRole("heading", { level: 2, name: strings.dishes.heading })).toBeInTheDocument();
  });

  it("shows the week when nothing is planned for today, and stays there after planning today", async () => {
    const dependencies = createInMemoryDependencies({ withSampleData: true });
    renderWithDependencies(<App />, { dependencies });

    expect(screen.getByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();

    await act(() =>
      dependencies.planEntries.save({
        id: "e3",
        weekStart: "2026-11-02",
        dish: { kind: "text", text: "Суп" },
        servings: 2,
        slots: [{ date: "2026-11-04", meal: "dinner" }],
      }),
    );

    expect(screen.getByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: strings.today.heading })).not.toBeInTheDocument();
  });
});
