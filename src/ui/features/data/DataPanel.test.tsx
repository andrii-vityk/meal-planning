import { fireEvent, screen } from "@testing-library/react";
import { collectBackup } from "@/application/backup";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { DataPanel } from "./DataPanel";

describe("DataPanel", () => {
  it("imports a backup file after confirmation", async () => {
    const source = createInMemoryDependencies({ withSampleData: true });
    const file = new File([source.backup.encode(collectBackup(source))], "backup.json", { type: "application/json" });
    const { dependencies } = renderWithDependencies(<DataPanel />);

    fireEvent.change(screen.getByLabelText(strings.backup.importLabel), { target: { files: [file] } });
    expect(screen.getByText(strings.backup.importQuestion("backup.json"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: strings.backup.import }));

    expect(await screen.findByRole("status")).toHaveTextContent(/Імпортовано записів/);
    expect(dependencies.recipes.getSnapshot().items.size).toBe(1);
  });

  it("explains when the file is not a backup", async () => {
    const file = new File(["{}"], "random.json", { type: "application/json" });
    renderWithDependencies(<DataPanel />);

    fireEvent.change(screen.getByLabelText(strings.backup.importLabel), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: strings.backup.import }));

    expect(await screen.findByRole("alert")).toHaveTextContent(strings.backup.importFailed);
  });
});
