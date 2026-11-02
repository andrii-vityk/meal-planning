import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import { strings } from "@/ui/strings/uk";

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const add = async (option: string) => {
  fireEvent.click(screen.getByRole("button", { name: strings.dishes.add }));
  fireEvent.click(screen.getByRole("button", { name: option }));
  await screen.findByRole("heading", { level: 2, name: (name) => name !== strings.dishes.heading });
};

describe("DishesView", () => {
  it("lists recipes and frameworks together and filters them by kind", async () => {
    renderApp("dishes", { withSampleData: true });

    expect(screen.getByRole("button", { name: /Курка теріякі/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Боул/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: strings.dishes.filters.frameworks }));

    await waitFor(() => expect(screen.queryByRole("button", { name: /Курка теріякі/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Боул/ })).toBeInTheDocument();
  });

  it("creates a recipe with a new product and opens it", async () => {
    const { dependencies } = renderApp("dishes");

    await add(strings.dishes.addRecipe);
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

  it("scales ingredient amounts when servings change", async () => {
    renderApp("dishes", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ });
    expect(screen.getByText("400 г")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(strings.recipes.servings), { target: { value: "4" } });

    expect(screen.getByText("800 г")).toBeInTheDocument();
  });

  it("validates the recipe form before saving", async () => {
    renderApp("dishes");

    await add(strings.dishes.addRecipe);
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(screen.getByText(strings.recipeForm.titleRequired)).toBeInTheDocument();
  });

  it("turns pasted text into a prefilled form", async () => {
    renderApp("dishes");

    await add(strings.dishes.addImport);
    type(strings.recipeImport.text, "Омлет\nЗбити яйця\nСмажити 3 хв");
    fireEvent.click(screen.getByRole("button", { name: strings.recipeImport.parse }));

    await waitFor(() => expect(screen.getByLabelText(strings.recipeForm.title)).toHaveValue("Омлет"));
    expect(screen.getByLabelText(strings.recipeForm.steps)).toHaveValue("Збити яйця\nСмажити 3 хв");
  });

  it("deletes a recipe after confirmation", async () => {
    const { dependencies } = renderApp("dishes", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: /Курка теріякі/ }));
    await screen.findByRole("heading", { level: 2, name: /Курка теріякі/ });
    fireEvent.click(screen.getByRole("button", { name: strings.common.delete }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.confirmDelete }));

    expect(await screen.findByRole("heading", { level: 2, name: strings.dishes.heading })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Курка теріякі/ })).not.toBeInTheDocument();
    expect(dependencies.recipes.getSnapshot().items.size).toBe(0);
  });

  it("shows a framework with its parts and options", async () => {
    renderApp("dishes", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: /Боул/ }));

    expect(await screen.findByRole("heading", { level: 2, name: /Боул/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: strings.frameworks.slots })).toBeInTheDocument();
    expect(screen.getByText("Рис")).toBeInTheDocument();
  });

  it("creates a framework and opens it", async () => {
    const { dependencies } = renderApp("dishes", { withSampleData: true });

    await add(strings.dishes.addFramework);
    type(strings.frameworks.title, "Омлет");
    type(`${strings.frameworks.slotName} 1`, "Начинка");
    type(`${strings.frameworks.optionName} 1.1`, "Болгарський перець");
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(await screen.findByRole("heading", { level: 2, name: "Омлет" })).toBeInTheDocument();
    expect(screen.getByText("Болгарський перець")).toBeInTheDocument();
    const saved = [...dependencies.frameworks.getSnapshot().items.values()].find((item) => item.title === "Омлет");
    expect(saved?.slots[0]?.options[0]).toMatchObject({ kind: "product", productId: "bellPepper" });
  });

  it("deletes a framework from its page", async () => {
    const { dependencies } = renderApp("framework-bowl", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.common.delete }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.confirmDelete }));

    expect(await screen.findByRole("heading", { level: 2, name: strings.dishes.heading })).toBeInTheDocument();
    expect(dependencies.frameworks.getSnapshot().items.has("bowl")).toBe(false);
  });
});

describe("adding a dish to the plan", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 4, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("plans a framework from its page with the chosen options", async () => {
    const { dependencies } = renderApp("framework-bowl", { withSampleData: true });

    fireEvent.click(screen.getByRole("button", { name: strings.plan.addToPlan }));
    fireEvent.click(screen.getByRole("button", { name: strings.plan.cell("четвер", strings.meals.dinner) }));
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(await screen.findByRole("status")).toHaveTextContent(strings.plan.saved("Боул"));
    const [entry] = dependencies.planEntries.getSnapshot().items.values();
    expect(entry).toMatchObject({
      weekStart: "2026-11-02",
      dish: { kind: "framework", frameworkId: "bowl" },
      slots: [{ date: "2026-11-05", meal: "dinner" }],
    });
  });
});
