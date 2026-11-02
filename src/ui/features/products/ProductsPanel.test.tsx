import { fireEvent, screen, within } from "@testing-library/react";
import { renderApp } from "@/test/renderApp";
import { strings } from "@/ui/strings/uk";

describe("ProductsPanel", () => {
  it("adds a product to the directory", async () => {
    const { dependencies } = renderApp("products");

    fireEvent.change(screen.getByLabelText(strings.products.addLabel), { target: { value: "Тофу" } });
    fireEvent.click(screen.getByRole("button", { name: strings.products.add }));

    expect(await screen.findByText("Тофу")).toBeInTheDocument();
    expect([...dependencies.products.getSnapshot().items.values()].map((product) => product.name)).toEqual(["Тофу"]);
  });

  it("toggles staples and nutrition flags", () => {
    const { dependencies } = renderApp("products", { withSampleData: true });

    fireEvent.click(screen.getByLabelText(`${strings.products.staple}: Нут`));
    fireEvent.click(screen.getByRole("button", { name: `${strings.products.nutrition.healthyFat}: Нут` }));

    expect(dependencies.products.getSnapshot().items.get("chickpeas")).toMatchObject({
      isStaple: true,
      nutrition: { protein: true, fiber: true, healthyFat: true },
    });
  });

  it("explains why a product in use cannot be deleted", async () => {
    renderApp("products", { withSampleData: true });

    const row = screen.getByText("Курка").closest("li");
    if (!row) throw new Error("row not found");
    fireEvent.click(within(row).getByRole("button", { name: strings.common.delete }));

    expect(await within(row).findByRole("alert")).toHaveTextContent(strings.products.inUse(1, 1));
  });
});
