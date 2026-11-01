import { fireEvent, screen } from "@testing-library/react";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { PlanView } from "./PlanView";

describe("PlanView", () => {
  beforeEach(() => {
    // Only the clock is faked: "today" is Wednesday 4 November 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("adds a dish with leftovers and shows nutrition coverage on both days", () => {
    const { dependencies } = renderWithDependencies(<PlanView />, { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.dinner, "понеділок") }));
    fireEvent.change(screen.getByLabelText(strings.plan.slotDay), { target: { value: "2026-11-03" } });
    fireEvent.change(screen.getByLabelText(strings.plan.slotMeal), { target: { value: "lunch" } });
    fireEvent.click(screen.getByRole("button", { name: strings.plan.addSlot }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    const title = "Курка теріякі з рисом";
    expect(screen.getAllByRole("button", { name: strings.plan.editEntry(title) })).toHaveLength(2);
    expect(screen.getByText(`· ${strings.plan.leftovers}`, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByLabelText(strings.plan.covered(strings.products.nutrition.protein))).toHaveLength(2);

    const [entry] = dependencies.planEntries.getSnapshot().items.values();
    expect(entry).toMatchObject({
      weekStart: "2026-11-02",
      dish: { kind: "recipe", recipeId: "teriyakiChicken" },
      slots: [
        { date: "2026-11-02", meal: "dinner" },
        { date: "2026-11-03", meal: "lunch" },
      ],
    });
  });

  it("asks for a dish before saving", () => {
    renderWithDependencies(<PlanView />);

    fireEvent.click(screen.getByRole("button", { name: strings.plan.add(strings.meals.breakfast, "вівторок") }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(screen.getByRole("alert")).toHaveTextContent(strings.plan.invalid);
  });
});
