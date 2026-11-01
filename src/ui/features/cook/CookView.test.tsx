import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { CookView } from "./CookView";

describe("CookView", () => {
  it("recognizes products and ranks dishes by what is missing", async () => {
    renderWithDependencies(<CookView />, { withSampleData: true });

    fireEvent.change(screen.getByLabelText(strings.cook.available), { target: { value: "куряче філе і броколі" } });
    fireEvent.click(screen.getByRole("button", { name: strings.cook.find }));

    const cards = await screen.findAllByRole("listitem");
    const titles = cards.map((card) => card.textContent ?? "");
    const bowlIndex = titles.findIndex((text) => text.startsWith("Боул"));
    const teriyakiIndex = titles.findIndex((text) => text.startsWith("Курка теріякі"));

    expect(bowlIndex).toBeGreaterThanOrEqual(0);
    expect(teriyakiIndex).toBeGreaterThan(bowlIndex);
    expect(cards[teriyakiIndex]).toHaveTextContent(`${strings.cook.missing}: Кунжут`);
  });

  it("lets the user correct the recognized list by hand", async () => {
    renderWithDependencies(<CookView />, { withSampleData: true });

    fireEvent.change(screen.getByLabelText(strings.cook.addManually), { target: { value: "Лосось" } });
    fireEvent.click(screen.getByRole("button", { name: strings.cook.addManuallyAction }));
    fireEvent.change(screen.getByLabelText(strings.cook.addManually), { target: { value: "Авокадо" } });
    fireEvent.click(screen.getByRole("button", { name: strings.cook.addManuallyAction }));

    const bowl = (await screen.findByText("Боул")).closest("li");
    if (!bowl) throw new Error("card not found");
    expect(within(bowl).getByText(strings.cook.allThere)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: strings.cook.removeProduct("Лосось") }));
    fireEvent.change(screen.getByLabelText(strings.cook.maxMissing), { target: { value: "0" } });

    expect(screen.queryByText("Боул")).not.toBeInTheDocument();
  });
});
