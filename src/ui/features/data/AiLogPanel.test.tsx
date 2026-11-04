import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createInMemoryDependencies } from "@/infrastructure/memory/createInMemoryDependencies";
import { renderWithDependencies } from "@/test/renderWithDependencies";
import { strings } from "@/ui/strings/uk";
import { AiLogPanel } from "./AiLogPanel";

describe("AiLogPanel", () => {
  it("shows failed requests with their code and page state, and clears the log", async () => {
    const dependencies = createInMemoryDependencies();
    await dependencies.aiLog.save({
      id: "a",
      startedAt: "2026-11-04T08:00:00.000Z",
      operation: "draftWeek",
      durationMs: 41_200,
      outcome: "error",
      errorCode: "failed",
      detail: "network_error",
      hiddenAtStart: false,
      hiddenDuring: true,
      hiddenAtEnd: false,
      online: true,
      mobile: true,
    });
    await dependencies.aiLog.save({
      id: "b",
      startedAt: "2026-11-04T07:00:00.000Z",
      operation: "matchProducts",
      durationMs: 1_500,
      outcome: "ok",
      hiddenAtStart: false,
      hiddenDuring: false,
      hiddenAtEnd: false,
      online: true,
      mobile: true,
    });
    renderWithDependencies(<AiLogPanel />, { dependencies });

    expect(screen.getByText(strings.aiLog.summary(2, 1))).toBeInTheDocument();
    expect(screen.getByText(strings.aiLog.operations.draftWeek)).toBeInTheDocument();
    expect(screen.getByText("41.2 с")).toBeInTheDocument();
    const failed = screen.getByText(strings.aiLog.operations.draftWeek).closest("li");
    expect(failed).toHaveTextContent("network_error");
    expect(failed).toHaveTextContent(strings.aiLog.hiddenDuring);

    fireEvent.click(screen.getByRole("button", { name: strings.aiLog.clear }));
    fireEvent.click(screen.getByRole("button", { name: strings.aiLog.confirmClear }));

    await waitFor(() => expect(dependencies.aiLog.getSnapshot().items.size).toBe(0));
    expect(screen.getByText(strings.aiLog.empty)).toBeInTheDocument();
  });
});
