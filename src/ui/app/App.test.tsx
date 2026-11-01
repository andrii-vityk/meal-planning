import { screen } from "@testing-library/react";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { App } from "./App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "";
  });

  it("opens the recipes section by default", () => {
    renderWithDependencies(<App />);

    expect(screen.getByRole("heading", { level: 1, name: strings.app.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: strings.navigation.recipes })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 2, name: strings.recipes.heading })).toBeInTheDocument();
  });
});
