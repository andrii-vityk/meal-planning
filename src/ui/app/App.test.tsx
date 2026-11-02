import { fireEvent, screen } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import { strings } from "@/ui/strings/uk";

const openSection = (name: string) => fireEvent.click(screen.getByRole("link", { name }));

describe("App", () => {
  it("opens the week plan by default", () => {
    renderApp("");

    expect(screen.getByRole("heading", { level: 1, name: strings.app.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: strings.navigation.plan })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();
  });

  it("opens the screen named in the address", () => {
    renderApp("recipe-new");

    expect(screen.getByRole("heading", { level: 2, name: strings.recipeForm.newHeading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: strings.navigation.recipes })).toHaveAttribute("aria-current", "page");
  });

  it("keeps typed text when switching sections", async () => {
    renderApp("cook");
    fireEvent.change(screen.getByLabelText(strings.cook.available), { target: { value: "курка, рис" } });

    openSection(strings.navigation.plan);
    expect(await screen.findByRole("heading", { level: 2, name: strings.plan.heading })).toBeInTheDocument();
    openSection(strings.navigation.cook);

    expect(await screen.findByRole("heading", { level: 2, name: strings.cook.heading })).toBeInTheDocument();
    expect(screen.getByLabelText(strings.cook.available)).toHaveValue("курка, рис");
  });

  it("returns to the last screen of a section, and to its start on a second tap", async () => {
    renderApp("recipes", { withSampleData: true });
    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    expect(await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ })).toBeInTheDocument();

    openSection(strings.navigation.plan);
    await screen.findByRole("heading", { level: 2, name: strings.plan.heading });
    openSection(strings.navigation.recipes);
    expect(await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ })).toBeInTheDocument();

    openSection(strings.navigation.recipes);
    expect(await screen.findByRole("heading", { level: 2, name: strings.recipes.heading })).toBeInTheDocument();
  });

  it("goes back through screens with the browser Back button", async () => {
    renderApp("recipes", { withSampleData: true });
    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ });
    fireEvent.click(screen.getByRole("button", { name: strings.common.edit }));
    await screen.findByRole("heading", { level: 2, name: strings.recipeForm.editHeading });

    window.history.back();
    expect(await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ })).toBeInTheDocument();
    window.history.back();
    expect(await screen.findByRole("heading", { level: 2, name: strings.recipes.heading })).toBeInTheDocument();
  });
});
