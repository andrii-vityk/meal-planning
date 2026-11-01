import { render, screen } from "@testing-library/react";
import { strings } from "@/ui/strings/uk";
import { App } from "./App";

describe("App", () => {
  it("renders the title and the empty state", () => {
    render(<App />);

    expect(screen.getByRole("heading", { level: 1, name: strings.app.title })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: strings.emptyState.heading })).toBeInTheDocument();
  });
});
