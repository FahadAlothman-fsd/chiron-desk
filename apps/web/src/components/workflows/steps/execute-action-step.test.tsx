import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecuteActionStep } from "./execute-action-step";

describe("ExecuteActionStep", () => {
  const mockConfig = {
    type: "execute-action" as const,
    actions: [
      {
        type: "set-variable",
        config: {
          variable: "test_var",
          value: "test_value",
        },
      },
    ],
    executionMode: "sequential" as const,
  };

  beforeEach(() => {
    mock.restore();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state during execution", () => {
    render(<ExecuteActionStep config={mockConfig} loading={true} />);

    expect(screen.getByText("Executing...")).toBeInTheDocument();
  });

  it("shows success state on completion", () => {
    render(
      <ExecuteActionStep config={mockConfig} loading={false} result={{ test_var: "test_value" }} />,
    );

    expect(screen.getByText("Action completed successfully")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("calls onContinue when Continue button is clicked", async () => {
    const user = userEvent.setup();
    const onContinue = mock(() => {});

    render(
      <ExecuteActionStep
        config={mockConfig}
        loading={false}
        result={{ test_var: "test_value" }}
        onContinue={onContinue}
      />,
    );

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("displays error message if action fails", () => {
    render(
      <ExecuteActionStep
        config={mockConfig}
        loading={false}
        error="Action failed: Unknown error"
      />,
    );

    expect(screen.getByText(/Action failed/)).toBeInTheDocument();
  });

  it("shows retry button on error", () => {
    const onRetry = mock(() => {});

    render(
      <ExecuteActionStep
        config={mockConfig}
        loading={false}
        error="Action failed"
        onRetry={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  it("triggers re-execution when retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = mock(() => {});

    render(
      <ExecuteActionStep
        config={mockConfig}
        loading={false}
        error="Action failed"
        onRetry={onRetry}
      />,
    );

    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
