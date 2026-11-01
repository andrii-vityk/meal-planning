import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { RecipesView } from "./RecipesView";

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("RecipesView", () => {
  it("creates a recipe with a new product and opens it", async () => {
    const { dependencies } = renderWithDependencies(<RecipesView />);

    fireEvent.click(screen.getByRole("button", { name: strings.recipes.create }));
    type(strings.recipeForm.title, "Гречка з грибами");
    type(`${strings.recipeForm.productName} 1`, "Гречка");
    type(`${strings.recipeForm.amount} 1`, "200");
    fireEvent.change(screen.getByLabelText(`${strings.recipeForm.unit} 1`), { target: { value: "g" } });
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(await screen.findByRole("heading", { level: 2, name: "Гречка з грибами" })).toBeInTheDocument();
    expect(screen.getByText("Гречка")).toBeInTheDocument();
    expect(screen.getByText("200 г")).toBeInTheDocument();
    expect([...dependencies.products.getSnapshot().items.values()].map((product) => product.name)).toEqual(["Гречка"]);
  });

  it("scales ingredient amounts when servings change", () => {
    renderWithDependencies(<RecipesView />, { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    expect(screen.getByText("400 г")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(strings.recipes.servings), { target: { value: "4" } });

    expect(screen.getByText("800 г")).toBeInTheDocument();
  });

  it("validates the form before saving", () => {
    renderWithDependencies(<RecipesView />);

    fireEvent.click(screen.getByRole("button", { name: strings.recipes.create }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(screen.getByText(strings.recipeForm.titleRequired)).toBeInTheDocument();
  });

  it("turns pasted text into a prefilled form", async () => {
    renderWithDependencies(<RecipesView />);

    fireEvent.click(screen.getByRole("button", { name: strings.recipes.import }));
    type(strings.recipeImport.text, "Омлет\nЗбити яйця\nСмажити 3 хв");
    fireEvent.click(screen.getByRole("button", { name: strings.recipeImport.parse }));

    await waitFor(() => expect(screen.getByLabelText(strings.recipeForm.title)).toHaveValue("Омлет"));
    expect(screen.getByLabelText(strings.recipeForm.steps)).toHaveValue("Збити яйця\nСмажити 3 хв");
  });

  it("deletes a recipe after confirmation", async () => {
    const { dependencies } = renderWithDependencies(<RecipesView />, { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.delete }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.confirmDelete }));

    expect(await screen.findByText(strings.recipes.emptyHeading)).toBeInTheDocument();
    expect(dependencies.recipes.getSnapshot().items.size).toBe(0);
  });
});
