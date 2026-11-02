import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import { strings } from "@/ui/strings/uk";

describe("PantryView", () => {
  it("adds a product to the directory", async () => {
    const { dependencies } = renderApp("pantry");

    fireEvent.change(screen.getByLabelText(strings.products.addLabel), { target: { value: "Тофу" } });
    fireEvent.click(screen.getByRole("button", { name: strings.products.add }));

    expect(await screen.findByText("Тофу")).toBeInTheDocument();
    expect([...dependencies.products.getSnapshot().items.values()].map((product) => product.name)).toEqual(["Тофу"]);
  });

  it("toggles staples and nutrition flags", () => {
    const { dependencies } = renderApp("pantry", { withSampleData: true });

    fireEvent.click(screen.getByLabelText(`${strings.products.staple}: Нут`));
    fireEvent.click(screen.getByRole("button", { name: `${strings.products.nutrition.healthyFat}: Нут` }));

    expect(dependencies.products.getSnapshot().items.get("chickpeas")).toMatchObject({
      isStaple: true,
      nutrition: { protein: true, fiber: true, healthyFat: true },
    });
  });

  it("explains why a product in use cannot be deleted", async () => {
    renderApp("pantry", { withSampleData: true });

    const row = screen.getByText("Курка").closest("li");
    if (!row) throw new Error("row not found");
    fireEvent.click(within(row).getByRole("button", { name: strings.common.delete }));

    expect(await within(row).findByRole("alert")).toHaveTextContent(strings.products.inUse(1, 1));
  });

  it("creates a framework", async () => {
    const { dependencies } = renderApp("pantry", { withSampleData: true });

    fireEvent.click(screen.getByRole("tab", { name: strings.pantry.frameworks }));
    fireEvent.click(await screen.findByRole("button", { name: strings.frameworks.create }));
    await screen.findByRole("heading", { name: strings.frameworks.newHeading });
    fireEvent.change(screen.getByLabelText(strings.frameworks.title), { target: { value: "Омлет" } });
    fireEvent.change(screen.getByLabelText(`${strings.frameworks.slotName} 1`), { target: { value: "Начинка" } });
    fireEvent.change(screen.getByLabelText(`${strings.frameworks.optionName} 1.1`), { target: { value: "Болгарський перець" } });
    fireEvent.click(screen.getByRole("button", { name: strings.common.save }));

    expect(await screen.findByRole("button", { name: /Омлет/ })).toBeInTheDocument();
    const saved = [...dependencies.frameworks.getSnapshot().items.values()].find((framework) => framework.title === "Омлет");
    expect(saved?.slots[0]?.options[0]).toMatchObject({ kind: "product", productId: "bellPepper" });
  });
});
