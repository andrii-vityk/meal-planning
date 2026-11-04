import { act, screen } from "@testing-library/react";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { App } from "./App";

describe("App", () => {
  it("shows the empty state when there are no recipes", () => {
    renderWithDependencies(<App />);

    expect(screen.getByRole("heading", { level: 1, name: strings.app.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: strings.emptyState.heading })).toBeInTheDocument();
  });

  it("re-renders when a repository changes outside the component", async () => {
    const { dependencies } = renderWithDependencies(<App />);
    expect(screen.getByRole("status")).toHaveTextContent(strings.data.summary(0, 0, 0));

    await act(() =>
      dependencies.products.save({
        id: "p1",
        name: "Курка",
        aliases: [],
        category: "meat",
        nutrition: { protein: true, fiber: false, healthyFat: false },
        isStaple: false,
      }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(strings.data.summary(1, 0, 0));
  });
});
