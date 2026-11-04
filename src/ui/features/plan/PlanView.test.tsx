import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import { strings } from "@/ui/strings/uk";

const cell = (day: string, meal: string) => strings.plan.cell(day, meal);

describe("PlanView", () => {
  beforeEach(() => {
    // Only the clock is faked: "today" is Wednesday 4 November 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a dish with leftovers and shows nutrition coverage on both days", async () => {
    const { dependencies } = renderApp("plan", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.dinner, "понеділок") }));
    const panel = screen.getByRole("dialog", { name: strings.plan.newEntry });
    expect(within(panel).getByRole("button", { name: cell("понеділок", strings.meals.dinner) })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(within(panel).getByLabelText(strings.plan.dishSearch), { target: { value: "теріякі" } });
    fireEvent.click(within(panel).getByRole("button", { name: /Курка теріякі з рисом/ }));
    fireEvent.click(within(panel).getByRole("button", { name: cell("вівторок", strings.meals.lunch) }));
    fireEvent.click(within(panel).getByRole("button", { name: strings.common.save }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const title = "Курка теріякі з рисом";
    expect(screen.getAllByRole("button", { name: strings.plan.editEntry(title) })).toHaveLength(2);
    expect(screen.getByText(`· ${strings.plan.leftovers}`, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByLabelText(strings.plan.covered(strings.products.nutrition.protein))).toHaveLength(2);

    const [entry] = dependencies.planEntries.getSnapshot().items.values();
    expect(entry).toMatchObject({
      weekStart: "2026-11-02",
      dish: { kind: "recipe", recipeId: "teriyakiChicken" },
      servings: 2,
      slots: [
        { date: "2026-11-02", meal: "dinner" },
        { date: "2026-11-03", meal: "lunch" },
      ],
    });
  });

  it("plans a dish written in own words", async () => {
    const { dependencies } = renderApp("plan");

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.snack, "середа") }));
    fireEvent.change(screen.getByLabelText(strings.plan.dishSearch), { target: { value: "Яблука й горіхи" } });
    fireEvent.click(screen.getByRole("button", { name: strings.plan.asText("Яблука й горіхи") }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect([...dependencies.planEntries.getSnapshot().items.values()][0]?.dish).toEqual({
      kind: "text",
      text: "Яблука й горіхи",
    });
  });

  it("asks for a dish before saving", () => {
    renderApp("plan");

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.breakfast, "вівторок") }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(screen.getByRole("alert")).toHaveTextContent(strings.plan.invalid);
  });

  it("closes the panel with the browser Back button", async () => {
    renderApp("plan");

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.lunch, "четвер") }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    window.history.back();

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();
  });

  it("drafts the week with AI, replaces one dish and saves the draft", async () => {
    // Monday: the whole week is still ahead, so the draft offers every open slot.
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    const { dependencies } = renderApp("plan", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.draft.open }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: strings.draft.generate }));

    const bar = await screen.findByRole("region", { name: strings.draft.heading });
    expect(bar).toHaveTextContent(strings.draft.summary(28));
    expect(dependencies.planEntries.getSnapshot().items.size).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: strings.draft.replace("Курка теріякі з рисом") }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: strings.draft.replace("Курка теріякі з рисом") })).not.toBeInTheDocument(),
    );

    // The replacement request finishes after the new dish appears.
    const accept = screen.getByRole("button", { name: strings.draft.accept });
    await waitFor(() => expect(accept).toBeEnabled());
    fireEvent.click(accept);

    await waitFor(() => expect(dependencies.planEntries.getSnapshot().items.size).toBe(28));
    expect(screen.queryByRole("region", { name: strings.draft.heading })).not.toBeInTheDocument();
    const dishes = [...dependencies.planEntries.getSnapshot().items.values()].map((entry) => entry.dish.kind);
    expect(dishes).not.toContain("recipe");
  });

  it("leaves planned meals alone when drafting", async () => {
    // Monday: the whole week is still ahead, so the draft offers every open slot.
    vi.setSystemTime(new Date(2026, 10, 2, 12));
    const { dependencies } = renderApp("plan", { withSampleData: true });
    await dependencies.planEntries.save({
      id: "fixed",
      weekStart: "2026-11-02",
      dish: { kind: "text", text: "Гості" },
      servings: 4,
      slots: [{ date: "2026-11-07", meal: "dinner" }],
    });

    fireEvent.click(screen.getByRole("button", { name: strings.draft.open }));
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByRole("button", { name: strings.plan.cell("субота", strings.meals.dinner) })).toBeDisabled();
    fireEvent.click(within(sheet).getByRole("button", { name: strings.plan.cell("неділя", strings.meals.dinner) }));
    fireEvent.click(within(sheet).getByRole("button", { name: strings.draft.generate }));

    expect(await screen.findByRole("region", { name: strings.draft.heading })).toHaveTextContent(strings.draft.summary(26));
  });

  it("does not offer days already past for a new draft", () => {
    renderApp("plan", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.draft.open }));
    const sheet = screen.getByRole("dialog");
    const pressed = (day: string) =>
      within(sheet).getByRole("button", { name: strings.plan.cell(day, strings.meals.lunch) }).getAttribute("aria-pressed");

    expect(pressed("вівторок")).toBe("false");
    expect(pressed("середа")).toBe("true");
    expect(pressed("неділя")).toBe("true");
  });

  describe("changing a draft in words", () => {
    beforeEach(() => {
      // Monday: the whole week is still ahead, so the draft offers every open slot.
      vi.setSystemTime(new Date(2026, 10, 2, 12));
    });

    const draftWeekNow = async () => {
      fireEvent.click(screen.getByRole("button", { name: strings.draft.open }));
      fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: strings.draft.generate }));
      return screen.findByRole("region", { name: strings.draft.heading });
    };
    const ask = (text: string) => {
      fireEvent.change(screen.getByLabelText(strings.draft.changeLabel), { target: { value: text } });
      fireEvent.click(screen.getByRole("button", { name: strings.draft.change }));
    };

    it("switches the framework option that uses an excluded product and keeps the rest", async () => {
      const { dependencies } = renderApp("plan", { withSampleData: true });
      const bar = await draftWeekNow();

      ask("без лосося");

      expect(await within(bar).findByRole("status")).toHaveTextContent(strings.draft.changedCount(20));
      expect(bar).toHaveTextContent(strings.draft.summary(28));

      const accept = screen.getByRole("button", { name: strings.draft.accept });
      await waitFor(() => expect(accept).toBeEnabled());
      fireEvent.click(accept);
      await waitFor(() => expect(dependencies.planEntries.getSnapshot().items.size).toBe(28));
      const proteins = [...dependencies.planEntries.getSnapshot().items.values()].flatMap((entry) =>
        entry.dish.kind === "framework" ? [entry.dish.choices.protein] : [],
      );
      expect(proteins).toHaveLength(20);
      expect(proteins).not.toContain("protein-salmon");
    });

    it("removes a named dish from the whole draft", async () => {
      renderApp("plan", { withSampleData: true });
      const bar = await draftWeekNow();

      ask("прибери боул");

      expect(await within(bar).findByRole("status")).toHaveTextContent(strings.draft.removedOnly);
      expect(bar).toHaveTextContent(strings.draft.summary(8));
      expect(screen.queryByRole("button", { name: strings.draft.replace("Боул") })).not.toBeInTheDocument();
    });
  });
});
